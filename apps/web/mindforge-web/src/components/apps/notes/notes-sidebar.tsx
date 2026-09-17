import { useContext } from 'react'
import { ChevronRight } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { NotesContext } from '@/context/notes-context/index'

import { getFolderPath } from './note-folders'
import Notelist from './notes-list'

const NotesSidebar = () => {
  const { folders, notes, selectedNoteId } = useContext(NotesContext)
  const selectedNote = notes.find((note) => note.id === selectedNoteId && !note.deleted)
  const folderPath = selectedNote ? getFolderPath(folders, selectedNote.folderId) : []

  return (
    <Card className="h-full w-72 overflow-hidden py-0!">
    <aside className="flex h-full min-h-0 flex-col bg-muted/20">
      <nav aria-label="当前笔记路径" className="flex min-h-12 items-center gap-1 overflow-hidden border-b border-border px-3 text-xs text-muted-foreground">
        {folderPath.length ? folderPath.map((folder, index) => (
          <span className="flex min-w-0 items-center gap-1" key={folder.id}>
            {index > 0 && <ChevronRight className="size-3 shrink-0" />}
            <span className="truncate">{folder.name}</span>
          </span>
        )) : <span>笔记目录</span>}
      </nav>
      <div className="min-h-0 flex-1">
        <Notelist />
      </div>
    </aside>
    </Card>
  )
}

export default NotesSidebar
