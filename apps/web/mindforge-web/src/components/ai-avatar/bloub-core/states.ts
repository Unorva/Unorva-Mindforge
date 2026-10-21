import {
  COMET_DOT,
  COMET_RIBBONS,
  DOT_PEAK,
  DOT_R,
  DOT_X,
  NOTIF_ANGLE,
  NOTIF_DIST,
  NOTIF_MARGIN,
  NOTIF_POP,
  NOTIF_R,
  RINGS,
  SWOOSH,
  particles,
  type ArcSpec,
  type DotRender,
} from './decor';
import { EYE_H, EYE_SPLIT, EYE_W, REST_GAZE, type HeadGaze } from './face';
import { TAU, clamp, easings } from './math';
import {
  circle,
  hullOfCircles,
  polyPath,
  profileFromPolygon,
  silhouette,
  type Silhouette,
} from './shape';

export interface EyeCfg {
  /** largeur locale (axe court de la gelule), en unites de rayon de boule */
  w: number;
  /** hauteur locale (axe long) */
  h: number;
  /** 1 = ouvert, 0 = ferme */
  open: number;
  /**
   * Inclinaison propre de la gelule, en degres, positif = le haut part a
   * droite. Appliquee APRES le repere tangent de la sphere. Sans elle, les deux
   * yeux penchent forcement du meme cote (le roulis de tete) et la colere comme
   * la tristesse, qui demandent des inclinaisons en miroir, sont hors de portee.
   */
  tilt?: number;
}

export interface Pose {
  /** silhouette du corps, en unites de rayon de boule */
  sil: Silhouette;
  /** decalage global du corps ET des yeux */
  offX: number;
  offY: number;
  gaze: HeadGaze;
  /** demi-ecart des yeux sur la sphere, en degres */
  split: number;
  /** [oeil interieur, oeil exterieur] */
  eyes: [EyeCfg, EyeCfg];
  /** opacite des yeux : sert aux etats sans visage */
  eyeAlpha: number;
  bodyAlpha: number;
  dots: DotRender[];
  arcs: ArcSpec[];
  notif: { x: number; y: number; r: number; notch: number } | null;
  /** true = le decor passe derriere le corps (particules de l'eclatement) */
  dotsBehind: boolean;
}

const pair = (w: number, h: number): [EyeCfg, EyeCfg] => [
  { w, h, open: 1 },
  { w, h, open: 1 },
];

function base(over: Partial<Pose> = {}): Pose {
  return {
    sil: circle(1),
    offX: 0,
    offY: 0,
    gaze: { ...REST_GAZE },
    split: EYE_SPLIT,
    eyes: pair(EYE_W, EYE_H),
    eyeAlpha: 1,
    bodyAlpha: 1,
    dots: [],
    arcs: [],
    notif: null,
    dotsBehind: false,
    ...over,
  };
}

/* --------------------------------------------------- formes non radiales */

/**
 * Barre du "!" vertical : enveloppe convexe de deux cercles.
 * Mesure : cercle haut (0, -0.505) r 0.132, cercle bas (0, +0.130) r 0.075,
 * flancs rectilignes. Elle est donc tronconique (rapport haut/bas 1.76).
 */
const BAR_UPRIGHT_CY = -0.1875;
const BAR_UPRIGHT = profileFromPolygon(
  hullOfCircles(0, -0.505, 0.132, 0, 0.13, 0.075),
  0,
  BAR_UPRIGHT_CY,
);

/** Barre du "!" penche : capsule pure (largeur constante 0.269, longueur 0.776). */
const BAR_ITALIC = profileFromPolygon(hullOfCircles(0, -0.2535, 0.1345, 0, 0.2535, 0.1345), 0, 0);

const barUpright = (pose: Partial<Silhouette> = {}): Silhouette => ({
  radii: [...BAR_UPRIGHT],
  rot: 0,
  cx: 0,
  cy: BAR_UPRIGHT_CY,
  sx: 1,
  sy: 1,
  ...pose,
});

