import { create } from 'zustand';

type Screen = 'splash' | 'chat' | 'speaking' | 'study' | 'mcq' | 'writing' | 'progress' | 'pronunciation';

interface AppState {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  // User profile
  name: string;
  setName: (name: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'splash',
  setScreen: (screen) => set({ currentScreen: screen }),
  name: '',
  setName: (name) => set({ name }),
}));

interface ProgressState {
  speakingHistory: { band: number; date: number }[];
  writingHistory: { band: number; date: number }[];
  mcqScore: number;
  mcqTotal: number;
  addSpeakingScore: (band: number) => void;
  addWritingScore: (band: number) => void;
  updateMcqScore: (correct: boolean) => void;
}

export const useProgressStore = create<ProgressState>((set) => ({
  speakingHistory: [],
  writingHistory: [],
  mcqScore: 0,
  mcqTotal: 0,
  addSpeakingScore: (band) => set((state) => ({ speakingHistory: [...state.speakingHistory, { band, date: Date.now() }] })),
  addWritingScore: (band) => set((state) => ({ writingHistory: [...state.writingHistory, { band, date: Date.now() }] })),
  updateMcqScore: (correct) => set((state) => ({ 
    mcqScore: state.mcqScore + (correct ? 1 : 0), 
    mcqTotal: state.mcqTotal + 1 
  })),
}));