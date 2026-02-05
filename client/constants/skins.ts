import { ThemeName } from './theme';

export type IconStyle = 'fluent' | 'winamp' | 'itunes' | 'ios' | 'windows' | 'zune' | 'material' | 'samsung' | 'poweramp' | 'minimal';

export type ButtonStyle = 'rounded' | 'pill' | 'square' | 'beveled' | 'flat' | 'glass' | 'chrome' | 'lcd' | 'aero';

export type SliderStyle = 'modern' | 'classic' | 'waveform' | 'lcd' | 'bar' | 'knob' | 'material' | 'ios';

export type CardStyle = 'elevated' | 'flat' | 'glass' | 'bordered' | 'beveled' | 'chrome' | 'aero' | 'lcd';

export type ProgressStyle = 'bar' | 'waveform' | 'lcd' | 'segments' | 'dots' | 'material' | 'ios';

export type EffectStyle = 'none' | 'glow' | 'glass' | 'shadow' | 'lcd' | 'chrome' | 'aero' | 'scanlines';

export interface IconPack {
  play: string;
  pause: string;
  stop: string;
  skipNext: string;
  skipPrevious: string;
  shuffle: string;
  repeat: string;
  repeatOnce: string;
  volumeHigh: string;
  volumeMedium: string;
  volumeLow: string;
  volumeMute: string;
  heart: string;
  heartOutline: string;
  queue: string;
  equalizer: string;
  settings: string;
  library: string;
  search: string;
  home: string;
  microphone: string;
  record: string;
  save: string;
  share: string;
  download: string;
  upload: string;
  close: string;
  back: string;
  menu: string;
  more: string;
  add: string;
  remove: string;
  edit: string;
  delete: string;
  check: string;
  chevronRight: string;
  chevronLeft: string;
  chevronDown: string;
  chevronUp: string;
  expand: string;
  collapse: string;
  album: string;
  artist: string;
  playlist: string;
  folder: string;
  music: string;
  headphones: string;
  speaker: string;
  waveform: string;
  effects: string;
  mix: string;
  // Tab bar icons
  tabListen: string;
  tabListenFocused: string;
  tabLibrary: string;
  tabLibraryFocused: string;
  tabSettings: string;
  tabSettingsFocused: string;
  tabRadio: string;
  tabRadioFocused: string;
  tabStudio: string;
  tabStudioFocused: string;
  tabDiscover: string;
  tabDiscoverFocused: string;
}

export interface ShapeTokens {
  borderRadiusNone: number;
  borderRadiusSm: number;
  borderRadiusMd: number;
  borderRadiusLg: number;
  borderRadiusXl: number;
  borderRadiusFull: number;
  buttonBorderRadius: number;
  cardBorderRadius: number;
  chipBorderRadius: number;
  inputBorderRadius: number;
  sliderTrackRadius: number;
  sliderThumbRadius: number;
  controlSize: number;
  controlSizeLg: number;
  borderWidth: number;
  borderWidthThick: number;
}

export interface ComponentStyles {
  buttonStyle: ButtonStyle;
  cardStyle: CardStyle;
  sliderStyle: SliderStyle;
  progressStyle: ProgressStyle;
  effectStyle: EffectStyle;
  useBevel: boolean;
  useGradient: boolean;
  useGlow: boolean;
  useShadow: boolean;
  useGlass: boolean;
  useScanlines: boolean;
  useLcdEffect: boolean;
  glowColor: string | null;
  glowIntensity: number;
  shadowIntensity: number;
}

export interface SkinDefinition {
  id: ThemeName;
  name: string;
  family: IconStyle;
  icons: IconPack;
  shapes: ShapeTokens;
  components: ComponentStyles;
  specialFeatures: {
    hasLcdDisplay: boolean;
    hasChromeFrame: boolean;
    hasAeroGlass: boolean;
    hasVisualizer: boolean;
    hasMetallicTexture: boolean;
  };
}

