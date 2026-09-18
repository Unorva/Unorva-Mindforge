import { useCallback, useEffect, useRef, useState } from 'react'

import { AI_AVATAR_EXPRESSIONS, type AiAvatarCommand, type AiAvatarExpression } from './types'

const expressionSet = new Set<string>(AI_AVATAR_EXPRESSIONS)

function clampIntensity(value?: number) {
  return Math.min(1, Math.max(0.2, value ?? 0.65))
}

export function parseAiAvatarCommand(value: unknown): AiAvatarCommand | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.expression !== 'string' || !expressionSet.has(candidate.expression)) return null

  const expression = candidate.expression as AiAvatarExpression
  const returnTo = typeof candidate.returnTo === 'string' && expressionSet.has(candidate.returnTo)
    ? candidate.returnTo as AiAvatarExpression
    : undefined

  return {
    expression,
    durationMs: typeof candidate.durationMs === 'number' ? Math.min(10_000, Math.max(0, candidate.durationMs)) : undefined,
    intensity: typeof candidate.intensity === 'number' ? clampIntensity(candidate.intensity) : undefined,
    returnTo,
  }
}

export function useAiAvatarController(initialExpression: AiAvatarExpression = 'idle') {
  const [expression, setExpression] = useState<AiAvatarExpression>(initialExpression)
  const [intensity, setIntensity] = useState(0.65)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const play = useCallback((command: AiAvatarCommand) => {
    clearTimer()
    setExpression(command.expression)
    setIntensity(clampIntensity(command.intensity))

    if (command.durationMs && command.durationMs > 0) {
      timerRef.current = window.setTimeout(() => {
        setExpression(command.returnTo ?? initialExpression)
        setIntensity(0.65)
        timerRef.current = null
      }, command.durationMs)
    }
  }, [clearTimer, initialExpression])

  const reset = useCallback(() => {
    clearTimer()
    setExpression(initialExpression)
    setIntensity(0.65)
  }, [clearTimer, initialExpression])

  useEffect(() => clearTimer, [clearTimer])

  return { expression, intensity, play, reset }
}
