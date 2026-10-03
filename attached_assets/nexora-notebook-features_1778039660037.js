// ============================================================
// nexora-notebook-features.js
// 8 new features wired into the existing notebook system:
//   1. Auto-generate flashcards from notebook sources
//   2. Drag-and-drop source reordering
//   3. Global keyboard shortcuts
//   4. Podcast resume / progress tracking per notebook
//   5. Voice commands during podcast playback
//   6. Browser notifications when source processing completes
//   7. Multi-language podcast generation
//   8. Living Notebook — auto web-search missing answers
// ============================================================

// ══════════════════════════════════════════════════════════════════════
//  FEATURE 1 — Auto-generate flashcards from notebook sources
// ══════════════════════════════════════════════════════════════════════

async function generateFlashcardsFromNotebook() {
  if (!notebookSources || !notebookSources.length) {
    _nbToast('Add sources to your notebook first');
    return;
  }

  // Build combined text from all sources (up to 4000 chars total)
  const combined = notebookSources
    .map((s, i) => '[Source ' + (i+1) + '] ' + s.name + ':\n' + (s.text || '').slice(0, Math.floor(4000 / notebookSources.length)))
    .join('\n\n');

  const title = (document.getElementById('podcastTopicInput')?.value ||
                 document.getElementById('nbTitleInput')?.value || 'Notebook').trim();

  _nbToast('🃏 Generating flashcards…');

  // Switch to flashcard tab and pre-fill the topic
  if (typeof switchStudyTab === 'function') switchStudyTab('flashcard');

  const topicEl = document.getElementById('fcTopicInput');
  if (topicEl) topicEl.value = title + '\n\n' + combined.slice(0, 600);

  // Trigger generation
  if (typeof generateFlashcards === 'function') {
    await generateFlashcards();
  }
}

window.generateFlashcardsFromNotebook = generateFlashcardsFromNotebook;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE 2 — Drag-and-drop source reordering
// ══════════════════════════════════════════════════════════════════════

let _nbDragSrcId = null;

function _nbEnableDragDrop(container) {
  if (!container) return;

  container.addEventListener('dragstart', e => {
    const chip = e.target.closest('.nb-source-chip');
    if (!chip) return;
    _nbDragSrcId = chip.dataset.id;
    chip.classList.add('nb-dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragend', e => {
    const chip = e.target.closest('.nb-source-chip');
    if (chip) chip.classList.remove('nb-dragging');
    container.querySelectorAll('.nb-drag-over').forEach(el => el.classList.remove('nb-drag-over'));
  });

  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const chip = e.target.closest('.nb-source-chip');
    container.querySelectorAll('.nb-drag-over').forEach(el => el.classList.remove('nb-drag-over'));
    if (chip && chip.dataset.id !== _nbDragSrcId) chip.classList.add('nb-drag-over');
  });

  container.addEventListener('drop', e => {
    e.preventDefault();
    const targetChip = e.target.closest('.nb-source-chip');
    if (!targetChip || !_nbDragSrcId || targetChip.dataset.id === _nbDragSrcId) return;

    const fromIdx = notebookSources.findIndex(s => s.id === _nbDragSrcId);
    const toIdx   = notebookSources.findIndex(s => s.id === targetChip.dataset.id);
    if (fromIdx === -1 || toIdx === -1) return;

    // Reorder
    const [moved] = notebookSources.splice(fromIdx, 1);
    notebookSources.splice(toIdx, 0, moved);

    if (typeof renderNotebookSourceList === 'function') renderNotebookSourceList();
    if (typeof _syncNotebookTab === 'function') _syncNotebookTab();
    _nbToast('Sources reordered');
  });
}

// Patch renderNotebookSourceList to add draggable attrs and enable DnD
const _origRenderSourceList = window.renderNotebookSourceList;
window.renderNotebookSourceList = function() {
  if (typeof _origRenderSourceList === 'function') _origRenderSourceList();
  ['nbSourceListContainer', 'nbSourceListContainer2'].forEach(id => {
    const c = document.getElementById(id);
    if (!c) return;
    c.querySelectorAll('.nb-source-chip').forEach(chip => {
      chip.setAttribute('draggable', 'true');
    });
    _nbEnableDragDrop(c);
  });
};

