import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { IsNull, Not, Repository } from 'typeorm';

import { Task, TaskStatus, type RecurrencePattern } from '@accounting/common';

/**
 * Handles automatic generation of recurring tasks from templates.
 * Runs daily at 01:00 to create tasks for templates with recurrence patterns.
 */
@Injectable()
export class TaskRecurrenceService {
  private readonly logger = new Logger(TaskRecurrenceService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>
  ) {}

  /**
   * Daily cron job that processes all active templates with recurrence patterns
   * and creates the next occurrence if it's due today.
   */
  @Cron('0 1 * * *', { timeZone: 'Europe/Warsaw' })
  async processRecurringTasks(): Promise<void> {
    this.logger.log('Processing recurring task templates...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const templates = await this.taskRepository.find({
      where: {
        isTemplate: true,
        isActive: true,
        recurrencePattern: Not(IsNull()),
      },
    });

    let created = 0;
    let skipped = 0;

    for (const template of templates) {
      try {
        const shouldCreate = this.shouldCreateToday(template, today);
        if (shouldCreate) {
          await this.createOccurrence(template, today);
          created++;
        } else {
          skipped++;
        }
      } catch (error) {
        this.logger.error(`Error processing template ${template.id}:`, error);
      }
    }

    this.logger.log(`Recurring tasks: ${created} created, ${skipped} skipped`);
  }

  private shouldCreateToday(template: Task, today: Date): boolean {
    const pattern = template.recurrencePattern as RecurrencePattern;
    if (!pattern) return false;

    // Check if recurrence has ended
    if (template.recurrenceEndDate) {
      const endDate = new Date(template.recurrenceEndDate);
      endDate.setHours(0, 0, 0, 0);
      if (today >= endDate) return false;
    }

    // Calculate whether today matches the recurrence schedule
    const lastDate = template.lastRecurrenceDate ? new Date(template.lastRecurrenceDate) : null;

    if (lastDate) {
      lastDate.setHours(0, 0, 0, 0);
    }

    const daysDiff = lastDate
      ? Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    switch (pattern.frequency) {
      case 'daily': {
        const interval = pattern.interval ?? 1;
        return daysDiff >= interval;
      }

      case 'weekly': {
        const interval = (pattern.interval ?? 1) * 7;
        if (daysDiff < interval) return false;
        // Check if today is a valid day of week
        if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          return pattern.daysOfWeek.includes(today.getDay());
        }
        return daysDiff >= interval;
      }

      case 'monthly': {
        if (!lastDate) {
          // First run: check if today is the right day of month
          const targetDay = pattern.dayOfMonth ?? 1;
          return today.getDate() === targetDay;
        }
        // Check if at least N months have passed
        const monthsDiff =
          (today.getFullYear() - lastDate.getFullYear()) * 12 +
          (today.getMonth() - lastDate.getMonth());
        if (monthsDiff < (pattern.interval ?? 1)) return false;
        const targetDay = pattern.dayOfMonth ?? 1;
        return today.getDate() === targetDay;
      }

      default:
        return false;
    }
  }

  private async createOccurrence(template: Task, today: Date): Promise<void> {
    // Check if we already created a task from this template today
    const existingToday = await this.taskRepository.findOne({
      where: {
        templateId: template.id,
        companyId: template.companyId,
        isTemplate: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (existingToday) {
      const existingDate = new Date(existingToday.createdAt);
      existingDate.setHours(0, 0, 0, 0);
      if (existingDate.getTime() === today.getTime()) {
        return; // Already created today
      }
    }

    const task = this.taskRepository.create({
      title: template.title,
      description: template.description,
      priority: template.priority,
      assigneeId: template.assigneeId,
      clientId: template.clientId,
      estimatedMinutes: template.estimatedMinutes,
      companyId: template.companyId,
      createdById: template.createdById,
      isTemplate: false,
      status: TaskStatus.TODO,
      sortOrder: 0,
      templateId: template.id,
      dueDate: today,
    });

    await this.taskRepository.save(task);

    // Update the lastRecurrenceDate on the template
    template.lastRecurrenceDate = today;
    await this.taskRepository.save(template);
  }
}
