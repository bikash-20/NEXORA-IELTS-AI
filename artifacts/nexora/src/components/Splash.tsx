import { useAppStore } from '../lib/store';
import { ArrowRight, Mic, GraduationCap, PenTool, BookOpen, BarChart2 } from 'lucide-react';
import nexoraIcon from '/icon-512.png';

const FEATURES = [
  { icon: Mic,           color: 'text-accent',    bg: 'bg-accent/10 border-accent/25',      label: 'Speaking Simulator',   sub: 'IELTS Part 1 / 2 / 3 with band feedback' },
  { icon: GraduationCap, color: 'text-primary',   bg: 'bg-primary/10 border-primary/25',    label: 'MCQ Bank',             sub: 'IELTS vocab, grammar & BCS decks' },
  { icon: PenTool,       color: 'text-pink-400',  bg: 'bg-pink-500/10 border-pink-500/25',  label: 'Writing Evaluator',    sub: 'Task 1 & 2 with AI band scoring' },
  { icon: BookOpen,      color: 'text-violet-400',bg: 'bg-violet-500/10 border-violet-500/25', label: 'Flashcards & Notebook', sub: 'Study sets + personal notes' },
  { icon: BarChart2,     color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/25', label: 'Progress Dashboard', sub: 'Track your band score over time' },
] as const;

export default function Splash() {
  const { setScreen } = useAppStore();

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 pt-12 pb-6 z-10 animate-[screen-fade-in_0.4s_ease-out]">
        {/* Icon + branding */}
        <div className="relative mb-6 animate-float">
          <div className="absolute inset-0 rounded-3xl bg-cyan-400/20 blur-2xl scale-110 animate-pulse" />
          <img
            src={nexoraIcon}
            alt="Nexora"
            className="w-28 h-28 rounded-3xl relative shadow-[0_0_50px_rgba(0,224,255,0.25)] border border-white/10"
          />
        </div>

        <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-primary mb-1 tracking-tight">
          Nexora
        </h1>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block px-3 py-0.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[10px] font-bold text-white/60 tracking-widest uppercase">
            AI Learning Companion
          </span>
        </div>
        <p className="text-base text-white/40 mb-10 text-center font-medium">Learn smarter. Think deeper.</p>

        {/* Feature list */}
        <div className="w-full space-y-3 mb-8">
          {FEATURES.map(f => (
            <div key={f.label} className="glass-panel p-3.5 flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${f.bg}`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm leading-tight">{f.label}</h3>
                <p className="text-xs text-white/40 mt-0.5 truncate">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => setScreen('chat')}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary via-purple-600 to-primary text-white font-bold text-base shadow-[0_8px_32px_rgba(124,58,237,0.45)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          Start Learning <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-[10px] text-white/20 mt-4 text-center">
          Free to use · No sign-up required
        </p>
      </div>
    </div>
  );
}
