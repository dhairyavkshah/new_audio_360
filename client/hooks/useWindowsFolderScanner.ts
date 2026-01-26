import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

interface WindowsAudioFile {
  name: string;
  path: string;
  size: number;
  lastModified: number;
  handle: FileSystemFileHandle;
  type: string;
}

interface ScanProgress {
  scanned: number;
  found: number;
  currentFolder: string;
}

interface UseWindowsFolderScannerResult {
  isSupported: boolean;
  isScanning: boolean;
  hasAccess: boolean;
  progress: ScanProgress | null;
  files: WindowsAudioFile[];
  error: string | null;
  requestAccess: () => Promise<boolean>;
  scanFolder: () => Promise<WindowsAudioFile[]>;
  getFileUrl: (file: WindowsAudioFile) => Promise<string>;
  revokeFileUrl: (url: string) => void;
  clearFiles: () => void;
}

export function useWindowsFolderScanner(): UseWindowsFolderScannerResult {
  const [isScanning, setIsScanning] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [files, setFiles] = useState<WindowsAudioFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scanner, setScanner] = useState<any>(null);

  const isSupported = Platform.OS === 'web' && typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  const initScanner = useCallback(async () => {
    if (!isSupported || scanner) return scanner;
    
    try {
      const { windowsFolderScanner } = await import('../services/WindowsFolderScanner');
      setScanner(windowsFolderScanner);
      return windowsFolderScanner;
    } catch (e) {
      console.error('Failed to load WindowsFolderScanner:', e);
      return null;
    }
  }, [isSupported, scanner]);

  const requestAccess = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('File System Access API not supported');
      return false;
    }

    setError(null);
    
    try {
      const scannerInstance = await initScanner();
      if (!scannerInstance) {
        setError('Failed to initialize folder scanner');
        return false;
      }

      const granted = await scannerInstance.requestMusicFolderAccess();
      setHasAccess(granted);
      
      if (!granted) {
        setError('Folder access denied or cancelled');
      }
      
      return granted;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(message);
      return false;
    }
  }, [isSupported, initScanner]);

  const scanFolder = useCallback(async (): Promise<WindowsAudioFile[]> => {
    if (!isSupported) {
      setError('File System Access API not supported');
      return [];
    }

    if (!hasAccess) {
      const granted = await requestAccess();
      if (!granted) return [];
    }

    setIsScanning(true);
    setError(null);
    setProgress({ scanned: 0, found: 0, currentFolder: '' });

    try {
      const scannerInstance = await initScanner();
      if (!scannerInstance) {
        setError('Failed to initialize folder scanner');
        return [];
      }

      const scannedFiles = await scannerInstance.scanMusicFolder((prog: ScanProgress) => {
        setProgress(prog);
      });

      setFiles(scannedFiles);
      return scannedFiles;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(message);
      return [];
    } finally {
      setIsScanning(false);
    }
  }, [isSupported, hasAccess, requestAccess, initScanner]);

  const getFileUrl = useCallback(async (file: WindowsAudioFile): Promise<string> => {
    try {
      const scannerInstance = await initScanner();
      if (!scannerInstance) throw new Error('Scanner not initialized');
      return await scannerInstance.getFileUrl(file.handle);
    } catch (e) {
      console.error('Failed to get file URL:', e);
      throw e;
    }
  }, [initScanner]);

  const revokeFileUrl = useCallback((url: string): void => {
    URL.revokeObjectURL(url);
  }, []);

  const clearFiles = useCallback((): void => {
    setFiles([]);
    setProgress(null);
    setError(null);
  }, []);

  return {
    isSupported,
    isScanning,
    hasAccess,
    progress,
    files,
    error,
    requestAccess,
    scanFolder,
    getFileUrl,
    revokeFileUrl,
    clearFiles
  };
}

export type { WindowsAudioFile, ScanProgress };
