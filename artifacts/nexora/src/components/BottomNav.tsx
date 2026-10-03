import { useAppStore } from '../lib/store';
import { MessageSquare, Mic, BookOpen, GraduationCap, BarChart2, PenTool, Volume2 } from 'lucide-react';
import clsx from 'clsx';

type Screen = 'chat' | 'speaking' | 'study' | 'mcq' | 'writing' | 'pronunciation' | 'progress';

const navItems = [
  { id: 'chat',     label: 'Chat',    icon: MessageSquare },
  { id: 'speaking', label: 'Speak',   icon: Mic },
  { id: 'study',    label: 'Study',   icon: BookOpen },
  { id: 'mcq',      label: 'MCQ',     icon: GraduationCap },
  { id: 'progress', label: 'Stats',   icon: BarChart2 },
] as const;

const EXTRA_SCREENS: Screen[] = ['writing', 'pronunciation'];

export default function BottomNav() {
  const { currentScreen, setScreen } = useAppStore();
  if (currentScreen === 'splash') return null;

  const activeId = EXTRA_SCREENS.includes(currentScreen as Screen) ? null : currentScreen;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50">
      {(currentScreen === 'writing' || currentScreen === 'pronunciation') && (
        <div className="bg-background/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex items-center gap-2">
          <button
            onClick={() => setScreen('writing')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors',
              currentScreen === 'writing' ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-white/60'
            )}
          >
            <PenTool className="w-4 h-4" /> Writing
          </button>
          <button
            onClick={() => setScreen('pronunciation')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors',
              currentScreen === 'pronunciation' ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-white/60'
            )}
          >
            <Volume2 className="w-4 h-4" /> Pronunciation
          </button>
        </div>
      )}
      <div className="h-16 bg-background/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-1">
        {navItems.map(item => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 transition-all relative',
                'w-14 h-full',
                isActive ? 'text-primary' : 'text-white/35 hover:text-white/60'
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
              )}
              <item.icon className={clsx('transition-all', isActive ? 'w-5 h-5' : 'w-5 h-5')} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
