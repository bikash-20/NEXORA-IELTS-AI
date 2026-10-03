// ============================================================
// nexora-mcq.js  — BCS / Bank / Govt Job MCQ Bank
//
// Features:
//   • Built-in BCS decks (Bangladesh Affairs, English, Math,
//     General Science, Computer & IT, International Affairs)
//   • Remote deck loading from /decks/<name>.json
//   • CSV import (paste or file upload)
//   • Full quiz engine with masked answers
//   • SM-2 spaced repetition for wrong answers
//   • Per-deck progress: mastered / due / streak
//   • AI "Explain this answer" via callStudyAI
//   • "Explain with audio" — 30-sec TTS mini-podcast
//   • Leaderboard-ready score export
// ============================================================

// ── Constants ────────────────────────────────────────────────────────
const MCQ_STORAGE_KEY  = 'nexora_mcq_progress';
const MCQ_STREAK_KEY   = 'nexora_mcq_streak';
const MCQ_SCORE_KEY    = 'nexora_mcq_scores';
const MCQ_MAX_DECKS    = 30;

// ── State ────────────────────────────────────────────────────────────
let _mcqCurrentDeck    = null;   // { name, questions[] }
let _mcqLearningState  = null;   // { deckName, questions[{ dueDate, interval, reps, mastered }] }
let _mcqSessionQueue   = [];     // indices of due questions for this session
let _mcqSessionIdx     = 0;
let _mcqSessionScore   = 0;
let _mcqSessionTotal   = 0;
let _mcqAnswered       = false;  // has user answered current question

// ── Built-in BCS Decks ───────────────────────────────────────────────
const MCQ_BUILTIN_DECKS = {

  "Bangladesh Affairs": [
    { q: "Who is the Father of the Nation of Bangladesh?", options: ["Sheikh Hasina","Ziaur Rahman","Sheikh Mujibur Rahman","Tajuddin Ahmad"], correct: "C", explanation: "Sheikh Mujibur Rahman led Bangladesh to independence and is revered as the Father of the Nation." },
    { q: "When did Bangladesh gain independence?", options: ["16 Dec 1971","26 Mar 1971","14 Aug 1947","7 Mar 1971"], correct: "A", explanation: "Bangladesh achieved independence on 16 December 1971 after the Liberation War." },
    { q: "What is the national language of Bangladesh?", options: ["Urdu","Hindi","Bengali (Bangla)","Arabic"], correct: "C", explanation: "Bangla (Bengali) is the official and national language of Bangladesh." },
    { q: "The Language Movement of Bangladesh took place in which year?", options: ["1948","1950","1952","1954"], correct: "C", explanation: "The Language Movement (Bhasha Andolon) occurred on 21 February 1952." },
    { q: "How many districts are there in Bangladesh?", options: ["60","64","68","72"], correct: "B", explanation: "Bangladesh is divided into 64 districts (Zila)." },
    { q: "What is the capital of Bangladesh?", options: ["Chittagong","Khulna","Dhaka","Sylhet"], correct: "C", explanation: "Dhaka is the capital and largest city of Bangladesh." },
    { q: "The Padma Bridge was inaugurated in which year?", options: ["2020","2021","2022","2023"], correct: "C", explanation: "The Padma Bridge was inaugurated on 25 June 2022." },
    { q: "Which river is known as the lifeline of Bangladesh?", options: ["Meghna","Jamuna","Padma","Surma"], correct: "C", explanation: "The Padma (Ganges) is considered the lifeline of Bangladesh." },
    { q: "Bangladesh became a member of the United Nations in which year?", options: ["1971","1972","1973","1974"], correct: "C", explanation: "Bangladesh joined the United Nations on 17 September 1974." },
    { q: "The Sundarbans is shared between Bangladesh and which other country?", options: ["India","Myanmar","Nepal","Bhutan"], correct: "A", explanation: "The Sundarbans mangrove forest is shared between Bangladesh and India." }
  ],

  "English Grammar": [
    { q: "Which sentence is grammatically correct?", options: ["He don't know","He doesn't know","He not know","He isn't know"], correct: "B", explanation: "'Doesn't' is used with third-person singular subjects." },
    { q: "Choose the correct passive voice: 'They built the bridge.'", options: ["The bridge was built by them.","The bridge is built by them.","The bridge built by them.","The bridge were built by them."], correct: "A", explanation: "Past simple passive: was/were + past participle." },
    { q: "What is the synonym of 'Benevolent'?", options: ["Cruel","Kind","Angry","Lazy"], correct: "B", explanation: "Benevolent means well-meaning and kindly." },
    { q: "Fill in the blank: She __ to school every day.", options: ["go","goes","going","gone"], correct: "B", explanation: "Third-person singular present simple uses 'goes'." },
    { q: "Which is the correct spelling?", options: ["Accomodation","Accommodation","Acommodation","Acomodation"], correct: "B", explanation: "Accommodation has double 'c' and double 'm'." },
    { q: "The antonym of 'Verbose' is:", options: ["Talkative","Concise","Lengthy","Wordy"], correct: "B", explanation: "Verbose means using too many words; its antonym is concise." },
    { q: "Identify the noun clause: 'What he said was true.'", options: ["What he said","was true","he said","What"], correct: "A", explanation: "'What he said' functions as the subject noun clause." },
    { q: "Choose the correct article: __ honest man.", options: ["A","An","The","No article"], correct: "B", explanation: "'An' is used before words starting with a vowel sound; 'honest' starts with a silent 'h'." }
  ],

  "General Science": [
    { q: "What is the chemical formula of water?", options: ["H2O2","HO","H2O","H3O"], correct: "C", explanation: "Water is composed of two hydrogen atoms and one oxygen atom: H2O." },
    { q: "Which planet is known as the Red Planet?", options: ["Venus","Jupiter","Mars","Saturn"], correct: "C", explanation: "Mars appears red due to iron oxide (rust) on its surface." },
    { q: "What is the speed of light in vacuum?", options: ["3×10^6 m/s","3×10^8 m/s","3×10^10 m/s","3×10^4 m/s"], correct: "B", explanation: "The speed of light in vacuum is approximately 3×10^8 metres per second." },
    { q: "The powerhouse of the cell is:", options: ["Nucleus","Ribosome","Mitochondria","Chloroplast"], correct: "C", explanation: "Mitochondria produce ATP energy for the cell." },
    { q: "Which gas is most abundant in Earth's atmosphere?", options: ["Oxygen","Carbon dioxide","Nitrogen","Argon"], correct: "C", explanation: "Nitrogen makes up about 78% of Earth's atmosphere." },
    { q: "What is the SI unit of electric current?", options: ["Volt","Watt","Ampere","Ohm"], correct: "C", explanation: "The ampere (A) is the SI base unit of electric current." },
    { q: "Photosynthesis takes place in which part of the plant?", options: ["Root","Stem","Flower","Chloroplast"], correct: "D", explanation: "Chloroplasts in plant cells are the site of photosynthesis." },
    { q: "Which vitamin is produced when skin is exposed to sunlight?", options: ["Vitamin A","Vitamin B12","Vitamin C","Vitamin D"], correct: "D", explanation: "Sunlight triggers synthesis of Vitamin D in the skin." }
  ],

  "Computer & IT": [
    { q: "What does CPU stand for?", options: ["Central Processing Unit","Computer Personal Unit","Central Program Utility","Core Processing Unit"], correct: "A", explanation: "CPU stands for Central Processing Unit, the brain of a computer." },
    { q: "Which of the following is an input device?", options: ["Monitor","Printer","Keyboard","Speaker"], correct: "C", explanation: "A keyboard is an input device used to enter data." },
    { q: "What does HTML stand for?", options: ["Hyper Text Markup Language","High Text Machine Language","Hyper Transfer Markup Language","Home Tool Markup Language"], correct: "A", explanation: "HTML stands for HyperText Markup Language, the standard for web pages." },
    { q: "1 Kilobyte (KB) is equal to how many bytes?", options: ["100","512","1000","1024"], correct: "D", explanation: "1 KB = 1024 bytes in binary (computing) convention." },
    { q: "Which company developed the Windows operating system?", options: ["Apple","Google","Microsoft","IBM"], correct: "C", explanation: "Microsoft developed and maintains the Windows OS." },
    { q: "What is the full form of URL?", options: ["Uniform Resource Locator","Universal Resource Link","Unified Reference Locator","Uniform Retrieval Link"], correct: "A", explanation: "URL stands for Uniform Resource Locator — the address of a web resource." },
    { q: "Which programming language is known as the mother of all languages?", options: ["Python","Java","C","Assembly"], correct: "C", explanation: "C is often called the mother of modern programming languages." },
    { q: "RAM stands for:", options: ["Read Access Memory","Random Access Memory","Rapid Access Module","Read And Modify"], correct: "B", explanation: "RAM stands for Random Access Memory, the computer's short-term memory." }
  ],

  "International Affairs": [
    { q: "The headquarters of the United Nations is located in:", options: ["Geneva","Paris","New York","London"], correct: "C", explanation: "The UN headquarters is in New York City, USA." },
    { q: "Which country has the largest area in the world?", options: ["USA","China","Canada","Russia"], correct: "D", explanation: "Russia is the largest country by area at about 17.1 million km²." },
    { q: "The International Court of Justice is located in:", options: ["Brussels","The Hague","Geneva","Vienna"], correct: "B", explanation: "The ICJ is the principal judicial organ of the UN, located in The Hague, Netherlands." },
    { q: "SAARC was established in which year?", options: ["1980","1985","1990","1995"], correct: "B", explanation: "SAARC (South Asian Association for Regional Cooperation) was established in 1985." },
    { q: "Which country is the largest producer of rice in the world?", options: ["India","Bangladesh","China","Thailand"], correct: "C", explanation: "China is the world's largest producer of rice." },
    { q: "The G20 summit is a forum of:", options: ["20 richest nations","20 most populous nations","19 countries + EU","20 UN Security Council members"], correct: "C", explanation: "G20 consists of 19 individual countries plus the European Union." },
    { q: "Which country is known as the 'Land of the Rising Sun'?", options: ["China","South Korea","Japan","Vietnam"], correct: "C", explanation: "Japan is called the Land of the Rising Sun (Nihon/Nippon)." }
  ],

  "Bangladesh Constitution": [
    { q: "The Constitution of Bangladesh was adopted on:", options: ["16 Dec 1971","4 Nov 1972","26 Mar 1972","7 Mar 1972"], correct: "B", explanation: "The Constitution of Bangladesh was adopted on 4 November 1972." },
    { q: "How many articles are in the original Constitution of Bangladesh?", options: ["143","148","153","153"], correct: "B", explanation: "The original Constitution had 153 articles." },
    { q: "The fundamental principles of state policy in Bangladesh are:", options: ["2","3","4","5"], correct: "C", explanation: "The four fundamental principles are: nationalism, socialism, democracy, and secularism." },
    { q: "Who is the guardian of the Constitution of Bangladesh?", options: ["President","Prime Minister","Supreme Court","Parliament"], correct: "C", explanation: "The Supreme Court is the guardian of the Constitution." },
    { q: "The national anthem of Bangladesh was written by:", options: ["Kazi Nazrul Islam","Rabindranath Tagore","Jasimuddin","Shamsur Rahman"], correct: "B", explanation: "'Amar Sonar Bangla' was written by Rabindranath Tagore." }
  ]

};

