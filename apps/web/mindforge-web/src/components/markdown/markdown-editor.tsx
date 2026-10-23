import { Extension } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import {
  Bold,
  Braces,
  Code2,
  Eye,
  FileCode2,
  Heading1,
  Heading2,
  CircleHelp,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Quote,
  Redo2,
  Save,
  Sparkles,
  Strikethrough,
  Underline,
  Undo2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { uploadMarkdownImage } from '@/api/files/images';
import { ImageUploadPlaceholders, imageUploadKey, StoredImage } from './editor-images';
import {
  clipboardImages,
  imageMarkdown,
  mapSourcePosition,
  validateClipboardImage,
  type SourceEdit,
} from './image-clipboard';

import './markdown-editor.css';

type EditorMode = 'visual' | 'source';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export type MarkdownEditorProps = {
  className?: string;
  disabled?: boolean;
  minHeight?: number;
  onChange?: (markdown: string) => void;
  onImageUploadingChange?: (uploading: boolean) => void;
  onPolish?: (selectedText: string) => Promise<string | void> | string | void;
  onSave?: (markdown: string) => Promise<void> | void;
  placeholder?: string;
  value: string;
};

const TyporaShortcuts = Extension.create({
  name: 'typoraShortcuts',

  addKeyboardShortcuts() {
    const setLink = () => {
      if (typeof window === 'undefined') return false;
      const previousUrl = this.editor.getAttributes('link').href as string | undefined;
      const url = window.prompt('请输入链接地址', previousUrl ?? 'https://');
      if (url === null) return true;
      if (!url.trim()) return this.editor.chain().focus().unsetLink().run();
      return this.editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url.trim() })
        .run();
    };

    const setImage = () => {
      if (typeof window === 'undefined') return false;
      const url = window.prompt('请输入图片地址', 'https://');
      if (!url?.trim()) return true;
      return this.editor.chain().focus().setImage({ src: url.trim() }).run();
    };

    return {
      'Mod-0': () => this.editor.commands.setParagraph(),
      'Mod-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-3': () => this.editor.commands.toggleHeading({ level: 3 }),
      'Mod-4': () => this.editor.commands.toggleHeading({ level: 4 }),
      'Mod-5': () => this.editor.commands.toggleHeading({ level: 5 }),
      'Mod-6': () => this.editor.commands.toggleHeading({ level: 6 }),
      'Mod-u': () => this.editor.commands.toggleUnderline(),
      'Mod-k': setLink,
      'Mod-Shift-q': () => this.editor.commands.toggleBlockquote(),
      'Mod-Shift-k': () => this.editor.commands.toggleCodeBlock(),
      'Mod-Shift-`': () => this.editor.commands.toggleCode(),
      'Mod-Shift-[': () => this.editor.commands.toggleOrderedList(),
      'Mod-Shift-]': () => this.editor.commands.toggleBulletList(),
      'Mod-Shift-i': setImage,
      'Alt-Shift-5': () => this.editor.commands.toggleStrike(),
    };
  },
});

const editorExtensions = [
  StarterKit.configure({
    link: {
      autolink: true,
      defaultProtocol: 'https',
      openOnClick: false,
    },
  }),
  StoredImage,
  ImageUploadPlaceholders,
  Markdown.configure({
    indentation: { size: 2, style: 'space' },
    markedOptions: { breaks: true, gfm: true },
  }),
  TyporaShortcuts,
];

const typoraSourceShortcuts = new Set(['0', '1', '2', '3', '4', '5', '6', 'b', 'i', 'k', 'u']);

const typoraSourceShiftShortcuts = new Set(['`', '[', ']', 'i', 'k', 'q']);

