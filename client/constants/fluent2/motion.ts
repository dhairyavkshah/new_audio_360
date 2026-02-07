import { Easing } from 'react-native-reanimated';

export const FluentDuration = {
  ultraFast: 50,
  faster: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 400,
  ultraSlow: 500,
} as const;

export const FluentCurve = {
  accelerateMid: Easing.bezier(0.7, 0, 1, 0.5),
  accelerateMax: Easing.bezier(1, 0, 1, 1),
  decelerateMid: Easing.bezier(0.1, 0.9, 0.2, 1),
  decelerateMax: Easing.bezier(0, 0, 0, 1),
  easeMax: Easing.bezier(0.8, 0, 0.2, 1),
  linear: Easing.linear,
  pointToPoint: Easing.bezier(0.55, 0.55, 0, 1),
} as const;

export const FluentEasingValues = {
  accelerateMid: { x1: 0.7, y1: 0, x2: 1, y2: 0.5 },
  accelerateMax: { x1: 1, y1: 0, x2: 1, y2: 1 },
  decelerateMid: { x1: 0.1, y1: 0.9, x2: 0.2, y2: 1 },
  decelerateMax: { x1: 0, y1: 0, x2: 0, y2: 1 },
  easeMax: { x1: 0.8, y1: 0, x2: 0.2, y2: 1 },
  pointToPoint: { x1: 0.55, y1: 0.55, x2: 0, y2: 1 },
} as const;

export const FluentSpring = {
  standard: {
    damping: 22,
    stiffness: 250,
    mass: 1,
  },
  gentle: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 200,
    mass: 1,
  },
  stiff: {
    damping: 25,
    stiffness: 300,
    mass: 1,
  },
} as const;

export type DurationToken = keyof typeof FluentDuration;
export type CurveToken = keyof typeof FluentCurve;
export type SpringToken = keyof typeof FluentSpring;