const fluentIcons: IconPack = {
  play: 'play',
  pause: 'pause',
  stop: 'stop',
  skipNext: 'skip-next',
  skipPrevious: 'skip-previous',
  shuffle: 'shuffle-variant',
  repeat: 'repeat',
  repeatOnce: 'repeat-once',
  volumeHigh: 'volume-high',
  volumeMedium: 'volume-medium',
  volumeLow: 'volume-low',
  volumeMute: 'volume-mute',
  heart: 'heart',
  heartOutline: 'heart-outline',
  queue: 'playlist-music',
  equalizer: 'equalizer',
  settings: 'cog',
  library: 'bookshelf',
  search: 'magnify',
  home: 'home',
  microphone: 'microphone',
  record: 'record-circle',
  save: 'content-save',
  share: 'share-variant',
  download: 'download',
  upload: 'upload',
  close: 'close',
  back: 'arrow-left',
  menu: 'menu',
  more: 'dots-vertical',
  add: 'plus',
  remove: 'minus',
  edit: 'pencil',
  delete: 'delete',
  check: 'check',
  chevronRight: 'chevron-right',
  chevronLeft: 'chevron-left',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
  expand: 'arrow-expand',
  collapse: 'arrow-collapse',
  album: 'album',
  artist: 'account-music',
  playlist: 'playlist-music',
  folder: 'folder-music',
  music: 'music-note',
  headphones: 'headphones',
  speaker: 'speaker',
  waveform: 'waveform',
  effects: 'tune-variant',
  mix: 'tune',
  tabListen: 'headphones',
  tabListenFocused: 'headphones',
  tabLibrary: 'folder-music-outline',
  tabLibraryFocused: 'folder-music',
  tabSettings: 'cog-outline',
  tabSettingsFocused: 'cog',
  tabRadio: 'radio-tower',
  tabRadioFocused: 'radio-tower',
  tabStudio: 'microphone-variant',
  tabStudioFocused: 'microphone',
  tabDiscover: 'compass-outline',
  tabDiscoverFocused: 'compass',
};

const winampIcons: IconPack = {
  ...fluentIcons,
  play: 'play',
  pause: 'pause',
  stop: 'stop-circle',
  skipNext: 'skip-forward',
  skipPrevious: 'skip-backward',
  shuffle: 'shuffle',
  repeat: 'repeat',
  repeatOnce: 'repeat-once',
  volumeHigh: 'volume-high',
  volumeMute: 'volume-off',
  equalizer: 'equalizer',
  queue: 'playlist-play',
  settings: 'cog-outline',
  library: 'folder-music',
  microphone: 'microphone-variant',
  record: 'radiobox-marked',
  waveform: 'waveform',
  effects: 'auto-fix',
  mix: 'tune',
  tabListen: 'music-note',
  tabListenFocused: 'music',
  tabLibrary: 'folder-outline',
  tabLibraryFocused: 'folder-music',
  tabSettings: 'cog-outline',
  tabSettingsFocused: 'cog',
  tabRadio: 'radio',
  tabRadioFocused: 'radio',
};

const itunesIcons: IconPack = {
  ...fluentIcons,
  play: 'play-circle',
  pause: 'pause-circle',
  stop: 'stop-circle',
  skipNext: 'skip-next-circle',
  skipPrevious: 'skip-previous-circle',
  shuffle: 'shuffle',
  repeat: 'repeat',
  heart: 'heart',
  heartOutline: 'heart-outline',
  queue: 'playlist-music-outline',
  equalizer: 'tune',
  settings: 'cog',
  library: 'music-box-multiple',
  search: 'magnify',
  microphone: 'microphone',
  effects: 'auto-fix',
  tabListen: 'play-circle-outline',
  tabListenFocused: 'play-circle',
  tabLibrary: 'music-box-multiple-outline',
  tabLibraryFocused: 'music-box-multiple',
  tabSettings: 'cog-outline',
  tabSettingsFocused: 'cog',
  tabRadio: 'radio-tower',
  tabRadioFocused: 'radio-tower',
};

const iosIcons: IconPack = {
  ...fluentIcons,
  play: 'play-circle-outline',
  pause: 'pause-circle-outline',
  skipNext: 'skip-next',
  skipPrevious: 'skip-previous',
  shuffle: 'shuffle-variant',
  repeat: 'repeat',
  volumeHigh: 'volume-high',
  volumeMute: 'volume-off',
  heart: 'heart',
  heartOutline: 'heart-outline',
  equalizer: 'tune-vertical',
  queue: 'format-list-bulleted',
  settings: 'cog-outline',
  library: 'bookshelf',
  search: 'magnify',
  back: 'chevron-left',
  more: 'dots-horizontal',
  microphone: 'microphone-outline',
  tabListen: 'play-circle-outline',
  tabListenFocused: 'play-circle',
  tabLibrary: 'music-box-outline',
  tabLibraryFocused: 'music-box',
  tabSettings: 'cog-outline',
  tabSettingsFocused: 'cog',
  tabRadio: 'radio-tower',
  tabRadioFocused: 'radio-tower',
};

