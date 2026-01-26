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

type ProgressCallback = (progress: ScanProgress) => void;

const SUPPORTED_AUDIO_EXTENSIONS = [
  '.mp3', '.m4a', '.aac', '.flac', '.wav', '.ogg', '.wma', '.opus', '.aiff', '.alac'
];

const isAudioFile = (name: string): boolean => {
  const lowerName = name.toLowerCase();
  return SUPPORTED_AUDIO_EXTENSIONS.some(ext => lowerName.endsWith(ext));
};

const getMimeType = (name: string): string => {
  const ext = name.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'wma': 'audio/x-ms-wma',
    'opus': 'audio/opus',
    'aiff': 'audio/aiff',
    'alac': 'audio/mp4'
  };
  return mimeTypes[ext || ''] || 'audio/mpeg';
};

export class WindowsFolderScanner {
  private directoryHandle: FileSystemDirectoryHandle | null = null;
  private audioFiles: WindowsAudioFile[] = [];
  private isScanning = false;

  async isSupported(): Promise<boolean> {
    return 'showDirectoryPicker' in window;
  }

  async requestMusicFolderAccess(): Promise<boolean> {
    try {
      if (!await this.isSupported()) {
        console.warn('File System Access API not supported');
        return false;
      }

      this.directoryHandle = await (window as any).showDirectoryPicker({
        id: 'music-folder',
        mode: 'read',
        startIn: 'music'
      });

      return true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return false;
      }
      console.error('Failed to access folder:', error);
      return false;
    }
  }

  async scanMusicFolder(onProgress?: ProgressCallback): Promise<WindowsAudioFile[]> {
    if (!this.directoryHandle) {
      throw new Error('No folder access granted. Call requestMusicFolderAccess first.');
    }

    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    this.isScanning = true;
    this.audioFiles = [];

    try {
      await this.scanDirectory(this.directoryHandle, '', onProgress);
      return this.audioFiles;
    } finally {
      this.isScanning = false;
    }
  }

  private async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    path: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const currentPath = path ? `${path}/${dirHandle.name}` : dirHandle.name;

    if (onProgress) {
      onProgress({
        scanned: this.audioFiles.length,
        found: this.audioFiles.length,
        currentFolder: currentPath
      });
    }

    try {
      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === 'file') {
          const fileHandle = entry as FileSystemFileHandle;
          if (isAudioFile(fileHandle.name)) {
            try {
              const file = await fileHandle.getFile();
              this.audioFiles.push({
                name: fileHandle.name,
                path: `${currentPath}/${fileHandle.name}`,
                size: file.size,
                lastModified: file.lastModified,
                handle: fileHandle,
                type: getMimeType(fileHandle.name)
              });

              if (onProgress && this.audioFiles.length % 10 === 0) {
                onProgress({
                  scanned: this.audioFiles.length,
                  found: this.audioFiles.length,
                  currentFolder: currentPath
                });
              }
            } catch (e) {
              console.warn(`Could not read file: ${fileHandle.name}`, e);
            }
          }
        } else if (entry.kind === 'directory') {
          const subDirHandle = entry as FileSystemDirectoryHandle;
          if (!subDirHandle.name.startsWith('.')) {
            await this.scanDirectory(subDirHandle, currentPath, onProgress);
          }
        }
      }
    } catch (error) {
      console.warn(`Could not scan directory: ${currentPath}`, error);
    }
  }

  async getFileBlob(fileHandle: FileSystemFileHandle): Promise<Blob> {
    const file = await fileHandle.getFile();
    return file;
  }

  async getFileUrl(fileHandle: FileSystemFileHandle): Promise<string> {
    const file = await fileHandle.getFile();
    return URL.createObjectURL(file);
  }

  async revokeFileUrl(url: string): Promise<void> {
    URL.revokeObjectURL(url);
  }

  getScannedFiles(): WindowsAudioFile[] {
    return [...this.audioFiles];
  }

  hasAccess(): boolean {
    return this.directoryHandle !== null;
  }

  async verifyPermission(): Promise<boolean> {
    if (!this.directoryHandle) {
      return false;
    }

    try {
      const permission = await (this.directoryHandle as any).queryPermission({ mode: 'read' });
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  async requestPermissionIfNeeded(): Promise<boolean> {
    if (!this.directoryHandle) {
      return false;
    }

    try {
      const permission = await (this.directoryHandle as any).requestPermission({ mode: 'read' });
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  clearCache(): void {
    this.audioFiles = [];
    this.directoryHandle = null;
  }
}

export const windowsFolderScanner = new WindowsFolderScanner();

export type { WindowsAudioFile, ScanProgress };