// ══════════════════════════════════════════════════════════════════════
//  FEATURE 3 — Global keyboard shortcuts
// ══════════════════════════════════════════════════════════════════════
//  Ctrl/Cmd + Shift + N  → new notebook (clear sources)
//  Ctrl/Cmd + Shift + P  → play / pause podcast
//  Ctrl/Cmd + Shift + F  → generate flashcards from notebook
//  Ctrl/Cmd + Shift + S  → save current notebook
//  Space (podcast player visible) → play / pause
// ══════════════════════════════════════════════════════════════════════

function _nbIsMac() { return /Mac|iPhone|iPad/.test(navigator.platform); }

function _nbShortcutLabel(key) {
  return (_nbIsMac() ? '⌘' : 'Ctrl') + '+Shift+' + key;
}

document.addEventListener('keydown', function _nbKeyHandler(e) {
  const mod = _nbIsMac() ? e.metaKey : e.ctrlKey;

  // Ctrl/Cmd + Shift + N → new notebook
  if (mod && e.shiftKey && e.key === 'N') {
    e.preventDefault();
    if (typeof clearNotebookSources === 'function') {
      clearNotebookSources();
      const topicEl = document.getElementById('podcastTopicInput');
      if (topicEl) topicEl.value = '';
      if (typeof switchStudyTab === 'function') switchStudyTab('notebook');
      _nbToast('📓 New notebook (' + _nbShortcutLabel('N') + ')');
    }
    return;
  }

  // Ctrl/Cmd + Shift + S → save notebook
  if (mod && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    if (typeof saveCurrentNotebook === 'function') saveCurrentNotebook();
    return;
  }

  // Ctrl/Cmd + Shift + F → flashcards from notebook
  if (mod && e.shiftKey && e.key === 'F') {
    e.preventDefault();
    if (typeof generateFlashcardsFromNotebook === 'function') generateFlashcardsFromNotebook();
    return;
  }

  // Ctrl/Cmd + Shift + P → play/pause podcast
  if (mod && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    const player = document.getElementById('podcastPlayer');
    if (player && player.style.display !== 'none') {
      const pauseBtn = document.getElementById('podcastPauseBtn');
      if (pauseBtn && pauseBtn.style.display !== 'none') {
        if (typeof podcastPause === 'function') podcastPause();
      } else {
        if (typeof podcastPlay === 'function') podcastPlay();
      }
    }
    return;
  }

  // Space → play/pause when podcast player is visible and no input focused
  if (e.key === ' ' && document.activeElement.tagName !== 'INPUT' &&
      document.activeElement.tagName !== 'TEXTAREA') {
    const player = document.getElementById('podcastPlayer');
    if (player && player.style.display !== 'none') {
      e.preventDefault();
      const pauseBtn = document.getElementById('podcastPauseBtn');
      if (pauseBtn && pauseBtn.style.display !== 'none') {
        if (typeof podcastPause === 'function') podcastPause();
      } else {
        if (typeof podcastPlay === 'function') podcastPlay();
      }
    }
  }
});

// Show shortcut hints in the UI (called from initNotebook)
function _nbRenderShortcutHints() {
  const el = document.getElementById('nbShortcutHints');
  if (!el) return;
  const mod = _nbIsMac() ? '⌘' : 'Ctrl';
  el.innerHTML = [
    mod + '+Shift+N  New notebook',
    mod + '+Shift+S  Save',
    mod + '+Shift+F  Flashcards',
    mod + '+Shift+P  Play/Pause',
    'Space  Play/Pause (player)',
  ].map(s => '<span class="nb-shortcut-hint">' + s + '</span>').join('');
}

window._nbRenderShortcutHints = _nbRenderShortcutHints;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE 4 — Podcast resume / progress tracking per notebook
// ══════════════════════════════════════════════════════════════════════

const NB_PROGRESS_KEY = 'nexora_nb_progress'; // { [notebookId]: { lineIndex, pct, ts } }

function _nbSaveProgress(notebookId, lineIndex, pct) {
  if (!notebookId) return;
  try {
    const all = JSON.parse(localStorage.getItem(NB_PROGRESS_KEY) || '{}');
    all[notebookId] = { lineIndex, pct, ts: Date.now() };
    // Keep only last 30 entries
    const keys = Object.keys(all).sort((a, b) => (all[b].ts || 0) - (all[a].ts || 0));
    if (keys.length > 30) keys.slice(30).forEach(k => delete all[k]);
    localStorage.setItem(NB_PROGRESS_KEY, JSON.stringify(all));
  } catch(e) {}
}

function _nbLoadProgress(notebookId) {
  if (!notebookId) return null;
  try {
    const all = JSON.parse(localStorage.getItem(NB_PROGRESS_KEY) || '{}');
    return all[notebookId] || null;
  } catch(e) { return null; }
}

