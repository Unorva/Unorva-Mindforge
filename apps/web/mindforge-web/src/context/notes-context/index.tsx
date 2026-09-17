import { createContext, useState, useEffect } from 'react';

import React from 'react';
import useSWR from 'swr';
import { deleteFetcher, getFetcher, postFetcher, putFetcher } from 'src/api/global-fetcher';
import { noteFolderType, notesType } from 'src/types/apps/notes';

// Define context type
interface NotesContextType {
  notes: notesType[];
  folders: noteFolderType[];
  loading: boolean;
  error: Error | null;
  selectedNoteId: number;
  selectNote: (id: number) => void;
  addNote: (newNote: notesType) => Promise<void>;
  updateNote: (
    id: number,
    updates: Partial<Pick<notesType, 'title' | 'content' | 'color' | 'folderId'>>,
  ) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;
  addFolder: (name: string, parentId: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
}

// Initial context values
const initialContext: NotesContextType = {
  notes: [],
  folders: [],
  loading: true,
  error: null,
  selectedNoteId: 1,
  selectNote: () => {},
  addNote: async () => {},
  updateNote: async () => {},
  deleteNote: async () => {},
  addFolder: async () => {},
  deleteFolder: async () => {},
};

// Create context
export const NotesContext = createContext<NotesContextType>(initialContext);

// Provider component
export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<notesType[]>(initialContext.notes);
  const [folders, setFolders] = useState<noteFolderType[]>(initialContext.folders);
  const [loading, setLoading] = useState<boolean>(initialContext.loading);
  const [error, setError] = useState<Error | null>(initialContext.error);
  const [selectedNoteId, setSelectedNoteId] = useState<number>(initialContext.selectedNoteId);

  // Fetch notes from the server
  const {
    data: notesData,
    isLoading: isNotesLoading,
    error: notesError,
    mutate,
  } = useSWR('/api/data/notes/NotesData', getFetcher);
  useEffect(() => {
    if (notesData) {
      setNotes(notesData.data);
      setFolders(notesData.folders ?? []);
      const visibleNotes = (notesData.data as notesType[]).filter((note) => !note.deleted);
      if (visibleNotes.length && !visibleNotes.some((note) => note.id === selectedNoteId)) {
        setSelectedNoteId(visibleNotes[0].id);
      }
      setLoading(false);
    } else if (notesError) {
      setError(notesError);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [notesData, notesError, isNotesLoading, selectedNoteId]);

  // Select a note by its ID
  const selectNote = (id: number) => {
    setSelectedNoteId(id);
  };

  // Add a new note
  const addNote = async (newNote: notesType) => {
    try {
      const response = await mutate(postFetcher('/api/notes/add', newNote));
      const createdNote = response?.data?.at(-1) as notesType | undefined;
      if (createdNote) setSelectedNoteId(createdNote.id);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  // Update a note by its ID
  const updateNote = async (
    id: number,
    updates: Partial<Pick<notesType, 'title' | 'content' | 'color' | 'folderId'>>,
  ) => {
    try {
      await mutate(putFetcher('/api/notes/update', { id, ...updates }));
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  // Delete a note by its ID
  const deleteNote = async (id: number) => {
    try {
      const response = await mutate(deleteFetcher('/api/notes/delete', { id }));
      const nextNote = (response?.data as notesType[] | undefined)?.find((note) => !note.deleted);
      if (nextNote) setSelectedNoteId(nextNote.id);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const addFolder = async (name: string, parentId: string | null) => {
    try {
      const response = await postFetcher('/api/notes/folders/add', { name, parentId });
      setFolders(response.data);
    } catch (error) {
      console.error('Error adding folder:', error);
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      const response = await deleteFetcher('/api/notes/folders/delete', { id });
      const remainingNotes = response.notes as notesType[];
      setFolders(response.data);
      setNotes(remainingNotes);
      if (!remainingNotes.some((note) => note.id === selectedNoteId)) {
        setSelectedNoteId(remainingNotes[0]?.id ?? 0);
      }
      await mutate({ ...notesData, data: remainingNotes, folders: response.data }, false);
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        folders,
        loading,
        error,
        selectedNoteId,
        selectNote,
        addNote,
        updateNote,
        deleteNote,
        addFolder,
        deleteFolder,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};
