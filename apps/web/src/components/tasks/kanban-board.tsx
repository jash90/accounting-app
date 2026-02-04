import { useCallback, useMemo, useRef, useState } from 'react';

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardSensorOptions,
  type PointerSensorOptions,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import { cn } from '@/lib/utils/cn';
import { type KanbanBoardDto, type TaskResponseDto } from '@/types/dtos';
import { TaskStatus } from '@/types/enums';

import { KanbanColumn } from './kanban-column';
import { TaskCard } from './task-card';

// Memoized sensor options to prevent unnecessary re-renders
const POINTER_SENSOR_OPTIONS: PointerSensorOptions = {
  activationConstraint: {
    distance: 8,
  },
};

const KEYBOARD_SENSOR_OPTIONS: KeyboardSensorOptions = {
  coordinateGetter: sortableKeyboardCoordinates,
};

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
  // Track if we're currently dragging - when not dragging, use props directly
  const [isDragging, setIsDragging] = useState(false);
  // Local state only used during drag operations for optimistic updates
  const [dragData, setDragData] = useState<KanbanBoardDto>(data);

  // Store drag state in ref to avoid re-renders during drag (optimized performance)
  // Note: This ref is only accessed/modified in event handlers, not during render
  const dragStateRef = useRef<KanbanBoardDto>(data);

  // Use prop data when not dragging, local drag data when dragging
  const localData = isDragging ? dragData : data;

  // Build task ID → column Map for O(1) lookups during drag operations
  const taskColumnMap = useMemo(() => {
    const map = new Map<string, TaskStatus>();
    for (const status of statusOrder) {
      const tasks = localData[status] || [];
      tasks.forEach((task) => map.set(task.id, status));
    }
    return map;
  }, [localData]);

  // Use memoized sensor options to prevent re-renders
  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_SENSOR_OPTIONS),
    useSensor(KeyboardSensor, KEYBOARD_SENSOR_OPTIONS)
  );

  const findTaskById = useCallback(
    (taskId: string): { task: TaskResponseDto; status: TaskStatus } | null => {
      const status = taskColumnMap.get(taskId);
      if (!status) return null;
      const tasks = localData[status] || [];
      const task = tasks.find((t) => t.id === taskId);
      return task ? { task, status } : null;
    },
    [localData, taskColumnMap]
  );

  // Find column by task ID using drag state ref (for during drag operations)
  const findColumnByTaskIdInDragState = useCallback((taskId: string): TaskStatus | null => {
    for (const status of statusOrder) {
      const tasks = dragStateRef.current[status] || [];
      if (tasks.some((t) => t.id === taskId)) {
        return status;
      }
    }
    return null;
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const result = findTaskById(active.id as string);
    if (result) {
      setActiveTask(result.task);
      setIsDragging(true);
      // Initialize drag state from current data
      dragStateRef.current = { ...data };
      setDragData({ ...data });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Use drag state ref for lookups during drag (avoids stale state issues)
    const activeColumn = findColumnByTaskIdInDragState(activeId);
    const overColumn = statusOrder.includes(overId as TaskStatus)
      ? (overId as TaskStatus)
      : findColumnByTaskIdInDragState(overId);

    if (!activeColumn || !overColumn || activeColumn === overColumn) {
      return;
    }

    // Update drag state ref and sync with React state for visual feedback
    const activeTasks = [...(dragStateRef.current[activeColumn] || [])];
    const overTasks = [...(dragStateRef.current[overColumn] || [])];

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

    const newDragState = {
      ...dragStateRef.current,
      [activeColumn]: activeTasks,
      [overColumn]: overTasks,
    };

    // Update both ref and state - ref for performance, state for visual updates
    dragStateRef.current = newDragState;
    setDragData(newDragState);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setIsDragging(false);

    if (!over) {
      // Drag cancelled - reset happens automatically since we're no longer using dragData
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByTaskIdInDragState(activeId);
    const overColumn = statusOrder.includes(overId as TaskStatus)
      ? (overId as TaskStatus)
      : findColumnByTaskIdInDragState(overId);

    if (!activeColumn || !overColumn) return;

    if (activeColumn === overColumn) {
      // Reorder within same column
      const tasks = dragStateRef.current[activeColumn] || [];
      const activeIndex = tasks.findIndex((t) => t.id === activeId);
      const overIndex = tasks.findIndex((t) => t.id === overId);

      if (activeIndex !== overIndex) {
        onTaskMove(activeId, activeColumn, overIndex);
      }
    } else {
      // Move between columns - state already updated in dragOver
      const overTasks = dragStateRef.current[overColumn] || [];
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
      <div className={cn('flex min-h-[500px] gap-4 overflow-x-auto pb-4', className)}>
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
        {activeTask && <TaskCard task={activeTask} isDragging className="rotate-3 shadow-xl" />}
      </DragOverlay>
    </DndContext>
  );
}
