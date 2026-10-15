import { memo, useEffect, useId, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { NOTIF_BLUE } from './bloub-core/decor';
import { BotEngine, type BotFrame } from './bloub-core/engine';
import { COLOR_BY_ID, DEFAULT_COLOR, DEFAULT_SHAPE, SHAPE_BY_ID, mixHex } from './bloub-core/skins';
import { DEMI_VIEWBOX, RAYON } from './bloub-core/repere';
import { DEFAULT_EXPRESSION, EXPRESSION_BY_ID } from './bloub-core/expressions';
import { clamp, easings } from './bloub-core/math';
import { STATE_BY_ID, type StateId } from './bloub-core/states';

export type BloubAvatarProps = {
  ariaLabel?: string;
  className?: string;
  color?: string;
  expression?: string;
  follow?: boolean;
  frozenAt?: number;
  paper?: string;
  shape?: string;
  size?: number | string;
  state?: StateId;
};

/** React renderer for the original bloub time-based SVG engine. */
export const BloubAvatar = memo(function BloubAvatar({
  ariaLabel = 'bloub 动画头像',
  className,
  color = DEFAULT_COLOR,
  expression = DEFAULT_EXPRESSION,
  follow = false,
  frozenAt,
  paper = '#f9f9f9',
  shape = DEFAULT_SHAPE,
  size = 320,
  state = 'idle',
}: BloubAvatarProps) {
  const maskId = `bloub-mask-${useId().replace(/:/g, '')}`;
  const gradientPrefix = `${maskId}-arc`;
  const radii = SHAPE_BY_ID.get(shape)?.radii ?? null;
  const face = EXPRESSION_BY_ID.get(expression) ?? null;
  const ink = COLOR_BY_ID.get(color)?.hex ?? '#0a0a0c';
  const [engine] = useState(() => new BotEngine(RAYON, state, radii, face));
  const clock = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const followSince = useRef(0);
  const [frame, setFrame] = useState<BotFrame>(() => engine.sample(frozenAt ?? 0));

  useEffect(() => {
    engine.setState(state, clock.current);
    setFrame(engine.sample(frozenAt ?? clock.current));
  }, [engine, frozenAt, state]);

  useEffect(() => {
    engine.setShape(radii, clock.current);
    setFrame(engine.sample(frozenAt ?? clock.current));
  }, [engine, frozenAt, radii]);

  useEffect(() => {
    engine.setExpression(face, clock.current);
    setFrame(engine.sample(frozenAt ?? clock.current));
  }, [engine, face, frozenAt]);

  useEffect(() => {
    if (!follow || frozenAt !== undefined) {
      engine.setLook(null, clock.current);
      return;
    }
    followSince.current = clock.current;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') pointer.current = { x: event.clientX, y: event.clientY };
    };
    const onLeave = () => {
      pointer.current = null;
    };
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      engine.setLook(null, clock.current);
    };
  }, [engine, follow, frozenAt]);

  useEffect(() => {
    if (frozenAt !== undefined) return;
    let raf = 0;
    let last = 0;
    const tick = (ms: number) => {
      clock.current += last ? Math.min((ms - last) / 1000, 0.064) : 0;
      last = ms;
      if (follow && STATE_BY_ID.get(state)?.baseFace) {
        const bounds = svgRef.current?.getBoundingClientRect();
        if (bounds?.width && bounds.height) {
          const target = pointer.current;
          const nx = target
            ? clamp(
                (target.x - bounds.left - bounds.width / 2) / Math.max(1, window.innerWidth / 2),
                -1,
                1,
              )
            : 0;
          const ny = target
            ? clamp(
                (target.y - bounds.top - bounds.height / 2) / Math.max(1, window.innerHeight / 2),
                -1,
                1,
              )
            : 0;
          const tour = easings.easeOutQuint(clamp((clock.current - followSince.current) / 1.1));
          engine.setLook(
            {
              yaw: -26 + nx * 16,
              pitch: 10 - ny * 13,
              mix: tour,
              spin: 360 * (1 - tour),
              wander: target ? 0 : 1,
            },
            clock.current,
          );
        }
      }
      setFrame(engine.sample(clock.current));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, follow, frozenAt, state]);

  const dot = (item: BotFrame['dots'][number], index: number) => {
    const fill = item.color ?? (item.depth === undefined ? ink : mixHex(paper, ink, item.depth));
    return item.d ? (
      <path
        d={item.d}
        fill={fill}
        key={index}
        opacity={item.opacity}
        transform={`translate(${item.x} ${item.y}) rotate(${item.rot ?? 0}) scale(${RAYON})`}
      />
    ) : (
      <circle cx={item.x} cy={item.y} fill={fill} key={index} opacity={item.opacity} r={item.r} />
    );
  };

  return (
    <svg
      aria-label={ariaLabel}
      className={cn('block shrink-0', className)}
      data-bloub-state={state}
      height={size}
      role="img"
      ref={svgRef}
      viewBox={`${-DEMI_VIEWBOX} ${-DEMI_VIEWBOX} ${DEMI_VIEWBOX * 2} ${DEMI_VIEWBOX * 2}`}
      width={size}
    >
      <defs>
        <mask
          height={DEMI_VIEWBOX * 2}
          id={maskId}
          maskUnits="userSpaceOnUse"
          width={DEMI_VIEWBOX * 2}
          x={-DEMI_VIEWBOX}
          y={-DEMI_VIEWBOX}
        >
          <path d={frame.bodyPath} fill="#fff" />
          {frame.eyes.map((eye, index) => (
            <path d={eye.d} fill="#000" key={index} opacity={eye.alpha} transform={eye.matrix} />
          ))}
          {frame.notch && (
            <circle cx={frame.notch.x} cy={frame.notch.y} fill="#000" r={frame.notch.r} />
          )}
        </mask>
        {frame.arcs.map((arc) => (
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id={`${gradientPrefix}-${arc.id}`}
            key={arc.id}
            x1={arc.grad.x1}
            x2={arc.grad.x2}
            y1={arc.grad.y1}
            y2={arc.grad.y2}
          >
            {arc.grad.stops.map((stop, index) => (
              <stop key={index} offset={index / (arc.grad.stops.length - 1)} stopColor={stop} />
            ))}
          </linearGradient>
        ))}
      </defs>
      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            d={arc.back}
            key={arc.id}
            opacity={arc.opacity}
            stroke={`url(#${gradientPrefix}-${arc.id})`}
            strokeWidth={arc.width}
          />
        ))}
      </g>
      {frame.dotsBehind && <g>{frame.dots.map(dot)}</g>}
      <g opacity={frame.bodyAlpha}>
        <path d={frame.bodyPath} fill={paper} />
        <g mask={`url(#${maskId})`}>
          <rect
            fill={ink}
            height={DEMI_VIEWBOX * 2}
            width={DEMI_VIEWBOX * 2}
            x={-DEMI_VIEWBOX}
            y={-DEMI_VIEWBOX}
          />
        </g>
      </g>
      {!frame.dotsBehind && <g>{frame.dots.map(dot)}</g>}
      {frame.notif && (
        <circle cx={frame.notif.x} cy={frame.notif.y} fill={NOTIF_BLUE} r={frame.notif.r} />
      )}
      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            d={arc.front}
            key={arc.id}
            opacity={arc.opacity}
            stroke={`url(#${gradientPrefix}-${arc.id})`}
            strokeWidth={arc.width}
          />
        ))}
      </g>
    </svg>
  );
});
