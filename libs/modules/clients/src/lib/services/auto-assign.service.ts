import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, DataSource, EntityManager } from 'typeorm';
import {
  ClientIcon,
  ClientIconAssignment,
  Client,
} from '@accounting/common';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { ClientException, ClientErrorCode } from '../exceptions';

const BATCH_SIZE = 100;

/**
 * Service for managing automatic icon assignments based on conditions
 */
@Injectable()
export class AutoAssignService {
  private readonly logger = new Logger(AutoAssignService.name);

  constructor(
    @InjectRepository(ClientIcon)
    private readonly iconRepository: Repository<ClientIcon>,
    @InjectRepository(ClientIconAssignment)
    private readonly assignmentRepository: Repository<ClientIconAssignment>,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Evaluates and applies auto-assign icons for a client
   * Called after client create/update to update icon assignments
   * Uses transaction to ensure atomicity of all assignment operations
   * @param client The client to evaluate and assign icons for
   */
  async evaluateAndAssign(client: Client): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get all active icons with auto-assign conditions for this company using transaction manager
      const iconsWithConditions = await queryRunner.manager.find(ClientIcon, {
        where: {
          companyId: client.companyId,
          isActive: true,
          autoAssignCondition: Not(IsNull()),
        },
      });

      if (iconsWithConditions.length === 0) {
        // No icons with conditions, just clean up any stale auto-assignments
        await this.removeStaleAutoAssignments(client.id, [], queryRunner.manager);
        await queryRunner.commitTransaction();
        return;
      }

      // Get current auto-assigned icons for this client
      const currentAutoAssignments = await queryRunner.manager.find(
        ClientIconAssignment,
        {
          where: {
            clientId: client.id,
            isAutoAssigned: true,
          },
        }
      );

      const currentAutoIconIds = new Set(
        currentAutoAssignments.map((a) => a.iconId)
      );
      const matchingIconIds = new Set<string>();

      // Evaluate each icon's condition against the client
      for (const icon of iconsWithConditions) {
        try {
          const matches = this.conditionEvaluator.evaluate(
            client,
            icon.autoAssignCondition ?? null
          );

          if (matches) {
            matchingIconIds.add(icon.id);

            // Add assignment if not already exists
            if (!currentAutoIconIds.has(icon.id)) {
              await this.addAutoAssignment(client.id, icon.id, queryRunner.manager);
            }
          }
        } catch (error) {
          this.logger.warn(
            `Failed to evaluate client for icon condition`,
            {
              clientId: client.id,
              iconId: icon.id,
              companyId: client.companyId,
              error: (error as Error).message,
            },
          );
        }
      }

      // Remove auto-assignments that no longer match
      await this.removeStaleAutoAssignments(
        client.id,
        Array.from(matchingIconIds),
        queryRunner.manager
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Failed to evaluate icons for client`,
        {
          clientId: client.id,
          companyId: client.companyId,
          error: (error as Error).message,
          errorName: (error as Error).name,
          stack: (error as Error).stack,
        },
      );

      throw new ClientException(
        ClientErrorCode.AUTO_ASSIGN_EVALUATION_FAILED,
        'Failed to update icon assignments',
        {
          clientId: client.id,
          companyId: client.companyId,
          operationStage: 'evaluateAndAssign',
        },
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Adds an auto-assigned icon to a client
   * Uses upsert pattern to prevent race conditions
   * @param clientId Client ID
   * @param iconId Icon ID
   * @param manager Optional EntityManager to use for transaction. If not provided, uses repository directly.
   */
  private async addAutoAssignment(
    clientId: string,
    iconId: string,
    manager?: EntityManager
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(ClientIconAssignment)
      : this.assignmentRepository;

    // Check if there's already a manual assignment - don't override manual assignments
    const existingManual = await repo.findOne({
      where: { clientId, iconId, isAutoAssigned: false },
    });

    if (existingManual) {
      return;
    }

    // Use upsert pattern to prevent race conditions on auto-assignment creation
    // orIgnore() handles the case where another process created the assignment concurrently
    await repo
      .createQueryBuilder()
      .insert()
      .into(ClientIconAssignment)
      .values({
        clientId,
        iconId,
        isAutoAssigned: true,
      })
      .orIgnore() // Ignore if already exists (race-safe)
      .execute();
  }

  /**
   * Removes auto-assigned icons that no longer match conditions
   * Uses bulk delete for efficiency and atomicity
   * @param clientId Client ID
   * @param currentMatchingIconIds Icon IDs that currently match conditions
   * @param manager Optional EntityManager to use for transaction. If not provided, uses repository directly.
   */
  private async removeStaleAutoAssignments(
    clientId: string,
    currentMatchingIconIds: string[],
    manager?: EntityManager
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(ClientIconAssignment)
      : this.assignmentRepository;

    // Use bulk delete query for efficiency - removes all auto-assignments
    // that are not in the current matching set in a single atomic operation
    const qb = repo
      .createQueryBuilder()
      .delete()
      .from(ClientIconAssignment)
      .where('clientId = :clientId', { clientId })
      .andWhere('isAutoAssigned = :isAutoAssigned', { isAutoAssigned: true });

    // Only add NOT IN condition if there are matching icons to exclude
    if (currentMatchingIconIds.length > 0) {
      qb.andWhere('iconId NOT IN (:...matchingIds)', {
        matchingIds: currentMatchingIconIds,
      });
    }

    await qb.execute();
  }

  /**
   * Re-evaluates all clients for a specific icon when its condition changes
   * Uses batched async processing to avoid blocking on large datasets
   * @param icon The icon whose condition was updated
   */
  async reevaluateIconForAllClients(icon: ClientIcon): Promise<void> {
    if (!icon.autoAssignCondition) {
      // No condition, remove all auto-assignments for this icon
      await this.assignmentRepository.delete({
        iconId: icon.id,
        isAutoAssigned: true,
      });
      return;
    }

    // Schedule background processing to avoid blocking the request
    setImmediate(() => {
      this.processIconReevaluationAsync(icon).catch((error) => {
        this.logger.error(
          `Failed to reevaluate icon for all clients`,
          {
            iconId: icon.id,
            companyId: icon.companyId,
            error: error.message,
            errorName: error.name,
            stack: error.stack,
          },
        );
      });
    });
  }

  /**
   * Processes icon reevaluation in batches asynchronously
   */
  private async processIconReevaluationAsync(icon: ClientIcon): Promise<void> {
    const ClientRepository = this.assignmentRepository.manager.getRepository(Client);

    // Get total count first
    const totalClients = await ClientRepository.count({
      where: { companyId: icon.companyId, isActive: true },
    });

    if (totalClients === 0) {
      return;
    }

    this.logger.log(
      `Starting icon reevaluation for clients`,
      {
        iconId: icon.id,
        companyId: icon.companyId,
        totalClients,
      },
    );

    let processed = 0;

    // Process in batches to avoid memory issues and allow other operations
    for (let offset = 0; offset < totalClients; offset += BATCH_SIZE) {
      const clients = await ClientRepository.find({
        where: { companyId: icon.companyId, isActive: true },
        skip: offset,
        take: BATCH_SIZE,
      });

      await this.processBatch(clients, icon);
      processed += clients.length;

      // Yield to event loop between batches
      if (offset + BATCH_SIZE < totalClients) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    this.logger.log(
      `Completed icon reevaluation for clients`,
      {
        iconId: icon.id,
        companyId: icon.companyId,
        processedClients: processed,
      },
    );
  }

  /**
   * Process a batch of clients for icon assignment
   * Uses atomic operations to prevent race conditions
   */
  private async processBatch(clients: Client[], icon: ClientIcon): Promise<void> {
    for (const client of clients) {
      try {
        const matches = this.conditionEvaluator.evaluate(
          client,
          icon.autoAssignCondition ?? null,
        );

        if (matches) {
          // Should be assigned - addAutoAssignment uses upsert pattern (race-safe)
          await this.addAutoAssignment(client.id, icon.id);
        } else {
          // Should not be assigned - use atomic delete with condition
          // This is race-safe: if assignment doesn't exist or isn't auto-assigned,
          // the delete simply affects 0 rows
          await this.assignmentRepository
            .createQueryBuilder()
            .delete()
            .from(ClientIconAssignment)
            .where('clientId = :clientId', { clientId: client.id })
            .andWhere('iconId = :iconId', { iconId: icon.id })
            .andWhere('isAutoAssigned = :isAutoAssigned', { isAutoAssigned: true })
            .execute();
        }
      } catch (error) {
        // Log error but continue with other clients
        this.logger.warn(
          `Failed to evaluate client for icon in batch processing`,
          {
            clientId: client.id,
            iconId: icon.id,
            companyId: client.companyId,
            error: (error as Error).message,
          },
        );
      }
    }
  }
}
