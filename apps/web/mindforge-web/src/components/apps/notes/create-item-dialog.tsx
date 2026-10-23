import { useContext, useEffect, useId, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NotesContext } from '@/context/notes-context';

import { createEmptyDrawing, isDrawingNote } from './note-drawing';

export type CreateTarget = {
  kind: 'folder' | 'note' | 'drawing';
  parentId: string | null;
  parentName: string;
};

export default function CreateItemDialog({
  target,
  onClose,
  onCreated,
}: {
  target: CreateTarget | null;
  onClose: () => void;
  onCreated?: (target: CreateTarget) => void;
}) {
  const { addFolder, addNote } = useContext(NotesContext);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const inputId = useId();
  const trimmedName = name.trim();
  const title =
    target?.kind === 'drawing' && !isDrawingNote(trimmedName)
      ? `${trimmedName}.excalidraw`
      : trimmedName;
  const validName = Boolean(trimmedName) && title.length <= (target?.kind === 'folder' ? 120 : 200);

  useEffect(() => setName(''), [target]);

  const create = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target || !validName || busy) return;
    if (target.kind !== 'folder' && !target.parentId) return;
    setBusy(true);
    try {
      if (target.kind === 'folder') await addFolder(title, target.parentId);
      else
        await addNote({
          id: 0,
          title,
          content: isDrawingNote(title) ? createEmptyDrawing() : '',
          color: 'primary',
          folderId: target.parentId!,
          deleted: false,
        });
      onCreated?.(target);
      onClose();
    } catch {
      // 请求失败时保留名称，由统一请求层展示错误。
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target?.kind === 'folder'
              ? '创建文件夹'
              : target?.kind === 'drawing'
                ? '新建 Excalidraw 绘图'
                : '新建笔记'}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={(event) => void create(event)}>
          <div className="space-y-2">
            <Label htmlFor={inputId}>名称</Label>
            <Input
              id={inputId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                target?.kind === 'folder'
                  ? '输入文件夹名称'
                  : target?.kind === 'drawing'
                    ? '输入绘图名称'
                    : '输入笔记名称'
              }
              maxLength={target?.kind === 'folder' ? 120 : 200}
              disabled={busy}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">将创建在“{target?.parentName}”中</p>
            {target?.kind === 'drawing' && (
              <p className="text-xs text-muted-foreground">
                自动添加 .excalidraw 后缀，可在笔记页面直接画图。
              </p>
            )}
            {trimmedName && !validName && (
              <p className="text-xs text-destructive">文件名称（含后缀）不能超过 200 个字符。</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={!validName || busy}>
              {busy ? '创建中…' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
