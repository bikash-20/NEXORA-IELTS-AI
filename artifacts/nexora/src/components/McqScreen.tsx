import { useState, useCallback } from 'react';
import { IELTS_MCQ_BANK, BCS_MCQ_DECKS } from '../lib/constants';
import type { McqQuestion } from '../lib/constants';
import { useProgressStore } from '../lib/store';
import {
  BookOpen, CheckCircle2, XCircle, ChevronRight,
  GraduationCap, Globe, Cpu, FlaskConical, Flag, ArrowLeft, Trophy
} from 'lucide-react';
import clsx from 'clsx';

type Bank = 'ielts' | 'bcs';

const IELTS_TABS = [
  { id: 'vocab',   label: 'Vocabulary', icon: BookOpen },
  { id: 'grammar', label: 'Grammar',    icon: GraduationCap },
] as const;

const BCS_CATEGORIES = [
  { id: 'Bangladesh Affairs',      label: 'Bangladesh',    icon: Flag,         color: 'text-green-400',  bg: 'bg-green-500/20 border-green-500/30' },
  { id: 'English Grammar',         label: 'English',       icon: BookOpen,     color: 'text-blue-400',   bg: 'bg-blue-500/20 border-blue-500/30' },
  { id: 'General Science',         label: 'Science',       icon: FlaskConical, color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  { id: 'Computer & IT',           label: 'Computer',      icon: Cpu,          color: 'text-cyan-400',   bg: 'bg-cyan-500/20 border-cyan-500/30' },
  { id: 'International Affairs',   label: 'World Affairs', icon: Globe,        color: 'text-pink-400',   bg: 'bg-pink-500/20 border-pink-500/30' },
  { id: 'Bangladesh Constitution', label: 'Constitution',  icon: Trophy,       color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' },
] as const;

const LETTERS = ['A', 'B', 'C', 'D'] as const;

interface QuizState {
  questions: McqQuestion[];
  deckName: string;
  qIndex: number;
  selectedOpt: string | null;
  showExplanation: boolean;
  score: number;
  total: number;
  done: boolean;
}

export default function McqScreen() {
  const [bank, setBank] = useState<Bank>('ielts');
  const [ieltsTab, setIeltsTab] = useState<'vocab' | 'grammar'>('vocab');
  const [bcsCategory, setBcsCategory] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);

  const { updateMcqScore } = useProgressStore();

  const startQuiz = useCallback((questions: McqQuestion[], deckName: string) => {
    setQuiz({
      questions,
      deckName,
      qIndex: 0,
      selectedOpt: null,
      showExplanation: false,
      score: 0,
      total: 0,
      done: false,
    });
  }, []);

  const handleStartIelts = () => {
    startQuiz(IELTS_MCQ_BANK[ieltsTab], `IELTS ${ieltsTab === 'vocab' ? 'Vocabulary' : 'Grammar'}`);
  };

  const handleStartBcs = (catId: string) => {
    setBcsCategory(catId);
    startQuiz(BCS_MCQ_DECKS[catId], catId);
  };

  const handleSelect = (letter: string) => {
    if (!quiz || quiz.selectedOpt) return;
    const isCorrect = letter === quiz.questions[quiz.qIndex].correct;
    updateMcqScore(isCorrect);
    setQuiz(prev => prev ? {
      ...prev,
      selectedOpt: letter,
      showExplanation: true,
      score: prev.score + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    } : prev);
  };

  const handleNext = () => {
    if (!quiz) return;
    const nextIndex = quiz.qIndex + 1;
    if (nextIndex >= quiz.questions.length) {
      setQuiz(prev => prev ? { ...prev, done: true } : prev);
    } else {
      setQuiz(prev => prev ? {
        ...prev,
        qIndex: nextIndex,
        selectedOpt: null,
        showExplanation: false,
      } : prev);
    }
  };

  const handleBack = () => {
    setQuiz(null);
    setBcsCategory(null);
  };

  const handleRestart = () => {
    if (!quiz) return;
    setQuiz(prev => prev ? {
      ...prev,
      qIndex: 0,
      selectedOpt: null,
      showExplanation: false,
      score: 0,
      total: 0,
      done: false,
    } : prev);
  };

  if (quiz) {
    if (quiz.done) {
      const pct = Math.round((quiz.score / quiz.total) * 100);
      const grade = pct >= 80 ? '🎉 Excellent!' : pct >= 60 ? '👍 Good job!' : '💪 Keep practising!';
      return (
        <div className="flex flex-col h-full bg-background pb-16">
          <div className="h-16 border-b border-white/10 flex items-center px-4 bg-white/5 backdrop-blur-xl shrink-0 gap-3">
            <button onClick={handleBack} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-white">{quiz.deckName}</h2>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-5xl mb-6">{pct >= 80 ? '🏆' : pct >= 60 ? '✅' : '🔄'}</div>
            <div className="text-4xl font-black text-white mb-2">{quiz.score} / {quiz.total}</div>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent mb-2">{pct}%</div>
            <div className="text-white/60 mb-10">{grade}</div>
            <div className="w-full glass-panel p-4 mb-6">
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <button onClick={handleRestart} className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold">
                Try Again
              </button>
              <button onClick={handleBack} className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold">
                Change Deck
              </button>
            </div>
          </div>
        </div>
      );
    }

    const q = quiz.questions[quiz.qIndex];
    const progress = ((quiz.qIndex + (quiz.showExplanation ? 1 : 0)) / quiz.questions.length) * 100;

    return (
      <div className="flex flex-col h-full bg-background pb-16">
        <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl shrink-0">
          <div className="h-16 flex items-center px-4 gap-3">
            <button onClick={handleBack} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="font-bold text-white text-sm leading-tight">{quiz.deckName}</h2>
              <p className="text-xs text-white/40">{quiz.qIndex + 1} / {quiz.questions.length} questions</p>
            </div>
            <div className="text-sm font-bold text-accent">{quiz.score} pts</div>
          </div>
          <div className="h-1 bg-white/5">
            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          <div className="glass-panel p-5 mb-5 border-white/15">
            <h3 className="text-base font-bold text-white leading-relaxed">{q.q}</h3>
          </div>

          <div className="space-y-3 mb-4 flex-1">
            {q.options.map((opt, i) => {
              const letter = LETTERS[i];
              const isCorrect = letter === q.correct;
              const isSelected = quiz.selectedOpt === letter;

              let stateClass = 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 cursor-pointer';
              if (quiz.showExplanation) {
                if (isCorrect) stateClass = 'bg-green-500/20 border-green-400/60 text-green-300';
                else if (isSelected) stateClass = 'bg-red-500/20 border-red-400/60 text-red-300';
                else stateClass = 'bg-white/3 border-white/5 text-white/30 cursor-default';
              }

              return (
                <button
                  key={letter}
                  onClick={() => handleSelect(letter)}
                  disabled={!!quiz.showExplanation}
                  className={clsx(
                    'w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-3',
                    stateClass
                  )}
                >
                  <div className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-colors',
                    quiz.showExplanation && isCorrect ? 'bg-green-500 border-green-500 text-white' :
                    quiz.showExplanation && isSelected ? 'bg-red-500 border-red-500 text-white' :
                    'border-current'
                  )}>
                    {quiz.showExplanation && isCorrect ? <CheckCircle2 className="w-4 h-4" /> :
                     quiz.showExplanation && isSelected ? <XCircle className="w-4 h-4" /> :
                     letter}
                  </div>
                  <span className="text-sm font-medium flex-1">{opt}</span>
                </button>
              );
            })}
          </div>

          {quiz.showExplanation && (
            <div className="animate-[screen-fade-in_0.25s_ease-out] mt-auto">
              <div className="glass-panel p-4 mb-4 border-l-4 border-l-primary/60">
                <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Explanation</div>
                <p className="text-sm text-white/80 leading-relaxed">{q.explanation}</p>
              </div>
              <button
                onClick={handleNext}
                className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {quiz.qIndex + 1 < quiz.questions.length ? (
                  <>Next Question <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <>See Results <Trophy className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background pb-16">
      <div className="h-16 border-b border-white/10 flex items-center justify-center px-4 bg-white/5 backdrop-blur-xl shrink-0">
        <h2 className="font-bold text-white">MCQ Practice</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-6 shrink-0">
          <button
            onClick={() => setBank('ielts')}
            className={clsx('flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors', bank === 'ielts' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70')}
          >
            IELTS
          </button>
          <button
            onClick={() => setBank('bcs')}
            className={clsx('flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors', bank === 'bcs' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70')}
          >
            BCS / Govt
          </button>
        </div>

        {bank === 'ielts' && (
          <div className="flex-1 flex flex-col">
            <p className="text-xs text-white/40 uppercase font-bold tracking-widest mb-4">Select Category</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {IELTS_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setIeltsTab(tab.id)}
                  className={clsx(
                    'glass-panel p-5 flex flex-col items-start gap-3 transition-all border-2',
                    ieltsTab === tab.id ? 'border-primary/60 bg-primary/10' : 'border-white/5 hover:border-white/20'
                  )}
                >
                  <tab.icon className={clsx('w-6 h-6', ieltsTab === tab.id ? 'text-primary' : 'text-white/50')} />
                  <div>
                    <div className={clsx('font-bold text-sm', ieltsTab === tab.id ? 'text-white' : 'text-white/70')}>{tab.label}</div>
                    <div className="text-xs text-white/40">{IELTS_MCQ_BANK[tab.id].length} questions</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-auto">
              <button
                onClick={handleStartIelts}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold text-base shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:scale-[1.02] transition-transform"
              >
                Start Quiz — {IELTS_MCQ_BANK[ieltsTab].length} Questions
              </button>
            </div>
          </div>
        )}

        {bank === 'bcs' && (
          <div className="flex-1 flex flex-col">
            <p className="text-xs text-white/40 uppercase font-bold tracking-widest mb-4">Select Subject</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {BCS_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setBcsCategory(cat.id)}
                  className={clsx(
                    'glass-panel p-4 flex flex-col items-start gap-3 transition-all border-2',
                    bcsCategory === cat.id ? `border-current ${cat.color}` : 'border-white/5 hover:border-white/20'
                  )}
                >
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center border', cat.bg)}>
                    <cat.icon className={clsx('w-5 h-5', cat.color)} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{cat.label}</div>
                    <div className="text-xs text-white/40">{BCS_MCQ_DECKS[cat.id].length} Q</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-auto">
              <button
                onClick={() => bcsCategory && handleStartBcs(bcsCategory)}
                disabled={!bcsCategory}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold text-base shadow-[0_4px_20px_rgba(124,58,237,0.3)] disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:scale-[1.02] transition-transform"
              >
                {bcsCategory ? `Start — ${BCS_MCQ_DECKS[bcsCategory].length} Questions` : 'Choose a Subject'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
