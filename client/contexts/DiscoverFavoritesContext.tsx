import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import SoundCloudService from '@/services/SoundCloudService';
import ArchiveOrgService from '@/services/ArchiveOrgService';
import { SoundCloudTrack, StoredSoundCloudTrack } from '@/services/SoundCloudService';
import { ArchiveOrgTrack, StoredArchiveTrack } from '@/services/ArchiveOrgService';

interface DiscoverFavoritesContextType {
  soundCloudFavoriteIds: Set<string>;
  archiveFavoriteIds: Set<string>;
  isSoundCloudFavorite: (trackId: string) => boolean;
  isArchiveFavorite: (trackId: string) => boolean;
  toggleSoundCloudFavorite: (track: SoundCloudTrack) => Promise<boolean>;
  toggleArchiveFavorite: (track: ArchiveOrgTrack) => Promise<boolean>;
  refreshSoundCloudFavorites: () => Promise<void>;
  refreshArchiveFavorites: () => Promise<void>;
  isLoading: boolean;
}

const DiscoverFavoritesContext = createContext<DiscoverFavoritesContextType | undefined>(undefined);

export function DiscoverFavoritesProvider({ children }: { children: ReactNode }) {
  const [soundCloudFavoriteIds, setSoundCloudFavoriteIds] = useState<Set<string>>(new Set());
  const [archiveFavoriteIds, setArchiveFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const [scFavorites, archiveFavorites] = await Promise.all([
        SoundCloudService.getFavorites(),
        ArchiveOrgService.getFavorites(),
      ]);
      
      setSoundCloudFavoriteIds(new Set(scFavorites.map(f => f.id)));
      setArchiveFavoriteIds(new Set(archiveFavorites.map(f => f.id)));
    } catch (error) {
      console.error('[DiscoverFavoritesContext] Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const refreshSoundCloudFavorites = useCallback(async () => {
    try {
      const favorites = await SoundCloudService.getFavorites();
      setSoundCloudFavoriteIds(new Set(favorites.map(f => f.id)));
    } catch (error) {
      console.error('[DiscoverFavoritesContext] Failed to refresh SoundCloud favorites:', error);
    }
  }, []);

  const refreshArchiveFavorites = useCallback(async () => {
    try {
      const favorites = await ArchiveOrgService.getFavorites();
      setArchiveFavoriteIds(new Set(favorites.map(f => f.id)));
    } catch (error) {
      console.error('[DiscoverFavoritesContext] Failed to refresh Archive favorites:', error);
    }
  }, []);

  const isSoundCloudFavorite = useCallback((trackId: string) => {
    return soundCloudFavoriteIds.has(trackId);
  }, [soundCloudFavoriteIds]);

  const isArchiveFavorite = useCallback((trackId: string) => {
    return archiveFavoriteIds.has(trackId);
  }, [archiveFavoriteIds]);

  const toggleSoundCloudFavorite = useCallback(async (track: SoundCloudTrack): Promise<boolean> => {
    const isFavorited = soundCloudFavoriteIds.has(track.id);
    
    try {
      if (isFavorited) {
        await SoundCloudService.removeFromFavorites(track.id);
        setSoundCloudFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(track.id);
          return next;
        });
        return false;
      } else {
        await SoundCloudService.addToFavorites(track);
        setSoundCloudFavoriteIds(prev => new Set(prev).add(track.id));
        return true;
      }
    } catch (error) {
      console.error('[DiscoverFavoritesContext] Toggle SoundCloud favorite error:', error);
      throw error;
    }
  }, [soundCloudFavoriteIds]);

  const toggleArchiveFavorite = useCallback(async (track: ArchiveOrgTrack): Promise<boolean> => {
    const isFavorited = archiveFavoriteIds.has(track.id);
    
    try {
      if (isFavorited) {
        await ArchiveOrgService.removeFromFavorites(track.id);
        setArchiveFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(track.id);
          return next;
        });
        return false;
      } else {
        await ArchiveOrgService.addToFavorites(track);
        setArchiveFavoriteIds(prev => new Set(prev).add(track.id));
        return true;
      }
    } catch (error) {
      console.error('[DiscoverFavoritesContext] Toggle Archive favorite error:', error);
      throw error;
    }
  }, [archiveFavoriteIds]);

  const value: DiscoverFavoritesContextType = {
    soundCloudFavoriteIds,
    archiveFavoriteIds,
    isSoundCloudFavorite,
    isArchiveFavorite,
    toggleSoundCloudFavorite,
    toggleArchiveFavorite,
    refreshSoundCloudFavorites,
    refreshArchiveFavorites,
    isLoading,
  };

  return (
    <DiscoverFavoritesContext.Provider value={value}>
      {children}
    </DiscoverFavoritesContext.Provider>
  );
}

export function useDiscoverFavorites() {
  const context = useContext(DiscoverFavoritesContext);
  if (context === undefined) {
    throw new Error('useDiscoverFavorites must be used within a DiscoverFavoritesProvider');
  }
  return context;
}
