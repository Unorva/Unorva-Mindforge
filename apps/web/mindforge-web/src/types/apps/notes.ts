export interface notesType {
  id: number;
  color?: string;
  title: string;
  content?: string;
  folderId?: string;
  datef?: string;
  deleted: boolean;
}

export interface noteFolderType {
  id: string;
  name: string;
  parentId: string | null;
}