function blockSourceFormattingShortcuts(event: React.KeyboardEvent<HTMLTextAreaElement>) {
  const key = event.key.toLowerCase();
  const usesCommandKey = event.ctrlKey || event.metaKey;
  const isFormattingShortcut =
    usesCommandKey &&
    ((!event.shiftKey && typoraSourceShortcuts.has(key)) ||
      (event.shiftKey && typoraSourceShiftShortcuts.has(key)));
  const isStrikeShortcut = event.altKey && event.shiftKey && key === '5';

  if (isFormattingShortcut || isStrikeShortcut) event.preventDefault();
}

function ToolbarButton({
  active = false,
  children,
  disabled = false,
  label,
  onClick,
  shortcut,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  shortcut?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
            size="icon-sm"
            type="button"
            variant={active ? 'secondary' : 'ghost'}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        <span>{label}</span>
        {shortcut ? <Kbd>{shortcut}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}

function ToolbarDivider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border" />;
}

type Shortcut = {
  keys: string[];
  label: string;
};

const shortcutGroups: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: '文本样式',
    shortcuts: [
      { label: '粗体', keys: ['Ctrl / ⌘', 'B'] },
      { label: '斜体', keys: ['Ctrl / ⌘', 'I'] },
      { label: '下划线', keys: ['Ctrl / ⌘', 'U'] },
      { label: '删除线', keys: ['Alt', 'Shift', '5'] },
      { label: '行内代码', keys: ['Ctrl / ⌘', 'Shift', '`'] },
    ],
  },
  {
    title: '段落结构',
    shortcuts: [
      { label: '正文', keys: ['Ctrl / ⌘', '0'] },
      { label: '一至六级标题', keys: ['Ctrl / ⌘', '1–6'] },
      { label: '引用', keys: ['Ctrl / ⌘', 'Shift', 'Q'] },
      { label: '无序列表', keys: ['Ctrl / ⌘', 'Shift', ']'] },
      { label: '有序列表', keys: ['Ctrl / ⌘', 'Shift', '['] },
      { label: '代码块', keys: ['Ctrl / ⌘', 'Shift', 'K'] },
    ],
  },
  {
    title: '插入与编辑',
    shortcuts: [
      { label: '插入链接', keys: ['Ctrl / ⌘', 'K'] },
      { label: '插入图片', keys: ['Ctrl / ⌘', 'Shift', 'I'] },
      { label: '粘贴图片（两种模式）', keys: ['Ctrl / ⌘', 'V'] },
      { label: '保存（两种模式）', keys: ['Ctrl / ⌘', 'S'] },
      { label: '撤销', keys: ['Ctrl / ⌘', 'Z'] },
      { label: '重做', keys: ['Ctrl', 'Y'] },
    ],
  },
];

