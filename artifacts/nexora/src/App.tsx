import { useAppStore } from './lib/store';
import Splash from './components/Splash';
import ChatScreen from './components/ChatScreen';
import SpeakingScreen from './components/SpeakingScreen';
import StudyScreen from './components/StudyScreen';
import McqScreen from './components/McqScreen';
import WritingScreen from './components/WritingScreen';
import PronunciationScreen from './components/PronunciationScreen';
import ProgressScreen from './components/ProgressScreen';
import BottomNav from './components/BottomNav';
import { useEffect } from 'react';

function App() {
  const { currentScreen } = useAppStore();

  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-0 md:p-4">
      <div id="phone" className="relative mx-auto w-full max-w-[430px] h-[100dvh] md:h-[90vh] md:rounded-[40px] md:border-[8px] md:border-gray-900 bg-background overflow-hidden flex flex-col shadow-2xl shadow-primary/20">
        <main className="flex-1 overflow-hidden relative">
          {currentScreen === 'splash' && <Splash />}
          {currentScreen === 'chat' && <ChatScreen />}
          {currentScreen === 'speaking' && <SpeakingScreen />}
          {currentScreen === 'study' && <StudyScreen />}
          {currentScreen === 'mcq' && <McqScreen />}
          {currentScreen === 'writing' && <WritingScreen />}
          {currentScreen === 'pronunciation' && <PronunciationScreen />}
          {currentScreen === 'progress' && <ProgressScreen />}
        </main>
        {currentScreen !== 'splash' && <BottomNav />}
      </div>
    </div>
  );
}

export default App;
