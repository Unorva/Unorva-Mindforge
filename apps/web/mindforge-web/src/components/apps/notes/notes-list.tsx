import { useContext, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Trash2,
} from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NotesContext } from '@/context/notes-context/index'
import { cn } from '@/lib/utils'
import type { noteFolderType, notesType } from 'src/types/apps/notes'

type CreateTarget = {
  kind: 'folder' | 'note'
  parentId: string
  parentName: string
}

type DeleteTarget =
  | { kind: 'folder'; id: string; name: string }
  | { kind: 'note'; id: number; name: string }

type FolderBranchProps = {
  depth: number
  folder: noteFolderType
  folders: noteFolderType[]
  notes: notesType[]
  openFolders: Set<string>
  onToggle: (folderId: string) => void
  onSelectNote: (noteId: number) => void
  selectedNoteId: number
  onCreate: (target: CreateTarget) => void
  onDelete: (target: DeleteTarget) => void
}

const noteColorClasses: Record<string, string> = {
  primary: 'text-primary',
  destructive: 'text-destructive',
  'chart-2': 'text-chart-2',
  'chart-3': 'text-chart-3',
  'chart-4': 'text-chart-4',
}

function NoteContextMenu({
  note,
  selectedNoteId,
  onSelectNote,
  onDelete,
  className,
}: {
  note: notesType
  selectedNoteId: number
  onSelectNote: (noteId: number) => void
  onDelete: (target: DeleteTarget) => void
  className?: string
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
        <FileText className={cn('size-4 shrink-0', noteColorClasses[note.color ?? ''] ?? 'text-muted-foreground')} />
        <span className="truncate">{note.title || '未命名笔记'}</span>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-40">
        <ContextMenuItem
          variant="destructive"
          onClick={() => onDelete({ kind: 'note', id: note.id, name: note.title })}
        >
          <Trash2 />删除文件
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
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
  const childFolders = folders.filter((item) => item.parentId === folder.id)
  const childNotes = notes.filter((note) => note.folderId === folder.id)
  const isOpen = openFolders.has(folder.id)

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
          {isOpen ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
          {isOpen ? <FolderOpen className="size-4 text-primary" /> : <Folder className="size-4 text-muted-foreground" />}
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
          {childNotes.length > 0 && <span className="text-xs tabular-nums text-muted-foreground">{childNotes.length}</span>}
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-44">
          <ContextMenuItem onClick={() => onCreate({ kind: 'folder', parentId: folder.id, parentName: folder.name })}>
            <FolderPlus />新建文件夹
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onCreate({ kind: 'note', parentId: folder.id, parentName: folder.name })}>
            <FilePlus2 />新建文件
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onClick={() => onDelete({ kind: 'folder', id: folder.id, name: folder.name })}
          >
            <Trash2 />删除文件夹
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
  )
}

const Notelist = () => {
  const {
    notes,
    folders,
    selectNote,
    addNote,
    deleteNote,
    addFolder,
    deleteFolder,
    selectedNoteId,
  } = useContext(NotesContext)
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set(folders.map((folder) => folder.id)))
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null)
  const [createName, setCreateName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  useEffect(() => {
    if (folders.length) {
      setOpenFolders((current) => current.size ? current : new Set(folders.map((folder) => folder.id)))
    }
  }, [folders])

  const visibleNotes = useMemo(() => notes.filter((note) => !note.deleted), [notes])

  const handleToggle = (folderId: string) => {
    setOpenFolders((current) => {
      const next = new Set(current)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const handleCreate = async () => {
    if (!createTarget || !createName.trim()) return
    if (createTarget.kind === 'folder') {
      await addFolder(createName.trim(), createTarget.parentId)
    } else {
      await addNote({
        id: 0,
        title: createName.trim(),
        content: '',
        color: 'primary',
        folderId: createTarget.parentId,
        deleted: false,
      })
    }
    setOpenFolders((current) => new Set(current).add(createTarget.parentId))
    setCreateTarget(null)
    setCreateName('')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'folder') await deleteFolder(deleteTarget.id)
    else await deleteNote(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1 px-2 py-2">
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
              onCreate={(target) => {
                setCreateName('')
                setCreateTarget(target)
              }}
              onDelete={setDeleteTarget}
            />
          ))}
      </ScrollArea>

      <Dialog
        open={Boolean(createTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCreateTarget(null)
            setCreateName('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createTarget?.kind === 'folder' ? '新建文件夹' : '新建文件'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="tree-item-name">名称</Label>
            <Input
              id="tree-item-name"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleCreate()
              }}
              placeholder={createTarget?.kind === 'folder' ? '输入文件夹名称' : '输入文件名称'}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">将创建在“{createTarget?.parentName}”中</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTarget(null)}>取消</Button>
            <Button disabled={!createName.trim()} onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
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
            <AlertDialogAction variant="destructive" onClick={handleDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Notelist