const barItalic = (pose: Partial<Silhouette> = {}): Silhouette => ({
  radii: [...BAR_ITALIC],
  rot: 0,
  cx: 0,
  cy: 0,
  sx: 1,
  sy: 1,
  ...pose,
});

/**
 * Le point du "!" penche n'est pas un disque : c'est une goutte, bout rond
 * (r 0.118) du cote de la barre et pointe effilee a l'oppose, longueur 0.300
 * dans l'axe du glyphe. Centree sur le barycentre du bout rond.
 */
const TEAR = polyPath(hullOfCircles(0, 0, 0.118, 0, 0.172, 0.012));

const LOVE_HEART =
  'M0 0.115 C-0.035 0.075 -0.13 0.015 -0.13 -0.045 C-0.13 -0.13 -0.035 -0.15 0 -0.075 C0.035 -0.15 0.13 -0.13 0.13 -0.045 C0.13 0.015 0.035 0.075 0 0.115 Z';

/** Four curved corners form the comic anger mark, with an open cross at its centre. */
const ANGER_MARK =
  'M-0.19 -0.06 H-0.11 Q-0.06 -0.06 -0.06 -0.11 V-0.19 H-0.01 V-0.11 Q-0.01 -0.01 -0.11 -0.01 H-0.19 Z ' +
  'M0.19 -0.06 H0.11 Q0.06 -0.06 0.06 -0.11 V-0.19 H0.01 V-0.11 Q0.01 -0.01 0.11 -0.01 H0.19 Z ' +
  'M-0.19 0.06 H-0.11 Q-0.06 0.06 -0.06 0.11 V0.19 H-0.01 V0.11 Q-0.01 0.01 -0.11 0.01 H-0.19 Z ' +
  'M0.19 0.06 H0.11 Q0.06 0.06 0.06 0.11 V0.19 H0.01 V0.11 Q0.01 0.01 0.11 0.01 H0.19 Z';

const TEAR_STREAK =
  'M-0.045 0 Q-0.055 0.13 -0.043 0.27 Q-0.035 0.4 0 0.4 Q0.04 0.4 0.045 0.27 Q0.055 0.13 0.045 0 Z';
const TEAR_HIGHLIGHT =
  'M-0.014 0 Q-0.022 0.13 -0.014 0.28 Q-0.008 0.35 0.002 0.35 Q0.012 0.35 0.014 0.28 Q0.02 0.13 0.014 0 Z';
const TEAR_DROP =
  'M0 -0.075 C-0.02 -0.035 -0.052 0 -0.052 0.035 A0.052 0.052 0 1 0 0.052 0.035 C0.052 0 0.02 -0.035 0 -0.075 Z';

/**
 * Le triangle ne tourne pas sur lui-meme : son centre decrit un cercle de
 * rayon 0.213 autour de l'origine (mesure). C'est ce decalage qui donne
 * l'impression qu'il bascule au lieu de pivoter sur place.
 */
const TRI_ORBIT = 0.213;

function spinningTriangle(rot: number): Silhouette {
  return silhouette('triangle', {
    rot,
    cx: -TRI_ORBIT * Math.sin(rot),
    cy: TRI_ORBIT * Math.cos(rot),
  });
}

/* ------------------------------------------------------------------ etats */

export type StateId =
  | 'idle'
  | 'thinking'
  | 'wink'
  | 'wide'
  | 'alert'
  | 'notify'
  | 'exclaim'
  | 'sleep'
  | 'egg'
  | 'hexagon'
  | 'play'
  | 'orbit'
  | 'burst'
  | 'comet'
  /**
   * Actions de la couche IA. Elles repondent a un evenement (l'utilisateur
   * envoie, le modele repond, une erreur tombe) la ou les etats releves sur la
   * video decrivent surtout des formes. Le vocabulaire est emprunte aux
   * "emotes" et aux "moves" de ClaudeAnimationBase (JohnHeibel) : hochement,
   * refus, puis trois emotions accompagnees de signes animes.
   */
  | 'nod'
  | 'deny'
  | 'love'
  | 'angry'
  | 'sad'
  /** transition d'interface, pas une animation du catalogue : hors `SEQUENCE` */
  | 'swirl';

