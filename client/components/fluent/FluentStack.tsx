import React from 'react';
import { View, ViewProps, StyleSheet, StyleProp, ViewStyle, FlexAlignType } from 'react-native';
import { FluentGap, FluentPadding, GapToken, PaddingToken } from '@/constants/fluent2';

type Direction = 'horizontal' | 'vertical';
type Alignment = 'start' | 'center' | 'end' | 'stretch';
type JustifyContent = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export interface FluentStackProps extends ViewProps {
  direction?: Direction;
  gap?: GapToken | number;
  align?: Alignment;
  justify?: JustifyContent;
  padding?: PaddingToken | number;
  paddingHorizontal?: PaddingToken | number;
  paddingVertical?: PaddingToken | number;
  wrap?: boolean;
  fill?: boolean;
  children?: React.ReactNode;
}

const alignmentMap: Record<Alignment, FlexAlignType> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const justifyContentMap: Record<JustifyContent, 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

const resolveSpacing = (value: GapToken | PaddingToken | number | undefined, tokens: Record<string, number>): number | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  return tokens[value];
};

export function FluentStack({
  direction = 'vertical',
  gap,
  align = 'stretch',
  justify = 'start',
  padding,
  paddingHorizontal,
  paddingVertical,
  wrap = false,
  fill = false,
  style,
  children,
  ...props
}: FluentStackProps) {
  const resolvedGap = resolveSpacing(gap, FluentGap);
  const resolvedPadding = resolveSpacing(padding, FluentPadding);
  const resolvedPaddingH = resolveSpacing(paddingHorizontal, FluentPadding);
  const resolvedPaddingV = resolveSpacing(paddingVertical, FluentPadding);

  const containerStyle: StyleProp<ViewStyle> = [
    {
      flexDirection: direction === 'horizontal' ? 'row' : 'column',
      alignItems: alignmentMap[align],
      justifyContent: justifyContentMap[justify],
      gap: resolvedGap,
      padding: resolvedPadding,
      paddingHorizontal: resolvedPaddingH,
      paddingVertical: resolvedPaddingV,
      flexWrap: wrap ? 'wrap' : 'nowrap',
    },
    fill && { flex: 1 },
    style,
  ];

  return (
    <View style={containerStyle} {...props}>
      {children}
    </View>
  );
}

export default FluentStack;
