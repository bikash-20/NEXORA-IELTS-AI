import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Settings2, X, Smile } from 'lucide-react';
import clsx from 'clsx';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

type Mode = 'support' | 'gossip' | 'hype' | 'tutor';

const MODE_CONFIG: Record<Mode, { label: string; color: string; bg: string; greeting: string; emoji: string }> = {
  support: {
    label: 'Support',
    emoji: '🤝',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20 border-blue-500/40',
    greeting: "I'm here for you. Tell me anything — I'll listen and help you through it. 💙",
  },
  gossip: {
    label: 'Gossip',
    emoji: '👀',
    color: 'text-pink-400',
    bg: 'bg-pink-500/20 border-pink-500/40',
    greeting: "Okay spill — what's the tea? I'm all ears and totally not going to judge... much 👀",
  },
  hype: {
    label: 'Hype',
    emoji: '🔥',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20 border-orange-500/40',
    greeting: "LET'S GO! You're absolutely CRUSHING IT! Tell me what you're working on — I'll hype you up! 🔥🚀",
  },
  tutor: {
    label: 'Tutor',
    emoji: '🎓',
    color: 'text-accent',
    bg: 'bg-accent/20 border-accent/40',
    greeting: "Hello! I'm your IELTS tutor. Ask me about grammar, vocabulary, essay writing, or speaking tips — I'll explain clearly. 🎓",
  },
};

const MOCK_RESPONSES: Record<Mode, string[]> = {
  support: [
    "That sounds really tough — you're handling it better than you think. 💙",
    "I hear you. It's completely okay to feel that way. What would help most right now?",
    "You've gotten through hard things before. This moment is temporary, and you are stronger than it.",
    "Take a breath. One step at a time — you don't have to figure everything out today.",
  ],
  gossip: [
    "No way! That's absolutely wild 👀 Tell me everything, don't skip a single detail!",
    "Okay but honestly? I'm not even surprised after everything that's happened 😂",
    "The audacity!! I would've said something SO much sooner honestly 💀",
    "Plot twist incoming... how do you even deal with that energy?? 😭",
  ],
  hype: [
    "YES!! You are literally built DIFFERENT! Keep going, you're unstoppable! 🔥🔥",
    "LESGOOO! Every step you take is progress — the grind is REAL and you are SHOWING UP! 💪",
    "I need you to hear this: you are THAT person. Always have been. Don't stop now! 🚀",
    "THE UNIVERSE WANTS YOU TO WIN! Today is just the beginning! GO GO GO! ⚡",
  ],
  tutor: [
    "Great question! In IELTS Writing Task 2, always start with a clear thesis statement in your introduction. Avoid starting with 'I think' — use 'It is argued that' or 'This essay will...' instead.",
    "For IELTS Speaking Band 7+, focus on: fluency (no long pauses), varied vocabulary (avoid repeating simple words), and complex grammar (use conditionals and passives).",
    "A common mistake is writing short paragraphs. Each body paragraph needs: a topic sentence, 2-3 supporting points, examples, and a linking sentence.",
    "Vocabulary tip: Instead of 'important', try 'crucial', 'pivotal', 'significant', or 'fundamental'. Lexical resource is 25% of your writing and speaking score!",
  ],
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Hello! I'm Nexora. Switch my mode below and let's talk! 😊", sender: 'bot', timestamp: Date.now() - 10000 }
  ]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('tutor');
  const [isTyping, setIsTyping] = useState(false);
  const [showModePanel, setShowModePanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), text, sender: 'user', timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const responses = MOCK_RESPONSES[mode];
    const response = responses[Math.floor(Math.random() * responses.length)];
    const delay = 800 + Math.random() * 600;

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: Date.now()
      }]);
    }, delay);
  };

  const handleModeSwitch = (newMode: Mode) => {
    if (newMode === mode) { setShowModePanel(false); return; }
    setMode(newMode);
    setShowModePanel(false);
    const greeting = MODE_CONFIG[newMode].greeting;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: greeting,
      sender: 'bot',
      timestamp: Date.now()
    }]);
  };

  const cfg = MODE_CONFIG[mode];

  return (
    <div className="flex flex-col h-full bg-background relative pb-16">
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl shrink-0 relative z-20">
        <div className="h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-background" />
            </div>
            <div>
              <h2 className="font-bold text-white leading-tight">Nexora</h2>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/40">{cfg.emoji}</span>
                <span className={clsx('text-xs font-semibold', cfg.color)}>{cfg.label} Mode</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowModePanel(v => !v)}
            className={clsx('p-2 rounded-full transition-colors', showModePanel ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-white/60 hover:text-white')}
          >
            {showModePanel ? <X className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
          </button>
        </div>

        {showModePanel && (
          <div className="px-4 pb-3 animate-[screen-fade-in_0.2s_ease-out]">
            <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2">Switch Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(MODE_CONFIG) as Mode[]).map(m => {
                const c = MODE_CONFIG[m];
                return (
                  <button
                    key={m}
                    onClick={() => handleModeSwitch(m)}
                    className={clsx(
                      'flex items-center gap-2 p-2.5 rounded-xl border text-sm font-bold transition-all',
                      mode === m ? `${c.bg} ${c.color}` : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/80'
                    )}
                  >
                    <span>{c.emoji}</span>
                    {c.label}
                    {mode === m && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={clsx('flex', msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.sender === 'bot' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center mr-2 mt-1 shrink-0">
                <Smile className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={clsx(
              'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.sender === 'user'
                ? 'bg-primary text-white rounded-tr-sm'
                : 'glass-panel text-white/90 rounded-tl-sm'
            )}>
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center shrink-0">
              <Smile className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="glass-panel px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1 items-center h-4">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-background/80 backdrop-blur-xl border-t border-white/10 shrink-0">
        <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl pl-1 pr-2 py-1">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Message Nexora (${cfg.label} mode)…`}
            className="flex-1 bg-transparent border-none text-white text-sm py-2.5 px-3 outline-none resize-none max-h-32 min-h-[44px] placeholder:text-white/30"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={clsx(
              'p-2.5 rounded-xl shrink-0 transition-all mb-0.5',
              input.trim() && !isTyping
                ? 'bg-primary text-white shadow-[0_4px_12px_rgba(124,58,237,0.4)] hover:bg-primary/90'
                : 'bg-white/10 text-white/20 cursor-default'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
