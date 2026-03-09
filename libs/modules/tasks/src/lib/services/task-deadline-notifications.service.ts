import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { In, LessThan, Not, Repository } from 'typeorm';

import { Task, TaskStatus } from '@accounting/common';

import { TaskNotificationService } from './task-notification.service';

/**
 * Handles deadline-based notifications for tasks.
 * Runs daily to detect overdue tasks and notify relevant users.
 */
@Injectable()
export class TaskDeadlineNotificationsService {
  private readonly logger = new Logger(TaskDeadlineNotificationsService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly notificationService: TaskNotificationService
  ) {}

  /**
   * Daily cron job at 08:00 that sends notifications for overdue tasks.
   * Notifies task owners and company members via email.
   */
  @Cron('0 8 * * *')
  async processOverdueTasks(): Promise<void> {
    this.logger.log('Checking for overdue tasks...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const overdueTasks = await this.taskRepository.find({
        where: {
          isTemplate: false,
          isActive: true,
          dueDate: LessThan(today),
          status: Not(In([TaskStatus.DONE, TaskStatus.CANCELLED])),
        },
        relations: ['assignee', 'client'],
      });

      this.logger.log(`Found ${overdueTasks.length} overdue tasks`);

      let notified = 0;
      let skipped = 0;

      for (const task of overdueTasks) {
        try {
          await this.notificationService.notifyTaskOverdue(task);
          notified++;
        } catch (error) {
          this.logger.error(`Failed to notify for overdue task ${task.id}:`, error);
          skipped++;
        }
      }

      this.logger.log(`Overdue task notifications: ${notified} sent, ${skipped} failed`);
    } catch (error) {
      this.logger.error('Error processing overdue tasks:', error);
    }
  }

  /**
   * Daily cron job at 08:05 that sends notifications for tasks due within 3 days.
   */
  @Cron('5 8 * * *')
  async processDueSoonTasks(): Promise<void> {
    this.logger.log('Checking for tasks due soon...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    try {
      const dueSoonTasks = await this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.client', 'client')
        .where('task.isTemplate = :isTemplate', { isTemplate: false })
        .andWhere('task.isActive = :isActive', { isActive: true })
        .andWhere('task.dueDate >= :today', { today })
        .andWhere('task.dueDate <= :threeDaysFromNow', { threeDaysFromNow })
        .andWhere('task.status NOT IN (:...statuses)', {
          statuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
        })
        .andWhere('task.clientId IS NOT NULL')
        .getMany();

      this.logger.log(`Found ${dueSoonTasks.length} tasks due soon`);

      // Reuse overdue notification since the email content is similar
      // (both warn about approaching/exceeded deadline)
      let notified = 0;
      for (const task of dueSoonTasks) {
        try {
          await this.notificationService.notifyTaskOverdue(task);
          notified++;
        } catch (error) {
          this.logger.error(`Failed to notify for due-soon task ${task.id}:`, error);
        }
      }

      this.logger.log(`Due-soon task notifications: ${notified} sent`);
    } catch (error) {
      this.logger.error('Error processing due-soon tasks:', error);
    }
  }
}
