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

export type CreateTarget = {
  kind: 'folder' | 'note';
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

  useEffect(() => setName(''), [target]);

  const create = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target || !name.trim() || busy) return;
    if (target.kind === 'note' && !target.parentId) return;
    setBusy(true);
    try {
      if (target.kind === 'folder') await addFolder(name.trim(), target.parentId);
      else
        await addNote({
          id: 0,
          title: name.trim(),
          content: '',
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
          <DialogTitle>{target?.kind === 'folder' ? '创建文件夹' : '新建笔记'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={(event) => void create(event)}>
          <div className="space-y-2">
            <Label htmlFor={inputId}>名称</Label>
            <Input
              id={inputId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={target?.kind === 'folder' ? '输入文件夹名称' : '输入笔记名称'}
              maxLength={target?.kind === 'folder' ? 120 : 200}
              disabled={busy}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">将创建在“{target?.parentName}”中</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={!name.trim() || busy}>
              {busy ? '创建中…' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