const windowsIcons: IconPack = {
  ...fluentIcons,
  play: 'play',
  pause: 'pause',
  stop: 'stop',
  skipNext: 'skip-next',
  skipPrevious: 'skip-previous',
  shuffle: 'shuffle-variant',
  repeat: 'repeat',
  volumeHigh: 'volume-high',
  volumeMute: 'volume-mute',
  equalizer: 'chart-bar',
  queue: 'playlist-music',
  settings: 'cog',
  library: 'folder-music',
  search: 'magnify',
  microphone: 'microphone',
  waveform: 'chart-areaspline',
  tabListen: 'disc',
  tabListenFocused: 'disc',
  tabLibrary: 'library',
  tabLibraryFocused: 'library',
  tabSettings: 'cog-outline',
  tabSettingsFocused: 'cog',
  tabRadio: 'radio-tower',
  tabRadioFocused: 'radio-tower',
};

const zuneIcons: IconPack = {
  ...fluentIcons,
  play: 'play',
  pause: 'pause',
  stop: 'stop',
  skipNext: 'skip-forward',
  skipPrevious: 'skip-backward',
  shuffle: 'shuffle-variant',
  repeat: 'repeat',
  volumeHigh: 'volume-high',
  volumeMute: 'volume-off',
  heart: 'heart',
  heartOutline: 'heart-outline',
  equalizer: 'tune-vertical',
  queue: 'playlist-star',
  settings: 'menu',
  library: 'view-grid',
  search: 'magnify',
  back: 'arrow-left',
  tabListen: 'music',
  tabListenFocused: 'music-circle',
  tabLibrary: 'view-grid-outline',
  tabLibraryFocused: 'view-grid',
  tabSettings: 'menu',
  tabSettingsFocused: 'menu',
  tabRadio: 'radio',
  tabRadioFocused: 'radio',
};

const materialIcons: IconPack = {
  ...fluentIcons,
  play: 'play-circle',
  pause: 'pause-circle',
  stop: 'stop-circle',
  skipNext: 'skip-next',
  skipPrevious: 'skip-previous',
  shuffle: 'shuffle',
  repeat: 'repeat',
  volumeHigh: 'volume-high',
  volumeMute: 'volume-off',
  heart: 'heart',
  heartOutline: 'heart-outline',
  equalizer: 'equalizer',
  queue: 'playlist-music',
  settings: 'cog',
  library: 'folder-music',
  search: 'magnify',
  back: 'arrow-left',
  more: 'dots-vertical',
  microphone: 'microphone',
  tabListen: 'headphones',
  tabListenFocused: 'headphones',
  tabLibrary: 'library-outline',
  tabLibraryFocused: 'library',
  tabSettings: 'cog-outline',
  tabSettingsFocused: 'cog',
  tabRadio: 'radio',
  tabRadioFocused: 'radio',
};

const samsungIcons: IconPack = {
  ...fluentIcons,
  play: 'play-circle-outline',
  pause: 'pause-circle-outline',
  stop: 'stop-circle-outline',
  skipNext: 'skip-next',
  skipPrevious: 'skip-previous',
  shuffle: 'shuffle-variant',
  repeat: 'repeat',
  volumeHigh: 'volume-high',
  volumeMute: 'volume-off',
  heart: 'heart',
  heartOutline: 'heart-outline',
  equalizer: 'tune-vertical',
  queue: 'playlist-music',
  settings: 'cog-outline',
  library: 'bookshelf',
  search: 'magnify',
  microphone: 'microphone-variant',
  tabListen: 'music-note-outline',
  tabListenFocused: 'music-note',
  tabLibrary: 'folder-music-outline',
  tabLibraryFocused: 'folder-music',
  tabSettings: 'cog-outline',
  tabSettingsFocused: 'cog',
  tabRadio: 'radio-tower',
  tabRadioFocused: 'radio-tower',
};

