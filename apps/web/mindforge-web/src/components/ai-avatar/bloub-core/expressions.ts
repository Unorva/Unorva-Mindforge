import { EYE_H, EYE_SPLIT, EYE_W, REST_GAZE, type HeadGaze } from './face';
import { lerp } from './math';
import type { EyeCfg } from './states';

/**
 * Expression de repos du bot.
 *
 * Le visage ne tient qu'à deux gélules, donc tout se joue sur quatre leviers :
 * l'orientation de la tête, l'écart des yeux, leurs proportions, et
 * l'inclinaison propre de chaque œil. C'est ce dernier qui permet la colère et
 * la tristesse : elles demandent des inclinaisons EN MIROIR (les hauts qui
 * convergent ou divergent), impossible avec le seul roulis de tête qui incline
 * les deux yeux du même côté.
 *
 * Seul l'état de repos porte cette expression. Les états expressifs de la vidéo
 * (clin d'œil, yeux écarquillés, notification) gardent la leur : c'est elle
 * qu'on est venu reproduire.
 *
 * Les amplitudes s'appuient sur bible-strong-avatar-lab, qui expose le même
 * modèle (tête X/Y/Z, largeur et hauteur par œil, écart, angle par œil) : chez
 * eux la largeur va de 0,8 à 2,7 fois le neutre, la hauteur de 0,3 à 1,5, et
 * les angles jusqu'à ±80°. On reste dans cette enveloppe.
 */
/** Enumeres pour que la couche i18n verifie leurs traductions a la compilation. */
export type ExpressionId =
  | 'neutre'
  | 'attentif'
  | 'surpris'
  | 'excite'
  | 'heureux'
  | 'hilare'
  | 'colere'
  | 'triste'
  | 'effraye'
  | 'mefiant'
  | 'confus'
  | 'curieux'
  | 'fier'
  | 'timide'
  | 'blase'
  | 'somnolent'
  // Familles d'emotions ajoutees d'apres ClaudeAnimationBase (JohnHeibel) : joie,
  // ruse, abattement, colere, alarme et reflexion. Le vocabulaire reste le meme —
  // orientation de tete, ecart, proportions, inclinaison par oeil — pour que le
  // personnage garde un seul visage et non une collection de masques.
  | 'reconforte'
  | 'amoureux'
  | 'espiegle'
  | 'sournois'
  | 'impassible'
  | 'determine'
  | 'furieux'
  | 'ecoeure'
  | 'affole'
  | 'pensif'
  | 'idee'
  | 'gene'
  | 'ennuye'
  | 'abattu';

export interface BotExpression {
  id: ExpressionId;
  gaze: HeadGaze;
  split: number;
  eyes: [EyeCfg, EyeCfg];
}

/** `tilt` en degrés, positif = le haut de la gélule part vers la droite. */
const eye = (w: number, h: number, tilt = 0, open = 1): EyeCfg => ({ w, h, tilt, open });

/** Les deux yeux identiques, inclinaisons en miroir si `tilt` est fourni. */
const pair = (w: number, h: number, tilt = 0, open = 1): [EyeCfg, EyeCfg] => [
  eye(w, h, tilt, open),
  eye(w, h, -tilt, open),
];

