import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { MonthlySettlement, SettlementComment, User, UserRole } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { CreateCommentDto } from '../dto';
import { SettlementAccessDeniedException, SettlementNotFoundException } from '../exceptions';

@Injectable()
export class SettlementCommentsService {
  constructor(
    @InjectRepository(SettlementComment)
    private readonly commentRepository: Repository<SettlementComment>,
    @InjectRepository(MonthlySettlement)
    private readonly settlementRepository: Repository<MonthlySettlement>,
    private readonly tenantService: TenantService
  ) {}

  private canViewAllClients(user: User): boolean {
    return [UserRole.COMPANY_OWNER, UserRole.ADMIN].includes(user.role);
  }

  async getComments(settlementId: string, user: User): Promise<SettlementComment[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify settlement exists and user has access
    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId, companyId },
    });

    if (!settlement) {
      throw new SettlementNotFoundException(settlementId, companyId);
    }

    if (!this.canViewAllClients(user) && settlement.userId !== user.id) {
      throw new SettlementAccessDeniedException(settlementId);
    }

    // Use QueryBuilder with explicit JOIN to avoid N+1 query problem
    // With 100 comments, this reduces 101 queries to 1
    return this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.settlementId = :settlementId', { settlementId })
      .andWhere('comment.companyId = :companyId', { companyId })
      .orderBy('comment.createdAt', 'DESC')
      .getMany();
  }

  async addComment(
    settlementId: string,
    dto: CreateCommentDto,
    user: User
  ): Promise<SettlementComment> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify settlement exists and user has access
    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId, companyId },
    });

    if (!settlement) {
      throw new SettlementNotFoundException(settlementId, companyId);
    }

    if (!this.canViewAllClients(user) && settlement.userId !== user.id) {
      throw new SettlementAccessDeniedException(settlementId);
    }

    const comment = this.commentRepository.create({
      settlementId,
      userId: user.id,
      content: dto.content,
      companyId,
    });

    const saved = await this.commentRepository.save(comment);

    // Attach user directly from request to avoid unnecessary database round-trip
    // User is already available and authenticated
    saved.user = user;
    return saved;
  }
}