const powerampIcons: IconPack = {
  ...fluentIcons,
  play: 'play',
  pause: 'pause',
  stop: 'stop',
  skipNext: 'skip-forward',
  skipPrevious: 'skip-backward',
  shuffle: 'shuffle',
  repeat: 'repeat',
  volumeHigh: 'speaker',
  volumeMute: 'speaker-off',
  heart: 'star',
  heartOutline: 'star-outline',
  equalizer: 'tune-vertical',
  queue: 'playlist-star',
  settings: 'tune',
  library: 'folder-music-outline',
  waveform: 'waveform',
  effects: 'auto-fix',
  mix: 'tune',
  tabListen: 'speaker',
  tabListenFocused: 'speaker',
  tabLibrary: 'folder-music-outline',
  tabLibraryFocused: 'folder-music',
  tabSettings: 'tune',
  tabSettingsFocused: 'tune',
  tabRadio: 'radio-tower',
  tabRadioFocused: 'radio-tower',
};

const minimalIcons: IconPack = {
  ...fluentIcons,
  play: 'play',
  pause: 'pause',
  stop: 'stop',
  skipNext: 'chevron-double-right',
  skipPrevious: 'chevron-double-left',
  shuffle: 'shuffle',
  repeat: 'sync',
  volumeHigh: 'volume-high',
  volumeMute: 'volume-off',
  heart: 'heart',
  heartOutline: 'heart-outline',
  equalizer: 'chart-bar',
  queue: 'format-list-bulleted',
  settings: 'dots-horizontal',
  library: 'view-grid-outline',
  search: 'magnify',
  back: 'chevron-left',
  more: 'dots-horizontal',
  tabListen: 'play',
  tabListenFocused: 'play',
  tabLibrary: 'view-grid-outline',
  tabLibraryFocused: 'view-grid',
  tabSettings: 'dots-horizontal',
  tabSettingsFocused: 'dots-horizontal',
  tabRadio: 'radio-tower',
  tabRadioFocused: 'radio-tower',
};

const iconPacks: Record<IconStyle, IconPack> = {
  fluent: fluentIcons,
  winamp: winampIcons,
  itunes: itunesIcons,
  ios: iosIcons,
  windows: windowsIcons,
  zune: zuneIcons,
  material: materialIcons,
  samsung: samsungIcons,
  poweramp: powerampIcons,
  minimal: minimalIcons,
};

const fluentShapes: ShapeTokens = {
  borderRadiusNone: 0,
  borderRadiusSm: 4,
  borderRadiusMd: 8,
  borderRadiusLg: 12,
  borderRadiusXl: 16,
  borderRadiusFull: 9999,
  buttonBorderRadius: 8,
  cardBorderRadius: 12,
  chipBorderRadius: 16,
  inputBorderRadius: 8,
  sliderTrackRadius: 4,
  sliderThumbRadius: 10,
  controlSize: 44,
  controlSizeLg: 56,
  borderWidth: 1,
  borderWidthThick: 2,
};

const winampShapes: ShapeTokens = {
  borderRadiusNone: 0,
  borderRadiusSm: 0,
  borderRadiusMd: 2,
  borderRadiusLg: 2,
  borderRadiusXl: 4,
  borderRadiusFull: 9999,
  buttonBorderRadius: 2,
  cardBorderRadius: 0,
  chipBorderRadius: 2,
  inputBorderRadius: 0,
  sliderTrackRadius: 0,
  sliderThumbRadius: 2,
  controlSize: 44,
  controlSizeLg: 56,
  borderWidth: 1,
  borderWidthThick: 2,
};

const itunesShapes: ShapeTokens = {
  borderRadiusNone: 0,
  borderRadiusSm: 4,
  borderRadiusMd: 6,
  borderRadiusLg: 8,
  borderRadiusXl: 12,
  borderRadiusFull: 9999,
  buttonBorderRadius: 6,
  cardBorderRadius: 8,
  chipBorderRadius: 12,
  inputBorderRadius: 6,
  sliderTrackRadius: 3,
  sliderThumbRadius: 8,
  controlSize: 44,
  controlSizeLg: 56,
  borderWidth: 1,
  borderWidthThick: 2,
};