// ── Storage helpers ──────────────────────────────────────────────────

function _mcqGetAllProgress() {
  try {
    return (window.NexoraData?.getJSON
      ? NexoraData.getJSON(MCQ_STORAGE_KEY, {})
      : JSON.parse(localStorage.getItem(MCQ_STORAGE_KEY) || '{}')) || {};
  } catch(e) { return {}; }
}

function _mcqSetAllProgress(all) {
  try {
    if (window.NexoraData?.setJSON) NexoraData.setJSON(MCQ_STORAGE_KEY, all);
    else localStorage.setItem(MCQ_STORAGE_KEY, JSON.stringify(all));
  } catch(e) {}
}

function _mcqLoadProgress(deckName) {
  return _mcqGetAllProgress()[deckName] || null;
}

function _mcqSaveProgress(deckName, state) {
  const all = _mcqGetAllProgress();
  all[deckName] = state;
  _mcqSetAllProgress(all);
}

function _mcqGetScores() {
  try {
    return JSON.parse(localStorage.getItem(MCQ_SCORE_KEY) || '[]');
  } catch(e) { return []; }
}

function _mcqSaveScore(deckName, correct, total) {
  const scores = _mcqGetScores();
  scores.unshift({ deckName, correct, total, pct: Math.round((correct/total)*100), ts: Date.now() });
  if (scores.length > 100) scores.length = 100;
  localStorage.setItem(MCQ_SCORE_KEY, JSON.stringify(scores));
}

// ── SRS engine (SM-2 lite, same logic as existing SRS) ───────────────

function _mcqInitLearningState(deckName, questions) {
  const existing = _mcqLoadProgress(deckName);
  if (existing && existing.questions && existing.questions.length === questions.length) {
    return existing;
  }
  const state = {
    deckName,
    questions: questions.map((_, i) => ({
      idx:       i,
      dueDate:   Date.now(),
      interval:  1,
      ease:      2.5,
      reps:      0,
      mastered:  false,
      lastResult: null,
    })),
    createdAt: Date.now(),
  };
  _mcqSaveProgress(deckName, state);
  return state;
}

function _mcqUpdateSRS(qState, isCorrect) {
  if (isCorrect) {
    qState.reps++;
    if      (qState.reps === 1) qState.interval = 1;
    else if (qState.reps === 2) qState.interval = 3;
    else qState.interval = Math.round(qState.interval * (qState.ease || 2.5));
    qState.ease = Math.max(1.3, (qState.ease || 2.5) + 0.1);
    qState.dueDate = Date.now() + qState.interval * 86400000;
    if (qState.reps >= 5) qState.mastered = true;
  } else {
    qState.reps     = Math.max(0, (qState.reps || 0) - 1);
    qState.interval = 1;
    qState.ease     = Math.max(1.3, (qState.ease || 2.5) - 0.2);
    qState.dueDate  = Date.now() + 86400000; // 1 day
    qState.mastered = false;
  }
  qState.lastResult = isCorrect ? 'correct' : 'wrong';
}

function _mcqGetDueQueue(state) {
  const now = Date.now();
  // Due questions first, then new (never answered), then upcoming
  const due     = state.questions.filter(q => !q.mastered && q.dueDate <= now);
  const fresh   = state.questions.filter(q => !q.mastered && q.reps === 0 && q.dueDate > now);
  const upcoming = state.questions.filter(q => !q.mastered && q.reps > 0 && q.dueDate > now);
  return [...due, ...fresh, ...upcoming].map(q => q.idx);
}

// ── Deck loading ─────────────────────────────────────────────────────

async function mcqLoadDeck(deckName) {
  let questions = MCQ_BUILTIN_DECKS[deckName];

  if (!questions) {
    // Try remote JSON
    try {
      const res = await fetch('/decks/' + encodeURIComponent(deckName) + '.json');
      if (res.ok) questions = await res.json();
    } catch(e) {}
  }

  if (!questions || !questions.length) {
    if (typeof _showStudyToast === 'function') _showStudyToast('Deck not found: ' + deckName);
    return;
  }

  // Normalise: ensure correct is a single uppercase letter
  questions = questions.map(q => ({
    q:           q.q || q.question || '?',
    options:     Array.isArray(q.options) ? q.options : [],
    correct:     String(q.correct || 'A').toUpperCase().trim().slice(0,1),
    explanation: q.explanation || '',
  }));

  _mcqCurrentDeck   = { name: deckName, questions };
  _mcqLearningState = _mcqInitLearningState(deckName, questions);
  _mcqSessionQueue  = _mcqGetDueQueue(_mcqLearningState);
  _mcqSessionIdx    = 0;
  _mcqSessionScore  = 0;
  _mcqSessionTotal  = 0;
  _mcqAnswered      = false;

  _mcqRenderDeckInfo();
  _mcqRenderQuestion();
}

function mcqImportCSV(csvText) {
  // Format: question,optA,optB,optC,optD,correct_letter,explanation
  const lines = csvText.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'));
  const questions = [];
  for (const line of lines) {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 6) continue;
    questions.push({
      q:           cols[0],
      options:     [cols[1], cols[2], cols[3], cols[4]].filter(Boolean),
      correct:     cols[5].toUpperCase().slice(0,1),
      explanation: cols[6] || '',
    });
  }
  if (!questions.length) {
    if (typeof _showStudyToast === 'function') _showStudyToast('No valid questions found in CSV');
    return;
  }
  const deckName = 'Imported Deck ' + new Date().toLocaleDateString();
  MCQ_BUILTIN_DECKS[deckName] = questions;
  _mcqPopulateDeckSelector();
  mcqLoadDeck(deckName);
  if (typeof _showStudyToast === 'function') _showStudyToast('✅ Imported ' + questions.length + ' questions');
}

// ── UI renderers ─────────────────────────────────────────────────────

function _mcqPopulateDeckSelector() {
  const sel = document.getElementById('mcqDeckSelect');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Choose a deck —</option>';
  Object.keys(MCQ_BUILTIN_DECKS).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name + ' (' + MCQ_BUILTIN_DECKS[name].length + ' Q)';
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

function _mcqRenderDeckInfo() {
  const state = _mcqLearningState;
  if (!state) return;

  const total    = state.questions.length;
  const mastered = state.questions.filter(q => q.mastered).length;
  const due      = _mcqGetDueQueue(state).length;
  const pct      = total ? Math.round((mastered / total) * 100) : 0;

  const titleEl    = document.getElementById('mcqDeckTitle');
  const countEl    = document.getElementById('mcqDeckCount');
  const masteredEl = document.getElementById('mcqMasteredCount');
  const dueEl      = document.getElementById('mcqDueCount');
  const fillEl     = document.getElementById('mcqMasteredFill');
  const pctEl      = document.getElementById('mcqMasteredPct');
  const infoEl     = document.getElementById('mcqDeckInfo');

  if (titleEl)    titleEl.textContent    = _mcqCurrentDeck.name;
  if (countEl)    countEl.textContent    = total;
  if (masteredEl) masteredEl.textContent = mastered;
  if (dueEl)      dueEl.textContent      = due;
  if (fillEl)     fillEl.style.width     = pct + '%';
  if (pctEl)      pctEl.textContent      = pct + '%';
  if (infoEl)     infoEl.style.display   = 'block';

  _mcqRenderStatsBody();
}

function _mcqRenderStatsBody() {
  const el = document.getElementById('mcqStatsBody');
  if (!el || !_mcqLearningState) return;
  const qs = _mcqLearningState.questions;
  const now = Date.now();
  el.innerHTML = qs.map((q, i) => {
    const qText = (_mcqCurrentDeck?.questions[i]?.q || '').slice(0, 50);
    let badge = '';
    if (q.mastered)          badge = '<span class="mcq-badge mcq-badge-mastered">✅ mastered</span>';
    else if (q.dueDate <= now) badge = '<span class="mcq-badge mcq-badge-due">⏳ due</span>';
    else {
      const days = Math.ceil((q.dueDate - now) / 86400000);
      badge = '<span class="mcq-badge mcq-badge-upcoming">�� ' + days + 'd</span>';
    }
    return '<div class="mcq-stat-row"><span class="mcq-stat-q">Q' + (i+1) + '. ' + _mcqEsc(qText) + '…</span>' + badge + '</div>';
  }).join('');
}

function _mcqRenderQuestion() {
  const quizArea = document.getElementById('mcqQuizArea');
  const doneArea = document.getElementById('mcqSessionDone');
  if (!quizArea) return;

  if (_mcqSessionIdx >= _mcqSessionQueue.length) {
    // Session complete
    quizArea.style.display = 'none';
    if (doneArea) {
      doneArea.style.display = 'block';
      const pct = _mcqSessionTotal ? Math.round((_mcqSessionScore / _mcqSessionTotal) * 100) : 0;
      const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '🤔' : '😅';
      doneArea.innerHTML =
        '<div class="mcq-done-card">' +
          '<div class="mcq-done-emoji">' + emoji + '</div>' +
          '<div class="mcq-done-score">' + _mcqSessionScore + ' / ' + _mcqSessionTotal + '</div>' +
          '<div class="mcq-done-pct">' + pct + '% correct this session</div>' +
          '<div class="mcq-done-actions">' +
            '<button class="mcq-btn-primary" onclick="mcqContinueSession()">🔁 Continue</button>' +
            '<button class="mcq-btn-secondary" onclick="mcqResetSession()">📋 New Session</button>' +
          '</div>' +
        '</div>';
      _mcqSaveScore(_mcqCurrentDeck.name, _mcqSessionScore, _mcqSessionTotal);
    }
    _mcqRenderDeckInfo();
    return;
  }

  if (doneArea) doneArea.style.display = 'none';
  quizArea.style.display = 'block';

  const qIdx = _mcqSessionQueue[_mcqSessionIdx];
  const q    = _mcqCurrentDeck.questions[qIdx];
  _mcqAnswered = false;

  // Progress counter
  const counterEl = document.getElementById('mcqQuestionCounter');
  if (counterEl) counterEl.textContent = (_mcqSessionIdx + 1) + ' / ' + _mcqSessionQueue.length;

  // Progress bar
  const progFill = document.getElementById('mcqSessionProgressFill');
  if (progFill) progFill.style.width = Math.round((_mcqSessionIdx / _mcqSessionQueue.length) * 100) + '%';

  // Question text
  const qEl = document.getElementById('mcqQuizQuestion');
  if (qEl) qEl.textContent = q.q;

  // Options
  const optsEl = document.getElementById('mcqQuizOptions');
  if (!optsEl) return;
  const letters = ['A','B','C','D'];
  optsEl.innerHTML = q.options.map((opt, i) =>
    '<button class="mcq-option-btn" data-choice="' + letters[i] + '">' +
      '<span class="mcq-option-letter">' + letters[i] + '</span>' +
      '<span class="mcq-option-text">' + _mcqEsc(opt) + '</span>' +
    '</button>'
  ).join('');

  // Feedback + next
  const feedbackEl = document.getElementById('mcqQuizFeedback');
  if (feedbackEl) feedbackEl.innerHTML = '';
  const nextBtn = document.getElementById('mcqNextBtn');
  if (nextBtn) nextBtn.style.display = 'none';

  // Attach click handlers
  optsEl.querySelectorAll('.mcq-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (_mcqAnswered) return;
      _mcqAnswered = true;
      const chosen    = btn.dataset.choice;
      const isCorrect = chosen === q.correct;
      _mcqSessionTotal++;
      if (isCorrect) _mcqSessionScore++;

      // Visual feedback on buttons
      optsEl.querySelectorAll('.mcq-option-btn').forEach(b => {
        b.disabled = true;
        if (b.dataset.choice === q.correct) b.classList.add('mcq-correct');
        else if (b === btn && !isCorrect) b.classList.add('mcq-wrong');
      });

      // Update SRS
      const qState = _mcqLearningState.questions[qIdx];
      _mcqUpdateSRS(qState, isCorrect);
      _mcqSaveProgress(_mcqCurrentDeck.name, _mcqLearningState);

      // Feedback text
      if (feedbackEl) {
        feedbackEl.innerHTML =
          '<div class="mcq-feedback ' + (isCorrect ? 'mcq-feedback-correct' : 'mcq-feedback-wrong') + '">' +
            (isCorrect ? '✅ Correct!' : '❌ Wrong — correct answer: <strong>' + q.correct + ') ' + _mcqEsc(q.options['ABCD'.indexOf(q.correct)]) + '</strong>') +
            (q.explanation ? '<div class="mcq-explanation">' + _mcqEsc(q.explanation) + '</div>' : '') +
            '<div class="mcq-feedback-actions">' +
              '<button class="mcq-explain-btn" onclick="mcqAIExplain(' + qIdx + ')">🧠 AI Explain</button>' +
              '<button class="mcq-audio-btn" onclick="mcqAudioExplain(' + qIdx + ')">🔊 Audio</button>' +
            '</div>' +
          '</div>';
      }

      if (nextBtn) {
        nextBtn.style.display = 'block';
        nextBtn.textContent = _mcqSessionIdx < _mcqSessionQueue.length - 1 ? 'Next →' : 'Finish Session';
      }
    });
  });
}

