import { useContext, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Trash2,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotesContext } from '@/context/notes-context/index';
import { cn } from '@/lib/utils';
import type { noteFolderType, notesType } from 'src/types/apps/notes';

import CreateItemDialog, { type CreateTarget } from './create-item-dialog';

type DeleteTarget =
  { kind: 'folder'; id: string; name: string } | { kind: 'note'; id: number; name: string };

type FolderBranchProps = {
  depth: number;
  folder: noteFolderType;
  folders: noteFolderType[];
  notes: notesType[];
  openFolders: Set<string>;
  onToggle: (folderId: string) => void;
  onSelectNote: (noteId: number) => void;
  selectedNoteId: number;
  onCreate: (target: CreateTarget) => void;
  onDelete: (target: DeleteTarget) => void;
};

const noteColorClasses: Record<string, string> = {
  primary: 'text-primary',
  destructive: 'text-destructive',
  'chart-2': 'text-chart-2',
  'chart-3': 'text-chart-3',
  'chart-4': 'text-chart-4',
};

function NoteContextMenu({
  note,
  selectedNoteId,
  onSelectNote,
  onDelete,
  className,
}: {
  note: notesType;
  selectedNoteId: number;
  onSelectNote: (noteId: number) => void;
  onDelete: (target: DeleteTarget) => void;
  className?: string;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              'flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-sm transition-colors',
              selectedNoteId === note.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              className,
            )}
            onClick={() => onSelectNote(note.id)}
          />
        }
      >
        <FileText
          className={cn(
            'size-4 shrink-0',
            noteColorClasses[note.color ?? ''] ?? 'text-muted-foreground',
          )}
        />
        <span className="truncate">{note.title || '未命名笔记'}</span>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-40">
        <ContextMenuItem
          variant="destructive"
          onClick={() => onDelete({ kind: 'note', id: note.id, name: note.title })}
        >
          <Trash2 />
          删除文件
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function FolderBranch({
  depth,
  folder,
  folders,
  notes,
  openFolders,
  onToggle,
  onSelectNote,
  selectedNoteId,
  onCreate,
  onDelete,
}: FolderBranchProps) {
  const childFolders = folders.filter((item) => item.parentId === folder.id);
  const childNotes = notes.filter((note) => note.folderId === folder.id);
  const isOpen = openFolders.has(folder.id);

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <button
              type="button"
              className="flex h-8 w-full items-center gap-1.5 rounded-md pr-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
              style={{ paddingLeft: `${8 + depth * 14}px` }}
              onClick={() => onToggle(folder.id)}
              aria-expanded={isOpen}
            />
          }
        >
          {isOpen ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
          {isOpen ? (
            <FolderOpen className="size-4 text-primary" />
          ) : (
            <Folder className="size-4 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
          {childNotes.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">{childNotes.length}</span>
          )}
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-44">
          <ContextMenuItem
            onClick={() =>
              onCreate({ kind: 'folder', parentId: folder.id, parentName: folder.name })
            }
          >
            <FolderPlus />
            新建文件夹
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onCreate({ kind: 'note', parentId: folder.id, parentName: folder.name })}
          >
            <FilePlus2 />
            新建文件
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onClick={() => onDelete({ kind: 'folder', id: folder.id, name: folder.name })}
          >
            <Trash2 />
            删除文件夹
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isOpen && (
        <div>
          {childFolders.map((childFolder) => (
            <FolderBranch
              key={childFolder.id}
              depth={depth + 1}
              folder={childFolder}
              folders={folders}
              notes={notes}
              openFolders={openFolders}
              onToggle={onToggle}
              onSelectNote={onSelectNote}
              selectedNoteId={selectedNoteId}
              onCreate={onCreate}
              onDelete={onDelete}
            />
          ))}

          {childNotes.map((note) => (
            <div key={note.id} style={{ marginLeft: `${22 + depth * 14}px` }}>
              <NoteContextMenu
                note={note}
                selectedNoteId={selectedNoteId}
                onSelectNote={onSelectNote}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Notelist = () => {
  const { notes, folders, selectNote, deleteNote, deleteFolder, selectedNoteId, loading, error } =
    useContext(NotesContext);
  const [openFolders, setOpenFolders] = useState<Set<string>>(
    () => new Set(folders.map((folder) => folder.id)),
  );
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (folders.length) {
      setOpenFolders((current) =>
        current.size ? current : new Set(folders.map((folder) => folder.id)),
      );
    }
  }, [folders]);

  const visibleNotes = useMemo(() => notes.filter((note) => !note.deleted), [notes]);

  const handleToggle = (folderId: string) => {
    setOpenFolders((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget || busy) return;
    setBusy(true);
    try {
      if (deleteTarget.kind === 'folder') await deleteFolder(deleteTarget.id);
      else await deleteNote(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      /* 请求失败时保留删除目标。 */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {loading && <p className="px-3 py-4 text-xs text-muted-foreground">正在加载笔记…</p>}
      {error && (
        <p className="px-3 py-4 text-xs text-destructive">笔记加载失败，请重新打开页面。</p>
      )}
      <ScrollArea className="min-h-0 flex-1 px-2 py-2">
        <div className="flex min-h-full flex-col">
          {folders
            .filter((folder) => folder.parentId === null)
            .map((folder) => (
              <FolderBranch
                key={folder.id}
                depth={0}
                folder={folder}
                folders={folders}
                notes={visibleNotes}
                openFolders={openFolders}
                onToggle={handleToggle}
                onSelectNote={selectNote}
                selectedNoteId={selectedNoteId}
                onCreate={setCreateTarget}
                onDelete={setDeleteTarget}
              />
            ))}
          <ContextMenu>
            <ContextMenuTrigger
              render={
                <div tabIndex={0} aria-label="笔记目录空白处" className="min-h-32 w-full flex-1" />
              }
            />
            <ContextMenuContent>
              <ContextMenuItem
                onClick={() =>
                  setCreateTarget({ kind: 'folder', parentId: null, parentName: '根目录' })
                }
              >
                <FolderPlus />
                创建文件夹
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </ScrollArea>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">右键目录或文件夹以创建内容</p>

      <CreateItemDialog
        target={createTarget}
        onClose={() => setCreateTarget(null)}
        onCreated={(target) => {
          if (target.parentId) setOpenFolders((current) => new Set(current).add(target.parentId!));
        }}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              删除{deleteTarget?.kind === 'folder' ? '文件夹' : '文件'}“{deleteTarget?.name}”？
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'folder'
                ? '该文件夹中的子文件夹和文件也会被删除，此操作无法撤销。'
                : '删除后将无法恢复此文件，请确认是否继续。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button disabled={busy} variant="destructive" onClick={handleDelete}>
              {busy ? '删除中…' : '确认删除'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notelist;