function _nbClearProgress(notebookId) {
  if (!notebookId) return;
  try {
    const all = JSON.parse(localStorage.getItem(NB_PROGRESS_KEY) || '{}');
    delete all[notebookId];
    localStorage.setItem(NB_PROGRESS_KEY, JSON.stringify(all));
  } catch(e) {}
}

// Hook into _podcastPlayNextBlob to auto-save position every 5 lines
let _nbProgressSaveCounter = 0;
const _origHighlight = window._highlightTranscriptLine;
window._highlightTranscriptLine = function(idx) {
  if (typeof _origHighlight === 'function') _origHighlight(idx);
  _nbProgressSaveCounter++;
  if (_nbProgressSaveCounter % 5 === 0 && window.currentNotebookId) {
    const total = window._podcastCurrentData?.lines?.length || 1;
    _nbSaveProgress(window.currentNotebookId, idx, Math.round((idx / total) * 100));
  }
};

// Show resume banner when loading a notebook that has saved progress
function _nbCheckResumeBanner() {
  const nbId = window.currentNotebookId;
  if (!nbId) return;
  const prog = _nbLoadProgress(nbId);
  if (!prog || prog.pct < 5) return; // nothing meaningful to resume

  let banner = document.getElementById('nbResumeBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'nbResumeBanner';
    banner.className = 'nb-resume-banner';
    const player = document.getElementById('podcastPlayer');
    if (player) player.insertAdjacentElement('afterbegin', banner);
  }
  banner.innerHTML =
    '<span>▶ Resume from ' + prog.pct + '%</span>' +
    '<button class="nb-resume-btn" onclick="_nbResumePlayback()">Resume</button>' +
    '<button class="nb-resume-dismiss" onclick="this.parentElement.remove()">✕</button>';
  banner.style.display = 'flex';
}

function _nbResumePlayback() {
  const nbId = window.currentNotebookId;
  const prog = _nbLoadProgress(nbId);
  if (!prog) return;

  const banner = document.getElementById('nbResumeBanner');
  if (banner) banner.remove();

  // Start playback from saved line index
  const data = window._podcastCurrentData;
  if (!data) return;

  const hasBlobs = (data.audioBlobs || []).filter(Boolean).length > 0;
  if (hasBlobs) {
    window._podcastBlobIndex = prog.lineIndex || 0;
    window._podcastPlaying   = true;
    if (typeof _podcastPlayNextBlob === 'function') _podcastPlayNextBlob();
  } else {
    if (typeof _podcastSpeakLines === 'function') _podcastSpeakLines(data.lines, prog.lineIndex || 0);
  }
  if (typeof _updatePodcastPlayerUI === 'function') _updatePodcastPlayerUI(true);
}

// Patch _podcastShowPlayer to check for resume
const _origShowPlayer = window._podcastShowPlayer;
window._podcastShowPlayer = function(hasBlobs, hasSynth) {
  if (typeof _origShowPlayer === 'function') _origShowPlayer(hasBlobs, hasSynth);
  setTimeout(_nbCheckResumeBanner, 400);
};

window._nbSaveProgress    = _nbSaveProgress;
window._nbLoadProgress    = _nbLoadProgress;
window._nbClearProgress   = _nbClearProgress;
window._nbResumePlayback  = _nbResumePlayback;
window._nbCheckResumeBanner = _nbCheckResumeBanner;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE 5 — Voice commands during podcast playback
// ══════════════════════════════════════════════════════════════════════
//  Commands: "pause", "play", "stop", "rewind", "faster", "slower",
//            "what did they say" (repeats last line), "ask <question>"

let _nbVoiceCmdActive = false;
let _nbVoiceRecog     = null;

function startPodcastVoiceCommands() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    _nbToast('Voice commands not supported in this browser');
    return;
  }
  if (_nbVoiceCmdActive) {
    stopPodcastVoiceCommands();
    return;
  }

  _nbVoiceRecog = new SR();
  _nbVoiceRecog.continuous  = true;
  _nbVoiceRecog.interimResults = false;
  _nbVoiceRecog.lang        = 'en-US';

  _nbVoiceRecog.onresult = e => {
    const transcript = e.results[e.results.length - 1][0].transcript.trim().toLowerCase();
    _nbHandleVoiceCommand(transcript);
  };

  _nbVoiceRecog.onerror = err => {
    if (err.error !== 'no-speech') {
      _nbToast('Voice error: ' + err.error);
      stopPodcastVoiceCommands();
    }
  };

  _nbVoiceRecog.onend = () => {
    // Auto-restart if still active
    if (_nbVoiceCmdActive) {
      try { _nbVoiceRecog.start(); } catch(e) {}
    }
  };

  _nbVoiceRecog.start();
  _nbVoiceCmdActive = true;
  _nbUpdateVoiceBtn(true);
  _nbToast('🎤 Voice commands on — say "pause", "play", "rewind", "ask <question>"');
}

