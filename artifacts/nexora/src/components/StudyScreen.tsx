import { useState } from 'react';
import { FLASHCARD_TEMPLATES } from '../lib/constants';
import { BookOpen, Layers, CheckCircle2, RotateCcw, ChevronRight, NotebookPen, Plus, Search, Trash2, FileText } from 'lucide-react';
import clsx from 'clsx';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
}

function useNotes() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try { return JSON.parse(localStorage.getItem('nexora_notes') || '[]'); } catch { return []; }
  });

  const save = (updated: Note[]) => {
    setNotes(updated);
    localStorage.setItem('nexora_notes', JSON.stringify(updated));
  };

  const addNote = (title: string, content: string) => {
    const note: Note = { id: Date.now().toString(), title: title || 'Untitled', content, tags: [], createdAt: Date.now() };
    save([note, ...notes]);
    return note;
  };

  const deleteNote = (id: string) => save(notes.filter(n => n.id !== id));

  return { notes, addNote, deleteNote };
}

function NotebookTab() {
  const { notes, addNote, deleteNote } = useNotes();
  const [view, setView] = useState<'list' | 'add' | 'read'>('list');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!content.trim()) return;
    addNote(title, content);
    setTitle('');
    setContent('');
    setView('list');
  };

  if (view === 'add') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <button onClick={() => setView('list')} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h3 className="font-bold text-white">New Note</h3>
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-colors mb-3 shrink-0"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write your notes here…"
          className="flex-1 w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-primary/50 transition-colors resize-none mb-4"
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={!content.trim()}
          className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          Save Note
        </button>
      </div>
    );
  }

  if (view === 'read' && activeNote) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <button onClick={() => setView('list')} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h3 className="font-bold text-white flex-1 truncate">{activeNote.title}</h3>
          <button
            onClick={() => { deleteNote(activeNote.id); setView('list'); }}
            className="p-2 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{activeNote.content}</p>
        </div>
        <div className="text-xs text-white/30 mt-4 shrink-0">
          {new Date(activeNote.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <button
          onClick={() => setView('add')}
          className="p-2.5 rounded-xl bg-primary text-white shrink-0 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-white/20" />
          </div>
          <h4 className="text-white font-bold mb-1">{search ? 'No results' : 'No notes yet'}</h4>
          <p className="text-sm text-white/40 max-w-[200px]">
            {search ? 'Try a different search term.' : 'Tap + to write your first note.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3">
          {filteredNotes.map(note => (
            <button
              key={note.id}
              onClick={() => { setActiveNote(note); setView('read'); }}
              className="w-full text-left glass-panel p-4 hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white truncate mb-1">{note.title}</h4>
                  <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{note.content}</p>
                </div>
                <div className="text-[10px] text-white/30 shrink-0 mt-0.5">
                  {new Date(note.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StudyScreen() {
  const [activeTab, setActiveTab] = useState<'flashcards' | 'notebook'>('flashcards');
  const [topic, setTopic] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const cards = FLASHCARD_TEMPLATES.map(t => ({
    front: t.front.replace('{topic}', topic || 'the topic'),
    back: t.back.replace('{topic}', topic || 'the topic')
  }));

  const handleGenerate = () => {
    if (topic.trim()) {
      setIsGenerated(true);
      setCardIndex(0);
      setIsFlipped(false);
    }
  };

  const handleNextCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCardIndex(prev => (prev + 1) % cards.length);
    }, 150);
  };

  return (
    <div className="flex flex-col h-full bg-background pb-16">
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl shrink-0">
        <div className="h-14 flex items-center justify-center px-4">
          <h2 className="font-bold text-white">Study Mode</h2>
        </div>
        <div className="flex px-4 gap-1 pb-0">
          {[
            { id: 'flashcards', label: 'Flashcards', icon: Layers },
            { id: 'notebook',   label: 'Notebook',   icon: NotebookPen },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold border-b-2 transition-all',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-white/40 hover:text-white/60'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'flashcards' && (
          <>
            {!isGenerated ? (
              <div className="flex flex-col justify-center items-center text-center max-w-sm mx-auto w-full gap-6 pt-8">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-primary animate-float">
                  <BookOpen className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Create Study Set</h3>
                  <p className="text-sm text-white/50">Enter any topic to generate flashcards instantly.</p>
                </div>
                <div className="w-full space-y-4">
                  <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleGenerate(); }}
                    placeholder="e.g. Photosynthesis, Padma Bridge, World War II"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-colors"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={!topic.trim()}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(124,58,237,0.3)]"
                  >
                    Generate Flashcards ✨
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center max-w-sm mx-auto w-full">
                <div className="flex items-center gap-3 w-full mb-4">
                  <button onClick={() => { setIsGenerated(false); setTopic(''); }} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Card {cardIndex + 1} of {cards.length}</p>
                  </div>
                  <div className="w-9" />
                </div>

                <div
                  className="w-full aspect-[3/2] relative cursor-pointer mb-6"
                  style={{ perspective: '1000px' }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div
                    className="w-full h-full relative transition-transform duration-500"
                    style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                  >
                    <div
                      className="absolute inset-0 glass-panel flex flex-col items-center justify-center p-6 text-center border-white/20"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <Layers className="w-5 h-5 text-white/20 mb-4" />
                      <h3 className="text-lg font-bold text-white leading-relaxed">{cards[cardIndex].front}</h3>
                      <p className="text-xs text-white/30 mt-4">Tap to reveal</p>
                    </div>
                    <div
                      className="absolute inset-0 glass-panel flex flex-col items-center justify-center p-6 text-center border-primary/30 bg-primary/5"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-primary/60 mb-4" />
                      <p className="text-base text-white/90 leading-relaxed">{cards[cardIndex].back}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={handleNextCard}
                    className="flex-1 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    Next Card <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-1 mt-5">
                  {cards.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setIsFlipped(false); setCardIndex(i); }}
                      className={clsx(
                        'w-2 h-2 rounded-full transition-all',
                        i === cardIndex ? 'bg-primary w-6' : 'bg-white/20'
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'notebook' && (
          <div className="h-full">
            <NotebookTab />
          </div>
        )}
      </div>
    </div>
  );
}
