import { useCallback, useState } from 'react';

export function useCrudDialogs<T>() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  const openCreate = useCallback(() => setCreateOpen(true), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const startEditing = useCallback((item: T) => setEditing(item), []);
  const closeEditing = useCallback(() => setEditing(null), []);
  const startDeleting = useCallback((item: T) => setDeleting(item), []);
  const closeDeleting = useCallback(() => setDeleting(null), []);

  return {
    createOpen,
    editing,
    deleting,
    openCreate,
    closeCreate,
    startEditing,
    closeEditing,
    startDeleting,
    closeDeleting,
  };
}