function stopPodcastVoiceCommands() {
  _nbVoiceCmdActive = false;
  if (_nbVoiceRecog) {
    try { _nbVoiceRecog.stop(); } catch(e) {}
    _nbVoiceRecog = null;
  }
  _nbUpdateVoiceBtn(false);
  _nbToast('🎤 Voice commands off');
}

function _nbHandleVoiceCommand(cmd) {
  if (cmd.includes('pause') || cmd.includes('stop')) {
    if (typeof podcastPause === 'function') podcastPause();
    _nbToast('⏸ Paused');
    return;
  }
  if (cmd.includes('play') || cmd.includes('resume') || cmd.includes('continue')) {
    if (typeof podcastPlay === 'function') podcastPlay();
    _nbToast('▶ Playing');
    return;
  }
  if (cmd.includes('rewind') || cmd.includes('go back') || cmd.includes('repeat')) {
    // Go back 3 lines
    if (window._podcastBlobIndex !== undefined) {
      window._podcastBlobIndex = Math.max(0, (window._podcastBlobIndex || 0) - 3);
    }
    if (typeof podcastPlay === 'function') { podcastPause && podcastPause(); setTimeout(podcastPlay, 100); }
    _nbToast('⏪ Rewound 3 lines');
    return;
  }
  if (cmd.includes('faster') || cmd.includes('speed up')) {
    const sel = document.getElementById('podcastSpeed');
    if (sel) {
      const vals = ['0.8','1','1.25','1.5','2'];
      const cur  = vals.indexOf(sel.value);
      if (cur < vals.length - 1) { sel.value = vals[cur + 1]; if (typeof podcastSetSpeed === 'function') podcastSetSpeed(sel.value); }
    }
    _nbToast('⏩ Speed up');
    return;
  }
  if (cmd.includes('slower') || cmd.includes('slow down')) {
    const sel = document.getElementById('podcastSpeed');
    if (sel) {
      const vals = ['0.8','1','1.25','1.5','2'];
      const cur  = vals.indexOf(sel.value);
      if (cur > 0) { sel.value = vals[cur - 1]; if (typeof podcastSetSpeed === 'function') podcastSetSpeed(sel.value); }
    }
    _nbToast('🐢 Slowed down');
    return;
  }
  if (cmd.includes('what did') || cmd.includes('say again') || cmd.includes('repeat that')) {
    // Repeat current line
    const idx  = (window._podcastBlobIndex || 1) - 1;
    const line = window._podcastCurrentData?.lines?.[idx];
    if (line) _nbToast('"' + line.text.slice(0, 80) + '…"');
    return;
  }
  // "ask <question>" → pipe to RAG
  const askMatch = cmd.match(/^(?:ask|question|what is|what are|how|why|when|where|who)(.+)/);
  if (askMatch) {
    const question = cmd.replace(/^ask\s*/i, '').trim();
    if (question && typeof askNotebook === 'function') {
      if (typeof podcastPause === 'function') podcastPause();
      askNotebook(question);
      _nbToast('🧠 Asking: "' + question.slice(0, 40) + '"');
    }
  }
}

function _nbUpdateVoiceBtn(active) {
  const btn = document.getElementById('nbVoiceCmdBtn');
  if (!btn) return;
  btn.textContent = active ? '🎤 Stop Voice' : '🎤 Voice';
  btn.classList.toggle('nb-voice-active', active);
}

window.startPodcastVoiceCommands = startPodcastVoiceCommands;
window.stopPodcastVoiceCommands  = stopPodcastVoiceCommands;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE 6 — Browser notifications when source processing completes
// ══════════════════════════════════════════════════════════════════════

async function _nbRequestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function _nbNotify(title, body, icon) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body: body || '',
      icon: icon || '/icon.svg',
      badge: '/icon.svg',
      tag: 'nexora-notebook',
    });
  } catch(e) {}
}

