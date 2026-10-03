// ============================================================
// nexora-notebook.js  — v2
// NotebookLM-style feature for Nexora Study Mode
//
// Features:
//   1. Multi-source upload per notebook (files, images, text)
//   2. Persistent notebook store (save / load / delete)
//   3. Multi-source podcast generation with progress queue
//   4. Smart chunking + keyword-ranked RAG Chat
//   5. Source chip highlighting when AI cites [N]
//   6. Export notebook as Markdown
// ============================================================

// ── Constants ────────────────────────────────────────────────────────
const NOTEBOOK_STORE_KEY  = 'nexora_notebooks';
const NOTEBOOK_MAX        = 20;
const NOTEBOOK_MAX_CHARS  = 40000; // per source (full text, chunked at query time)
const NOTEBOOK_CHUNK_SIZE = 2000;  // chars per RAG chunk
const NOTEBOOK_TOP_CHUNKS = 6;     // how many chunks to pass to AI
const NOTEBOOK_CTX_LIMIT  = 14000; // hard cap on total context sent to AI

// ── Q&A history per session ──────────────────────────────────────────
let _nbQAHistory = []; // { question, answer, ts }

// ── State ────────────────────────────────────────────────────────────
let notebookSources      = []; // { id, name, text, kind, size, chunks[] }
let currentNotebookId    = null;
let _notebookInitDone    = false;
let _nbGenerating        = false; // podcast generation lock

// ─────────────────────────────────────────────────────────────────────
//  UTILITY
// ─────────────────────────────────────────────────────────────────────

function _nbEsc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _nbToast(msg) {
  if (typeof _showStudyToast === 'function') {
    _showStudyToast(msg);
  } else {
    const t = document.getElementById('copyToast');
    if (t) {
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    }
  }
}

