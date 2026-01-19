type MediaLibraryEventType = 'songsChanged' | 'songRemoved' | 'songsAdded';

interface MediaLibraryEvent {
  type: MediaLibraryEventType;
  songIds?: string[];
  allSongIds: string[];
}

type EventListener = (event: MediaLibraryEvent) => void;

class MediaLibraryEventEmitter {
  private listeners: EventListener[] = [];

  subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(event: MediaLibraryEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[MediaLibraryEventEmitter] Listener error:', error);
      }
    });
  }

  emitSongsChanged(allSongIds: string[]): void {
    this.emit({ type: 'songsChanged', allSongIds });
  }

  emitSongRemoved(removedIds: string[], allSongIds: string[]): void {
    this.emit({ type: 'songRemoved', songIds: removedIds, allSongIds });
  }

  emitSongsAdded(addedIds: string[], allSongIds: string[]): void {
    this.emit({ type: 'songsAdded', songIds: addedIds, allSongIds });
  }
}

export const mediaLibraryEvents = new MediaLibraryEventEmitter();
export type { MediaLibraryEvent, MediaLibraryEventType };
