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
    // For ADMINs: use system company
    // For non-ADMINs: use their regular companyId
    let companyId = user.companyId;

    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();
      companyId = systemCompany.id;
    }

    if (!companyId) {
      return [];
    }

    return this.simpleTextRepository.find({
      where: { companyId },
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

    // Get effective company ID
    let companyId = user.companyId;

    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();
      companyId = systemCompany.id;
    }

    // Ensure user can only access texts from their company
    if (companyId !== simpleText.companyId) {
      throw new ForbiddenException('Access denied to this resource');
    }

    return simpleText;
  }

  async create(createSimpleTextDto: CreateSimpleTextDto, user: User): Promise<SimpleText> {
    // Get effective company ID
    let companyId = user.companyId;

    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();
      companyId = systemCompany.id;
    }

    if (!companyId) {
      throw new ForbiddenException('User is not associated with a company');
    }

    const simpleText = this.simpleTextRepository.create({
      content: createSimpleTextDto.content,
      companyId,
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
    // findOne already validates access
    const simpleText = await this.findOne(id, user);

    Object.assign(simpleText, updateSimpleTextDto);
    const saved = await this.simpleTextRepository.save(simpleText);

    // Reload with relations to ensure consistent response structure
    return this.simpleTextRepository.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'company'],
    }) as Promise<SimpleText>;
  }

  async remove(id: string, user: User): Promise<void> {
    // findOne already validates access
    const simpleText = await this.findOne(id, user);

    await this.simpleTextRepository.remove(simpleText);
  }
}
