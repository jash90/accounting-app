import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SimpleText, User, UserRole } from '@accounting/common';
import { CreateSimpleTextDto } from '../dto/create-simple-text.dto';
import { UpdateSimpleTextDto } from '../dto/update-simple-text.dto';

@Injectable()
export class SimpleTextService {
  constructor(
    @InjectRepository(SimpleText)
    private simpleTextRepository: Repository<SimpleText>,
  ) {}

  async findAll(user: User): Promise<SimpleText[]> {
    // ADMIN cannot access business data
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins do not have access to business module data');
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
    // ADMIN cannot access business data
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins do not have access to business module data');
    }

    const simpleText = await this.simpleTextRepository.findOne({
      where: { id },
      relations: ['createdBy', 'company'],
    });

    if (!simpleText) {
      throw new NotFoundException(`SimpleText with ID ${id} not found`);
    }

    // Ensure user can only access texts from their company
    if (user.companyId !== simpleText.companyId) {
      throw new ForbiddenException('Access denied to this resource');
    }

    return simpleText;
  }

  async create(createSimpleTextDto: CreateSimpleTextDto, user: User): Promise<SimpleText> {
    // ADMIN cannot access business data
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins do not have access to business module data');
    }

    if (!user.companyId) {
      throw new ForbiddenException('User is not associated with a company');
    }

    const simpleText = this.simpleTextRepository.create({
      content: createSimpleTextDto.content,
      companyId: user.companyId,
      createdById: user.id,
    });

    return this.simpleTextRepository.save(simpleText);
  }

  async update(id: string, updateSimpleTextDto: UpdateSimpleTextDto, user: User): Promise<SimpleText> {
    const simpleText = await this.findOne(id, user);

    Object.assign(simpleText, updateSimpleTextDto);
    return this.simpleTextRepository.save(simpleText);
  }

  async remove(id: string, user: User): Promise<void> {
    const simpleText = await this.findOne(id, user);
    await this.simpleTextRepository.remove(simpleText);
  }
}