// ── Session controls ─────────────────────────────────────────────────

function mcqContinueSession() {
  _mcqSessionQueue  = _mcqGetDueQueue(_mcqLearningState);
  _mcqSessionIdx    = 0;
  _mcqSessionScore  = 0;
  _mcqSessionTotal  = 0;
  _mcqRenderQuestion();
}

function mcqResetSession() {
  _mcqSessionIdx   = 0;
  _mcqSessionScore = 0;
  _mcqSessionTotal = 0;
  _mcqRenderQuestion();
}

function mcqNextQuestion() {
  _mcqSessionIdx++;
  _mcqRenderQuestion();
}

function mcqResetDeckProgress() {
  if (!_mcqCurrentDeck) return;
  if (!confirm('Reset all learning progress for "' + _mcqCurrentDeck.name + '"?')) return;
  _mcqLearningState = _mcqInitLearningState(_mcqCurrentDeck.name, _mcqCurrentDeck.questions);
  // Force re-init by clearing saved state
  const all = _mcqGetAllProgress();
  delete all[_mcqCurrentDeck.name];
  _mcqSetAllProgress(all);
  _mcqLearningState = _mcqInitLearningState(_mcqCurrentDeck.name, _mcqCurrentDeck.questions);
  _mcqSessionQueue  = _mcqGetDueQueue(_mcqLearningState);
  _mcqSessionIdx    = 0;
  _mcqSessionScore  = 0;
  _mcqSessionTotal  = 0;
  _mcqRenderDeckInfo();
  _mcqRenderQuestion();
  if (typeof _showStudyToast === 'function') _showStudyToast('Progress reset');
}

// ── AI Explain + Audio Explain ───────────────────────────────────────

async function mcqAIExplain(qIdx) {
  const q = _mcqCurrentDeck?.questions[qIdx];
  if (!q) return;

  const btn = document.querySelector('.mcq-explain-btn');
  if (btn) { btn.textContent = '⏳ Asking AI…'; btn.disabled = true; }

  try {
    const sys = 'You are a BCS exam tutor. Explain the answer clearly in 3-4 sentences. Be specific and educational.';
    const usr = 'Question: ' + q.q + '\nCorrect answer: ' + q.correct + ') ' + (q.options['ABCD'.indexOf(q.correct)] || '') + '\nExplanation hint: ' + (q.explanation || 'none');
    let reply = '';
    if (typeof callStudyAI === 'function') {
      reply = await callStudyAI(sys, usr);
    }
    if (!reply) throw new Error('No reply');

    const feedbackEl = document.getElementById('mcqQuizFeedback');
    if (feedbackEl) {
      const existing = feedbackEl.querySelector('.mcq-ai-explanation');
      if (existing) existing.remove();
      const div = document.createElement('div');
      div.className = 'mcq-ai-explanation';
      div.innerHTML = '<strong>🧠 AI Explanation:</strong><br>' + _mcqEsc(reply).replace(/\n/g, '<br>');
      feedbackEl.appendChild(div);
    }
  } catch(e) {
    if (typeof _showStudyToast === 'function') _showStudyToast('AI explanation failed');
  } finally {
    if (btn) { btn.textContent = '🧠 AI Explain'; btn.disabled = false; }
  }
}

async function mcqAudioExplain(qIdx) {
  const q = _mcqCurrentDeck?.questions[qIdx];
  if (!q) return;

  const btn = document.querySelector('.mcq-audio-btn');
  if (btn) { btn.textContent = '⏳ Generating…'; btn.disabled = true; }

  try {
    const text = 'The correct answer is ' + q.correct + ': ' + (q.options['ABCD'.indexOf(q.correct)] || '') + '. ' + (q.explanation || '');

    // Try CF Worker TTS first
    if (typeof _hasCFWorker === 'function' && _hasCFWorker() && typeof _getCFWorkerUrl === 'function') {
      const res = await fetch(_getCFWorkerUrl() + '/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 400), voice: 'en-us-female' }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        if (btn) { btn.textContent = '🔊 Playing…'; }
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (btn) { btn.textContent = '🔊 Audio'; btn.disabled = false; }
        };
        return;
      }
    }

    // Web Speech fallback
    if ('speechSynthesis' in window) {
      const utt = new SpeechSynthesisUtterance(text.slice(0, 300));
      utt.rate = 0.9;
      utt.onend = () => { if (btn) { btn.textContent = '🔊 Audio'; btn.disabled = false; } };
      window.speechSynthesis.speak(utt);
      if (btn) btn.textContent = '�� Playing…';
    }
  } catch(e) {
    if (btn) { btn.textContent = '🔊 Audio'; btn.disabled = false; }
  }
}

// ── Utility ──────────────────────────────────────────────────────────

function _mcqEsc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Init ─────────────────────────────────────────────────────────────

function initMCQModule() {
  _mcqPopulateDeckSelector();

  // Load deck button
  const loadBtn = document.getElementById('mcqLoadDeckBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      const name = document.getElementById('mcqDeckSelect')?.value;
      if (name) mcqLoadDeck(name);
      else if (typeof _showStudyToast === 'function') _showStudyToast('Choose a deck first');
    });
  }

  // Next button
  const nextBtn = document.getElementById('mcqNextBtn');
  if (nextBtn) nextBtn.addEventListener('click', mcqNextQuestion);

  // Reset progress button
  const resetBtn = document.getElementById('mcqResetProgressBtn');
  if (resetBtn) resetBtn.addEventListener('click', mcqResetDeckProgress);

  // CSV import button
  const csvBtn = document.getElementById('mcqImportCSVBtn');
  if (csvBtn) {
    csvBtn.addEventListener('click', () => {
      const area = document.getElementById('mcqCSVImportArea');
      if (area) area.style.display = area.style.display === 'none' ? 'block' : 'none';
    });
  }

  const csvSubmit = document.getElementById('mcqCSVSubmitBtn');
  if (csvSubmit) {
    csvSubmit.addEventListener('click', () => {
      const text = document.getElementById('mcqCSVText')?.value || '';
      if (text.trim()) mcqImportCSV(text);
    });
  }

  // CSV file upload
  const csvFile = document.getElementById('mcqCSVFileInput');
  if (csvFile) {
    csvFile.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => mcqImportCSV(ev.target.result || '');
      reader.readAsText(file);
      csvFile.value = '';
    });
  }
}

// Auto-init when tab is switched to 'mcq'
window.initMCQModule        = initMCQModule;
window.mcqLoadDeck          = mcqLoadDeck;
window.mcqImportCSV         = mcqImportCSV;
window.mcqNextQuestion      = mcqNextQuestion;
window.mcqContinueSession   = mcqContinueSession;
window.mcqResetSession      = mcqResetSession;
window.mcqResetDeckProgress = mcqResetDeckProgress;
window.mcqAIExplain         = mcqAIExplain;
window.mcqAudioExplain      = mcqAudioExplain;
window.MCQ_BUILTIN_DECKS    = MCQ_BUILTIN_DECKS;

// ══════════════════════════════════════════════════════════════════════
//  EXPANDED BCS DECKS  (added to MCQ_BUILTIN_DECKS at runtime)
// ══════════════════════════════════════════════════════════════════════

