import { useProgressStore } from '../lib/store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { TrendingUp, GraduationCap, Mic, PenTool, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

export default function ProgressScreen() {
  const { speakingHistory, writingHistory, mcqScore, mcqTotal } = useProgressStore();

  const speakingChartData = speakingHistory.map((h, i) => ({
    name: `T${i + 1}`,
    score: h.band,
    date: format(h.date, 'MMM d')
  }));

  const writingChartData = writingHistory.map((h, i) => ({
    name: `T${i + 1}`,
    score: h.band,
    date: format(h.date, 'MMM d')
  }));

  const avgSpeaking = speakingHistory.length 
    ? (speakingHistory.reduce((a, b) => a + b.band, 0) / speakingHistory.length).toFixed(1) 
    : 'N/A';
    
  const avgWriting = writingHistory.length 
    ? (writingHistory.reduce((a, b) => a + b.band, 0) / writingHistory.length).toFixed(1) 
    : 'N/A';

  const mcqPct = mcqTotal > 0 ? Math.round((mcqScore / mcqTotal) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-background pb-16">
      <div className="h-16 border-b border-white/10 flex items-center justify-center px-4 bg-white/5 backdrop-blur-md shrink-0">
        <h2 className="font-bold text-white">Progress Dashboard</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-6">
        
        {/* Hero Stat */}
        <div className="glass-panel p-6 relative overflow-hidden flex items-center justify-between">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
          <div>
            <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Scholar Rank</h3>
            <div className="text-2xl font-black text-white mb-1">IELTS Candidate</div>
            <div className="text-sm text-primary flex items-center gap-1 font-bold">
              <TrendingUp className="w-4 h-4" /> 12 Day Streak
            </div>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-primary/30 flex items-center justify-center relative">
            <div className="text-primary font-black text-xl">L2</div>
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="30" cy="30" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-primary" strokeDasharray="175" strokeDashoffset="40" />
            </svg>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel p-4 flex flex-col gap-2">
            <Mic className="w-5 h-5 text-accent" />
            <div className="text-2xl font-black text-white">{avgSpeaking}</div>
            <div className="text-xs text-white/50 font-medium uppercase">Avg Speaking</div>
          </div>
          <div className="glass-panel p-4 flex flex-col gap-2">
            <PenTool className="w-5 h-5 text-pink-500" />
            <div className="text-2xl font-black text-white">{avgWriting}</div>
            <div className="text-xs text-white/50 font-medium uppercase">Avg Writing</div>
          </div>
        </div>

        {/* Charts */}
        <div className="glass-panel p-4 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Speaking Trend</h3>
          <div className="h-40 w-full">
            {speakingChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={speakingChartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e0ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00e0ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 9]} stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} width={20} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#00e0ff" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
                No data yet. Take a speaking test.
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" /> MCQ Accuracy
            </h3>
            <span className="text-xl font-black text-white">{mcqPct}%</span>
          </div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000" style={{ width: `${mcqPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-white/50">
            <span>{mcqScore} correct</span>
            <span>{mcqTotal} total questions</span>
          </div>
        </div>

      </div>
    </div>
  );
}