export interface StateDef {
  id: StateId;
  /** duree de maintien quand la sequence complete est jouee */
  duration: number;
  /**
   * duree en dessous de laquelle l'animation est coupee avant d'aboutir : le
   * "!" ne revient pas, le corps reste eclate. Elle se lit dans les constantes
   * de `pose` ci-dessous, elle ne se choisit pas. Absente = l'etat ignore le
   * temps ou boucle, n'importe quelle duree lui va (voir `MIN_BLOCK`).
   */
  minDuration?: number;
  /** duree du morph d'entree */
  morph: number;
  /** true = l'entree est masquee par un clignement, comme dans la video */
  blinkIn: boolean;
  /**
   * true = le corps est la silhouette "au repos", donc remplacable par la forme
   * choisie dans le personnalisateur. Les etats qui dessinent leur propre forme
   * (le "!", les points, l'oeuf, le triangle...) valent false : c'est cette forme
   * la qui EST l'animation.
   */
  baseBody: boolean;
  /**
   * true = l'etat porte le visage "au repos", donc remplacable par l'expression
   * choisie. Seul `idle` : les autres etats a visage ont une expression relevee
   * sur la video, c'est precisement ce qu'on reproduit.
   */
  baseFace: boolean;
  pose(local: number): Pose;
}

/** Onde de pulsation qui parcourt les trois points de gauche a droite. */
function dotPulse(t: number, index: number): number {
  const p = ((((t - index * 0.5) / 1.5) % 1) + 1) % 1;
  const k = p < 0.5 ? 0.5 - 0.5 * Math.cos(p * TAU) : 0;
  return clamp(k * 2);
}

