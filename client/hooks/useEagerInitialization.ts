import { useEffect, useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { PlaybackEngineModule } from 'audio-effects';
import { NativeEffectsManager } from '@/services/NativeEffectsManager';

const INIT_TIMEOUT_MS = 5000;

export interface InitializationState {
  isComplete: boolean;
  audioEngineReady: boolean;
  error: string | null;
}

export function useEagerInitialization(): InitializationState {
  const [state, setState] = useState<InitializationState>({
    isComplete: false,
    audioEngineReady: false,
    error: null,
  });
  
  const initStartedRef = useRef(false);
  const audioSessionIdRef = useRef<number>(0);

  const initializeAudioEngine = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const isAvailable = PlaybackEngineModule.isAvailable();
      if (!isAvailable) {
        console.log('[EagerInit] PlaybackEngineModule not available');
        return true;
      }

      console.log('[EagerInit] Starting PlaybackEngineModule initialization...');
      const initResult = await PlaybackEngineModule.initialize();
      
      if (initResult.success && initResult.audioSessionId) {
        audioSessionIdRef.current = initResult.audioSessionId;
        console.log('[EagerInit] PlaybackEngineModule initialized with session:', initResult.audioSessionId);
        
        const attached = await NativeEffectsManager.attach(initResult.audioSessionId);
        if (attached) {
          console.log('[EagerInit] NativeEffectsManager attached successfully');
        }
        return true;
      } else if (initResult.alreadyInitialized) {
        console.log('[EagerInit] PlaybackEngineModule already initialized');
        return true;
      } else {
        console.warn('[EagerInit] PlaybackEngineModule init failed:', initResult.error);
        return false;
      }
    } catch (err) {
      console.warn('[EagerInit] Audio engine initialization error:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const runInitialization = async () => {
      console.log('[EagerInit] Starting eager initialization...');
      const startTime = Date.now();

      try {
        const audioReady = await Promise.race([
          initializeAudioEngine(),
          new Promise<boolean>((resolve) => 
            setTimeout(() => {
              console.log('[EagerInit] Audio init timeout, continuing...');
              resolve(false);
            }, INIT_TIMEOUT_MS)
          ),
        ]);

        const elapsed = Date.now() - startTime;
        console.log(`[EagerInit] Initialization complete in ${elapsed}ms`);

        setState({
          isComplete: true,
          audioEngineReady: audioReady,
          error: null,
        });
      } catch (err) {
        console.error('[EagerInit] Initialization failed:', err);
        setState({
          isComplete: true,
          audioEngineReady: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    };

    runInitialization();
  }, [initializeAudioEngine]);

  return state;
}
