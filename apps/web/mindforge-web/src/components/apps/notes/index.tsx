import { useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AppWorkspace } from '@/components/shared/app-workspace'
import { NotesProvider } from '@/context/notes-context/index'

import NoteContent from './note-content'
import NotesSidebar from './notes-sidebar'

const NotesApp = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <NotesProvider>
      <AppWorkspace className="flex min-w-0 gap-5 overflow-visible bg-transparent">
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetContent side="left" showCloseButton={false} className="w-72 max-w-72 p-0 lg:hidden">
              <NotesSidebar />
            </SheetContent>
          </Sheet>
          <div className="hidden h-full lg:block">
            <NotesSidebar />
          </div>
          <NoteContent onOpenSidebar={() => setIsSidebarOpen(true)} />
      </AppWorkspace>
    </NotesProvider>
  )
}

export default NotesApp