const iosShapes: ShapeTokens = {
  borderRadiusNone: 0,
  borderRadiusSm: 6,
  borderRadiusMd: 10,
  borderRadiusLg: 14,
  borderRadiusXl: 20,
  borderRadiusFull: 9999,
  buttonBorderRadius: 10,
  cardBorderRadius: 14,
  chipBorderRadius: 20,
  inputBorderRadius: 10,
  sliderTrackRadius: 3,
  sliderThumbRadius: 14,
  controlSize: 44,
  controlSizeLg: 60,
  borderWidth: 0.5,
  borderWidthThick: 1,
};

const windowsShapes: ShapeTokens = {
  borderRadiusNone: 0,
  borderRadiusSm: 2,
  borderRadiusMd: 4,
  borderRadiusLg: 6,
  borderRadiusXl: 8,
  borderRadiusFull: 9999,
  buttonBorderRadius: 4,
  cardBorderRadius: 4,
  chipBorderRadius: 4,
  inputBorderRadius: 4,
  sliderTrackRadius: 2,
  sliderThumbRadius: 6,
  controlSize: 44,
  controlSizeLg: 56,
  borderWidth: 1,
  borderWidthThick: 2,
};

const zuneShapes: ShapeTokens = {
  borderRadiusNone: 0,
  borderRadiusSm: 0,
  borderRadiusMd: 0,
  borderRadiusLg: 2,
  borderRadiusXl: 4,
  borderRadiusFull: 9999,
  buttonBorderRadius: 0,
  cardBorderRadius: 0,
  chipBorderRadius: 2,
  inputBorderRadius: 0,
  sliderTrackRadius: 0,
  sliderThumbRadius: 4,
  controlSize: 48,
  controlSizeLg: 64,
  borderWidth: 0,
  borderWidthThick: 2,
};

const materialShapes: ShapeTokens = {
  borderRadiusNone: 0,
  borderRadiusSm: 4,
  borderRadiusMd: 8,
  borderRadiusLg: 12,
  borderRadiusXl: 16,
  borderRadiusFull: 9999,
  buttonBorderRadius: 20,
  cardBorderRadius: 12,
  chipBorderRadius: 8,
  inputBorderRadius: 4,
  sliderTrackRadius: 4,
  sliderThumbRadius: 12,
  controlSize: 48,
  controlSizeLg: 56,
  borderWidth: 1,
  borderWidthThick: 2,
};

const samsungShapes: ShapeTokens = {
  borderRadiusNone: 0,
  borderRadiusSm: 8,
  borderRadiusMd: 12,
  borderRadiusLg: 16,
  borderRadiusXl: 24,
  borderRadiusFull: 9999,
  buttonBorderRadius: 24,
  cardBorderRadius: 16,
  chipBorderRadius: 20,
  inputBorderRadius: 12,
  sliderTrackRadius: 4,
  sliderThumbRadius: 12,
  controlSize: 48,
  controlSizeLg: 56,
  borderWidth: 1,
  borderWidthThick: 2,
};

const powerampShapes: ShapeTokens = {
  borderRadiusNone: 0,
  borderRadiusSm: 4,
  borderRadiusMd: 8,
  borderRadiusLg: 12,
  borderRadiusXl: 16,
  borderRadiusFull: 9999,
  buttonBorderRadius: 8,
  cardBorderRadius: 8,
  chipBorderRadius: 16,
  inputBorderRadius: 8,
  sliderTrackRadius: 4,
  sliderThumbRadius: 10,
  controlSize: 56,
  controlSizeLg: 72,
  borderWidth: 1,
  borderWidthThick: 2,
};

const minimalShapes: ShapeTokens = {
  borderRadiusNone: 0,
  borderRadiusSm: 0,
  borderRadiusMd: 0,
  borderRadiusLg: 0,
  borderRadiusXl: 0,
  borderRadiusFull: 9999,
  buttonBorderRadius: 0,
  cardBorderRadius: 0,
  chipBorderRadius: 0,
  inputBorderRadius: 0,
  sliderTrackRadius: 0,
  sliderThumbRadius: 0,
  controlSize: 44,
  controlSizeLg: 56,
  borderWidth: 1,
  borderWidthThick: 2,
};

const shapePacks: Record<IconStyle, ShapeTokens> = {
  fluent: fluentShapes,
  winamp: winampShapes,
  itunes: itunesShapes,
  ios: iosShapes,
  windows: windowsShapes,
  zune: zuneShapes,
  material: materialShapes,
  samsung: samsungShapes,
  poweramp: powerampShapes,
  minimal: minimalShapes,
};

