import { motion, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

import { AI_AVATAR_VISUALS } from './expressions'
import type {
  AiAvatarExpression,
  AvatarBodyShape,
  AvatarBrows,
  AvatarEffect,
  AvatarEyes,
  AvatarMotion,
  AvatarMouth,
  AvatarVisual,
} from './types'

const BODY_PATHS: Record<AvatarBodyShape, string> = {
  round: 'M50 12 C73 12 88 28 88 51 C88 74 73 88 50 88 C27 88 12 74 12 51 C12 28 27 12 50 12 Z',
  soft: 'M50 12 C74 10 90 29 87 53 C84 77 70 90 47 88 C23 87 10 71 13 47 C16 24 30 14 50 12 Z',
  squash: 'M50 23 C77 21 91 34 89 55 C87 75 70 84 47 82 C23 81 9 69 12 49 C15 31 31 24 50 23 Z',
  tall: 'M50 8 C69 8 82 27 84 51 C86 76 70 92 49 91 C28 90 15 75 16 49 C17 25 31 9 50 8 Z',
  triangle: 'M50 8 C60 10 82 54 86 68 C90 82 72 89 49 87 C26 86 9 80 14 66 C19 51 40 7 50 8 Z',
  wide: 'M50 19 C77 17 93 31 92 53 C91 73 72 84 47 82 C21 81 7 69 10 49 C13 31 31 20 50 19 Z',
}

const FACE_COLOR = 'var(--background)'
const EFFECT_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#fb7185', '#fbbf24']

type AiAvatarProps = {
  ariaLabel?: string
  className?: string
  expression?: AiAvatarExpression
  intensity?: number
  size?: number | string
}

function animationFor(kind: AvatarMotion, intensity: number, reducedMotion: boolean) {
  if (reducedMotion) return { animate: {}, transition: { duration: 0 } }
  const amount = Math.max(0.2, Math.min(1, intensity))

  switch (kind) {
    case 'bounce': return { animate: { y: [0, -7 * amount, 0], scale: [1, 1 + 0.04 * amount, 1] }, transition: { duration: 1.25, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'float': return { animate: { y: [0, -3 * amount, 0], rotate: [0, 1.5 * amount, 0] }, transition: { duration: 3.4, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'listen': return { animate: { scaleX: [1, 1 + 0.035 * amount, 1], y: [0, -2, 0] }, transition: { duration: 0.9, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'nod': return { animate: { y: [0, 3 * amount, 0], rotate: [0, 2 * amount, 0] }, transition: { duration: 0.75, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'shake': return { animate: { x: [0, -3 * amount, 3 * amount, -2 * amount, 0] }, transition: { duration: 0.55, ease: 'easeInOut' as const, repeat: Infinity, repeatDelay: 0.7 } }
    case 'sleep': return { animate: { y: [0, 2 * amount, 0], scaleY: [1, 0.98, 1] }, transition: { duration: 3.8, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'speak': return { animate: { scale: [1, 1 + 0.02 * amount, 1] }, transition: { duration: 0.42, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'spin': return { animate: { rotate: [0, 3 * amount, 0, -3 * amount, 0] }, transition: { duration: 2.1, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'think': return { animate: { y: [0, -3 * amount, 0], rotate: [0, -2 * amount, 0] }, transition: { duration: 2.3, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'tilt': return { animate: { rotate: [0, 2 * amount, 0] }, transition: { duration: 2.7, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'breathe':
    default: return { animate: { scale: [1, 1 + 0.018 * amount, 1], y: [0, -1.5 * amount, 0] }, transition: { duration: 3.2, ease: 'easeInOut' as const, repeat: Infinity } }
  }
}

function Eyes({ kind, reducedMotion }: { kind: AvatarEyes; reducedMotion: boolean }) {
  const strokeProps = { fill: 'none', stroke: FACE_COLOR, strokeLinecap: 'round' as const, strokeWidth: 4.5 }
  const blink = reducedMotion ? {} : { scaleY: [1, 1, 0.12, 1, 1] }
  const blinkTransition = { duration: 3.8, repeat: Infinity, times: [0, 0.82, 0.88, 0.94, 1] }

  if (kind === 'happy') return <><path d="M29 45 Q37 36 45 45" {...strokeProps} /><path d="M55 45 Q63 36 71 45" {...strokeProps} /></>
  if (kind === 'closed') return <><path d="M30 43 Q37 46 44 43" {...strokeProps} /><path d="M56 43 Q63 46 70 43" {...strokeProps} /></>
  if (kind === 'sleepy') return <><path d="M30 42 Q37 46 44 43" {...strokeProps} /><path d="M56 43 Q63 46 70 42" {...strokeProps} /></>
  if (kind === 'angry') return <><path d="M30 44 L43 47" {...strokeProps} /><path d="M57 47 L70 44" {...strokeProps} /></>
  if (kind === 'sad') return <><path d="M30 46 Q37 37 44 43" {...strokeProps} /><path d="M56 43 Q63 37 70 46" {...strokeProps} /></>
  if (kind === 'focused') return <><rect fill={FACE_COLOR} height="7" rx="3.5" width="14" x="29" y="41" /><rect fill={FACE_COLOR} height="7" rx="3.5" width="14" x="57" y="41" /></>
  if (kind === 'wide') return <><circle cx="37" cy="43" fill={FACE_COLOR} r="6.5" /><circle cx="63" cy="43" fill={FACE_COLOR} r="6.5" /></>
  if (kind === 'wink') return <><path d="M29 44 Q37 37 45 44" {...strokeProps} /><rect fill={FACE_COLOR} height="16" rx="4.5" width="9" x="59" y="35" /></>
  if (kind === 'uneven') return <><circle cx="36" cy="43" fill={FACE_COLOR} r="6" /><circle cx="64" cy="44" fill={FACE_COLOR} r="4" /></>
  if (kind === 'dizzy') return <><path d="M29 44 C29 36 44 36 44 44 C44 51 32 51 32 44 C32 39 41 39 41 44" {...strokeProps} strokeWidth="2.5" /><path d="M56 44 C56 36 71 36 71 44 C71 51 59 51 59 44 C59 39 68 39 68 44" {...strokeProps} strokeWidth="2.5" /></>

  const pupilOffset = {
    'look-down': [0, 2.5],
    'look-left': [-2.5, 0],
    'look-right': [2.5, 0],
    'look-up': [0, -2.5],
    open: [0, 0],
  }[kind as 'look-down' | 'look-left' | 'look-right' | 'look-up' | 'open'] ?? [0, 0]

  return (
    <motion.g animate={blink} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} transition={blinkTransition}>
      <ellipse cx="37" cy="43" fill={FACE_COLOR} rx="5.5" ry="8" />
      <ellipse cx="63" cy="43" fill={FACE_COLOR} rx="5.5" ry="8" />
      {kind !== 'open' ? <>
        <circle cx={37 + pupilOffset[0]} cy={43 + pupilOffset[1]} fill="currentColor" r="2" />
        <circle cx={63 + pupilOffset[0]} cy={43 + pupilOffset[1]} fill="currentColor" r="2" />
      </> : null}
    </motion.g>
  )
}

function Brows({ kind }: { kind: AvatarBrows }) {
  if (kind === 'none') return null
  const paths: Record<Exclude<AvatarBrows, 'none'>, [string, string]> = {
    angry: ['M28 31 L43 35', 'M57 35 L72 31'],
    happy: ['M29 33 Q37 27 44 32', 'M56 32 Q63 27 71 33'],
    raised: ['M29 30 Q37 25 44 29', 'M56 29 Q63 25 71 30'],
    sad: ['M29 34 Q37 27 44 31', 'M56 31 Q63 27 71 34'],
    thinking: ['M29 30 L44 28', 'M57 32 L71 34'],
  }
  return <>{paths[kind].map((path) => <path d={path} fill="none" key={path} stroke={FACE_COLOR} strokeLinecap="round" strokeWidth="3" />)}</>
}

function Mouth({ kind, reducedMotion }: { kind: AvatarMouth; reducedMotion: boolean }) {
  const strokeProps = { fill: 'none', stroke: FACE_COLOR, strokeLinecap: 'round' as const, strokeWidth: 4 }
  if (kind === 'none') return null
  if (kind === 'smile') return <path d="M37 59 Q50 70 63 59" {...strokeProps} />
  if (kind === 'small-smile') return <path d="M43 60 Q50 65 57 60" {...strokeProps} strokeWidth="3.5" />
  if (kind === 'frown') return <path d="M39 67 Q50 57 61 67" {...strokeProps} />
  if (kind === 'flat') return <path d="M42 62 L58 62" {...strokeProps} />
  if (kind === 'wave') return <path d="M39 63 Q45 58 50 63 Q55 68 61 62" {...strokeProps} strokeWidth="3.5" />
  if (kind === 'grin') return <rect fill={FACE_COLOR} height="10" rx="5" width="27" x="36.5" y="57" />
  if (kind === 'open') return <ellipse cx="50" cy="63" fill={FACE_COLOR} rx="9" ry="11" />
  if (kind === 'o') return <ellipse cx="50" cy="63" fill="none" rx="6" ry="8" stroke={FACE_COLOR} strokeWidth="4" />
  return <motion.ellipse animate={reducedMotion ? {} : { ry: [4, 9, 5, 11, 4] }} cx="50" cy="63" fill={FACE_COLOR} rx="7" ry="5" transition={{ duration: 0.85, repeat: Infinity }} />
}

function Effect({ kind, reducedMotion }: { kind: AvatarEffect; reducedMotion: boolean }) {
  if (kind === 'none') return null
  const repeating = reducedMotion ? {} : { repeat: Infinity }

  if (kind === 'orbit') return (
    <motion.g animate={reducedMotion ? {} : { rotate: 360 }} style={{ transformOrigin: '50px 50px' }} transition={{ duration: 8, ease: 'linear', ...repeating }}>
      {[0, 1, 2, 3].map((index) => <ellipse cx="50" cy="50" fill="none" key={index} rx="43" ry={14 + index * 2} stroke={EFFECT_COLORS[index]} strokeLinecap="round" strokeWidth="1.8" transform={`rotate(${index * 43} 50 50)`} />)}
    </motion.g>
  )
  if (kind === 'pulse') return <>{[0, 1, 2].map((index) => <motion.path animate={reducedMotion ? {} : { opacity: [0, 0.8, 0], scale: [0.8, 1.15, 1.3] }} d={`M${76 + index * 4} ${37 - index * 4} Q${90 + index * 2} 50 ${76 + index * 4} ${63 + index * 4}`} fill="none" key={index} stroke={EFFECT_COLORS[index]} strokeLinecap="round" strokeWidth="2" style={{ transformOrigin: '78px 50px' }} transition={{ delay: index * 0.22, duration: 1.5, ...repeating }} />)}</>
  if (kind === 'sparkles') return <>{[[18, 25], [82, 29], [77, 77]].map(([x, y], index) => <motion.path animate={reducedMotion ? {} : { opacity: [0.35, 1, 0.35], scale: [0.75, 1.15, 0.75] }} d={`M${x} ${y - 5} L${x + 1.7} ${y - 1.7} L${x + 5} ${y} L${x + 1.7} ${y + 1.7} L${x} ${y + 5} L${x - 1.7} ${y + 1.7} L${x - 5} ${y} L${x - 1.7} ${y - 1.7} Z`} fill={EFFECT_COLORS[index]} key={`${x}-${y}`} style={{ transformOrigin: `${x}px ${y}px` }} transition={{ delay: index * 0.28, duration: 1.4, ...repeating }} />)}</>
  if (kind === 'hearts') return <>{[[18, 33], [80, 24]].map(([x, y], index) => <motion.path animate={reducedMotion ? {} : { y: [2, -4, 2], scale: [0.85, 1.1, 0.85] }} d="M0 3 C-7 -2 -10 8 0 14 C10 8 7 -2 0 3 Z" fill={EFFECT_COLORS[3]} key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(.65)`} transition={{ delay: index * 0.35, duration: 2, ...repeating }} />)}</>
  if (kind === 'question') return <><path d="M78 26 C78 18 91 18 91 27 C91 33 85 34 85 39" fill="none" stroke={EFFECT_COLORS[1]} strokeLinecap="round" strokeWidth="3" /><circle cx="85" cy="45" fill={EFFECT_COLORS[1]} r="2" /></>
  if (kind === 'sweat') return <motion.path animate={reducedMotion ? {} : { y: [0, 5, 0], opacity: [0.5, 1, 0.5] }} d="M79 22 C73 31 75 36 80 36 C85 36 87 31 79 22 Z" fill={EFFECT_COLORS[0]} transition={{ duration: 1.7, ...repeating }} />
  if (kind === 'idea') return <><circle cx="79" cy="20" fill="none" r="8" stroke={EFFECT_COLORS[4]} strokeWidth="3" /><path d="M76 29 L82 29 M77 33 L81 33" stroke={EFFECT_COLORS[4]} strokeLinecap="round" strokeWidth="2.5" /></>
  if (kind === 'dots') return <>{[0, 1, 2].map((index) => <motion.circle animate={reducedMotion ? {} : { opacity: [0.25, 1, 0.25], y: [0, -2, 0] }} cx={74 + index * 7} cy="24" fill={EFFECT_COLORS[index]} key={index} r="2.2" transition={{ delay: index * 0.2, duration: 1.2, ...repeating }} />)}</>
  if (kind === 'zzz') return <><text fill={EFFECT_COLORS[1]} fontSize="10" fontWeight="700" x="75" y="28">z</text><text fill={EFFECT_COLORS[0]} fontSize="7" fontWeight="700" x="85" y="19">z</text></>
  if (kind === 'search') return <><circle cx="82" cy="25" fill="none" r="7" stroke={EFFECT_COLORS[0]} strokeWidth="3" /><path d="M87 30 L93 36" stroke={EFFECT_COLORS[0]} strokeLinecap="round" strokeWidth="3" /></>
  if (kind === 'success') return <><circle cx="81" cy="23" fill={EFFECT_COLORS[2]} r="10" /><path d="M76 23 L80 27 L87 19" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></>
  if (kind === 'warning') return <><path d="M81 13 L93 34 L69 34 Z" fill={EFFECT_COLORS[4]} /><path d="M81 20 L81 27 M81 31 L81 31" stroke="#111827" strokeLinecap="round" strokeWidth="2.5" /></>
  if (kind === 'error') return <><circle cx="81" cy="23" fill={EFFECT_COLORS[3]} r="10" /><path d="M77 19 L85 27 M85 19 L77 27" stroke="white" strokeLinecap="round" strokeWidth="2.5" /></>
  return <><circle cx="81" cy="23" fill="none" r="10" stroke="#94a3b8" strokeWidth="2.5" /><path d="M73 15 L89 31" stroke="#94a3b8" strokeLinecap="round" strokeWidth="2.5" /></>
}

export function AiAvatar({
  ariaLabel,
  className,
  expression = 'idle',
  intensity = 0.65,
  size = 280,
}: AiAvatarProps) {
  const reducedMotion = useReducedMotion() ?? false
  const visual: AvatarVisual = AI_AVATAR_VISUALS[expression]
  const rootAnimation = animationFor(visual.motion, intensity, reducedMotion)

  return (
    <motion.div
      animate={rootAnimation.animate}
      aria-label={ariaLabel ?? `Mindforge AI：${visual.label}`}
      className={cn('inline-grid shrink-0 place-items-center text-foreground', className)}
      data-expression={expression}
      initial={false}
      role="img"
      style={{ height: size, width: size }}
      transition={rootAnimation.transition}
    >
      <svg aria-hidden="true" className="size-full overflow-visible" viewBox="0 0 100 100">
        <Effect kind={visual.effect} reducedMotion={reducedMotion} />
        <motion.g animate={{ rotate: visual.tilt ?? 0 }} initial={false} style={{ transformOrigin: '50px 50px' }} transition={{ duration: reducedMotion ? 0 : 0.45, ease: 'easeOut' }}>
          <motion.path animate={{ d: BODY_PATHS[visual.body] }} d={BODY_PATHS.soft} fill="currentColor" initial={false} transition={{ duration: reducedMotion ? 0 : 0.5, ease: 'easeInOut' }} />
          <motion.g animate={{ opacity: 1, scale: 1 }} initial={{ opacity: 0, scale: 0.92 }} key={expression} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} transition={{ duration: reducedMotion ? 0 : 0.25 }}>
            <Brows kind={visual.brows} />
            <Eyes kind={visual.eyes} reducedMotion={reducedMotion} />
            <Mouth kind={visual.mouth} reducedMotion={reducedMotion} />
          </motion.g>
        </motion.g>
      </svg>
    </motion.div>
  )
}