(function _addExpandedDecks() {

  const extra = {

    "Bangladesh Affairs – Advanced": [
      { q:"In which year was the Awami League founded?", options:["1947","1948","1949","1952"], correct:"C", explanation:"The Awami League was founded on 23 June 1949." },
      { q:"Who delivered the historic 7 March speech in 1971?", options:["Tajuddin Ahmad","Sheikh Mujibur Rahman","Ziaur Rahman","A.K. Fazlul Huq"], correct:"B", explanation:"Sheikh Mujibur Rahman delivered the 7 March speech at Ramna Race Course." },
      { q:"The Mujibnagar Government was formed on:", options:["10 April 1971","17 April 1971","26 March 1971","16 December 1971"], correct:"B", explanation:"The Mujibnagar Government (Government in Exile) was formed on 17 April 1971." },
      { q:"Which operation did the Pakistani army launch on 25 March 1971?", options:["Operation Searchlight","Operation Bluestar","Operation Jackpot","Operation Cyclone"], correct:"A", explanation:"Operation Searchlight was the Pakistani military crackdown on 25 March 1971." },
      { q:"The Sundarbans is a UNESCO World Heritage Site since:", options:["1987","1992","1997","2000"], correct:"C", explanation:"The Sundarbans was inscribed as a UNESCO World Heritage Site in 1997." },
      { q:"What is the total area of Bangladesh?", options:["130,170 km²","143,998 km²","147,570 km²","156,000 km²"], correct:"C", explanation:"Bangladesh has a total area of approximately 147,570 km²." },
      { q:"The longest river in Bangladesh is:", options:["Padma","Meghna","Jamuna","Surma"], correct:"B", explanation:"The Meghna is the longest river in Bangladesh." },
      { q:"Cox's Bazar sea beach is the longest natural sea beach in the world, stretching approximately:", options:["80 km","100 km","120 km","155 km"], correct:"C", explanation:"Cox's Bazar beach stretches approximately 120 km." },
      { q:"Which district is known as the 'City of Mosques'?", options:["Dhaka","Rajshahi","Barisal","Sylhet"], correct:"A", explanation:"Dhaka is known as the City of Mosques due to its thousands of mosques." },
      { q:"The first census of Bangladesh was held in:", options:["1971","1972","1974","1981"], correct:"C", explanation:"The first census of independent Bangladesh was held in 1974." },
      { q:"Bangladesh's first satellite 'Bangabandhu-1' was launched in:", options:["2016","2017","2018","2019"], correct:"C", explanation:"Bangabandhu-1 was launched on 11 May 2018 from Cape Canaveral." },
      { q:"The national flower of Bangladesh is:", options:["Rose","Lotus","Shapla (Water Lily)","Jasmine"], correct:"C", explanation:"Shapla (White Water Lily) is the national flower of Bangladesh." },
      { q:"The national bird of Bangladesh is:", options:["Peacock","Magpie Robin (Doel)","Parrot","Kingfisher"], correct:"B", explanation:"The Magpie Robin (Doel) is the national bird of Bangladesh." },
      { q:"Which is the largest division of Bangladesh by area?", options:["Dhaka","Chittagong","Rajshahi","Mymensingh"], correct:"B", explanation:"Chittagong Division is the largest by area." },
      { q:"The Bangla Academy was established in:", options:["1952","1955","1957","1960"], correct:"C", explanation:"Bangla Academy was established on 3 December 1955." },
      { q:"Bangladesh's first Prime Minister was:", options:["Sheikh Mujibur Rahman","Tajuddin Ahmad","Syed Nazrul Islam","Mansur Ali"], correct:"B", explanation:"Tajuddin Ahmad was the first Prime Minister of Bangladesh (1971–1972)." },
      { q:"The Liberation War Museum is located in:", options:["Chittagong","Dhaka","Rajshahi","Khulna"], correct:"B", explanation:"The Liberation War Museum is located in Dhaka." },
      { q:"Which country first recognised Bangladesh as an independent nation?", options:["India","Soviet Union","Bhutan","USA"], correct:"C", explanation:"Bhutan was the first country to recognise Bangladesh on 6 December 1971." },
      { q:"The Jamuna Multipurpose Bridge was opened in:", options:["1996","1998","2000","2002"], correct:"B", explanation:"The Jamuna Bridge (Bangabandhu Bridge) was opened on 23 June 1998." },
      { q:"Bangladesh's national tree is:", options:["Mango","Jackfruit","Banyan","Bamboo"], correct:"B", explanation:"The Jackfruit tree (Kathal) is the national tree of Bangladesh." }
    ],

    "Bangla Literature": [
      { q:"Who is known as the 'Poet of Bengal' (Kobiguru)?", options:["Kazi Nazrul Islam","Rabindranath Tagore","Michael Madhusudan Datta","Jasimuddin"], correct:"B", explanation:"Rabindranath Tagore is known as Kobiguru (Poet of Bengal)." },
      { q:"Rabindranath Tagore won the Nobel Prize in Literature in:", options:["1911","1913","1915","1920"], correct:"B", explanation:"Tagore won the Nobel Prize in Literature in 1913 for Gitanjali." },
      { q:"Who wrote 'Amar Sonar Bangla' (Bangladesh's national anthem)?", options:["Kazi Nazrul Islam","Jasimuddin","Rabindranath Tagore","Shamsur Rahman"], correct:"C", explanation:"Rabindranath Tagore wrote 'Amar Sonar Bangla' in 1905." },
      { q:"Kazi Nazrul Islam is known as:", options:["Rebel Poet (Bidrohi Kobi)","Poet of Bengal","Palli Kobi","Swadesh Kobi"], correct:"A", explanation:"Kazi Nazrul Islam is called the Rebel Poet (Bidrohi Kobi) for his revolutionary poetry." },
      { q:"Who wrote the epic poem 'Meghnad Badh Kavya'?", options:["Rabindranath Tagore","Michael Madhusudan Datta","Bankim Chandra","Hemchandra Bandyopadhyay"], correct:"B", explanation:"Michael Madhusudan Datta wrote Meghnad Badh Kavya (1861)." },
      { q:"The first novel in Bangla literature is:", options:["Durgeshnandini","Alaler Gharer Dulal","Bishad Sindhu","Anandamath"], correct:"A", explanation:"Durgeshnandini (1865) by Bankim Chandra Chattopadhyay is considered the first Bangla novel." },
      { q:"Who wrote 'Bishad Sindhu'?", options:["Mir Mosharraf Hossain","Bankim Chandra","Rabindranath Tagore","Kazi Nazrul Islam"], correct:"A", explanation:"Mir Mosharraf Hossain wrote Bishad Sindhu (1885–1891)." },
      { q:"'Nakshi Kanthar Math' was written by:", options:["Rabindranath Tagore","Jasimuddin","Kazi Nazrul Islam","Sufia Kamal"], correct:"B", explanation:"Jasimuddin wrote Nakshi Kanthar Math (1929), a narrative poem." },
      { q:"Who is called 'Palli Kobi' (Rural Poet)?", options:["Jasimuddin","Kazi Nazrul Islam","Jibanananda Das","Al Mahmud"], correct:"A", explanation:"Jasimuddin is called Palli Kobi for his poems depicting rural Bengal." },
      { q:"The poem 'Bidrohi' (Rebel) was written by:", options:["Rabindranath Tagore","Jasimuddin","Kazi Nazrul Islam","Sufia Kamal"], correct:"C", explanation:"Kazi Nazrul Islam wrote 'Bidrohi' in 1921." },
      { q:"Who wrote 'Lal Shalu' (Tree Without Roots)?", options:["Syed Waliullah","Humayun Ahmed","Akhtaruzzaman Elias","Shahidullah Kaiser"], correct:"A", explanation:"Syed Waliullah wrote Lal Shalu (1948), a landmark Bangladeshi novel." },
      { q:"'Rupasi Bangla' poetry collection was written by:", options:["Kazi Nazrul Islam","Jibanananda Das","Sufia Kamal","Al Mahmud"], correct:"B", explanation:"Jibanananda Das wrote Rupasi Bangla, celebrating the beauty of Bengal." },
      { q:"Who is the author of 'Padma Nadir Majhi'?", options:["Manik Bandyopadhyay","Bibhutibhushan","Tarashankar","Sarat Chandra"], correct:"A", explanation:"Manik Bandyopadhyay wrote Padma Nadir Majhi (1936)." },
      { q:"The first Bangla dictionary was compiled by:", options:["Rabindranath Tagore","Raja Ram Mohan Roy","Haraganga Datta","William Carey"], correct:"D", explanation:"William Carey compiled the first Bangla dictionary in 1818." },
      { q:"Who wrote 'Ekushey February' poem?", options:["Shamsur Rahman","Al Mahmud","Abdul Gaffar Choudhury","Sufia Kamal"], correct:"C", explanation:"Abdul Gaffar Choudhury wrote the poem 'Amar Bhaier Rokte Rangano' (Ekushey February) in 1952." }
    ],

    "English – Vocabulary & Grammar": [
      { q:"The synonym of 'Eloquent' is:", options:["Silent","Articulate","Confused","Dull"], correct:"B", explanation:"Eloquent means fluent and persuasive; articulate is its synonym." },
      { q:"The antonym of 'Frugal' is:", options:["Thrifty","Economical","Extravagant","Careful"], correct:"C", explanation:"Frugal means careful with money; extravagant is its antonym." },
      { q:"Choose the correct sentence:", options:["Neither of them are ready","Neither of them is ready","Neither of them were ready","Neither of them be ready"], correct:"B", explanation:"'Neither' takes a singular verb: 'Neither of them is ready.'" },
      { q:"The word 'Ephemeral' means:", options:["Eternal","Short-lived","Powerful","Ancient"], correct:"B", explanation:"Ephemeral means lasting for a very short time." },
      { q:"Identify the gerund in: 'Swimming is good exercise.'", options:["is","good","exercise","Swimming"], correct:"D", explanation:"'Swimming' is a gerund — a verb form used as a noun." },
      { q:"The synonym of 'Pernicious' is:", options:["Beneficial","Harmful","Neutral","Pleasant"], correct:"B", explanation:"Pernicious means having a harmful effect, especially gradually." },
      { q:"Which is the correct spelling?", options:["Recieve","Receive","Recive","Receeve"], correct:"B", explanation:"The correct spelling is 'Receive' — remember 'i before e except after c'." },
      { q:"'She is good __ English.' — Fill in the blank:", options:["in","at","on","for"], correct:"B", explanation:"'Good at' is the correct preposition for skills." },
      { q:"The antonym of 'Verbose' is:", options:["Wordy","Talkative","Concise","Lengthy"], correct:"C", explanation:"Verbose means using too many words; concise is its antonym." },
      { q:"What is the plural of 'Criterion'?", options:["Criterions","Criterias","Criteria","Criterium"], correct:"C", explanation:"The plural of criterion (Greek origin) is criteria." },
      { q:"'To burn the midnight oil' means:", options:["To waste energy","To work late into the night","To cause a fire","To be lazy"], correct:"B", explanation:"This idiom means to work or study late into the night." },
      { q:"The passive voice of 'They are building a bridge' is:", options:["A bridge is being built by them","A bridge was built by them","A bridge has been built","A bridge will be built"], correct:"A", explanation:"Present continuous passive: is/are + being + past participle." },
      { q:"Choose the word closest in meaning to 'Ameliorate':", options:["Worsen","Improve","Ignore","Destroy"], correct:"B", explanation:"Ameliorate means to make something bad better; improve is its synonym." },
      { q:"Which sentence uses the subjunctive mood correctly?", options:["If I was rich, I would help","If I were rich, I would help","If I am rich, I will help","If I be rich, I help"], correct:"B", explanation:"The subjunctive uses 'were' for hypothetical conditions: 'If I were rich…'" },
      { q:"The word 'Ubiquitous' means:", options:["Rare","Found everywhere","Invisible","Ancient"], correct:"B", explanation:"Ubiquitous means present, appearing, or found everywhere." }
    ],

    "Mathematics – BCS Level": [
      { q:"If 20% of a number is 50, what is the number?", options:["200","250","300","400"], correct:"B", explanation:"20% × x = 50 → x = 50 ÷ 0.20 = 250." },
      { q:"A train travels 360 km in 4 hours. What is its speed in km/h?", options:["80","90","100","120"], correct:"B", explanation:"Speed = Distance ÷ Time = 360 ÷ 4 = 90 km/h." },
      { q:"What is the LCM of 12 and 18?", options:["6","24","36","72"], correct:"C", explanation:"LCM(12,18) = 36." },
      { q:"If x + y = 10 and x − y = 4, what is x?", options:["3","5","7","9"], correct:"C", explanation:"Adding: 2x = 14 → x = 7." },
      { q:"A shopkeeper buys an item for ৳400 and sells it for ৳500. What is the profit percentage?", options:["20%","25%","30%","40%"], correct:"B", explanation:"Profit% = (100/400) × 100 = 25%." },
      { q:"The simple interest on ৳5000 at 8% per annum for 3 years is:", options:["৳1000","৳1200","৳1500","৳2000"], correct:"B", explanation:"SI = P×R×T/100 = 5000×8×3/100 = ৳1200." },
      { q:"What is the value of √144?", options:["11","12","13","14"], correct:"B", explanation:"√144 = 12 because 12² = 144." },
      { q:"If a rectangle has length 12 cm and width 8 cm, what is its area?", options:["40 cm²","80 cm²","96 cm²","120 cm²"], correct:"C", explanation:"Area = length × width = 12 × 8 = 96 cm²." },
      { q:"A can do a work in 10 days, B in 15 days. Together they finish in:", options:["5 days","6 days","8 days","12 days"], correct:"B", explanation:"Combined rate = 1/10 + 1/15 = 5/30 = 1/6. Time = 6 days." },
      { q:"What is 15% of 200?", options:["25","30","35","40"], correct:"B", explanation:"15% of 200 = 0.15 × 200 = 30." },
      { q:"The average of 5 numbers is 20. If one number is removed, the average becomes 18. What is the removed number?", options:["24","26","28","30"], correct:"C", explanation:"Sum of 5 = 100. Sum of 4 = 72. Removed = 100 − 72 = 28." },
      { q:"If 3x = 81, what is x?", options:["3","4","5","6"], correct:"B", explanation:"3^4 = 81, so x = 4." },
      { q:"A circle has radius 7 cm. What is its circumference? (π = 22/7)", options:["22 cm","44 cm","66 cm","88 cm"], correct:"B", explanation:"C = 2πr = 2 × 22/7 × 7 = 44 cm." },
      { q:"What is the HCF of 24 and 36?", options:["6","8","12","18"], correct:"C", explanation:"HCF(24,36) = 12." },
      { q:"A pipe fills a tank in 6 hours, another empties it in 8 hours. If both are open, the tank fills in:", options:["12 hours","18 hours","24 hours","48 hours"], correct:"C", explanation:"Net rate = 1/6 − 1/8 = 1/24. Time = 24 hours." }
    ],

    "General Knowledge – Science & World": [
      { q:"Which is the largest ocean in the world?", options:["Atlantic","Indian","Arctic","Pacific"], correct:"D", explanation:"The Pacific Ocean is the largest, covering about 165 million km²." },
      { q:"The human body has how many bones?", options:["196","206","216","226"], correct:"B", explanation:"An adult human body has 206 bones." },
      { q:"Which element has the chemical symbol 'Fe'?", options:["Fluorine","Francium","Iron","Fermium"], correct:"C", explanation:"Fe comes from the Latin word 'Ferrum', meaning iron." },
      { q:"The Great Wall of China was primarily built during which dynasty?", options:["Han","Tang","Ming","Qing"], correct:"C", explanation:"Most of the existing Great Wall was built during the Ming Dynasty (1368–1644)." },
      { q:"Which country has the largest population in the world?", options:["USA","India","China","Russia"], correct:"B", explanation:"India surpassed China in 2023 to become the world's most populous country." },
      { q:"The Eiffel Tower is located in which city?", options:["London","Berlin","Rome","Paris"], correct:"D", explanation:"The Eiffel Tower is in Paris, France, built in 1889." },
      { q:"Which gas do plants absorb during photosynthesis?", options:["Oxygen","Nitrogen","Carbon Dioxide","Hydrogen"], correct:"C", explanation:"Plants absorb CO₂ and release O₂ during photosynthesis." },
      { q:"The Nobel Peace Prize is awarded in which city?", options:["Stockholm","Oslo","Copenhagen","Helsinki"], correct:"B", explanation:"The Nobel Peace Prize is awarded in Oslo, Norway (all other Nobel Prizes in Stockholm)." },
      { q:"Which planet is closest to the Sun?", options:["Venus","Earth","Mars","Mercury"], correct:"D", explanation:"Mercury is the closest planet to the Sun." },
      { q:"DNA stands for:", options:["Deoxyribonucleic Acid","Diribonucleic Acid","Deoxyribose Nucleic Acid","Deoxyribonuclear Acid"], correct:"A", explanation:"DNA stands for Deoxyribonucleic Acid, the molecule carrying genetic information." },
      { q:"The currency of Japan is:", options:["Won","Yuan","Yen","Ringgit"], correct:"C", explanation:"The Japanese currency is the Yen (¥)." },
      { q:"Which is the smallest country in the world by area?", options:["Monaco","San Marino","Liechtenstein","Vatican City"], correct:"D", explanation:"Vatican City is the smallest country at about 0.44 km²." },
      { q:"The Amazon River is located in which continent?", options:["Africa","Asia","South America","North America"], correct:"C", explanation:"The Amazon River flows through South America, primarily Brazil." },
      { q:"Which vitamin is essential for blood clotting?", options:["Vitamin A","Vitamin C","Vitamin D","Vitamin K"], correct:"D", explanation:"Vitamin K is essential for the synthesis of blood-clotting proteins." },
      { q:"The headquarters of WHO is in:", options:["New York","Paris","Geneva","London"], correct:"C", explanation:"The World Health Organization (WHO) is headquartered in Geneva, Switzerland." }
    ]

  };

  // Merge into the main deck object
  Object.assign(MCQ_BUILTIN_DECKS, extra);

  // Refresh selector if already rendered
  if (typeof _mcqPopulateDeckSelector === 'function') _mcqPopulateDeckSelector();

})();

