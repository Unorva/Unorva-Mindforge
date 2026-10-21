import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { BloubAvatar } from '@/components/ai-avatar/bloub-avatar';
import {
  MAX_BLOCS,
  blockAt,
  clampDuration,
  defaultCycle,
  makeBlock,
  offsetOf,
  parseCycles,
  totalDuration,
  type Block,
} from '@/components/ai-avatar/bloub-core/cycles';
import {
  COLORS,
  DEFAULT_COLOR,
  DEFAULT_SHAPE,
  SHAPES,
} from '@/components/ai-avatar/bloub-core/skins';
import { DEFAULT_EXPRESSION, EXPRESSIONS } from '@/components/ai-avatar/bloub-core/expressions';
import { POSES, SEQUENCE, type StateId } from '@/components/ai-avatar/bloub-core/states';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'mindforge-bloub-cycle-v1';
const CUSTOM_KEY = 'mindforge-bloub-custom-v1';
const PAPER = '#f9f9f9';

const STATE_LABELS: Record<StateId, string> = {
  idle: '静止',
  thinking: '思考',
  wink: '眨眼',
  wide: '睁大眼睛',
  alert: '警示',
  notify: '通知',
  exclaim: '感叹号',
  sleep: '休眠',
  egg: '蛋形',
  hexagon: '六边形',
  play: '播放',
  orbit: '轨道',
  burst: '爆散',
  comet: '彗星',
  nod: '点头',
  deny: '摇头',
  love: '喜爱',
  angry: '生气',
  sad: '伤心',
  swirl: '漩涡',
};

const EXPRESSION_LABELS: Record<string, string> = {
  neutre: '平静',
  attentif: '专注',
  surpris: '惊讶',
  excite: '兴奋',
  heureux: '开心',
  hilare: '大笑',
  colere: '生气',
  triste: '难过',
  effraye: '害怕',
  mefiant: '怀疑',
  confus: '困惑',
  curieux: '好奇',
  fier: '得意',
  timide: '羞怯',
  blase: '无趣',
  somnolent: '困倦',
  reconforte: '释然',
  amoureux: '喜爱',
  espiegle: '调皮',
  sournois: '自得',
  impassible: '淡定',
  determine: '坚定',
  furieux: '暴怒',
  ecoeure: '嫌恶',
  affole: '惊慌',
  pensif: '沉思',
  idee: '灵感',
  gene: '难为情',
  ennuye: '无聊',
  abattu: '消沉',
};

const SHAPE_LABELS: Record<string, string> = {
  cercle: '圆形',
  galet: '卵石',
  squircle: '圆角方形',
  capsule: '胶囊',
  triangle: '三角形',
  hexagone: '六边形',
  nuage: '云朵',
  goutte: '水滴',
};

const COLOR_LABELS: Record<string, string> = {
  encre: '墨黑',
  creme: '奶油白',
  brun: '棕色',
  rouge: '红色',
  orange: '橙色',
  ambre: '琥珀色',
  vert: '绿色',
  turquoise: '青绿色',
  bleu: '蓝色',
  violet: '紫色',
  rose: '粉色',
  gris: '灰色',
};

function savedBlocks(): Block[] {
  try {
    return (
      parseCycles(window.localStorage.getItem(STORAGE_KEY))[0]?.blocks ?? defaultCycle().blocks
    );
  } catch {
    return defaultCycle().blocks;
  }
}

