import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { cn } from '@/lib/utils/cn';
import { TaskStatus } from '@/types/enums';
import { TaskResponseDto, KanbanBoardDto } from '@/types/dtos';
import { KanbanColumn } from './kanban-column';
import { TaskCard } from './task-card';

interface KanbanBoardProps {
  data: KanbanBoardDto;
  onTaskClick: (task: TaskResponseDto) => void;
  onTaskMove: (taskId: string, newStatus: TaskStatus, newIndex: number) => void;
  onAddTask?: (status: TaskStatus) => void;
  className?: string;
}

const statusOrder: TaskStatus[] = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];

export function KanbanBoard({
  data,
  onTaskClick,
  onTaskMove,
  onAddTask,
  className,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskResponseDto | null>(null);
  const [localData, setLocalData] = useState<KanbanBoardDto>(data);

  // Update local data when prop changes
  useMemo(() => {
    setLocalData(data);
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findTaskById = useCallback(
    (taskId: string): { task: TaskResponseDto; status: TaskStatus } | null => {
      for (const status of statusOrder) {
        const tasks = localData[status] || [];
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          return { task, status };
        }
      }
      return null;
    },
    [localData]
  );

  const findColumnByTaskId = useCallback(
    (taskId: string): TaskStatus | null => {
      for (const status of statusOrder) {
        const tasks = localData[status] || [];
        if (tasks.some((t) => t.id === taskId)) {
          return status;
        }
      }
      return null;
    },
    [localData]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const result = findTaskById(active.id as string);
    if (result) {
      setActiveTask(result.task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByTaskId(activeId);
    const overColumn = statusOrder.includes(overId as TaskStatus)
      ? (overId as TaskStatus)
      : findColumnByTaskId(overId);

    if (!activeColumn || !overColumn || activeColumn === overColumn) {
      return;
    }

    // Move task between columns
    setLocalData((prev) => {
      const activeTasks = [...(prev[activeColumn] || [])];
      const overTasks = [...(prev[overColumn] || [])];

      const activeIndex = activeTasks.findIndex((t) => t.id === activeId);
      const [movedTask] = activeTasks.splice(activeIndex, 1);

      // Update task status
      const updatedTask = { ...movedTask, status: overColumn };

      // Find insert position
      let overIndex = overTasks.findIndex((t) => t.id === overId);
      if (overIndex === -1) {
        overIndex = overTasks.length;
      }

      overTasks.splice(overIndex, 0, updatedTask);

      return {
        ...prev,
        [activeColumn]: activeTasks,
        [overColumn]: overTasks,
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByTaskId(activeId);
    const overColumn = statusOrder.includes(overId as TaskStatus)
      ? (overId as TaskStatus)
      : findColumnByTaskId(overId);

    if (!activeColumn || !overColumn) return;

    if (activeColumn === overColumn) {
      // Reorder within same column
      const tasks = localData[activeColumn] || [];
      const activeIndex = tasks.findIndex((t) => t.id === activeId);
      const overIndex = tasks.findIndex((t) => t.id === overId);

      if (activeIndex !== overIndex) {
        const newTasks = arrayMove(tasks, activeIndex, overIndex);
        setLocalData((prev) => ({
          ...prev,
          [activeColumn]: newTasks,
        }));
        onTaskMove(activeId, activeColumn, overIndex);
      }
    } else {
      // Move between columns - already handled in dragOver
      const overTasks = localData[overColumn] || [];
      const newIndex = overTasks.findIndex((t) => t.id === activeId);
      onTaskMove(activeId, overColumn, newIndex === -1 ? 0 : newIndex);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          'flex gap-4 overflow-x-auto pb-4 min-h-[500px]',
          className
        )}
      >
        {statusOrder.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={localData[status] || []}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} isDragging className="rotate-3 shadow-xl" />
        )}
      </DragOverlay>
    </DndContext>
  );
}