// ══════════════════════════════════════════════════════════════════════
//  EXAM SIMULATION MODE  — timed mock test with score report
// ══════════════════════════════════════════════════════════════════════

let _mcqExamTimer      = null;   // setInterval handle
let _mcqExamSecsLeft   = 0;
let _mcqExamRunning    = false;
let _mcqExamAnswers    = [];     // { qIdx, chosen, correct, isCorrect }

const MCQ_EXAM_PRESETS = [
  { label: '10 Q / 5 min',  questions: 10, minutes: 5  },
  { label: '20 Q / 10 min', questions: 20, minutes: 10 },
  { label: '30 Q / 15 min', questions: 30, minutes: 15 },
  { label: '50 Q / 25 min', questions: 50, minutes: 25 },
  { label: '100 Q / 60 min',questions:100, minutes: 60 },
];

function mcqStartExam(presetIdx) {
  if (!_mcqCurrentDeck) {
    if (typeof _showStudyToast === 'function') _showStudyToast('Load a deck first');
    return;
  }
  const preset = MCQ_EXAM_PRESETS[presetIdx] || MCQ_EXAM_PRESETS[1];
  const pool   = _mcqCurrentDeck.questions;
  const count  = Math.min(preset.questions, pool.length);

  // Shuffle and pick
  const shuffled = [...pool.keys()].sort(() => Math.random() - 0.5).slice(0, count);

  _mcqExamAnswers  = [];
  _mcqSessionQueue = shuffled;
  _mcqSessionIdx   = 0;
  _mcqSessionScore = 0;
  _mcqSessionTotal = 0;
  _mcqExamRunning  = true;
  _mcqExamSecsLeft = preset.minutes * 60;

  // Show exam UI
  _mcqShowExamUI(preset);
  _mcqRenderQuestion();
  _mcqStartTimer();
}

function _mcqShowExamUI(preset) {
  const timerEl = document.getElementById('mcqExamTimer');
  const modeEl  = document.getElementById('mcqExamModeBanner');
  if (modeEl) {
    modeEl.style.display = 'flex';
    modeEl.innerHTML =
      '<span class="mcq-exam-label">📝 Exam Mode — ' + preset.label + '</span>' +
      '<span class="mcq-exam-time" id="mcqExamTimerDisplay">' + _mcqFmtTime(_mcqExamSecsLeft) + '</span>' +
      '<button class="mcq-exam-abort" onclick="mcqAbortExam()">✕ End</button>';
  }
  const sessionProg = document.getElementById('mcqSessionProgress');
  if (sessionProg) sessionProg.style.display = 'flex';
}

function _mcqStartTimer() {
  clearInterval(_mcqExamTimer);
  _mcqExamTimer = setInterval(() => {
    _mcqExamSecsLeft--;
    const el = document.getElementById('mcqExamTimerDisplay');
    if (el) {
      el.textContent = _mcqFmtTime(_mcqExamSecsLeft);
      if (_mcqExamSecsLeft <= 60) el.classList.add('mcq-timer-warning');
      if (_mcqExamSecsLeft <= 10) el.classList.add('mcq-timer-critical');
    }
    if (_mcqExamSecsLeft <= 0) mcqFinishExam();
  }, 1000);
}

function mcqAbortExam() {
  if (!confirm('End exam now? Your progress will be saved.')) return;
  mcqFinishExam();
}

function mcqFinishExam() {
  clearInterval(_mcqExamTimer);
  _mcqExamRunning = false;

  const banner = document.getElementById('mcqExamModeBanner');
  if (banner) banner.style.display = 'none';

  // Force session end
  _mcqSessionIdx = _mcqSessionQueue.length;
  _mcqRenderQuestion(); // triggers done card

  // Save score
  if (typeof _mcqSaveScore === 'function') {
    _mcqSaveScore(_mcqCurrentDeck.name, _mcqSessionScore, _mcqSessionTotal);
  }
}

