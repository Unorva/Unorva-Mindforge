import { lazy, Suspense, useContext, useEffect, useRef } from 'react';
import { FileText, Menu } from 'lucide-react';

import MarkdownEditor from '@/components/markdown/markdown-editor';
import { Button } from '@/components/ui/button';
import { NotesContext } from '@/context/notes-context/index';

import { isDrawingNote } from './note-drawing';
import { queueDrawingSave } from './drawing-save-queue';

const DrawingEditor = lazy(() => import('./drawing-editor'));
const draftKey = (id: number) => `mindforge-drawing-draft:${id}`;

function readDrawingDraft(id: number, savedContent: string) {
  try {
    const draft = sessionStorage.getItem(draftKey(id));
    if (draft === savedContent) {
      sessionStorage.removeItem(draftKey(id));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

type NoteContentProps = {
  onOpenSidebar: () => void;
};

const NoteContent = ({ onOpenSidebar }: NoteContentProps) => {
  const { notes, updateNote, selectedNoteId } = useContext(NotesContext);
  const noteDetails = notes.find((note) => note.id === selectedNoteId && !note.deleted);
  const drawingDrafts = useRef(new Map<number, string>());

  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (!drawingDrafts.current.size) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnUnsaved);
    return () => window.removeEventListener('beforeunload', warnUnsaved);
  }, []);

  return (
    <article className="flex h-full min-w-0 flex-1 flex-col bg-transparent">
      <div className="border-b border-border p-2 lg:hidden">
        <Button
          aria-label="打开文件目录"
          className="size-8"
          onClick={onOpenSidebar}
          size="icon"
          type="button"
          variant="outline"
        >
          <Menu className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        {noteDetails && isDrawingNote(noteDetails.title) ? (
          <Suspense
            fallback={
              <p role="status" className="p-6 text-sm text-muted-foreground">
                正在加载绘图编辑器…
              </p>
            }
          >
            <DrawingEditor
              key={noteDetails.id}
              title={noteDetails.title}
              value={
                drawingDrafts.current.get(noteDetails.id) ??
                readDrawingDraft(noteDetails.id, noteDetails.content ?? '') ??
                noteDetails.content ??
                ''
              }
              savedValue={noteDetails.content ?? ''}
              onChange={(nextContent, dirty) => {
                if (dirty) drawingDrafts.current.set(noteDetails.id, nextContent);
                else drawingDrafts.current.delete(noteDetails.id);
                try {
                  if (dirty) sessionStorage.setItem(draftKey(noteDetails.id), nextContent);
                  else sessionStorage.removeItem(draftKey(noteDetails.id));
                } catch {
                  // Keep the in-memory draft when browser storage is unavailable or full.
                }
              }}
              onSave={async (nextContent) => {
                await queueDrawingSave(noteDetails.id, () =>
                  updateNote(noteDetails.id, { content: nextContent }),
                );
                if (drawingDrafts.current.get(noteDetails.id) === nextContent) {
                  drawingDrafts.current.delete(noteDetails.id);
                  try {
                    sessionStorage.removeItem(draftKey(noteDetails.id));
                  } catch {
                    // Storage restrictions must not turn a successful server save into a failure.
                  }
                }
              }}
            />
          </Suspense>
        ) : noteDetails ? (
          <MarkdownEditor
            key={noteDetails.id}
            className="h-full shadow-none"
            minHeight={430}
            value={noteDetails.content ?? ''}
            onSave={async (nextContent) => {
              await updateNote(noteDetails.id, { content: nextContent });
            }}
            placeholder="开始记录，支持 Markdown 与 Typora 快捷键……"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-background">
            <div className="max-w-xs text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <h3 className="font-medium">选择一篇笔记</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                在文件夹菜单中新建笔记或 Excalidraw 绘图，或选择已有文件。
              </p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

export default NoteContent;
