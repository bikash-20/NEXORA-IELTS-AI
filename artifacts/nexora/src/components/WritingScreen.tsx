import { useState } from 'react';
import { useProgressStore } from '../lib/store';
import { PenTool, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function WritingScreen() {
  const [tab, setTab] = useState<'task1' | 'task2'>('task1');
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<null | {
    band: number;
    ta: number;
    cc: number;
    lr: number;
    gra: number;
    comments: string;
  }>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addWritingScore } = useProgressStore();

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minWords = tab === 'task1' ? 150 : 250;

  const handleSubmit = () => {
    if (!text.trim()) return;
    setIsSubmitting(true);
    setFeedback(null);

    // Mock API delay
    setTimeout(() => {
      const mockBand = Math.floor(Math.random() * 4) / 2 + 5.5; // 5.5 - 7.0
      setFeedback({
        band: mockBand,
        ta: mockBand + 0.5,
        cc: mockBand,
        lr: mockBand - 0.5,
        gra: mockBand,
        comments: `Your essay has a clear structure and addresses the prompt well. To improve lexical resource, try using more varied and precise vocabulary.`
      });
      addWritingScore(mockBand);
      setIsSubmitting(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-background pb-16">
      <div className="h-16 border-b border-white/10 flex items-center justify-center px-4 bg-white/5 backdrop-blur-md shrink-0">
        <h2 className="font-bold text-white">Writing Evaluator</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-4 shrink-0">
          <button 
            onClick={() => {setTab('task1'); setText(''); setFeedback(null);}}
            className={clsx("flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2", tab === 'task1' ? "bg-white/10 text-white" : "text-white/40")}
          >
            Task 1
          </button>
          <button 
            onClick={() => {setTab('task2'); setText(''); setFeedback(null);}}
            className={clsx("flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2", tab === 'task2' ? "bg-white/10 text-white" : "text-white/40")}
          >
            Task 2
          </button>
        </div>

        {!feedback ? (
          <div className="flex-1 flex flex-col">
            <div className="glass-panel p-4 mb-4 text-sm text-white/80 leading-relaxed border-l-4 border-l-primary/50">
              {tab === 'task1' 
                ? "The graph below shows the percentage of households with internet access in five countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant."
                : "Some people believe that universities should focus on providing academic knowledge, while others think they should prepare students for employment. Discuss both views and give your own opinion."}
            </div>

            <div className="relative flex-1 flex flex-col mb-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your essay here..."
                className="flex-1 w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-primary/50 transition-colors resize-none mb-2"
              />
              <div className={clsx(
                "text-xs font-bold text-right",
                wordCount < minWords ? "text-red-400" : "text-green-400"
              )}>
                {wordCount} / {minWords} words minimum
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isSubmitting}
              className="w-full py-4 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>Evaluating <span className="animate-pulse">...</span></>
              ) : (
                <>Submit for Evaluation <PenTool className="w-4 h-4" /></>
              )}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col animate-screen-fade-in">
            <div className="glass-panel p-6 flex flex-col items-center text-center mb-6">
              <div className="text-sm font-bold uppercase tracking-widest text-white/40 mb-2">Estimated Band</div>
              <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-accent to-primary mb-4">
                {feedback.band.toFixed(1)}
              </div>
              
              <div className="w-full grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <div className="text-xs text-white/50 mb-1">Task Achievement</div>
                  <div className="font-bold text-lg text-white">{feedback.ta.toFixed(1)}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <div className="text-xs text-white/50 mb-1">Coherence</div>
                  <div className="font-bold text-lg text-white">{feedback.cc.toFixed(1)}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <div className="text-xs text-white/50 mb-1">Lexical Resource</div>
                  <div className="font-bold text-lg text-white">{feedback.lr.toFixed(1)}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <div className="text-xs text-white/50 mb-1">Grammar</div>
                  <div className="font-bold text-lg text-white">{feedback.gra.toFixed(1)}</div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-4 mb-6 border-l-4 border-l-accent/50">
              <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">AI Feedback</div>
              <p className="text-sm text-white/80 leading-relaxed">{feedback.comments}</p>
            </div>

            <button
              onClick={() => {setFeedback(null); setText('');}}
              className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors mt-auto"
            >
              Write Another Essay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