function createComponentStyles(
  family: IconStyle,
  overrides?: Partial<ComponentStyles>
): ComponentStyles {
  const baseStyles: Record<IconStyle, ComponentStyles> = {
    fluent: {
      buttonStyle: 'rounded',
      cardStyle: 'elevated',
      sliderStyle: 'modern',
      progressStyle: 'waveform',
      effectStyle: 'shadow',
      useBevel: false,
      useGradient: false,
      useGlow: false,
      useShadow: true,
      useGlass: false,
      useScanlines: false,
      useLcdEffect: false,
      glowColor: null,
      glowIntensity: 0,
      shadowIntensity: 0.1,
    },
    winamp: {
      buttonStyle: 'beveled',
      cardStyle: 'beveled',
      sliderStyle: 'lcd',
      progressStyle: 'lcd',
      effectStyle: 'lcd',
      useBevel: true,
      useGradient: false,
      useGlow: true,
      useShadow: false,
      useGlass: false,
      useScanlines: true,
      useLcdEffect: true,
      glowColor: '#00FF00',
      glowIntensity: 0.8,
      shadowIntensity: 0,
    },
    itunes: {
      buttonStyle: 'chrome',
      cardStyle: 'chrome',
      sliderStyle: 'ios',
      progressStyle: 'bar',
      effectStyle: 'chrome',
      useBevel: false,
      useGradient: true,
      useGlow: false,
      useShadow: true,
      useGlass: false,
      useScanlines: false,
      useLcdEffect: false,
      glowColor: null,
      glowIntensity: 0,
      shadowIntensity: 0.2,
    },
    ios: {
      buttonStyle: 'glass',
      cardStyle: 'glass',
      sliderStyle: 'ios',
      progressStyle: 'ios',
      effectStyle: 'glass',
      useBevel: false,
      useGradient: false,
      useGlow: false,
      useShadow: false,
      useGlass: true,
      useScanlines: false,
      useLcdEffect: false,
      glowColor: null,
      glowIntensity: 0,
      shadowIntensity: 0,
    },
    windows: {
      buttonStyle: 'aero',
      cardStyle: 'aero',
      sliderStyle: 'bar',
      progressStyle: 'segments',
      effectStyle: 'aero',
      useBevel: false,
      useGradient: true,
      useGlow: true,
      useShadow: true,
      useGlass: true,
      useScanlines: false,
      useLcdEffect: false,
      glowColor: '#6EB5FF',
      glowIntensity: 0.4,
      shadowIntensity: 0.15,
    },
    zune: {
      buttonStyle: 'flat',
      cardStyle: 'flat',
      sliderStyle: 'bar',
      progressStyle: 'bar',
      effectStyle: 'none',
      useBevel: false,
      useGradient: false,
      useGlow: false,
      useShadow: false,
      useGlass: false,
      useScanlines: false,
      useLcdEffect: false,
      glowColor: null,
      glowIntensity: 0,
      shadowIntensity: 0,
    },
    material: {
      buttonStyle: 'rounded',
      cardStyle: 'elevated',
      sliderStyle: 'material',
      progressStyle: 'material',
      effectStyle: 'shadow',
      useBevel: false,
      useGradient: false,
      useGlow: false,
      useShadow: true,
      useGlass: false,
      useScanlines: false,
      useLcdEffect: false,
      glowColor: null,
      glowIntensity: 0,
      shadowIntensity: 0.12,
    },
    samsung: {
      buttonStyle: 'pill',
      cardStyle: 'elevated',
      sliderStyle: 'material',
      progressStyle: 'bar',
      effectStyle: 'shadow',
      useBevel: false,
      useGradient: false,
      useGlow: false,
      useShadow: true,
      useGlass: false,
      useScanlines: false,
      useLcdEffect: false,
      glowColor: null,
      glowIntensity: 0,
      shadowIntensity: 0.1,
    },
    poweramp: {
      buttonStyle: 'rounded',
      cardStyle: 'flat',
      sliderStyle: 'knob',
      progressStyle: 'waveform',
      effectStyle: 'glow',
      useBevel: false,
      useGradient: true,
      useGlow: true,
      useShadow: false,
      useGlass: false,
      useScanlines: false,
      useLcdEffect: false,
      glowColor: '#FF6600',
      glowIntensity: 0.6,
      shadowIntensity: 0,
    },
    minimal: {
      buttonStyle: 'flat',
      cardStyle: 'flat',
      sliderStyle: 'bar',
      progressStyle: 'bar',
      effectStyle: 'none',
      useBevel: false,
      useGradient: false,
      useGlow: false,
      useShadow: false,
      useGlass: false,
      useScanlines: false,
      useLcdEffect: false,
      glowColor: null,
      glowIntensity: 0,
      shadowIntensity: 0,
    },
  };
  return { ...baseStyles[family], ...overrides };
}