function MarkdownShortcutHelp() {
  return (
    <Drawer swipeDirection="right">
      <DrawerTrigger
        render={
          <Button
            aria-label="查看 Markdown 快捷键"
            size="icon-sm"
            title="快捷键帮助"
            type="button"
            variant="ghost"
          />
        }
      >
        <CircleHelp />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="relative border-b px-5 pb-4 pt-5 text-left">
          <DrawerTitle>Markdown 快捷键</DrawerTitle>
          <DrawerDescription>
            保存和图片粘贴在两种模式下均可使用，格式快捷键仅在“显示文本”模式下生效。
          </DrawerDescription>
          <DrawerClose
            render={
              <Button
                aria-label="关闭快捷键帮助"
                className="absolute right-3 top-3"
                size="icon-sm"
                type="button"
                variant="ghost"
              />
            }
          >
            <X />
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {shortcutGroups.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group.title}
              </h3>
              <div className="divide-y rounded-lg border">
                {group.shortcuts.map((shortcut) => (
                  <div
                    className="flex min-h-11 items-center justify-between gap-4 px-3 py-2"
                    key={shortcut.label}
                  >
                    <span className="text-sm">{shortcut.label}</span>
                    <KbdGroup className="shrink-0">
                      {shortcut.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </KbdGroup>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function MarkdownEditor({
  className,
  disabled = false,
  minHeight = 420,
  onChange,
  onImageUploadingChange,
  onPolish,
  onSave,
  placeholder = '开始输入内容，或键入 #、>、- 等 Markdown 标记后按空格…',
  value,
}: MarkdownEditorProps) {
  const draftRef = useRef(value);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const sourceEditRef = useRef<SourceEdit | undefined>(undefined);
  const savingRef = useRef(false);
  const uploads = useRef(
    new Map<
      string,
      {
        controller: AbortController;
        preview: string;
        position: number;
        from: number;
        selection: string;
        mode: EditorMode;
        count: number;
      }
    >(),
  );
  const uploadCountRef = useRef(0);
  const [uploadCount, setUploadCount] = useState(0);
  const [imageError, setImageError] = useState('');
  const [draft, setDraft] = useState(value);
  const [lastSaved, setLastSaved] = useState(value);
  const [mode, setMode] = useState<EditorMode>('visual');
  const [isPolishing, setIsPolishing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const updateDraft = useCallback(
    (nextValue: string, edit?: SourceEdit) => {
      for (const upload of uploads.current.values()) {
        if (upload.mode === 'source') {
          const position = mapSourcePosition(draftRef.current, nextValue, upload.position, edit);
          const from = mapSourcePosition(draftRef.current, nextValue, upload.from, edit);
          if (position === null || from === null) upload.controller.abort();
          else {
            upload.position = position;
            upload.from = from;
          }
        }
      }
      draftRef.current = nextValue;
      setDraft(nextValue);
      if (!savingRef.current) setSaveState('idle');
      onChange?.(nextValue);
    },
    [onChange],
  );

  const editor = useEditor(
    {
      content: value,
      contentType: 'markdown',
      editable: !disabled,
      editorProps: {
        attributes: {
          'aria-label': 'Markdown 可视化编辑器',
          'data-placeholder': placeholder,
        },
      },
      extensions: editorExtensions,
      immediatelyRender: false,
      onUpdate: ({ editor: currentEditor }) => updateDraft(currentEditor.getMarkdown()),
    },
    [],
  );

  const hasPolishableSelection =
    useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => {
        if (!currentEditor) return false;
        const { empty, from, to } = currentEditor.state.selection;
        return !empty && Boolean(currentEditor.state.doc.textBetween(from, to, '\n').trim());
      },
    }) ?? false;

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const clearUploads = useCallback(() => {
    if (!uploads.current.size) return;
    for (const upload of uploads.current.values()) {
      upload.controller.abort();
      URL.revokeObjectURL(upload.preview);
    }
    uploads.current.clear();
    uploadCountRef.current = 0;
    setUploadCount(0);
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(
        editor.state.tr.setMeta(imageUploadKey, { clear: true }).setMeta('addToHistory', false),
      );
    }
  }, [editor]);

  useEffect(() => () => clearUploads(), [clearUploads, editor]);

  useEffect(() => {
    if (disabled) clearUploads();
  }, [clearUploads, disabled]);

  useEffect(() => {
    onImageUploadingChange?.(uploadCount > 0);
  }, [onImageUploadingChange, uploadCount]);

  useEffect(() => {
    const source = sourceRef.current;
    if (mode !== 'source' || !source) return;
    const beforeInput = (event: InputEvent) => {
      sourceEditRef.current = {
        from: source.selectionStart,
        to: source.selectionEnd,
        inputType: event.inputType,
      };
    };
    source.addEventListener('beforeinput', beforeInput);
    return () => {
      source.removeEventListener('beforeinput', beforeInput);
      sourceEditRef.current = undefined;
    };
  }, [mode]);

  useEffect(() => {
    if (!editor || value === draftRef.current) return;
    clearUploads();
    setImageError('');
    draftRef.current = value;
    setDraft(value);
    setLastSaved(value);
    setSaveState('idle');
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
  }, [clearUploads, editor, value]);

  const applyCommand = (command: () => boolean) => {
    command();
  };

  const changeMode = (nextValue: string | number) => {
    if (uploadCountRef.current) return;
    const nextMode: EditorMode = nextValue === 'source' ? 'source' : 'visual';
    if (nextMode === 'visual' && editor) {
      editor.commands.setContent(draftRef.current, { contentType: 'markdown', emitUpdate: false });
    }
    setMode(nextMode);
  };

  const insertLink = () => {
    if (!editor || typeof window === 'undefined') return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('请输入链接地址', previousUrl ?? 'https://');
    if (url === null) return;
    if (!url.trim()) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const insertImage = () => {
    if (!editor || typeof window === 'undefined') return;
    const url = window.prompt('请输入图片地址', 'https://');
    if (url?.trim()) editor.chain().focus().setImage({ src: url.trim() }).run();
  };

  const save = async () => {
    if (disabled || !onSave || savingRef.current || uploadCountRef.current) return;
    savingRef.current = true;
    const markdown = draftRef.current;
    setSaveState('saving');
    try {
      await onSave(markdown);
      setLastSaved(markdown);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    } finally {
      savingRef.current = false;
    }
  };

  const pasteImages = (event: React.ClipboardEvent<HTMLElement>) => {
    if (disabled || !editor || editor.isDestroyed) return;
    const target = event.target;
    if (
      !(target instanceof Node) ||
      (!editor.view.dom.contains(target) && target !== sourceRef.current)
    )
      return;
    const files = clipboardImages(event.clipboardData);
    if (!files.length) return;
    event.preventDefault();
    event.stopPropagation();
    setImageError('');
    try {
      files.forEach(validateClipboardImage);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : '图片无法上传，请重新复制。');
      return;
    }
    const id = crypto.randomUUID();
    const upload = {
      controller: new AbortController(),
      preview: URL.createObjectURL(files[0]),
      position:
        mode === 'source'
          ? (sourceRef.current?.selectionEnd ?? draftRef.current.length)
          : editor.state.selection.to,
      from:
        mode === 'source'
          ? (sourceRef.current?.selectionStart ?? draftRef.current.length)
          : editor.state.selection.from,
      selection:
        mode === 'source'
          ? draftRef.current.slice(
              sourceRef.current?.selectionStart,
              sourceRef.current?.selectionEnd,
            )
          : JSON.stringify(
              editor.state.doc
                .slice(editor.state.selection.from, editor.state.selection.to)
                .toJSON(),
            ),
      mode,
      count: files.length,
    };
    uploads.current.set(id, upload);
    uploadCountRef.current += files.length;
    setUploadCount(uploadCountRef.current);
    if (mode === 'visual') {
      editor.view.dispatch(
        editor.state.tr
          .setMeta(imageUploadKey, {
            add: { id, from: upload.from, position: upload.position, preview: upload.preview },
          })
          .setMeta('addToHistory', false),
      );
    }
    void Promise.allSettled(
      files.map((file) => uploadMarkdownImage(file, upload.controller.signal)),
    )
      .then((results) => {
        if (upload.controller.signal.aborted || editor.isDestroyed || !uploads.current.has(id))
          return;
        const images = results.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value] : [],
        );
        const failed = results.find((result) => result.status === 'rejected');
        if (failed?.status === 'rejected') {
          setImageError(
            failed.reason instanceof Error ? failed.reason.message : '图片上传失败，请重新粘贴。',
          );
        }
        if (!images.length) return;
        if (upload.mode === 'source') {
          const current = draftRef.current;
          const position = upload.position;
          const from =
            current.slice(upload.from, position) === upload.selection ? upload.from : position;
          const markdown = `\n${images.map((image) => imageMarkdown(image.name, image.url)).join('\n\n')}\n`;
          const nextValue = current.slice(0, from) + markdown + current.slice(position);
          const edit = {
            from,
            to: position,
            inputType: 'insertFromPaste',
          };
          const source = sourceRef.current;
          const atPasteSelection =
            source?.selectionStart === upload.from && source.selectionEnd === position;
          const caret =
            source && document.activeElement === source
              ? {
                  start: atPasteSelection
                    ? from + markdown.length
                    : (mapSourcePosition(current, nextValue, source.selectionStart, edit) ??
                      from + markdown.length),
                  end: atPasteSelection
                    ? from + markdown.length
                    : (mapSourcePosition(current, nextValue, source.selectionEnd, edit) ??
                      from + markdown.length),
                  direction: source.selectionDirection,
                }
              : null;
          updateDraft(nextValue, edit);
          if (source && caret)
            requestAnimationFrame(() => {
              if (
                sourceRef.current === source &&
                draftRef.current === nextValue &&
                document.activeElement === source
              ) {
                source.setSelectionRange(caret.start, caret.end, caret.direction);
              }
            });
        } else {
          const decorations =
            imageUploadKey
              .getState(editor.state)
              ?.find(undefined, undefined, (spec) => spec.id === id) ?? [];
          const placeholder = decorations.find((decoration) => !decoration.spec.selection);
          if (!placeholder) return;
          const range = decorations.find((decoration) => decoration.spec.selection);
          const position =
            range &&
            JSON.stringify(editor.state.doc.slice(range.from, range.to).toJSON()) ===
              upload.selection
              ? { from: range.from, to: range.to }
              : placeholder.from;
          editor.commands.insertContentAt(
            position,
            images.map((image) => ({
              type: 'image',
              attrs: { src: image.url, alt: image.name.replace(/[\\[\]\r\n]/g, ' ') },
            })),
            { updateSelection: false },
          );
        }
      })
      .catch(() => {
        if (!upload.controller.signal.aborted && uploads.current.has(id)) {
          setImageError('图片插入失败，请重新粘贴。');
        }
      })
      .finally(() => {
        URL.revokeObjectURL(upload.preview);
        if (!uploads.current.delete(id)) return;
        uploadCountRef.current -= upload.count;
        setUploadCount(uploadCountRef.current);
        if (!editor.isDestroyed && upload.mode === 'visual') {
          editor.view.dispatch(
            editor.state.tr.setMeta(imageUploadKey, { remove: id }).setMeta('addToHistory', false),
          );
        }
      });
  };

  const polishSelection = async () => {
    if (!editor || !onPolish) return;
    const { empty, from, to } = editor.state.selection;
    if (empty) return;
    const selectedText = editor.state.doc.textBetween(from, to, '\n');
    if (!selectedText.trim()) return;

    setIsPolishing(true);
    try {
      const polishedText = await onPolish(selectedText);
      if (typeof polishedText !== 'string' || polishedText === selectedText) return;
      if (to > editor.state.doc.content.size) return;
      if (editor.state.doc.textBetween(from, to, '\n') !== selectedText) return;

      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          tr.insertText(polishedText, from, to);
          return true;
        })
        .run();
    } catch {
      // 保留原选区内容，由接入 AI 能力的页面负责展示具体失败原因。
    } finally {
      setIsPolishing(false);
    }
  };

  const isDirty = draft !== lastSaved;
  const toolbarDisabled = disabled || !editor;

  return (
    <section
      onPasteCapture={pasteImages}
      onKeyDownCapture={(event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          !event.altKey &&
          !event.shiftKey &&
          !event.nativeEvent.isComposing &&
          event.key.toLowerCase() === 's'
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) void save();
        }
      }}
      data-background-surface=""
      className={cn('overflow-hidden rounded-xl border bg-background shadow-sm', className)}
      style={{ '--markdown-editor-min-height': `${minHeight}px` } as React.CSSProperties}
    >
      <Tabs className="h-full min-h-0 flex-col gap-0" onValueChange={changeMode} value={mode}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/25 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <TabsList aria-label="Markdown 编辑模式">
              <TabsTrigger
                disabled={uploadCount > 0}
                aria-label="显示文本"
                className="px-2.5"
                title="显示文本"
                value="visual"
              >
                <Eye />
              </TabsTrigger>
              <TabsTrigger
                disabled={uploadCount > 0}
                aria-label="Markdown 源码"
                className="px-2.5"
                title="Markdown 源码"
                value="source"
              >
                <FileCode2 />
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-2">
            <span
              aria-live="polite"
              className={cn(
                'hidden text-xs sm:inline',
                saveState === 'error' ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {uploadCount > 0
                ? `正在上传 ${uploadCount} 张图片，完成后可保存…`
                : !onSave || disabled
                  ? disabled
                    ? '只读模式'
                    : '未配置保存'
                  : saveState === 'saving'
                    ? '正在保存…'
                    : saveState === 'error'
                      ? '保存失败，请重试'
                      : isDirty
                        ? '有未保存的修改'
                        : '所有修改已保存'}
            </span>
            <MarkdownShortcutHelp />
            <Button
              aria-keyshortcuts="Control+s Meta+s"
              title="保存（Ctrl / ⌘ + S）"
              disabled={disabled || !onSave || saveState === 'saving' || uploadCount > 0}
              onClick={() => void save()}
              size="sm"
              type="button"
            >
              {saveState === 'saving' ? <LoaderCircle className="animate-spin" /> : <Save />}
              保存
            </Button>
          </div>
        </header>

        {uploadCount > 0 ? (
          <p
            role="status"
            className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground"
          >
            <LoaderCircle className="size-3 animate-spin" />
            正在上传 {uploadCount} 张图片，上传完成后可切换模式和保存。你可以继续输入。
          </p>
        ) : null}
        {imageError ? (
          <p role="alert" className="border-b px-4 py-2 text-sm text-destructive">
            {imageError}
          </p>
        ) : null}

        <TabsContent className="m-0 flex min-h-0 flex-col" value="visual">
          <div
            className="flex flex-wrap items-center gap-0.5 border-b bg-background px-2 py-1.5"
            data-not-typeset
          >
            <ToolbarButton
              active={editor?.isActive('bold')}
              disabled={toolbarDisabled}
              label="粗体"
              onClick={() =>
                applyCommand(() => editor?.chain().focus().toggleBold().run() ?? false)
              }
              shortcut="Ctrl B"
            >
              <Bold />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('italic')}
              disabled={toolbarDisabled}
              label="斜体"
              onClick={() =>
                applyCommand(() => editor?.chain().focus().toggleItalic().run() ?? false)
              }
              shortcut="Ctrl I"
            >
              <Italic />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('underline')}
              disabled={toolbarDisabled}
              label="下划线"
              onClick={() =>
                applyCommand(() => editor?.chain().focus().toggleUnderline().run() ?? false)
              }
              shortcut="Ctrl U"
            >
              <Underline />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('strike')}
              disabled={toolbarDisabled}
              label="删除线"
              onClick={() =>
                applyCommand(() => editor?.chain().focus().toggleStrike().run() ?? false)
              }
              shortcut="Alt ⇧ 5"
            >
              <Strikethrough />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('code')}
              disabled={toolbarDisabled}
              label="行内代码"
              onClick={() =>
                applyCommand(() => editor?.chain().focus().toggleCode().run() ?? false)
              }
              shortcut="Ctrl ⇧ `"
            >
              <Code2 />
            </ToolbarButton>

            <ToolbarDivider />
            <ToolbarButton
              active={editor?.isActive('heading', { level: 1 })}
              disabled={toolbarDisabled}
              label="一级标题"
              onClick={() =>
                applyCommand(
                  () => editor?.chain().focus().toggleHeading({ level: 1 }).run() ?? false,
                )
              }
              shortcut="Ctrl 1"
            >
              <Heading1 />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('heading', { level: 2 })}
              disabled={toolbarDisabled}
              label="二级标题"
              onClick={() =>
                applyCommand(
                  () => editor?.chain().focus().toggleHeading({ level: 2 }).run() ?? false,
                )
              }
              shortcut="Ctrl 2"
            >
              <Heading2 />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('blockquote')}
              disabled={toolbarDisabled}
              label="引用"
              onClick={() =>
                applyCommand(() => editor?.chain().focus().toggleBlockquote().run() ?? false)
              }
              shortcut="Ctrl ⇧ Q"
            >
              <Quote />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('bulletList')}
              disabled={toolbarDisabled}
              label="无序列表"
              onClick={() =>
                applyCommand(() => editor?.chain().focus().toggleBulletList().run() ?? false)
              }
              shortcut="Ctrl ⇧ ]"
            >
              <List />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('orderedList')}
              disabled={toolbarDisabled}
              label="有序列表"
              onClick={() =>
                applyCommand(() => editor?.chain().focus().toggleOrderedList().run() ?? false)
              }
              shortcut="Ctrl ⇧ ["
            >
              <ListOrdered />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('codeBlock')}
              disabled={toolbarDisabled}
              label="代码块"
              onClick={() =>
                applyCommand(() => editor?.chain().focus().toggleCodeBlock().run() ?? false)
              }
              shortcut="Ctrl ⇧ K"
            >
              <Braces />
            </ToolbarButton>

            <ToolbarDivider />
            <ToolbarButton
              active={editor?.isActive('link')}
              disabled={toolbarDisabled}
              label="链接"
              onClick={insertLink}
              shortcut="Ctrl K"
            >
              <Link2 />
            </ToolbarButton>
            <ToolbarButton
              disabled={toolbarDisabled}
              label="图片"
              onClick={insertImage}
              shortcut="Ctrl ⇧ I"
            >
              <ImagePlus />
            </ToolbarButton>

            <ToolbarDivider />
            <ToolbarButton
              disabled={toolbarDisabled || isPolishing || !onPolish || !hasPolishableSelection}
              label="AI 润色选中文本"
              onClick={() => void polishSelection()}
            >
              {isPolishing ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            </ToolbarButton>

            <ToolbarDivider />
            <ToolbarButton
              disabled={toolbarDisabled || !(editor?.can().undo() ?? false)}
              label="撤销"
              onClick={() => applyCommand(() => editor?.chain().focus().undo().run() ?? false)}
              shortcut="Ctrl Z"
            >
              <Undo2 />
            </ToolbarButton>
            <ToolbarButton
              disabled={toolbarDisabled || !(editor?.can().redo() ?? false)}
              label="重做"
              onClick={() => applyCommand(() => editor?.chain().focus().redo().run() ?? false)}
              shortcut="Ctrl Y"
            >
              <Redo2 />
            </ToolbarButton>
          </div>

          <EditorContent
            data-background-surface=""
            className="typeset typeset-mindforge markdown-visual-editor max-w-none flex-1 overflow-y-auto bg-background"
            editor={editor}
          />
        </TabsContent>

        <TabsContent className="m-0 min-h-0" value="source">
          <Textarea
            ref={sourceRef}
            aria-label="Markdown 源码编辑器"
            className="h-full min-h-(--markdown-editor-min-height) resize-y rounded-none border-0 px-5 py-5 font-mono text-sm leading-7 shadow-none focus-visible:ring-0 sm:px-6"
            disabled={disabled}
            onChange={(event) => {
              const edit = sourceEditRef.current;
              sourceEditRef.current = undefined;
              updateDraft(event.target.value, edit);
            }}
            onKeyDown={blockSourceFormattingShortcuts}
            placeholder="# 从这里开始写 Markdown…"
            spellCheck={false}
            value={draft}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

export default MarkdownEditor;