export const STATES: StateDef[] = [
  {
    id: 'idle',
    duration: 2.4,
    morph: 0.45,
    blinkIn: false,
    baseFace: true,
    baseBody: true,
    pose: () => base(),
  },

  {
    id: 'thinking',
    duration: 2.6,
    morph: 0.4,
    baseFace: false,
    baseBody: false,
    blinkIn: true,
    pose: (t) => {
      const mid = dotPulse(t, 1);
      // Les points lateraux sortent des flancs de la boule : dans la video ils
      // restent fusionnes avec elle 1-2 frames avant de se detacher.
      const emerge = 0.3 + 0.7 * easings.easeOutCubic(clamp(t / 0.3));
      return base({
        // la boule DEVIENT le point du milieu : le morph reste continu
        sil: circle(DOT_R * (1 + (DOT_PEAK - 1) * mid), { cx: DOT_X[1]! }),
        eyeAlpha: 0,
        dots: [0, 2].map((i) => {
          const k = dotPulse(t, i);
          return {
            x: DOT_X[i]! * emerge,
            y: 0,
            r: DOT_R * (1 + (DOT_PEAK - 1) * k),
            opacity: 0.55 + 0.45 * k,
          };
        }),
      });
    },
  },

  {
    id: 'wink',
    duration: 1.6,
    morph: 0.3,
    blinkIn: true,
    baseFace: false,
    baseBody: true,
    pose: () =>
      base({
        gaze: { yaw: -5.37, pitch: 4.55, roll: 6.7 },
        split: 16.25,
        // L'oeil ferme n'est pas l'oeil ouvert ecrase : c'est un tiret
        // horizontal PLUS LARGE que l'oeil ouvert (0.447 contre 0.236).
        eyes: [
          { w: 0.236, h: 0.464, open: 1 },
          { w: 0.447, h: 0.089, open: 1 },
        ],
      }),
  },

  {
    id: 'wide',
    duration: 1.8,
    morph: 0.55,
    blinkIn: true,
    baseFace: false,
    baseBody: true,
    pose: () =>
      base({
        gaze: { yaw: 6.92, pitch: -21.96, roll: 11.6 },
        split: 18.43,
        eyes: pair(0.356, 0.875),
      }),
  },

  {
    id: 'alert',
    duration: 2.4,
    // le "!" revient en place a 1.6 + 0.4
    minDuration: 2,
    morph: 0.45,
    baseFace: false,
    baseBody: false,
    blinkIn: false,
    pose: (t) => {
      // Course mesuree : -0.087 -> +0.732 en 1.5 s, ease-in-out, micro-overshoot.
      const p = clamp(t / 1.5);
      const travel = easings.easeInOutCubic(p) * 0.82 - 0.087;
      const back = t > 1.6 ? clamp((t - 1.6) / 0.4) : 0;
      const x = travel * (1 - back) + 0.1 * back;
      // Vibration secondaire a 2.5 Hz, barre et point en opposition de phase.
      const buzz = Math.sin(t * 2.5 * TAU) * 0.005;
      const tilt = (17.7 * Math.PI) / 180;
      return base({
        sil: barItalic({ rot: tilt, cx: x, cy: -0.325 - buzz }),
        eyeAlpha: 0,
        dots: [
          {
            // le point suit l'axe du glyphe, a 0.580 du centre de la barre
            x: x - Math.sin(tilt) * 0.58,
            y: -0.325 + Math.cos(tilt) * 0.58 + buzz * 2.8,
            r: 0.118,
            d: TEAR,
            rot: (tilt * 180) / Math.PI,
            opacity: 1,
          },
        ],
      });
    },
  },

  {
    id: 'notify',
    duration: 2.2,
    morph: 0.5,
    blinkIn: true,
    baseFace: false,
    baseBody: true,
    pose: (t) => {
      // Pop du point bleu : pic a +14 % vers 0.3 s puis stabilisation.
      const p = clamp(t / 0.45);
      const pop = 1 + (NOTIF_POP - 1) * Math.sin(p * Math.PI) * (1 - p * 0.35);
      const r = NOTIF_R * (p < 1 ? pop : 1);
      const a = (NOTIF_ANGLE * Math.PI) / 180;
      return base({
        // le regard part a l'oppose de la pastille
        gaze: { yaw: -21.94, pitch: -5.82, roll: -12.2 },
        split: 18.89,
        eyes: pair(0.505, 0.498),
        notif: {
          x: Math.cos(a) * NOTIF_DIST,
          y: Math.sin(a) * NOTIF_DIST,
          r,
          notch: r + NOTIF_MARGIN,
        },
      });
    },
  },

  {
    id: 'exclaim',
    duration: 2,
    morph: 0.45,
    baseFace: false,
    baseBody: false,
    blinkIn: false,
    pose: () =>
      base({
        sil: barUpright(),
        eyeAlpha: 0,
        dots: [{ x: -0.012, y: 0.526, r: 0.113, opacity: 1 }],
      }),
  },

  {
    id: 'sleep',
    duration: 2.4,
    morph: 0.5,
    baseFace: false,
    baseBody: false,
    blinkIn: false,
    pose: (t) =>
      base({
        // Rebond vertical mesure : +-0.19 autour de +0.11, periode 0.6 s.
        sil: circle(0.1585, { cy: 0.11 + Math.sin(t * (TAU / 0.6)) * 0.19 }),
        eyeAlpha: 0,
      }),
  },

  {
    id: 'egg',
    duration: 1.8,
    morph: 0.4,
    baseFace: false,
    baseBody: false,
    blinkIn: true,
    pose: () =>
      base({
        sil: silhouette('egg'),
        gaze: { yaw: 19.97, pitch: 26.01, roll: -17.1 },
        // les yeux se resserrent comme le corps
        split: 11.07,
        eyes: pair(0.164, 0.385),
      }),
  },

  {
    id: 'hexagon',
    duration: 1.6,
    morph: 0.4,
    baseFace: false,
    baseBody: false,
    blinkIn: true,
    pose: () =>
      base({
        sil: silhouette('hexagon'),
        gaze: { yaw: 23.11, pitch: 24.42, roll: -13.3 },
        split: 13.37,
        eyes: pair(0.177, 0.411),
      }),
  },

  {
    id: 'play',
    duration: 2,
    morph: 0.5,
    baseFace: false,
    baseBody: false,
    blinkIn: true,
    pose: (t) => {
      // Le triangle reste quasi immobile pendant que le bouquet le traverse.
      const fade = clamp(t / 0.35) * clamp((2.2 - t) / 0.5);
      return base({
        sil: spinningTriangle(0),
        gaze: { yaw: 12, pitch: -8, roll: -6 },
        split: 15,
        eyes: pair(0.18, 0.34),
        // le bouquet balaie de la droite vers la gauche par-dessus le triangle
        arcs: SWOOSH.map((s, i) => ({
          id: `sw${i}`,
          seed: { ...s, cx: 0.45 - t * 0.42 },
          t,
          opacity: fade,
        })),
      });
    },
  },

  {
    id: 'orbit',
    duration: 3.4,
    // le corps a fini de se relacher du triangle vers la boule a 1.6 + 0.9
    minDuration: 2.5,
    morph: 0.6,
    baseFace: false,
    baseBody: false,
    blinkIn: false,
    pose: (t) => {
      // Rotation mesuree : rampe sur 0.35 s puis 1.25 tour/s (sens antihoraire).
      const ramp = easings.easeInOutCubic(clamp(t / 0.35));
      const rot = -TAU * 1.25 * t * ramp;
      // Le corps se relache du triangle vers la boule pendant l'orbite.
      const back = easings.easeInOutCubic(clamp((t - 1.6) / 0.9));
      const tri = spinningTriangle(rot);
      const ball = circle(1, { rot });
      const sil: Silhouette = {
        radii: tri.radii.map((r, i) => r + (ball.radii[i]! - r) * back),
        rot,
        cx: tri.cx * (1 - back),
        cy: tri.cy * (1 - back),
        sx: 1,
        sy: 1,
      };
      const fade = clamp(t / 0.8) * clamp((3.6 - t) / 0.9);
      return base({
        sil,
        // les yeux filent autour de la sphere ~3x plus vite que la silhouette
        gaze: {
          yaw: REST_GAZE.yaw + Math.sin(t * 6.5) * 65 * (1 - back),
          pitch: -4 + back * 32,
          roll: -13,
        },
        eyes: pair(0.18, 0.34 + back * 0.07),
        // les anneaux entrent un par un sur 0.8 s
        arcs: RINGS.map((s, i) => ({
          id: `rg${i}`,
          seed: s,
          t,
          opacity: fade * clamp((t - i * 0.13) / 0.3),
        })),
      });
    },
  },

  {
    /**
     * Entree dans la vue des reglages.
     *
     * SEUL etat qui n'est pas releve sur la video : il est CHOISI, comme la
     * couleur `--ink`. Il emprunte le vocabulaire d'`orbit` — les memes anneaux,
     * avec leurs parametres mesures — mais coupe court : 1 s au lieu de 3,4, la
     * moitie des anneaux, et aucun triangle.
     *
     * Les deux drapeaux a `true` sont tout l'interet de cet etat :
     *
     * - `baseBody` laisse la forme choisie remplacer le corps, donc la vue peut
     *   imposer le cercle et le galet ou la goutte y MORPHENT au lieu de sauter ;
     * - `baseFace` fait porter le visage de repos, donc le suivi du curseur
     *   s'applique des cette entree. Un etat qui aurait sa propre pose de regard
     *   (comme `orbit`) rendrait la main a l'etat suivant en pleine course, et
     *   les yeux sauteraient d'un coup a la reprise.
     *
     * Il n'est volontairement PAS dans `SEQUENCE` : ce n'est pas une animation du
     * catalogue, c'est une transition d'interface.
     */
    id: 'swirl',
    // un peu plus que le tour du regard (`TURN_TIME`, 1,1 s) : les yeux doivent
    // etre poses a gauche avant que les anneaux ne s'effacent
    duration: 1.3,
    minDuration: 1.3,
    morph: 0.3,
    baseFace: true,
    baseBody: true,
    // le morph de forme est masque par un clignement, comme partout ailleurs
    blinkIn: true,
    pose: (t) =>
      base({
        // trois anneaux sur les six d'`orbit` : la moitie du bouquet suffit a le
        // reconnaitre, et c'est autant d'arcs en moins a rasteriser par image
        arcs: RINGS.slice(0, 3).map((s, i) => ({
          id: `sw${i}`,
          seed: s,
          t,
          // ils entrent l'un apres l'autre puis s'effacent avant la fin du bloc,
          // pour que la reprise au repos se fasse sur une image deja propre
          opacity: clamp((t - i * 0.06) / 0.14) * clamp((1.22 - t) / 0.34),
        })),
      }),
  },

  {
    id: 'burst',
    duration: 2.6,
    // le corps est recompose a 1.7 + 0.7
    minDuration: 2.4,
    morph: 0.4,
    baseFace: false,
    baseBody: false,
    blinkIn: false,
    pose: (t) => {
      // Effondrement mesure : 1.0 -> 0.166 en 0.7 s, ease-out, sans rebond.
      const collapse = 1 - 0.834 * easings.easeOutQuint(clamp(t / 0.7));
      const regrow = easings.easeOutQuint(clamp((t - 1.7) / 0.7));
      return base({
        sil: circle(collapse + (1 - collapse) * regrow),
        eyeAlpha: clamp((t - 1.85) / 0.4),
        dots: particles(t, 1),
        dotsBehind: true,
      });
    },
  },

  {
    id: 'comet',
    duration: 2.4,
    // le point se recompose a 1.85 + 0.6 = 2.45, soit 0.05 s apres la coupe de
    // la video : ce reliquat se termine pendant le fondu suivant, comme dans la
    // reference. On ne descend donc pas sous la duree mesuree.
    minDuration: 2.4,
    morph: 0.45,
    baseFace: false,
    baseBody: false,
    blinkIn: false,
    pose: (t) => {
      const collapse = 1 - (1 - COMET_DOT) * easings.easeOutQuint(clamp(t / 0.55));
      const regrow = easings.easeOutQuint(clamp((t - 1.85) / 0.6));
      const fade = clamp((t - 0.15) / 0.25) * clamp((1.95 - t) / 0.3);
      return base({
        // Le point derive de 0.035 vers le bas puis remonte (wobble mesure).
        sil: circle(collapse + (1 - collapse) * regrow, {
          cy: Math.sin(clamp(t / 1.7) * Math.PI) * 0.035,
        }),
        eyeAlpha: clamp((t - 2) / 0.35),
        arcs: COMET_RIBBONS.map((s, i) => ({ id: `cm${i}`, seed: s, t, opacity: fade })),
      });
    },
  },

  /* --------------------------------------------------- actions de la couche IA */
  /**
   * Les cinq etats qui suivent ne sont pas releves sur la video : ils sont
   * CHOISIS, comme `swirl`, mais ils appartiennent au catalogue (donc a la
   * palette et a la sequence). Trois regles leur sont communes :
   *
   * - `baseBody: true` : le corps reste la forme choisie dans le
   *   personnalisateur, l'action n'est portee que par la pose (decalage,
   *   squash, orientation) ;
   * - `baseFace: false` : l'action porte son propre visage, sinon chaque
   *   combinaison (forme, etat, expression) ferait une entree de plus dans la
   *   table de `eyefit.ts`, payee a l'import pour rien ;
   * - les hochements s'amortissent ; les emotions bouclent pour rester lisibles
   *   quelle que soit la duree choisie dans l'editeur.
   */
  {
    /** Acquiescement : deux hochements de tete, le corps suit. */
    id: 'nod',
    duration: 1.4,
    minDuration: 1,
    morph: 0.3,
    blinkIn: true,
    baseFace: false,
    baseBody: true,
    pose: (t) => {
      // deux hochements sur 0,9 s, puis retour amorti sur les 0,35 s restantes
      const settle = 1 - clamp((t - 0.9) / 0.35);
      const bob = Math.sin(clamp(t / 0.9) * TAU * 2) * settle;
      return base({
        offY: 0.055 * bob,
        sil: circle(1, { sy: 1 - 0.04 * Math.max(0, bob) }),
        gaze: { yaw: 4, pitch: 2 + 7 * bob, roll: -4 },
        eyes: pair(0.186, 0.4),
      });
    },
  },

  {
    /** Refus : la boule secoue la tete de droite a gauche, deux fois. */
    id: 'deny',
    duration: 1.6,
    minDuration: 1,
    morph: 0.3,
    blinkIn: true,
    baseFace: false,
    baseBody: true,
    pose: (t) => {
      const settle = 1 - clamp((t - 1.05) / 0.4);
      const w = Math.sin(clamp(t / 1.05) * TAU * 2) * settle;
      return base({
        sil: circle(1, { rot: w * 0.09, sx: 1 + Math.abs(w) * 0.02 }),
        offX: w * 0.05,
        gaze: { yaw: w * 20, pitch: 2, roll: -4 + w * 5 },
        eyes: pair(0.21, 0.4),
      });
    },
  },

  {
    /** Love: staggered pink hearts continuously rise above the head. */
    id: 'love',
    duration: 2.8,
    minDuration: 1.2,
    morph: 0.4,
    blinkIn: true,
    baseFace: false,
    baseBody: true,
    pose: (t) => {
      const sway = Math.sin((t / 2.8) * TAU);
      const dots = [0, 1, 2].map((index) => {
        const phase = (((t / 2.1 + index / 3) % 1) + 1) % 1;
        return {
          x: -0.3 + index * 0.3 + Math.sin(phase * TAU + index) * 0.035,
          y: -1.03 - phase * 0.34,
          r: 0.13,
          d: LOVE_HEART,
          color: ['#f472b6', '#ec4899', '#fb7185'][index],
          rot: Math.sin(phase * TAU + index) * 12,
          opacity: Math.sin(phase * Math.PI) * 0.95,
        };
      });
      return base({
        offY: sway * 0.018,
        sil: circle(1, { sy: 1 + sway * 0.012 }),
        gaze: { yaw: 5, pitch: 9, roll: sway * 3 - 3 },
        split: 17,
        eyes: [
          { w: 0.27, h: 0.17, tilt: 14, open: 1 },
          { w: 0.27, h: 0.17, tilt: -14, open: 1 },
        ],
        dots,
      });
    },
  },

  {
    /** Anger: a red comic vein mark accompanies a gently puffed-up body. */
    id: 'angry',
    duration: 2.4,
    minDuration: 1,
    morph: 0.35,
    blinkIn: true,
    baseFace: false,
    baseBody: true,
    pose: (t) => {
      const puff = (Math.sin((t / 1.2) * TAU) + 1) / 2;
      const tremble = Math.sin(t * TAU * 3) * 0.005;
      return base({
        offX: tremble,
        sil: circle(1, { sx: 1.015 + puff * 0.025, sy: 1 - puff * 0.012 }),
        gaze: { yaw: 3, pitch: 7, roll: tremble * 80 },
        split: 17,
        eyes: [
          { w: 0.34, h: 0.15, tilt: 30, open: 1 },
          { w: 0.34, h: 0.15, tilt: -30, open: 1 },
        ],
        dots: [
          {
            x: 0.26,
            y: -1.23 - puff * 0.015,
            r: 0.19,
            d: ANGER_MARK,
            color: '#ef4444',
            rot: Math.sin(t * TAU * 0.7) * 4,
            opacity: 0.88 + puff * 0.12,
          },
        ],
      });
    },
  },

  {
    /** Sadness: blue streaks stay under both eyes as fresh tears fall. */
    id: 'sad',
    duration: 3,
    minDuration: 1.2,
    morph: 0.4,
    blinkIn: false,
    baseFace: false,
    baseBody: true,
    pose: (t) => {
      const breath = Math.sin((t / 3) * TAU);
      const dots = ([0, 1] as const).flatMap((eye) => {
        const phase = (((t / 1.5 + eye * 0.45) % 1) + 1) % 1;
        return [
          {
            eye,
            x: 0,
            y: 0.12,
            r: 0.045,
            d: TEAR_STREAK,
            color: '#38bdf8',
            opacity: 0.82 + Math.sin(t * TAU + eye) * 0.07,
          },
          {
            eye,
            x: -0.012,
            y: 0.135,
            r: 0.014,
            d: TEAR_HIGHLIGHT,
            color: '#bae6fd',
            opacity: 0.72,
          },
          {
            eye,
            x: 0,
            y: 0.5 + phase * 0.18,
            r: 0.052,
            d: TEAR_DROP,
            color: '#38bdf8',
            opacity: Math.sin(phase * Math.PI) * 0.95,
          },
        ];
      });
      return base({
        offY: breath * 0.015,
        sil: circle(1, { sx: 1.01, sy: 0.99 + breath * 0.01 }),
        gaze: { yaw: 3, pitch: -12, roll: breath * 2 },
        split: 16,
        eyes: [
          { w: 0.22, h: 0.38, tilt: -28, open: 1 },
          { w: 0.22, h: 0.38, tilt: 28, open: 1 },
        ],
        dots,
      });
    },
  },
];