function _mcqFmtTime(secs) {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return m + ':' + String(s).padStart(2, '0');
}

// Patch mcqNextQuestion to auto-finish exam when time is up
const _origNextQ = window.mcqNextQuestion;
window.mcqNextQuestion = function() {
  if (_mcqExamRunning && _mcqExamSecsLeft <= 0) {
    mcqFinishExam();
    return;
  }
  if (typeof _origNextQ === 'function') _origNextQ();
};

window.mcqStartExam    = mcqStartExam;
window.mcqAbortExam    = mcqAbortExam;
window.mcqFinishExam   = mcqFinishExam;
window.MCQ_EXAM_PRESETS = MCQ_EXAM_PRESETS;

// ══════════════════════════════════════════════════════════════════════
//  DAILY STREAK + TARGET SYSTEM
// ══════════════════════════════════════════════════════════════════════

const MCQ_STREAK_STORE  = 'nexora_mcq_streak';
const MCQ_DAILY_TARGET  = 5; // questions per day to keep streak

function _mcqGetStreakData() {
  try { return JSON.parse(localStorage.getItem(MCQ_STREAK_STORE) || '{}'); }
  catch(e) { return {}; }
}

function _mcqSaveStreakData(data) {
  try { localStorage.setItem(MCQ_STREAK_STORE, JSON.stringify(data)); }
  catch(e) {}
}

function _mcqTodayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function _mcqRecordAnswer() {
  const data    = _mcqGetStreakData();
  const today   = _mcqTodayKey();
  data[today]   = (data[today] || 0) + 1;

  // Calculate streak
  let streak = 0;
  let d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (data[key] && data[key] >= MCQ_DAILY_TARGET) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (key === today && (data[key] || 0) < MCQ_DAILY_TARGET) {
      // Today not yet complete — streak continues from yesterday
      d.setDate(d.getDate() - 1);
      const yKey = d.toISOString().slice(0, 10);
      if (data[yKey] && data[yKey] >= MCQ_DAILY_TARGET) {
        // Yesterday was complete, streak is alive
        break;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  data._streak = streak;
  data._todayCount = data[today];
  _mcqSaveStreakData(data);
  _mcqUpdateStreakUI(data);
  return data;
}

function _mcqUpdateStreakUI(data) {
  const today     = _mcqTodayKey();
  const todayDone = data[today] || 0;
  const streak    = data._streak || 0;
  const remaining = Math.max(0, MCQ_DAILY_TARGET - todayDone);

  // Update streak badge on tab
  const badge = document.getElementById('mcqDueBadge');
  // (badge already shows due count — streak shown in panel instead)

  // Update streak panel inside MCQ tab
  const streakEl = document.getElementById('mcqStreakDisplay');
  if (streakEl) {
    streakEl.innerHTML =
      '<span class="mcq-streak-flame">' + (streak > 0 ? '🔥' : '💤') + '</span>' +
      '<span class="mcq-streak-count">' + streak + ' day streak</span>' +
      '<span class="mcq-streak-today">' +
        (remaining > 0
          ? todayDone + ' / ' + MCQ_DAILY_TARGET + ' today'
          : '✅ Daily target done!') +
      '</span>';

    // Progress ring fill
    const pct = Math.min(100, Math.round((todayDone / MCQ_DAILY_TARGET) * 100));
    const ring = document.getElementById('mcqStreakRingFill');
    if (ring) {
      const circumference = 2 * Math.PI * 18; // r=18
      ring.style.strokeDashoffset = circumference * (1 - pct / 100);
    }
  }

  // Notify if target just hit
  if (todayDone === MCQ_DAILY_TARGET) {
    if (typeof _showStudyToast === 'function') _showStudyToast('🔥 Daily target reached! Streak: ' + streak + ' days');
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🔥 BCS Daily Target Done!', {
          body: 'You answered ' + MCQ_DAILY_TARGET + ' questions today. Streak: ' + streak + ' days!',
          icon: '/icon.svg',
        });
      } catch(e) {}
    }
  }
}

// Patch _mcqUpdateSRS to record every answered question
const _origUpdateSRS = window._mcqUpdateSRS || _mcqUpdateSRS;
window._mcqUpdateSRS = function(qState, isCorrect) {
  _origUpdateSRS(qState, isCorrect);
  _mcqRecordAnswer();
};

// Init streak UI on tab open
function _mcqInitStreakUI() {
  const data = _mcqGetStreakData();
  _mcqUpdateStreakUI(data);
}

window._mcqInitStreakUI  = _mcqInitStreakUI;
window._mcqRecordAnswer  = _mcqRecordAnswer;

// ══════════════════════════════════════════════════════════════════════
//  WRONG-ANSWER PODCAST  — 30-sec audio explanation for wrong answers
// ══════════════════════════════════════════════════════════════════════

async function mcqWrongAnswerPodcast(qIdx) {
  const q = _mcqCurrentDeck?.questions[qIdx];
  if (!q) return;

  const btn = document.getElementById('mcqWrongPodcastBtn_' + qIdx);
  if (btn) { btn.textContent = '⏳ Generating…'; btn.disabled = true; }

  const correctOpt = q.options['ABCD'.indexOf(q.correct)] || '';
  const scriptText =
    'HOST: Let me explain this BCS question. ' + q.q +
    ' STUDENT: What is the correct answer? ' +
    'HOST: The correct answer is ' + q.correct + ': ' + correctOpt + '. ' +
    (q.explanation || '') +
    ' STUDENT: I see, so I should remember that. ' +
    'HOST: Exactly. Keep this in mind for your exam!';

  try {
    // Try CF Worker TTS line by line
    if (typeof _hasCFWorker === 'function' && _hasCFWorker() &&
        typeof _getCFWorkerUrl === 'function') {

      const lines = [
        { speaker: 'HOST',    text: 'Let me explain. ' + q.q + '. The correct answer is ' + q.correct + ': ' + correctOpt + '.' },
        { speaker: 'STUDENT', text: 'I see. Can you explain why?' },
        { speaker: 'HOST',    text: (q.explanation || 'This is an important fact to remember for BCS.') + ' Keep this in mind!' },
      ];

      const audioUrls = [];
      for (const line of lines) {
        const voice = line.speaker === 'HOST' ? 'en-us-male' : 'en-us-female';
        try {
          const res = await fetch(_getCFWorkerUrl() + '/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: line.text.slice(0, 300), voice }),
          });
          if (res.ok) {
            const blob = await res.blob();
            audioUrls.push(URL.createObjectURL(blob));
          }
        } catch(e) {}
      }

      if (audioUrls.length > 0) {
        _mcqPlayAudioSequence(audioUrls, () => {
          audioUrls.forEach(u => URL.revokeObjectURL(u));
          if (btn) { btn.textContent = '🎧 Mini Podcast'; btn.disabled = false; }
        });
        if (btn) btn.textContent = '🔊 Playing…';
        return;
      }
    }

    // Web Speech fallback
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(
        'The correct answer is ' + q.correct + ': ' + correctOpt + '. ' + (q.explanation || '')
      );
      utt.rate = 0.9;
      utt.onend = () => { if (btn) { btn.textContent = '🎧 Mini Podcast'; btn.disabled = false; } };
      window.speechSynthesis.speak(utt);
      if (btn) btn.textContent = '🔊 Playing…';
    }
  } catch(e) {
    if (btn) { btn.textContent = '🎧 Mini Podcast'; btn.disabled = false; }
    if (typeof _showStudyToast === 'function') _showStudyToast('Audio generation failed');
  }
}

function _mcqPlayAudioSequence(urls, onDone) {
  let idx = 0;
  function playNext() {
    if (idx >= urls.length) { if (onDone) onDone(); return; }
    const audio = new Audio(urls[idx++]);
    audio.onended = playNext;
    audio.onerror = playNext;
    audio.play().catch(playNext);
  }
  playNext();
}

// Patch feedback renderer to add wrong-answer podcast button
const _origRenderQ = window._mcqRenderQuestion || _mcqRenderQuestion;
// We hook into the option click handler by patching the feedback HTML
// The button is injected in mcqAIExplain area — we add it to mcq-feedback-actions
// via a MutationObserver on #mcqQuizFeedback
(function _patchFeedbackForPodcast() {
  const observer = new MutationObserver(() => {
    const feedback = document.getElementById('mcqQuizFeedback');
    if (!feedback) return;
    const actions = feedback.querySelector('.mcq-feedback-actions');
    if (!actions || actions.querySelector('.mcq-wrong-podcast-btn')) return;
    // Only add for wrong answers
    const isWrong = feedback.querySelector('.mcq-feedback-wrong');
    if (!isWrong) return;
    const qIdx = _mcqSessionQueue[_mcqSessionIdx - 1];
    if (qIdx === undefined) return;
    const podBtn = document.createElement('button');
    podBtn.className = 'mcq-audio-btn mcq-wrong-podcast-btn';
    podBtn.id = 'mcqWrongPodcastBtn_' + qIdx;
    podBtn.textContent = '🎧 Mini Podcast';
    podBtn.addEventListener('click', () => mcqWrongAnswerPodcast(qIdx));
    actions.appendChild(podBtn);
  });
  // Start observing once DOM is ready
  const startObs = () => {
    const feedback = document.getElementById('mcqQuizFeedback');
    if (feedback) observer.observe(feedback, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObs);
  else startObs();
})();

window.mcqWrongAnswerPodcast = mcqWrongAnswerPodcast;

// ══════════════════════════════════════════════════════════════════════
//  OFFLINE SYNC  — cache all decks + progress to IndexedDB
// ══════════════════════════════════════════════════════════════════════

const MCQ_IDB_NAME    = 'nexora_mcq_offline';
const MCQ_IDB_VERSION = 1;
const MCQ_IDB_STORE   = 'decks';

let _mcqIDB = null;

function _mcqOpenIDB() {
  if (_mcqIDB) return Promise.resolve(_mcqIDB);
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB not supported')); return; }
    const req = indexedDB.open(MCQ_IDB_NAME, MCQ_IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MCQ_IDB_STORE)) {
        db.createObjectStore(MCQ_IDB_STORE, { keyPath: 'name' });
      }
    };
    req.onsuccess = () => { _mcqIDB = req.result; resolve(_mcqIDB); };
    req.onerror   = () => reject(req.error);
  });
}