function _nbTimeAgo(ts) {
  if (typeof _timeAgo === 'function') return _timeAgo(ts);
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

// ─────────────────────────────────────────────────────────────────────
//  SMART CHUNKING + KEYWORD RETRIEVAL
// ─────────────────────────────────────────────────────────────────────

/**
 * Split text into ~maxLen-char chunks, respecting sentence boundaries.
 * Returns array of strings.
 */
function chunkText(text, maxLen = NOTEBOOK_CHUNK_SIZE) {
  if (!text || text.length <= maxLen) return [text];
  // Split on sentence-ending punctuation followed by whitespace
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if (current.length + s.length + 1 > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += (current ? ' ' : '') + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}

/**
 * Score a chunk against a question using keyword overlap.
 * Returns a number 0–1.
 */
function _nbScoreChunk(chunk, question) {
  const stopWords = new Set(['the','a','an','is','are','was','were','be','been',
    'have','has','had','do','does','did','will','would','could','should','may',
    'might','shall','can','of','in','on','at','to','for','with','by','from',
    'and','or','but','not','what','how','why','when','where','who','which']);
  const words = question.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  if (!words.length) return 0;
  const lower = chunk.toLowerCase();
  const hits  = words.filter(w => lower.includes(w)).length;
  return hits / words.length;
}

/**
 * Given a question, return the top-N most relevant chunks across all sources,
 * each tagged with its source index.
 * Returns: [{ sourceIdx, chunkIdx, text, score }]
 */
function _nbRetrieveChunks(question, topN = NOTEBOOK_TOP_CHUNKS) {
  const scored = [];
  notebookSources.forEach((src, si) => {
    const chunks = src.chunks || chunkText(src.text || '');
    chunks.forEach((chunk, ci) => {
      scored.push({
        sourceIdx: si,
        chunkIdx:  ci,
        text:      chunk,
        score:     _nbScoreChunk(chunk, question),
      });
    });
  });
  // Sort by score desc, then take topN; always include at least one chunk per source
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const result = [];
  // First pass: top scored
  for (const item of scored) {
    if (result.length >= topN) break;
    result.push(item);
    seen.add(item.sourceIdx);
  }
  // Second pass: ensure every source has at least one chunk represented
  for (let si = 0; si < notebookSources.length; si++) {
    if (!seen.has(si)) {
      const fallback = scored.find(c => c.sourceIdx === si);
      if (fallback) result.push(fallback);
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────
//  SOURCE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

function renderNotebookSourceList() {
  const container = document.getElementById('nbSourceListContainer');
  if (!container) return;

  if (!notebookSources.length) {
    container.innerHTML = `
      <div class="nb-sources-empty">
        <span>📂</span>
        <span>No sources yet — add files to build your notebook</span>
      </div>`;
    return;
  }

  container.innerHTML = notebookSources.map(src => `
    <div class="nb-source-chip" data-id="${src.id}">
      <span class="nb-source-chip-icon">${src.kind === 'image' ? '🖼️' : '📄'}</span>
      <span class="nb-source-chip-name" title="${_nbEsc(src.name)}">${_nbEsc(src.name)}</span>
      <span class="nb-source-chip-size">${Math.max(1, Math.round((src.size || 0) / 1024))}KB</span>
      <button class="nb-source-remove" data-id="${src.id}" title="Remove source">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.nb-source-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      notebookSources = notebookSources.filter(s => s.id !== id);
      renderNotebookSourceList();
      _updateNotebookGenerateBtn();
    });
  });
}

async function addNotebookSource(file) {
  const id   = `src_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const kind = (file.type || '').startsWith('image/') ? 'image' : 'document';
  let text   = '';

  // Optimistic render with loading state
  notebookSources.push({ id, name: file.name, text: '…', kind, size: file.size });
  renderNotebookSourceList();

  try {
    if (kind === 'image') {
      // Try vision AI first
      if (typeof callVisionAI === 'function' &&
          typeof nexoraResponseMode !== 'undefined' && nexoraResponseMode === 'online') {
        try {
          const v = await callVisionAI(file, 'Extract all readable text from this image for study notes. Return plain text only.');
          if (v && v.trim()) text = v.trim();
        } catch(e) {}
      }
      // Tesseract fallback
      if (!text && typeof ensureTesseract === 'function') {
        try {
          await ensureTesseract();
          const { data: { text: ocrText } } = await window.Tesseract.recognize(file, 'eng', { logger: () => {} });
          if (ocrText && ocrText.trim()) text = ocrText.trim();
        } catch(e) {}
      }
      if (!text) text = '[Image — no readable text extracted]';
    } else {
      // Plain text / PDF
      if (typeof _readFileAsText === 'function') {
        text = String(await _readFileAsText(file) || '').trim();
      } else {
        text = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload  = e => res(e.target.result || '');
          r.onerror = () => rej(new Error('Read failed'));
          r.readAsText(file);
        });
      }
      if (!text) text = '[Could not extract text from this file]';
    }
  } catch(err) {
    console.warn('[Notebook] Source extraction failed', err);
    text = '[Error extracting text]';
  }

  // Update the placeholder entry with full text + pre-computed chunks
  const idx = notebookSources.findIndex(s => s.id === id);
  if (idx !== -1) {
    const fullText = text.slice(0, NOTEBOOK_MAX_CHARS);
    notebookSources[idx].text   = fullText;
    notebookSources[idx].chunks = chunkText(fullText);
  }

  renderNotebookSourceList();
  _updateNotebookGenerateBtn();
  _nbToast(`✅ Added "${file.name}"`);
}

function clearNotebookSources() {
  notebookSources = [];
  renderNotebookSourceList();
  _updateNotebookGenerateBtn();
  _nbToast('All sources cleared');
}

function _updateNotebookGenerateBtn() {
  const btn = document.getElementById('nbGeneratePodcastBtn');
  if (!btn) return;
  const hasSources = notebookSources.length > 0;
  const hasTopic   = (document.getElementById('podcastTopicInput')?.value || '').trim().length > 0;
  btn.disabled = !hasSources && !hasTopic;
}

// ─────────────────────────────────────────────────────────────────────
//  NOTEBOOK STORAGE
// ─────────────────────────────────────────────────────────────────────

function _nbGetAll() {
  try {
    return (window.NexoraData?.getJSON
      ? NexoraData.getJSON(NOTEBOOK_STORE_KEY, [])
      : JSON.parse(localStorage.getItem(NOTEBOOK_STORE_KEY) || '[]')) || [];
  } catch(e) { return []; }
}

function _nbSetAll(notebooks) {
  try {
    if (window.NexoraData?.setJSON) NexoraData.setJSON(NOTEBOOK_STORE_KEY, notebooks);
    else localStorage.setItem(NOTEBOOK_STORE_KEY, JSON.stringify(notebooks));
  } catch(e) {}
}

function saveCurrentNotebook() {
  if (!notebookSources.length) {
    _nbToast('Add at least one source before saving');
    return;
  }
  const title = (document.getElementById('podcastTopicInput')?.value || '').trim() || 'My Notebook';
  const notebook = {
    id:        currentNotebookId || `nb_${Date.now()}`,
    title,
    sources:   notebookSources.map(s => ({
      id: s.id, name: s.name, text: s.text, kind: s.kind, size: s.size
    })),
    createdAt: currentNotebookId
      ? (_nbGetAll().find(n => n.id === currentNotebookId)?.createdAt || Date.now())
      : Date.now(),
    updatedAt: Date.now(),
  };

  const notebooks = _nbGetAll();
  const existingIdx = notebooks.findIndex(n => n.id === notebook.id);
  if (existingIdx !== -1) notebooks[existingIdx] = notebook;
  else notebooks.unshift(notebook);
  if (notebooks.length > NOTEBOOK_MAX) notebooks.pop();
  _nbSetAll(notebooks);

  currentNotebookId = notebook.id;
  _nbToast(`💾 Notebook "${title}" saved`);
  renderNotebookLibrary();
}

function deleteNotebook(notebookId) {
  const notebooks = _nbGetAll().filter(n => n.id !== notebookId);
  _nbSetAll(notebooks);
  if (currentNotebookId === notebookId) {
    currentNotebookId = null;
    notebookSources   = [];
    renderNotebookSourceList();
    const topicEl = document.getElementById('podcastTopicInput');
    if (topicEl) topicEl.value = '';
  }
  renderNotebookLibrary();
  _nbToast('Notebook deleted');
}

function loadNotebook(notebook) {
  notebookSources = (notebook.sources || []).map(s => ({
    ...s,
    // Rebuild chunks if not stored (older saves won't have them)
    chunks: s.chunks || chunkText(s.text || ''),
  }));
  currentNotebookId = notebook.id;
  const topicEl = document.getElementById('podcastTopicInput');
  if (topicEl) topicEl.value = notebook.title || '';
  renderNotebookSourceList();
  _updateNotebookGenerateBtn();
  _nbToast(`📓 Loaded "${notebook.title || 'Untitled'}"`);

  // Collapse the library panel after loading
  const libPanel = document.getElementById('nbLibraryPanel');
  if (libPanel) libPanel.style.display = 'none';
}

function renderNotebookLibrary() {
  const container = document.getElementById('nbLibraryList');
  if (!container) return;
  const notebooks = _nbGetAll();

  if (!notebooks.length) {
    container.innerHTML = `
      <div class="nb-lib-empty">No saved notebooks yet. Add sources and save to create one.</div>`;
    return;
  }

  container.innerHTML = notebooks.map(nb => `
    <div class="nb-lib-item" data-id="${nb.id}">
      <div class="nb-lib-item-icon">📓</div>
      <div class="nb-lib-item-meta">
        <div class="nb-lib-item-title">${_nbEsc(nb.title || 'Untitled')}</div>
        <div class="nb-lib-item-sub">${(nb.sources || []).length} sources · ${_nbTimeAgo(nb.updatedAt || nb.createdAt)}</div>
      </div>
      <div class="nb-lib-item-actions">
        <button class="nb-lib-load-btn" data-id="${nb.id}">Load</button>
        <button class="nb-lib-del-btn"  data-id="${nb.id}" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.nb-lib-load-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const nb = _nbGetAll().find(n => n.id === btn.dataset.id);
      if (nb) loadNotebook(nb);
    });
  });

  container.querySelectorAll('.nb-lib-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this notebook?')) deleteNotebook(btn.dataset.id);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────
//  MULTI-SOURCE PODCAST GENERATION  (with progress queue)
// ─────────────────────────────────────────────────────────────────────

async function generateNotebookPodcast() {
  if (_nbGenerating) {
    _nbToast('⏳ Already generating — please wait');
    return;
  }

  // Build combined source text
  let combinedText = '';
  const sourceLabels = [];

  if (notebookSources.length > 0) {
    notebookSources.forEach((src, i) => {
      const label = `Source ${i + 1}: ${src.name}`;
      sourceLabels.push(label);
      // Use first 3000 chars per source to stay within limits while covering all sources
      const excerpt = (src.text || '').slice(0, Math.floor(12000 / notebookSources.length));
      combinedText += `--- ${label} ---\n${excerpt}\n\n`;
    });
  }

  const topicEl = document.getElementById('podcastTopicInput');
  const topic   = (topicEl?.value || '').trim();

  if (!combinedText && !topic) {
    _nbToast('Add sources or enter a topic first');
    return;
  }

  // Show progress UI
  _nbGenerating = true;
  _nbShowGenerationProgress(notebookSources.length);

  try {
    // Auto-save notebook before generating
    if (notebookSources.length > 0) {
      _nbUpdateProgress('💾 Saving notebook…', 5);
      saveCurrentNotebook();
    }

    _nbUpdateProgress('🧠 Building script from sources…', 20);

    // Delegate to the existing generatePodcast() with combined text
    if (typeof generatePodcast === 'function') {
      await generatePodcast({
        topic:  topic || (notebookSources[0]?.name?.replace(/\.[^.]+$/, '') || 'Notebook'),
        text:   combinedText.slice(0, 12000),
        title:  `📓 ${topic || 'Notebook Podcast'}`,
        sourceLabels,
      });
    }
  } catch(err) {
    _nbToast('❌ Generation failed: ' + (err.message || 'Unknown error'));
  } finally {
    _nbGenerating = false;
    _nbHideGenerationProgress();
  }
}

/** Show a lightweight progress bar above the generate button */
function _nbShowGenerationProgress(sourceCount) {
  let bar = document.getElementById('nbGenProgressWrap');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'nbGenProgressWrap';
    bar.className = 'nb-gen-progress-wrap';
    bar.innerHTML = `
      <div class="nb-gen-progress-label" id="nbGenProgressLabel">Preparing…</div>
      <div class="nb-gen-progress-track">
        <div class="nb-gen-progress-fill" id="nbGenProgressFill" style="width:0%"></div>
      </div>
      <div class="nb-gen-progress-sub" id="nbGenProgressSub">${sourceCount} source${sourceCount !== 1 ? 's' : ''} · building podcast</div>`;
    const genBtn = document.getElementById('nbGeneratePodcastBtn');
    genBtn?.parentNode?.insertBefore(bar, genBtn);
  }
  bar.style.display = 'block';
  const genBtn = document.getElementById('nbGeneratePodcastBtn');
  if (genBtn) genBtn.disabled = true;
}

function _nbUpdateProgress(label, pct) {
  const labelEl = document.getElementById('nbGenProgressLabel');
  const fillEl  = document.getElementById('nbGenProgressFill');
  if (labelEl) labelEl.textContent = label;
  if (fillEl)  fillEl.style.width  = pct + '%';
}

function _nbHideGenerationProgress() {
  const bar = document.getElementById('nbGenProgressWrap');
  if (bar) bar.style.display = 'none';
  const genBtn = document.getElementById('nbGeneratePodcastBtn');
  if (genBtn) genBtn.disabled = false;
}

// ─────────────────────────────────────────────────────────────────────
//  RAG CHAT  (smart chunking + source highlighting)
// ─────────────────────────────────────────────────────────────────────

async function askNotebook(question) {
  if (!question || !question.trim()) return;

  // Determine which answer area to use (player tab vs standalone tab)
  const activePanel = document.querySelector('.study-panel.active');
  const isStandalone = activePanel?.id === 'spanel-notebook';
  const ragAreaId = isStandalone ? 'nbRagAnswerArea2' : 'nbRagAnswerArea';
  const askBtnId  = isStandalone ? null : 'nbAskRagBtn';
  const inputId   = isStandalone ? 'nbRagQuestionInput2' : 'nbRagQuestionInput';

  const ragArea = document.getElementById(ragAreaId);
  const askBtn  = askBtnId ? document.getElementById(askBtnId) : null;
  const input   = document.getElementById(inputId);
  if (!ragArea) return;

  // Build context using smart chunking
  let context = '';
  let usedChunks = [];

  if (notebookSources.length > 0) {
    usedChunks = _nbRetrieveChunks(question.trim());
    let ctxLen = 0;
    for (const chunk of usedChunks) {
      const line = `[Source ${chunk.sourceIdx + 1}] ${notebookSources[chunk.sourceIdx].name}:\n${chunk.text}\n\n`;
      if (ctxLen + line.length > NOTEBOOK_CTX_LIMIT) break;
      context += line;
      ctxLen  += line.length;
    }
  } else {
    // Fall back to current podcast transcript
    const transcriptEl = document.getElementById('podcastTranscript');
    if (transcriptEl) context = `[Transcript]:\n${transcriptEl.innerText || ''}`;
  }

  if (!context.trim()) {
    _nbToast('No sources loaded. Add files or generate a podcast first.');
    return;
  }

  ragArea.style.display = 'block';
  ragArea.innerHTML = `<div class="nb-rag-thinking"><span class="nb-rag-spinner"></span> Thinking…</div>`;
  if (askBtn) askBtn.disabled = true;
  if (input)  input.disabled  = true;

  // Highlight source chips that are being queried
  const queriedSourceIdxs = [...new Set(usedChunks.map(c => c.sourceIdx))];
  _nbHighlightSources(queriedSourceIdxs);

  const systemPrompt = `You are a study assistant. Answer ONLY based on the provided source excerpts. If the answer is not in the sources, say "I couldn't find that in the uploaded materials." Cite the source number [1], [2], etc. where you found the information. Be concise and clear.`;
  const userPrompt   = `Source excerpts:\n${context}\nQuestion: ${question.trim()}`;

  try {
    let answer = '';
    if (typeof callStudyAI === 'function') {
      answer = await callStudyAI(systemPrompt, userPrompt);
    } else {
      answer = await _nbFallbackAI(systemPrompt, userPrompt);
    }
    if (!answer) throw new Error('No answer returned');

    // Save to Q&A history
    _nbQAHistory.push({ question: question.trim(), answer, ts: Date.now() });

    // Highlight cited sources from the answer text
    const citedIdxs = _nbParseCitations(answer);
    if (citedIdxs.length) _nbHighlightSources(citedIdxs, true);

    ragArea.innerHTML = `
      <div class="nb-rag-answer">
        <div class="nb-rag-answer-text">${_nbFormatAnswer(answer)}</div>
        <div class="nb-rag-answer-actions">
          <button class="nb-rag-copy-btn">📋 Copy</button>
          <span class="nb-rag-chunks-hint">${usedChunks.length} chunk${usedChunks.length !== 1 ? 's' : ''} searched</span>
        </div>
      </div>`;

    ragArea.querySelector('.nb-rag-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(answer).then(() => _nbToast('Copied!'));
    });

  } catch(err) {
    ragArea.innerHTML = `<div class="nb-rag-error">❌ Failed to get answer. Check your API key or try again.</div>`;
  } finally {
    if (askBtn) askBtn.disabled = false;
    if (input)  input.disabled  = false;
  }
}

/**
 * Parse citation numbers like [1], [2], [Source 3] from AI answer text.
 * Returns array of 0-based source indices.
 */
function _nbParseCitations(text) {
  const idxs = new Set();
  const matches = text.matchAll(/\[(?:Source\s*)?(\d+)\]/gi);
  for (const m of matches) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= notebookSources.length) idxs.add(n - 1);
  }
  return [...idxs];
}

/**
 * Highlight source chips at given 0-based indices.
 * If `cited` is true, uses the citation highlight style; otherwise the query style.
 */
function _nbHighlightSources(indices, cited = false) {
  // Both containers (podcast tab + standalone tab)
  ['nbSourceListContainer', 'nbSourceListContainer2'].forEach(containerId => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.nb-source-chip').forEach((chip, i) => {
      chip.classList.remove('nb-source-queried', 'nb-source-cited');
      if (indices.includes(i)) {
        chip.classList.add(cited ? 'nb-source-cited' : 'nb-source-queried');
        // Auto-remove highlight after 3s
        setTimeout(() => {
          chip.classList.remove('nb-source-queried', 'nb-source-cited');
        }, 3000);
      }
    });
  });
}

/** Format AI answer: linkify [N] citations as highlighted spans */
function _nbFormatAnswer(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\[(\d+)\]/g, '<span class="nb-citation">[<strong>$1</strong>]</span>')
    .replace(/\n/g, '<br>');
}

// ─────────────────────────────────────────────────────────────────────
//  MARKDOWN EXPORT
// ─────────────────────────────────────────────────────────────────────

function exportNotebookAsMarkdown() {
  if (!notebookSources.length && !_nbQAHistory.length) {
    _nbToast('Nothing to export yet — add sources or ask questions first');
    return;
  }

  const title = (document.getElementById('podcastTopicInput')?.value ||
                 document.getElementById('nbTitleInput')?.value || 'My Notebook').trim();
  const now   = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

  let md = `# 📓 ${title}\n\n_Exported from Nexora Notebook · ${now}_\n\n---\n\n`;

  // Sources
  if (notebookSources.length) {
    md += `## 📎 Sources (${notebookSources.length})\n\n`;
    notebookSources.forEach((src, i) => {
      md += `### [${i + 1}] ${src.name}\n`;
      md += `> _${src.kind} · ${Math.max(1, Math.round((src.size || 0) / 1024))} KB · ${(src.text || '').length.toLocaleString()} chars_\n\n`;
      // Include first 800 chars as a preview
      const preview = (src.text || '').slice(0, 800).replace(/\n{3,}/g, '\n\n');
      md += preview + (src.text?.length > 800 ? '\n\n_…[truncated]_' : '') + '\n\n';
    });
    md += '---\n\n';
  }

  // Podcast script (if available)
  const transcriptEl = document.getElementById('podcastTranscript');
  if (transcriptEl && transcriptEl.innerText.trim()) {
    md += `## 🎧 Podcast Transcript\n\n`;
    const lines = transcriptEl.querySelectorAll('.podcast-line');
    lines.forEach(line => {
      const speaker = line.querySelector('.podcast-speaker')?.textContent?.trim() || '';
      const text    = line.querySelector('.podcast-line-text')?.textContent?.trim() || '';
      if (text) md += `**${speaker}** ${text}\n\n`;
    });
    md += '---\n\n';
  }

  // Q&A history
  if (_nbQAHistory.length) {
    md += `## 🧠 Q&A History (${_nbQAHistory.length} questions)\n\n`;
    _nbQAHistory.forEach((qa, i) => {
      md += `### Q${i + 1}: ${qa.question}\n\n`;
      md += `${qa.answer}\n\n`;
    });
    md += '---\n\n';
  }

  md += `_Generated by Nexora · nexora.ai_\n`;

  // Download
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notebook.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  _nbToast('📄 Notebook exported as Markdown');
}

// ─────────────────────────────────────────────────────────────────────
//  FALLBACK AI
async function _nbFallbackAI(sys, user) {
  const orKey = localStorage.getItem('nexora_user_key') || '';
  if (orKey && orKey.startsWith('sk-or-')) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${orKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free',
          messages: [{ role: 'system', content: sys }, { role: 'user', content: user }]
        })
      });
      if (res.ok) {
        const d = await res.json();
        return d?.choices?.[0]?.message?.content?.trim() || null;
      }
    } catch(e) {}
  }
  // Pollinations last resort
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }]
      })
    });
    if (res.ok) return (await res.text()).trim();
  } catch(e) {}
  return null;
}

