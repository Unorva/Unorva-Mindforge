import { createContext, useEffect, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { deleteFetcher, getFetcher, postFetcher, putFetcher } from '@/api/global-fetcher';
import type { ApiResult } from '@/types/api';
import type { noteFolderType, notesType } from '@/types/apps/notes';

interface NotesData {
  notes: notesType[];
  folders: noteFolderType[];
}

interface NotesContextType extends NotesData {
  loading: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
  selectedNoteId: number;
  selectNote: (id: number) => void;
  addNote: (note: notesType) => Promise<void>;
  updateNote: (id: number, updates: Partial<notesType>) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;
  addFolder: (name: string, parentId: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
}

export const NotesContext = createContext<NotesContextType>({
  notes: [],
  folders: [],
  loading: true,
  error: undefined,
  refresh: async () => {},
  selectedNoteId: 0,
  selectNote: () => {},
  addNote: async () => {},
  updateNote: async () => {},
  deleteNote: async () => {},
  addFolder: async () => {},
  deleteFolder: async () => {},
});

export function NotesProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading, mutate } = useSWR<ApiResult<NotesData>, Error>(
    '/api/data/notes/NotesData',
    getFetcher,
  );
  const [selectedNoteId, selectNote] = useState(0);
  const notes = data?.data.notes ?? [];
  const folders = data?.data.folders ?? [];

  useEffect(() => {
    const visible = data?.data.notes.filter((note) => !note.deleted) ?? [];
    if (!visible.some((note) => note.id === selectedNoteId)) selectNote(visible[0]?.id ?? 0);
  }, [data, selectedNoteId]);

  const applyUpdate = async (request: Promise<ApiResult<NotesData>>) => {
    const result = await request;
    if (!result.success) throw new Error(result.message);
    await mutate(result, { revalidate: false });
    return result.data;
  };

  const addNote = async (note: notesType) => {
    const previousIds = new Set(notes.map((item) => item.id));
    const result = await applyUpdate(postFetcher('/api/notes/add', note));
    selectNote(result.notes.find((item) => !previousIds.has(item.id))?.id ?? selectedNoteId);
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        folders,
        loading: isLoading,
        error,
        refresh: async () => {
          await mutate();
        },
        selectedNoteId,
        selectNote,
        addNote,
        updateNote: async (id, updates) => {
          await applyUpdate(putFetcher('/api/notes/update', { id, ...updates }));
        },
        deleteNote: async (id) => {
          await applyUpdate(deleteFetcher('/api/notes/delete', { id }));
        },
        addFolder: async (name, parentId) => {
          await applyUpdate(postFetcher('/api/notes/folders/add', { name, parentId }));
        },
        deleteFolder: async (id) => {
          await applyUpdate(deleteFetcher('/api/notes/folders/delete', { id }));
        },
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}
