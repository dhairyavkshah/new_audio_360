export const FluentRadius = {
  none: 0,
  small: 2,
  medium: 4,
  large: 8,
  xLarge: 12,
  xxLarge: 16,
  xxxLarge: 20,
  circular: 9999,
} as const;

export const FluentControlRadius = {
  button: 8,
  input: 8,
  checkbox: 2,
  chip: 8,
  card: 12,
  dialog: 16,
  bottomSheet: 20,
  fab: 28,
  heroCard: 20,
  avatar: 9999,
  popover: 12,
} as const;

export type RadiusToken = keyof typeof FluentRadius;
export type ControlRadiusToken = keyof typeof FluentControlRadius;