// ─────────────────────────────────────────────────────────────────────
//  INIT — wire up all event listeners
// ─────────────────────────────────────────────────────────────────────

function initNotebook() {
  if (_notebookInitDone) return;
  _notebookInitDone = true;

  // ── Multi-file input ──────────────────────────────────────────────
  const fileInput = document.getElementById('nbFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', async e => {
      const files = Array.from(e.target.files || []);
      for (const f of files) await addNotebookSource(f);
      fileInput.value = '';
    });
  }

  // ── Clear sources ─────────────────────────────────────────────────
  const clearBtn = document.getElementById('nbClearSourcesBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearNotebookSources);
  }

  // ── Save notebook ─────────────────────────────────────────────────
  const saveBtn = document.getElementById('nbSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveCurrentNotebook);
  }

  // ── Toggle library panel ──────────────────────────────────────────
  const loadBtn  = document.getElementById('nbLoadBtn');
  const libPanel = document.getElementById('nbLibraryPanel');
  if (loadBtn && libPanel) {
    loadBtn.addEventListener('click', () => {
      const isVisible = libPanel.style.display !== 'none';
      libPanel.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) renderNotebookLibrary();
    });
  }

  // ── Generate podcast from notebook ───────────────────────────────
  const genBtn = document.getElementById('nbGeneratePodcastBtn');
  if (genBtn) {
    genBtn.addEventListener('click', generateNotebookPodcast);
  }

  // ── RAG ask button ────────────────────────────────────────────────
  const askBtn = document.getElementById('nbAskRagBtn');
  const ragInput = document.getElementById('nbRagQuestionInput');
  if (askBtn) {
    askBtn.addEventListener('click', () => {
      const q = ragInput?.value.trim();
      if (q) askNotebook(q);
    });
  }
  if (ragInput) {
    ragInput.addEventListener('keypress', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const q = ragInput.value.trim();
        if (q) askNotebook(q);
      }
    });
  }

  // ── Topic input change → update generate button state ────────────
  const topicInput = document.getElementById('podcastTopicInput');
  if (topicInput) {
    topicInput.addEventListener('input', _updateNotebookGenerateBtn);
  }

  // ── Initial render ────────────────────────────────────────────────
  renderNotebookSourceList();
  renderNotebookLibrary();
  _updateNotebookGenerateBtn();
}

// Auto-init when DOM is ready (called from openPodcast / switchStudyTab)
function ensureNotebookInit() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotebook);
  } else {
    initNotebook();
  }
}

// Expose globally
window.initNotebook             = initNotebook;
window.ensureNotebookInit       = ensureNotebookInit;
window.addNotebookSource        = addNotebookSource;
window.clearNotebookSources     = clearNotebookSources;
window.saveCurrentNotebook      = saveCurrentNotebook;
window.deleteNotebook           = deleteNotebook;
window.loadNotebook             = loadNotebook;
window.renderNotebookLibrary    = renderNotebookLibrary;
window.renderNotebookSourceList = renderNotebookSourceList;
window.generateNotebookPodcast  = generateNotebookPodcast;
window.askNotebook              = askNotebook;
window.exportNotebookAsMarkdown = exportNotebookAsMarkdown;
window.chunkText                = chunkText;
