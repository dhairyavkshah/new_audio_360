import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReverbPreset = 'None' | 'Small Studio' | 'Medium Studio' | 'Large Studio' | 'Open Theatre' | 'Auditorium';
export type NoiseReductionLevel = 'Off' | 'Light' | 'Medium' | 'Strong';

export interface VoiceSettings {
  reverb: ReverbPreset;
  noiseReduction: NoiseReductionLevel;
}

export interface StudioProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  backgroundTrackUri: string | null;
  backgroundTrackTitle: string | null;
  voiceRecordingUri: string | null;
  voiceSettings: VoiceSettings;
  musicVolume: number;
  voiceVolume: number;
  duration: number;
}

export const REVERB_PRESETS: ReverbPreset[] = [
  'None',
  'Small Studio',
  'Medium Studio',
  'Large Studio',
  'Open Theatre',
  'Auditorium',
];

export const NOISE_REDUCTION_LEVELS: NoiseReductionLevel[] = [
  'Off',
  'Light',
  'Medium',
  'Strong',
];

const STORAGE_KEY = 'studio_projects';

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  reverb: 'None',
  noiseReduction: 'Off',
};

interface StudioContextType {
  projects: StudioProject[];
  currentProject: StudioProject | null;
  selectedReverb: ReverbPreset;
  noiseReduction: NoiseReductionLevel;
  isRecording: boolean;
  recordingDuration: number;
  isLoading: boolean;
  createProject: (name: string) => Promise<StudioProject>;
  updateProject: (id: string, updates: Partial<StudioProject>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: StudioProject | null) => void;
  setSelectedReverb: (reverb: ReverbPreset) => void;
  setNoiseReduction: (level: NoiseReductionLevel) => void;
  setIsRecording: (recording: boolean) => void;
  setRecordingDuration: (duration: number) => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [currentProject, setCurrentProject] = useState<StudioProject | null>(null);
  const [selectedReverb, setSelectedReverbState] = useState<ReverbPreset>('None');
  const [noiseReduction, setNoiseReductionState] = useState<NoiseReductionLevel>('Off');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (hasInitialized) {
      saveProjects(projects);
    }
  }, [projects, hasInitialized]);

  useEffect(() => {
    if (currentProject) {
      setSelectedReverbState(currentProject.voiceSettings.reverb);
      setNoiseReductionState(currentProject.voiceSettings.noiseReduction);
    }
  }, [currentProject]);

  const loadProjects = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StudioProject[];
        setProjects(parsed);
      }
    } catch (error) {
      console.error('Error loading studio projects:', error);
    } finally {
      setIsLoading(false);
      setHasInitialized(true);
    }
  };

  const saveProjects = async (projectsToSave: StudioProject[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projectsToSave));
    } catch (error) {
      console.error('Error saving studio projects:', error);
    }
  };

  const createProject = useCallback(async (name: string): Promise<StudioProject> => {
    const now = new Date().toISOString();
    const newProject: StudioProject = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      createdAt: now,
      updatedAt: now,
      backgroundTrackUri: null,
      backgroundTrackTitle: null,
      voiceRecordingUri: null,
      voiceSettings: { ...DEFAULT_VOICE_SETTINGS },
      musicVolume: 70,
      voiceVolume: 100,
      duration: 0,
    };

    setProjects((prev) => {
      const updated = [...prev, newProject];
      saveProjects(updated);
      return updated;
    });

    return newProject;
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<StudioProject>): Promise<void> => {
    setProjects((prev) => {
      const updated = prev.map((project) => {
        if (project.id === id) {
          const updatedProject = {
            ...project,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          if (currentProject?.id === id) {
            setCurrentProject(updatedProject);
          }
          return updatedProject;
        }
        return project;
      });
      saveProjects(updated);
      return updated;
    });
  }, [currentProject]);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    setProjects((prev) => {
      const updated = prev.filter((project) => project.id !== id);
      saveProjects(updated);
      return updated;
    });

    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
  }, [currentProject]);

  const setSelectedReverb = useCallback((reverb: ReverbPreset) => {
    setSelectedReverbState(reverb);
    if (currentProject) {
      updateProject(currentProject.id, {
        voiceSettings: {
          ...currentProject.voiceSettings,
          reverb,
        },
      });
    }
  }, [currentProject, updateProject]);

  const setNoiseReduction = useCallback((level: NoiseReductionLevel) => {
    setNoiseReductionState(level);
    if (currentProject) {
      updateProject(currentProject.id, {
        voiceSettings: {
          ...currentProject.voiceSettings,
          noiseReduction: level,
        },
      });
    }
  }, [currentProject, updateProject]);

  const value: StudioContextType = {
    projects,
    currentProject,
    selectedReverb,
    noiseReduction,
    isRecording,
    recordingDuration,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    setSelectedReverb,
    setNoiseReduction,
    setIsRecording,
    setRecordingDuration,
  };

  return (
    <StudioContext.Provider value={value}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudioContext() {
  const context = useContext(StudioContext);
  if (context === undefined) {
    throw new Error('useStudioContext must be used within a StudioProvider');
  }
  return context;
}
