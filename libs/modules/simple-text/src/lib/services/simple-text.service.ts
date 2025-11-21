import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SimpleText, User, UserRole, Company } from '@accounting/common';
import { CreateSimpleTextDto } from '../dto/create-simple-text.dto';
import { UpdateSimpleTextDto } from '../dto/update-simple-text.dto';

@Injectable()
export class SimpleTextService {
  constructor(
    @InjectRepository(SimpleText)
    private simpleTextRepository: Repository<SimpleText>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  private async getSystemCompany(): Promise<Company> {
    const systemCompany = await this.companyRepository.findOne({
      where: { isSystemCompany: true },
    });

    if (!systemCompany) {
      throw new Error('System Admin company not found. Please run migrations.');
    }

    return systemCompany;
  }

  async findAll(user: User): Promise<SimpleText[]> {
    // ADMIN can view only System Admin company records (their own texts)
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();
      return this.simpleTextRepository.find({
        where: { companyId: systemCompany.id },
        relations: ['createdBy', 'company'],
        order: { createdAt: 'DESC' },
      });
    }

    if (!user.companyId) {
      return [];
    }

    return this.simpleTextRepository.find({
      where: { companyId: user.companyId },
      relations: ['createdBy', 'company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<SimpleText> {
    const simpleText = await this.simpleTextRepository.findOne({
      where: { id },
      relations: ['createdBy', 'company'],
    });

    if (!simpleText) {
      throw new NotFoundException(`SimpleText with ID ${id} not found`);
    }

    // ADMIN can only view System Admin company records
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();
      if (simpleText.companyId !== systemCompany.id) {
        throw new NotFoundException(`SimpleText with ID ${id} not found`);
      }
      return simpleText;
    }

    // Ensure user can only access texts from their company
    if (user.companyId !== simpleText.companyId) {
      throw new ForbiddenException('Access denied to this resource');
    }

    return simpleText;
  }

  async create(createSimpleTextDto: CreateSimpleTextDto, user: User): Promise<SimpleText> {
    // ADMIN creates entries in System Admin company
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();

      const simpleText = this.simpleTextRepository.create({
        content: createSimpleTextDto.content,
        companyId: systemCompany.id, // Use system company instead of null
        createdById: user.id,
      });
      const saved = await this.simpleTextRepository.save(simpleText);

      // Load relations to match findAll() response structure
      return this.simpleTextRepository.findOne({
        where: { id: saved.id },
        relations: ['createdBy', 'company'],
      }) as Promise<SimpleText>;
    }

    // Company users create company entries
    if (!user.companyId) {
      throw new ForbiddenException('User is not associated with a company');
    }

    const simpleText = this.simpleTextRepository.create({
      content: createSimpleTextDto.content,
      companyId: user.companyId,
      createdById: user.id,
    });
    const saved = await this.simpleTextRepository.save(simpleText);

    // Load relations to match findAll() response structure
    return this.simpleTextRepository.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'company'],
    }) as Promise<SimpleText>;
  }

  async update(id: string, updateSimpleTextDto: UpdateSimpleTextDto, user: User): Promise<SimpleText> {
    const simpleText = await this.findOne(id, user);

    // ADMIN can only update System Admin company entries
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();
      if (simpleText.companyId !== systemCompany.id) {
        throw new ForbiddenException('Admins cannot modify company data');
      }
    } else {
      // Company users can only update their company's entries
      if (simpleText.companyId !== user.companyId) {
        throw new ForbiddenException('Cannot modify entries from other companies');
      }
    }

    Object.assign(simpleText, updateSimpleTextDto);
    const saved = await this.simpleTextRepository.save(simpleText);

    // Reload with relations to ensure consistent response structure
    return this.simpleTextRepository.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'company'],
    }) as Promise<SimpleText>;
  }

  async remove(id: string, user: User): Promise<void> {
    const simpleText = await this.findOne(id, user);

    // ADMIN can only delete System Admin company entries
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();
      if (simpleText.companyId !== systemCompany.id) {
        throw new ForbiddenException('Admins cannot delete company data');
      }
    } else {
      // Company users can only delete their company's entries
      if (simpleText.companyId !== user.companyId) {
        throw new ForbiddenException('Cannot delete entries from other companies');
      }
    }

    await this.simpleTextRepository.remove(simpleText);
  }
}

