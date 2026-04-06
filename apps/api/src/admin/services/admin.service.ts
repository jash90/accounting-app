import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { hash } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';

import { AuthService, JwtStrategy } from '@accounting/auth';
import {
  applyUpdate,
  Company,
  ErrorMessages,
  escapeLikePattern,
  PaginatedResponseDto,
  User,
  UserRole,
} from '@accounting/common';
import { calculatePagination, SystemCompanyService } from '@accounting/common/backend';
import { RBACService } from '@accounting/rbac';

import { UpdateCompanyProfileDto } from '../../company/dto/update-company-profile.dto';
import { AdminCompaniesQueryDto, AdminUsersQueryDto } from '../dto/admin-query.dto';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly rbacService: RBACService,
    private readonly dataSource: DataSource,
    private readonly systemCompanyService: SystemCompanyService,
    private readonly authService: AuthService,
    private readonly jwtStrategy: JwtStrategy
  ) {}

  // User Management
  async findAllUsers(query?: AdminUsersQueryDto): Promise<PaginatedResponseDto<User>> {
    const { page, limit, skip } = calculatePagination(query);

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .orderBy('user.createdAt', 'DESC');

    if (query?.search) {
      const escaped = escapeLikePattern(query.search);
      qb.andWhere(
        "(user.email ILIKE :search ESCAPE '\\' OR user.firstName ILIKE :search ESCAPE '\\' OR user.lastName ILIKE :search ESCAPE '\\')",
        { search: `%${escaped}%` }
      );
    }

    if (query?.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query?.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!user) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND.entity('Użytkownik', id));
    }

    return user;
  }

  async createUser(createUserDto: CreateUserDto) {
    // FIX-08: Case-insensitive email check (matches AuthService pattern)
    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: createUserDto.email })
      .getOne();

    if (existingUser) {
      throw new ConflictException(ErrorMessages.AUTH.EMAIL_EXISTS);
    }

    // Auto-assign ADMIN users to System Admin company
    if (createUserDto.role === UserRole.ADMIN) {
      const systemCompany = await this.systemCompanyService.getSystemCompany();
      createUserDto.companyId = systemCompany.id;
    }

    // EMPLOYEE requires companyId
    if (createUserDto.role === UserRole.EMPLOYEE && !createUserDto.companyId) {
      throw new BadRequestException(ErrorMessages.ADMIN.COMPANY_ID_REQUIRED_FOR_EMPLOYEE);
    }

    // COMPANY_OWNER requires companyName (to auto-create company)
    if (createUserDto.role === UserRole.COMPANY_OWNER && !createUserDto.companyName) {
      throw new BadRequestException(ErrorMessages.ADMIN.COMPANY_NAME_REQUIRED_FOR_OWNER);
    }

    if (createUserDto.companyId) {
      const company = await this.companyRepository.findOne({
        where: { id: createUserDto.companyId },
      });
      if (!company) {
        throw new NotFoundException(ErrorMessages.NOT_FOUND.entity('Firma'));
      }
    }

    const hashedPassword = await hash(createUserDto.password, 10);

    // Use transaction to ensure atomic creation of user and company for COMPANY_OWNER
    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        ...createUserDto,
        password: hashedPassword,
        isActive: createUserDto.isActive ?? true,
      });

      const savedUser = await manager.save(user);

      // If COMPANY_OWNER and companyName provided, auto-create company within same transaction
      if (createUserDto.role === UserRole.COMPANY_OWNER && createUserDto.companyName) {
        const company = manager.create(Company, {
          name: createUserDto.companyName,
          ownerId: savedUser.id,
        });
        const savedCompany = await manager.save(company);
        savedUser.companyId = savedCompany.id;
        await manager.save(savedUser);
      }

      return savedUser;
    });
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto, currentUserId?: string) {
    const user = await this.findUserById(id);

    // FIX-03: Prevent admin from demoting or deactivating themselves
    if (currentUserId && id === currentUserId) {
      if (updateUserDto.role && updateUserDto.role !== UserRole.ADMIN) {
        throw new BadRequestException(ErrorMessages.ADMIN.CANNOT_SELF_DEMOTE);
      }
      if (updateUserDto.isActive === false) {
        throw new BadRequestException(ErrorMessages.ADMIN.CANNOT_SELF_DEACTIVATE);
      }
    }

    if (updateUserDto.email && updateUserDto.email.toLowerCase() !== user.email.toLowerCase()) {
      // FIX-08: Case-insensitive email check
      const existingUser = await this.userRepository
        .createQueryBuilder('user')
        .where('LOWER(user.email) = LOWER(:email)', { email: updateUserDto.email })
        .getOne();
      if (existingUser) {
        throw new ConflictException(ErrorMessages.AUTH.EMAIL_EXISTS);
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await hash(updateUserDto.password, 10);
    }

    // Auto-assign to System Admin company when promoting to ADMIN role
    if (updateUserDto.role === UserRole.ADMIN) {
      const systemCompany = await this.systemCompanyService.getSystemCompany();
      updateUserDto.companyId = systemCompany.id;
    }

    applyUpdate(user, updateUserDto, ['id', 'createdAt', 'updatedAt', 'tokenVersion']);
    const savedUser = await this.userRepository.save(user);

    // FIX-01: Invalidate tokens/cache when deactivating via general update
    // (softDeleteUser and setUserActiveStatus already handle this for their flows)
    if (updateUserDto.isActive === false) {
      await this.authService.invalidateTokens(id);
      this.jwtStrategy.invalidateUserCache(id);
    }

    return savedUser;
  }

  async softDeleteUser(id: string) {
    const user = await this.findUserById(id);
    user.isActive = false;
    const savedUser = await this.userRepository.save(user);

    // Invalidate all tokens so the deactivated user is immediately logged out
    await this.authService.invalidateTokens(id);
    this.jwtStrategy.invalidateUserCache(id);

    return savedUser;
  }

  async setUserActiveStatus(id: string, isActive: boolean) {
    const user = await this.findUserById(id);
    user.isActive = isActive;
    const savedUser = await this.userRepository.save(user);

    // When deactivating, invalidate tokens and cache for immediate effect
    if (!isActive) {
      await this.authService.invalidateTokens(id);
      this.jwtStrategy.invalidateUserCache(id);
    }

    return savedUser;
  }

  // Get available owners (COMPANY_OWNER without assigned company)
  findAvailableOwners() {
    return this.userRepository.find({
      where: {
        role: UserRole.COMPANY_OWNER,
        companyId: null as unknown as string, // TypeORM requires this cast for null comparison
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  // Company Management
  async findAllCompanies(query?: AdminCompaniesQueryDto): Promise<PaginatedResponseDto<Company>> {
    const { page, limit, skip } = calculatePagination(query);

    const qb = this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.owner', 'owner')
      .leftJoinAndSelect('company.employees', 'employees')
      .where('company.isSystemCompany = false')
      .orderBy('company.createdAt', 'DESC');

    if (query?.search) {
      const escaped = escapeLikePattern(query.search);
      qb.andWhere("company.name ILIKE :search ESCAPE '\\'", {
        search: `%${escaped}%`,
      });
    }

    if (query?.isActive !== undefined) {
      qb.andWhere('company.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findCompanyById(id: string) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['owner', 'employees'],
    });

    if (!company) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND.entity('Firma', id));
    }

    return company;
  }

  async createCompany(createCompanyDto: CreateCompanyDto) {
    // Initial validation outside transaction
    const ownerCheck = await this.userRepository.findOne({
      where: { id: createCompanyDto.ownerId },
    });

    if (!ownerCheck) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND.entity('Właściciel'));
    }

    if (ownerCheck.role !== UserRole.COMPANY_OWNER) {
      throw new BadRequestException(ErrorMessages.ADMIN.OWNER_MUST_BE_COMPANY_OWNER);
    }

    // Use transaction with pessimistic lock to prevent race conditions
    return this.dataSource.transaction(async (manager) => {
      // Acquire pessimistic write lock on the owner row and re-check companyId
      const owner = await manager.findOne(User, {
        where: { id: createCompanyDto.ownerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!owner) {
        throw new NotFoundException(ErrorMessages.NOT_FOUND.entity('Właściciel'));
      }

      // Re-check if owner already has a company assigned (within lock)
      if (owner.companyId) {
        throw new BadRequestException(ErrorMessages.ADMIN.OWNER_ALREADY_ASSIGNED);
      }

      // Create and save company within transaction
      const company = manager.create(Company, {
        name: createCompanyDto.name,
        ownerId: createCompanyDto.ownerId,
      });

      const savedCompany = await manager.save(company);

      // Auto-assign the owner to the newly created company within same transaction
      owner.companyId = savedCompany.id;
      await manager.save(owner);

      return savedCompany;
    });
  }

  async updateCompany(id: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.findCompanyById(id);
    applyUpdate(company, updateCompanyDto, [
      'id',
      'ownerId',
      'isSystemCompany',
      'createdAt',
      'updatedAt',
    ]);
    return this.companyRepository.save(company);
  }

  async softDeleteCompany(id: string) {
    const company = await this.findCompanyById(id);

    // Prevent deletion of System Admin company
    if (company.isSystemCompany) {
      throw new BadRequestException(ErrorMessages.ADMIN.CANNOT_DELETE_SYSTEM_COMPANY);
    }

    company.isActive = false;
    return this.companyRepository.save(company);
  }

  async getCompanyEmployees(companyId: string) {
    const company = await this.findCompanyById(companyId);
    return company.employees;
  }

  async getCompanyProfileById(companyId: string): Promise<Company> {
    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException(ErrorMessages.NOT_FOUND.entity('Firma'));
    return company;
  }

  async updateCompanyProfileById(
    companyId: string,
    dto: UpdateCompanyProfileDto
  ): Promise<Company> {
    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException(ErrorMessages.NOT_FOUND.entity('Firma'));
    applyUpdate(company, dto, ['id', 'ownerId', 'isSystemCompany', 'createdAt', 'updatedAt']);
    return this.companyRepository.save(company);
  }
}
