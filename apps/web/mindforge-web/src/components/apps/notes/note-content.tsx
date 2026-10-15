import { useContext, useEffect, useState } from 'react';
import { FileText, Menu } from 'lucide-react';

import MarkdownEditor from '@/components/markdown/markdown-editor';
import { Button } from '@/components/ui/button';
import { NotesContext } from '@/context/notes-context/index';

type NoteContentProps = {
  onOpenSidebar: () => void;
};

const NoteContent = ({ onOpenSidebar }: NoteContentProps) => {
  const { notes, updateNote, selectedNoteId } = useContext(NotesContext);
  const noteDetails = notes.find((note) => note.id === selectedNoteId && !note.deleted);
  const [content, setContent] = useState('');

  useEffect(() => {
    setContent(noteDetails?.content ?? '');
  }, [noteDetails?.id, noteDetails?.content]);

  const saveNote = async (nextContent = content) => {
    if (!noteDetails) return;
    await updateNote(noteDetails.id, {
      content: nextContent,
    });
  };

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
        {noteDetails ? (
          <MarkdownEditor
            className="h-full shadow-none"
            minHeight={430}
            value={content}
            onChange={(nextContent) => {
              setContent(nextContent);
            }}
            onSave={async (nextContent) => {
              setContent(nextContent);
              await saveNote(nextContent);
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
                在目录的文件夹菜单中新建笔记，或选择已有笔记。
              </p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

export default NoteContent;