// Patch addNotebookSource to fire a notification when done
const _origAddSource = window.addNotebookSource;
window.addNotebookSource = async function(file) {
  // Request permission on first upload (non-blocking)
  _nbRequestNotificationPermission();

  const result = await _origAddSource(file);

  // Notify if page is not visible
  if (document.hidden) {
    _nbNotify(
      'Source ready — ' + file.name,
      'Text extracted and ready for your notebook.',
      '/icon.svg'
    );
  }
  return result;
};

// Notify when podcast generation finishes
const _origShowPlayer2 = window._podcastShowPlayer;
window._podcastShowPlayer = function(hasBlobs, hasSynth) {
  if (typeof _origShowPlayer2 === 'function') _origShowPlayer2(hasBlobs, hasSynth);
  if (document.hidden) {
    const title = window._podcastCurrentData?.title || 'Podcast ready';
    _nbNotify('🎧 ' + title, 'Your podcast is ready to play!');
  }
};

window._nbNotify = _nbNotify;
window._nbRequestNotificationPermission = _nbRequestNotificationPermission;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE 7 — Multi-language podcast generation
// ══════════════════════════════════════════════════════════════════════
//  Uses MyMemory (already in app.js) to translate the script before TTS.
//  Language selector added to the podcast setup panel via initNotebook.

const NB_LANG_CODES = {
  english:    null,   // no translation needed
  bangla:     'bn',
  hindi:      'hi',
  spanish:    'es',
  french:     'fr',
  arabic:     'ar',
  portuguese: 'pt',
  german:     'de',
  japanese:   'ja',
  chinese:    'zh',
};

async function _nbTranslateLine(text, targetLangCode) {
  if (!targetLangCode) return text;
  try {
    const url = 'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(text.slice(0, 500)) + '&langpair=en|' + targetLangCode;
    const res = await fetch(url);
    const d   = await res.json();
    if (d.responseStatus === 200 && d.responseData?.translatedText) {
      return d.responseData.translatedText;
    }
  } catch(e) {}
  return text; // fallback to original
}

async function translatePodcastScript(lines, targetLang) {
  const code = NB_LANG_CODES[targetLang];
  if (!code) return lines; // English — no-op

  _nbToast('🌐 Translating to ' + targetLang + '…');
  const translated = [];
  for (const line of lines) {
    const tText = await _nbTranslateLine(line.text, code);
    translated.push({ ...line, text: tText });
  }
  return translated;
}

// Patch generatePodcast to apply translation after script generation
// We hook into _podcastShowPlayer: by that point _podcastCurrentData.lines is set
const _origShowPlayerLang = window._podcastShowPlayer;
window._podcastShowPlayer = async function(hasBlobs, hasSynth) {
  const langSel = document.getElementById('nbPodcastLang');
  const lang    = langSel?.value || 'english';

  if (lang !== 'english' && window._podcastCurrentData?.lines?.length) {
    const translated = await translatePodcastScript(window._podcastCurrentData.lines, lang);
    window._podcastCurrentData.lines = translated;
  }

  if (typeof _origShowPlayerLang === 'function') _origShowPlayerLang(hasBlobs, hasSynth);
};

window.translatePodcastScript = translatePodcastScript;
window.NB_LANG_CODES          = NB_LANG_CODES;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE 8 — Living Notebook (auto web-search missing answers)
// ══════════════════════════════════════════════════════════════════════
//  When the AI says it couldn't find the answer in sources, Nexora
//  automatically searches DuckDuckGo (already in app.js) and appends
//  the result as a new "Web: <query>" source to the notebook.

const NB_CANT_FIND_PHRASES = [
  "couldn't find",
  "not in the",
  "not mentioned",
  "no information",
  "not available in",
  "not covered",
  "outside the scope",
  "not provided",
];

function _nbAnswerLacksInfo(answer) {
  const lower = (answer || '').toLowerCase();
  return NB_CANT_FIND_PHRASES.some(p => lower.includes(p));
}

