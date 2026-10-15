import { BloubAvatar } from './bloub-avatar';
import type { StateId } from './bloub-core/states';
import type { AiAvatarExpression } from './types';

type AiAvatarProps = {
  ariaLabel?: string;
  className?: string;
  expression?: AiAvatarExpression;
  /** Kept for callers of the earlier component API. */
  intensity?: number;
  size?: number | string;
};

const APPEARANCE: Record<AiAvatarExpression, { state: StateId; face: string }> = {
  idle: { state: 'idle', face: 'neutre' },
  neutral: { state: 'idle', face: 'neutre' },
  happy: { state: 'idle', face: 'heureux' },
  joyful: { state: 'idle', face: 'hilare' },
  excited: { state: 'wide', face: 'excite' },
  playful: { state: 'wink', face: 'mefiant' },
  proud: { state: 'idle', face: 'fier' },
  relieved: { state: 'idle', face: 'heureux' },
  affectionate: { state: 'idle', face: 'heureux' },
  shy: { state: 'idle', face: 'timide' },
  thinking: { state: 'thinking', face: 'neutre' },
  focused: { state: 'idle', face: 'attentif' },
  curious: { state: 'idle', face: 'curieux' },
  confused: { state: 'idle', face: 'confus' },
  skeptical: { state: 'idle', face: 'mefiant' },
  inspired: { state: 'wide', face: 'excite' },
  surprised: { state: 'wide', face: 'surpris' },
  sad: { state: 'idle', face: 'triste' },
  worried: { state: 'idle', face: 'effraye' },
  nervous: { state: 'alert', face: 'effraye' },
  disappointed: { state: 'idle', face: 'triste' },
  frustrated: { state: 'idle', face: 'blase' },
  angry: { state: 'idle', face: 'colere' },
  embarrassed: { state: 'idle', face: 'timide' },
  tired: { state: 'idle', face: 'somnolent' },
  sleepy: { state: 'sleep', face: 'somnolent' },
  listening: { state: 'idle', face: 'attentif' },
  speaking: { state: 'wide', face: 'neutre' },
  processing: { state: 'thinking', face: 'neutre' },
  searching: { state: 'orbit', face: 'neutre' },
  success: { state: 'notify', face: 'heureux' },
  warning: { state: 'alert', face: 'effraye' },
  error: { state: 'exclaim', face: 'confus' },
  offline: { state: 'sleep', face: 'somnolent' },
};

/** Compatibility wrapper so existing AI chat commands use bloub's measured poses. */
export function AiAvatar({ ariaLabel, className, expression = 'idle', size = 280 }: AiAvatarProps) {
  const appearance = APPEARANCE[expression];
  return (
    <BloubAvatar
      ariaLabel={ariaLabel ?? `Mindforge AI：${expression}`}
      className={className}
      expression={appearance.face}
      size={size}
      state={appearance.state}
    />
  );
}
