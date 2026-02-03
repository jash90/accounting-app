import { forwardRef } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, GripVertical, Link2, MessageSquare } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { mapTaskLabels } from '@/lib/utils/task-label-mapper';
import { type TaskResponseDto } from '@/types/dtos';
import { TaskStatus } from '@/types/enums';

import { TaskLabelList } from './task-label-badge';
import { TaskPriorityBadge } from './task-priority-badge';
import { TaskStatusBadge } from './task-status-badge';

interface TaskCardProps {
  task: TaskResponseDto;
  onClick?: () => void;
  isDragging?: boolean;
  showStatus?: boolean;
  className?: string;
}

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(
  ({ task, onClick, isDragging = false, showStatus = false, className }, ref) => {
    const labels = mapTaskLabels(task.labels);
    const commentCount = task.comments?.length || 0;
    const dependencyCount = task.dependencies?.length || 0;

    const getInitials = (firstName?: string, lastName?: string) => {
      const first = firstName?.charAt(0) || '';
      const last = lastName?.charAt(0) || '';
      return (first + last).toUpperCase() || '?';
    };

    const isOverdue =
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.DONE;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    };

    return (
      <Card
        ref={ref}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? 'button' : undefined}
        aria-label={`Zadanie: ${task.title}${isOverdue ? ' - po terminie' : ''}`}
        className={cn(
          'transition-shadow hover:shadow-md',
          onClick && 'cursor-pointer',
          isDragging && 'opacity-50 shadow-lg',
          isOverdue && 'border-red-300',
          onClick && 'focus:ring-primary focus:ring-2 focus:ring-offset-2 focus:outline-none',
          className
        )}
      >
        <CardContent className="space-y-2 p-3">
          {/* Labels */}
          {labels.length > 0 && <TaskLabelList labels={labels} size="sm" maxVisible={2} />}

          {/* Title */}
          <h4 className="line-clamp-2 text-sm leading-snug font-medium">{task.title}</h4>

          {/* Meta info */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Priority */}
              <TaskPriorityBadge priority={task.priority} size="sm" showLabel={false} />

              {/* Status (optional) */}
              {showStatus && <TaskStatusBadge status={task.status} size="sm" />}

              {/* Due date */}
              {task.dueDate && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'flex items-center gap-1 text-xs',
                          isOverdue ? 'text-red-600' : 'text-muted-foreground'
                        )}
                      >
                        <Calendar size={12} />
                        <span>{format(new Date(task.dueDate), 'd MMM', { locale: pl })}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Termin: {format(new Date(task.dueDate), 'PPP', { locale: pl })}
                        {isOverdue && ' (po terminie)'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Indicators */}
            <div className="text-muted-foreground flex items-center gap-1.5">
              {commentCount > 0 && (
                <div className="flex items-center gap-0.5 text-xs">
                  <MessageSquare size={12} />
                  <span>{commentCount}</span>
                </div>
              )}
              {dependencyCount > 0 && (
                <div className="flex items-center gap-0.5 text-xs">
                  <Link2 size={12} />
                  <span>{dependencyCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer: Client and Assignee */}
          <div className="flex items-center justify-between pt-1">
            {/* Client */}
            {task.client && (
              <span className="text-muted-foreground max-w-[100px] truncate text-xs">
                {task.client.name}
              </span>
            )}
            {!task.client && <span />}

            {/* Assignee */}
            {task.assignee && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(task.assignee.firstName, task.assignee.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {task.assignee.firstName} {task.assignee.lastName}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

TaskCard.displayName = 'TaskCard';

// Sortable version for Kanban
interface SortableTaskCardProps extends TaskCardProps {
  id: string;
}

export function SortableTaskCard({ id, ...props }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div
        {...attributes}
        {...listeners}
        aria-label="Przeciągnij zadanie"
        role="button"
        tabIndex={0}
        className="text-muted-foreground hover:text-foreground focus:ring-primary absolute top-1/2 left-0 -translate-x-2 -translate-y-1/2 cursor-grab rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus:ring-2 focus:ring-offset-1 focus:outline-none active:cursor-grabbing"
      >
        <GripVertical size={16} aria-hidden="true" />
      </div>
      <TaskCard {...props} isDragging={isDragging} />
    </div>
  );
}