async function mcqSyncOffline() {
  const btn = document.getElementById('mcqOfflineSyncBtn');
  if (btn) { btn.textContent = '⏳ Syncing…'; btn.disabled = true; }

  try {
    const db = await _mcqOpenIDB();
    const tx = db.transaction(MCQ_IDB_STORE, 'readwrite');
    const store = tx.objectStore(MCQ_IDB_STORE);

    let count = 0;
    for (const [name, questions] of Object.entries(MCQ_BUILTIN_DECKS)) {
      const progress = _mcqLoadProgress(name);
      store.put({ name, questions, progress, syncedAt: Date.now() });
      count++;
    }

    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror    = () => rej(tx.error);
    });

    if (typeof _showStudyToast === 'function') {
      _showStudyToast('✅ ' + count + ' decks saved offline');
    }
    _mcqUpdateOfflineStatus(true, count);
  } catch(e) {
    if (typeof _showStudyToast === 'function') _showStudyToast('Offline sync failed: ' + e.message);
  } finally {
    if (btn) { btn.textContent = '📥 Sync Offline'; btn.disabled = false; }
  }
}

async function _mcqLoadFromIDB(deckName) {
  try {
    const db    = await _mcqOpenIDB();
    const tx    = db.transaction(MCQ_IDB_STORE, 'readonly');
    const store = tx.objectStore(MCQ_IDB_STORE);
    const req   = store.get(deckName);
    return await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result || null);
      req.onerror   = () => rej(req.error);
    });
  } catch(e) { return null; }
}

// Patch mcqLoadDeck to fall back to IDB when offline
const _origLoadDeck = window.mcqLoadDeck;
window.mcqLoadDeck = async function(deckName) {
  if (navigator.onLine) {
    return _origLoadDeck(deckName);
  }
  // Offline: try IDB
  const cached = await _mcqLoadFromIDB(deckName);
  if (cached && cached.questions) {
    MCQ_BUILTIN_DECKS[deckName] = cached.questions;
    if (cached.progress) {
      const all = _mcqGetAllProgress();
      all[deckName] = cached.progress;
      _mcqSetAllProgress(all);
    }
    if (typeof _showStudyToast === 'function') _showStudyToast('📴 Loaded from offline cache');
    return _origLoadDeck(deckName);
  }
  if (typeof _showStudyToast === 'function') _showStudyToast('No offline data. Connect to internet first.');
};

function _mcqUpdateOfflineStatus(synced, count) {
  const el = document.getElementById('mcqOfflineStatus');
  if (!el) return;
  el.textContent = synced
    ? '✅ ' + count + ' decks available offline'
    : '☁️ Not synced yet';
}

async function _mcqCheckOfflineStatus() {
  try {
    const db    = await _mcqOpenIDB();
    const tx    = db.transaction(MCQ_IDB_STORE, 'readonly');
    const store = tx.objectStore(MCQ_IDB_STORE);
    const count = await new Promise((res, rej) => {
      const req = store.count();
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
    _mcqUpdateOfflineStatus(count > 0, count);
  } catch(e) {}
}

window.mcqSyncOffline = mcqSyncOffline;

// ── Patch initMCQModule to wire new UI elements ──────────────────────

const _origInitMCQ = window.initMCQModule;
window.initMCQModule = function() {
  if (typeof _origInitMCQ === 'function') _origInitMCQ();

  // Exam mode buttons
  document.querySelectorAll('.mcq-exam-preset-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => mcqStartExam(i));
  });

  // Offline sync button
  const syncBtn = document.getElementById('mcqOfflineSyncBtn');
  if (syncBtn) syncBtn.addEventListener('click', mcqSyncOffline);

  // Init streak UI
  if (typeof _mcqInitStreakUI === 'function') _mcqInitStreakUI();

  // Check offline status
  _mcqCheckOfflineStatus();
};

// ══════════════════════════════════════════════════════════════════════
//  LIVE BCS QUESTION BANK  — Hugging Face dataset integration
//
//  Source: azminetoushikwasi/bcs-10-40th-GK-ICT-DM-NMS (Apache-2.0)
//  Schema: { question, options[], answer:"1-4", category_en, file_name }
//  Direct fetch works — HuggingFace serves with CORS: * headers.
//  Fallback: IndexedDB cache → built-in decks.
// ══════════════════════════════════════════════════════════════════════

const HF_DATASET_URL =
  'https://huggingface.co/datasets/azminetoushikwasi/' +
  'bcs-10-40th-GK-ICT-DM-NMS/resolve/main/' +
  'cleaned_bcs-data_20240901_002427.json';

const HF_CACHE_KEY    = 'nexora_hf_bcs_cache';
const HF_CACHE_TS_KEY = 'nexora_hf_bcs_cache_ts';
const HF_CACHE_TTL    = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Transform HF record → Nexora MCQ format ──────────────────────────
// HF answer field: "1" = option[0], "2" = option[1], etc.
function _hfTransformRecord(row) {
  const answerIdx = parseInt(row.answer, 10) - 1; // 0-based
  const letters   = ['A','B','C','D'];
  const correct   = letters[answerIdx] || 'A';
  return {
    q:           (row.question || '').trim(),
    options:     (row.options  || []).map(o => String(o).trim()),
    correct,
    explanation: '', // dataset has no explanation field
    category:    row.category_en   || 'General Knowledge',
    source:      row.file_name     || 'BCS',
    lang:        row.language      || 'bn',
  };
}

// ── Group questions by category_en ───────────────────────────────────
function _hfGroupByCategory(rows) {
  const groups = {};
  for (const row of rows) {
    const cat = (row.category_en || 'General Knowledge').trim();
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(_hfTransformRecord(row));
  }
  return groups;
}

// ── Fetch with cache ──────────────────────────────────────────────────
async function _hfFetchDataset() {
  // Check cache freshness
  const cachedTs = parseInt(localStorage.getItem(HF_CACHE_TS_KEY) || '0', 10);
  if (Date.now() - cachedTs < HF_CACHE_TTL) {
    try {
      const cached = JSON.parse(localStorage.getItem(HF_CACHE_KEY) || 'null');
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    } catch(e) {}
  }

  // Fetch live
  const res = await fetch(HF_DATASET_URL, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('HF fetch failed: ' + res.status);
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) throw new Error('Empty dataset');

  // Cache it
  try {
    localStorage.setItem(HF_CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(HF_CACHE_TS_KEY, String(Date.now()));
  } catch(e) {
    // localStorage quota — store in IDB instead
    try {
      const db = await _mcqOpenIDB();
      const tx = db.transaction(MCQ_IDB_STORE, 'readwrite');
      tx.objectStore(MCQ_IDB_STORE).put({ name: '__hf_raw__', questions: data, syncedAt: Date.now() });
    } catch(e2) {}
  }

  return data;
}

// ── Load live BCS decks into MCQ_BUILTIN_DECKS ────────────────────────
async function mcqLoadLiveDecks() {
  const btn = document.getElementById('mcqLiveLoadBtn');
  const statusEl = document.getElementById('mcqLiveStatus');

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Fetching…'; }
  if (statusEl) statusEl.textContent = 'Connecting to BCS question bank…';

  try {
    const raw    = await _hfFetchDataset();
    const groups = _hfGroupByCategory(raw);
    const count  = Object.keys(groups).length;
    const total  = raw.length;

    // Merge into built-in decks with "BCS Live:" prefix
    for (const [cat, questions] of Object.entries(groups)) {
      const deckName = 'BCS Live: ' + cat + ' (' + questions.length + ' Q)';
      MCQ_BUILTIN_DECKS[deckName] = questions;
    }

    // Also create a combined "All BCS Questions" deck
    const allQ = Object.values(groups).flat();
    MCQ_BUILTIN_DECKS['BCS Live: All Questions (' + total + ' Q)'] = allQ;

    // Refresh selector
    if (typeof _mcqPopulateDeckSelector === 'function') _mcqPopulateDeckSelector();

    const msg = '✅ Loaded ' + total + ' live BCS questions across ' + count + ' categories';
    if (statusEl) statusEl.textContent = msg;
    if (btn) { btn.textContent = '🔄 Refresh'; btn.disabled = false; }
    if (typeof _showStudyToast === 'function') _showStudyToast(msg);

    // Auto-sync to IndexedDB for offline use
    if (typeof mcqSyncOffline === 'function') mcqSyncOffline();

    return groups;
  } catch(err) {
    const msg = '❌ ' + (err.message || 'Failed to load live questions');
    if (statusEl) statusEl.textContent = msg + ' — using built-in decks';
    if (btn) { btn.textContent = '🌐 Load Live BCS'; btn.disabled = false; }
    if (typeof _showStudyToast === 'function') _showStudyToast(msg);
    console.warn('[Nexora MCQ] HF fetch failed:', err);
    return null;
  }
}

// ── AI-generate explanation for Bangla questions ─────────────────────
// Since HF dataset has no explanations, we generate them on demand.
async function mcqGenerateExplanation(qIdx) {
  const q = _mcqCurrentDeck?.questions[qIdx];
  if (!q) return;

  const btn = document.querySelector('.mcq-explain-btn');
  if (btn) { btn.textContent = '⏳ Asking AI…'; btn.disabled = true; }

  try {
    const correctOpt = q.options['ABCD'.indexOf(q.correct)] || '';
    const sys = 'You are a BCS exam tutor. The question may be in Bangla. ' +
                'Explain why the correct answer is right in 2-3 clear sentences. ' +
                'If the question is in Bangla, answer in Bangla. Be concise.';
    const usr = 'Question: ' + q.q +
                '\nCorrect answer: ' + q.correct + ') ' + correctOpt;

    let reply = '';
    if (typeof callStudyAI === 'function') reply = await callStudyAI(sys, usr);
    if (!reply) throw new Error('No reply');

    // Cache explanation back into the question object
    q.explanation = reply;

    const feedbackEl = document.getElementById('mcqQuizFeedback');
    if (feedbackEl) {
      let aiDiv = feedbackEl.querySelector('.mcq-ai-explanation');
      if (!aiDiv) {
        aiDiv = document.createElement('div');
        aiDiv.className = 'mcq-ai-explanation';
        feedbackEl.appendChild(aiDiv);
      }
      aiDiv.innerHTML = '<strong>🧠 AI:</strong> ' +
        reply.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    }
  } catch(e) {
    if (typeof _showStudyToast === 'function') _showStudyToast('AI explanation failed');
  } finally {
    if (btn) { btn.textContent = '🧠 AI Explain'; btn.disabled = false; }
  }
}

// ── Patch mcqAIExplain to use the new generator ───────────────────────
window.mcqAIExplain = mcqGenerateExplanation;

// ── Patch initMCQModule to wire the live load button ─────────────────
const _origInitMCQ2 = window.initMCQModule;
window.initMCQModule = function() {
  if (typeof _origInitMCQ2 === 'function') _origInitMCQ2();

  const liveBtn = document.getElementById('mcqLiveLoadBtn');
  if (liveBtn) {
    liveBtn.addEventListener('click', mcqLoadLiveDecks);
  }

  // Auto-load live decks if online and cache is stale
  const cachedTs = parseInt(localStorage.getItem(HF_CACHE_TS_KEY) || '0', 10);
  const cacheAge = Date.now() - cachedTs;
  if (navigator.onLine && cacheAge > HF_CACHE_TTL) {
    // Load silently in background after 1s
    setTimeout(() => {
      mcqLoadLiveDecks().catch(() => {});
    }, 1000);
  } else if (cachedTs > 0) {
    // Restore from cache immediately
    const cached = (() => {
      try { return JSON.parse(localStorage.getItem(HF_CACHE_KEY) || 'null'); }
      catch(e) { return null; }
    })();
    if (cached && Array.isArray(cached)) {
      const groups = _hfGroupByCategory(cached);
      for (const [cat, questions] of Object.entries(groups)) {
        MCQ_BUILTIN_DECKS['BCS Live: ' + cat + ' (' + questions.length + ' Q)'] = questions;
      }
      MCQ_BUILTIN_DECKS['BCS Live: All Questions (' + cached.length + ' Q)'] = Object.values(groups).flat();
      if (typeof _mcqPopulateDeckSelector === 'function') _mcqPopulateDeckSelector();
      const statusEl = document.getElementById('mcqLiveStatus');
      if (statusEl) {
        const age = Math.round(cacheAge / 3600000);
        statusEl.textContent = '✅ ' + cached.length + ' questions loaded from cache (' + age + 'h ago)';
      }
    }
  }
};

window.mcqLoadLiveDecks       = mcqLoadLiveDecks;
window._hfFetchDataset        = _hfFetchDataset;
window._hfTransformRecord     = _hfTransformRecord;
window.mcqGenerateExplanation = mcqGenerateExplanation;

// ══════════════════════════════════════════════════════════════════════
//  FINAL POLISH — Category filters · Pagination · Pre-generate explanations
// ══════════════════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────────────────────────
let _mcqActiveCategoryFilter = 'all';  // 'all' or a category_en string
let _mcqPageSize             = 15;     // questions per page
let _mcqCurrentPage          = 0;      // 0-based page index
let _mcqFilteredQueue        = [];     // filtered + paginated session queue

// ── Category filter ───────────────────────────────────────────────────

function _mcqGetCategories() {
  if (!_mcqCurrentDeck) return [];
  const cats = new Set();
  _mcqCurrentDeck.questions.forEach(q => {
    if (q.category) cats.add(q.category);
  });
  return ['all', ...Array.from(cats).sort()];
}

function _mcqRenderCategoryFilter() {
  const wrap = document.getElementById('mcqCategoryFilterWrap');
  if (!wrap) return;
  const cats = _mcqGetCategories();
  if (cats.length <= 2) { wrap.style.display = 'none'; return; } // only show if >1 real category

  wrap.style.display = 'flex';
  wrap.innerHTML = cats.map(cat =>
    '<button class="mcq-cat-btn' + (cat === _mcqActiveCategoryFilter ? ' active' : '') + '" data-cat="' + cat + '">' +
      (cat === 'all' ? '🗂 All' : cat) +
    '</button>'
  ).join('');

  wrap.querySelectorAll('.mcq-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _mcqActiveCategoryFilter = btn.dataset.cat;
      _mcqCurrentPage = 0;

      // Show spinner on the filter wrap while rebuilding
      const wrap = document.getElementById('mcqCategoryFilterWrap');
      if (wrap) {
        const spinner = document.createElement('span');
        spinner.className = 'mcq-cat-spinner';
        spinner.id = 'mcqCatSpinner';
        wrap.appendChild(spinner);
      }

      // Yield one frame so the spinner paints before the (sync) rebuild
      requestAnimationFrame(() => {
        _mcqRenderCategoryFilter();
        _mcqBuildFilteredQueue();
        _mcqRenderPagination();
        _mcqSessionIdx   = 0;
        _mcqSessionScore = 0;
        _mcqSessionTotal = 0;
        _mcqRenderQuestion();
        // Spinner is removed when _mcqRenderCategoryFilter re-renders the wrap
      });
    });
  });
}

