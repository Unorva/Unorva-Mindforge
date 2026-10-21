import { BloubAvatar } from './bloub-avatar';
import type { ExpressionId } from './bloub-core/expressions';
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

/**
 * Chaque etat de l'IA porte deux choses : une ACTION (l'etat du moteur) et un
 * VISAGE (l'expression). Les deux axes sont separes parce qu'une action peut
 * se jouer sur plusieurs visages, et un visage sur plusieurs actions.
 *
 * 喜爱、生气和伤心使用带符号的情绪动作。其余命令沿用静止表情、
 * 点头、摇头和思考等现有动作，保持已接入的 AI 命令兼容。
 */
const APPEARANCE: Record<AiAvatarExpression, { state: StateId; face: ExpressionId }> = {
  idle: { state: 'idle', face: 'neutre' },
  neutral: { state: 'idle', face: 'neutre' },
  happy: { state: 'idle', face: 'heureux' },
  joyful: { state: 'idle', face: 'hilare' },
  excited: { state: 'idle', face: 'excite' },
  playful: { state: 'idle', face: 'espiegle' },
  proud: { state: 'idle', face: 'fier' },
  relieved: { state: 'nod', face: 'reconforte' },
  affectionate: { state: 'love', face: 'amoureux' },
  shy: { state: 'idle', face: 'timide' },
  thinking: { state: 'thinking', face: 'pensif' },
  focused: { state: 'idle', face: 'attentif' },
  curious: { state: 'idle', face: 'curieux' },
  confused: { state: 'idle', face: 'confus' },
  skeptical: { state: 'idle', face: 'sournois' },
  inspired: { state: 'idle', face: 'idee' },
  surprised: { state: 'wide', face: 'surpris' },
  sad: { state: 'sad', face: 'triste' },
  worried: { state: 'idle', face: 'effraye' },
  nervous: { state: 'idle', face: 'affole' },
  disappointed: { state: 'idle', face: 'ennuye' },
  frustrated: { state: 'idle', face: 'blase' },
  angry: { state: 'angry', face: 'furieux' },
  embarrassed: { state: 'idle', face: 'gene' },
  tired: { state: 'idle', face: 'somnolent' },
  sleepy: { state: 'sleep', face: 'somnolent' },
  listening: { state: 'idle', face: 'attentif' },
  speaking: { state: 'idle', face: 'neutre' },
  processing: { state: 'thinking', face: 'attentif' },
  searching: { state: 'orbit', face: 'curieux' },
  success: { state: 'nod', face: 'heureux' },
  warning: { state: 'alert', face: 'affole' },
  error: { state: 'deny', face: 'confus' },
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
