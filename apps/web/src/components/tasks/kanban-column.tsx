import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { type TaskResponseDto } from '@/types/dtos';
import { type TaskStatus, TaskStatusLabels, TaskStatusColors } from '@/types/enums';

import { SortableTaskCard } from './task-card';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskResponseDto[];
  onTaskClick: (task: TaskResponseDto) => void;
  onAddTask?: (status: TaskStatus) => void;
  className?: string;
}

export function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onAddTask,
  className,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const taskIds = tasks.map((task) => task.id);

  return (
    <div className={cn('bg-muted/50 flex w-[300px] min-w-[300px] flex-col rounded-lg', className)}>
      {/* Column Header */}
      <div className="bg-background/50 flex items-center justify-between rounded-t-lg border-b p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{TaskStatusLabels[status]}</h3>
          <Badge variant="secondary" className={cn(TaskStatusColors[status], 'text-xs')}>
            {tasks.length}
          </Badge>
        </div>
        {onAddTask && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAddTask(status)}
            aria-label={`Dodaj zadanie do kolumny ${TaskStatusLabels[status]}`}
          >
            <Plus size={14} aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[200px] flex-1 space-y-2 overflow-y-auto p-2 transition-colors',
          isOver && 'bg-primary/5'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              id={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="text-muted-foreground flex h-20 items-center justify-center rounded-lg border-2 border-dashed text-sm">
            Brak zadań
          </div>
        )}
      </div>
    </div>
  );
}