function _mcqBuildFilteredQueue() {
  if (!_mcqLearningState) return;
  const now = Date.now();

  // Start from the full due queue
  let queue = _mcqGetDueQueue(_mcqLearningState);

  // Apply category filter
  if (_mcqActiveCategoryFilter !== 'all') {
    queue = queue.filter(idx => {
      const q = _mcqCurrentDeck.questions[idx];
      return q && q.category === _mcqActiveCategoryFilter;
    });
  }

  // Apply pagination window
  const start = _mcqCurrentPage * _mcqPageSize;
  _mcqFilteredQueue  = queue;           // full filtered list (for pagination display)
  _mcqSessionQueue   = queue.slice(start, start + _mcqPageSize);
}

// ── Pagination ────────────────────────────────────────────────────────

function _mcqRenderPagination() {
  const wrap = document.getElementById('mcqPaginationWrap');
  if (!wrap) return;

  const total     = _mcqFilteredQueue.length;
  const totalPages = Math.ceil(total / _mcqPageSize);

  if (totalPages <= 1) { wrap.style.display = 'none'; return; }

  wrap.style.display = 'flex';
  const start = _mcqCurrentPage * _mcqPageSize + 1;
  const end   = Math.min((_mcqCurrentPage + 1) * _mcqPageSize, total);

  wrap.innerHTML =
    '<button class="mcq-page-btn" id="mcqPagePrev" ' + (_mcqCurrentPage === 0 ? 'disabled' : '') + '>‹ Prev</button>' +
    '<span class="mcq-page-info">' + start + '–' + end + ' of ' + total + '</span>' +
    '<button class="mcq-page-btn" id="mcqPageNext" ' + (_mcqCurrentPage >= totalPages - 1 ? 'disabled' : '') + '>Next ›</button>';

  wrap.querySelector('#mcqPagePrev')?.addEventListener('click', () => {
    if (_mcqCurrentPage > 0) {
      _mcqCurrentPage--;
      _mcqBuildFilteredQueue();
      _mcqRenderPagination();
      _mcqSessionIdx = 0; _mcqSessionScore = 0; _mcqSessionTotal = 0;
      _mcqRenderQuestion();
    }
  });
  wrap.querySelector('#mcqPageNext')?.addEventListener('click', () => {
    if ((_mcqCurrentPage + 1) * _mcqPageSize < _mcqFilteredQueue.length) {
      _mcqCurrentPage++;
      _mcqBuildFilteredQueue();
      _mcqRenderPagination();
      _mcqSessionIdx = 0; _mcqSessionScore = 0; _mcqSessionTotal = 0;
      _mcqRenderQuestion();
    }
  });
}

// ── Patch mcqLoadDeck to init filters + pagination ────────────────────
const _origLoadDeckPolish = window.mcqLoadDeck;
window.mcqLoadDeck = async function(deckName) {
  _mcqActiveCategoryFilter = 'all';
  _mcqCurrentPage          = 0;
  await _origLoadDeckPolish(deckName);
  _mcqBuildFilteredQueue();
  _mcqRenderCategoryFilter();
  _mcqRenderPagination();
  // Re-render question using filtered queue
  _mcqSessionIdx = 0; _mcqSessionScore = 0; _mcqSessionTotal = 0;
  _mcqRenderQuestion();
};

// ── Patch _mcqGetDueQueue usage in _mcqRenderQuestion ─────────────────
// Override _mcqSessionQueue building to always go through filtered queue
const _origRenderQPolish = window._mcqRenderQuestion || _mcqRenderQuestion;
window._mcqRenderQuestion = function() {
  // If filtered queue is set and session queue is empty, rebuild
  if (_mcqSessionQueue.length === 0 && _mcqFilteredQueue.length > 0) {
    _mcqBuildFilteredQueue();
  }
  _origRenderQPolish();
};

// ── Background explanation pre-generation ────────────────────────────
// After a deck loads, silently pre-generate explanations for the first
// N questions that have no explanation yet, using idle time.

const MCQ_PREGEN_COUNT = 10; // pre-generate for first 10 questions
let   _mcqPregenRunning = false;

async function _mcqPregenExplanations() {
  if (_mcqPregenRunning || !_mcqCurrentDeck) return;
  if (typeof callStudyAI !== 'function') return;

  _mcqPregenRunning = true;
  const questions = _mcqCurrentDeck.questions;
  let generated = 0;

  for (let i = 0; i < questions.length && generated < MCQ_PREGEN_COUNT; i++) {
    const q = questions[i];
    if (q.explanation && q.explanation.trim()) continue; // already has one

    // Yield to browser between each call
    await new Promise(r => setTimeout(r, 200));

    try {
      const correctOpt = q.options['ABCD'.indexOf(q.correct)] || '';
      const isBangla   = /[\u0980-\u09FF]/.test(q.q);
      const sys = isBangla
        ? 'আপনি একজন BCS পরীক্ষার শিক্ষক। সঠিক উত্তরটি কেন সঠিক তা ২-৩ বাক্যে বাংলায় ব্যাখ্যা করুন।'
        : 'You are a BCS exam tutor. Explain why the correct answer is right in 2-3 sentences.';
      const usr = 'Question: ' + q.q + '\nCorrect: ' + q.correct + ') ' + correctOpt;

      const reply = await callStudyAI(sys, usr);
      if (reply && reply.trim()) {
        q.explanation = reply.trim();
        generated++;
      }
    } catch(e) {
      break; // stop on first error (rate limit / no key)
    }
  }

  _mcqPregenRunning = false;
  if (generated > 0 && typeof _showStudyToast === 'function') {
    _showStudyToast('🧠 Pre-generated ' + generated + ' explanations');
  }
}

// ── Patch initMCQModule to wire filters, pagination, pregen ──────────
const _origInitMCQ3 = window.initMCQModule;
window.initMCQModule = function() {
  if (typeof _origInitMCQ3 === 'function') _origInitMCQ3();

  // Page size selector
  const pageSizeSel = document.getElementById('mcqPageSizeSelect');
  if (pageSizeSel) {
    pageSizeSel.value = String(_mcqPageSize);
    pageSizeSel.addEventListener('change', () => {
      _mcqPageSize    = parseInt(pageSizeSel.value, 10) || 15;
      _mcqCurrentPage = 0;
      _mcqBuildFilteredQueue();
      _mcqRenderPagination();
      _mcqSessionIdx = 0; _mcqSessionScore = 0; _mcqSessionTotal = 0;
      _mcqRenderQuestion();
    });
  }
};

// Trigger pregen 3 seconds after deck loads (idle time)
const _origLoadDeckPregen = window.mcqLoadDeck;
window.mcqLoadDeck = async function(deckName) {
  await _origLoadDeckPregen(deckName);
  setTimeout(_mcqPregenExplanations, 3000);
};

window._mcqRenderCategoryFilter = _mcqRenderCategoryFilter;
window._mcqRenderPagination     = _mcqRenderPagination;
window._mcqBuildFilteredQueue   = _mcqBuildFilteredQueue;
window._mcqPregenExplanations   = _mcqPregenExplanations;
