import { useState } from 'react';
import { useProgressStore } from '../lib/store';
import { IELTS_SPEAKING_BANK } from '../lib/constants';
import { Mic, Square, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function SpeakingScreen() {
  const [part, setPart] = useState<1 | 2 | 3>(1);
  const [qIndex, setQIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<null | { band: number; text: string }>(null);
  
  const { addSpeakingScore } = useProgressStore();

  const questions = IELTS_SPEAKING_BANK[`part${part}`];
  const currentQ = questions[qIndex];

  const handleRecordToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      // Simulate feedback
      setTimeout(() => {
        const mockBand = Math.floor(Math.random() * 4) / 2 + 5.5; // 5.5 - 7.0
        setFeedback({
          band: mockBand,
          text: `Good fluency and vocabulary. Try to use more complex grammar structures like conditionals to push your score to ${mockBand + 0.5}.`
        });
        addSpeakingScore(mockBand);
      }, 1500);
    } else {
      setIsRecording(true);
      setFeedback(null);
    }
  };

  const handleNext = () => {
    setFeedback(null);
    if (qIndex < questions.length - 1) {
      setQIndex(qIndex + 1);
    } else if (part < 3) {
      setPart((part + 1) as 1 | 2 | 3);
      setQIndex(0);
    } else {
      // Done
      setPart(1);
      setQIndex(0);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background pb-16">
      <div className="h-16 border-b border-white/10 flex items-center justify-center px-4 bg-white/5 backdrop-blur-md shrink-0">
        <h2 className="font-bold text-white">Speaking Simulator</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        <div className="inline-block px-4 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-8 border border-primary/30">
          Part {part}
        </div>

        <div className="w-full text-center min-h-[120px] flex items-center justify-center mb-12">
          <h3 className="text-2xl font-bold text-white leading-tight">
            "{currentQ}"
          </h3>
        </div>

        <div className="relative mb-12">
          {isRecording && (
            <>
              <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" style={{ transform: 'scale(1.5)' }} />
              <div className="absolute inset-0 rounded-full bg-accent/40 animate-ping" style={{ transform: 'scale(2)' }} />
            </>
          )}
          <button
            onClick={handleRecordToggle}
            className={clsx(
              "w-24 h-24 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 shadow-[0_0_40px_rgba(0,0,0,0.5)]",
              isRecording ? "bg-red-500 text-white" : "bg-gradient-to-br from-primary to-accent text-white"
            )}
          >
            {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-10 h-10" />}
          </button>
        </div>

        <div className="text-center text-sm text-white/50 mb-8 h-6">
          {isRecording ? "Listening..." : "Tap the mic to answer"}
        </div>

        {feedback && (
          <div className="w-full glass-panel p-6 animate-screen-fade-in flex flex-col items-center text-center">
            <div className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-accent to-primary mb-2">
              {feedback.band.toFixed(1)}
            </div>
            <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-4">Estimated Band</div>
            <p className="text-sm text-white/80 leading-relaxed mb-6">
              {feedback.text}
            </p>
            <button 
              onClick={handleNext}
              className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center gap-2 transition-colors"
            >
              Next Question <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
