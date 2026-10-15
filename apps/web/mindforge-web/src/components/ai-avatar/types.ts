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
] as const;

export type AiAvatarExpression = (typeof AI_AVATAR_EXPRESSIONS)[number];

export type AiAvatarCommand = {
  durationMs?: number;
  expression: AiAvatarExpression;
  intensity?: number;
  returnTo?: AiAvatarExpression;
};

export type AvatarMotion =
  | 'bounce'
  | 'breathe'
  | 'float'
  | 'listen'
  | 'nod'
  | 'shake'
  | 'sleep'
  | 'speak'
  | 'spin'
  | 'think'
  | 'tilt';

export type AvatarAccessory =
  'none' | 'heart' | 'thought' | 'sparkle' | 'zzz' | 'check' | 'question' | 'alert' | 'cross';

export type AvatarEyePose = {
  h: number;
  open: number;
  tilt: number;
  w: number;
};

export type AvatarHeadGaze = {
  pitch: number;
  roll: number;
  yaw: number;
};

export type AvatarVisual = {
  accessory: AvatarAccessory;
  eyes: [AvatarEyePose, AvatarEyePose];
  gaze: AvatarHeadGaze;
  label: string;
  motion: AvatarMotion;
  split: number;
};