export const STATE_BY_ID = new Map(STATES.map((s) => [s.id, s]));

/** Ordre de lecture de la sequence complete, calque sur la video de reference. */
/**
 * Date, en temps local, ou chaque etat est le plus lisible : c'est la pose que
 * montrent les vignettes et la planche. Rendu deterministe, donc comparable
 * d'une execution a l'autre. Le type force a couvrir tout nouvel etat.
 */
export const POSES: Record<StateId, number> = {
  idle: 1,
  thinking: 1.1,
  wink: 0.8,
  wide: 0.8,
  alert: 0.75,
  notify: 0.9,
  exclaim: 0.8,
  sleep: 0.45,
  egg: 0.8,
  hexagon: 0.8,
  play: 0.9,
  orbit: 1.2,
  swirl: 0.5,
  burst: 0.45,
  comet: 1.15,
  nod: 0.25,
  deny: 0.2,
  love: 0.7,
  angry: 0.8,
  sad: 0.8,
};

/**
 * Ordre de lecture de la sequence par defaut : d'abord les quatorze etats
 * releves sur la video, puis les cinq actions ajoutees pour la couche IA.
 *
 * C'est aussi la palette de la vue Animations et la liste blanche de relecture
 * des montages stockes (`cycles.ts`), donc tout etat du catalogue doit y figurer.
 */
export const SEQUENCE: StateId[] = [
  'idle',
  'thinking',
  'wink',
  'wide',
  'alert',
  'notify',
  'exclaim',
  'sleep',
  'egg',
  'hexagon',
  'play',
  'orbit',
  'burst',
  'comet',
  'nod',
  'deny',
  'love',
  'angry',
  'sad',
];
