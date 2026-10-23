import { Excalidraw, MainMenu, loadFromBlob, serializeAsJSON } from '@excalidraw/excalidraw';
import type { ExcalidrawInitialDataState, ExcalidrawProps } from '@excalidraw/excalidraw/types';
import { Download, LoaderCircle, Save, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/shadcntheme/ThemeContext';
import { cn } from '@/lib/utils';
import {
  createEmptyDrawing,
  MAX_DRAWING_CONTENT_LENGTH,
  validateDrawingContent,
} from './note-drawing';

import '@excalidraw/excalidraw/index.css';

Object.assign(window, {
  EXCALIDRAW_ASSET_PATH: import.meta.env.DEV
    ? '/node_modules/@excalidraw/excalidraw/dist/prod/'
    : `${import.meta.env.BASE_URL}excalidraw/`,
});

type DrawingEditorProps = {
  title: string;
  value: string;
  savedValue: string;
  onChange: (content: string, dirty: boolean) => void;
  onSave: (content: string) => Promise<void>;
};

async function loadDrawing(content: string) {
  const source = content.trim() ? content : createEmptyDrawing();
  validateDrawingContent(source);
  return loadFromBlob(new Blob([source], { type: 'application/vnd.excalidraw+json' }), null, null);
}

export default function DrawingEditor({
  title,
  value,
  savedValue,
  onChange,
  onSave,
}: DrawingEditorProps) {
  const { theme } = useTheme();
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const [initialContent] = useState(value);
  const [initialSavedContent] = useState(savedValue);
  const [scene, setScene] = useState<ExcalidrawInitialDataState>();
  const [sceneKey, setSceneKey] = useState(0);
  const [snapshot, setSnapshot] = useState('');
  const [status, setStatus] = useState<'saved' | 'pending' | 'saving' | 'error'>('saved');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const latest = useRef('');
  const saved = useRef('');
  const saving = useRef(false);
  const callbacks = useRef({ onChange, onSave });
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const importVersion = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      importVersion.current += 1;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    callbacks.current = { onChange, onSave };
  }, [onChange, onSave]);

  useEffect(() => {
    let cancelled = false;
    void loadDrawing(initialContent)
      .then((data) => {
        if (cancelled) return;
        const content = serializeAsJSON(data.elements, data.appState, data.files ?? {}, 'local');
        latest.current = content;
        saved.current = initialContent === initialSavedContent ? content : initialSavedContent;
        if (content !== saved.current) callbacks.current.onChange(content, true);
        setSnapshot(content);
        setStatus(content === saved.current ? 'saved' : 'pending');
        setScene({ ...data, scrollToContent: true });
      })
      .catch(() => {
        if (!cancelled)
          setLoadError('无法打开此绘图。可导出原文件备份，或导入有效的 .excalidraw 文件。');
      });
    return () => {
      cancelled = true;
    };
  }, [initialContent, initialSavedContent]);

  const save = useCallback(async () => {
    if (saving.current || !latest.current || latest.current === saved.current) return;
    saving.current = true;
    setStatus('saving');
    setError('');
    try {
      // Serialize requests so edits made during a save cannot be overwritten by an older request.
      while (latest.current !== saved.current) {
        const content = latest.current;
        validateDrawingContent(content);
        await callbacks.current.onSave(content);
        saved.current = content;
      }
      setStatus('saved');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : '绘图保存失败，请重试。');
    } finally {
      saving.current = false;
    }
  }, []);

  useEffect(() => {
    if (!snapshot || snapshot === saved.current) return;
    const timer = window.setTimeout(() => void save(), 1000);
    return () => window.clearTimeout(timer);
  }, [snapshot, save]);

  useEffect(
    () => () => {
      void save();
    },
    [save],
  );

  const handleChange: NonNullable<ExcalidrawProps['onChange']> = (elements, appState, files) => {
    const content = serializeAsJSON(elements, appState, files, 'local');
    if (content === latest.current) return;
    latest.current = content;
    callbacks.current.onChange(content, content !== saved.current || saving.current);
    setSnapshot(content);
    if (!saving.current) setStatus(content === saved.current ? 'saved' : 'pending');
  };

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([latest.current || initialContent], {
        type: 'application/vnd.excalidraw+json',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = title;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importFile = async (file: File) => {
    const version = ++importVersion.current;
    try {
      if (file.size > MAX_DRAWING_CONTENT_LENGTH * 4)
        throw new Error('绘图文件过大，请选择较小的文件。');
      const data = await loadDrawing(await file.text());
      if (!mounted.current || version !== importVersion.current) return;
      const content = serializeAsJSON(data.elements, data.appState, data.files ?? {}, 'local');
      validateDrawingContent(content);
      latest.current = content;
      callbacks.current.onChange(content, content !== saved.current || saving.current);
      setSnapshot(content);
      setStatus('pending');
      setError('');
      setLoadError('');
      setScene({ ...data, scrollToContent: true });
      setSceneKey((current) => current + 1);
    } catch (cause) {
      if (!mounted.current || version !== importVersion.current) return;
      setError(
        cause instanceof Error ? cause.message : '文件导入失败，请选择有效的 .excalidraw 文件。',
      );
    }
  };

  return (
    <section
      aria-label="Excalidraw 绘图编辑器"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background"
      onKeyDownCapture={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
          event.preventDefault();
          event.stopPropagation();
          void save();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={title}>
          {title}
        </span>
        <span
          role="status"
          className={cn(
            'text-xs',
            status === 'error' ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {status === 'saving'
            ? '保存中…'
            : status === 'pending'
              ? '等待自动保存'
              : status === 'error'
                ? '保存失败'
                : '已保存'}
        </span>
        <input
          ref={fileInput}
          className="hidden"
          type="file"
          accept=".excalidraw,application/vnd.excalidraw+json,application/json"
          aria-label="选择 Excalidraw 文件"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importFile(file);
            event.target.value = '';
          }}
        />
        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
          <Upload />
          导入
        </Button>
        <Button variant="outline" size="sm" onClick={download}>
          <Download />
          导出
        </Button>
        <Button
          size="sm"
          disabled={!scene || status === 'saving'}
          onClick={() => void save()}
          title="保存绘图 (Ctrl/⌘+S)"
        >
          {status === 'saving' ? <LoaderCircle className="animate-spin" /> : <Save />}保存
        </Button>
      </div>
      {error && (
        <p role="alert" className="border-b border-border px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="relative min-h-0 flex-1">
        {loadError ? (
          <p role="alert" className="p-6 text-sm text-destructive">
            {loadError}
          </p>
        ) : scene ? (
          <Excalidraw
            key={sceneKey}
            initialData={scene}
            name={title.replace(/\.excalidraw$/i, '')}
            langCode="zh-CN"
            theme={theme === 'system' ? (systemDark ? 'dark' : 'light') : theme}
            onChange={handleChange}
            UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false } }}
          >
            <MainMenu>
              <MainMenu.DefaultItems.SaveAsImage />
              <MainMenu.DefaultItems.ClearCanvas />
              <MainMenu.DefaultItems.ChangeCanvasBackground />
              <MainMenu.DefaultItems.Help />
            </MainMenu>
          </Excalidraw>
        ) : (
          <p role="status" className="p-6 text-sm text-muted-foreground">
            正在加载画布…
          </p>
        )}
      </div>
    </section>
  );
}
