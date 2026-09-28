import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'

import { cn } from '@/lib/utils'

import { AI_AVATAR_VISUALS } from './expressions'
import type { AiAvatarExpression, AvatarAccessory, AvatarEyePose, AvatarHeadGaze, AvatarMotion, AvatarVisual } from './types'

const FACE_COLOR = 'var(--background)'
const SOURCE_VIEWBOX_HALF = 158
const SPHERE_RADIUS = (100 / (SOURCE_VIEWBOX_HALF * 2)) * 100
const MORPH_EASE = [0.22, 0.8, 0.2, 1] as const
const CAPSULE_KAPPA = 0.5522847498

type AiAvatarProps = {
  ariaLabel?: string
  className?: string
  expression?: AiAvatarExpression
  intensity?: number
  size?: number | string
}

type Vector3 = [number, number, number]

type ProjectedEye = {
  a: number
  b: number
  c: number
  d: number
  depth: number
  x: number
  y: number
}

function animationFor(kind: AvatarMotion, intensity: number, size: number | string, reducedMotion: boolean) {
  const base = { x: 0, y: 0, rotate: 0, scale: 1 }
  if (reducedMotion) return { animate: base, transition: { duration: 0 } }
  const amount = Math.max(0.2, Math.min(1, intensity))
  const distance = amount * (typeof size === 'number' ? Math.max(0.35, Math.min(1.4, size / 260)) : 1)

  switch (kind) {
    case 'bounce': return { animate: { ...base, y: [0, -9 * distance, 0], rotate: [0, 2.8 * amount, 0], scale: [1, 1 + 0.025 * amount, 1] }, transition: { duration: 1.6, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'float': return { animate: { ...base, y: [0, -4 * distance, 0], rotate: [0, 1.8 * amount, 0] }, transition: { duration: 3.8, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'listen': return { animate: { ...base, y: [0, -2.5 * distance, 0], rotate: [0, -2.5 * amount, 0] }, transition: { duration: 2.6, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'nod': return { animate: { ...base, y: [0, 5.5 * distance, 0], rotate: [0, 3.2 * amount, 0] }, transition: { duration: 1.25, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'shake': return { animate: { ...base, x: [0, -5.5 * distance, 5.5 * distance, 0], rotate: [0, -3.5 * amount, 3.5 * amount, 0] }, transition: { duration: 0.68, ease: 'easeInOut' as const, repeat: Infinity, repeatDelay: 0.8 } }
    case 'sleep': return { animate: { ...base, y: [0, 3.5 * distance, 0], rotate: [0, 1.3 * amount, 0], scale: [1, 1 - 0.015 * amount, 1] }, transition: { duration: 4.2, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'speak': return { animate: { ...base, y: [0, -2.5 * distance, 0], scale: [1, 1 + 0.02 * amount, 1] }, transition: { duration: 0.7, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'spin': return { animate: { ...base, rotate: [0, 5 * amount, 0, -5 * amount, 0] }, transition: { duration: 3.4, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'think': return { animate: { ...base, y: [0, -3.5 * distance, 0], rotate: [0, -2.8 * amount, 0] }, transition: { duration: 3.2, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'tilt': return { animate: { ...base, rotate: [0, 4.5 * amount, 0] }, transition: { duration: 3, ease: 'easeInOut' as const, repeat: Infinity } }
    case 'breathe':
    default: return { animate: { ...base, y: [0, -1.8 * distance, 0], scale: [1, 1 + 0.008 * amount, 1] }, transition: { duration: 4.8, ease: 'easeInOut' as const, repeat: Infinity } }
  }
}

const deg = (degrees: number) => (degrees * Math.PI) / 180

function spin(u: Vector3, v: Vector3, angle: number): [Vector3, Vector3] {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return [
    [u[0] * cosine + v[0] * sine, u[1] * cosine + v[1] * sine, u[2] * cosine + v[2] * sine],
    [v[0] * cosine - u[0] * sine, v[1] * cosine - u[1] * sine, v[2] * cosine - u[2] * sine],
  ]
}

function projectEyes(gaze: AvatarHeadGaze, split: number): [ProjectedEye, ProjectedEye] {
  let forward: Vector3 = [0, 0, 1]
  let right: Vector3 = [1, 0, 0]
  let down: Vector3 = [0, 1, 0]

  ;[forward, right] = spin(forward, right, deg(gaze.yaw))
  ;[down, forward] = spin(down, forward, deg(gaze.pitch))
  ;[right, down] = spin(right, down, deg(gaze.roll))

  const build = (side: number): ProjectedEye => {
    const [eyeForward, eyeRight] = spin(forward, right, deg(split * side))
    return {
      a: eyeRight[0],
      b: eyeRight[1],
      c: down[0],
      d: down[1],
      depth: eyeForward[2],
      x: eyeForward[0] * SPHERE_RADIUS,
      y: eyeForward[1] * SPHERE_RADIUS,
    }
  }

  return [build(-1), build(1)]
}

function capsulePath(width: number, height: number, eye: ProjectedEye, config: AvatarEyePose): string {
  const halfWidth = Math.max(width, 0.01) / 2
  const halfHeight = Math.max(height, 0.01) / 2
  const radius = Math.min(halfWidth, halfHeight)
  const handle = radius * CAPSULE_KAPPA
  const angle = deg(config.tilt)
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const open = 0.06 + 0.94 * Math.max(0, Math.min(1, config.open))
  const a = eye.a * cosine + eye.c * sine
  const b = (eye.b * cosine + eye.d * sine) * open
  const c = -eye.a * sine + eye.c * cosine
  const d = (-eye.b * sine + eye.d * cosine) * open
  const originX = 50 + eye.x
  const originY = 50 + eye.y
  const point = (x: number, y: number) => [originX + a * x + c * y, originY + b * x + d * y]
  const fmt = (value: number) => Number(value.toFixed(3))
  const [mx, my] = point(-halfWidth, -halfHeight + radius)
  const [c1x, c1y] = point(-halfWidth, -halfHeight + radius - handle)
  const [c2x, c2y] = point(-halfWidth + radius - handle, -halfHeight)
  const [p1x, p1y] = point(-halfWidth + radius, -halfHeight)
  const [p2x, p2y] = point(halfWidth - radius, -halfHeight)
  const [c3x, c3y] = point(halfWidth - radius + handle, -halfHeight)
  const [c4x, c4y] = point(halfWidth, -halfHeight + radius - handle)
  const [p3x, p3y] = point(halfWidth, -halfHeight + radius)
  const [p4x, p4y] = point(halfWidth, halfHeight - radius)
  const [c5x, c5y] = point(halfWidth, halfHeight - radius + handle)
  const [c6x, c6y] = point(halfWidth - radius + handle, halfHeight)
  const [p5x, p5y] = point(halfWidth - radius, halfHeight)
  const [p6x, p6y] = point(-halfWidth + radius, halfHeight)
  const [c7x, c7y] = point(-halfWidth + radius - handle, halfHeight)
  const [c8x, c8y] = point(-halfWidth, halfHeight - radius + handle)
  const [p7x, p7y] = point(-halfWidth, halfHeight - radius)

  return [
    `M${fmt(mx)} ${fmt(my)}`,
    `C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p1x)} ${fmt(p1y)}`,
    `L${fmt(p2x)} ${fmt(p2y)}`,
    `C${fmt(c3x)} ${fmt(c3y)} ${fmt(c4x)} ${fmt(c4y)} ${fmt(p3x)} ${fmt(p3y)}`,
    `L${fmt(p4x)} ${fmt(p4y)}`,
    `C${fmt(c5x)} ${fmt(c5y)} ${fmt(c6x)} ${fmt(c6y)} ${fmt(p5x)} ${fmt(p5y)}`,
    `L${fmt(p6x)} ${fmt(p6y)}`,
    `C${fmt(c7x)} ${fmt(c7y)} ${fmt(c8x)} ${fmt(c8y)} ${fmt(p7x)} ${fmt(p7y)}Z`,
  ].join(' ')
}

function eyeOpacity(eye: ProjectedEye) {
  return Math.max(0, Math.min(1, eye.depth / 0.12))
}

function EyePair({ visual, reducedMotion }: { visual: AvatarVisual; reducedMotion: boolean }) {
  const projected = projectEyes(visual.gaze, visual.split)

  return (
    <motion.g
      animate={reducedMotion ? {} : { x: [0, 0.24, -0.18, 0], y: [0, 0.12, -0.1, 0] }}
      transition={reducedMotion ? { duration: 0 } : {
        x: { duration: 7.2, ease: 'easeInOut', repeat: Infinity },
        y: { duration: 5.8, ease: 'easeInOut', repeat: Infinity },
      }}
    >
      {visual.eyes.map((eye, index) => {
        const d = capsulePath(eye.w * SPHERE_RADIUS, eye.h * SPHERE_RADIUS, projected[index], eye)
        const opacity = eyeOpacity(projected[index])

        return (
          <motion.g
            animate={reducedMotion ? { opacity } : { opacity, scaleY: [1, 1, 0.06, 1, 1] }}
            key={index}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            transition={reducedMotion ? { duration: 0 } : {
              opacity: { duration: 0.35, ease: MORPH_EASE },
              scaleY: {
                duration: 3.8,
                ease: 'linear',
                repeat: Infinity,
                times: [0, 0.93, 0.955, 0.98, 1],
              },
            }}
          >
            <motion.path
              animate={{ d }}
              d={d}
              fill={FACE_COLOR}
              initial={false}
              transition={{ d: { duration: reducedMotion ? 0 : 0.4, ease: MORPH_EASE } }}
            />
          </motion.g>
        )
      })}
    </motion.g>
  )
}

function AccessoryShape({ kind, reducedMotion }: { kind: AvatarAccessory; reducedMotion: boolean }) {
  switch (kind) {
    case 'heart':
      return (
        <motion.path
          animate={reducedMotion ? undefined : { scale: [1, 1.16, 1] }}
          d="M79 25C77.4 23.7 73.9 21.5 73.9 18.6c0-1.7 1.2-2.8 2.7-2.8 1.1 0 1.9.6 2.4 1.4.5-.8 1.3-1.4 2.4-1.4 1.5 0 2.7 1.1 2.7 2.8 0 2.9-3.5 5.1-5.1 6.4Z"
          fill="#ec4899"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          transition={reducedMotion ? undefined : { duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
        />
      )
    case 'thought':
      return (
        <g fill="currentColor">
          <circle cx="73.5" cy="27" r="1.1" />
          <circle cx="78.5" cy="22" r="1.6" />
          <circle cx="84" cy="16.5" r="2.2" />
        </g>
      )
    case 'sparkle':
      return (
        <g fill="currentColor">
          <path d="M79 14.5 80.3 18.7 84.5 20 80.3 21.3 79 25.5 77.7 21.3 73.5 20 77.7 18.7Z" />
          <circle cx="85.5" cy="14.5" r="1" />
        </g>
      )
    case 'zzz':
      return (
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
          <path d="M73.5 20.5h5.5l-5.5 5.5H79" />
          <path d="M81 13.5h4.5L81 18h4.5" />
        </g>
      )
    case 'check':
      return <path d="m74.5 20.5 3 3 6-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    case 'none':
      return null
  }
}

export function AiAvatar({
  ariaLabel,
  className,
  expression = 'idle',
  intensity = 0.65,
  size = 280,
}: AiAvatarProps) {
  const reducedMotion = useReducedMotion() ?? false
  const clipId = `ai-avatar-${useId().replace(/:/g, '')}-sphere`
  const visual = AI_AVATAR_VISUALS[expression]
  const rootAnimation = animationFor(visual.motion, intensity, size, reducedMotion)

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      aria-label={ariaLabel ?? `Mindforge AI：${visual.label}`}
      className={cn('inline-grid shrink-0 place-items-center', className)}
      data-expression={expression}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 6 }}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.88, y: 8 }}
      role="img"
      style={{ height: size, width: size }}
      transition={{ duration: reducedMotion ? 0 : 0.34, ease: 'easeOut' }}
    >
      <motion.div animate={rootAnimation.animate} className="size-full text-foreground" transition={rootAnimation.transition}>
        <svg aria-hidden="true" className="size-full overflow-visible" viewBox="0 0 100 100">
          <defs>
            <clipPath id={clipId}>
              <circle cx="50" cy="50" r={SPHERE_RADIUS} />
            </clipPath>
          </defs>
          <circle cx="50" cy="50" fill="currentColor" r={SPHERE_RADIUS} />
          <g clipPath={`url(#${clipId})`}>
            <EyePair reducedMotion={reducedMotion} visual={visual} />
          </g>
          <AnimatePresence initial={false}>
            {visual.accessory !== 'none' && (
              <motion.g
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: -3 }}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.55, y: 3 }}
                key={visual.accessory}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                transition={{ duration: reducedMotion ? 0 : 0.32, ease: MORPH_EASE }}
              >
                <AccessoryShape kind={visual.accessory} reducedMotion={reducedMotion} />
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </motion.div>
    </motion.div>
  )
}
