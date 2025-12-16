import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClientDeleteRequest,
  Client,
  User,
  Company,
  UserRole,
  DeleteRequestStatus,
} from '@accounting/common';
import { ClientsService } from './clients.service';
import { ClientChangelogService } from './client-changelog.service';

export interface CreateDeleteRequestDto {
  reason?: string;
}

export interface ProcessDeleteRequestDto {
  rejectionReason?: string;
}

@Injectable()
export class DeleteRequestService {
  constructor(
    @InjectRepository(ClientDeleteRequest)
    private readonly deleteRequestRepository: Repository<ClientDeleteRequest>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly clientsService: ClientsService,
    private readonly clientChangelogService: ClientChangelogService,
  ) {}

  private async getEffectiveCompanyId(user: User): Promise<string> {
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.companyRepository.findOne({
        where: { isSystemCompany: true },
      });
      if (!systemCompany) {
        throw new ForbiddenException('System company not found for admin user');
      }
      return systemCompany.id;
    }
    return user.companyId;
  }

  async createDeleteRequest(
    clientId: string,
    dto: CreateDeleteRequestDto,
    user: User,
  ): Promise<ClientDeleteRequest> {
    const companyId = await this.getEffectiveCompanyId(user);

    // Verify client exists and belongs to company
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId, isActive: true },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    // Check if there's already a pending request for this client
    const existingRequest = await this.deleteRequestRepository.findOne({
      where: {
        clientId,
        status: DeleteRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'A delete request for this client is already pending',
      );
    }

    const deleteRequest = this.deleteRequestRepository.create({
      clientId,
      companyId,
      requestedById: user.id,
      reason: dto.reason,
      status: DeleteRequestStatus.PENDING,
    });

    return this.deleteRequestRepository.save(deleteRequest);
  }

  async findAllPendingRequests(user: User): Promise<ClientDeleteRequest[]> {
    const companyId = await this.getEffectiveCompanyId(user);

    return this.deleteRequestRepository.find({
      where: {
        companyId,
        status: DeleteRequestStatus.PENDING,
      },
      relations: ['client', 'requestedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllRequests(
    user: User,
    status?: DeleteRequestStatus,
  ): Promise<ClientDeleteRequest[]> {
    const companyId = await this.getEffectiveCompanyId(user);

    const whereClause: Record<string, unknown> = { companyId };
    if (status) {
      whereClause.status = status;
    }

    return this.deleteRequestRepository.find({
      where: whereClause,
      relations: ['client', 'requestedBy', 'processedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findRequestById(id: string, user: User): Promise<ClientDeleteRequest> {
    const companyId = await this.getEffectiveCompanyId(user);

    const request = await this.deleteRequestRepository.findOne({
      where: { id, companyId },
      relations: ['client', 'requestedBy', 'processedBy'],
    });

    if (!request) {
      throw new NotFoundException(`Delete request with ID ${id} not found`);
    }

    return request;
  }

  async approveRequest(
    id: string,
    user: User,
  ): Promise<{ message: string; deletedClient: Client }> {
    // Only Owner or Admin can approve
    if (user.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException(
        'Only company owners and admins can approve delete requests',
      );
    }

    const request = await this.findRequestById(id, user);

    if (request.status !== DeleteRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve request with status: ${request.status}`,
      );
    }

    // Get the client before deletion
    const client = await this.clientRepository.findOne({
      where: { id: request.clientId },
    });

    if (!client) {
      throw new NotFoundException('Client no longer exists');
    }

    // Update request status
    request.status = DeleteRequestStatus.APPROVED;
    request.processedById = user.id;
    request.processedAt = new Date();
    await this.deleteRequestRepository.save(request);

    // Perform the actual deletion via clients service
    await this.clientsService.remove(request.clientId, user);

    return {
      message: 'Delete request approved and client deleted',
      deletedClient: client,
    };
  }

  async rejectRequest(
    id: string,
    dto: ProcessDeleteRequestDto,
    user: User,
  ): Promise<ClientDeleteRequest> {
    // Only Owner or Admin can reject
    if (user.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException(
        'Only company owners and admins can reject delete requests',
      );
    }

    const request = await this.findRequestById(id, user);

    if (request.status !== DeleteRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject request with status: ${request.status}`,
      );
    }

    request.status = DeleteRequestStatus.REJECTED;
    request.processedById = user.id;
    request.processedAt = new Date();
    request.rejectionReason = dto.rejectionReason;

    return this.deleteRequestRepository.save(request);
  }

  async cancelRequest(id: string, user: User): Promise<void> {
    const request = await this.findRequestById(id, user);

    // Only the requester can cancel their own request
    if (request.requestedById !== user.id && user.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (request.status !== DeleteRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel request with status: ${request.status}`,
      );
    }

    await this.deleteRequestRepository.remove(request);
  }

  async getMyRequests(user: User): Promise<ClientDeleteRequest[]> {
    const companyId = await this.getEffectiveCompanyId(user);

    return this.deleteRequestRepository.find({
      where: {
        companyId,
        requestedById: user.id,
      },
      relations: ['client', 'processedBy'],
      order: { createdAt: 'DESC' },
    });
  }
}
