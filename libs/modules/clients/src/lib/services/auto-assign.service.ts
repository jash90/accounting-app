import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import {
  ClientIcon,
  ClientIconAssignment,
  Client,
} from '@accounting/common';
import { ConditionEvaluatorService } from './condition-evaluator.service';

/**
 * Service for managing automatic icon assignments based on conditions
 */
@Injectable()
export class AutoAssignService {
  constructor(
    @InjectRepository(ClientIcon)
    private readonly iconRepository: Repository<ClientIcon>,
    @InjectRepository(ClientIconAssignment)
    private readonly assignmentRepository: Repository<ClientIconAssignment>,
    private readonly conditionEvaluator: ConditionEvaluatorService,
  ) {}

  /**
   * Evaluates and applies auto-assign icons for a client
   * Called after client create/update to update icon assignments
   * @param client The client to evaluate and assign icons for
   */
  async evaluateAndAssign(client: Client): Promise<void> {
    // Get all active icons with auto-assign conditions for this company
    const iconsWithConditions = await this.iconRepository.find({
      where: {
        companyId: client.companyId,
        isActive: true,
        autoAssignCondition: Not(IsNull()),
      },
    });

    if (iconsWithConditions.length === 0) {
      // No icons with conditions, just clean up any stale auto-assignments
      await this.removeStaleAutoAssignments(client.id, []);
      return;
    }

    // Get current auto-assigned icons for this client
    const currentAutoAssignments = await this.assignmentRepository.find({
      where: {
        clientId: client.id,
        isAutoAssigned: true,
      },
    });

    const currentAutoIconIds = new Set(
      currentAutoAssignments.map((a) => a.iconId)
    );
    const matchingIconIds = new Set<string>();

    // Evaluate each icon's condition against the client
    for (const icon of iconsWithConditions) {
      const matches = this.conditionEvaluator.evaluate(
        client,
        icon.autoAssignCondition ?? null
      );

      if (matches) {
        matchingIconIds.add(icon.id);

        // Add assignment if not already exists
        if (!currentAutoIconIds.has(icon.id)) {
          await this.addAutoAssignment(client.id, icon.id);
        }
      }
    }

    // Remove auto-assignments that no longer match
    await this.removeStaleAutoAssignments(client.id, Array.from(matchingIconIds));
  }

  /**
   * Adds an auto-assigned icon to a client
   */
  private async addAutoAssignment(
    clientId: string,
    iconId: string
  ): Promise<void> {
    // Check if there's already a manual assignment
    const existingManual = await this.assignmentRepository.findOne({
      where: { clientId, iconId, isAutoAssigned: false },
    });

    if (existingManual) {
      // Don't override manual assignments
      return;
    }

    // Check if there's already an auto-assignment
    const existingAuto = await this.assignmentRepository.findOne({
      where: { clientId, iconId, isAutoAssigned: true },
    });

    if (existingAuto) {
      // Already auto-assigned
      return;
    }

    // Create new auto-assignment
    const assignment = this.assignmentRepository.create({
      clientId,
      iconId,
      isAutoAssigned: true,
    });

    await this.assignmentRepository.save(assignment);
  }

  /**
   * Removes auto-assigned icons that no longer match conditions
   */
  private async removeStaleAutoAssignments(
    clientId: string,
    currentMatchingIconIds: string[]
  ): Promise<void> {
    const currentAutoAssignments = await this.assignmentRepository.find({
      where: {
        clientId,
        isAutoAssigned: true,
      },
    });

    const matchingSet = new Set(currentMatchingIconIds);

    for (const assignment of currentAutoAssignments) {
      if (!matchingSet.has(assignment.iconId)) {
        // This auto-assignment no longer matches, remove it
        await this.assignmentRepository.remove(assignment);
      }
    }
  }

  /**
   * Re-evaluates all clients for a specific icon when its condition changes
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

    // This is more expensive - we need to re-evaluate all clients
    // In a production system, you might want to batch this or run it async
    const ClientRepository = this.assignmentRepository.manager.getRepository(Client);
    const clients = await ClientRepository.find({
      where: { companyId: icon.companyId, isActive: true },
    });

    for (const client of clients) {
      const matches = this.conditionEvaluator.evaluate(
        client,
        icon.autoAssignCondition
      );

      const existingAssignment = await this.assignmentRepository.findOne({
        where: { clientId: client.id, iconId: icon.id },
      });

      if (matches) {
        // Should be assigned
        if (!existingAssignment) {
          await this.addAutoAssignment(client.id, icon.id);
        }
      } else {
        // Should not be assigned
        if (existingAssignment && existingAssignment.isAutoAssigned) {
          await this.assignmentRepository.remove(existingAssignment);
        }
      }
    }
  }
}
