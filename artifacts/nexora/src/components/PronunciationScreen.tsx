import { useState } from 'react';
import { PRONUNCIATION_WORDS } from '../lib/constants';
import { Volume2, Mic, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function PronunciationScreen() {
  const [wordIndex, setWordIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<null | { score: number; text: string }>(null);

  const word = PRONUNCIATION_WORDS[wordIndex];

  const handleListen = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = 'en-GB';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      setTimeout(() => {
        const score = Math.floor(Math.random() * 20) + 80; // 80 - 100
        setFeedback({
          score,
          text: score > 90 ? "Excellent! Your pronunciation was very clear." : "Good attempt. Try to stress the syllables correctly."
        });
      }, 1500);
    } else {
      setIsRecording(true);
      setFeedback(null);
    }
  };

  const handleNext = () => {
    setFeedback(null);
    setIsRecording(false);
    setWordIndex((prev) => (prev + 1) % PRONUNCIATION_WORDS.length);
  };

  return (
    <div className="flex flex-col h-full bg-background pb-16">
      <div className="h-16 border-b border-white/10 flex items-center justify-center px-4 bg-white/5 backdrop-blur-md shrink-0">
        <h2 className="font-bold text-white">Pronunciation</h2>
      </div>

      <div className="flex-1 flex flex-col p-6 items-center">
        <div className="text-xs font-bold tracking-widest uppercase text-white/40 mb-8">
          Word {wordIndex + 1} of {PRONUNCIATION_WORDS.length}
        </div>

        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[250px] mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-accent">{word.word}</h1>
          <div className="text-xl font-mono text-white/60 mb-6">{word.phonetic}</div>
          <div className="glass-panel px-4 py-2 border-primary/30 bg-primary/10">
            <span className="text-sm text-primary font-medium">{word.tip}</span>
          </div>
        </div>

        {feedback ? (
          <div className="w-full glass-panel p-6 animate-screen-fade-in flex flex-col items-center text-center mb-8 border-l-4 border-l-accent">
            <div className="text-sm font-bold uppercase tracking-widest text-white/40 mb-2">Accuracy Score</div>
            <div className="text-4xl font-black text-white mb-2">{feedback.score}%</div>
            <p className="text-sm text-white/80">{feedback.text}</p>
          </div>
        ) : (
          <div className="flex gap-4 w-full mb-8">
            <button 
              onClick={handleListen}
              className="flex-1 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Volume2 className="w-5 h-5" /> Listen
            </button>
            <button 
              onClick={handleRecordToggle}
              className={clsx(
                "flex-1 py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-colors",
                isRecording ? "bg-red-500 text-white" : "bg-primary text-white hover:bg-primary/90"
              )}
            >
              {isRecording ? "Stop" : <><Mic className="w-5 h-5" /> Try It</>}
            </button>
          </div>
        )}

        <button 
          onClick={handleNext}
          className="w-full py-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 mt-auto"
        >
          Next Word <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