function createSkin(
  id: ThemeName,
  name: string,
  family: IconStyle,
  componentOverrides?: Partial<ComponentStyles>,
  specialFeatures?: Partial<SkinDefinition['specialFeatures']>
): SkinDefinition {
  return {
    id,
    name,
    family,
    icons: iconPacks[family],
    shapes: shapePacks[family],
    components: createComponentStyles(family, componentOverrides),
    specialFeatures: {
      hasLcdDisplay: family === 'winamp',
      hasChromeFrame: family === 'itunes' || family === 'windows',
      hasAeroGlass: family === 'windows',
      hasVisualizer: family === 'winamp' || family === 'poweramp',
      hasMetallicTexture: family === 'itunes',
      ...specialFeatures,
    },
  };
}

export const skinDefinitions: Record<ThemeName, SkinDefinition> = {
  fluent: createSkin('fluent', 'Fluent Light', 'fluent'),
  fluentDark: createSkin('fluentDark', 'Fluent Dark', 'fluent'),
  nightAmoled: createSkin('nightAmoled', 'Night AMOLED', 'fluent', { useGlow: false }),
  warmNeutral: createSkin('warmNeutral', 'Warm Neutral', 'fluent'),
  coolBlue: createSkin('coolBlue', 'Cool Blue', 'fluent'),
  winampClassic: createSkin('winampClassic', 'Winamp Classic', 'winamp', { glowColor: '#00FF00' }),
  winampModern: createSkin('winampModern', 'Winamp Modern', 'winamp', { glowColor: '#FF6600' }),
  bento: createSkin('bento', 'Bento', 'winamp', { glowColor: '#4A90D9', useScanlines: false }),
  bigBento: createSkin('bigBento', 'Big Bento', 'winamp', { glowColor: '#5C9CE6', useScanlines: false }),
  mmd3: createSkin('mmd3', 'MMD3', 'winamp', { glowColor: '#00BFFF' }),
  topaz: createSkin('topaz', 'Topaz', 'winamp', { glowColor: '#FFD700' }),
  retroPixel: createSkin('retroPixel', 'Retro Pixel', 'winamp', { glowColor: '#00FF00', useScanlines: true }),
  alienGreen: createSkin('alienGreen', 'Alien Green', 'winamp', { glowColor: '#39FF14' }),
  bubblegumPink: createSkin('bubblegumPink', 'Bubblegum Pink', 'winamp', { glowColor: '#FF77AA' }),
  milkdrop: createSkin('milkdrop', 'Milkdrop', 'winamp', { glowColor: '#FF00FF' }, { hasVisualizer: true }),
  itunesClassic: createSkin('itunesClassic', 'iTunes Classic', 'itunes'),
  itunesBrushedMetal: createSkin('itunesBrushedMetal', 'iTunes Brushed Metal', 'itunes', {}, { hasMetallicTexture: true }),
  itunesAqua: createSkin('itunesAqua', 'iTunes Aqua', 'itunes', { glowColor: '#007AFF', useGlow: true }),
  iosWhite: createSkin('iosWhite', 'iOS White', 'ios'),
  iosDark: createSkin('iosDark', 'iOS Dark', 'ios'),
  iosMinimal: createSkin('iosMinimal', 'iOS Minimal', 'minimal'),
  frostedGlass: createSkin('frostedGlass', 'Frosted Glass', 'ios', { useGlass: true }),
  wmpClassic: createSkin('wmpClassic', 'WMP Classic', 'windows', {}, { hasAeroGlass: false }),
  wmpBlue: createSkin('wmpBlue', 'WMP Blue', 'windows', { glowColor: '#0078D4' }),
  wmpSilver: createSkin('wmpSilver', 'WMP Silver', 'windows', { glowColor: '#A0A0A0' }),
  vistaAero: createSkin('vistaAero', 'Vista Aero', 'windows', {}, { hasAeroGlass: true }),
  aeroGlass: createSkin('aeroGlass', 'Aero Glass', 'windows', { useGlass: true }, { hasAeroGlass: true }),
  vistaBlack: createSkin('vistaBlack', 'Vista Black', 'windows', { glowColor: '#6EB5FF' }),
  zuneDark: createSkin('zuneDark', 'Zune Dark', 'zune'),
  zuneBrown: createSkin('zuneBrown', 'Zune Brown', 'zune'),
  zuneRed: createSkin('zuneRed', 'Zune Red', 'zune'),
  materialLight: createSkin('materialLight', 'Material Light', 'material'),
  materialDark: createSkin('materialDark', 'Material Dark', 'material'),
  materialYou: createSkin('materialYou', 'Material You', 'material', { useGradient: true }),
  holoLight: createSkin('holoLight', 'Holo Light', 'material', { glowColor: '#33B5E5', useGlow: true }),
  holoDark: createSkin('holoDark', 'Holo Dark', 'material', { glowColor: '#33B5E5', useGlow: true }),
  kitkatMusic: createSkin('kitkatMusic', 'KitKat Music', 'material'),
  jellyBeanMusic: createSkin('jellyBeanMusic', 'Jelly Bean Music', 'material', { glowColor: '#33B5E5', useGlow: true }),
  samsungTouchWiz: createSkin('samsungTouchWiz', 'Samsung TouchWiz', 'samsung'),
  samsungNatureUX: createSkin('samsungNatureUX', 'Samsung Nature UX', 'samsung'),
  samsungGraceUX: createSkin('samsungGraceUX', 'Samsung Grace UX', 'samsung'),
  samsungOneUI: createSkin('samsungOneUI', 'Samsung One UI', 'samsung'),
  samsungAmoled: createSkin('samsungAmoled', 'Samsung AMOLED', 'samsung'),
  powerampDark: createSkin('powerampDark', 'Poweramp Dark', 'poweramp'),
  powerampFlat: createSkin('powerampFlat', 'Poweramp Flat', 'poweramp', { buttonStyle: 'flat', cardStyle: 'flat' }),
  powerampTransparent: createSkin('powerampTransparent', 'Poweramp Transparent', 'poweramp', { useGlass: true, glowColor: '#FF77AA' }),
  blackplayerDark: createSkin('blackplayerDark', 'BlackPlayer Dark', 'minimal'),
  blackplayerAmoled: createSkin('blackplayerAmoled', 'BlackPlayer AMOLED', 'minimal'),
  phonographMaterial: createSkin('phonographMaterial', 'Phonograph Material', 'material'),
  amoledBlack: createSkin('amoledBlack', 'AMOLED Black', 'minimal'),
  darkGlass: createSkin('darkGlass', 'Dark Glass', 'ios', { useGlass: true }),
  carbonFiber: createSkin('carbonFiber', 'Carbon Fiber', 'minimal', {}, { hasMetallicTexture: true }),
  silverMetallic: createSkin('silverMetallic', 'Silver Metallic', 'itunes', {}, { hasMetallicTexture: true }),
  midnight: createSkin('midnight', 'Midnight', 'fluent', { useGlow: true, glowColor: '#8B5CF6' }),
  minimalMono: createSkin('minimalMono', 'Minimal Mono', 'minimal'),
};

export function getSkin(themeName: ThemeName): SkinDefinition {
  const skin = skinDefinitions[themeName];
  if (skin) {
    return skin;
  }
  return skinDefinitions.fluent;
}

export function getFluentDefaults(): { icons: IconPack; shapes: ShapeTokens; components: ComponentStyles } {
  const fluentComponents: ComponentStyles = {
    buttonStyle: 'rounded',
    cardStyle: 'elevated',
    sliderStyle: 'modern',
    progressStyle: 'waveform',
    effectStyle: 'shadow',
    useBevel: false,
    useGradient: false,
    useGlow: false,
    useShadow: true,
    useGlass: false,
    useScanlines: false,
    useLcdEffect: false,
    glowColor: null,
    glowIntensity: 0,
    shadowIntensity: 0.1,
  };

  return {
    icons: fluentIcons,
    shapes: fluentShapes,
    components: fluentComponents,
  };
}
