import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { TFunction } from 'i18next';

import type { Resident } from '../sse/client';
import { fromLocalDateTimeInputValue, primaryTimestamp, toLocalDateTimeInputValue } from '../utils/resident-derived';

export type ResidentEditDraft = {
  name: string;
  room: string;
  status: Resident['status'];
  lastSeenAt: string;
  lastSeenLocation: string;
};

type UseResidentEditorOptions = {
  residents: Record<string, Resident>;
  onSave: (id: string, updates: Partial<Resident>) => void;
  onRemove: (id: string, resident: Resident) => void;
  t: TFunction<'translation'>;
};

export const useResidentEditor = ({ residents, onSave, onRemove, t }: UseResidentEditorOptions) => {
  const [editingResidentId, setEditingResidentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ResidentEditDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editingResident = editingResidentId ? residents[editingResidentId] ?? null : null;

  const beginEdit = useCallback(
    (resident: Resident) => {
      setEditingResidentId(resident.id);
      setError(null);
      setDraft({
        name: resident.name,
        room: resident.room,
        status: resident.status,
        lastSeenAt: toLocalDateTimeInputValue(primaryTimestamp(resident)),
        lastSeenLocation: resident.lastSeenLocation ?? ''
      });
    },
    []
  );

  const cancelEdit = useCallback(() => {
    setEditingResidentId(null);
    setDraft(null);
    setError(null);
  }, []);

  const updateDraft = useCallback((field: keyof ResidentEditDraft, value: string) => {
    setDraft((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        [field]: value
      };
    });
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editingResidentId || !draft) {
        return;
      }

      const baseResident = residents[editingResidentId];
      if (!baseResident) {
        cancelEdit();
        return;
      }

      const name = draft.name.trim();
      if (!name) {
        setError(t('residents.edit.errors.requiredName'));
        return;
      }

      const room = draft.room.trim();
      if (!room) {
        setError(t('residents.edit.errors.requiredRoom'));
        return;
      }

      const location = draft.lastSeenLocation.trim() || baseResident.lastSeenLocation || room;
      const lastSeenAtIso =
        fromLocalDateTimeInputValue(draft.lastSeenAt) ??
        baseResident.lastSeenAt ??
        baseResident.updatedAt ??
        baseResident.createdAt;
      const nextStatus = draft.status;

      const updates: Partial<Resident> = {
        name,
        room,
        status: nextStatus,
        lastSeenLocation: location,
        lastSeenAt: lastSeenAtIso ?? baseResident.lastSeenAt,
        updatedAt: new Date().toISOString(),
        checkedOut: nextStatus === 'checked_out'
      };

      onSave(editingResidentId, updates);
      cancelEdit();
    },
    [cancelEdit, draft, editingResidentId, onSave, residents, t]
  );

  const handleDelete = useCallback(() => {
    if (!editingResidentId) {
      return;
    }
    const resident = residents[editingResidentId];
    if (!resident) {
      cancelEdit();
      return;
    }
    const confirmed = window.confirm(t('residents.edit.confirmDelete', { name: resident.name }));
    if (!confirmed) {
      return;
    }
    onRemove(editingResidentId, resident);
    cancelEdit();
  }, [cancelEdit, editingResidentId, onRemove, residents, t]);

  useEffect(() => {
    if (editingResidentId && !residents[editingResidentId]) {
      cancelEdit();
    }
  }, [cancelEdit, editingResidentId, residents]);

  return {
    editingResidentId,
    editingResident,
    draft,
    error,
    beginEdit,
    cancelEdit,
    updateDraft,
    handleSubmit,
    handleDelete
  };
};
