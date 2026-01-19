import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '@/lib/utils/cn';
import { TaskStatus, TaskStatusLabels, TaskStatusColors } from '@/types/enums';
import { TaskResponseDto } from '@/types/dtos';
import { SortableTaskCard } from './task-card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div
      className={cn(
        'flex flex-col w-[300px] min-w-[300px] bg-muted/50 rounded-lg',
        className
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b bg-background/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">{TaskStatusLabels[status]}</h3>
          <Badge
            variant="secondary"
            className={cn(TaskStatusColors[status], 'text-xs')}
          >
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
          'flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] transition-colors',
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
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
            Brak zadań
          </div>
        )}
      </div>
    </div>
  );
}
