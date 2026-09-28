import type { AiAvatarExpression, AvatarAccessory, AvatarEyePose, AvatarHeadGaze, AvatarMotion, AvatarVisual } from './types'

const REST_GAZE: AvatarHeadGaze = { yaw: 28.49, pitch: 28.62, roll: -13 }
const REST_SPLIT = 15.46

const gaze = (yaw: number, pitch: number, roll: number): AvatarHeadGaze => ({ yaw, pitch, roll })
const eye = (w: number, h: number, tilt = 0, open = 1): AvatarEyePose => ({ h, open, tilt, w })
const pair = (w: number, h: number, tilt = 0, open = 1): [AvatarEyePose, AvatarEyePose] => [
  eye(w, h, tilt, open),
  eye(w, h, -tilt, open),
]

const face = (
  label: string,
  eyes: [AvatarEyePose, AvatarEyePose],
  head = REST_GAZE,
  split = REST_SPLIT,
  motion: AvatarMotion = 'breathe',
  accessory: AvatarAccessory = 'none',
): AvatarVisual => ({ accessory, eyes, gaze: head, label, motion, split })

export const AI_AVATAR_VISUALS = {
  idle: face('待机', pair(0.186, 0.412)),
  neutral: face('平静', pair(0.186, 0.412)),
  happy: face('开心', pair(0.27, 0.17, 14), gaze(5, 9, 0), 17, 'float'),
  joyful: face('大笑', pair(0.34, 0.13, 20), gaze(4, 14, 0), 18, 'bounce'),
  excited: face('兴奋', pair(0.4, 0.56, -10), gaze(6, -14, 0), 19.5, 'bounce'),
  playful: face('调皮', [eye(0.21, 0.4), eye(0.22, 0.15)], gaze(12, 6, -6), 16, 'tilt'),
  proud: face('自信', pair(0.3, 0.15, 18), gaze(5, 17, 0), 17, 'float'),
  relieved: face('放松', pair(0.27, 0.17, 14), gaze(5, 9, 0), 17, 'breathe'),
  affectionate: face('喜爱', pair(0.22, 0.36, 12), gaze(8, 15, -4), 16, 'float', 'heart'),
  shy: face('害羞', pair(0.17, 0.3), gaze(-19, -14, -7), 14, 'tilt'),
  thinking: face('思考', pair(0.3, 0.15, 18), gaze(5, 17, 0), 17, 'think', 'thought'),
  focused: face('专注', pair(0.21, 0.44), gaze(4, 5, -4), 16),
  curious: face('好奇', [eye(0.24, 0.46, -8), eye(0.2, 0.38, -8)], gaze(16, -9, -15), 16.5, 'tilt', 'question'),
  confused: face('疑惑', [eye(0.2, 0.44, -18), eye(0.28, 0.17, 14)], gaze(-14, 3, 8), 16.5, 'tilt', 'question'),
  skeptical: face('怀疑', pair(0.3, 0.12), gaze(-22, 2, 0), 16, 'tilt'),
  inspired: face('灵感', pair(0.4, 0.56, -10), gaze(6, -14, 0), 19.5, 'bounce', 'sparkle'),
  surprised: face('惊讶', pair(0.45, 0.47), gaze(3, -3, 0), 19, 'bounce'),
  sad: face('难过', pair(0.22, 0.4, -28), gaze(3, -13, 0), 16, 'float'),
  worried: face('担忧', pair(0.4, 0.6), gaze(2, -20, 0), 20.5, 'shake'),
  nervous: face('紧张', pair(0.4, 0.6), gaze(2, -20, 0), 20.5, 'shake'),
  disappointed: face('失望', pair(0.17, 0.3), gaze(-19, -14, -7), 14, 'float'),
  frustrated: face('无奈', pair(0.3, 0.12), gaze(-22, 2, 0), 16, 'shake'),
  angry: face('生气', pair(0.34, 0.15, 30), gaze(3, 7, 0), 17, 'shake'),
  embarrassed: face('尴尬', [eye(0.21, 0.4), eye(0.22, 0.15)], gaze(12, 6, -6), 16, 'tilt'),
  tired: face('疲惫', pair(0.2, 0.42, 0, 0.58), gaze(6, -9, -3), 16, 'float'),
  sleepy: face('困倦', pair(0.2, 0.42, 0, 0.42), gaze(6, -9, -3), 16, 'sleep', 'zzz'),
  listening: face('倾听', pair(0.21, 0.44), gaze(4, 5, -4), 16, 'listen'),
  speaking: face('说话', pair(0.186, 0.412), gaze(4, 5, -4), 16, 'speak'),
  processing: face('处理中', pair(0.21, 0.44), gaze(4, 5, -4), 16, 'spin'),
  searching: face('搜索中', pair(0.21, 0.44), gaze(-22, 2, 0), 16, 'think'),
  success: face('完成', pair(0.34, 0.13, 20), gaze(4, 14, 0), 18, 'bounce', 'check'),
  warning: face('提醒', pair(0.45, 0.47), gaze(3, -3, 0), 19, 'nod', 'alert'),
  error: face('出错', [eye(0.2, 0.44), eye(0.28, 0.17, 14)], gaze(-14, 3, 8), 16.5, 'shake', 'cross'),
  offline: face('离线', pair(0.2, 0.42, 0, 0.06), gaze(6, -9, -3), 16, 'sleep'),
} satisfies Record<AiAvatarExpression, AvatarVisual>
