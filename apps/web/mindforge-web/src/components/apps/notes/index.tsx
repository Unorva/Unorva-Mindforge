import { useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { NotesProvider } from '@/context/notes-context/index'

import NoteContent from './note-content'
import NotesSidebar from './notes-sidebar'

const NotesApp = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <NotesProvider>
      <div className="flex h-[calc(100dvh-13rem)] min-h-[640px] min-w-0 gap-5">
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetContent side="left" showCloseButton={false} className="w-72 max-w-72 p-0 lg:hidden">
              <NotesSidebar />
            </SheetContent>
          </Sheet>
          <div className="hidden h-full lg:block">
            <NotesSidebar />
          </div>
          <NoteContent onOpenSidebar={() => setIsSidebarOpen(true)} />
      </div>
    </NotesProvider>
  )
}

export default NotesApp
