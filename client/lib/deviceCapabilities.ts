import { Platform, NativeModules } from 'react-native';

export interface DeviceMemoryInfo {
  totalRamMB: number;
  availableRamMB: number;
  isLowRamDevice: boolean;
  memoryClass: 'low' | 'medium' | 'high';
}

export interface DeviceCapabilities {
  memory: DeviceMemoryInfo;
  recommendedWaveformRate: number;
  enableAIUpscaling: boolean;
  enableHighQualityDSP: boolean;
  maxAlbumArtCacheSize: number;
  flatListWindowSize: number;
  flatListMaxToRenderPerBatch: number;
}

const LOW_RAM_THRESHOLD_MB = 3072;
const MEDIUM_RAM_THRESHOLD_MB = 6144;

let cachedCapabilities: DeviceCapabilities | null = null;

export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const memory = await getDeviceMemoryInfo();
  
  const capabilities: DeviceCapabilities = {
    memory,
    recommendedWaveformRate: getRecommendedWaveformRate(memory),
    enableAIUpscaling: shouldEnableAIUpscaling(memory),
    enableHighQualityDSP: shouldEnableHighQualityDSP(memory),
    maxAlbumArtCacheSize: getMaxAlbumArtCacheSize(memory),
    flatListWindowSize: getFlatListWindowSize(memory),
    flatListMaxToRenderPerBatch: getFlatListMaxToRenderPerBatch(memory),
  };

  cachedCapabilities = capabilities;
  console.log('[DeviceCapabilities] Detected:', {
    totalRamMB: memory.totalRamMB,
    memoryClass: memory.memoryClass,
    waveformRate: capabilities.recommendedWaveformRate,
    aiUpscaling: capabilities.enableAIUpscaling,
  });

  return capabilities;
}

async function getDeviceMemoryInfo(): Promise<DeviceMemoryInfo> {
  if (Platform.OS === 'android') {
    try {
      const { DeviceInfoModule } = NativeModules;
      if (DeviceInfoModule?.getMemoryInfo) {
        const info = await DeviceInfoModule.getMemoryInfo();
        return {
          totalRamMB: info.totalRamMB || 4096,
          availableRamMB: info.availableRamMB || 2048,
          isLowRamDevice: info.isLowRamDevice || false,
          memoryClass: getMemoryClass(info.totalRamMB || 4096),
        };
      }
    } catch (e) {
      console.warn('[DeviceCapabilities] Failed to get native memory info:', e);
    }
  }

  if (Platform.OS === 'web') {
    const nav = navigator as any;
    const deviceMemory = nav.deviceMemory;
    if (deviceMemory) {
      const totalRamMB = deviceMemory * 1024;
      return {
        totalRamMB,
        availableRamMB: totalRamMB / 2,
        isLowRamDevice: deviceMemory <= 2,
        memoryClass: getMemoryClass(totalRamMB),
      };
    }
  }

  return {
    totalRamMB: 4096,
    availableRamMB: 2048,
    isLowRamDevice: false,
    memoryClass: 'medium',
  };
}

function getMemoryClass(totalRamMB: number): 'low' | 'medium' | 'high' {
  if (totalRamMB < LOW_RAM_THRESHOLD_MB) return 'low';
  if (totalRamMB < MEDIUM_RAM_THRESHOLD_MB) return 'medium';
  return 'high';
}

function getRecommendedWaveformRate(memory: DeviceMemoryInfo): number {
  switch (memory.memoryClass) {
    case 'low': return 20;
    case 'medium': return 30;
    case 'high': return 60;
  }
}

function shouldEnableAIUpscaling(memory: DeviceMemoryInfo): boolean {
  return memory.memoryClass !== 'low' && memory.totalRamMB >= 4096;
}

function shouldEnableHighQualityDSP(memory: DeviceMemoryInfo): boolean {
  return memory.memoryClass !== 'low';
}

function getMaxAlbumArtCacheSize(memory: DeviceMemoryInfo): number {
  switch (memory.memoryClass) {
    case 'low': return 20;
    case 'medium': return 50;
    case 'high': return 100;
  }
}

function getFlatListWindowSize(memory: DeviceMemoryInfo): number {
  switch (memory.memoryClass) {
    case 'low': return 3;
    case 'medium': return 5;
    case 'high': return 10;
  }
}

function getFlatListMaxToRenderPerBatch(memory: DeviceMemoryInfo): number {
  switch (memory.memoryClass) {
    case 'low': return 5;
    case 'medium': return 8;
    case 'high': return 15;
  }
}

export function clearCapabilitiesCache(): void {
  cachedCapabilities = null;
}

export function getCapabilitiesSync(): DeviceCapabilities | null {
  return cachedCapabilities;
}