export const EXPRESSIONS: BotExpression[] = [
  {
    // la pose relevée image par image sur la vidéo de référence
    id: 'neutre',
    gaze: { ...REST_GAZE },
    split: EYE_SPLIT,
    eyes: [eye(EYE_W, EYE_H), eye(EYE_W, EYE_H)],
  },
  {
    id: 'attentif',
    gaze: { yaw: 4, pitch: 5, roll: -4 },
    split: 16,
    eyes: pair(0.21, 0.44),
  },
  {
    id: 'surpris',
    gaze: { yaw: 3, pitch: -3, roll: 0 },
    split: 19,
    eyes: pair(0.45, 0.47),
  },
  {
    id: 'excite',
    gaze: { yaw: 6, pitch: -14, roll: 0 },
    split: 19.5,
    eyes: pair(0.4, 0.56, -10),
  },
  {
    // yeux plissés en arc : les hauts convergent légèrement
    id: 'heureux',
    gaze: { yaw: 5, pitch: 9, roll: 0 },
    split: 17,
    eyes: pair(0.27, 0.17, 14),
  },
  {
    id: 'hilare',
    gaze: { yaw: 4, pitch: 14, roll: 0 },
    split: 18,
    eyes: pair(0.34, 0.13, 20),
  },
  {
    // hauts des yeux qui convergent fort vers le centre + yeux étrécis
    id: 'colere',
    gaze: { yaw: 3, pitch: 7, roll: 0 },
    split: 17,
    eyes: pair(0.34, 0.15, 30),
  },
  {
    // l'inverse : les hauts divergent, et le regard tombe
    id: 'triste',
    gaze: { yaw: 3, pitch: -13, roll: 0 },
    split: 16,
    eyes: pair(0.22, 0.4, -28),
  },
  {
    id: 'effraye',
    gaze: { yaw: 2, pitch: -20, roll: 0 },
    split: 20.5,
    eyes: pair(0.4, 0.6),
  },
  {
    // un œil franchement plus fermé que l'autre
    id: 'mefiant',
    gaze: { yaw: 12, pitch: 6, roll: -6 },
    split: 16,
    eyes: [eye(0.21, 0.4), eye(0.22, 0.15)],
  },
  {
    // asymétrique sur les deux axes : tailles ET inclinaisons dépareillées.
    // L'œil plissé est volontairement plat (rapport 1,6) : à un rapport proche
    // de 1 il serait rond, et son inclinaison ne se verrait pas.
    id: 'confus',
    gaze: { yaw: -14, pitch: 3, roll: 8 },
    split: 16.5,
    eyes: [eye(0.2, 0.44, -18), eye(0.28, 0.17, 14)],
  },
  {
    // la tête penche : c'est le roulis qui porte la curiosité
    id: 'curieux',
    gaze: { yaw: 16, pitch: -9, roll: -15 },
    split: 16.5,
    eyes: [eye(0.24, 0.46, -8), eye(0.2, 0.38, -8)],
  },
  {
    id: 'fier',
    gaze: { yaw: 5, pitch: 17, roll: 0 },
    split: 17,
    eyes: pair(0.3, 0.15, 18),
  },
  {
    id: 'timide',
    gaze: { yaw: -19, pitch: -14, roll: -7 },
    split: 14,
    eyes: pair(0.17, 0.3),
  },
  {
    // fentes horizontales et regard qui part sur le côté
    id: 'blase',
    gaze: { yaw: -22, pitch: 2, roll: 0 },
    split: 16,
    eyes: pair(0.3, 0.12),
  },
  {
    // paupieres a moitie tombées : on passe par `open`, donc l'écrasement
    // vertical à l'écran, le même mécanisme que le clignement
    id: 'somnolent',
    gaze: { yaw: 6, pitch: -9, roll: -3 },
    split: 16,
    eyes: pair(0.2, 0.42, 0, 0.42),
  },
  /* ---------------------------------------------- familles de ClaudeAnimationBase */
  {
    // Le relâchement : les paupières retombent et la tête se pose. C'est le
    // soulagement sans la joie — pas d'arc, juste un relâchement des paupières.
    id: 'reconforte',
    gaze: { yaw: 5, pitch: 2, roll: -4 },
    split: 16,
    eyes: pair(0.2, 0.4, 6, 0.55),
  },
  {
    // Les hauts convergent doucement et la tête penche : le tendre. Faute de
    // pouvoir dessiner un cœur (deux gélules, pas de pupille), c'est la pose
    // qui porte l'affection.
    id: 'amoureux',
    gaze: { yaw: 7, pitch: 12, roll: -10 },
    split: 16.5,
    eyes: pair(0.26, 0.2, 18),
  },
  {
    // Un œil plissé, l'autre ouvert, tête penchée : la malice sans le soupçon.
    id: 'espiegle',
    gaze: { yaw: 12, pitch: 4, roll: -9 },
    split: 15.5,
    eyes: [eye(0.22, 0.4, -6), eye(0.2, 0.16, 10)],
  },
  {
    // Fentes relevées d'un côté, regard en coin : le satisfait qui sait.
    id: 'sournois',
    gaze: { yaw: -14, pitch: 8, roll: 5 },
    split: 15,
    eyes: pair(0.28, 0.14, 4),
  },
  {
    // Fentes parfaitement plates, regard droit : rien ne trahit l'humeur,
    // tout est calculé. L'axe `roll` à zéro achève le contraste avec `blase`,
    // qui part sur le côté.
    id: 'impassible',
    gaze: { yaw: -2, pitch: 1, roll: 0 },
    split: 16,
    eyes: pair(0.3, 0.1),
  },
  {
    // Convergence forte mais paupières hautes : la détermination, sans la
    // rougeur de la colère.
    id: 'determine',
    gaze: { yaw: 4, pitch: 12, roll: 0 },
    split: 15.5,
    eyes: pair(0.3, 0.24, 24),
  },
  {
    // Même convergence poussée plus loin, et des yeux plus hauts que `colere` :
    // l'emportement.
    id: 'furieux',
    gaze: { yaw: 1, pitch: 14, roll: 0 },
    split: 16.5,
    eyes: pair(0.36, 0.2, 36),
  },
  {
    // Un œil s'est fermé, l'autre est resté ouvert, la tête s'est détournée :
    // le dégoût. C'est l'asymétrie de la fermeture qui fait le dégoût plutôt
    // que la colère.
    id: 'ecoeure',
    gaze: { yaw: -22, pitch: 8, roll: -12 },
    split: 15,
    eyes: [eye(0.3, 0.12, 20), eye(0.22, 0.4, -10)],
  },
  {
    // La panique : les deux yeux n'ont pas la même taille. La dissymétrie est
    // ici une loi du genre, comme l'affolement l'est de la peur.
    id: 'affole',
    gaze: { yaw: 4, pitch: -6, roll: -6 },
    split: 21,
    eyes: [eye(0.42, 0.58, 4), eye(0.34, 0.5, -6)],
  },
  {
    // Le regard monte vers la gauche, un œil légèrement plus fermé que l'autre :
    // on voit la pensée en train de se faire.
    id: 'pensif',
    gaze: { yaw: -16, pitch: 12, roll: 6 },
    split: 15,
    eyes: [eye(0.2, 0.4, -6), eye(0.16, 0.34, 4)],
  },
  {
    // L'ampoule : les yeux s'ouvrent grand, vers le haut. Le seul état où les
    // deux yeux sont à la fois larges et hauts.
    id: 'idee',
    gaze: { yaw: 8, pitch: 16, roll: -6 },
    split: 18,
    eyes: pair(0.4, 0.5),
  },
  {
    // Yeux bas et petits, tête qui penche : la gêne.
    id: 'gene',
    gaze: { yaw: -18, pitch: -12, roll: 8 },
    split: 14,
    eyes: pair(0.16, 0.26, -8),
  },
  {
    // Fentes basses, regard qui fuit sur le côté : l'ennui, plus éteint que
    // `blase` qui, lui, jauge encore.
    id: 'ennuye',
    gaze: { yaw: -10, pitch: -6, roll: -3 },
    split: 15.5,
    eyes: pair(0.28, 0.1),
  },
  {
    // Les hauts divergent fort et les paupières tombent : les larmes retenues.
    id: 'abattu',
    gaze: { yaw: 2, pitch: -18, roll: 3 },
    split: 15,
    eyes: pair(0.2, 0.3, -34, 0.75),
  },
];

export const EXPRESSION_BY_ID = new Map<string, BotExpression>(EXPRESSIONS.map((e) => [e.id, e]));
export const DEFAULT_EXPRESSION = 'neutre';

const lerpEyeCfg = (a: EyeCfg, b: EyeCfg, t: number): EyeCfg => ({
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
  tilt: lerp(a.tilt ?? 0, b.tilt ?? 0, t),
  open: lerp(a.open, b.open, t),
});

/** Interpolation de deux expressions : le changement se fait en glissant. */
export function blendExpression(a: BotExpression, b: BotExpression, t: number): BotExpression {
  return {
    id: b.id,
    gaze: {
      yaw: lerp(a.gaze.yaw, b.gaze.yaw, t),
      pitch: lerp(a.gaze.pitch, b.gaze.pitch, t),
      roll: lerp(a.gaze.roll, b.gaze.roll, t),
    },
    split: lerp(a.split, b.split, t),
    eyes: [lerpEyeCfg(a.eyes[0], b.eyes[0], t), lerpEyeCfg(a.eyes[1], b.eyes[1], t)],
  };
}
