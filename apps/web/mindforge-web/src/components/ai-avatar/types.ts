export const AI_AVATAR_EXPRESSIONS = [
  'idle',
  'neutral',
  'happy',
  'joyful',
  'excited',
  'playful',
  'proud',
  'relieved',
  'affectionate',
  'shy',
  'thinking',
  'focused',
  'curious',
  'confused',
  'skeptical',
  'inspired',
  'surprised',
  'sad',
  'worried',
  'nervous',
  'disappointed',
  'frustrated',
  'angry',
  'embarrassed',
  'tired',
  'sleepy',
  'listening',
  'speaking',
  'processing',
  'searching',
  'success',
  'warning',
  'error',
  'offline',
] as const

export type AiAvatarExpression = typeof AI_AVATAR_EXPRESSIONS[number]

export type AiAvatarCommand = {
  durationMs?: number
  expression: AiAvatarExpression
  intensity?: number
  returnTo?: AiAvatarExpression
}

export type AvatarBodyShape = 'round' | 'soft' | 'squash' | 'tall' | 'triangle' | 'wide'
export type AvatarBrows = 'angry' | 'happy' | 'none' | 'raised' | 'sad' | 'thinking'
export type AvatarEffect = 'dots' | 'error' | 'hearts' | 'idea' | 'none' | 'offline' | 'orbit' | 'pulse' | 'question' | 'search' | 'sparkles' | 'success' | 'sweat' | 'warning' | 'zzz'
export type AvatarEyes = 'angry' | 'closed' | 'dizzy' | 'focused' | 'happy' | 'look-down' | 'look-left' | 'look-right' | 'look-up' | 'open' | 'sad' | 'sleepy' | 'uneven' | 'wide' | 'wink'
export type AvatarMotion = 'bounce' | 'breathe' | 'float' | 'listen' | 'nod' | 'shake' | 'sleep' | 'speak' | 'spin' | 'think' | 'tilt'
export type AvatarMouth = 'flat' | 'frown' | 'grin' | 'none' | 'o' | 'open' | 'smile' | 'small-smile' | 'talk' | 'wave'

export type AvatarVisual = {
  body: AvatarBodyShape
  brows: AvatarBrows
  effect: AvatarEffect
  eyes: AvatarEyes
  label: string
  motion: AvatarMotion
  mouth: AvatarMouth
  tilt?: number
}
