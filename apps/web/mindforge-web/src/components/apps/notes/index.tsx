import { useContext, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { AppWorkspace } from '@/components/shared/app-workspace';
import { NotesContext, NotesProvider } from '@/context/notes-context/index';

import NoteContent from './note-content';
import NotesSidebar from './notes-sidebar';
import CreateItemDialog, { type CreateTarget } from './create-item-dialog';

const NotesWorkspace = () => {
  const { folders, loading, error, refresh } = useContext(NotesContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);

  if (loading) {
    return (
      <AppWorkspace className="flex items-center justify-center bg-transparent">
        <p role="status" className="text-sm text-muted-foreground">
          正在加载笔记…
        </p>
      </AppWorkspace>
    );
  }

  if (error && !folders.length) {
    return (
      <AppWorkspace className="flex items-center justify-center bg-transparent">
        <div role="alert" className="space-y-4 text-center">
          <p className="text-sm text-destructive">笔记加载失败，请重试。</p>
          <Button variant="outline" onClick={() => void refresh().catch(() => {})}>
            重新加载
          </Button>
        </div>
      </AppWorkspace>
    );
  }

  if (!folders.length) {
    return (
      <AppWorkspace className="flex items-center justify-center bg-transparent">
        <div className="max-w-xs space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-muted">
            <FolderPlus className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="font-medium">还没有文件夹</h2>
            <p className="text-sm text-muted-foreground">创建一个文件夹，开始整理你的笔记。</p>
          </div>
          <Button
            onClick={() =>
              setCreateTarget({ kind: 'folder', parentId: null, parentName: '根目录' })
            }
          >
            <FolderPlus />
            创建文件夹
          </Button>
        </div>
        <CreateItemDialog target={createTarget} onClose={() => setCreateTarget(null)} />
      </AppWorkspace>
    );
  }

  return (
    <AppWorkspace className="flex min-w-0 gap-5 overflow-visible bg-transparent">
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-72 max-w-72 p-0 lg:hidden">
          <SheetTitle className="sr-only">笔记目录</SheetTitle>
          <NotesSidebar />
        </SheetContent>
      </Sheet>
      <div className="hidden h-full lg:block">
        <NotesSidebar />
      </div>
      <NoteContent onOpenSidebar={() => setIsSidebarOpen(true)} />
    </AppWorkspace>
  );
};

const NotesApp = () => (
  <NotesProvider>
    <NotesWorkspace />
  </NotesProvider>
);

export default NotesApp;
