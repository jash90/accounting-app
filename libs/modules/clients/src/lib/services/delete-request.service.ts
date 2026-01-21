import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository, DataSource } from 'typeorm';

import {
  ClientDeleteRequest,
  Client,
  User,
  UserRole,
  DeleteRequestStatus,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { ClientChangelogService } from './client-changelog.service';
import { ClientsService } from './clients.service';
import {
  ClientNotFoundException,
  DeleteRequestNotFoundException,
  DeleteRequestAlreadyProcessedException,
  ClientException,
  ClientErrorCode,
} from '../exceptions';

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
    private readonly clientsService: ClientsService,
    private readonly clientChangelogService: ClientChangelogService,
    private readonly dataSource: DataSource,
    private readonly tenantService: TenantService
  ) {}

  async createDeleteRequest(
    clientId: string,
    dto: CreateDeleteRequestDto,
    user: User
  ): Promise<ClientDeleteRequest> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client exists and belongs to company
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId, isActive: true },
    });

    if (!client) {
      throw new ClientNotFoundException(clientId, companyId);
    }

    // Check if there's already a pending request for this client
    const existingRequest = await this.deleteRequestRepository.findOne({
      where: {
        clientId,
        status: DeleteRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new DeleteRequestAlreadyProcessedException(
        existingRequest.id,
        DeleteRequestStatus.PENDING
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
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    return this.deleteRequestRepository.find({
      where: {
        companyId,
        status: DeleteRequestStatus.PENDING,
      },
      relations: ['client', 'requestedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllRequests(user: User, status?: DeleteRequestStatus): Promise<ClientDeleteRequest[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const whereClause: Record<string, unknown> = { companyId };
    if (status) {
      whereClause['status'] = status;
    }

    return this.deleteRequestRepository.find({
      where: whereClause,
      relations: ['client', 'requestedBy', 'processedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findRequestById(id: string, user: User): Promise<ClientDeleteRequest> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const request = await this.deleteRequestRepository.findOne({
      where: { id, companyId },
      relations: ['client', 'requestedBy', 'processedBy'],
    });

    if (!request) {
      throw new DeleteRequestNotFoundException(id, { companyId });
    }

    return request;
  }

  async approveRequest(
    id: string,
    user: User
  ): Promise<{ message: string; deletedClient: Client }> {
    // Only Owner or Admin can approve
    if (user.role === UserRole.EMPLOYEE) {
      throw new ClientException(
        ClientErrorCode.PERMISSION_DENIED,
        'Only company owners and admins can approve delete requests',
        {
          userId: user.id,
          additionalInfo: {
            userRole: user.role,
          },
        },
        HttpStatus.FORBIDDEN
      );
    }

    const request = await this.findRequestById(id, user);

    if (request.status !== DeleteRequestStatus.PENDING) {
      throw new DeleteRequestAlreadyProcessedException(id, request.status);
    }

    // Get the client before deletion
    const client = await this.clientRepository.findOne({
      where: { id: request.clientId },
    });

    if (!client) {
      throw new ClientNotFoundException(request.clientId);
    }

    // Clone client data before deletion for response
    const deletedClientData = { ...client } as Client;

    // Use transaction to ensure atomicity: both operations succeed or both fail
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Soft delete the client within the transaction
      client.isActive = false;
      client.updatedById = user.id;
      await queryRunner.manager.save(client);

      // Update request status within the same transaction
      request.status = DeleteRequestStatus.APPROVED;
      request.processedById = user.id;
      request.processedAt = new Date();
      await queryRunner.manager.save(request);

      await queryRunner.commitTransaction();

      // Send notifications after transaction commits (non-critical)
      try {
        await this.clientChangelogService.notifyClientDeleted(client, user);
      } catch {
        // Notification failure should not affect the successful deletion
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return {
      message: 'Delete request approved and client deleted',
      deletedClient: deletedClientData,
    };
  }

  async rejectRequest(
    id: string,
    dto: ProcessDeleteRequestDto,
    user: User
  ): Promise<ClientDeleteRequest> {
    // Only Owner or Admin can reject
    if (user.role === UserRole.EMPLOYEE) {
      throw new ClientException(
        ClientErrorCode.PERMISSION_DENIED,
        'Only company owners and admins can reject delete requests',
        {
          userId: user.id,
          additionalInfo: {
            userRole: user.role,
          },
        },
        HttpStatus.FORBIDDEN
      );
    }

    const request = await this.findRequestById(id, user);

    if (request.status !== DeleteRequestStatus.PENDING) {
      throw new DeleteRequestAlreadyProcessedException(id, request.status);
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
      throw new ClientException(
        ClientErrorCode.PERMISSION_DENIED,
        'You can only cancel your own requests',
        {
          userId: user.id,
          additionalInfo: {
            requestedById: request.requestedById,
          },
        },
        HttpStatus.FORBIDDEN
      );
    }

    if (request.status !== DeleteRequestStatus.PENDING) {
      throw new DeleteRequestAlreadyProcessedException(id, request.status);
    }

    await this.deleteRequestRepository.remove(request);
  }

  async getMyRequests(user: User): Promise<ClientDeleteRequest[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

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