function savedCustomization() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(CUSTOM_KEY) ?? '{}') as Record<
      string,
      unknown
    >;
    return {
      shape: SHAPES.some((item) => item.id === raw.shape) ? (raw.shape as string) : DEFAULT_SHAPE,
      color: COLORS.some((item) => item.id === raw.color) ? (raw.color as string) : DEFAULT_COLOR,
      expression: EXPRESSIONS.some((item) => item.id === raw.expression)
        ? (raw.expression as string)
        : DEFAULT_EXPRESSION,
    };
  } catch {
    return { shape: DEFAULT_SHAPE, color: DEFAULT_COLOR, expression: DEFAULT_EXPRESSION };
  }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AiAvatarPage() {
  const [view, setView] = useState<'animations' | 'customize'>('animations');
  const [blocks, setBlocks] = useState<Block[]>(savedBlocks);
  const [custom] = useState(savedCustomization);
  const [shape, setShape] = useState(custom.shape);
  const [color, setColor] = useState(custom.color);
  const [expression, setExpression] = useState(custom.expression);
  const [playing, setPlaying] = useState(true);
  const [playhead, setPlayhead] = useState(0);
  const [size, setSize] = useState(420);
  const [exportError, setExportError] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const duration = totalDuration(blocks);
  const cursor = blockAt(blocks, playhead);
  const currentState = blocks[cursor.index]?.state ?? 'idle';

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'default', name: '', blocks }]));
  }, [blocks]);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify({ shape, color, expression }));
  }, [shape, color, expression]);

  useEffect(() => {
    if (!playing || duration <= 0) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const delta = last ? Math.min((now - last) / 1000, 0.064) : 0;
      last = now;
      setPlayhead((previous) => (previous + delta) % duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, playing]);

  const selectBlock = (index: number) => {
    setPlaying(false);
    setPlayhead(offsetOf(blocks, index));
  };

  const addState = (state: StateId) => {
    if (blocks.length >= MAX_BLOCS) return;
    setPlaying(false);
    setPlayhead(duration);
    setBlocks((previous) => [...previous, makeBlock(state)]);
  };

  const removeBlock = (index: number) => {
    if (blocks.length <= 1) return;
    const next = blocks.filter((_, position) => position !== index);
    setBlocks(next);
    setPlayhead(Math.min(playhead, Math.max(0, totalDuration(next) - 0.001)));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= blocks.length) return;
    const next = blocks.slice();
    [next[index], next[destination]] = [next[destination], next[index]];
    setBlocks(next);
    setPlayhead(offsetOf(next, destination));
  };

  const changeDuration = (index: number, seconds: number) => {
    setBlocks((previous) =>
      previous.map((block, position) =>
        position === index ? { ...block, duration: clampDuration(block.state, seconds) } : block,
      ),
    );
  };

  const reset = () => {
    setBlocks(defaultCycle().blocks);
    setShape(DEFAULT_SHAPE);
    setColor(DEFAULT_COLOR);
    setExpression(DEFAULT_EXPRESSION);
    setPlayhead(0);
    setPlaying(true);
  };

  const exportStill = async (format: 'svg' | 'png') => {
    const svg = stageRef.current?.querySelector('svg');
    if (!svg) return;
    setExportError(false);
    try {
      const copy = svg.cloneNode(true) as SVGSVGElement;
      copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      copy.setAttribute('width', '1024');
      copy.setAttribute('height', '1024');
      copy.removeAttribute('class');
      const markup = new XMLSerializer().serializeToString(copy);
      if (format === 'svg') {
        download(new Blob([markup], { type: 'image/svg+xml' }), `bloub-${currentState}.svg`);
        return;
      }
      const image = new Image();
      const source = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
      try {
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('SVG render failed'));
          image.src = source;
        });
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(image, 0, 0, 1024, 1024);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (result) => (result ? resolve(result) : reject(new Error('PNG render failed'))),
            'image/png',
          ),
        );
        download(blob, `bloub-${currentState}.png`);
      } finally {
        URL.revokeObjectURL(source);
      }
    } catch {
      setExportError(true);
    }
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-[#e3e5ea] bg-[#f9f9f9] text-[#17203a]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e5ea] px-5 py-4 sm:px-7">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            AI 动画组件 <span className="ml-2 text-sm font-normal text-[#6e7382]">bloub</span>
          </h1>
          <p className="text-xs text-[#6e7382]">
            {SEQUENCE.length} 种动画状态 · {EXPRESSIONS.length} 种静止表情 · SVG 轮廓逐帧变形
          </p>
        </div>
        <a
          className="inline-flex items-center gap-1 text-xs text-[#6e7382] underline-offset-4 hover:underline"
          href="https://github.com/jeremy-prt/bloub"
          rel="noreferrer"
          target="_blank"
        >
          原项目 <ExternalLink size={13} />
        </a>
      </header>

      <div className="grid lg:grid-cols-[160px_minmax(0,1fr)_320px]">
        <nav
          aria-label="动画组件视图"
          className="flex gap-2 border-b border-[#e3e5ea] p-4 lg:flex-col lg:border-r lg:border-b-0"
        >
          <Button
            aria-current={view === 'animations' ? 'page' : undefined}
            className="justify-start"
            onClick={() => setView('animations')}
            variant={view === 'animations' ? 'default' : 'ghost'}
          >
            动画
          </Button>
          <Button
            aria-current={view === 'customize' ? 'page' : undefined}
            className="justify-start"
            onClick={() => {
              setView('customize');
              setPlaying(false);
              setPlayhead(0);
            }}
            variant={view === 'customize' ? 'default' : 'ghost'}
          >
            个性化
          </Button>
          <div className="mt-auto hidden pt-10 text-[11px] leading-5 text-[#6e7382] lg:block">
            动画引擎及参数来自 Jérémy Perret 的 bloub 项目（MIT）。
          </div>
        </nav>

        <main className="flex min-h-[480px] flex-col items-center justify-center gap-4 px-4 py-8 sm:min-h-[600px]">
          <div
            className="flex w-full max-w-[520px] flex-1 items-center justify-center"
            ref={stageRef}
          >
            <BloubAvatar
              ariaLabel={`bloub：${STATE_LABELS[currentState]}`}
              className="h-auto max-w-full"
              color={color}
              expression={expression}
              follow={view === 'customize'}
              paper={PAPER}
              shape={shape}
              size={size}
              state={currentState}
            />
          </div>
          <div className="text-center">
            <p className="text-base font-medium">{STATE_LABELS[currentState]}</p>
            <p className="text-xs text-[#6e7382]">
              {currentState} · {cursor.elapsed.toFixed(1)} 秒
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => void exportStill('png')} size="sm" variant="outline">
              <Download size={14} /> PNG
            </Button>
            <Button onClick={() => void exportStill('svg')} size="sm" variant="outline">
              <Download size={14} /> SVG
            </Button>
            <label className="ml-2 flex items-center gap-2 text-xs text-[#6e7382]">
              尺寸
              <input
                aria-label="预览尺寸"
                max="480"
                min="180"
                onChange={(event) => setSize(Number(event.target.value))}
                step="20"
                type="range"
                value={size}
              />
            </label>
          </div>
          {exportError && (
            <p className="text-xs text-red-600" role="alert">
              导出失败，请重试。
            </p>
          )}
        </main>

        <aside className="border-t border-[#e3e5ea] p-5 lg:max-h-[680px] lg:overflow-auto lg:border-t-0 lg:border-l">
          {view === 'animations' ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">动画</h2>
                <span className="text-xs text-[#6e7382]">点击添加至序列</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {SEQUENCE.map((state) => (
                  <button
                    aria-label={`添加${STATE_LABELS[state]}动画`}
                    className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-[#e3e5ea] bg-white/60 px-1 py-2 text-center transition hover:border-[#17203a] hover:bg-white focus-visible:outline-2 focus-visible:outline-[#17203a]"
                    key={state}
                    onClick={() => addState(state)}
                    type="button"
                  >
                    <BloubAvatar
                      color={color}
                      expression={expression}
                      frozenAt={POSES[state]}
                      shape={shape}
                      size={60}
                      state={state}
                    />
                    <span className="mt-1 text-[11px]">{STATE_LABELS[state]}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <section>
                <h2 className="mb-3 text-sm font-semibold">形状 · {SHAPES.length} 种</h2>
                <div className="grid grid-cols-4 gap-2">
                  {SHAPES.map((item) => (
                    <button
                      aria-label={SHAPE_LABELS[item.id]}
                      aria-pressed={shape === item.id}
                      className="rounded-xl border border-[#e3e5ea] bg-white/60 px-1 py-2 text-center aria-pressed:border-[#17203a]"
                      key={item.id}
                      onClick={() => setShape(item.id)}
                      type="button"
                    >
                      <BloubAvatar expression={expression} frozenAt={1} shape={item.id} size={54} />
                      <span className="block text-[10px]">{SHAPE_LABELS[item.id]}</span>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h2 className="mb-3 text-sm font-semibold">颜色 · {COLORS.length} 种</h2>
                <div className="grid grid-cols-6 gap-2">
                  {COLORS.map((item) => (
                    <button
                      aria-label={COLOR_LABELS[item.id]}
                      aria-pressed={color === item.id}
                      className="flex h-11 items-center justify-center rounded-lg border border-[#e3e5ea] bg-white/60 aria-pressed:border-[#17203a]"
                      key={item.id}
                      onClick={() => setColor(item.id)}
                      title={COLOR_LABELS[item.id]}
                      type="button"
                    >
                      <span
                        className="size-7 rounded-full border border-black/10"
                        style={{ backgroundColor: item.hex }}
                      />
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h2 className="mb-3 text-sm font-semibold">表情 · {EXPRESSIONS.length} 种</h2>
                <div className="grid grid-cols-4 gap-2">
                  {EXPRESSIONS.map((item) => (
                    <button
                      aria-label={EXPRESSION_LABELS[item.id]}
                      aria-pressed={expression === item.id}
                      className="rounded-xl border border-[#e3e5ea] bg-white/60 px-1 py-2 text-center aria-pressed:border-[#17203a]"
                      key={item.id}
                      onClick={() => {
                        setExpression(item.id);
                        setPlaying(false);
                        setPlayhead(0);
                      }}
                      type="button"
                    >
                      <BloubAvatar
                        color={color}
                        expression={item.id}
                        frozenAt={1}
                        shape={shape}
                        size={54}
                      />
                      <span className="block text-[10px]">{EXPRESSION_LABELS[item.id]}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </aside>
      </div>

      <section
        aria-label="动画序列"
        className="border-t border-[#e3e5ea] bg-white/55 px-5 py-4 sm:px-7"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              aria-label={playing ? '暂停播放' : '开始播放'}
              onClick={() => setPlaying((value) => !value)}
              size="icon"
              variant="outline"
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            <div>
              <h2 className="text-sm font-semibold">默认序列</h2>
              <p className="text-[11px] text-[#6e7382]">
                {blocks.length} 个动画 · {duration.toFixed(1)} 秒 · 自动保存
              </p>
            </div>
          </div>
          <Button onClick={reset} size="sm" variant="ghost">
            <RotateCcw size={14} /> 重置序列
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {blocks.map((block, index) => (
            <div
              className="group relative flex w-28 shrink-0 flex-col items-center rounded-xl border border-[#e3e5ea] bg-[#f9f9f9] p-2 aria-selected:border-[#17203a]"
              aria-selected={cursor.index === index}
              key={`${index}-${block.state}`}
            >
              <button
                aria-label={`预览${STATE_LABELS[block.state]}`}
                className="flex w-full flex-col items-center"
                onClick={() => selectBlock(index)}
                type="button"
              >
                <BloubAvatar
                  color={color}
                  expression={expression}
                  frozenAt={POSES[block.state]}
                  shape={shape}
                  size={58}
                  state={block.state}
                />
                <span className="text-[11px] font-medium">{STATE_LABELS[block.state]}</span>
              </button>
              <div className="mt-1 flex w-full items-center gap-1">
                <input
                  aria-label={`${STATE_LABELS[block.state]}的时长（秒）`}
                  className="w-full rounded border border-[#e3e5ea] bg-white px-1 py-0.5 text-center text-[11px]"
                  max="10"
                  min="0.6"
                  onChange={(event) => changeDuration(index, Number(event.target.value))}
                  step="0.1"
                  type="number"
                  value={block.duration}
                />
                <span className="text-[10px] text-[#6e7382]">秒</span>
              </div>
              <div className="mt-1 flex gap-1">
                <button
                  aria-label="向左移动"
                  className="rounded p-0.5 hover:bg-[#e3e5ea] disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => moveBlock(index, -1)}
                  type="button"
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  aria-label="移除动画"
                  className="rounded p-0.5 hover:bg-[#e3e5ea] disabled:opacity-30"
                  disabled={blocks.length === 1}
                  onClick={() => removeBlock(index)}
                  type="button"
                >
                  <Trash2 size={12} />
                </button>
                <button
                  aria-label="向右移动"
                  className="rounded p-0.5 hover:bg-[#e3e5ea] disabled:opacity-30"
                  disabled={index === blocks.length - 1}
                  onClick={() => moveBlock(index, 1)}
                  type="button"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          ))}
          <button
            className="flex w-28 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#c8cbd3] text-xs text-[#6e7382] hover:border-[#17203a] hover:text-[#17203a]"
            onClick={() => setView('animations')}
            type="button"
          >
            <Plus size={18} /> 添加动画
          </button>
        </div>
      </section>
    </div>
  );
}
