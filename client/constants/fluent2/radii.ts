export const FluentRadius = {
  none: 0,
  small: 2,
  medium: 4,
  large: 8,
  xLarge: 12,
  circular: 9999,
} as const;

export const FluentControlRadius = {
  button: 4,
  input: 4,
  checkbox: 2,
  chip: 4,
  card: 8,
  dialog: 12,
  bottomSheet: 16,
  fab: 16,
  avatar: 9999,
} as const;

export type RadiusToken = keyof typeof FluentRadius;
export type ControlRadiusToken = keyof typeof FluentControlRadius;
