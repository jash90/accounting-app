import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SimpleText, User, UserRole, Company, getEffectiveCompanyId } from '@accounting/common';
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
    // Use getEffectiveCompanyId to support admin context switching
    // For ADMINs: returns activeCompanyId (test company) if set, otherwise falls back to system company
    // For non-ADMINs: returns their regular companyId
    let effectiveCompanyId = getEffectiveCompanyId(user);

    // If admin without activeCompanyId, use system company
    if (user.role === UserRole.ADMIN && !effectiveCompanyId) {
      const systemCompany = await this.getSystemCompany();
      effectiveCompanyId = systemCompany.id;
    }

    if (!effectiveCompanyId) {
      return [];
    }

    return this.simpleTextRepository.find({
      where: { companyId: effectiveCompanyId },
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

    // Use getEffectiveCompanyId to support admin context switching
    let effectiveCompanyId = getEffectiveCompanyId(user);

    // If admin without activeCompanyId, use system company
    if (user.role === UserRole.ADMIN && !effectiveCompanyId) {
      const systemCompany = await this.getSystemCompany();
      effectiveCompanyId = systemCompany.id;
    }

    // Ensure user can only access texts from their effective company
    if (effectiveCompanyId !== simpleText.companyId) {
      throw new ForbiddenException('Access denied to this resource');
    }

    return simpleText;
  }

  async create(createSimpleTextDto: CreateSimpleTextDto, user: User): Promise<SimpleText> {
    // Use getEffectiveCompanyId to support admin context switching
    let effectiveCompanyId = getEffectiveCompanyId(user);

    // If admin without activeCompanyId, use system company
    if (user.role === UserRole.ADMIN && !effectiveCompanyId) {
      const systemCompany = await this.getSystemCompany();
      effectiveCompanyId = systemCompany.id;
    }

    if (!effectiveCompanyId) {
      throw new ForbiddenException('User is not associated with a company');
    }

    const simpleText = this.simpleTextRepository.create({
      content: createSimpleTextDto.content,
      companyId: effectiveCompanyId,
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
    // findOne already validates access using getEffectiveCompanyId
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
    // findOne already validates access using getEffectiveCompanyId
    const simpleText = await this.findOne(id, user);

    await this.simpleTextRepository.remove(simpleText);
  }
}