async function _nbWebSearchAndAppend(question) {
  _nbToast('🌐 Searching the web for: "' + question.slice(0, 40) + '"…');

  let webText = '';

  // Try CF Worker /search first
  if (typeof _hasCFWorker === 'function' && _hasCFWorker() &&
      typeof _getCFWorkerUrl === 'function') {
    try {
      const res = await fetch(_getCFWorkerUrl() + '/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: question }),
      });
      if (res.ok) {
        const d = await res.json();
        webText = d.text || d.result || d.answer || '';
      }
    } catch(e) {}
  }

  // Fallback: DuckDuckGo instant answers
  if (!webText && typeof getDuckDuckGoResults === 'function') {
    try {
      const html = await getDuckDuckGoResults(question);
      // Strip HTML tags for plain text
      webText = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
    } catch(e) {}
  }

  // Last resort: direct DuckDuckGo API
  if (!webText) {
    try {
      const res = await fetch(
        'https://api.duckduckgo.com/?q=' + encodeURIComponent(question) +
        '&format=json&no_html=1&skip_disambig=1'
      );
      const d = await res.json();
      webText = [d.AbstractText, ...(d.RelatedTopics || []).map(t => t.Text)]
        .filter(Boolean).join(' ').slice(0, 2000);
    } catch(e) {}
  }

  if (!webText) {
    _nbToast('🌐 No web results found for that question');
    return;
  }

  // Create a synthetic source
  const webSource = {
    id:     'web_' + Date.now(),
    name:   'Web: ' + question.slice(0, 50),
    text:   webText,
    kind:   'web',
    size:   webText.length,
    chunks: typeof chunkText === 'function' ? chunkText(webText) : [webText],
  };

  notebookSources.push(webSource);
  if (typeof renderNotebookSourceList === 'function') renderNotebookSourceList();
  if (typeof _syncNotebookTab === 'function') _syncNotebookTab();
  _nbToast('🌐 Web result added as source [' + notebookSources.length + ']');

  // Auto-save the updated notebook
  if (typeof saveCurrentNotebook === 'function') saveCurrentNotebook();

  return webSource;
}

// Patch askNotebook to trigger web search when AI can't answer
const _origAskNotebook = window.askNotebook;
window.askNotebook = async function(question) {
  await _origAskNotebook(question);

  // Check the last answer rendered in either RAG area
  const ragArea = document.getElementById('nbRagAnswerArea') ||
                  document.getElementById('nbRagAnswerArea2');
  const answerText = ragArea?.querySelector('.nb-rag-answer-text')?.innerText || '';

  if (_nbAnswerLacksInfo(answerText)) {
    // Show a "Search web?" prompt instead of auto-searching
    const ragAreas = ['nbRagAnswerArea', 'nbRagAnswerArea2']
      .map(id => document.getElementById(id))
      .filter(Boolean);

    ragAreas.forEach(area => {
      const existing = area.querySelector('.nb-web-search-prompt');
      if (existing) existing.remove();

      const prompt = document.createElement('div');
      prompt.className = 'nb-web-search-prompt';
      prompt.innerHTML =
        '<span>🌐 Not found in sources.</span>' +
        '<button class="nb-web-search-btn">Search web & add to notebook</button>';
      prompt.querySelector('.nb-web-search-btn').addEventListener('click', async () => {
        prompt.remove();
        const newSrc = await _nbWebSearchAndAppend(question);
        if (newSrc) {
          // Re-ask with the new source included
          await _origAskNotebook(question);
        }
      });
      area.appendChild(prompt);
    });
  }
};

window._nbWebSearchAndAppend = _nbWebSearchAndAppend;
window._nbAnswerLacksInfo    = _nbAnswerLacksInfo;

// ══════════════════════════════════════════════════════════════════════
//  INIT PATCH — extend initNotebook to wire up new features
// ══════════════════════════════════════════════════════════════════════

const _origInitNotebook = window.initNotebook;
window.initNotebook = function() {
  if (typeof _origInitNotebook === 'function') _origInitNotebook();

  // Render keyboard shortcut hints
  if (typeof _nbRenderShortcutHints === 'function') _nbRenderShortcutHints();

  // Wire voice command button
  const voiceBtn = document.getElementById('nbVoiceCmdBtn');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      if (typeof startPodcastVoiceCommands === 'function') startPodcastVoiceCommands();
    });
  }

  // Wire flashcards-from-notebook button
  const fcBtn = document.getElementById('nbMakeFlashcardsBtn');
  if (fcBtn) {
    fcBtn.addEventListener('click', () => {
      if (typeof generateFlashcardsFromNotebook === 'function') generateFlashcardsFromNotebook();
    });
  }

  // Wire language selector change
  const langSel = document.getElementById('nbPodcastLang');
  if (langSel) {
    langSel.addEventListener('change', () => {
      const lang = langSel.value;
      if (lang !== 'english') _nbToast('🌐 Podcast will be translated to ' + lang);
    });
  }

  // Request notification permission silently on first init
  if (typeof _nbRequestNotificationPermission === 'function') {
    _nbRequestNotificationPermission();
  }
};

// Also expose new globals
window.generateFlashcardsFromNotebook = generateFlashcardsFromNotebook;
