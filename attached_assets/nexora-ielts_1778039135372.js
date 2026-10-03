// ============================================================
// nexora-ielts.js  — Production IELTS Preparation Hub
//
// Features:
//   1. Speaking Simulator — Parts 1, 2, 3 with AI band scoring
//   2. Vocabulary & Grammar MCQ Bank (AI-generated + local fallback)
//   3. Writing Task 1 & 2 evaluator
//   4. Progress tracking per skill (Speaking / Writing / Vocab)
//   5. PDF export of full test report
//   6. Configurable examiner persona
//   7. Band score history & trend chart
// ============================================================

// ── Constants ────────────────────────────────────────────────────────
const IELTS_EXAMINER_NAME  = 'Nexora';
const IELTS_PROGRESS_KEY   = 'nexora_ielts_progress';
const IELTS_HISTORY_KEY    = 'nexora_ielts_history';
const IELTS_WRITING_KEY    = 'nexora_ielts_writing';
const IELTS_WEAK_KEY       = 'ielts_weak_areas';
const IELTS_DAILY_KEY      = 'ielts_daily_challenge';
const IELTS_STREAK_KEY     = 'ielts_streak';
const IELTS_NAME_KEY       = 'nexora_candidate_name';

// ── State ─────────────────────────────────────────────────────────────
let _ieltsState = {
  active:    false,
  part:      1,
  qIndex:    0,
  questions: [],
  answers:   [],
  feedback:  [],
  bands:     [],
};

// ── Idle Intro Conversation State ─────────────────────────────────────
// Nexora introduces herself and chats with the candidate before the test
let _ieltsIntroState = {
  active:        false,
  phase:         'intro',    // 'intro' | 'name' | 'warmup' | 'ready'
  candidateName: '',
  recognition:   null,
  warmupQIndex:  0,
};

// Warm-up small-talk questions Nexora asks before the real test starts
const IELTS_WARMUP_QUESTIONS = [
  "So, have you taken the IELTS before, or is this your first time practising?",
  "Great! And just to warm up — what part of the world are you from?",
  "Wonderful! One last warm-up: what do you enjoy doing in your free time?",
];

// ── Pronunciation Challenge State ─────────────────────────────────────
let _ieltsPronState = {
  active:      false,
  wordIndex:   0,
  words:       [],
  scores:      [],
  recognition: null,
};

// Curated IELTS high-frequency pronunciation challenge words
const IELTS_PRON_WORDS = [
  { word: 'Ubiquitous',    phonetic: '/juːˈbɪk.wɪ.təs/',  tip: 'Stress the second syllable: yoo-BIK-wi-tus' },
  { word: 'Phenomenon',    phonetic: '/fɪˈnɒm.ɪ.nɒn/',    tip: 'Four syllables: fe-NOM-i-non' },
  { word: 'Particularly',  phonetic: '/pəˈtɪk.jʊ.lə.li/', tip: 'Don\'t drop the middle: par-TIC-yoo-lar-lee' },
  { word: 'Deteriorate',   phonetic: '/dɪˈtɪə.ri.ə.reɪt/',tip: 'Five syllables: de-TEER-ee-o-rate' },
  { word: 'Consequently',  phonetic: '/ˈkɒn.sɪ.kwənt.li/',tip: 'Stress the first: CON-se-quent-lee' },
  { word: 'Infrastructure',phonetic: '/ˈɪn.frəˌstrʌk.tʃər/',tip: 'Stress: IN-fra-struk-chur' },
  { word: 'Inevitable',    phonetic: '/ɪnˈev.ɪ.tə.bəl/',  tip: 'Stress second: in-EV-i-ta-ble' },
  { word: 'Exacerbate',    phonetic: '/ɪɡˈzæs.ə.beɪt/',   tip: 'Stress second: ig-ZAS-er-bate' },
  { word: 'Substantiate',  phonetic: '/səbˈstæn.ʃi.eɪt/', tip: 'Stress second: sub-STAN-shee-ate' },
  { word: 'Albeit',        phonetic: '/ˌɔːlˈbiː.ɪt/',     tip: 'Two syllables: awl-BEE-it' },
];

// ── Ambient Voice / VAD State ─────────────────────────────────────────
let _ieltsVAD = {
  recognition:    null,
  active:         false,
  silenceTimer:   null,
  interimBuffer:  '',
  finalBuffer:    '',
  silenceMs:      3500,   // ms of silence before stopping mic (user must tap Submit)
  minWords:       6,      // minimum words before silence detection triggers
  liveScoreTimer: null,
  lastLiveScore:  null,
};

let _ieltsWritingState = {
  task: 1,
  prompt: '',
  answer: '',
  feedback: null,
};

let _ieltsMcqState = {
  questions: [],
  index:     0,
  score:     0,
};

// Smart Practice Generator config — persists across a session
let _ieltsPracticeConfig = {
  grammarTopic: 'mixed',
  difficulty:   'medium',
  mode:         'practice',
};

let _ieltsInitDone = false;

// ── Built-in IELTS Speaking Questions ────────────────────────────────
const IELTS_SPEAKING_BANK = {
  part1: [
    "Let's talk about your home. What kind of accommodation do you live in?",
    "Do you enjoy cooking? Why or why not?",
    "What is your favourite time of the day and why?",
    "Have you ever learnt a musical instrument? Would you like to?",
    "How do you usually spend your weekends?",
    "Do you prefer reading books or watching films? Why?",
    "What kind of weather do you enjoy most?",
    "How important is sport in your daily life?",
    "Do you enjoy shopping? Why or why not?",
    "How often do you use public transport?",
    "What do you like about the area where you live?",
    "Are you a morning person or a night person?",
    "Do you prefer spending time indoors or outdoors?",
    "What is your favourite type of food?",
    "How do you keep in touch with friends and family?",
  ],
  part2: [
    "Describe a memorable journey you have taken. You should say: where you went, who you went with, what you did there, and explain why it was memorable.",
    "Talk about a person who has had a positive influence on your life. You should say: who this person is, how you know them, what they did, and explain why they influenced you.",
    "Describe a piece of technology you find particularly useful. You should say: what it is, how you use it, how long you have had it, and explain why you find it so useful.",
    "Describe a time when you helped someone. You should say: who you helped, what the situation was, how you helped them, and explain how you felt afterwards.",
    "Describe a skill you would like to learn. You should say: what the skill is, why you want to learn it, how you would learn it, and explain how it would benefit your life.",
    "Describe a book or film that had a strong effect on you. You should say: what it was, when you first encountered it, what it was about, and explain why it affected you so much.",
  ],
  part3: [
    "Some people think that city life is better than rural life. What is your opinion?",
    "How do you think technology will change the way we work in the next ten years?",
    "Do you think governments should invest more in public transport? Why?",
    "How has social media changed the way people communicate?",
    "Do you think it is important for children to learn a second language at school?",
    "What are the advantages and disadvantages of working from home?",
    "To what extent do you think climate change is the most serious problem facing humanity?",
    "How do you think the role of universities will change in the future?",
    "Do you think that traditional customs and ways of life are worth preserving?",
    "How important is it for people to have a work-life balance?",
  ],
};

// ── Built-in IELTS Vocabulary & Grammar Questions ─────────────────────
const IELTS_MCQ_BANK = {
  vocab: [
    { q: "Choose the word closest in meaning to 'Ubiquitous':", options: ["A) Rare", "B) Dangerous", "C) Present everywhere", "D) Ancient"], correct: "C", explanation: "Ubiquitous means present, appearing, or found everywhere — a key IELTS band 7+ word." },
    { q: "The word 'Mitigate' means:", options: ["A) To worsen", "B) To lessen the severity of", "C) To ignore completely", "D) To celebrate"], correct: "B", explanation: "Mitigate means to make something less severe, serious, or painful." },
    { q: "Choose the correct synonym for 'Eloquent':", options: ["A) Silent", "B) Confused", "C) Articulate and persuasive", "D) Aggressive"], correct: "C", explanation: "Eloquent means fluent and persuasive in speaking or writing." },
    { q: "The word 'Pragmatic' means:", options: ["A) Idealistic", "B) Dealing with things practically", "C) Emotional", "D) Theoretical"], correct: "B", explanation: "Pragmatic means dealing with things sensibly and realistically." },
    { q: "Choose the word that best completes: 'The scientist made a __ discovery that changed medicine.'", options: ["A) trivial", "B) groundbreaking", "C) ordinary", "D) delayed"], correct: "B", explanation: "Groundbreaking means innovative and pioneering — ideal for IELTS academic writing." },
    { q: "The antonym of 'Exacerbate' is:", options: ["A) Worsen", "B) Alleviate", "C) Ignore", "D) Accelerate"], correct: "B", explanation: "Exacerbate means to make worse; alleviate means to make better." },
    { q: "Which word means 'to officially forbid something'?", options: ["A) Permit", "B) Advocate", "C) Prohibit", "D) Encourage"], correct: "C", explanation: "Prohibit means to formally forbid something by law or rule." },
    { q: "The word 'Inevitable' means:", options: ["A) Avoidable", "B) Certain to happen", "C) Surprising", "D) Temporary"], correct: "B", explanation: "Inevitable means certain to happen and unable to be avoided." },
    { q: "Choose the correct collocation: 'The government needs to __ action on climate change.'", options: ["A) do", "B) make", "C) take", "D) have"], correct: "C", explanation: "'Take action' is the correct collocation in English." },
    { q: "The word 'Substantial' means:", options: ["A) Very small", "B) Considerable in size or value", "C) Temporary", "D) Uncertain"], correct: "B", explanation: "Substantial means of considerable importance, size, or worth." },
  ],
  grammar: [
    { q: "Choose the correct sentence:", options: ["A) If I would have known, I would have helped.", "B) If I had known, I would have helped.", "C) If I knew, I would helped.", "D) If I have known, I would help."], correct: "B", explanation: "Third conditional: If + past perfect, would + have + past participle." },
    { q: "Which sentence uses the passive voice correctly?", options: ["A) The report written by the team.", "B) The report was written by the team.", "C) The report has write by the team.", "D) The team was written the report."], correct: "B", explanation: "Passive voice: was/were + past participle + by + agent." },
    { q: "Choose the correct relative clause: 'The scientist __ discovered penicillin was Alexander Fleming.'", options: ["A) which", "B) whom", "C) who", "D) whose"], correct: "C", explanation: "'Who' is used for people as the subject of a relative clause." },
    { q: "Select the correct form: 'By 2030, scientists __ a cure for the disease.'", options: ["A) will find", "B) will have found", "C) found", "D) have found"], correct: "B", explanation: "Future perfect (will have + past participle) for actions completed before a future point." },
    { q: "Which sentence is grammatically correct?", options: ["A) Despite of the rain, we went out.", "B) Despite the rain, we went out.", "C) Despite that it rained, we went out.", "D) Despite of raining, we went out."], correct: "B", explanation: "'Despite' is followed directly by a noun/noun phrase, not 'of' or 'that'." },
    { q: "Choose the correct article: '__ information you provided was helpful.'", options: ["A) A", "B) An", "C) The", "D) No article"], correct: "C", explanation: "'The' is used when referring to specific, known information." },
    { q: "Which is the correct reported speech for: 'I will come tomorrow'?", options: ["A) He said he will come tomorrow.", "B) He said he would come the next day.", "C) He said he comes tomorrow.", "D) He said he came the next day."], correct: "B", explanation: "Reported speech shifts tense back: will → would, tomorrow → the next day." },
    { q: "Select the correct linking word: 'The project was expensive; __, it was completed on time.'", options: ["A) however", "B) therefore", "C) nevertheless", "D) furthermore"], correct: "C", explanation: "'Nevertheless' shows contrast despite a preceding negative point." },
  ],
  mixed: [
    { q: "The phrase 'a double-edged sword' means:", options: ["A) A very sharp weapon", "B) Something with both advantages and disadvantages", "C) A difficult decision", "D) A powerful argument"], correct: "B", explanation: "This idiom describes something that has both positive and negative effects." },
    { q: "Choose the correct sentence for IELTS Writing Task 2:", options: ["A) In my opinion, I think that...", "B) It is widely argued that...", "C) Everybody knows that...", "D) I totally agree because..."], correct: "B", explanation: "'It is widely argued that' is formal and impersonal — ideal for academic writing." },
    { q: "Which word best fits: 'The data __ a significant increase in urban population.'", options: ["A) show", "B) shows", "C) are showing", "D) have shown"], correct: "B", explanation: "'Data' in academic English is often treated as singular: 'the data shows'." },
    { q: "The word 'Furthermore' is used to:", options: ["A) Contrast two ideas", "B) Add additional information", "C) Conclude an argument", "D) Give an example"], correct: "B", explanation: "'Furthermore' adds more information to support a point — a key linking word." },
    { q: "Choose the correct preposition: 'The increase __ pollution is a major concern.'", options: ["A) of", "B) in", "C) at", "D) on"], correct: "B", explanation: "'Increase in' is the correct collocation when referring to a rise in something." },
  ],
};

// ── Writing Task Prompts ──────────────────────────────────────────────
const IELTS_WRITING_PROMPTS = {
  task1: [
    "The graph below shows the percentage of households with internet access in five countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    "The diagram below shows the process of recycling plastic bottles. Summarise the information by selecting and reporting the main features.",
    "The table below shows the number of tourists visiting three cities in 2015 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  ],
  task2: [
    "Some people believe that universities should focus on providing academic knowledge, while others think they should prepare students for employment. Discuss both views and give your own opinion.",
    "In many countries, the gap between the rich and the poor is increasing. What problems does this cause? What solutions can you suggest?",
    "Some people think that the best way to improve public health is to increase the number of sports facilities. Others believe that this would have little effect. Discuss both views and give your own opinion.",
    "Technology is making it easier for people to work from home. Do the advantages of this trend outweigh the disadvantages?",
  ],
};

// ── Storage helpers ───────────────────────────────────────────────────

function _ieltsGetProgress() {
  try { return JSON.parse(localStorage.getItem(IELTS_PROGRESS_KEY) || '{}'); }
  catch(e) { return {}; }
}

function _ieltsSetProgress(data) {
  try { localStorage.setItem(IELTS_PROGRESS_KEY, JSON.stringify(data)); }
  catch(e) {}
}

function _ieltsRecordBand(skill, band) {
  const prog = _ieltsGetProgress();
  if (!prog[skill]) prog[skill] = [];
  prog[skill].push({ band, ts: Date.now() });
  if (prog[skill].length > 50) prog[skill].shift();
  _ieltsSetProgress(prog);
  _ieltsUpdateProgressUI();
}

function _ieltsGetAvgBand(skill) {
  const prog = _ieltsGetProgress();
  const arr  = prog[skill] || [];
  if (!arr.length) return null;
  return arr.reduce((s, e) => s + e.band, 0) / arr.length;
}

function _ieltsUpdateProgressUI() {
  const prog = _ieltsGetProgress();
  const skills = ['speaking', 'writing', 'vocab', 'reading'];
  skills.forEach(skill => {
    const arr = prog[skill] || [];
    const avg = arr.length ? (arr.reduce((s,e) => s + e.band, 0) / arr.length).toFixed(1) : '—';
    const el  = document.getElementById('ieltsProgress_' + skill);
    if (el) el.textContent = avg;
    const bar = document.getElementById('ieltsBar_' + skill);
    if (bar) bar.style.width = arr.length ? Math.min(100, (parseFloat(avg) / 9) * 100) + '%' : '0%';
  });
}

// ── Band score colour helper ──────────────────────────────────────────
function _ieltsBandClass(band) {
  if (band >= 7) return 'good';
  if (band >= 5) return 'mid';
  return 'low';
}

function _ieltsBandLabel(band) {
  if (band >= 8.5) return 'Expert';
  if (band >= 7.5) return 'Very Good';
  if (band >= 6.5) return 'Competent';
  if (band >= 5.5) return 'Modest';
  if (band >= 4.5) return 'Limited';
  return 'Developing';
}

// ══════════════════════════════════════════════════════════════════════
//  SPEAKING SIMULATOR
// ══════════════════════════════════════════════════════════════════════

function startIELTSSpeaking() {
  // Always run the idle intro conversation first, then kick off the real test
  _ieltsRunIntroConversation();
}

// ── Exit speaking session at any point (intro or real test) ──────────
function exitIELTSSpeakingSession() {
  _ieltsStopVAD();
  _ieltsStopTimer('speaking');
  _ieltsOrbStopTeaching();
  _ieltsOrbDodgeMode(false);
  if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('idle');

  // Cancel any in-flight intro recognition
  if (_ieltsIntroState.recognition) {
    try { _ieltsIntroState.recognition.abort(); } catch(e) {}
    _ieltsIntroState.recognition = null;
  }
  // Cancel the 8s warmup safety timeout so it can't fire after exit
  if (_ieltsIntroState._warmupSafetyTimer) {
    clearTimeout(_ieltsIntroState._warmupSafetyTimer);
    _ieltsIntroState._warmupSafetyTimer = null;
  }
  _ieltsIntroState.active = false;
  _ieltsIntroState.phase  = '';

  // Reset speaking state
  _ieltsState.active = false;

  document.getElementById('speakingSetup').style.display   = 'block';
  document.getElementById('speakingSession').style.display = 'none';
  document.getElementById('speakingResults').style.display = 'none';

  // Reset any mic-state UI left over from the intro flow
  _ieltsSetVADStatus('off');
  const exitTA = document.getElementById('speakingAnswerInput');
  if (exitTA) exitTA.placeholder = 'Your speech will appear here automatically as you speak…';
}
window.exitIELTSSpeakingSession = exitIELTSSpeakingSession;

function _ieltsBeginRealTest() {
  // Pick 4 Part 1, 1 Part 2, 2 Part 3 questions (shuffled)
  const p1 = [...IELTS_SPEAKING_BANK.part1].sort(() => Math.random() - 0.5).slice(0, 4);
  const p2 = [...IELTS_SPEAKING_BANK.part2].sort(() => Math.random() - 0.5).slice(0, 1);
  const p3 = [...IELTS_SPEAKING_BANK.part3].sort(() => Math.random() - 0.5).slice(0, 2);

  _ieltsState = {
    active:    true,
    part:      1,
    qIndex:    0,
    questions: [...p1, ...p2, ...p3],
    part1End:  p1.length,
    part2End:  p1.length + p2.length,
    answers:   [],
    feedback:  [],
    bands:     [],
  };

  document.getElementById('speakingSetup').style.display    = 'none';
  document.getElementById('speakingSession').style.display  = 'block';
  document.getElementById('speakingResults').style.display  = 'none';

  // Set examiner label
  const examLabel = document.getElementById('speakingExaminerLabel');
  if (examLabel) examLabel.textContent = 'Nexora · IELTS AI Examiner';

  // Apply dodge blend mode to orb for energetic IELTS mode
  _ieltsOrbDodgeMode(true);

  // Trigger orb audio init (so AnalyserNode picks up mic)
  // and set examiner state (purple/cyan blend)
  if (typeof window._nexoraOrbState === 'function') {
    window._nexoraOrbState('examiner');
  }
  // Kick off orb audio context via a synthetic pointer event if not yet started
  const orbEl = document.getElementById('nexoraOrbContainer');
  if (orbEl) orbEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

  // Start the speaking timer now — only when the real test begins, not during intro
  _ieltsStartTimer('speaking', IELTS_TIMER_DEFAULTS.speaking);
  const speakTimerBtn = document.getElementById('ieltsTimerBtn_speaking');
  if (speakTimerBtn) speakTimerBtn.textContent = '⏹ Stop Timer';

  _ieltsShowSpeakingQuestion();
}

// ── Orb dodge blend mode toggle ───────────────────────────────────────
function _ieltsOrbDodgeMode(enable) {
  const orbCanvas = document.getElementById('orbCanvas');
  const orbContainer = document.getElementById('nexoraOrbContainer');
  if (orbCanvas) {
    orbCanvas.style.mixBlendMode = enable ? 'color-dodge' : '';
    orbCanvas.style.filter = enable
      ? 'saturate(1.6) brightness(1.15)'
      : '';
  }
  if (orbContainer) {
    orbContainer.style.filter = enable
      ? 'drop-shadow(0 0 28px rgba(0,230,200,0.55)) drop-shadow(0 0 60px rgba(120,60,255,0.35))'
      : '';
  }
}

// ── Live band estimator (heuristic, runs on interim transcript) ───────
function _ieltsEstimateLiveBand(text) {
  if (!text || text.trim().split(/\s+/).length < 3) return null;

  const words = text.trim().split(/\s+/);
  const wordCount = words.length;

  // Fluency proxy: words per second (we don't have time, so use length)
  // Lexical proxy: avg word length + unique ratio
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')));
  const uniqueRatio = uniqueWords.size / wordCount;
  const avgWordLen  = words.reduce((s, w) => s + w.length, 0) / wordCount;

  // Grammar proxy: presence of complex structures
  const complexPatterns = [
    /\b(although|however|therefore|furthermore|nevertheless|consequently|whereas|despite)\b/i,
    /\b(would have|could have|should have|might have)\b/i,
    /\b(not only|not just).*(but also|but)\b/i,
    /\b(having|being)\s+\w+ed\b/i,
    /\b(which|who|whom|whose|that)\b.*\b(is|are|was|were)\b/i,
  ];
  const complexScore = complexPatterns.filter(p => p.test(text)).length;

  // Vocabulary proxy: academic/advanced words
  const advancedWords = [
    'significant','substantial','considerable','fundamental','comprehensive',
    'demonstrate','illustrate','emphasise','highlight','acknowledge',
    'perspective','approach','aspect','factor','impact','influence',
    'furthermore','moreover','consequently','therefore','nevertheless',
    'beneficial','detrimental','advantageous','inevitable','ubiquitous',
    'pragmatic','eloquent','mitigate','exacerbate','alleviate',
  ];
  const advancedCount = words.filter(w =>
    advancedWords.includes(w.toLowerCase().replace(/[^a-z]/g, ''))
  ).length;

  // Compute sub-scores (0–9)
  const fluencyScore  = Math.min(9, 4 + Math.min(wordCount / 30, 1) * 3 + uniqueRatio * 2);
  const lexicalScore  = Math.min(9, 4 + (avgWordLen - 3) * 0.5 + advancedCount * 0.4 + uniqueRatio * 1.5);
  const grammarScore  = Math.min(9, 4.5 + complexScore * 0.8);
  const overall       = (fluencyScore + lexicalScore + grammarScore) / 3;
  const rounded       = Math.round(overall * 2) / 2;

  return {
    band:     Math.min(9, Math.max(3, rounded)),
    fluency:  Math.min(9, Math.max(3, Math.round(fluencyScore * 2) / 2)),
    lexical:  Math.min(9, Math.max(3, Math.round(lexicalScore * 2) / 2)),
    grammar:  Math.min(9, Math.max(3, Math.round(grammarScore * 2) / 2)),
    wordCount,
  };
}

// ── Live band panel updater ───────────────────────────────────────────
function _ieltsUpdateLiveBandPanel(estimate) {
  const panel = document.getElementById('ieltsLiveBandPanel');
  if (!panel) return;

  if (!estimate) {
    panel.innerHTML =
      '<div class="ilbp-title">🎙 Live Band Estimate</div>' +
      '<div class="ilbp-waiting">Start speaking to see your live score…</div>';
    return;
  }

  const bandColor = estimate.band >= 7 ? '#10b981' : estimate.band >= 5.5 ? '#f59e0b' : '#ef4444';
  const barPct    = n => Math.round((n / 9) * 100);

  panel.innerHTML =
    '<div class="ilbp-title">🎙 Live Band Estimate</div>' +
    '<div class="ilbp-main-band" style="color:' + bandColor + '">' +
      estimate.band.toFixed(1) +
      '<span class="ilbp-label">' + _ieltsBandLabel(estimate.band) + '</span>' +
    '</div>' +
    '<div class="ilbp-rows">' +
      _ilbpRow('🗣 Fluency',    estimate.fluency, barPct(estimate.fluency)) +
      _ilbpRow('📖 Lexical',    estimate.lexical, barPct(estimate.lexical)) +
      _ilbpRow('✍️ Grammar',   estimate.grammar, barPct(estimate.grammar)) +
    '</div>' +
    '<div class="ilbp-words">' + estimate.wordCount + ' words spoken</div>';
}

function _ilbpRow(label, score, pct) {
  const color = score >= 7 ? '#10b981' : score >= 5.5 ? '#f59e0b' : '#ef4444';
  return '<div class="ilbp-row">' +
    '<span class="ilbp-row-label">' + label + '</span>' +
    '<div class="ilbp-bar-wrap">' +
      '<div class="ilbp-bar" style="width:' + pct + '%;background:' + color + '"></div>' +
    '</div>' +
    '<span class="ilbp-row-score" style="color:' + color + '">' + score.toFixed(1) + '</span>' +
  '</div>';
}

// ── VAD / Continuous Speech Recognition ──────────────────────────────
// ── Shared recognition result handler (single source of truth) ───────
function _ieltsHandleRecognitionResult(e) {
  let interim = '', finalChunk = '';
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const t = e.results[i][0].transcript;
    if (e.results[i].isFinal) finalChunk += t + ' ';
    else interim += t;
  }
  if (finalChunk) _ieltsVAD.finalBuffer += finalChunk;
  _ieltsVAD.interimBuffer = interim;
  const fullText = (_ieltsVAD.finalBuffer + interim).trim();
  const ta = document.getElementById('speakingAnswerInput');
  if (ta) ta.value = fullText;
  const estimate = _ieltsEstimateLiveBand(fullText);
  _ieltsVAD.lastLiveScore = estimate;
  _ieltsUpdateLiveBandPanel(estimate);
  _ieltsResetSilenceTimer(fullText);
}

function _ieltsAttachRecHandlers(rec) {
  rec.onresult     = _ieltsHandleRecognitionResult;
  rec.onspeechstart = () => {
    _ieltsSetVADStatus('listening');
    if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('listening');
  };
  rec.onspeechend  = () => _ieltsSetVADStatus('silence');
  rec.onerror      = (e) => {
    if (e.error === 'no-speech') { _ieltsRestartVAD(); return; }
    if (e.error === 'aborted') return;
    _ieltsVAD.active = false;
    _ieltsSetVADStatus('off');
    if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('idle');
  };
  rec.onend = () => {
    if (_ieltsVAD.active) setTimeout(() => _ieltsRestartVAD(), 150);
  };
}

function _ieltsStartVAD() {
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    if (typeof _showStudyToast === 'function') {
      _showStudyToast('⚠️ Voice not supported — type your answer instead');
    }
    return;
  }

  _ieltsStopVAD();

  const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.continuous      = true;
  rec.interimResults  = true;
  rec.lang            = 'en-US';
  rec.maxAlternatives = 1;

  _ieltsVAD.recognition   = rec;
  _ieltsVAD.active        = true;
  _ieltsVAD.finalBuffer   = '';
  _ieltsVAD.interimBuffer = '';

  if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('listening');
  _ieltsSetVADStatus('listening');
  _ieltsAttachRecHandlers(rec);

  try { rec.start(); } catch(e) { _ieltsVAD.active = false; }
}

function _ieltsRestartVAD() {
  if (!_ieltsVAD.active) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  try {
    if (_ieltsVAD.recognition) {
      _ieltsVAD.recognition.onend   = null;
      _ieltsVAD.recognition.onerror = null;
      try { _ieltsVAD.recognition.stop(); } catch(e) {}
    }
    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'en-US';
    rec.maxAlternatives = 1;
    _ieltsVAD.recognition = rec;
    _ieltsAttachRecHandlers(rec);
    rec.start();
  } catch(e) {}
}

function _ieltsStopVAD() {
  _ieltsVAD.active = false;
  if (_ieltsVAD.silenceTimer) { clearTimeout(_ieltsVAD.silenceTimer); _ieltsVAD.silenceTimer = null; }
  if (_ieltsVAD.recognition) {
    try {
      _ieltsVAD.recognition.onend = null;
      _ieltsVAD.recognition.onerror = null;
      _ieltsVAD.recognition.stop();
    } catch(e) {}
    _ieltsVAD.recognition = null;
  }
  _ieltsSetVADStatus('off');
}

function _ieltsResetSilenceTimer(fullText) {
  if (_ieltsVAD.silenceTimer) clearTimeout(_ieltsVAD.silenceTimer);
  const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < _ieltsVAD.minWords) return; // don't trigger too early

  // Don't trigger while the orb is delivering feedback
  if (_orbIsSpeaking) return;

  _ieltsVAD.silenceTimer = setTimeout(() => {
    // Guard again — orb may have started speaking during the delay
    if (_orbIsSpeaking) return;
    if (!_ieltsVAD.active) return;

    // Silence detected — stop the mic but DO NOT auto-submit.
    // Show a "done speaking" state so the user can review and tap Submit.
    _ieltsStopVAD();
    _ieltsSetVADStatus('done');

    // Show "Continue speaking" option
    const continueRow = document.getElementById('speakingContinueRow');
    if (continueRow) continueRow.style.display = 'block';

    // Flash the submit button to draw attention
    const submitBtn = document.getElementById('speakingSubmitBtn');
    if (submitBtn) {
      submitBtn.classList.add('ielts-submit-ready');
      submitBtn.textContent = '✅ Submit Answer';
      submitBtn.disabled = false;
    }
  }, _ieltsVAD.silenceMs);
}

function _ieltsSetVADStatus(status) {
  const indicator = document.getElementById('ieltsVADIndicator');
  const label     = document.getElementById('ieltsVADLabel');
  if (!indicator) return;

  const states = {
    listening:  { cls: 'vad-listening',  text: '🎙 Listening…',                pulse: true  },
    silence:    { cls: 'vad-silence',    text: '⏸ Pause detected…',            pulse: false },
    done:       { cls: 'vad-done',       text: '✅ Done — tap Submit when ready', pulse: false },
    processing: { cls: 'vad-processing', text: '🧠 Scoring your answer…',       pulse: true  },
    off:        { cls: 'vad-off',        text: '🎤 Tap to speak',               pulse: false },
  };
  const s = states[status] || states.off;
  indicator.className = 'ielts-vad-indicator ' + s.cls + (s.pulse ? ' vad-pulse' : '');
  if (label) label.textContent = s.text;
}

function _ieltsShowSpeakingQuestion() {
  const state = _ieltsState;
  const q     = state.questions[state.qIndex];
  const total = state.questions.length;

  // Determine part
  let part = 1;
  if (state.qIndex >= state.part1End) part = 2;
  if (state.qIndex >= state.part2End) part = 3;

  const partLabels = { 1: 'Introduction & Interview', 2: 'Individual Long Turn', 3: 'Two-way Discussion' };
  document.getElementById('speakingProgress').textContent =
    'Part ' + part + ' — ' + partLabels[part] + ' · Q' + (state.qIndex + 1) + '/' + total;
  document.getElementById('speakingProgressFill').style.width =
    Math.round((state.qIndex / total) * 100) + '%';
  document.getElementById('speakingQuestion').textContent = q;

  // Part 2: show prep cue card
  const isPart2 = (state.qIndex >= state.part1End && state.qIndex < state.part2End);
  const prepDiv = document.getElementById('speakingPart2Prep');
  if (prepDiv) {
    prepDiv.style.display = isPart2 ? 'block' : 'none';
    if (isPart2) document.getElementById('speakingPrepNotes').value = '';
  }

  // Reset answer area
  document.getElementById('speakingAnswerInput').value = '';
  document.getElementById('speakingFeedback').style.display  = 'none';
  document.getElementById('speakingNextRow').style.display   = 'none';

  // Reset submit button state
  const submitBtn = document.getElementById('speakingSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = '✅ Submit Answer';
    submitBtn.classList.remove('ielts-submit-ready');
  }
  // Hide continue row
  const continueRow = document.getElementById('speakingContinueRow');
  if (continueRow) continueRow.style.display = 'none';

  // Reset live band panel
  _ieltsUpdateLiveBandPanel(null);
  _ieltsVAD.finalBuffer   = '';
  _ieltsVAD.interimBuffer = '';
  _ieltsVAD.lastLiveScore = null;

  // Part transition banners
  const bannerEl = document.getElementById('speakingPartBanner');
  if (bannerEl) {
    const isPartStart = state.qIndex === 0 ||
      state.qIndex === state.part1End ||
      state.qIndex === state.part2End;
    if (isPartStart) {
      bannerEl.style.display = 'block';
      bannerEl.innerHTML =
        '<div class="ielts-part-banner">' +
          '<span class="ielts-part-num">Part ' + part + '</span>' +
          '<span class="ielts-part-name">' + partLabels[part] + '</span>' +
        '</div>';
      setTimeout(() => { bannerEl.style.display = 'none'; }, 2500);
    } else {
      bannerEl.style.display = 'none';
    }
  }

  // Auto-start VAD (skip for Part 2 prep — user taps to begin)
  if (!isPart2) {
    setTimeout(() => {
      _ieltsOrbReadQuestion(q);
      if (typeof window._ieltsGetTopicVocab === 'function') {
        const vocab = window._ieltsGetTopicVocab(q);
        if (vocab.length) {
          const hint = 'Topic vocabulary for this question: ' + vocab.slice(0, 4).join(', ') + '.';
          setTimeout(() => _ieltsOrbTeach(hint), 1800);
        }
      }
      setTimeout(() => _ieltsStartVAD(), 2800);
    }, 600);
  } else {
    // Part 2: start the 60-second prep countdown
    _ieltsCancelPart2PrepTimer();
    setTimeout(() => _ieltsStartPart2PrepTimer(), 400);
  }
}

function speakingStartPart2Speech() {
  _ieltsCancelPart2PrepTimer();
  document.getElementById('speakingPart2Prep').style.display = 'none';
  document.getElementById('speakingAnswerInput').focus();
  _ieltsStartVAD();
}

// ── Part 2 prep countdown (60 s) ─────────────────────────────
function _ieltsStartPart2PrepTimer() {
  const timerEl = document.getElementById('speakingPart2Timer');
  const startBtn = document.getElementById('speakingPart2StartBtn');
  if (!timerEl) return;

  let remaining = 60;
  timerEl.textContent = '1:00';
  timerEl.style.color = '#f59e0b';

  const tick = setInterval(() => {
    remaining--;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    timerEl.textContent = m + ':' + String(s).padStart(2, '0');

    if (remaining <= 10) timerEl.style.color = '#ef4444';
    if (remaining <= 0) {
      clearInterval(tick);
      timerEl.textContent = '0:00';
      // Auto-start speaking when prep time expires
      if (startBtn) startBtn.click();
    }
  }, 1000);

  // Store so we can cancel if user starts early
  _ieltsVAD._part2PrepTimer = tick;
}

function _ieltsCancelPart2PrepTimer() {
  if (_ieltsVAD._part2PrepTimer) {
    clearInterval(_ieltsVAD._part2PrepTimer);
    _ieltsVAD._part2PrepTimer = null;
  }
}

async function submitSpeakingAnswer() {
  const answer = (document.getElementById('speakingAnswerInput')?.value || '').trim();
  if (!answer) { if (typeof _showStudyToast === 'function') _showStudyToast('Please speak your answer first'); return; }

  // Stop VAD and set orb to processing (purple/orange — thinking/scoring)
  _ieltsStopVAD();
  if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('processing');
  _ieltsSetVADStatus('processing');

  const submitBtn = document.getElementById('speakingSubmitBtn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Scoring…'; submitBtn.classList.remove('ielts-submit-ready'); }

  _ieltsState.answers.push(answer);

  const q       = _ieltsState.questions[_ieltsState.qIndex];
  const isPart2 = (_ieltsState.qIndex >= _ieltsState.part1End && _ieltsState.qIndex < _ieltsState.part2End);

  const sysPrompt =
    'You are ' + IELTS_EXAMINER_NAME + ', a certified IELTS examiner. ' +
    'Evaluate the candidate\'s spoken answer using the official IELTS Speaking band descriptors. ' +
    'Assess all four criteria: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation. ' +
    'Consider task relevance — does the answer address the question asked? ' +
    'Respond ONLY in JSON: {"band": <0-9 with 0.5 steps>, "fluency": "<1 sentence>", ' +
    '"lexical": "<1 sentence>", "grammar": "<1 sentence>", "pronunciation": "<1 sentence>", ' +
    '"tip": "<1 actionable improvement tip>"}';

  const partNum = isPart2 ? 2 : (_ieltsState.qIndex >= _ieltsState.part2End ? 3 : 1);
  const userPrompt = 'IELTS Speaking Part ' + partNum + '\n' +
    'Question asked: ' + q + '\n\n' +
    'Candidate answer: ' + answer;

  let result = {
    band:          6.0,
    fluency:       'Generally fluent with some hesitation.',
    lexical:       'Adequate vocabulary for the topic.',
    grammar:       'Mostly accurate with some errors.',
    pronunciation: 'Generally clear with some mispronunciations.',
    tip:           'Try to use more complex sentence structures and topic-specific vocabulary.',
  };

  try {
    const raw  = await callStudyAI(sysPrompt, userPrompt);
    const json = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0]);
    if (json.band !== undefined) {
      result.band          = Math.min(9, Math.max(0, parseFloat(json.band) || 6));
      result.fluency       = json.fluency       || result.fluency;
      result.lexical       = json.lexical       || result.lexical;
      result.grammar       = json.grammar       || result.grammar;
      result.pronunciation = json.pronunciation || result.pronunciation;
      result.tip           = json.tip           || result.tip;
    }
  } catch(e) { /* use defaults */ }

  _ieltsState.bands.push(result.band);
  _ieltsState.feedback.push(result);

  // Orb → speaking (green) to signal feedback delivery
  if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('speaking');
  setTimeout(() => {
    if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('idle');
  }, 2500);

  // Update live band panel with final AI score
  _ieltsUpdateLiveBandPanel({
    band:     result.band,
    fluency:  parseFloat(result.fluency.match(/\d+\.?\d*/)?.[0]) || result.band,
    lexical:  parseFloat(result.lexical.match(/\d+\.?\d*/)?.[0]) || result.band,
    grammar:  parseFloat(result.grammar.match(/\d+\.?\d*/)?.[0]) || result.band,
    wordCount: answer.split(/\s+/).length,
  });

  // Render feedback card
  const fbDiv = document.getElementById('speakingFeedback');
  fbDiv.style.display = 'block';
  const cls = _ieltsBandClass(result.band);
  fbDiv.innerHTML =
    '<div class="viva-critique-header">' +
      '<span class="viva-critique-label">' + IELTS_EXAMINER_NAME + '\'s Feedback</span>' +
      '<span class="viva-score-badge ' + cls + '">Band ' + result.band.toFixed(1) + ' — ' + _ieltsBandLabel(result.band) + '</span>' +
    '</div>' +
    '<div class="ielts-feedback-grid">' +
      '<div class="ielts-fb-row"><span class="ielts-fb-label">🗣 Fluency</span><span class="ielts-fb-val">' + _esc(result.fluency) + '</span></div>' +
      '<div class="ielts-fb-row"><span class="ielts-fb-label">📖 Vocabulary</span><span class="ielts-fb-val">' + _esc(result.lexical) + '</span></div>' +
      '<div class="ielts-fb-row"><span class="ielts-fb-label">✍️ Grammar</span><span class="ielts-fb-val">' + _esc(result.grammar) + '</span></div>' +
      '<div class="ielts-fb-row"><span class="ielts-fb-label">🔊 Pronunciation</span><span class="ielts-fb-val">' + _esc(result.pronunciation) + '</span></div>' +
      '<div class="ielts-fb-tip">💡 ' + _esc(result.tip) + '</div>' +
    '</div>';

  // Common error detection
  if (typeof window._ieltsCheckCommonErrors === 'function') {
    const errors = window._ieltsCheckCommonErrors(answer);
    if (errors.length) {
      const errHtml = errors.map(e => '<li>' + _esc(e) + '</li>').join('');
      fbDiv.innerHTML +=
        '<div class="ielts-fb-row" style="margin-top:6px">' +
          '<span class="ielts-fb-label">⚠️ Common Errors</span>' +
          '<ul style="margin:4px 0 0 0;padding-left:18px;font-size:13px;color:#ef4444;line-height:1.7">' + errHtml + '</ul>' +
        '</div>';
    }
  }

  document.getElementById('speakingNextRow').style.display = 'flex';
  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '✅ Submit Answer'; }
  _ieltsSetVADStatus('off');

  // Orb speaks the feedback tip aloud
  setTimeout(() => _ieltsOrbSpeakFeedback(result), 600);
}

function speakingNext() {
  // Stop any active VAD before moving to next question
  _ieltsStopVAD();
  _ieltsState.qIndex++;
  if (_ieltsState.qIndex >= _ieltsState.questions.length) {
    _ieltsFinishSpeaking();
  } else {
    _ieltsShowSpeakingQuestion();
  }
}

function _ieltsFinishSpeaking() {
  // Clean up VAD, stop timer, and restore orb
  _ieltsStopVAD();
  _ieltsStopTimer('speaking');
  _ieltsOrbDodgeMode(false);
  if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('idle');

  const bands = _ieltsState.bands;
  const avg   = bands.length ? bands.reduce((a, b) => a + b, 0) / bands.length : 0;
  const rounded = Math.round(avg * 2) / 2; // round to nearest 0.5

  _ieltsRecordBand('speaking', rounded);

  document.getElementById('speakingSession').style.display  = 'none';
  const resultsDiv = document.getElementById('speakingResults');
  resultsDiv.style.display = 'block';

  resultsDiv.innerHTML =
    '<div class="viva-result-header">' +
      '<div class="viva-result-grade">' + _ieltsBandLabel(rounded) + '</div>' +
      '<div class="viva-result-score">Band ' + rounded.toFixed(1) + '</div>' +
      '<div class="viva-result-topic">IELTS Speaking Mock Test · ' + IELTS_EXAMINER_NAME + '</div>' +
    '</div>' +
    '<div class="viva-review-list">' +
      _ieltsState.questions.map((q, i) => {
        const fb  = _ieltsState.feedback[i] || {};
        const b   = _ieltsState.bands[i];
        const cls = b !== undefined ? _ieltsBandClass(b) : 'mid';
        return '<div class="viva-review-item">' +
          '<div class="viva-review-q"><span class="viva-review-num">Q' + (i+1) + '</span>' + _esc(q) + '</div>' +
          '<div class="viva-review-answer">' + _esc(_ieltsState.answers[i] || '(no answer)') + '</div>' +
          '<div class="viva-review-critique">' +
            (b !== undefined ? '<span class="viva-score-badge ' + cls + '" style="margin-right:8px">Band ' + b.toFixed(1) + '</span>' : '') +
            _esc(fb.tip || '') +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:16px;padding-bottom:80px">' +
      '<button class="quiz-retake-btn" onclick="startIELTSSpeaking()" style="flex:1">🔁 Retake Test</button>' +
      '<button class="quiz-new-btn" onclick="exportIELTSReport()" style="flex:1">📄 Export PDF</button>' +
    '</div>';
}

// speakingToggleMic — manual override: tap to start/stop VAD
function speakingToggleMic() {
  if (_ieltsVAD.active) {
    // User manually stopped — show "done" state, don't auto-submit
    _ieltsStopVAD();
    if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('idle');
    _ieltsSetVADStatus('done');
    const btn = document.getElementById('speakingMicBtn');
    if (btn) { btn.classList.remove('active'); btn.textContent = '🎤 Speak Again'; }
    const continueRow = document.getElementById('speakingContinueRow');
    if (continueRow) continueRow.style.display = 'block';
    // Highlight submit button
    const submitBtn = document.getElementById('speakingSubmitBtn');
    if (submitBtn) {
      submitBtn.classList.add('ielts-submit-ready');
      submitBtn.disabled = false;
    }
  } else {
    speakingContinueSpeaking();
  }
}

// Resume speaking — restart mic and hide the continue row
function speakingContinueSpeaking() {
  const continueRow = document.getElementById('speakingContinueRow');
  if (continueRow) continueRow.style.display = 'none';
  const submitBtn = document.getElementById('speakingSubmitBtn');
  if (submitBtn) submitBtn.classList.remove('ielts-submit-ready');
  _ieltsSetVADStatus('listening');
  _ieltsStartVAD();
  const btn = document.getElementById('speakingMicBtn');
  if (btn) { btn.classList.add('active'); btn.textContent = '⏹ Stop'; }
}

// ══════════════════════════════════════════════════════════════════════
//  WRITING EVALUATOR  (Task 1 & Task 2)
// ══════════════════════════════════════════════════════════════════════

function ieltsLoadWritingPrompt() {
  const task    = parseInt(document.getElementById('ieltsWritingTask')?.value || '2', 10);
  const prompts = IELTS_WRITING_PROMPTS['task' + task] || IELTS_WRITING_PROMPTS.task2;
  const prompt  = prompts[Math.floor(Math.random() * prompts.length)];
  _ieltsWritingState.task   = task;
  _ieltsWritingState.prompt = prompt;

  const promptEl = document.getElementById('ieltsWritingPromptText');
  if (promptEl) promptEl.textContent = prompt;

  const wordTarget = task === 1 ? 150 : 250;
  const targetEl   = document.getElementById('ieltsWritingWordTarget');
  if (targetEl) targetEl.textContent = 'Minimum ' + wordTarget + ' words';

  document.getElementById('ieltsWritingArea').style.display    = 'block';
  document.getElementById('ieltsWritingFeedback').style.display = 'none';
  document.getElementById('ieltsWritingInput').value = '';
  _ieltsUpdateWordCount();
}

function _ieltsUpdateWordCount() {
  const text  = document.getElementById('ieltsWritingInput')?.value || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const el    = document.getElementById('ieltsWritingWordCount');
  if (el) {
    el.textContent = words + ' words';
    el.style.color = words >= ((_ieltsWritingState.task === 1) ? 150 : 250) ? '#10b981' : 'var(--text3)';
  }
}

async function submitIELTSWriting() {
  const answer = (document.getElementById('ieltsWritingInput')?.value || '').trim();
  if (!answer) { if (typeof _showStudyToast === 'function') _showStudyToast('Write your answer first'); return; }

  const words = answer.split(/\s+/).length;
  const minWords = _ieltsWritingState.task === 1 ? 150 : 250;
  if (words < minWords * 0.7) {
    if (typeof _showStudyToast === 'function') _showStudyToast('Your answer is too short. Aim for at least ' + minWords + ' words.');
    return;
  }

  const btn = document.getElementById('ieltsWritingSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Evaluating…'; }
  if (typeof _showStudyLoading === 'function') _showStudyLoading('Evaluating your writing…');

  const taskDesc = _ieltsWritingState.task === 1
    ? 'IELTS Academic Writing Task 1 (describe a graph/diagram/table)'
    : 'IELTS Academic Writing Task 2 (discursive essay)';

  const sysPrompt =
    'You are a certified IELTS examiner. Evaluate the following ' + taskDesc + ' response. ' +
    'Use the official IELTS Writing band descriptors. ' +
    'Respond ONLY in JSON: {' +
    '"band": <0-9 with 0.5 steps>, ' +
    '"task_achievement": "<2 sentences>", ' +
    '"coherence": "<2 sentences>", ' +
    '"lexical": "<2 sentences>", ' +
    '"grammar": "<2 sentences>", ' +
    '"improved_sentence": "<rewrite one weak sentence from the answer to show improvement>", ' +
    '"overall_tip": "<1 key actionable tip>"' +
    '}';

  const userPrompt = 'Task prompt: ' + _ieltsWritingState.prompt + '\n\nCandidate response (' + words + ' words):\n' + answer;

  let result = {
    band: 6.0,
    task_achievement: 'The task is addressed but could be more fully developed.',
    coherence: 'Ideas are generally organised but linking could be improved.',
    lexical: 'Adequate vocabulary range with some errors.',
    grammar: 'Mix of simple and complex structures with some errors.',
    improved_sentence: '',
    overall_tip: 'Focus on developing your ideas more fully and using a wider range of vocabulary.',
  };

  try {
    const raw  = await callStudyAI(sysPrompt, userPrompt);
    const json = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0]);
    if (json.band !== undefined) {
      result.band               = Math.min(9, Math.max(0, parseFloat(json.band) || 6));
      result.task_achievement   = json.task_achievement   || result.task_achievement;
      result.coherence          = json.coherence          || result.coherence;
      result.lexical            = json.lexical            || result.lexical;
      result.grammar            = json.grammar            || result.grammar;
      result.improved_sentence  = json.improved_sentence  || '';
      result.overall_tip        = json.overall_tip        || result.overall_tip;
    }
  } catch(e) { /* use defaults */ }

  _ieltsWritingState.feedback = result;
  _ieltsRecordBand('writing', result.band);

  const fbDiv = document.getElementById('ieltsWritingFeedback');
  fbDiv.style.display = 'block';
  const cls = _ieltsBandClass(result.band);
  fbDiv.innerHTML =
    '<div class="viva-critique-header">' +
      '<span class="viva-critique-label">Writing Evaluation</span>' +
      '<span class="viva-score-badge ' + cls + '">Band ' + result.band.toFixed(1) + ' — ' + _ieltsBandLabel(result.band) + '</span>' +
    '</div>' +
    '<div class="ielts-feedback-grid">' +
      '<div class="ielts-fb-row"><span class="ielts-fb-label">📋 Task Achievement</span><span class="ielts-fb-val">' + _esc(result.task_achievement) + '</span></div>' +
      '<div class="ielts-fb-row"><span class="ielts-fb-label">🔗 Coherence</span><span class="ielts-fb-val">' + _esc(result.coherence) + '</span></div>' +
      '<div class="ielts-fb-row"><span class="ielts-fb-label">📖 Vocabulary</span><span class="ielts-fb-val">' + _esc(result.lexical) + '</span></div>' +
      '<div class="ielts-fb-row"><span class="ielts-fb-label">✍️ Grammar</span><span class="ielts-fb-val">' + _esc(result.grammar) + '</span></div>' +
      (result.improved_sentence ? '<div class="ielts-fb-improved"><span class="ielts-fb-label">✨ Improved sentence</span><em>' + _esc(result.improved_sentence) + '</em></div>' : '') +
      '<div class="ielts-fb-tip">💡 ' + _esc(result.overall_tip) + '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:12px">' +
      '<button class="mcq-btn-secondary" onclick="ieltsLoadWritingPrompt()">🔁 New Prompt</button>' +
      '<button class="mcq-btn-primary" onclick="exportIELTSReport()">📄 Export PDF</button>' +
    '</div>';

  if (btn) { btn.disabled = false; btn.textContent = '✅ Submit for Evaluation'; }
  if (typeof _hideStudyLoading === 'function') _hideStudyLoading();
}

// ══════════════════════════════════════════════════════════════════════
//  VOCABULARY & GRAMMAR MCQ
// ══════════════════════════════════════════════════════════════════════

async function generateIELTSMcq() {
  const topic        = (document.getElementById('ieltsMcqTopic')?.value || '').trim();
  const type         = document.getElementById('ieltsMcqType')?.value         || 'mixed';
  const count        = parseInt(document.getElementById('ieltsMcqCount')?.value || '10', 10);
  const grammarTopic = document.getElementById('ieltsGrammarTopic')?.value     || 'mixed';
  const difficulty   = document.getElementById('ieltsDifficulty')?.value       || 'medium';
  const mode         = document.getElementById('ieltsPracticeMode')?.value     || 'practice';

  // Save config for weak-area tracking and repeat-set feature
  _ieltsPracticeConfig = { grammarTopic, difficulty, mode, type, topic, count };

  const btn = document.getElementById('ieltsGenMcqBtn');
  if (btn) btn.disabled = true;
  if (typeof _showStudyLoading === 'function') _showStudyLoading('Generating ' + count + ' ' + difficulty + ' questions…');

  // Build AI prompt
  const typeDesc = type === 'vocab'
    ? 'IELTS vocabulary (band 7–9 words, collocations, academic word list)'
    : type === 'grammar'
    ? 'IELTS grammar'
    : 'mixed IELTS vocabulary and grammar';

  const grammarNote = (type !== 'vocab' && grammarTopic !== 'mixed')
    ? 'Grammar focus: ' + grammarTopic + '. '
    : '';

  const difficultyGuide = {
    easy:   'Band 4–5 level. Simple vocabulary, basic sentence structures, straightforward distractors.',
    medium: 'Band 6–7 level. Academic vocabulary, moderate grammar complexity.',
    hard:   'Band 8–9 level. Advanced collocations, complex grammar, subtle distractors.',
  };

  const sysPrompt =
    'You are an expert IELTS exam creator. Return ONLY a valid JSON array of multiple-choice questions. ' +
    'Each item must be: {"q":"question text","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"clear explanation"}. ' +
    'No extra text, no markdown, just the JSON array.';

  const userPrompt =
    'Generate exactly ' + count + ' IELTS ' + typeDesc + ' questions. ' +
    (topic ? 'Topic: ' + topic + '. ' : '') +
    grammarNote +
    'Difficulty: ' + difficulty + ' — ' + (difficultyGuide[difficulty] || '') + ' ' +
    'Mode: ' + mode + '. ' +
    'Rules: 4 options each (A/B/C/D), one correct answer, explanation required, difficulty must strictly match.';

  try {
    const raw = await callStudyAI(sysPrompt, userPrompt);
    const arr = JSON.parse((raw.match(/\[[\s\S]*\]/) || ['[]'])[0]);
    if (!Array.isArray(arr) || !arr.length) throw new Error('empty');
    _ieltsRenderMcqQuiz(arr.slice(0, count));
  } catch(e) {
    // Fallback to built-in bank
    const pool = type === 'mixed'
      ? [...IELTS_MCQ_BANK.vocab, ...IELTS_MCQ_BANK.grammar, ...IELTS_MCQ_BANK.mixed]
      : (IELTS_MCQ_BANK[type] || IELTS_MCQ_BANK.mixed);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    _ieltsRenderMcqQuiz(shuffled);
    if (typeof _showStudyToast === 'function') _showStudyToast('Using built-in question bank');
  } finally {
    if (btn) btn.disabled = false;
    if (typeof _hideStudyLoading === 'function') _hideStudyLoading();
  }
}

function _ieltsRenderMcqQuiz(questions) {
  _ieltsMcqState = { questions, index: 0, score: 0 };
  const area = document.getElementById('ieltsMcqArea');
  if (area) area.style.display = 'block';
  _ieltsShowMcqQuestion();
}

function _ieltsShowMcqQuestion() {
  const { questions, index, score } = _ieltsMcqState;
  const q     = questions[index];
  const total = questions.length;
  const area  = document.getElementById('ieltsMcqArea');
  if (!area || !q) return;

  area.innerHTML =
    '<div class="quiz-header-row">' +
      '<span class="quiz-q-counter">Q' + (index+1) + '/' + total + '</span>' +
      '<div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:' + Math.round((index/total)*100) + '%"></div></div>' +
      '<span class="quiz-score-live">' + score + ' pts</span>' +
    '</div>' +
    '<div class="mcq-question-text">' + _esc(q.q) + '</div>' +
    '<div class="ielts-orb-question-row">' +
      '<button class="ielts-orb-speak-btn" onclick="_ieltsOrbTeach(' + JSON.stringify(q.q).replace(/</g,'\\u003c') + ')">🔊 Read Question</button>' +
    '</div>' +
    '<div class="mcq-options-list" id="ieltsMcqOptions">' +
      (q.options || []).map((opt, i) => {
        const letter = ['A','B','C','D'][i];
        return '<button class="mcq-option-btn" data-choice="' + letter + '" onclick="ieltsAnswerMcq(' + i + ')">' +
          '<span class="mcq-option-letter">' + letter + '</span>' +
          '<span class="mcq-option-text">' + _esc(opt.replace(/^[A-D]\)\s*/, '')) + '</span>' +
        '</button>';
      }).join('') +
    '</div>' +
    '<div id="ieltsMcqFeedback"></div>' +
    '<button id="ieltsMcqNextBtn" class="mcq-next-btn" style="display:none" onclick="ieltsNextMcq()">Next →</button>';
}

function ieltsAnswerMcq(choiceIdx) {
  const { questions, index } = _ieltsMcqState;
  const q       = questions[index];
  const letters = ['A','B','C','D'];
  const chosen  = letters[choiceIdx];
  const isRight = chosen === q.correct;

  if (isRight) _ieltsMcqState.score++;

  // Track missed words for SRS
  if (!isRight) {
    _ieltsAddMissedToSRS(q, chosen);
    _ieltsAddToWrongBook(q, chosen);
    // Track weak area by grammar topic
    _trackIELTSWeakArea(_ieltsPracticeConfig.grammarTopic || 'mixed');
  }

  // Visual feedback on buttons
  document.querySelectorAll('#ieltsMcqOptions .mcq-option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (letters[i] === q.correct) btn.classList.add('mcq-correct');
    else if (i === choiceIdx && !isRight) btn.classList.add('mcq-wrong');
  });

  const fbDiv = document.getElementById('ieltsMcqFeedback');
  if (fbDiv) {
    const correctOptText = (q.options || []).find(o => o.startsWith(q.correct + ')')) || q.options?.['ABCD'.indexOf(q.correct)] || '';
    fbDiv.innerHTML =
      '<div class="mcq-feedback ' + (isRight ? 'mcq-feedback-correct' : 'mcq-feedback-wrong') + '">' +
        (isRight ? '✅ Correct!' : '❌ Incorrect — correct answer: <strong>' + q.correct + ') ' + _esc(correctOptText.replace(/^[A-D]\)\s*/, '')) + '</strong>') +
        (q.explanation ? '<div class="mcq-explanation">' + _esc(q.explanation) + '</div>' : '') +
        '<div class="ielts-explain-actions">' +
          '<button class="mcq-explain-btn ielts-orb-speak-btn" id="orbMcqSpeakBtn_' + index + '" ' +
            'onclick="_ieltsOrbSpeakMcqResult(_ieltsMcqState.questions[' + index + '],' + isRight + ',\'' + chosen + '\')">🔊 Orb Explain</button>' +
          '<button class="mcq-explain-btn" onclick="explainIELTSMcq(' + index + ', \'' + chosen + '\')">🧠 AI Explain</button>' +
          (!isRight ? '<button class="mcq-explain-btn ielts-srs-btn" onclick="ieltsAddToSRSManual(' + index + ')">📌 Add to Review</button>' : '') +
        '</div>' +
      '</div>' +
      '<div id="ieltsMcqExplainPanel_' + index + '" class="ielts-explain-panel" style="display:none"></div>';

    // Auto-speak: orb reads the result aloud after a short natural delay
    setTimeout(() => _ieltsOrbSpeakMcqResult(q, isRight, chosen), 350);
  }

  const nextBtn = document.getElementById('ieltsMcqNextBtn');
  if (nextBtn) nextBtn.style.display = 'block';
}

function ieltsNextMcq() {
  _ieltsMcqState.index++;
  const { questions, index, score } = _ieltsMcqState;

  if (index < questions.length) {
    _ieltsShowMcqQuestion();
    return;
  }

  // Stop timer if running
  _ieltsStopTimer('mcq');

  // Results
  const total   = questions.length;
  const pct     = Math.round((score / total) * 100);
  const band    = Math.min(9, Math.max(4, 4 + (pct / 100) * 5));
  const missed  = _ieltsMcqState.missedCount || 0;
  _ieltsRecordBand('vocab', Math.round(band * 2) / 2);

  // Mark daily challenge complete if this was one
  const isDailyChallenge = _ieltsMcqState.isDailyChallenge;
  if (isDailyChallenge) _ieltsCompleteDailyChallenge(score, total);

  // Weakness heatmap
  const weakData  = _ieltsGetWeakAreas();
  const weakEntries = Object.entries(weakData).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const weakHtml = weakEntries.length
    ? '<div class="ielts-weak-report">' +
        '<div class="ielts-weak-title">📊 Your Weak Areas</div>' +
        weakEntries.map(([topic, count]) => {
          const pctBar = Math.min(100, count * 10);
          return '<div class="ielts-weak-row">' +
            '<span class="ielts-weak-label">' + _esc(topic) + '</span>' +
            '<div class="ielts-weak-bar-wrap"><div class="ielts-weak-bar" style="width:' + pctBar + '%"></div></div>' +
            '<span class="ielts-weak-count">' + count + ' miss</span>' +
          '</div>';
        }).join('') +
        '<div class="ielts-weak-tip">💡 Focus next: <strong>' + _esc(weakEntries[0][0]) + '</strong></div>' +
      '</div>'
    : '';

  const area = document.getElementById('ieltsMcqArea');
  if (area) {
    // Build recommendation cards from weak areas
    const recTopics = _ieltsGetRecommendedTopics();
    const recHtml = recTopics.length
      ? '<div class="ielts-rec-panel">' +
          '<div class="ielts-rec-title">🎯 Recommended Next Practice</div>' +
          recTopics.map((r, i) => {
            const diffLabel = i === 0 ? 'Hard' : i === 1 ? 'Medium' : 'Easy Revision';
            const diffVal   = i === 0 ? 'hard' : i === 1 ? 'medium' : 'easy';
            const count     = i === 0 ? 20 : 15;
            return '<div class="ielts-rec-row">' +
              '<span class="ielts-rec-topic">' + _esc(r) + '</span>' +
              '<span class="ielts-rec-diff ielts-diff-' + diffVal + '">' + diffLabel + '</span>' +
              '<button class="ielts-rec-btn" onclick="_ieltsLaunchRecommended(' +
                JSON.stringify(r) + ',\'' + diffVal + '\',' + count + ')">' +
                'Start ' + count + 'Q →' +
              '</button>' +
            '</div>';
          }).join('') +
        '</div>'
      : '';

    area.innerHTML =
      '<div class="mcq-done-card">' +
        '<div class="mcq-done-emoji">' + (pct >= 80 ? '🎉' : pct >= 60 ? '📚' : '💪') + '</div>' +
        '<div class="mcq-done-score">' + score + ' / ' + total + '</div>' +
        '<div class="mcq-done-pct">' + pct + '% correct</div>' +
        (isDailyChallenge ? '<div class="ielts-daily-badge">🏆 Daily Challenge Complete!</div>' : '') +
        (missed > 0 ? '<div class="ielts-srs-notice">📌 ' + missed + ' missed word' + (missed > 1 ? 's' : '') + ' added to your Vocabulary Review deck</div>' : '') +
        weakHtml +
        recHtml +
        '<div class="mcq-done-actions">' +
          '<button class="mcq-btn-primary" onclick="generateIELTSMcq()">⚙️ New Quiz</button>' +
          '<button class="mcq-btn-secondary" onclick="_ieltsRepeatSimilar()">🔁 Similar Set</button>' +
          (missed > 0 ? '<button class="mcq-btn-secondary" onclick="_ieltsShowSubtab(\'wrongbook\')">📓 Wrong Book</button>' : '') +
        '</div>' +
      '</div>';
  }
}

// ══════════════════════════════════════════════════════════════════════
//  PDF EXPORT
// ══════════════════════════════════════════════════════════════════════

function exportIELTSReport() {
  const prog    = _ieltsGetProgress();
  const spkAvg  = _ieltsGetAvgBand('speaking');
  const wrtAvg  = _ieltsGetAvgBand('writing');
  const vocAvg  = _ieltsGetAvgBand('vocab');
  const overall = [spkAvg, wrtAvg, vocAvg].filter(Boolean);
  const overallAvg = overall.length
    ? (overall.reduce((a,b) => a+b, 0) / overall.length).toFixed(1)
    : '—';

  // Guard: nothing to export yet
  const hasSpeaking = _ieltsState.questions.length > 0;
  const hasWriting  = !!(_ieltsWritingState.feedback && typeof _ieltsWritingState.feedback.band === 'number');
  const hasProgress = overall.length > 0;
  if (!hasSpeaking && !hasWriting && !hasProgress) {
    if (typeof _showStudyToast === 'function') {
      _showStudyToast('Complete at least one session before exporting.');
    }
    return;
  }

  const speakingRows = _ieltsState.questions.map((q, i) => {
    const fb = _ieltsState.feedback[i] || {};
    const b  = _ieltsState.bands[i];
    return '<tr><td>Q' + (i+1) + '</td><td>' + _esc(q) + '</td>' +
      '<td>' + _esc(_ieltsState.answers[i] || '') + '</td>' +
      '<td>' + (b !== undefined ? b.toFixed(1) : '—') + '</td>' +
      '<td>' + _esc(fb.tip || '') + '</td></tr>';
  }).join('');

  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<title>IELTS Report — Nexora</title>' +
    '<style>body{font-family:Arial,sans-serif;padding:24px;color:#1a1a2e}' +
    'h1{color:#7c5cff}h2{color:#444;border-bottom:1px solid #eee;padding-bottom:6px}' +
    'table{width:100%;border-collapse:collapse;margin-top:12px}' +
    'th,td{border:1px solid #ddd;padding:8px;font-size:12px;vertical-align:top}' +
    'th{background:#f0eeff;color:#7c5cff}.band{font-weight:700;color:#7c5cff}' +
    '.tip{font-style:italic;color:#666}</style></head><body>' +
    '<h1>🎓 IELTS Preparation Report</h1>' +
    '<p><strong>Candidate:</strong> ' + (typeof userName !== 'undefined' ? _esc(userName || 'Candidate') : 'Candidate') + '</p>' +
    '<p><strong>Examiner:</strong> ' + IELTS_EXAMINER_NAME + '</p>' +
    '<p><strong>Date:</strong> ' + new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'}) + '</p>' +
    '<h2>Overall Band Score Estimate: <span class="band">' + overallAvg + '</span></h2>' +
    '<table><tr><th>Skill</th><th>Average Band</th><th>Sessions</th></tr>' +
    '<tr><td>Speaking</td><td class="band">' + (spkAvg ? spkAvg.toFixed(1) : '—') + '</td><td>' + (prog.speaking?.length || 0) + '</td></tr>' +
    '<tr><td>Writing</td><td class="band">' + (wrtAvg ? wrtAvg.toFixed(1) : '—') + '</td><td>' + (prog.writing?.length || 0) + '</td></tr>' +
    '<tr><td>Vocabulary</td><td class="band">' + (vocAvg ? vocAvg.toFixed(1) : '—') + '</td><td>' + (prog.vocab?.length || 0) + '</td></tr>' +
    '</table>' +
    (hasSpeaking ? '<h2>Speaking Test Detail</h2>' +
    '<table><tr><th>#</th><th>Question</th><th>Your Answer</th><th>Band</th><th>Tip</th></tr>' +
    speakingRows + '</table>' : '') +
    (hasWriting ? '<h2>Writing Evaluation</h2>' +
    '<p><strong>Task ' + _ieltsWritingState.task + ' Prompt:</strong> ' + _esc(_ieltsWritingState.prompt) + '</p>' +
    '<p><strong>Band:</strong> ' + _ieltsWritingState.feedback.band.toFixed(1) + '</p>' +
    '<p><strong>Tip:</strong> <em>' + _esc(_ieltsWritingState.feedback.overall_tip || '') + '</em></p>' : '') +
    '</body></html>';

  if (typeof _printHTML === 'function') {
    _printHTML(html, 'IELTS_Report');
  } else {
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'IELTS_Report.html';
    a.click();
    // Revoke after the browser has had time to initiate the download
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

// ══════════════════════════════════════════════════════════════════════
//  SUBTAB SWITCHING
// ══════════════════════════════════════════════════════════════════════

function _ieltsShowSubtab(target) {
  const sections = {
    speaking:  'ieltsSpeakingSection',
    writing:   'ieltsWritingSection',
    reading:   'ieltsReadingSection',
    listening: 'ieltsListeningSection',
    mcq:       'ieltsMCQSection',
    srs:       'ieltsSRSSection',
    progress:  'ieltsProgressSection',
    wrongbook: 'ieltsWrongBookSection',
  };
  Object.values(sections).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const active = document.getElementById(sections[target]);
  if (active) active.style.display = 'block';

  // Hide the home panel (section cards + idiom/tip) so they don't obstruct content
  const homePanel = document.getElementById('ieltsHomePanel');
  if (homePanel) homePanel.style.display = 'none';

  // Show the back button
  const backBtn = document.getElementById('ieltsBackBtn');
  if (backBtn) backBtn.style.display = 'inline-flex';

  document.querySelectorAll('.ielts-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === target);
  });

  if (target === 'progress')  _ieltsUpdateProgressUI();
  if (target === 'srs')       _ieltsRefreshSRSBadge();
  if (target === 'wrongbook') renderIELTSWrongBook();
  if (target === 'reading') {
    _ieltsResetReadingToSetup();   // always reset to setup view on fresh entry
    _ieltsInitReadingSetup();
  }
  if (target === 'mcq') {
    _vgUpdateAiSource();
    requestAnimationFrame(() => {
      const sel = document.getElementById('ieltsMcqType');
      _vgAnimatePill(sel ? sel.value : 'mixed');
    });
  }
}

// Return to the IELTS overview (section cards + idiom/tip strip)
function _ieltsShowHome() {
  // Hide all subtab sections
  const sections = [
    'ieltsSpeakingSection', 'ieltsWritingSection', 'ieltsReadingSection', 'ieltsMCQSection',
    'ieltsSRSSection', 'ieltsProgressSection', 'ieltsWrongBookSection',
  ];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Reset reading session back to setup view so re-entry is always fresh
  _ieltsResetReadingToSetup();

  // Show the home panel
  const homePanel = document.getElementById('ieltsHomePanel');
  if (homePanel) homePanel.style.display = 'block';

  // Hide the back button
  const backBtn = document.getElementById('ieltsBackBtn');
  if (backBtn) backBtn.style.display = 'none';

  // Clear active state on subtab pills
  document.querySelectorAll('.ielts-subtab').forEach(btn => btn.classList.remove('active'));
}

// Reset reading UI to the setup/selector view and clear session state
function _ieltsResetReadingToSetup() {
  // Stop any running timer
  _ieltsStopTimer('reading');

  // Reset state so a fresh session starts next time
  _readingState = {
    passageIndex:  0,
    questionIndex: 0,
    userAnswers:   [],
    score:         0,
    passage:       null,
    allQuestions:  [],
    started:       false,
  };

  // Show setup, hide session and results
  const setup   = document.getElementById('ieltsReadingSetup');
  const session = document.getElementById('ieltsReadingSession');
  const results = document.getElementById('ieltsReadingResults');
  if (setup)   setup.style.display   = 'block';
  if (session) session.style.display = 'none';
  if (results) results.style.display = 'none';

  // Remove vocab sidebar if present
  const sidebar = document.getElementById('ieltsReadingVocabSidebar');
  if (sidebar) sidebar.remove();

  // Remove weak nudge if present
  const nudge = document.querySelector('.ielts-reading-weak-nudge');
  if (nudge) nudge.remove();

  // Force the passage grid to rebuild on next entry
  const grid = document.getElementById('ieltsReadingPassageGrid');
  if (grid) delete grid.dataset.built;
}

// ══════════════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════════════

function initIELTSModule() {
  if (_ieltsInitDone) return;
  _ieltsInitDone = true;

  // Subtab listeners
  document.querySelectorAll('.ielts-subtab').forEach(btn => {
    btn.addEventListener('click', () => _ieltsShowSubtab(btn.dataset.subtab));
  });

  // Writing word count live update
  const writingInput = document.getElementById('ieltsWritingInput');
  if (writingInput) writingInput.addEventListener('input', _ieltsUpdateWordCount);

  // Load a writing prompt on init
  const taskSel = document.getElementById('ieltsWritingTask');
  if (taskSel) taskSel.addEventListener('change', ieltsLoadWritingPrompt);

  // Update progress dashboard
  _ieltsUpdateProgressUI();
}

// ── Global exports ────────────────────────────────────────────────────
window.initIELTSModule         = initIELTSModule;
window.startIELTSSpeaking      = startIELTSSpeaking;
window.speakingStartPart2Speech = speakingStartPart2Speech;
window.submitSpeakingAnswer    = submitSpeakingAnswer;
window.speakingNext            = speakingNext;
window.speakingToggleMic       = speakingToggleMic;
window.ieltsLoadWritingPrompt  = ieltsLoadWritingPrompt;
window.submitIELTSWriting      = submitIELTSWriting;
window.generateIELTSMcq        = generateIELTSMcq;
window.ieltsAnswerMcq          = ieltsAnswerMcq;
window.ieltsNextMcq            = ieltsNextMcq;
window.exportIELTSReport       = exportIELTSReport;
window._ieltsShowSubtab        = _ieltsShowSubtab;
window._ieltsShowHome          = _ieltsShowHome;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE A — AI On-Demand Explainer (per MCQ question)
// ══════════════════════════════════════════════════════════════════════

async function explainIELTSMcq(qIdx, userChoice) {
  const q = _ieltsMcqState.questions[qIdx];
  if (!q) return;

  const panelId = 'ieltsMcqExplainPanel_' + qIdx;
  const panel   = document.getElementById(panelId);
  if (!panel) return;

  panel.style.display = 'block';
  panel.innerHTML = '<div class="ielts-explain-loading"><span class="nb-rag-spinner"></span> Asking AI tutor…</div>';

  const correctOptText = (q.options || []).find(o => o.startsWith(q.correct + ')')) || '';
  const userOptText    = (q.options || []).find(o => o.startsWith(userChoice + ')')) || '';

  const sys =
    'You are an expert IELTS tutor. Explain the grammar or vocabulary concept behind this question. ' +
    'Give: 1) the rule in plain English, 2) two clear examples, 3) one short practice sentence for the student. ' +
    'Keep it under 180 words. Use simple formatting (no markdown headers).';

  const usr =
    'Question: ' + q.q + '\n' +
    'Correct answer: ' + q.correct + ') ' + correctOptText.replace(/^[A-D]\)\s*/, '') + '\n' +
    (userChoice !== q.correct ? 'Student chose: ' + userChoice + ') ' + userOptText.replace(/^[A-D]\)\s*/, '') + '\n' : '') +
    'Explain why the correct answer is right and teach the underlying rule.';

  // Try free AI first (callStudyAI already chains: Gemini free → OpenRouter free → Pollinations free)
  // If all fail, show a helpful message pointing to paid model setup
  try {
    const reply = await callStudyAI(sys, usr);
    panel.innerHTML =
      '<div class="ielts-explain-header">' +
        '<span>🧠 AI Explanation</span>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<button class="ielts-orb-speak-btn" id="orbSpeakBtn_' + panelId + '" ' +
            'onclick="_ieltsOrbSpeakExplanation(' + JSON.stringify(reply).replace(/</g,'\\u003c') + ',\'' + panelId + '\')">🔊 Hear</button>' +
          '<button class="ielts-explain-close" onclick="document.getElementById(\'' + panelId + '\').style.display=\'none\';_ieltsOrbStopTeaching()">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="ielts-explain-body">' + _esc(reply).replace(/\n/g, '<br>') + '</div>' +
      '<button class="mcq-explain-btn" style="margin-top:8px" onclick="' +
        'navigator.clipboard.writeText(' + JSON.stringify(reply).replace(/'/g, "\\'") + ')' +
        '.then(()=>_showStudyToast(\'Copied!\'))' +
      '">📋 Copy</button>';

    // Orb auto-speaks the AI explanation
    setTimeout(() => _ieltsOrbSpeakExplanation(reply, panelId), 300);
  } catch(e) {
    // All free endpoints failed — guide user to add a key
    panel.innerHTML =
      '<div class="ielts-explain-header">' +
        '<span>🧠 AI Explanation</span>' +
        '<button class="ielts-explain-close" onclick="document.getElementById(\'' + panelId + '\').style.display=\'none\'">✕</button>' +
      '</div>' +
      '<div class="ielts-explain-error" style="padding:12px">' +
        '<p style="margin:0 0 8px">⚠️ Free AI is currently unavailable (rate limit or network issue).</p>' +
        '<p style="margin:0 0 8px">To unlock reliable AI explanations, add a free API key:</p>' +
        '<ul style="margin:0 0 8px;padding-left:18px;font-size:13px">' +
          '<li><strong>Gemini (free):</strong> <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--accent)">aistudio.google.com</a></li>' +
          '<li><strong>OpenRouter (free models):</strong> <a href="https://openrouter.ai/keys" target="_blank" style="color:var(--accent)">openrouter.ai/keys</a></li>' +
        '</ul>' +
        '<p style="margin:0;font-size:12px;color:var(--text3)">Add your key in Nexora Settings → AI Key</p>' +
      '</div>' +
      // Still show the built-in explanation as a fallback
      (q.explanation
        ? '<div class="ielts-explain-body" style="margin-top:8px"><strong>Built-in note:</strong> ' + _esc(q.explanation) + '</div>'
        : '');
  }
}

function ieltsAddToSRSManual(qIdx) {
  const q = _ieltsMcqState.questions[qIdx];
  if (!q) return;
  _ieltsAddMissedToSRS(q, '?');
  if (typeof _showStudyToast === 'function') _showStudyToast('📌 Added to Vocabulary Review');
}

window.explainIELTSMcq    = explainIELTSMcq;
window.ieltsAddToSRSManual = ieltsAddToSRSManual;

// ══════════════════════════════════════════════════════════════════════
//  ORB TEACHER — Voice + AI explanation engine
//  The orb acts as a live teacher: it speaks explanations, vocab
//  definitions, and IELTS feedback using the existing speakText() TTS.
//  Orb state: processing (thinking) → speaking (talking) → idle (done)
// ══════════════════════════════════════════════════════════════════════

let _orbTeachAbortController = null; // cancel in-flight teaching
let _orbIsSpeaking = false;          // true while _ieltsOrbTeach is delivering TTS

// ── Core teach function — orb speaks any text ────────────────────────
async function _ieltsOrbTeach(text, { onStart, onEnd } = {}) {
  if (!text || !text.trim()) return;

  // Cancel any previous teaching session
  if (_orbTeachAbortController) {
    _orbTeachAbortController.abort = true;
  }
  const ctrl = { abort: false };
  _orbTeachAbortController = ctrl;

  // Orb → speaking state (green, audio-reactive via AnalyserNode)
  if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('speaking');
  _orbIsSpeaking = true;
  if (onStart) onStart();

  try {
    // speakText is defined in nexora-ai.js — strips HTML, handles CF TTS + browser fallback
    if (typeof speakText === 'function' && !ctrl.abort) {
      // Race TTS against a 15s timeout so onEnd always fires even if TTS hangs
      await Promise.race([speakText(text), new Promise(r => setTimeout(r, 15_000))]);
      // If the timeout won, kill the still-running TTS so it doesn't bleed into the next step
      if (typeof stopSpeaking === 'function') stopSpeaking();
    }
  } catch(e) { /* TTS failure is non-fatal */ }

  _orbIsSpeaking = false;
  if (!ctrl.abort) {
    if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('idle');
    if (onEnd) onEnd();
  }
}

// ── Stop orb teaching mid-sentence ───────────────────────────────────
function _ieltsOrbStopTeaching() {
  if (_orbTeachAbortController) _orbTeachAbortController.abort = true;
  _orbIsSpeaking = false;
  if (typeof stopSpeaking === 'function') stopSpeaking();
  if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('idle');
}

// ── Orb reads the examiner question aloud ────────────────────────────
function _ieltsOrbReadQuestion(questionText) {
  if (!questionText) return;
  // Brief processing flash before speaking
  if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('processing');
  setTimeout(() => {
    _ieltsOrbTeach('Nexora asks: ' + questionText);
  }, 500);
}

// ── Orb speaks MCQ explanation (built-in, instant — no AI needed) ────
function _ieltsOrbSpeakMcqResult(q, isCorrect, chosenLetter) {
  const correctOptText = (q.options || []).find(o => o.startsWith(q.correct + ')')) || '';
  const correctText    = correctOptText.replace(/^[A-D]\)\s*/, '');

  let speech = '';
  if (isCorrect) {
    speech = 'Correct! ' + (q.explanation || ('The answer is ' + q.correct + ': ' + correctText));
  } else {
    const chosenOptText = (q.options || []).find(o => o.startsWith(chosenLetter + ')')) || '';
    const chosenText    = chosenOptText.replace(/^[A-D]\)\s*/, '');
    speech =
      'Not quite. You chose ' + chosenLetter + ': ' + chosenText + '. ' +
      'The correct answer is ' + q.correct + ': ' + correctText + '. ' +
      (q.explanation || '');
  }

  _ieltsOrbTeach(speech);
}

// ── Orb speaks AI-generated explanation (called after AI responds) ───
function _ieltsOrbSpeakExplanation(text, panelId) {
  // Update the speak button in the panel to show stop state
  const btn = document.getElementById('orbSpeakBtn_' + panelId);
  if (btn) {
    btn.textContent = '⏹ Stop';
    btn.onclick = () => { _ieltsOrbStopTeaching(); btn.textContent = '🔊 Hear'; btn.onclick = () => _ieltsOrbSpeakExplanation(text, panelId); };
  }
  _ieltsOrbTeach(text, {
    onEnd: () => {
      if (btn) { btn.textContent = '🔊 Hear'; btn.onclick = () => _ieltsOrbSpeakExplanation(text, panelId); }
    }
  });
}

// ── Orb speaks IELTS speaking feedback tip ───────────────────────────
function _ieltsOrbSpeakFeedback(result) {
  const speech =
    'Band ' + result.band.toFixed(1) + '. ' +
    result.fluency + ' ' +
    result.lexical + ' ' +
    result.grammar + ' ' +
    'Tip: ' + result.tip;
  _ieltsOrbTeach(speech);
}

// ── Vocab word teacher — pronounce + define + example ────────────────
async function _ieltsOrbTeachVocabWord(word, definition, example) {
  if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('processing');

  let speech = word + '. ';

  if (definition) {
    speech += definition + '. ';
  } else {
    // Ask AI for a quick definition if not provided
    try {
      const sys = 'You are an IELTS vocabulary teacher. Give a 1-sentence definition and 1 example sentence for the word. Format: "Definition: ... Example: ..."';
      const reply = await callStudyAI(sys, 'Word: ' + word);
      speech += reply + '. ';
    } catch(e) {
      speech += 'This is an important IELTS vocabulary word. ';
    }
  }

  if (example) speech += 'For example: ' + example;

  _ieltsOrbTeach(speech);
}

// ── Wire orb teach button into MCQ feedback ───────────────────────────
// Called from ieltsAnswerMcq — adds a speak button and auto-speaks
function _ieltsInjectOrbTeachButton(fbDiv, q, isCorrect, chosenLetter, qIdx) {
  // Add orb speak button to the explain actions row
  const actionsDiv = fbDiv.querySelector('.ielts-explain-actions');
  if (actionsDiv) {
    const speakBtn = document.createElement('button');
    speakBtn.className = 'mcq-explain-btn ielts-orb-speak-btn';
    speakBtn.id = 'orbMcqSpeakBtn_' + qIdx;
    speakBtn.innerHTML = '🔊 Orb Explain';
    speakBtn.onclick = () => _ieltsOrbSpeakMcqResult(q, isCorrect, chosenLetter);
    actionsDiv.insertBefore(speakBtn, actionsDiv.firstChild);
  }

  // Auto-speak after a short delay (feels natural — orb "reacts" to the answer)
  setTimeout(() => _ieltsOrbSpeakMcqResult(q, isCorrect, chosenLetter), 400);
}

window._ieltsOrbTeach          = _ieltsOrbTeach;
window._ieltsOrbStopTeaching   = _ieltsOrbStopTeaching;
window._ieltsOrbReadQuestion   = _ieltsOrbReadQuestion;
window._ieltsOrbSpeakMcqResult = _ieltsOrbSpeakMcqResult;
window._ieltsOrbTeachVocabWord = _ieltsOrbTeachVocabWord;

// ── Mini orb in IELTS hero — mirrors main orb state ──────────────────
// Must run AFTER window.load so _nexoraOrbState is already set by initNexoraOrb()
function _initIeltsMiniOrb() {
  const _origOrbState = window._nexoraOrbState;
  window._nexoraOrbState = function(state) {
    if (typeof _origOrbState === 'function') _origOrbState(state);
    _ieltsMiniOrbSetState(state);
  };
}
// Defer until after all scripts have loaded and initNexoraOrb() has run
if (document.readyState === 'complete') {
  _initIeltsMiniOrb();
} else {
  window.addEventListener('load', _initIeltsMiniOrb, { once: true });
}

function _ieltsMiniOrbSetState(state) {
  const orb    = document.getElementById('ieltsMiniOrbInner');
  const wrap   = document.getElementById('ieltsMiniOrb');
  const status = document.getElementById('ieltsHeroStatusText');
  const dot    = document.querySelector('.ielts-status-dot');
  if (!orb) return;

  // Remove all state classes
  orb.className  = 'ielts-mini-orb-inner';
  if (wrap) wrap.className = 'ielts-mini-orb';

  const stateMap = {
    idle:      { cls: 'orb-idle',       label: 'Ready',      dotColor: '#00e5c8' },
    listening: { cls: 'orb-listening',  label: 'Listening…', dotColor: '#00e5c8' },
    processing:{ cls: 'orb-processing', label: 'Thinking…',  dotColor: '#f59e0b' },
    speaking:  { cls: 'orb-speaking',   label: 'Speaking…',  dotColor: '#84cc16' },
    examiner:  { cls: 'orb-examiner',   label: 'Examining…', dotColor: '#a855f7' },
    error:     { cls: 'orb-error',      label: 'Error',      dotColor: '#ef4444' },
  };
  const s = stateMap[state] || stateMap.idle;
  orb.classList.add(s.cls);
  if (wrap) wrap.classList.add('mini-orb-' + (state || 'idle'));
  if (status) status.textContent = s.label;
  if (dot) dot.style.background = s.dotColor;
}

window._ieltsMiniOrbSetState = _ieltsMiniOrbSetState;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE A2 — Weak Area Tracker
// ══════════════════════════════════════════════════════════════════════

function _ieltsGetWeakAreas() {
  try { return JSON.parse(localStorage.getItem(IELTS_WEAK_KEY) || '{}'); }
  catch(e) { return {}; }
}

function _trackIELTSWeakArea(topic) {
  if (!topic || topic === 'mixed') return;
  const data = _ieltsGetWeakAreas();
  data[topic] = (data[topic] || 0) + 1;
  try { localStorage.setItem(IELTS_WEAK_KEY, JSON.stringify(data)); } catch(e) {}
}

// ══════════════════════════════════════════════════════════════════════
//  FEATURE A3 — Repeat Similar Set
// ══════════════════════════════════════════════════════════════════════

function _ieltsRepeatSimilar() {
  // Restore selectors to last config and re-generate
  const cfg = _ieltsPracticeConfig;
  const setEl = id => { const el = document.getElementById(id); if (el) el.value = cfg[id.replace('ielts','').replace(/([A-Z])/g, c => c.toLowerCase())] || el.value; };

  const topicEl = document.getElementById('ieltsMcqTopic');
  if (topicEl) topicEl.value = cfg.topic || '';

  const typeEl = document.getElementById('ieltsMcqType');
  if (typeEl) typeEl.value = cfg.type || 'mixed';

  const countEl = document.getElementById('ieltsMcqCount');
  if (countEl) countEl.value = cfg.count || 10;

  const grammarEl = document.getElementById('ieltsGrammarTopic');
  if (grammarEl) grammarEl.value = cfg.grammarTopic || 'mixed';

  const diffEl = document.getElementById('ieltsDifficulty');
  if (diffEl) diffEl.value = cfg.difficulty || 'medium';

  const modeEl = document.getElementById('ieltsPracticeMode');
  if (modeEl) modeEl.value = cfg.mode || 'practice';

  generateIELTSMcq();
}

window._ieltsRepeatSimilar = _ieltsRepeatSimilar;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE A4 — Daily Challenge & Streak
// ══════════════════════════════════════════════════════════════════════

function _ieltsGetDailyState() {
  try { return JSON.parse(localStorage.getItem(IELTS_DAILY_KEY) || '{}'); }
  catch(e) { return {}; }
}

function _ieltsGetStreak() {
  try { return JSON.parse(localStorage.getItem(IELTS_STREAK_KEY) || '{"count":0,"lastDate":""}'); }
  catch(e) { return { count: 0, lastDate: '' }; }
}

function _ieltsCompleteDailyChallenge(score, total) {
  const today = new Date().toISOString().slice(0, 10);
  const daily = _ieltsGetDailyState();
  if (daily.completedDate === today) return; // already done today

  daily.completedDate = today;
  daily.score = score;
  daily.total = total;
  try { localStorage.setItem(IELTS_DAILY_KEY, JSON.stringify(daily)); } catch(e) {}

  // Update streak
  const streak = _ieltsGetStreak();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (streak.lastDate === yesterday) {
    streak.count++;
  } else if (streak.lastDate !== today) {
    streak.count = 1;
  }
  streak.lastDate = today;
  try { localStorage.setItem(IELTS_STREAK_KEY, JSON.stringify(streak)); } catch(e) {}

  _ieltsUpdateDailyUI();
  if (typeof _showStudyToast === 'function') {
    _showStudyToast('🔥 ' + streak.count + '-day streak! Daily challenge complete!');
  }
}

function startIELTSDailyChallenge() {
  const today = new Date().toISOString().slice(0, 10);
  const daily = _ieltsGetDailyState();

  if (daily.completedDate === today) {
    if (typeof _showStudyToast === 'function') {
      _showStudyToast('✅ Already completed today\'s challenge! Come back tomorrow.');
    }
    return;
  }

  // Set selectors to daily challenge defaults
  const typeEl = document.getElementById('ieltsMcqType');
  if (typeEl) typeEl.value = 'mixed';
  const countEl = document.getElementById('ieltsMcqCount');
  if (countEl) countEl.value = '10';
  const diffEl = document.getElementById('ieltsDifficulty');
  if (diffEl) diffEl.value = 'medium';
  const modeEl = document.getElementById('ieltsPracticeMode');
  if (modeEl) modeEl.value = 'exam';
  const grammarEl = document.getElementById('ieltsGrammarTopic');
  if (grammarEl) grammarEl.value = 'mixed';
  const topicEl = document.getElementById('ieltsMcqTopic');
  if (topicEl) topicEl.value = '';

  _ieltsMcqState.isDailyChallenge = true;
  generateIELTSMcq();
}

function _ieltsUpdateDailyUI() {
  const today  = new Date().toISOString().slice(0, 10);
  const daily  = _ieltsGetDailyState();
  const streak = _ieltsGetStreak();
  const done   = daily.completedDate === today;

  const streakEl = document.getElementById('ieltsDailyStreak');
  if (streakEl) streakEl.textContent = '🔥 ' + streak.count + '-day streak';

  const statusEl = document.getElementById('ieltsDailyStatus');
  if (statusEl) {
    statusEl.textContent = done
      ? '✅ Completed today (' + (daily.score || 0) + '/' + (daily.total || 10) + ')'
      : '⏳ Not done yet';
    statusEl.style.color = done ? '#10b981' : 'var(--text3)';
  }

  const btn = document.getElementById('ieltsDailyChallengeBtn');
  if (btn) {
    btn.textContent = done ? '✅ Done for Today' : '🎯 Start Daily Challenge';
    btn.disabled = done;
  }
}

window.startIELTSDailyChallenge = startIELTSDailyChallenge;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE A5 — Skill-Based Recommendation Engine
// ══════════════════════════════════════════════════════════════════════

function _ieltsGetRecommendedTopics() {
  const weak = _ieltsGetWeakAreas();
  return Object.entries(weak)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);
}

function _ieltsLaunchRecommended(topic, difficulty, count) {
  // Set all controls to the recommended config
  const grammarEl = document.getElementById('ieltsGrammarTopic');
  if (grammarEl) grammarEl.value = topic;

  const diffEl = document.getElementById('ieltsDifficulty');
  if (diffEl) diffEl.value = difficulty;

  const countEl = document.getElementById('ieltsMcqCount');
  if (countEl) countEl.value = String(count);

  const typeEl = document.getElementById('ieltsMcqType');
  if (typeEl) typeEl.value = 'grammar';

  const modeEl = document.getElementById('ieltsPracticeMode');
  if (modeEl) modeEl.value = 'exam';

  const topicEl = document.getElementById('ieltsMcqTopic');
  if (topicEl) topicEl.value = '';

  if (typeof _showStudyToast === 'function') {
    _showStudyToast('🎯 Launching: ' + topic + ' · ' + difficulty + ' · ' + count + 'Q');
  }
  generateIELTSMcq();
}

window._ieltsLaunchRecommended = _ieltsLaunchRecommended;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE A6 — Wrong-Question Notebook
// ══════════════════════════════════════════════════════════════════════

const IELTS_WRONG_BOOK_KEY = 'ielts_wrong_book';

function _ieltsGetWrongBook() {
  try { return JSON.parse(localStorage.getItem(IELTS_WRONG_BOOK_KEY) || '[]'); }
  catch(e) { return []; }
}

function _ieltsAddToWrongBook(q, chosenLetter) {
  const book = _ieltsGetWrongBook();
  // Avoid exact duplicates (same question text)
  if (book.some(e => e.q === q.q)) return;
  const correctOptText = (q.options || []).find(o => o.startsWith(q.correct + ')')) || '';
  const chosenOptText  = (q.options || []).find(o => o.startsWith(chosenLetter + ')')) || '';
  book.unshift({
    q:           q.q,
    options:     q.options || [],
    correct:     q.correct,
    correctText: correctOptText.replace(/^[A-D]\)\s*/, ''),
    chosen:      chosenLetter,
    chosenText:  chosenOptText.replace(/^[A-D]\)\s*/, ''),
    explanation: q.explanation || '',
    topic:       _ieltsPracticeConfig.grammarTopic || 'mixed',
    difficulty:  _ieltsPracticeConfig.difficulty   || 'medium',
    ts:          Date.now(),
  });
  // Keep max 200 entries
  if (book.length > 200) book.pop();
  try { localStorage.setItem(IELTS_WRONG_BOOK_KEY, JSON.stringify(book)); } catch(e) {}
  _ieltsRefreshWrongBookBadge();
}

function _ieltsRefreshWrongBookBadge() {
  const count = _ieltsGetWrongBook().length;
  const ids   = ['ieltsWrongBookBadge', 'ieltsWrongBookBadgeCard'];
  ids.forEach(id => {
    const badge = document.getElementById(id);
    if (!badge) return;
    if (count > 0) { badge.style.display = 'inline-flex'; badge.textContent = count > 99 ? '99+' : count; }
    else badge.style.display = 'none';
  });
}

function renderIELTSWrongBook() {
  const book  = _ieltsGetWrongBook();
  const area  = document.getElementById('ieltsWrongBookArea');
  if (!area) return;

  if (!book.length) {
    area.innerHTML =
      '<div class="ielts-wrongbook-empty">' +
        '<div style="font-size:36px;margin-bottom:8px">📓</div>' +
        '<div>No mistakes recorded yet.</div>' +
        '<div style="font-size:12px;color:var(--text3);margin-top:4px">Wrong answers will appear here automatically.</div>' +
      '</div>';
    return;
  }

  // Group by topic
  const byTopic = {};
  book.forEach(e => {
    const t = e.topic || 'mixed';
    if (!byTopic[t]) byTopic[t] = [];
    byTopic[t].push(e);
  });

  const filterTopic = document.getElementById('ieltsWrongBookFilter')?.value || 'all';
  const entries = filterTopic === 'all' ? book : (byTopic[filterTopic] || []);

  area.innerHTML =
    '<div class="ielts-wrongbook-stats">' +
      '<span>📓 <strong>' + book.length + '</strong> mistakes recorded</span>' +
      '<button class="ielts-wrongbook-clear" onclick="_ieltsConfirmClearWrongBook()">🗑 Clear All</button>' +
    '</div>' +
    entries.map((e, i) => {
      const date = new Date(e.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return '<div class="ielts-wrongbook-card">' +
        '<div class="ielts-wrongbook-meta">' +
          '<span class="ielts-wrongbook-topic">' + _esc(e.topic || 'mixed') + '</span>' +
          '<span class="ielts-wrongbook-diff ielts-diff-' + (e.difficulty || 'medium') + '">' + (e.difficulty || 'medium') + '</span>' +
          '<span class="ielts-wrongbook-date">' + date + '</span>' +
        '</div>' +
        '<div class="ielts-wrongbook-q">' + _esc(e.q) + '</div>' +
        '<div class="ielts-wrongbook-answers">' +
          '<span class="ielts-wrongbook-wrong">✗ You: ' + _esc(e.chosen + ') ' + e.chosenText) + '</span>' +
          '<span class="ielts-wrongbook-correct">✓ Correct: ' + _esc(e.correct + ') ' + e.correctText) + '</span>' +
        '</div>' +
        (e.explanation
          ? '<div class="ielts-wrongbook-exp">' + _esc(e.explanation) + '</div>'
          : '') +
        '<div class="ielts-wrongbook-actions">' +
          '<button class="mcq-explain-btn" onclick="_ieltsRemoveWrongEntry(' + i + ')">🗑 Remove</button>' +
          '<button class="ielts-orb-speak-btn" onclick="_ieltsOrbTeachVocabWord(' +
            JSON.stringify(e.q).replace(/</g,'\\u003c') + ',' +
            JSON.stringify(e.correctText).replace(/</g,'\\u003c') + ',' +
            JSON.stringify(e.explanation || '').replace(/</g,'\\u003c') +
          ')">🔊 Orb Teach</button>' +
        '</div>' +
      '</div>';
    }).join('');
}

function _ieltsConfirmClearWrongBook() {
  if (!confirm('Clear all ' + _ieltsGetWrongBook().length + ' wrong-book entries?')) return;
  try { localStorage.removeItem(IELTS_WRONG_BOOK_KEY); } catch(e) {}
  _ieltsRefreshWrongBookBadge();
  renderIELTSWrongBook();
}

function _ieltsRemoveWrongEntry(idx) {
  const book = _ieltsGetWrongBook();
  const filterTopic = document.getElementById('ieltsWrongBookFilter')?.value || 'all';
  // Find actual index in full book if filtered
  if (filterTopic !== 'all') {
    const entry = book.filter(e => e.topic === filterTopic)[idx];
    const realIdx = book.indexOf(entry);
    if (realIdx !== -1) book.splice(realIdx, 1);
  } else {
    book.splice(idx, 1);
  }
  try { localStorage.setItem(IELTS_WRONG_BOOK_KEY, JSON.stringify(book)); } catch(e) {}
  _ieltsRefreshWrongBookBadge();
  renderIELTSWrongBook();
}

window.renderIELTSWrongBook      = renderIELTSWrongBook;
window._ieltsConfirmClearWrongBook = _ieltsConfirmClearWrongBook;
window._ieltsRemoveWrongEntry    = _ieltsRemoveWrongEntry;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE A7 — Exam Simulation Presets
// ══════════════════════════════════════════════════════════════════════

const IELTS_PRESETS = [
  { label: '⚡ Quick Drill',       type: 'mixed',   grammar: 'mixed',       diff: 'medium', count: 10,  mode: 'practice', icon: '⚡' },
  { label: '📝 Grammar Mini Test', type: 'grammar', grammar: 'mixed',       diff: 'medium', count: 10,  mode: 'exam',     icon: '📝' },
  { label: '🎯 Band 7 Challenge',  type: 'mixed',   grammar: 'mixed',       diff: 'hard',   count: 20,  mode: 'exam',     icon: '🎯' },
  { label: '📖 Vocab Sprint',      type: 'vocab',   grammar: 'mixed',       diff: 'medium', count: 20,  mode: 'practice', icon: '📖' },
  { label: '🔥 Full Grammar Mock', type: 'grammar', grammar: 'mixed',       diff: 'hard',   count: 50,  mode: 'exam',     icon: '🔥' },
  { label: '💯 100Q Marathon',     type: 'mixed',   grammar: 'mixed',       diff: 'medium', count: 100, mode: 'exam',     icon: '💯' },
  { label: '🔵 Conditionals Fix',  type: 'grammar', grammar: 'conditionals',diff: 'medium', count: 15,  mode: 'exam',     icon: '🔵' },
  { label: '🟣 Passive Voice Fix', type: 'grammar', grammar: 'passive voice',diff:'medium', count: 15,  mode: 'exam',     icon: '🟣' },
];

function _ieltsApplyPreset(idx) {
  const p = IELTS_PRESETS[idx];
  if (!p) return;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('ieltsMcqType',      p.type);
  set('ieltsGrammarTopic', p.grammar);
  set('ieltsDifficulty',   p.diff);
  set('ieltsMcqCount',     String(p.count));
  set('ieltsPracticeMode', p.mode);
  set('ieltsMcqTopic',     '');

  if (typeof _showStudyToast === 'function') _showStudyToast('Preset loaded: ' + p.label);
  generateIELTSMcq();
}

window._ieltsApplyPreset = _ieltsApplyPreset;

// ── MCQ section UI helpers — type tabs, grammar chips, diff tabs ──────

function _ieltsSetTypeTab(type) {
  // Update visual tabs
  ['mixed','vocab','grammar'].forEach(t => {
    const btn = document.getElementById('ieltsTypeTab_' + t);
    if (btn) btn.classList.toggle('active', t === type);
  });
  // Sync hidden select
  const sel = document.getElementById('ieltsMcqType');
  if (sel) sel.value = type;
  // Show/hide grammar sub-topics row
  const grammarRow = document.getElementById('ieltsGrammarTopicsRow');
  if (grammarRow) grammarRow.style.display = type === 'grammar' ? 'flex' : 'none';
  // Animate sliding pill — use rAF so layout is computed after display change
  requestAnimationFrame(() => _vgAnimatePill(type));
}

function _ieltsSetGrammarChip(el, topic) {
  document.querySelectorAll('.ielts-grammar-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  // Sync hidden select
  const sel = document.getElementById('ieltsGrammarTopic');
  if (sel) sel.value = topic;
}

function _ieltsSetDiffTab(diff) {
  ['easy','medium','hard'].forEach(d => {
    const btn = document.getElementById('ieltsDiffTab_' + d);
    if (btn) btn.classList.toggle('active', d === diff);
  });
  const sel = document.getElementById('ieltsDifficulty');
  if (sel) sel.value = diff;
}

window._ieltsSetTypeTab    = _ieltsSetTypeTab;
window._ieltsSetGrammarChip = _ieltsSetGrammarChip;
window._ieltsSetDiffTab    = _ieltsSetDiffTab;

// ── Sliding pill animation for mode tabs ─────────────────────────────
function _vgAnimatePill(type) {
  const pill = document.getElementById('vgPill');
  const tabs = document.getElementById('vgModeTabs');
  if (!pill || !tabs) return;
  const idx = { mixed: 0, vocab: 1, grammar: 2 }[type] ?? 0;
  const btns = tabs.querySelectorAll('.vg-mode-tab');
  if (!btns[idx]) return;
  const tabRect  = tabs.getBoundingClientRect();
  const btnRect  = btns[idx].getBoundingClientRect();
  pill.style.width  = btnRect.width + 'px';
  pill.style.left   = (btnRect.left - tabRect.left) + 'px';
}

// ── AI source indicator ───────────────────────────────────────────────
function _vgUpdateAiSource() {
  const dot   = document.querySelector('.vg-ai-dot');
  const label = document.getElementById('vgAiSourceLabel');
  if (!dot || !label) return;
  const hasCF = typeof _hasCFWorker === 'function' && _hasCFWorker();
  const hasOR = !!(localStorage.getItem('nexora_user_key')?.startsWith('sk-or-'));
  const hasGemini = !!(localStorage.getItem('nexora_gemini_key'));
  if (hasCF) {
    dot.className = 'vg-ai-dot cf';
    label.textContent = 'CF Worker AI → OpenRouter fallback';
  } else if (hasOR) {
    dot.className = 'vg-ai-dot or';
    label.textContent = 'OpenRouter AI (free models)';
  } else if (hasGemini) {
    dot.className = 'vg-ai-dot gemini';
    label.textContent = 'Gemini AI → Pollinations fallback';
  } else {
    dot.className = 'vg-ai-dot free';
    label.textContent = 'Pollinations AI (no key needed)';
  }
}
window._vgUpdateAiSource = _vgUpdateAiSource;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE B — Grammar & Topic Reference Panel (free-form AI tutor)
// ══════════════════════════════════════════════════════════════════════

async function askIELTSGrammar() {
  const query = (document.getElementById('ieltsGrammarQuery')?.value || '').trim();
  if (!query) {
    if (typeof _showStudyToast === 'function') _showStudyToast('Enter a grammar question first');
    return;
  }

  const answerDiv = document.getElementById('ieltsGrammarAnswer');
  const btn       = document.getElementById('ieltsGrammarAskBtn');
  if (!answerDiv) return;

  answerDiv.style.display = 'block';
  answerDiv.innerHTML = '<div class="ielts-explain-loading"><span class="nb-rag-spinner"></span> Thinking…</div>';
  if (btn) btn.disabled = true;

  const sys =
    'You are an expert IELTS tutor. Answer grammar and vocabulary questions clearly. ' +
    'Structure your answer: Rule → Examples → Common mistakes → Practice tip. ' +
    'Indicate the IELTS band level where relevant (e.g., Band 6, Band 7+). ' +
    'Keep it under 250 words. No markdown headers — use plain text with line breaks.';

  try {
    const reply = await callStudyAI(sys, query);
    answerDiv.innerHTML =
      '<div class="ielts-explain-header">' +
        '<span>🤖 AI Tutor</span>' +
        '<button class="ielts-explain-close" onclick="document.getElementById(\'ieltsGrammarAnswer\').style.display=\'none\'">✕</button>' +
      '</div>' +
      '<div class="ielts-explain-body">' + _esc(reply).replace(/\n/g, '<br>') + '</div>' +
      '<button class="mcq-explain-btn" style="margin-top:8px" onclick="navigator.clipboard.writeText(' +
        JSON.stringify(reply).replace(/'/g, "\\'") +
        ').then(()=>_showStudyToast(\'Copied!\'))">📋 Copy</button>';
  } catch(e) {
    answerDiv.innerHTML = '<div class="ielts-explain-error">❌ Failed. Check your API key or try again.</div>';
  } finally {
    if (btn) btn.disabled = false;
  }
}

window.askIELTSGrammar = askIELTSGrammar;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE C — Spaced Repetition for Missed Vocabulary
// ══════════════════════════════════════════════════════════════════════

const IELTS_SRS_KEY = 'nexora_ielts_srs';

function _ieltsGetSRSCards() {
  try { return JSON.parse(localStorage.getItem(IELTS_SRS_KEY) || '[]'); }
  catch(e) { return []; }
}

function _ieltsSetSRSCards(cards) {
  try { localStorage.setItem(IELTS_SRS_KEY, JSON.stringify(cards)); }
  catch(e) {}
}

function _ieltsAddMissedToSRS(q, userChoice) {
  const cards = _ieltsGetSRSCards();
  // Avoid exact duplicates
  if (cards.some(c => c.front === q.q)) return;

  const correctOptText = (q.options || []).find(o => o.startsWith(q.correct + ')')) || '';
  cards.push({
    id:          'ielts_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    front:       q.q,
    back:        q.correct + ') ' + correctOptText.replace(/^[A-D]\)\s*/, '') +
                 (q.explanation ? '\n\n' + q.explanation : ''),
    hint:        q.explanation ? q.explanation.slice(0, 60) : '',
    tag:         'IELTS Vocab',
    interval:    1,
    ease:        2.5,
    reps:        0,
    dueDate:     Date.now(),
    mastered:    false,
    missedChoice: userChoice,
  });
  _ieltsSetSRSCards(cards);
  if (!_ieltsMcqState.missedCount) _ieltsMcqState.missedCount = 0;
  _ieltsMcqState.missedCount++;
  _ieltsRefreshSRSBadge();

  // Also push into the main SRS deck if _addSrsCard is available
  if (typeof _addSrsCard === 'function') {
    _addSrsCard(q.q, q.correct + ') ' + correctOptText.replace(/^[A-D]\)\s*/, ''), 'IELTS Vocab');
  }
}

function _ieltsUpdateSRS(card, isCorrect) {
  if (isCorrect) {
    card.reps++;
    if      (card.reps === 1) card.interval = 1;
    else if (card.reps === 2) card.interval = 3;
    else card.interval = Math.round(card.interval * (card.ease || 2.5));
    card.ease    = Math.max(1.3, (card.ease || 2.5) + 0.1);
    card.dueDate = Date.now() + card.interval * 86400000;
    if (card.reps >= 5) card.mastered = true;
  } else {
    card.reps     = Math.max(0, (card.reps || 0) - 1);
    card.interval = 1;
    card.ease     = Math.max(1.3, (card.ease || 2.5) - 0.2);
    card.dueDate  = Date.now() + 86400000;
    card.mastered = false;
  }
}

function _ieltsRefreshSRSBadge() {
  const cards = _ieltsGetSRSCards();
  const due   = cards.filter(c => !c.mastered && c.dueDate <= Date.now()).length;
  const ids   = ['ieltsSRSBadge', 'ieltsSRSBadgeCard'];
  ids.forEach(id => {
    const badge = document.getElementById(id);
    if (!badge) return;
    if (due > 0) { badge.style.display = 'inline-flex'; badge.textContent = due > 99 ? '99+' : due; }
    else badge.style.display = 'none';
  });
}

// ── SRS Review Session ────────────────────────────────────────────────

let _ieltsSRSSession = { cards: [], index: 0, correct: 0, flipped: false };

function startIELTSSRSSession() {
  const all = _ieltsGetSRSCards();
  const now = Date.now();
  const due = all.filter(c => !c.mastered && c.dueDate <= now);
  const fresh = all.filter(c => !c.mastered && c.reps === 0 && c.dueDate > now);
  const queue = [...due, ...fresh].slice(0, 20);

  if (!queue.length) {
    if (typeof _showStudyToast === 'function') _showStudyToast('🎉 No cards due — come back later!');
    return;
  }

  _ieltsSRSSession = { cards: queue, index: 0, correct: 0, flipped: false };
  _ieltsRenderSRSCard();
  document.getElementById('ieltsSRSSetup').style.display   = 'none';
  document.getElementById('ieltsSRSSession').style.display = 'block';
  document.getElementById('ieltsSRSDone').style.display    = 'none';
}

function _ieltsRenderSRSCard() {
  const { cards, index } = _ieltsSRSSession;
  const card  = cards[index];
  const total = cards.length;
  if (!card) { _ieltsFinishSRSSession(); return; }

  _ieltsSRSSession.flipped = false;

  const counterEl = document.getElementById('ieltsSRSCounter');
  const fillEl    = document.getElementById('ieltsSRSProgressFill');
  const frontEl   = document.getElementById('ieltsSRSFront');
  const backEl    = document.getElementById('ieltsSRSBack');
  const ratingEl  = document.getElementById('ieltsSRSRating');
  const flipBtn   = document.getElementById('ieltsSRSFlipBtn');

  if (counterEl) counterEl.textContent = (index + 1) + ' / ' + total;
  if (fillEl)    fillEl.style.width = Math.round((index / total) * 100) + '%';
  if (frontEl)   frontEl.textContent = card.front;
  if (backEl)    { backEl.textContent = card.back; backEl.style.display = 'none'; }
  if (ratingEl)  ratingEl.style.display = 'none';
  if (flipBtn)   flipBtn.style.display = 'block';

  // Orb reads the question side aloud
  setTimeout(() => _ieltsOrbTeach(card.front), 300);
}

function ieltsSRSFlip() {
  _ieltsSRSSession.flipped = true;
  const backEl   = document.getElementById('ieltsSRSBack');
  const ratingEl = document.getElementById('ieltsSRSRating');
  const flipBtn  = document.getElementById('ieltsSRSFlipBtn');
  if (backEl)   backEl.style.display = 'block';
  if (ratingEl) ratingEl.style.display = 'flex';
  if (flipBtn)  flipBtn.style.display = 'none';

  // Orb reads the answer aloud
  const card = _ieltsSRSSession.cards[_ieltsSRSSession.index];
  if (card) {
    setTimeout(() => _ieltsOrbTeach(card.back.replace(/\n/g, '. ')), 200);
  }
}

function ieltsSRSRate(isCorrect) {
  const { cards, index } = _ieltsSRSSession;
  const card = cards[index];
  if (!card) return;

  if (isCorrect) _ieltsSRSSession.correct++;
  _ieltsUpdateSRS(card, isCorrect);

  // Persist updated card
  const all = _ieltsGetSRSCards();
  const idx = all.findIndex(c => c.id === card.id);
  if (idx !== -1) all[idx] = card;
  _ieltsSetSRSCards(all);

  _ieltsSRSSession.index++;
  if (_ieltsSRSSession.index >= cards.length) {
    _ieltsFinishSRSSession();
  } else {
    _ieltsRenderSRSCard();
  }
}

function _ieltsFinishSRSSession() {
  const { cards, correct } = _ieltsSRSSession;
  const total = cards.length;
  const pct   = total ? Math.round((correct / total) * 100) : 0;

  document.getElementById('ieltsSRSSession').style.display = 'none';
  const doneEl = document.getElementById('ieltsSRSDone');
  if (doneEl) {
    doneEl.style.display = 'block';
    doneEl.innerHTML =
      '<div class="mcq-done-card">' +
        '<div class="mcq-done-emoji">' + (pct >= 80 ? '🎉' : '📚') + '</div>' +
        '<div class="mcq-done-score">' + correct + ' / ' + total + '</div>' +
        '<div class="mcq-done-pct">' + pct + '% recalled</div>' +
        '<div class="mcq-done-actions">' +
          '<button class="mcq-btn-primary" onclick="startIELTSSRSSession()">🔁 Review Again</button>' +
          '<button class="mcq-btn-secondary" onclick="_ieltsShowSubtab(\'mcq\')">📝 Back to Quiz</button>' +
        '</div>' +
      '</div>';
  }
  _ieltsRefreshSRSBadge();
}

window.startIELTSSRSSession = startIELTSSRSSession;
window.ieltsSRSFlip         = ieltsSRSFlip;
window.ieltsSRSRate         = ieltsSRSRate;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE D — Exam Timers (Speaking · Writing · MCQ)
// ══════════════════════════════════════════════════════════════════════

const IELTS_TIMERS = {};

const IELTS_TIMER_DEFAULTS = {
  speaking: 14 * 60,  // 14 min total (Parts 1+2+3)
  writing:  60 * 60,  // 60 min (Task 1 + Task 2)
  mcq:      10 * 60,  // 10 min for a 10-question quiz
  reading:  20 * 60,  // 20 min per passage (IELTS standard)
};

function _ieltsStartTimer(section, seconds) {
  _ieltsStopTimer(section);
  let remaining = seconds;
  const displayId = 'ieltsTimer_' + section;

  IELTS_TIMERS[section] = setInterval(() => {
    remaining--;
    const el = document.getElementById(displayId);
    if (el) {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      el.textContent = m + ':' + String(s).padStart(2, '0');
      // Preserve existing classes (vg-timer-val etc), only toggle warning/critical
      el.classList.remove('ielts-timer-warning', 'ielts-timer-critical');
      if (remaining <= 10) el.classList.add('ielts-timer-critical');
      else if (remaining <= 60) el.classList.add('ielts-timer-warning');
    }
    if (remaining <= 0) {
      _ieltsStopTimer(section);
      if (typeof _showStudyToast === 'function') _showStudyToast('⏰ Time is up for ' + section + '!');
      if (el) el.textContent = '0:00';
    }
  }, 1000);

  // Set initial display
  const el = document.getElementById(displayId);
  if (el) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    el.textContent = m + ':' + String(s).padStart(2, '0');
    el.classList.remove('ielts-timer-warning', 'ielts-timer-critical');
  }
}

function _ieltsStopTimer(section) {
  if (IELTS_TIMERS[section]) {
    clearInterval(IELTS_TIMERS[section]);
    delete IELTS_TIMERS[section];
  }
}

function ieltsToggleTimer(section) {
  if (IELTS_TIMERS[section]) {
    _ieltsStopTimer(section);
    const btn = document.getElementById('ieltsTimerBtn_' + section);
    if (btn) btn.textContent = '▶ Start Timer';
  } else {
    const customEl = document.getElementById('ieltsTimerCustom_' + section);
    const mins     = customEl ? parseInt(customEl.value, 10) : 0;
    const secs     = (mins > 0 ? mins * 60 : IELTS_TIMER_DEFAULTS[section]) || 600;
    _ieltsStartTimer(section, secs);
    const btn = document.getElementById('ieltsTimerBtn_' + section);
    if (btn) btn.textContent = '⏹ Stop Timer';
  }
}

// Auto-start MCQ timer when quiz renders — only if not already running
const _origRenderMcqQuiz = window._ieltsRenderMcqQuiz || _ieltsRenderMcqQuiz;
window._ieltsRenderMcqQuiz = function(questions) {
  _origRenderMcqQuiz(questions);
  _ieltsMcqState.missedCount = 0;
  if (!IELTS_TIMERS['mcq']) {
    const mins = parseInt(document.getElementById('ieltsTimerCustom_mcq')?.value || '0', 10);
    const secs = mins > 0 ? mins * 60 : Math.max(60, questions.length * 60);
    _ieltsStartTimer('mcq', secs);
    const btn = document.getElementById('ieltsTimerBtn_mcq');
    if (btn) btn.textContent = '⏹ Stop Timer';
  }
};

window.ieltsToggleTimer = ieltsToggleTimer;

// ── Patch initIELTSModule to wire SRS badge + grammar enter key ───────
const _origInitIELTS = window.initIELTSModule;
window.initIELTSModule = function() {
  if (typeof _origInitIELTS === 'function') _origInitIELTS();

  _ieltsRefreshSRSBadge();
  _ieltsUpdateDailyUI();
  _ieltsRefreshWrongBookBadge();

  // Init new VG UI
  setTimeout(() => {
    _vgUpdateAiSource();
  }, 100);

  // Grammar panel enter key
  const grammarInput = document.getElementById('ieltsGrammarQuery');
  if (grammarInput) {
    grammarInput.addEventListener('keypress', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        askIELTSGrammar();
      }
    });
  }

  // Writing timer auto-start on prompt load — only if timer not already running
  const origLoadPrompt = window.ieltsLoadWritingPrompt;
  window.ieltsLoadWritingPrompt = function() {
    origLoadPrompt();
    if (!IELTS_TIMERS['writing']) {
      const task = parseInt(document.getElementById('ieltsWritingTask')?.value || '2', 10);
      _ieltsStartTimer('writing', task === 1 ? 20 * 60 : 40 * 60);
      const btn = document.getElementById('ieltsTimerBtn_writing');
      if (btn) btn.textContent = '⏹ Stop Timer';
    }
  };
};

// ══════════════════════════════════════════════════════════════════════
//  FEATURE — IDLE INTRO CONVERSATION
//  Nexora introduces herself, learns the candidate's name,
//  asks 1-3 friendly warm-up questions, then starts the real test.
//
//  Flow:
//    intro   → Nexora speaks her intro, asks for name
//    name    → Listens for name via STT, responds warmly
//    warmup  → 1 friendly small-talk question before the real test
//    ready   → Nexora announces the test is starting
// ══════════════════════════════════════════════════════════════════════

function _ieltsRunIntroConversation() {
  _ieltsIntroState.active        = true;
  _ieltsIntroState.phase         = 'name';
  _ieltsIntroState.warmupQIndex  = 0;
  _ieltsIntroState.candidateName = localStorage.getItem(IELTS_NAME_KEY) || '';

  // Show the speaking session UI immediately so the orb / panels are visible
  document.getElementById('speakingSetup').style.display   = 'none';
  document.getElementById('speakingSession').style.display = 'block';
  document.getElementById('speakingResults').style.display = 'none';

  // Engage orb visually
  _ieltsOrbDodgeMode(true);
  if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('speaking');

  const progEl = document.getElementById('speakingProgress');
  if (progEl) progEl.textContent = 'Nexora · IELTS AI Examiner';

  // If name already saved, skip warmup entirely — go straight to the real test
  if (_ieltsIntroState.candidateName) {
    const qEl = document.getElementById('speakingQuestion');
    if (qEl) qEl.textContent =
      'Welcome back, ' + _ieltsIntroState.candidateName + '! Ready for today\'s practice?';

    _ieltsOrbTeach(
      'Welcome back, ' + _ieltsIntroState.candidateName + '! Ready for today\'s practice?',
      { onEnd: () => {
          if (qEl) qEl.textContent = '';
          _ieltsBeginRealTest();
        }
      }
    );
    return;
  }

  // New user — speak intro then open mic only after TTS finishes (Bug 1 fix)
  const introText =
    "Hello! I'm Nexora, your IELTS tutor. Before we begin, may I ask — what is your name?";
  _ieltsOrbTeach(introText, { onEnd: () => _ieltsStartNameCapture() });
}

/** Inline name-input fallback — replaces all prompt() calls for name capture */
function _ieltsShowNameInputFallback() {
  _ieltsSetVADStatus('off');
  const qEl = document.getElementById('speakingQuestion');
  if (qEl) {
    qEl.innerHTML =
      '<span style="display:block;margin-bottom:8px">Please type your name:</span>' +
      '<input id="ieltsNameFallbackInput" type="text" placeholder="Your name" ' +
        'style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid #555;' +
        'background:#1a1a2e;color:#fff;font-size:16px;box-sizing:border-box">' +
      '<button onclick="window._ieltsSubmitNameFallback()" ' +
        'style="margin-top:8px;padding:8px 20px;border-radius:8px;background:#7c3aed;' +
        'color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:600">Confirm</button>';
    // Focus the input after render
    requestAnimationFrame(() => {
      const inp = document.getElementById('ieltsNameFallbackInput');
      if (inp) {
        inp.focus();
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') window._ieltsSubmitNameFallback();
        });
      }
    });
  }
  window._ieltsSubmitNameFallback = () => {
    const raw = (document.getElementById('ieltsNameFallbackInput')?.value || '').trim();
    // Strip anything that isn't letters, spaces, hyphens, apostrophes — prevents XSS via localStorage
    const safe = raw.replace(/[^a-zA-Z\s'\-]/g, '').trim().slice(0, 50);
    _ieltsSaveCandidateName(safe || 'there');
  };
}

/** Dedicated one-shot name listener — isolated from the VAD answer buffer */
function _ieltsStartNameCapture() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // No mic support — show inline input instead of blocking prompt()
  if (!SR) {
    _ieltsShowNameInputFallback();
    return;
  }

  const rec = new SR();
  rec.continuous     = false;
  rec.interimResults = false;
  rec.lang           = 'en-US';
  _ieltsIntroState.recognition = rec;

  if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('listening');

  // Show mic-active hint in the transcript area (Bug 5 fix)
  _ieltsSetVADStatus('listening');
  const nameTA = document.getElementById('speakingAnswerInput');
  if (nameTA) nameTA.placeholder = 'Say your name now…';

  let nameAnswered = false;

  rec.onresult = (e) => {
    nameAnswered = true;
    let raw = e.results[0][0].transcript.trim();

    // Strip common prefixes: "My name is John", "I am Sarah", "It's Alex"
    raw = raw
      .replace(/^(my name is|i am|i'm|it's|its|call me)\s+/i, '')
      .replace(/[.,!?]$/, '')
      .trim();

    // Capitalise first letter of each word, then sanitize (same rules as fallback input)
    const name = raw
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/[^a-zA-Z\s'\-]/g, '')
      .trim()
      .slice(0, 50);
    _ieltsSaveCandidateName(name);
  };

  rec.onerror = (e) => {
    if (!nameAnswered) {
      nameAnswered = true;
      if (e.error === 'not-allowed') {
        // Mic permanently blocked — show inline input, not a prompt
        _ieltsShowNameInputFallback();
      } else {
        _ieltsShowNameInputFallback();
      }
    }
  };

  rec.onend = () => {
    if (!nameAnswered) {
      nameAnswered = true;
      _ieltsShowNameInputFallback();
    }
  };

  try { rec.start(); } catch(e) {
    _ieltsShowNameInputFallback();
  }
}

function _ieltsSaveCandidateName(name) {
  _ieltsIntroState.phase         = 'warmup';
  _ieltsIntroState.candidateName = name || 'there';
  if (name) localStorage.setItem(IELTS_NAME_KEY, name);

  // Reset the mic hint set during name capture (Bug 5 fix)
  _ieltsSetVADStatus('off');
  const nameTA = document.getElementById('speakingAnswerInput');
  if (nameTA) nameTA.placeholder = 'Your speech will appear here automatically as you speak…';

  const response =
    'What a lovely name, ' + _ieltsIntroState.candidateName +
    "! It's wonderful to meet you. Let me ask you one quick warm-up question before we start.";
  _ieltsOrbTeach(response, { onEnd: () => _ieltsIntroRunWarmup() });
}

/** Phase-aware warm-up runner — drives through all IELTS_WARMUP_QUESTIONS */
function _ieltsIntroRunWarmup() {
  const idx = _ieltsIntroState.warmupQIndex;

  if (idx >= IELTS_WARMUP_QUESTIONS.length) {
    // All warm-up done — move to real test
    _ieltsIntroState.active = false;
    _ieltsIntroState.phase  = 'ready';
    const readyMsg =
      'Excellent! You sound very well prepared, ' +
      _ieltsIntroState.candidateName +
      '. Let\'s begin your IELTS speaking test now. Good luck!';
    _ieltsOrbTeach(readyMsg, { onEnd: () => _ieltsBeginRealTest() });
    return;
  }

  _ieltsIntroState.phase = 'warmup';
  const q = IELTS_WARMUP_QUESTIONS[idx];

  const qEl = document.getElementById('speakingQuestion');
  if (qEl) qEl.textContent = q;

  // Open mic only after TTS finishes reading the question (Bug 1 fix)
  _ieltsOrbTeach(q, { onEnd: () => _ieltsListenForWarmupAnswer() });
}

function _ieltsListenForWarmupAnswer() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    // No mic — just advance after a pause
    setTimeout(() => {
      _ieltsIntroState.warmupQIndex++;
      _ieltsIntroRunWarmup();
    }, 5000);
    return;
  }

  const rec = new SR();
  rec.continuous     = false;
  rec.interimResults = false;
  rec.lang           = 'en-US';

  let answered = false;

  rec.onresult = () => {
    answered = true;
    if (_ieltsIntroState._warmupSafetyTimer) {
      clearTimeout(_ieltsIntroState._warmupSafetyTimer);
      _ieltsIntroState._warmupSafetyTimer = null;
    }
    rec.stop();
    _ieltsIntroState.warmupQIndex++;
    setTimeout(() => _ieltsIntroRunWarmup(), 1200);
  };

  rec.onerror = () => {
    if (!answered) {
      answered = true;
      _ieltsIntroState.warmupQIndex++;
      _ieltsIntroRunWarmup();
    }
  };

  rec.onend = () => {
    if (!answered) {
      answered = true;
      _ieltsIntroState.warmupQIndex++;
      setTimeout(() => _ieltsIntroRunWarmup(), 800);
    }
  };

  try { rec.start(); } catch(e) {
    _ieltsIntroState.warmupQIndex++;
    setTimeout(() => _ieltsIntroRunWarmup(), 3000);
  }

  // Safety timeout — if user stays silent for 8s, move on
  _ieltsIntroState._warmupSafetyTimer = setTimeout(() => {
    if (!answered) {
      try { rec.stop(); } catch(e) {}
    }
  }, 8000);
}

// ── Name persistence helpers ──────────────────────────────────────────
function _ieltsGetCandidateName() {
  try { return localStorage.getItem(IELTS_NAME_KEY) || ''; } catch(e) { return ''; }
}

// Reset known name (for testing / fresh start)
window.ieltsForgetName = function() {
  try { localStorage.removeItem(IELTS_NAME_KEY); } catch(e) {}
  if (typeof _showStudyToast === 'function') _showStudyToast('Name reset — Nexora will introduce herself again.');
};

// ── Async wrapper for _ieltsOrbTeach ─────────────────────────────────
function _ieltsOrbTeachAsync(text) {
  return new Promise(resolve => {
    _ieltsOrbTeach(text, { onEnd: resolve });
    // Safety: resolve after 12 seconds max regardless of TTS
    setTimeout(resolve, 12_000);
  });
}

function _sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

window._ieltsRunIntroConversation = _ieltsRunIntroConversation;
window._ieltsBeginRealTest        = _ieltsBeginRealTest;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE — PRONUNCIATION CHALLENGE
//  Shows a word, its IPA phonetic, a tip, then listens to the
//  candidate say it. Scores using Levenshtein similarity on the
//  STT transcript vs the target word.
//
//  Usage: call startIELTSPronChallenge() from a button in your HTML
//  Container HTML id: ieltsPronSection
// ══════════════════════════════════════════════════════════════════════

function startIELTSPronChallenge() {
  const words = [...IELTS_PRON_WORDS].sort(() => Math.random() - 0.5).slice(0, 6);
  _ieltsPronState = { active: true, wordIndex: 0, words, scores: [], recognition: null };
  _ieltsPronRenderCard();
}

function _ieltsPronRenderCard() {
  const container = document.getElementById('ieltsPronSection');
  if (!container) return;

  const { words, wordIndex, scores } = _ieltsPronState;
  if (wordIndex >= words.length) {
    _ieltsPronShowResults();
    return;
  }

  const item      = words[wordIndex];
  const progress  = `${wordIndex + 1} / ${words.length}`;
  const scoredPct = Math.round(((scores.reduce((a,b) => a+b, 0)) / Math.max(scores.length, 1)) * 100);

  container.innerHTML =
    '<div class="pron-card">' +
      '<div class="pron-progress">' + progress + '</div>' +
      '<div class="pron-word">' + _esc(item.word) + '</div>' +
      '<div class="pron-phonetic">' + _esc(item.phonetic) + '</div>' +
      '<div class="pron-tip">💡 ' + _esc(item.tip) + '</div>' +
      '<div class="pron-actions">' +
        '<button class="ielts-orb-speak-btn" onclick="_ieltsPronHearWord()">🔊 Hear it</button>' +
        '<button class="mcq-btn-primary" onclick="_ieltsPronListen()" id="pronListenBtn">🎤 Say it</button>' +
      '</div>' +
      '<div id="pronFeedback" style="margin-top:12px"></div>' +
    '</div>';
}

function _ieltsPronHearWord() {
  const item = _ieltsPronState.words[_ieltsPronState.wordIndex];
  if (!item) return;
  _ieltsOrbTeach(item.word + '. ' + item.tip);
}

function _ieltsPronListen() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const fbDiv = document.getElementById('pronFeedback');
  const btn   = document.getElementById('pronListenBtn');
  const item  = _ieltsPronState.words[_ieltsPronState.wordIndex];

  if (!SR) {
    if (fbDiv) fbDiv.innerHTML = '<div class="pron-no-mic">⚠️ Your browser does not support Speech Recognition. Try Chrome or Edge.</div>';
    return;
  }

  if (btn) { btn.textContent = '⏹ Listening…'; btn.disabled = true; }
  if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('listening');

  const rec = new SR();
  rec.lang           = 'en-US';
  rec.continuous     = false;
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  _ieltsPronState.recognition = rec;

  rec.onresult = (e) => {
    const transcripts = [];
    for (let i = 0; i < e.results[0].length; i++) {
      transcripts.push(e.results[0][i].transcript.trim().toLowerCase());
    }
    const target  = item.word.toLowerCase();
    // Score: best match across all alternatives
    const score   = Math.max(...transcripts.map(t => _ieltsPronScore(t, target)));
    _ieltsPronState.scores.push(score);
    _ieltsPronShowWordFeedback(item, transcripts[0], score);
  };

  rec.onend = () => {
    if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('idle');
    if (btn) { btn.textContent = '🎤 Say it'; btn.disabled = false; }
  };

  rec.onerror = () => {
    if (fbDiv) fbDiv.innerHTML = '<div class="pron-no-mic">❌ Could not hear you. Check your microphone and try again.</div>';
    if (typeof window._nexoraOrbState === 'function') window._nexoraOrbState('idle');
    if (btn) { btn.textContent = '🎤 Say it'; btn.disabled = false; }
  };

  try { rec.start(); } catch(ex) {
    if (fbDiv) fbDiv.innerHTML = '<div class="pron-no-mic">❌ Microphone error. Please allow microphone access.</div>';
  }
}

function _ieltsPronShowWordFeedback(item, heard, score) {
  const fbDiv  = document.getElementById('pronFeedback');
  const pct    = Math.round(score * 100);
  const color  = pct >= 80 ? '#10b981' : pct >= 55 ? '#f59e0b' : '#ef4444';
  const label  = pct >= 80 ? 'Excellent!' : pct >= 55 ? 'Good try — keep practising!' : 'Keep going — you\'ll get it!';
  const speech = pct >= 80
    ? 'Excellent pronunciation! ' + item.word + ' — well done!'
    : 'Good effort! You said ' + heard + '. The correct pronunciation is ' + item.word + '. ' + item.tip;

  _ieltsOrbTeach(speech);

  if (fbDiv) {
    fbDiv.innerHTML =
      '<div class="pron-result" style="border-color:' + color + '">' +
        '<div class="pron-heard">You said: <strong>' + _esc(heard) + '</strong></div>' +
        '<div class="pron-score" style="color:' + color + '">' + pct + '% — ' + label + '</div>' +
        '<div class="pron-bar-wrap"><div class="pron-bar" style="width:' + pct + '%;background:' + color + '"></div></div>' +
        '<button class="mcq-btn-primary" style="margin-top:10px" onclick="_ieltsPronNext()">Next word →</button>' +
      '</div>';
  }
}

function _ieltsPronNext() {
  _ieltsPronState.wordIndex++;
  _ieltsPronRenderCard();
}

function _ieltsPronShowResults() {
  const container = document.getElementById('ieltsPronSection');
  if (!container) return;

  const scores = _ieltsPronState.scores;
  const avg    = scores.length ? scores.reduce((a,b) => a+b, 0) / scores.length : 0;
  const pct    = Math.round(avg * 100);
  const emoji  = pct >= 80 ? '🎉' : pct >= 55 ? '📚' : '💪';
  const msg    = pct >= 80 ? 'Outstanding pronunciation work!' : pct >= 55 ? 'Good effort — keep practising!' : 'Don\'t give up — pronunciation takes time!';

  container.innerHTML =
    '<div class="pron-done-card">' +
      '<div class="pron-done-emoji">' + emoji + '</div>' +
      '<div class="pron-done-score">' + pct + '% average accuracy</div>' +
      '<div class="pron-done-msg">' + _esc(msg) + '</div>' +
      '<button class="mcq-btn-primary" onclick="startIELTSPronChallenge()" style="margin-top:14px">🔁 New Challenge</button>' +
    '</div>';

  _ieltsOrbTeach(msg + ' Your average pronunciation accuracy was ' + pct + ' percent.');
}

/** Levenshtein-based similarity score 0–1 */
function _ieltsPronScore(heard, target) {
  // Exact or contains match
  if (heard === target) return 1;
  if (heard.includes(target) || target.includes(heard)) return 0.85;

  // Levenshtein distance
  const a = heard, b = target;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  const dist = dp[m][n];
  return Math.max(0, 1 - dist / Math.max(m, n));
}

window.startIELTSPronChallenge = startIELTSPronChallenge;
window._ieltsPronHearWord       = _ieltsPronHearWord;
window._ieltsPronListen         = _ieltsPronListen;
window._ieltsPronNext           = _ieltsPronNext;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE — IDIOM OF THE DAY
//  Nexora teaches one new IELTS-relevant idiom or expression each day,
//  speaks it aloud, and gives an example sentence.
//  Rotates through the bank — one per calendar day.
// ══════════════════════════════════════════════════════════════════════

const IELTS_IDIOMS = [
  { idiom: 'A double-edged sword', meaning: 'Something with both advantages and disadvantages', example: 'Social media is a double-edged sword — it connects people but also spreads misinformation.' },
  { idiom: 'Hit the nail on the head', meaning: 'To describe exactly what is causing a situation or problem', example: 'When the candidate said education funding is the root issue, they hit the nail on the head.' },
  { idiom: 'A blessing in disguise', meaning: 'Something that seems bad but turns out to be good', example: 'Losing that job was a blessing in disguise — it led me to a much better career.' },
  { idiom: 'Burning the midnight oil', meaning: 'Working or studying late into the night', example: 'Many IELTS candidates burn the midnight oil in the weeks before their exam.' },
  { idiom: 'The tip of the iceberg', meaning: 'A small part of a much larger problem', example: 'The increase in carbon emissions is just the tip of the iceberg of our environmental crisis.' },
  { idiom: 'On the fence', meaning: 'Unable to decide between two options', example: 'Many voters are still on the fence about which policy to support.' },
  { idiom: 'Cut corners', meaning: 'To do something the easy way, often at the expense of quality', example: 'Companies that cut corners on safety risk serious consequences.' },
  { idiom: 'The ball is in your court', meaning: 'It is up to you to take action or make a decision', example: 'The government has set the framework — now the ball is in the private sector\'s court.' },
  { idiom: 'Bite the bullet', meaning: 'To endure a difficult or painful situation', example: 'Sometimes you have to bite the bullet and tackle the hardest essay question first.' },
  { idiom: 'Burn bridges', meaning: 'To permanently damage a relationship', example: 'Leaving a job without proper notice can burn bridges with future employers.' },
  { idiom: 'Throw light on', meaning: 'To explain or clarify something', example: 'Recent research throws new light on the causes of urban poverty.' },
  { idiom: 'A stepping stone', meaning: 'Something that helps you achieve something else in the future', example: 'Passing IELTS is often a stepping stone to studying abroad.' },
  { idiom: 'Turn a blind eye', meaning: 'To choose to ignore something you know is wrong', example: 'Governments should not turn a blind eye to rising inequality.' },
  { idiom: 'Spill the beans', meaning: 'To reveal information that was supposed to be kept secret', example: 'Although useful as an idiom, avoid this in formal IELTS writing — use "reveal" instead.' },
  { idiom: 'Keep something at bay', meaning: 'To prevent something unwanted from becoming a problem', example: 'Vaccination programmes help keep diseases at bay in developing countries.' },
];

function _ieltsGetIdiomOfDay() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86_400_000);
  return IELTS_IDIOMS[dayOfYear % IELTS_IDIOMS.length];
}

function renderIeltsIdiomOfDay() {
  const container = document.getElementById('ieltsIdiomOfDay');
  if (!container) return;

  const item = _ieltsGetIdiomOfDay();
  container.innerHTML =
    '<div class="idiom-card">' +
      '<div class="idiom-label">🗣 Idiom of the Day</div>' +
      '<div class="idiom-phrase">' + _esc(item.idiom) + '</div>' +
      '<div class="idiom-meaning">' + _esc(item.meaning) + '</div>' +
      '<div class="idiom-example"><em>"' + _esc(item.example) + '"</em></div>' +
      '<button class="ielts-orb-speak-btn" style="margin-top:8px" onclick="_ieltsOrbSpeakIdiom()">🔊 Hear it</button>' +
    '</div>';
}

function _ieltsOrbSpeakIdiom() {
  const item = _ieltsGetIdiomOfDay();
  const text = `Today's idiom: ${item.idiom}. Meaning: ${item.meaning}. Example: ${item.example}`;
  _ieltsOrbTeach(text);
}

window.renderIeltsIdiomOfDay = renderIeltsIdiomOfDay;
window._ieltsOrbSpeakIdiom  = _ieltsOrbSpeakIdiom;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE — DAILY IELTS TIP (rotates every day)
//  Nexora delivers a band-improvement tip from a curated bank.
// ══════════════════════════════════════════════════════════════════════

const IELTS_DAILY_TIPS = [
  { tip: 'Use discourse markers', detail: 'Words like "furthermore", "nevertheless", and "consequently" signal a Band 7+ speaker. Practise weaving them in naturally.' },
  { tip: 'Extend your answers', detail: 'In Part 1, never give one-word answers. Always add a reason, example, or comparison. Aim for 3–5 sentences per answer.' },
  { tip: 'Avoid filler words', detail: 'Replace "umm", "like", and "you know" with a short thinking pause or phrases like "That\'s an interesting question…".' },
  { tip: 'Paraphrase the question', detail: 'In Part 3, restate the question in your own words before answering. This shows lexical range and buys you thinking time.' },
  { tip: 'Use conditionals', detail: '"If the government were to invest more in renewable energy, the long-term benefits would be substantial." Third conditional = Band 7+.' },
  { tip: 'Learn topic vocabulary', detail: 'Pick one IELTS topic (education, environment, technology) and learn 8–10 topic-specific words for it each week.' },
  { tip: 'Record yourself', detail: 'Record your Part 2 answers and listen back. You will immediately notice fluency issues, repetition, and pronunciation errors.' },
  { tip: 'Vary sentence length', detail: 'Mix short punchy sentences with longer complex ones. "Crime is rising. However, the causes are complex and multifaceted." — that contrast scores well.' },
  { tip: 'Avoid memorised answers', detail: 'Examiners can tell when answers are rehearsed. Stay flexible — know your topics but respond naturally to the actual question asked.' },
  { tip: 'Use the full 1 minute for Part 2', detail: 'You have 1 minute to prepare. Use the bullet points on the card as a structure: say something about all 4 points.' },
];

function renderIeltsDailyTip() {
  const container = document.getElementById('ieltsDailyTip');
  if (!container) return;

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86_400_000);
  const item = IELTS_DAILY_TIPS[dayOfYear % IELTS_DAILY_TIPS.length];

  container.innerHTML =
    '<div class="daily-tip-card">' +
      '<div class="daily-tip-label">💡 Nexora\'s Tip of the Day</div>' +
      '<div class="daily-tip-title">' + _esc(item.tip) + '</div>' +
      '<div class="daily-tip-detail">' + _esc(item.detail) + '</div>' +
      '<button class="ielts-orb-speak-btn" style="margin-top:8px" onclick="_ieltsOrbSpeakTip()">🔊 Hear it</button>' +
    '</div>';
}

function _ieltsOrbSpeakTip() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86_400_000);
  const item = IELTS_DAILY_TIPS[dayOfYear % IELTS_DAILY_TIPS.length];
  _ieltsOrbTeach(`Nexora's tip of the day: ${item.tip}. ${item.detail}`);
}

window.renderIeltsDailyTip  = renderIeltsDailyTip;
window._ieltsOrbSpeakTip    = _ieltsOrbSpeakTip;

// ══════════════════════════════════════════════════════════════════════
//  FEATURE — ANSWER REPHRASE ASSISTANT
//  After any speaking answer is submitted, Nexora offers a
//  band-improved rephrasing of one weak sentence in the candidate's
//  answer using free AI.
// ══════════════════════════════════════════════════════════════════════

async function ieltsRephraseAnswer(answer, question) {
  const container = document.getElementById('ieltsRephrasePanel');
  if (!container) return;

  container.style.display = 'block';
  container.innerHTML = '<div class="ielts-explain-loading"><span class="nb-rag-spinner"></span> Nexora is finding a stronger phrasing…</div>';

  const sys =
    'You are Nexora, an IELTS speaking coach. The candidate just gave an answer. ' +
    'Pick ONE sentence from their answer that could be improved for a higher band score. ' +
    'Rewrite it to target Band 7–8. Format your response EXACTLY as: ' +
    'ORIGINAL: <the original sentence> | IMPROVED: <the improved version> | WHY: <one sentence explaining the improvement>';

  const usr = `Question: ${question}\n\nCandidate answer: ${answer}`;

  try {
    const raw    = await callStudyAI(sys, usr);
    const origM  = raw.match(/ORIGINAL:\s*(.+?)(?:\||$)/i);
    const impM   = raw.match(/IMPROVED:\s*(.+?)(?:\||$)/i);
    const whyM   = raw.match(/WHY:\s*(.+?)(?:\||$)/i);

    const orig = origM?.[1]?.trim() || '';
    const imp  = impM?.[1]?.trim() || '';
    const why  = whyM?.[1]?.trim() || '';

    if (!orig && !imp) throw new Error('parse failed');

    const speech = imp ? `Here is a stronger way to say it: ${imp}. ${why}` : raw;
    _ieltsOrbTeach(speech);

    container.innerHTML =
      '<div class="rephrase-card">' +
        '<div class="rephrase-label">✨ Nexora\'s Stronger Phrasing</div>' +
        (orig ? '<div class="rephrase-original">❌ Original: <em>' + _esc(orig) + '</em></div>' : '') +
        (imp  ? '<div class="rephrase-improved">✅ Improved: <strong>' + _esc(imp) + '</strong></div>' : '') +
        (why  ? '<div class="rephrase-why">💡 ' + _esc(why) + '</div>' : '') +
        '<div style="display:flex;gap:6px;margin-top:8px">' +
          '<button class="ielts-orb-speak-btn" onclick="_ieltsOrbTeach(' + JSON.stringify(speech).replace(/</g,'\\u003c') + ')">🔊 Hear improved</button>' +
          '<button class="ielts-explain-close" onclick="document.getElementById(\'ieltsRephrasePanel\').style.display=\'none\'">✕ Close</button>' +
        '</div>' +
      '</div>';

    // Band 8–9 synonym suggestions
    if (typeof window._ieltsGetSynonymSuggestions === 'function') {
      const synonyms = window._ieltsGetSynonymSuggestions(answer);
      if (synonyms.length) {
        container.innerHTML +=
          '<div class="rephrase-card" style="margin-top:8px">' +
            '<div class="rephrase-label">💡 Band 8–9 Word Swaps</div>' +
            synonyms.map(s => '<div style="font-size:13px;padding:4px 0;color:var(--text2)">' + _esc(s) + '</div>').join('') +
          '</div>';
      }
    }
  } catch(e) {
    container.innerHTML =
      '<div class="rephrase-card"><div class="rephrase-label">✨ Nexora\'s tip</div>' +
        '<div style="padding:10px;color:var(--text3);font-size:13px">Free AI is temporarily unavailable. Try again in a moment.</div>' +
        '<button class="ielts-explain-close" onclick="document.getElementById(\'ieltsRephrasePanel\').style.display=\'none\'">✕ Close</button>' +
      '</div>';
  }
}

window.ieltsRephraseAnswer = ieltsRephraseAnswer;

// ── Auto-inject "Rephrase my answer" button into speaking feedback ─────
// Patches submitSpeakingAnswer to add the rephrase button after scoring
const _origSubmitSpeaking = window.submitSpeakingAnswer;
window.submitSpeakingAnswer = async function() {
  await _origSubmitSpeaking();
  // After feedback renders, inject the rephrase button
  const fbDiv = document.getElementById('speakingFeedback');
  if (fbDiv && !document.getElementById('ieltsRephraseBtn')) {
    const answer   = document.getElementById('speakingAnswerInput')?.value || '';
    const question = _ieltsState.questions[_ieltsState.qIndex] || '';
    const btn      = document.createElement('button');
    btn.id         = 'ieltsRephraseBtn';
    btn.className  = 'ielts-orb-speak-btn';
    btn.style.cssText = 'margin-top:10px;width:100%';
    btn.innerHTML  = '✨ Show me a stronger phrasing';
    btn.onclick    = () => { btn.style.display = 'none'; ieltsRephraseAnswer(answer, question); };
    fbDiv.appendChild(btn);

    // Inject the rephrase result panel below the feedback
    if (!document.getElementById('ieltsRephrasePanel')) {
      const panel = document.createElement('div');
      panel.id    = 'ieltsRephrasePanel';
      panel.style.display = 'none';
      fbDiv.after(panel);
    }
  }
};

// ── Auto-render idiom + tip on IELTS module init ──────────────────────
const _origInitIELTSFinal = window.initIELTSModule;
window.initIELTSModule = function() {
  if (typeof _origInitIELTSFinal === 'function') _origInitIELTSFinal();
  renderIeltsIdiomOfDay();
  renderIeltsDailyTip();
};

// ══════════════════════════════════════════════════════════════════════
//  200 NEW QUESTIONS — pushed into existing banks
// ══════════════════════════════════════════════════════════════════════

// ── 80 New VOCABULARY MCQs ────────────────────────────────────────────
IELTS_MCQ_BANK.vocab.push(
  { q: "Which word describes a person who speaks many languages?", options: ["A) Polyglot", "B) Prologue", "C) Paradigm", "D) Protagonist"], correct: "A", explanation: "A polyglot is a person who knows and uses several languages. Vital IELTS Band 7+ word." },
  { q: "The word 'Exemplary' most closely means:", options: ["A) Mediocre", "B) Serving as a desirable model", "C) Simple and basic", "D) Experimental"], correct: "B", explanation: "Exemplary means representing the best of its kind — ideal for academic writing." },
  { q: "The word 'Ambiguous' means:", options: ["A) Absolutely clear", "B) Open to more than one interpretation", "C) Completely false", "D) Strongly argued"], correct: "B", explanation: "Ambiguous describes something that can be understood in more than one way." },
  { q: "To 'Corroborate' a claim means to:", options: ["A) Deny it", "B) Question it", "C) Confirm it with evidence", "D) Simplify it"], correct: "C", explanation: "Corroborate means to strengthen or confirm with additional evidence." },
  { q: "Choose the correct meaning of 'Plausible':", options: ["A) Impossible", "B) Seeming reasonable or probable", "C) Completely proven", "D) Confusing"], correct: "B", explanation: "Plausible means something that seems likely or believable." },
  { q: "Which word is a synonym for 'Detrimental'?", options: ["A) Beneficial", "B) Neutral", "C) Harmful", "D) Significant"], correct: "C", explanation: "Detrimental means causing harm or damage — a key IELTS academic word." },
  { q: "To 'Concede' a point in an argument means to:", options: ["A) Ignore it", "B) Admit it is valid", "C) Repeat it", "D) Disprove it"], correct: "B", explanation: "Concede means to acknowledge or admit something, often reluctantly." },
  { q: "The word 'Proliferate' means:", options: ["A) To decrease rapidly", "B) To increase rapidly in number", "C) To remain stable", "D) To destroy completely"], correct: "B", explanation: "Proliferate means to reproduce or grow rapidly — common in academic texts." },
  { q: "A 'Lucid' explanation is one that is:", options: ["A) Confusing", "B) Long", "C) Clearly expressed", "D) Technical"], correct: "C", explanation: "Lucid means expressed clearly and easy to understand." },
  { q: "To 'Scrutinise' something means to:", options: ["A) Ignore it", "B) Examine it very carefully", "C) Approve it quickly", "D) Summarise it"], correct: "B", explanation: "Scrutinise means to examine or inspect closely and thoroughly." },
  { q: "A 'Contentious' issue is one that:", options: ["A) Everyone agrees on", "B) Has been resolved", "C) Causes disagreement or controversy", "D) Is unimportant"], correct: "C", explanation: "Contentious means causing or likely to cause an argument." },
  { q: "To 'Advocate' for a policy means to:", options: ["A) Oppose it strongly", "B) Publicly support or recommend it", "C) Study it carefully", "D) Ignore it"], correct: "B", explanation: "Advocate (verb) means to publicly recommend or support a cause or policy." },
  { q: "The word 'Diminish' most closely means:", options: ["A) To grow larger", "B) To become smaller or less", "C) To stay the same", "D) To destroy completely"], correct: "B", explanation: "Diminish means to make or become less, smaller, or less important." },
  { q: "Which sentence uses 'Spontaneous' correctly?", options: ["A) The decision was spontaneous and well-planned.", "B) She made a spontaneous decision to travel to Paris.", "C) The spontaneous project took five years to complete.", "D) He gave a spontaneous speech he had memorised."], correct: "B", explanation: "Spontaneous means done naturally, without planning — an impulsive decision." },
  { q: "A 'Coherent' argument is one that is:", options: ["A) Emotional", "B) Long", "C) Logical and well-connected", "D) Aggressive"], correct: "C", explanation: "Coherent means logical and consistent — a key IELTS writing criterion." },
  { q: "The word 'Disparity' means:", options: ["A) Equality between groups", "B) A great difference", "C) A small similarity", "D) A legal dispute"], correct: "B", explanation: "Disparity refers to a noticeable and often unfair difference between things." },
  { q: "A 'Tangible' benefit is one that is:", options: ["A) Abstract and unclear", "B) Impossible to measure", "C) Real and able to be touched or clearly seen", "D) Theoretical"], correct: "C", explanation: "Tangible means perceptible by touch or clearly real and definite." },
  { q: "To 'Undermine' someone's authority means to:", options: ["A) Support it fully", "B) Gradually weaken or damage it", "C) Increase it", "D) Transfer it"], correct: "B", explanation: "Undermine means to erode or weaken something gradually." },
  { q: "The word 'Prevalent' means:", options: ["A) Rare and unusual", "B) Widely spread and common", "C) Old-fashioned", "D) Dangerous"], correct: "B", explanation: "Prevalent means widespread in a particular area or at a particular time." },
  { q: "To 'Alleviate' poverty means to:", options: ["A) Worsen it", "B) Study it", "C) Make it less severe", "D) Ignore it"], correct: "C", explanation: "Alleviate means to make suffering, deficiency, or a problem less severe." },
  { q: "An environment 'Conducive' to learning is one that:", options: ["A) Makes learning harder", "B) Has no effect on learning", "C) Promotes and helps learning", "D) Discourages learning"], correct: "C", explanation: "Conducive means contributing to or helping bring about a result." },
  { q: "A 'Paradox' is:", options: ["A) A straightforward fact", "B) A statement that seems contradictory but may be true", "C) A type of argument", "D) A grammatical error"], correct: "B", explanation: "A paradox is a seemingly absurd or self-contradictory statement that may be true." },
  { q: "The word 'Notion' most closely means:", options: ["A) A physical object", "B) A scientific law", "C) A concept or idea", "D) A strong emotion"], correct: "C", explanation: "Notion means a concept or belief — frequently used in academic arguments." },
  { q: "An 'Empirical' approach to research relies on:", options: ["A) Theory and guesswork", "B) Observation and evidence", "C) Personal opinion", "D) Historical records only"], correct: "B", explanation: "Empirical means based on observation or experience rather than theory." },
  { q: "If a plan is 'Feasible', it is:", options: ["A) Impossible", "B) Expensive", "C) Possible and practical", "D) Already completed"], correct: "C", explanation: "Feasible means possible to do easily or conveniently." },
  { q: "When a worker is made 'Redundant', they:", options: ["A) Get a promotion", "B) Lose their job because it is no longer needed", "C) Work extra hours", "D) Transfer to another department"], correct: "B", explanation: "Redundant (UK English) means no longer needed — commonly used in employment contexts." },
  { q: "Choose the correct collocation: 'There has been a __ improvement in air quality.'", options: ["A) big", "B) large", "C) substantial", "D) tall"], correct: "C", explanation: "Substantial improvement is the correct academic collocation (not 'big improvement')." },
  { q: "A 'Rigorous' study is one that is:", options: ["A) Careless", "B) Short", "C) Thorough and strict", "D) Outdated"], correct: "C", explanation: "Rigorous means extremely thorough and careful — used to describe quality research." },
  { q: "An 'Unprecedented' event is one that:", options: ["A) Has happened many times before", "B) Was expected", "C) Has never happened before", "D) Was planned in advance"], correct: "C", explanation: "Unprecedented means never done or known before." },
  { q: "Choose the word that best completes: 'The city has a __ range of cultural traditions.'", options: ["A) narrow", "B) same", "C) diverse", "D) little"], correct: "C", explanation: "Diverse means showing a great deal of variety — ideal for IELTS writing on society." },
  { q: "To 'Culminate' in something means:", options: ["A) To begin something", "B) To reach the highest point or final result", "C) To avoid something", "D) To repeat something"], correct: "B", explanation: "Culminate means to reach a climax or point of highest development." },
  { q: "The 'Implications' of a decision are its:", options: ["A) Causes", "B) Likely consequences or effects", "C) Costs", "D) Methods"], correct: "B", explanation: "Implications are the possible effects or results of an action or decision." },
  { q: "To 'Inhibit' economic growth means to:", options: ["A) Encourage it", "B) Measure it", "C) Slow down or prevent it", "D) Celebrate it"], correct: "C", explanation: "Inhibit means to hinder, restrain, or prevent." },
  { q: "To 'Convey' a message means to:", options: ["A) Ignore it", "B) Receive it", "C) Communicate or express it", "D) Delete it"], correct: "C", explanation: "Convey means to make an idea or feeling known or understandable to someone." },
  { q: "To 'Compound' a problem means to:", options: ["A) Solve it", "B) Make it worse by adding to it", "C) Ignore it", "D) Simplify it"], correct: "B", explanation: "Compound (verb) means to make something worse by adding to it." },
  { q: "An 'Incentive' is something that:", options: ["A) Discourages action", "B) Motivates or encourages action", "C) Punishes behaviour", "D) Measures results"], correct: "B", explanation: "An incentive is a thing that motivates or encourages someone to do something." },
  { q: "An 'Autonomous' region is one that:", options: ["A) Is controlled by a foreign power", "B) Has self-governing authority", "C) Has no government", "D) Is economically poor"], correct: "B", explanation: "Autonomous means having self-government or acting independently." },
  { q: "The word 'Fluctuate' means:", options: ["A) To remain constant", "B) To rise only", "C) To rise and fall irregularly", "D) To decrease steadily"], correct: "C", explanation: "Fluctuate means to rise and fall irregularly — essential for IELTS graph description." },
  { q: "A 'Legitimate' concern is one that is:", options: ["A) Illegal", "B) Unreasonable", "C) Lawful and justifiable", "D) Temporary"], correct: "C", explanation: "Legitimate means conforming to the law or to rules; genuine and valid." },
  { q: "A 'Stringent' law is one that is:", options: ["A) Flexible and easy", "B) Outdated", "C) Strict and demanding", "D) Optional"], correct: "C", explanation: "Stringent means strict, precise, and exacting — used for laws and regulations." },
  { q: "A 'Hallmark' of a good leader is:", options: ["A) An award they have won", "B) A distinctive characteristic or feature", "C) A type of decision", "D) A government title"], correct: "B", explanation: "Hallmark means a distinctive feature or characteristic, especially of excellence." },
  { q: "To 'Erode' trust over time means to:", options: ["A) Build it gradually", "B) Maintain it", "C) Gradually wear it away", "D) Transfer it"], correct: "C", explanation: "Erode means to gradually destroy or wear away." },
  { q: "The word 'Demographic' refers to:", options: ["A) A type of government", "B) Statistical data relating to a population", "C) A natural disaster", "D) An economic policy"], correct: "B", explanation: "Demographic relates to the structure of populations — key for IELTS data tasks." },
  { q: "A 'Robust' economy is one that is:", options: ["A) Weak and fragile", "B) Strong and healthy", "C) Declining slowly", "D) Dependent on imports"], correct: "B", explanation: "Robust means strong and healthy — a useful collocation in economic writing." },
  { q: "A 'Catalyst' for change is:", options: ["A) An obstacle to change", "B) Something that causes or speeds up change", "C) A type of measurement", "D) A political leader"], correct: "B", explanation: "Catalyst means something that precipitates an event or change." },
  { q: "To 'Reinforce' an argument means to:", options: ["A) Weaken it", "B) Strengthen or support it further", "C) Repeat it exactly", "D) Replace it"], correct: "B", explanation: "Reinforce means to strengthen or support, especially by adding extra evidence." },
  { q: "An 'Innate' skill is one that is:", options: ["A) Learned through education", "B) Acquired through practice", "C) Natural and inborn", "D) Cultural and social"], correct: "C", explanation: "Innate means inborn; natural — not acquired by learning." },
  { q: "To 'Supersede' an old law means to:", options: ["A) Support it", "B) Study it", "C) Take its place and replace it", "D) Extend it"], correct: "C", explanation: "Supersede means to take the place of a person or thing previously in authority." },
  { q: "To 'Accentuate' a problem means to:", options: ["A) Solve it", "B) Ignore it", "C) Make it more noticeable or prominent", "D) Reduce it"], correct: "C", explanation: "Accentuate means to make more noticeable or prominent." },
  { q: "A 'Pivotal' moment in history is one that is:", options: ["A) Insignificant", "B) Of central importance", "C) Forgotten quickly", "D) Accidental"], correct: "B", explanation: "Pivotal means of crucial importance in relation to the development of something." },
  { q: "A 'Chronic' problem is one that:", options: ["A) Appears suddenly and goes away quickly", "B) Is minor and easily fixed", "C) Persists for a long time", "D) Is caused by one person"], correct: "C", explanation: "Chronic means persisting for a long time or constantly recurring." },
  { q: "In academic writing, a 'Synthesis' means:", options: ["A) A single source summary", "B) Combining information from multiple sources into a coherent whole", "C) A list of references", "D) A personal opinion section"], correct: "B", explanation: "Synthesis means combining elements from multiple sources to form a connected idea." },
  { q: "A 'Peripheral' issue is one that is:", options: ["A) Central and critical", "B) On the edge; of minor importance", "C) Very expensive", "D) Highly controversial"], correct: "B", explanation: "Peripheral means of secondary or minor importance; on the edge of something." },
  { q: "To 'Impose' a tax means to:", options: ["A) Remove it", "B) Study it", "C) Officially require people to pay it", "D) Vote on it"], correct: "C", explanation: "Impose means to force something upon others; to establish by authority." },
  { q: "To 'Eradicate' a disease means to:", options: ["A) Study it", "B) Treat one patient", "C) Completely destroy or eliminate it", "D) Slow its spread"], correct: "C", explanation: "Eradicate means to completely destroy or remove something." },
  { q: "A 'Narrative' in an essay refers to:", options: ["A) A list of statistics", "B) A connected account or story that conveys a message", "C) A graph or table", "D) A footnote"], correct: "B", explanation: "Narrative means a spoken or written account that presents connected events." },
  { q: "To 'Supplement' your income means to:", options: ["A) Reduce it", "B) Add to it to make it larger", "C) Tax it", "D) Invest it"], correct: "B", explanation: "Supplement means to add something extra to make up a deficiency." },
  { q: "An 'Inherent' risk is one that:", options: ["A) Can be easily removed", "B) Is external", "C) Is a natural and permanent part of something", "D) Was added later"], correct: "C", explanation: "Inherent means existing in something as a permanent and inseparable element." },
  { q: "To 'Encompass' many subjects means to:", options: ["A) Ignore them", "B) Include them all within a range", "C) Rank them", "D) Remove them"], correct: "B", explanation: "Encompass means to surround or include a wide range of things." },
  { q: "To 'Sustain' economic growth means to:", options: ["A) Stop it suddenly", "B) Measure it annually", "C) Keep it going over a long period", "D) Transfer it abroad"], correct: "C", explanation: "Sustain means to maintain or keep something at a particular rate or level." },
  { q: "An 'Arbitrary' decision is one that is:", options: ["A) Based on careful analysis", "B) Based on data", "C) Made without clear reason or principle", "D) Made by a committee"], correct: "C", explanation: "Arbitrary means based on random choice or personal whim rather than reason." },
  { q: "A 'Stark' contrast between two things means the contrast is:", options: ["A) Minor", "B) Expected", "C) Very strong and obvious", "D) Debatable"], correct: "C", explanation: "Stark means severe and very obvious — used to emphasise dramatic differences." },
  { q: "Research that 'Yields' new findings:", options: ["A) Hides them", "B) Contradicts them", "C) Produces or provides them", "D) Destroys them"], correct: "C", explanation: "Yield (verb) means to produce or provide a natural or agricultural product." },
  { q: "A 'Volatile' market is one that:", options: ["A) Is very stable and predictable", "B) Changes suddenly and unpredictably", "C) Is controlled by the government", "D) Only operates in one country"], correct: "B", explanation: "Volatile means liable to change rapidly and unpredictably." },
  { q: "A 'Discrepancy' between two reports means:", options: ["A) They are identical", "B) There is a difference or inconsistency between them", "C) They support each other", "D) They were written by the same author"], correct: "B", explanation: "Discrepancy means a lack of compatibility or similarity between facts." },
  { q: "The 'Predominant' factor in an issue is:", options: ["A) The least important one", "B) One of many equal factors", "C) The most important or influential one", "D) The most recent one"], correct: "C", explanation: "Predominant means present as the strongest or main element." },
  { q: "To 'Deplete' natural resources means to:", options: ["A) Protect them", "B) Study them", "C) Use them up until very little remains", "D) Export them"], correct: "C", explanation: "Deplete means to use up the supply of a resource." },
  { q: "The 'Trajectory' of economic growth refers to its:", options: ["A) Starting point", "B) Rate of inflation", "C) Path and direction of change over time", "D) Annual budget"], correct: "C", explanation: "Trajectory means the path followed by a moving object or the course of development." },
  { q: "A government minister's 'Counterpart' in another country is:", options: ["A) Their assistant", "B) Their opponent in an election", "C) A person with an equivalent role elsewhere", "D) Their successor"], correct: "C", explanation: "Counterpart means a person or thing that has the same function in a different place." },
  { q: "'Prone to errors' means:", options: ["A) Unlikely to make errors", "B) Able to correct errors", "C) Likely to make errors frequently", "D) Aware of errors"], correct: "C", explanation: "Prone means likely or liable to do or suffer something." },
  { q: "A 'Benchmark' in education is:", options: ["A) A piece of furniture", "B) A test score", "C) A standard point against which things can be measured", "D) A type of exam"], correct: "C", explanation: "Benchmark means a standard or point of reference used for comparison." },
  { q: "To 'Assert' a claim means to:", options: ["A) Disprove it", "B) State it confidently and forcefully", "C) Question it", "D) Research it"], correct: "B", explanation: "Assert means to state a fact or belief confidently and forcefully." },
  { q: "A 'Subtle' difference between two ideas is one that is:", options: ["A) Obvious and large", "B) Unimportant", "C) Small and not immediately obvious", "D) Impossible to detect"], correct: "C", explanation: "Subtle means so slight as to be difficult to detect or describe." },
  { q: "A 'Cumulative' effect is one that:", options: ["A) Happens only once", "B) Builds up gradually over time", "C) Disappears quickly", "D) Is sudden and unexpected"], correct: "B", explanation: "Cumulative means increasing or growing by successive additions." }
); // end vocab.push


// ── 60 New GRAMMAR MCQs ───────────────────────────────────────────────
IELTS_MCQ_BANK.grammar.push(
  { q: "I wish I __ more time to study last week.", options: ["A) have", "B) had had", "C) would have", "D) will have"], correct: "B", explanation: "Past unreal wish: 'I wish + past perfect' (had had) for regrets about the past." },
  { q: "Rarely __ such a beautiful sunset.", options: ["A) I have seen", "B) have I seen", "C) I saw", "D) I had seen"], correct: "B", explanation: "After negative adverbs like 'Rarely', subject-auxiliary inversion is required." },
  { q: "Which is the correct cleft sentence to emphasise 'the teacher'?", options: ["A) The teacher explained the rule.", "B) It was the teacher who explained the rule.", "C) It was the rule that the teacher explained it.", "D) The teacher is who explained the rule."], correct: "B", explanation: "Cleft sentences: 'It was + noun/pronoun + who/that + rest of clause'." },
  { q: "She regrets __ the opportunity to study abroad.", options: ["A) to miss", "B) missing", "C) to have missed", "D) miss"], correct: "B", explanation: "'Regret + gerund (missing)' refers to something already done and now regretted." },
  { q: "If he __ harder at school, he __ in a better position now.", options: ["A) had worked / would be", "B) worked / will be", "C) had worked / would have been", "D) works / would be"], correct: "A", explanation: "Mixed conditional: past perfect in if-clause, would + infinitive in result clause." },
  { q: "__ the report, she realised several errors.", options: ["A) Having read", "B) Read", "C) Being read", "D) She read"], correct: "A", explanation: "Perfect participle clause 'Having read' shows the action happened before the main clause." },
  { q: "The committee recommended that he __ the new policy immediately.", options: ["A) implements", "B) implement", "C) implemented", "D) will implement"], correct: "B", explanation: "Subjunctive mood: after 'recommend/suggest/insist + that', use the base form (implement)." },
  { q: "Which sentence uses a non-defining relative clause correctly?", options: ["A) The book which I bought was expensive.", "B) My brother, who lives in London, is a doctor.", "C) The city that I visited was beautiful.", "D) The report that was published contained errors."], correct: "B", explanation: "Non-defining relative clauses add extra information and are set off by commas." },
  { q: "By 2030, the new highway __.", options: ["A) will complete", "B) will be completed", "C) is completed", "D) would complete"], correct: "B", explanation: "Future passive: will + be + past participle (will be completed)." },
  { q: "If you __ water to 100 degrees, it __.", options: ["A) heat / boils", "B) heated / would boil", "C) will heat / boils", "D) heat / would boil"], correct: "A", explanation: "Zero conditional: simple present in both clauses for scientific/general truths." },
  { q: "Choose the correct option: '__ knowledge is power.'", options: ["A) A", "B) The", "C) An", "D) No article"], correct: "D", explanation: "No article is used with abstract nouns used in a general sense (knowledge, beauty, etc.)." },
  { q: "She __ her car repaired at the garage.", options: ["A) got", "B) made", "C) let", "D) caused"], correct: "A", explanation: "Causative 'have/get + object + past participle': 'got her car repaired'." },
  { q: "Which sentence uses the emphatic 'do' correctly?", options: ["A) I do not agree with this policy.", "B) I do agree with this policy.", "C) I does agree with this policy.", "D) I doing agree with this policy."], correct: "B", explanation: "Emphatic 'do' in affirmative sentences: 'I do agree' adds strong emphasis." },
  { q: "__ in cities can be very stressful.", options: ["A) Live", "B) To live", "C) Living", "D) Lived"], correct: "C", explanation: "Gerunds (living) are preferred over infinitives as subjects in formal writing." },
  { q: "Not only __ the test, but she also received the highest score.", options: ["A) she passed", "B) passed she", "C) did she pass", "D) she did pass"], correct: "C", explanation: "After 'Not only' at the start of a clause, auxiliary-subject inversion is required." },
  { q: "She is very interested __ learning new languages.", options: ["A) at", "B) for", "C) in", "D) on"], correct: "C", explanation: "'Interested in' is the fixed prepositional collocation." },
  { q: "__ some people prefer cities, others find rural life more fulfilling.", options: ["A) Despite", "B) Although", "C) Whereas", "D) Nevertheless"], correct: "C", explanation: "'Whereas' introduces a contrast between two different facts or situations." },
  { q: "The scientist suggested that we __ the experiment again.", options: ["A) should repeat", "B) will repeat", "C) repeating", "D) repeated"], correct: "A", explanation: "After 'suggest + that', use 'should + base verb' or subjunctive (repeat)." },
  { q: "Which sentence correctly uses ellipsis to avoid repetition?", options: ["A) She loves dancing and he loves dancing too.", "B) She loves dancing and he does too.", "C) She loves dancing and he is too.", "D) She loves dancing and he loves too."], correct: "B", explanation: "Ellipsis removes repeated verb phrases: 'he does too' replaces 'he loves dancing too'." },
  { q: "He __ left already — his coat is gone.", options: ["A) can have", "B) should have", "C) must have", "D) would have"], correct: "C", explanation: "'Must have' expresses a logical deduction about a past event." },
  { q: "Everyone must submit __ assignment before Friday.", options: ["A) their", "B) his", "C) its", "D) our"], correct: "A", explanation: "'Their' is now widely accepted as a gender-neutral singular pronoun in formal English." },
  { q: "Which option is grammatically correct with a fronted adverbial?", options: ["A) Under no circumstances we should accept this.", "B) Under no circumstances should we accept this.", "C) Under no circumstances we should not accept this.", "D) Under no circumstances accepted we this."], correct: "B", explanation: "Negative adverbials at the front require inversion: 'should we' not 'we should'." },
  { q: "Which sentence has correct parallel structure?", options: ["A) She likes reading, to swim, and cycling.", "B) She likes reading, swimming, and cycling.", "C) She likes to read, swimming, and to cycle.", "D) She likes read, swim, and cycling."], correct: "B", explanation: "Parallel structure requires consistent grammatical form across a list." },
  { q: "There isn't __ evidence to support this claim.", options: ["A) many", "B) few", "C) much", "D) more"], correct: "C", explanation: "'Much' is used with uncountable nouns (evidence) in negative sentences." },
  { q: "The results were not __ clear __ the researchers had hoped.", options: ["A) so / than", "B) as / as", "C) too / than", "D) more / than"], correct: "B", explanation: "Equality comparison: 'as + adjective + as'." },
  { q: "Scientists __ a cure for this disease yet.", options: ["A) didn't find", "B) haven't found", "C) don't find", "D) hadn't found"], correct: "B", explanation: "Present perfect (haven't found) is used with 'yet' for actions up to the present." },
  { q: "__ his lack of experience, he was offered the position.", options: ["A) Although", "B) Even though", "C) Despite", "D) However"], correct: "C", explanation: "'Despite' is followed by a noun phrase; 'although/even though' by a clause." },
  { q: "If only the government __ more investment in public transport!", options: ["A) will provide", "B) provides", "C) would provide", "D) provided"], correct: "C", explanation: "'If only + would + base verb' expresses a wish about a present/future situation." },
  { q: "The new bridge __ right now.", options: ["A) is building", "B) is being built", "C) builds", "D) has been building"], correct: "B", explanation: "Present passive continuous: is/are + being + past participle." },
  { q: "The company, __ headquarters are in London, reported record profits.", options: ["A) which", "B) that", "C) whose", "D) whom"], correct: "C", explanation: "'Whose' is the possessive relative pronoun, used for people and organisations." },
  { q: "The proposal faced fierce opposition. __, it was eventually approved.", options: ["A) Furthermore", "B) Therefore", "C) Nevertheless", "D) Similarly"], correct: "C", explanation: "'Nevertheless' means 'in spite of that' — used to contrast preceding negative points." },
  { q: "The examiner asked me __ I had prepared for the test.", options: ["A) that how", "B) how", "C) whether how", "D) what"], correct: "B", explanation: "Reported question: 'asked me + question word + subject + verb'. No inversion." },
  { q: "Which sentence is grammatically incorrect?", options: ["A) I understand the concept.", "B) She believes in climate change.", "C) He is knowing the answer.", "D) They prefer coffee to tea."], correct: "C", explanation: "Stative verbs (know, understand, believe, prefer) are NOT used in continuous forms." },
  { q: "Scarcely __ sat down when the alarm went off.", options: ["A) I had", "B) had I", "C) I have", "D) have I"], correct: "B", explanation: "'Scarcely' requires subject-auxiliary inversion when it starts a clause." },
  { q: "When I was a child, I __ climb trees in the garden every day.", options: ["A) used to", "B) would", "C) Both A and B are correct", "D) was used to"], correct: "C", explanation: "Both 'used to' and 'would' describe repeated past habits — but 'would' cannot be used for states." },
  { q: "She is __ most talented student in the class.", options: ["A) a", "B) an", "C) the", "D) no article"], correct: "C", explanation: "Definite article 'the' is always used before superlatives." },
  { q: "__ that unemployment has risen sharply.", options: ["A) It is reported", "B) They are reported", "C) It reports", "D) Reported"], correct: "A", explanation: "Impersonal passive reporting structure: 'It is + reported/said/believed + that'." },
  { q: "The rise in temperatures is a direct result __ human activity.", options: ["A) from", "B) for", "C) of", "D) in"], correct: "C", explanation: "'Result of' is the correct dependent preposition." },
  { q: "The experiment __ successful — all results point in the same direction.", options: ["A) can be", "B) should be", "C) would be", "D) could be"], correct: "B", explanation: "'Should be' expresses a reasonable expectation based on evidence." },
  { q: "The water was not __ to drink.", options: ["A) clean enough", "B) too clean", "C) enough clean", "D) very clean enough"], correct: "A", explanation: "'Adjective + enough' is correct: 'clean enough'. 'Enough' comes after the adjective." }
); // end grammar.push


// ── 30 New MIXED MCQs ─────────────────────────────────────────────────
IELTS_MCQ_BANK.mixed.push(
  { q: "Choose the correct collocation: 'Education can __ a significant difference to people's lives.'", options: ["A) do", "B) make", "C) give", "D) bring"], correct: "B", explanation: "'Make a difference' is the fixed collocation in English." },
  { q: "Which sentence is most appropriate for IELTS Academic Writing Task 2?", options: ["A) Lots of people think money is really important.", "B) It is widely acknowledged that financial security plays a crucial role in overall wellbeing.", "C) I think money is super important these days.", "D) Money is, like, very important for everyone."], correct: "B", explanation: "Academic writing requires formal, impersonal language with precise vocabulary." },
  { q: "For IELTS Writing Task 1, which phrase best describes a sharp increase on a graph?", options: ["A) went a bit up", "B) increased slowly", "C) rose dramatically", "D) got bigger"], correct: "C", explanation: "'Rose dramatically' uses a precise academic verb and adverb — ideal for graph description." },
  { q: "The idiom 'burning the midnight oil' means:", options: ["A) Wasting energy", "B) Working very late into the night", "C) Starting a fire", "D) Being inefficient"], correct: "B", explanation: "This idiom means working late at night, especially to study or complete a task." },
  { q: "Which expression is used to introduce an example in formal writing?", options: ["A) And so on", "B) Like", "C) To illustrate", "D) You know"], correct: "C", explanation: "'To illustrate' is a formal phrase used to introduce a supporting example." },
  { q: "Researchers finally __ a conclusion after years of study.", options: ["A) made", "B) did", "C) reached", "D) found"], correct: "C", explanation: "'Reach a conclusion' is the correct collocation in academic English." },
  { q: "Which phrase is an example of hedging language appropriate for IELTS?", options: ["A) This proves that...", "B) It is definitely true that...", "C) It would appear that...", "D) Everyone knows that..."], correct: "C", explanation: "Hedging language like 'it would appear that' avoids overconfident claims in academic writing." },
  { q: "Which sentence contains a subject-verb agreement error?", options: ["A) The number of students has increased.", "B) A number of students have complained.", "C) The data shows a clear trend.", "D) The committee are meeting tomorrow."], correct: "D", explanation: "In American English, 'committee' takes a singular verb. In British English both are possible — but this is a common IELTS pitfall." },
  { q: "Technology __ a crucial role in modern education.", options: ["A) does", "B) makes", "C) plays", "D) gives"], correct: "C", explanation: "'Play a role' is the standard collocation in academic English." },
  { q: "Which discourse marker introduces a contrasting point in a balanced essay?", options: ["A) Furthermore", "B) On the other hand", "C) Therefore", "D) In addition"], correct: "B", explanation: "'On the other hand' signals a contrast or opposing view — essential for IELTS Task 2 essays." },
  { q: "Which Band 8 alternative best replaces 'very good' in formal writing?", options: ["A) really great", "B) super nice", "C) exceptional", "D) pretty good"], correct: "C", explanation: "Exceptional is a Band 8+ word; avoid vague words like 'good', 'nice', 'great' in IELTS." },
  { q: "Which sentence most effectively states an opinion in IELTS Task 2?", options: ["A) In my opinion, I think that technology is bad.", "B) I believe that the drawbacks of technology are outweighed by its benefits.", "C) Technology is obviously bad for everyone.", "D) I totally agree that technology is great."], correct: "B", explanation: "A clear, concise opinion with no redundancy (avoid 'In my opinion, I think') is Band 7+." },
  { q: "In the PEEL paragraph structure, what does the first 'E' stand for?", options: ["A) Example", "B) Evidence", "C) Explain", "D) Either Evidence or Explain"], correct: "D", explanation: "PEEL = Point, Evidence/Explain, Example, Link. Both 'Evidence' and 'Explain' are used in different versions." },
  { q: "Pollution is a __ concern for governments worldwide.", options: ["A) increasing", "B) big", "C) growing", "D) heavy"], correct: "C", explanation: "'Growing concern' is the natural academic collocation; 'big concern' is informal." },
  { q: "In IELTS Reading, 'NOT GIVEN' means:", options: ["A) The statement is false.", "B) The statement is true.", "C) There is no information about this in the passage.", "D) The statement contradicts the passage."], correct: "C", explanation: "'NOT GIVEN' means the passage provides no information to confirm or deny the statement." },
  { q: "Which of the following is spelt correctly?", options: ["A) Accomodation", "B) Accommodation", "C) Acommodation", "D) Acomodation"], correct: "B", explanation: "Accommodation has double 'c' and double 'm' — one of the most commonly misspelled IELTS words." },
  { q: "Which phrase is informal and should be AVOIDED in IELTS Academic Writing?", options: ["A) Furthermore", "B) A large number of", "C) Kids", "D) It is argued that"], correct: "C", explanation: "'Kids' is informal; use 'children' in IELTS academic writing." },
  { q: "Which sentence correctly shows cause and effect?", options: ["A) Due to the heavy rainfall, and flooding occurred.", "B) Because of the heavy rainfall, flooding occurred.", "C) Although heavy rainfall, flooding occurred.", "D) Despite heavy rainfall, flooding occurred."], correct: "B", explanation: "'Because of + noun phrase' correctly expresses cause and effect in formal English." },
  { q: "In IELTS Writing Task 1, the 'Overview' paragraph should:", options: ["A) List all the numbers from the graph.", "B) State the most important general trends without specific data.", "C) Give your personal opinion on the graph topic.", "D) Conclude with a recommendation."], correct: "B", explanation: "The overview summarises the main trends — no specific figures, no opinion." },
  { q: "Which sentence has a clear pronoun reference?", options: ["A) John told his brother that he had passed the exam.", "B) After passing the exam, John celebrated with his brother.", "C) He told him that he passed.", "D) John and his brother, he passed the exam."], correct: "B", explanation: "Clear pronoun reference avoids ambiguity — a key coherence and cohesion criterion." },
  { q: "Which conditional sentence is most appropriate for IELTS Task 2 academic writing?", options: ["A) If governments gonna do something, things will change.", "B) If governments were to invest in education, outcomes would improve significantly.", "C) If governments invest, it will probably help.", "D) Governments investing would help things."], correct: "B", explanation: "'If + were to + base verb, would + base verb' is a formal conditional ideal for IELTS." },
  { q: "Which word best describes the gradual destruction of the natural environment?", options: ["A) Sustainability", "B) Degradation", "C) Conservation", "D) Restoration"], correct: "B", explanation: "Environmental degradation means the deterioration of the natural environment — a key IELTS topic word." },
  { q: "Choose the most academic alternative to 'get better results':", options: ["A) get better marks", "B) score higher", "C) achieve superior outcomes", "D) do more well"], correct: "C", explanation: "'Achieve superior outcomes' uses AWL vocabulary and formal structure." },
  { q: "For IELTS Task 1, which phrase describes a value reaching its highest point?", options: ["A) hit a low", "B) peaked at", "C) dropped to a high", "D) remained constant"], correct: "B", explanation: "'Peaked at [value]' is the standard academic phrase for the highest point on a graph." },
  { q: "Which sentence contains a common error made by IELTS candidates?", options: ["A) I agree with this view.", "B) I am agree with this view.", "C) I strongly agree with this argument.", "D) I tend to agree with this perspective."], correct: "B", explanation: "'I am agree' is incorrect — 'agree' is a verb, not an adjective. Always say 'I agree'." },
  { q: "Researchers __ a study on the effects of air pollution.", options: ["A) made", "B) did", "C) conducted", "D) performed"], correct: "C", explanation: "'Conduct a study/research' is the correct academic collocation." },
  { q: "Which is the best paraphrase of 'Many people live in cities today'?", options: ["A) Many people live in cities today.", "B) A large proportion of the population currently resides in urban areas.", "C) Lots of people are in cities now.", "D) People like to live in cities."], correct: "B", explanation: "Good paraphrasing uses synonyms (large proportion, resides, urban areas) and restructuring." },
  { q: "Which is the correct spelling?", options: ["A) Neccessary", "B) Necesary", "C) Necessary", "D) Nessecary"], correct: "C", explanation: "Necessary: one 'c', double 's' — another commonly misspelled IELTS word." },
  { q: "Which is the most formal alternative to 'The graph shows' for IELTS Task 1?", options: ["A) The graph is showing", "B) The graph illustrates", "C) The graph tells us", "D) The graph is about"], correct: "B", explanation: "'Illustrates' is more formal and academic than 'shows'; avoid 'tells us'." },
  { q: "Which sentence best avoids word repetition using a synonym?", options: ["A) The government should help the poor. The government must also help poor families.", "B) The government should assist the poor. Authorities must also support disadvantaged families.", "C) The government helps the poor. The government helps poor people.", "D) The government should help. The poor need help."], correct: "B", explanation: "Using synonyms (assist/support, authorities, disadvantaged) improves lexical resource scores." }
); // end mixed.push


// ── 15 New Part 1 Speaking Questions ─────────────────────────────────
IELTS_SPEAKING_BANK.part1.push(
  "What is the most useful app on your phone and why?",
  "Do you think people spend too much time on their phones? Why?",
  "Do you prefer to study or work in the morning or in the evening?",
  "Has your daily routine changed much in recent years?",
  "Do you do anything to keep fit? What do you do?",
  "How important is it for you to eat healthily?",
  "How do you prefer to travel — by plane, train, or car?",
  "Would you like to live in another country? Why or why not?",
  "Do you enjoy going to museums or art galleries? Why?",
  "What kind of music do you enjoy listening to?",
  "Do you do anything to help protect the environment in your daily life?",
  "Has the environment in your area changed since you were a child?",
  "How often do you use social media and for what purpose?",
  "Do you think social media has more positive or negative effects on society?",
  "What is your favourite subject to study and why?"
); // end part1.push

// ── 5 New Part 2 Cue Cards ────────────────────────────────────────────
IELTS_SPEAKING_BANK.part2.push(
  "Describe an important decision you had to make. You should say: what the decision was, when you had to make it, who helped you decide, and explain how you felt about making this decision.",
  "Describe a time when you learned something new outside of school or university. You should say: what you learned, how you learned it, how long it took, and explain why you decided to learn this skill.",
  "Describe a piece of news that you found particularly interesting. You should say: what the news was about, where you heard or read it, how people around you reacted, and explain why you found it interesting.",
  "Describe an environmental problem in your country. You should say: what the problem is, what causes it, what effects it has, and explain what you think should be done to address it.",
  "Describe a time when you worked as part of a team to achieve something. You should say: what the goal was, who was in the team, what your role was, and explain what made the teamwork successful or difficult."
); // end part2.push

// ── 10 New Part 3 Discussion Questions ───────────────────────────────
IELTS_SPEAKING_BANK.part3.push(
  "Do you think people are more stressed today than they were in the past? Why?",
  "To what extent do you think social inequality is a serious problem in the world today?",
  "How has the role of women in society changed in your country over the past few decades?",
  "Should art and music be compulsory subjects in schools? Why or why not?",
  "Do you think the way children are educated today adequately prepares them for the future?",
  "How important is it for a country to have a high standard of university education?",
  "Do you think technology can solve the world's environmental problems? Why or why not?",
  "How responsible are individuals compared to governments when it comes to protecting the environment?",
  "How do you think artificial intelligence will affect employment in the next twenty years?",
  "Do you think a high salary is the most important factor when choosing a career?"
); // end part3.push


// ══════════════════════════════════════════════════════════════════════
//  TOPIC VOCABULARY CHEAT SHEETS
//  _ieltsGetTopicVocab(questionText) → string[]
// ══════════════════════════════════════════════════════════════════════

const IELTS_TOPIC_VOCAB = {
  environment: ['sustainability', 'degradation', 'eco-friendly', 'carbon footprint', 'biodiversity', 'renewable energy'],
  technology:  ['automation', 'artificial intelligence', 'innovation', 'disruptive', 'digital divide', 'cybersecurity'],
  education:   ['curriculum', 'pedagogy', 'vocational training', 'critical thinking', 'academic achievement', 'lifelong learning'],
  health:      ['healthcare system', 'preventive medicine', 'sedentary lifestyle', 'mental wellbeing', 'obesity epidemic', 'life expectancy'],
  society:     ['social inequality', 'demographic shift', 'urbanisation', 'multiculturalism', 'social cohesion', 'marginalised groups'],
  economy:     ['globalisation', 'GDP', 'inflation', 'unemployment rate', 'economic disparity', 'fiscal policy'],
  travel:      ['cultural immersion', 'ecotourism', 'sustainable travel', 'heritage site', 'mass tourism', 'carbon offset'],
  media:       ['social media', 'misinformation', 'digital literacy', 'press freedom', 'viral content', 'media bias'],
};

window._ieltsGetTopicVocab = function(questionText) {
  const q = questionText.toLowerCase();
  if (/environment|climate|pollution|green|eco|planet/.test(q))   return IELTS_TOPIC_VOCAB.environment;
  if (/technolog|internet|digital|app|phone|computer|ai/.test(q)) return IELTS_TOPIC_VOCAB.technology;
  if (/educat|school|universi|student|learn|teach/.test(q))       return IELTS_TOPIC_VOCAB.education;
  if (/health|fit|diet|hospital|medicine|stress/.test(q))         return IELTS_TOPIC_VOCAB.health;
  if (/societ|community|equalit|culture|family|gender/.test(q))   return IELTS_TOPIC_VOCAB.society;
  if (/econom|employ|job|work|salary|money|business/.test(q))     return IELTS_TOPIC_VOCAB.economy;
  if (/travel|journey|tourism|abroad|country|transport/.test(q))  return IELTS_TOPIC_VOCAB.travel;
  if (/media|news|social media|press|newspaper/.test(q))          return IELTS_TOPIC_VOCAB.media;
  return [];
};

// ══════════════════════════════════════════════════════════════════════
//  COMMON ERROR HIGHLIGHTER
//  _ieltsCheckCommonErrors(answerText) → string[]
// ══════════════════════════════════════════════════════════════════════

const IELTS_COMMON_ERRORS = [
  { pattern: /\bi am agree\b/i,                fix: "'I am agree' → 'I agree'  (agree is a verb, not an adjective)" },
  { pattern: /\bI am disagree\b/i,             fix: "'I am disagree' → 'I disagree'" },
  { pattern: /\bdiscuss about\b/i,             fix: "'Discuss about' → 'Discuss' (discuss already means 'to talk about')" },
  { pattern: /\bexplain about\b/i,             fix: "'Explain about' → 'Explain'" },
  { pattern: /\bin the other hand\b/i,         fix: "'In the other hand' → 'On the other hand'" },
  { pattern: /\bat the other hand\b/i,         fix: "'At the other hand' → 'On the other hand'" },
  { pattern: /\baccording to my opinion\b/i,   fix: "'According to my opinion' → 'In my opinion' (these are not combined)" },
  { pattern: /\bin my opinion,?\s*I think\b/i, fix: "'In my opinion, I think' → just 'In my opinion' OR just 'I think' (not both)" },
  { pattern: /\bmore better\b/i,               fix: "'More better' → 'Better' (no double comparative)" },
  { pattern: /\bmost easiest\b/i,              fix: "'Most easiest' → 'Easiest' (no double superlative)" },
  { pattern: /\bmost highest\b/i,              fix: "'Most highest' → 'Highest'" },
  { pattern: /\b(peoples|informations|advices|feedbacks)\b/i, fix: "Uncountable nouns: 'people' (not peoples), 'information' (not informations), 'advice' (not advices)" },
  { pattern: /\bmake a research\b/i,           fix: "'Make a research' → 'Conduct research' or 'Do research'" },
  { pattern: /\bdo a mistake\b/i,              fix: "'Do a mistake' → 'Make a mistake'" },
  { pattern: /\bdo a decision\b/i,             fix: "'Do a decision' → 'Make a decision'" },
  { pattern: /\bsince \d+ years\b/i,           fix: "'Since X years' → 'For X years' (since = point in time; for = duration)" },
  { pattern: /\bdespite of\b/i,                fix: "'Despite of' → 'Despite' (no 'of' after despite)" },
  { pattern: /\balthough.*,?\s*but\b/i,        fix: "'Although...but' → use either 'Although' OR 'but', not both" },
  { pattern: /\bbecause.*,?\s*so\b/i,          fix: "'Because...so' → use either 'because' OR 'so', not both" },
  { pattern: /\bI am born\b/i,                 fix: "'I am born' → 'I was born' (a fixed past passive expression)" },
];

window._ieltsCheckCommonErrors = function(answerText) {
  return IELTS_COMMON_ERRORS
    .filter(rule => rule.pattern.test(answerText))
    .map(rule => rule.fix);
};

// ══════════════════════════════════════════════════════════════════════
//  SYNONYM SUGGESTION — Band 8–9 word swaps
//  _ieltsGetSynonymSuggestions(text) → string[]
// ══════════════════════════════════════════════════════════════════════

const IELTS_SYNONYM_UPGRADES = [
  { weak: /\b(good)\b/gi,       strong: 'beneficial / advantageous / commendable' },
  { weak: /\b(bad)\b/gi,        strong: 'detrimental / adverse / unfavourable' },
  { weak: /\b(big)\b/gi,        strong: 'substantial / considerable / significant' },
  { weak: /\b(small)\b/gi,      strong: 'minimal / negligible / marginal' },
  { weak: /\b(show)\b/gi,       strong: 'illustrate / demonstrate / indicate' },
  { weak: /\b(use)\b/gi,        strong: 'utilise / employ / leverage' },
  { weak: /\b(important)\b/gi,  strong: 'crucial / pivotal / paramount / vital' },
  { weak: /\b(many)\b/gi,       strong: 'numerous / a considerable number of / a multitude of' },
  { weak: /\b(help)\b/gi,       strong: 'facilitate / assist / contribute to' },
  { weak: /\b(think)\b/gi,      strong: 'argue / contend / maintain / assert' },
  { weak: /\b(get better)\b/gi, strong: 'improve / enhance / ameliorate' },
  { weak: /\b(get worse)\b/gi,  strong: 'deteriorate / worsen / decline' },
  { weak: /\b(problem)\b/gi,    strong: 'issue / challenge / concern / dilemma' },
  { weak: /\b(change)\b/gi,     strong: 'transform / alter / reshape / revolutionise' },
  { weak: /\b(make)\b/gi,       strong: 'generate / produce / establish / create' },
  { weak: /\b(need)\b/gi,       strong: 'require / necessitate / demand' },
  { weak: /\b(find out)\b/gi,   strong: 'discover / ascertain / determine / identify' },
  { weak: /\b(go up)\b/gi,      strong: 'increase / rise / surge / escalate' },
  { weak: /\b(go down)\b/gi,    strong: 'decrease / decline / fall / drop' },
  { weak: /\b(a lot of)\b/gi,   strong: 'a significant number of / a substantial proportion of' },
];

window._ieltsGetSynonymSuggestions = function(text) {
  const found = [];
  IELTS_SYNONYM_UPGRADES.forEach(({ weak, strong }) => {
    if (weak.test(text)) {
      const match = text.match(weak)?.[0];
      if (match) found.push('"' + match + '" \u2192 try: ' + strong);
    }
    weak.lastIndex = 0; // reset regex state
  });
  return found;
};


// ══════════════════════════════════════════════════════════════════════
//  300 NEW QUESTIONS — Batch 2
// ══════════════════════════════════════════════════════════════════════

// ── 100 New VOCABULARY MCQs ───────────────────────────────────────────
IELTS_MCQ_BANK.vocab.push(
  { q: "The word 'Acquiesce' means:", options: ["A) To protest loudly", "B) To accept something reluctantly without arguing", "C) To celebrate a decision", "D) To ignore a request"], correct: "B", explanation: "Acquiesce means to accept or comply with something without protest." },
  { q: "A 'Bilateral' agreement is one between:", options: ["A) One country", "B) Two parties or countries", "C) Many nations", "D) A private company"], correct: "B", explanation: "Bilateral means involving two parties — often used in political and trade contexts." },
  { q: "To 'Circumvent' a rule means to:", options: ["A) Follow it strictly", "B) Change it legally", "C) Find a way around it", "D) Create a new rule"], correct: "C", explanation: "Circumvent means to find a way around an obstacle or rule." },
  { q: "The word 'Dearth' means:", options: ["A) An abundance", "B) A scarcity or lack of something", "C) A type of death", "D) A significant increase"], correct: "B", explanation: "Dearth means a scarcity or insufficient quantity of something." },
  { q: "To 'Espouse' a cause means to:", options: ["A) Abandon it", "B) Study it academically", "C) Adopt and support it", "D) Criticise it publicly"], correct: "C", explanation: "Espouse means to adopt or support a cause or belief." },
  { q: "The word 'Fallacious' means:", options: ["A) Logically sound", "B) Based on a mistaken belief", "C) Scientifically proven", "D) Widely accepted"], correct: "B", explanation: "Fallacious means based on a mistaken belief or unsound reasoning." },
  { q: "A 'Gregarious' person is someone who:", options: ["A) Prefers to be alone", "B) Is shy and reserved", "C) Enjoys the company of others", "D) Is aggressive"], correct: "C", explanation: "Gregarious means fond of company; sociable." },
  { q: "The word 'Hamper' means to:", options: ["A) Help someone", "B) Hinder or obstruct progress", "C) Carry something heavy", "D) Celebrate success"], correct: "B", explanation: "Hamper means to hinder or impede the movement or progress of something." },
  { q: "An 'Impartial' judge is one who is:", options: ["A) Biased toward one side", "B) Inexperienced", "C) Treating all parties equally and fairly", "D) Strict and severe"], correct: "C", explanation: "Impartial means treating all rivals or disputants equally; fair and just." },
  { q: "The word 'Judicious' means:", options: ["A) Relating to a judge", "B) Reckless and hasty", "C) Having or showing good judgement", "D) Overly cautious"], correct: "C", explanation: "Judicious means having, showing, or done with good judgement." },
  { q: "To 'Kindle' interest in a subject means to:", options: ["A) Destroy it", "B) Measure it", "C) Arouse or inspire it", "D) Transfer it"], correct: "C", explanation: "Kindle means to arouse or inspire a feeling or interest." },
  { q: "The word 'Lucrative' means:", options: ["A) Expensive but poor quality", "B) Producing a great deal of profit", "C) Illegal but profitable", "D) Time-consuming"], correct: "B", explanation: "Lucrative means producing a great deal of profit." },
  { q: "To 'Mimic' something means to:", options: ["A) Oppose it", "B) Imitate it closely", "C) Improve it", "D) Describe it"], correct: "B", explanation: "Mimic means to imitate someone or something closely." },
  { q: "The word 'Negate' means to:", options: ["A) Support strongly", "B) Make ineffective or invalid", "C) Calculate precisely", "D) Describe clearly"], correct: "B", explanation: "Negate means to nullify or make something ineffective." },
  { q: "An 'Obsolete' technology is one that is:", options: ["A) Very new", "B) Highly efficient", "C) No longer produced or used", "D) Expensive to maintain"], correct: "C", explanation: "Obsolete means no longer produced or used; out of date." },
  { q: "The word 'Pertinent' means:", options: ["A) Irrelevant", "B) Relevant or applicable to a particular matter", "C) Offensive", "D) Complicated"], correct: "B", explanation: "Pertinent means relevant or applicable to a particular matter." },
  { q: "To 'Quantify' something means to:", options: ["A) Describe it qualitatively", "B) Ignore it", "C) Express or measure it in numbers", "D) Divide it equally"], correct: "C", explanation: "Quantify means to express or measure the quantity of something." },
  { q: "The word 'Rampant' means:", options: ["A) Under control", "B) Spreading unchecked", "C) Declining rapidly", "D) Carefully planned"], correct: "B", explanation: "Rampant means flourishing or spreading in an uncontrolled way." },
  { q: "To 'Sanction' a policy can mean to:", options: ["A) Oppose it", "B) Officially approve or allow it", "C) Study it", "D) Delay it"], correct: "B", explanation: "Sanction (verb) means to give official permission or approval for something." },
  { q: "The word 'Tenacious' means:", options: ["A) Easily discouraged", "B) Holding firmly to something; persistent", "C) Very aggressive", "D) Calm and passive"], correct: "B", explanation: "Tenacious means tending to keep a firm hold; persistent." },
  { q: "To 'Underpin' an argument means to:", options: ["A) Weaken it", "B) Summarise it", "C) Support or strengthen it from below", "D) Challenge it"], correct: "C", explanation: "Underpin means to support or form the basis of an argument or idea." },
  { q: "The word 'Vehement' means:", options: ["A) Mild and quiet", "B) Showing strong feeling; forceful", "C) Uncertain", "D) Formal and polite"], correct: "B", explanation: "Vehement means showing strong feeling or passion; forceful." },
  { q: "To 'Waive' a right means to:", options: ["A) Strengthen it", "B) Transfer it", "C) Voluntarily give it up", "D) Use it immediately"], correct: "C", explanation: "Waive means to refrain from insisting on or using a right or claim." },
  { q: "The word 'Xenophobia' means:", options: ["A) Fear of animals", "B) Fear of heights", "C) Dislike or prejudice against people from other countries", "D) Love of foreign cultures"], correct: "C", explanation: "Xenophobia means dislike or prejudice against people from other countries." },
  { q: "To 'Yield' to pressure means to:", options: ["A) Resist it firmly", "B) Measure it", "C) Give way and comply", "D) Increase it"], correct: "C", explanation: "Yield means to give way to demands, pressure, or arguments." },
  { q: "The word 'Zealous' means:", options: ["A) Indifferent", "B) Very jealous", "C) Having or showing great energy and enthusiasm", "D) Overly cautious"], correct: "C", explanation: "Zealous means having or showing great enthusiasm in pursuit of a cause." },
  { q: "The word 'Antagonise' means to:", options: ["A) Support actively", "B) Cause someone to become hostile", "C) Analyse carefully", "D) Work alongside"], correct: "B", explanation: "Antagonise means to cause someone to become hostile." },
  { q: "The word 'Brevity' means:", options: ["A) Extreme length", "B) Conciseness and shortness of expression", "C) Bravery", "D) Clarity of thought"], correct: "B", explanation: "Brevity means concise and exact use of words in writing or speech." },
  { q: "To 'Curb' spending means to:", options: ["A) Increase it sharply", "B) Monitor it", "C) Restrict or limit it", "D) Transfer it"], correct: "C", explanation: "Curb means to keep something under control; to restrain." },
  { q: "The word 'Daunting' means:", options: ["A) Easy and straightforward", "B) Seeming difficult to deal with; intimidating", "C) Exciting and thrilling", "D) Unclear and confusing"], correct: "B", explanation: "Daunting means seeming difficult to deal with in prospect; intimidating." },
  { q: "To 'Elicit' a response means to:", options: ["A) Ignore it", "B) Suppress it", "C) Draw it out or evoke it", "D) Copy it"], correct: "C", explanation: "Elicit means to draw out or evoke a response or reaction." },
  { q: "The word 'Futile' means:", options: ["A) Highly productive", "B) Producing no useful result; pointless", "C) Future-oriented", "D) Partially successful"], correct: "B", explanation: "Futile means incapable of producing any useful result; pointless." },
  { q: "To 'Galvanise' people means to:", options: ["A) Discourage them", "B) Shock or excite them into taking action", "C) Pay them", "D) Educate them"], correct: "B", explanation: "Galvanise means to shock or excite someone into taking action." },
  { q: "The word 'Hierarchy' refers to:", options: ["A) A democratic system", "B) A system in which people are ranked according to status", "C) A religious ceremony", "D) An economic model"], correct: "B", explanation: "Hierarchy means a system in which people or groups are ranked above each other." },
  { q: "The word 'Impede' means to:", options: ["A) Support", "B) Speed up", "C) Delay or block", "D) Create"], correct: "C", explanation: "Impede means to delay or block the progress or movement of." },
  { q: "To 'Jeopardise' something means to:", options: ["A) Improve it", "B) Put it at risk of harm or failure", "C) Fund it", "D) Evaluate it"], correct: "B", explanation: "Jeopardise means to put something into a situation where it may be lost or harmed." },
  { q: "The word 'Laudable' means:", options: ["A) Worthy of criticism", "B) Deserving praise and commendation", "C) Loud and noisy", "D) Average"], correct: "B", explanation: "Laudable means deserving praise and commendation." },
  { q: "To 'Marginalise' a group means to:", options: ["A) Celebrate them", "B) Give them more power", "C) Treat them as unimportant or peripheral", "D) Educate them"], correct: "C", explanation: "Marginalise means to treat a person or group as insignificant or peripheral." },
  { q: "The word 'Nuance' means:", options: ["A) A loud noise", "B) A subtle difference in meaning or expression", "C) A strong argument", "D) A type of colour"], correct: "B", explanation: "Nuance means a subtle difference in or shade of meaning or expression." },
  { q: "To 'Overhaul' a system means to:", options: ["A) Maintain it as it is", "B) Destroy it completely", "C) Examine and repair or improve it thoroughly", "D) Copy it"], correct: "C", explanation: "Overhaul means to take apart and examine for repair; to redesign completely." },
  { q: "To 'Reconcile' two ideas means to:", options: ["A) Prove one is wrong", "B) Show how they are compatible despite differences", "C) Ignore the differences", "D) Replace one with the other"], correct: "B", explanation: "Reconcile means to make two apparently conflicting things consistent." },
  { q: "The word 'Sporadic' means:", options: ["A) Regular and frequent", "B) Very intense", "C) Occurring at irregular intervals", "D) Nationwide"], correct: "C", explanation: "Sporadic means occurring at irregular intervals or only in a few places." },
  { q: "To 'Transcend' limitations means to:", options: ["A) Accept them", "B) Ignore them", "C) Go beyond them", "D) Measure them"], correct: "C", explanation: "Transcend means to be or go beyond the range or limits of something." },
  { q: "To 'Validate' a claim means to:", options: ["A) Question it", "B) Ignore it", "C) Check or prove that it is accurate or legitimate", "D) Summarise it"], correct: "C", explanation: "Validate means to demonstrate or support the truth or value of something." },
  { q: "The word 'Wane' means to:", options: ["A) Grow stronger", "B) Decrease in vigour, power, or extent", "C) Remain stable", "D) Shine brightly"], correct: "B", explanation: "Wane means to decrease in vigour, power, or extent; to decline." },
  { q: "The word 'Astute' means:", options: ["A) Careless and reckless", "B) Having an ability to assess situations accurately; shrewd", "C) Very honest", "D) Well-educated"], correct: "B", explanation: "Astute means having shrewd good judgement." },
  { q: "To 'Bolster' confidence means to:", options: ["A) Reduce it", "B) Measure it", "C) Support and strengthen it", "D) Transfer it"], correct: "C", explanation: "Bolster means to support or strengthen." },
  { q: "To 'Disseminate' information means to:", options: ["A) Collect it", "B) Spread it widely", "C) Hide it", "D) Summarise it"], correct: "B", explanation: "Disseminate means to spread information, ideas, or knowledge widely." },
  { q: "The word 'Emulate' means to:", options: ["A) Criticise someone", "B) Try to equal or surpass by imitation", "C) Misunderstand someone", "D) Replace someone"], correct: "B", explanation: "Emulate means to match or surpass by imitation." },
  { q: "The word 'Gratuitous' means:", options: ["A) Deserved and justified", "B) Uncalled for; lacking good reason", "C) Generous and kind", "D) Free of charge"], correct: "B", explanation: "Gratuitous means uncalled for; lacking good reason; unwarranted." },
  { q: "To 'Harbour' resentment means to:", options: ["A) Express it openly", "B) Resolve it quickly", "C) Keep or conceal it over time", "D) Ignore it"], correct: "C", explanation: "Harbour means to keep a thought or feeling secretly in one's mind." },
  { q: "The word 'Impetus' means:", options: ["A) A barrier to progress", "B) A force or energy behind something", "C) A negative reaction", "D) A type of law"], correct: "B", explanation: "Impetus means the force or energy with which a body moves; a driving force." },
  { q: "To 'Juxtapose' two ideas means to:", options: ["A) Combine them into one", "B) Place them close together to highlight differences", "C) Prove one is superior", "D) Ignore one of them"], correct: "B", explanation: "Juxtapose means to place two things side by side for comparison or contrast." },
  { q: "The word 'Lament' means to:", options: ["A) Celebrate", "B) Analyse carefully", "C) Express grief or regret about something", "D) Correct an error"], correct: "C", explanation: "Lament means to express passionate grief or regret." },
  { q: "The word 'Negligible' means:", options: ["A) Very significant", "B) Careless and irresponsible", "C) So small as to be unimportant", "D) Impossible to measure"], correct: "C", explanation: "Negligible means so small or unimportant as to be not worth considering." },
  { q: "To 'Offset' the cost of something means to:", options: ["A) Increase it further", "B) Transfer it to someone else", "C) Counterbalance or compensate for it", "D) Hide it"], correct: "C", explanation: "Offset means to counterbalance the effect of something." },
  { q: "The word 'Paramount' means:", options: ["A) Of secondary importance", "B) More important than anything else", "C) A famous film studio", "D) Completely equal"], correct: "B", explanation: "Paramount means more important than anything else; supreme." },
  { q: "To 'Rebuke' someone means to:", options: ["A) Congratulate them", "B) Ignore them", "C) Express sharp disapproval of their behaviour", "D) Assist them"], correct: "C", explanation: "Rebuke means to express sharp disapproval or criticism of someone." },
  { q: "The word 'Sovereign' means:", options: ["A) Foreign and external", "B) Possessing supreme or ultimate power", "C) A type of currency only", "D) Dependent on another nation"], correct: "B", explanation: "Sovereign means possessing supreme or ultimate power." },
  { q: "To 'Truncate' a report means to:", options: ["A) Expand it further", "B) Shorten it by cutting off a part", "C) Translate it", "D) Publish it"], correct: "B", explanation: "Truncate means to shorten something by cutting off the top or end." },
  { q: "To 'Vindicate' someone means to:", options: ["A) Accuse them", "B) Punish them", "C) Clear them of blame or suspicion", "D) Monitor them"], correct: "C", explanation: "Vindicate means to clear someone of blame or suspicion." },
  { q: "The word 'Wield' power means to:", options: ["A) Lose it", "B) Share it equally", "C) Hold and exercise it", "D) Transfer it legally"], correct: "C", explanation: "Wield means to have and use power or influence." },
  { q: "To 'Exacerbate' tensions means to:", options: ["A) Reduce them", "B) Measure them", "C) Make them worse", "D) Resolve them"], correct: "C", explanation: "Exacerbate means to make a problem, bad situation, or negative feeling worse." },
  { q: "A 'Comprehensive' plan is one that is:", options: ["A) Brief and simple", "B) Expensive", "C) Complete and including all aspects", "D) Temporary"], correct: "C", explanation: "Comprehensive means complete; including all aspects of something." },
  { q: "To 'Perpetuate' a myth means to:", options: ["A) Disprove it", "B) Make it continue indefinitely", "C) Study its origins", "D) Ignore it"], correct: "B", explanation: "Perpetuate means to make something continue indefinitely." },
  { q: "The word 'Reticent' means:", options: ["A) Very talkative", "B) Not revealing one's thoughts readily; reserved", "C) Regretful", "D) Relevant"], correct: "B", explanation: "Reticent means not revealing one's thoughts or feelings readily." },
  { q: "The word 'Shrewd' means:", options: ["A) Careless", "B) Having sharp powers of judgement; astute", "C) Cruel and harsh", "D) Generous"], correct: "B", explanation: "Shrewd means having sharp judgement; astute." },
  { q: "To 'Stifle' creativity means to:", options: ["A) Encourage it", "B) Measure it", "C) Suppress or constrain it", "D) Transfer it"], correct: "C", explanation: "Stifle means to suppress or constrain." },
  { q: "The word 'Tenuous' means:", options: ["A) Very strong", "B) Very thin; weak; with little substance", "C) Obvious and clear", "D) Long and complex"], correct: "B", explanation: "Tenuous means very weak or slight; having little substance or validity." },
  { q: "To 'Usurp' power means to:", options: ["A) Share it fairly", "B) Lose it gradually", "C) Take it illegally or by force", "D) Earn it through work"], correct: "C", explanation: "Usurp means to take a position of power illegally or by force." },
  { q: "The word 'Verbose' means:", options: ["A) Concise and brief", "B) Using more words than necessary", "C) Technically complex", "D) Formal and academic"], correct: "B", explanation: "Verbose means using or expressed in more words than are needed." },
  { q: "The word 'Acrimonious' means:", options: ["A) Friendly and warm", "B) Bitter and angry", "C) Productive and efficient", "D) Neutral and fair"], correct: "B", explanation: "Acrimonious means angry and bitter, especially in speech or manner." },
  { q: "To 'Buttress' an argument means to:", options: ["A) Destroy it", "B) Repeat it unnecessarily", "C) Strengthen or support it", "D) Summarise it"], correct: "C", explanation: "Buttress means to increase the strength of or give support to." },
  { q: "The word 'Clandestine' means:", options: ["A) Open and public", "B) Kept secret, especially because it is illicit", "C) Celebrated widely", "D) Officially approved"], correct: "B", explanation: "Clandestine means kept secret because it is illicit." },
  { q: "To 'Deflect' criticism means to:", options: ["A) Accept it fully", "B) Cause it to change direction or have less effect", "C) Invite more criticism", "D) Record it"], correct: "B", explanation: "Deflect means to cause something to change direction or diminish its impact." },
  { q: "The word 'Elucidate' means to:", options: ["A) Make something more complicated", "B) Ignore a topic", "C) Make something clear; explain", "D) Contradict an idea"], correct: "C", explanation: "Elucidate means to make something clear; to explain." },
  { q: "To 'Foster' a sense of community means to:", options: ["A) Destroy it", "B) Study it", "C) Encourage its development and growth", "D) Transfer it"], correct: "C", explanation: "Foster means to encourage the development of something." },
  { q: "The word 'Groundbreaking' means:", options: ["A) Destructive", "B) Innovative and pioneering; introducing new ideas", "C) Very expensive", "D) Dangerous"], correct: "B", explanation: "Groundbreaking means innovative; introducing new ideas or methods." },
  { q: "The word 'Holistic' means:", options: ["A) Focused only on one aspect", "B) Dealing with the whole of something, not just its parts", "C) Religious in nature", "D) Traditional and conservative"], correct: "B", explanation: "Holistic means characterised by the belief that the parts of something are interconnected." },
  { q: "To 'Infer' something from data means to:", options: ["A) Present it clearly", "B) Deduce or conclude it from evidence", "C) Ignore it", "D) Measure it precisely"], correct: "B", explanation: "Infer means to deduce a fact or conclusion from evidence and reasoning." },
  { q: "The word 'Jarring' means:", options: ["A) Harmonious", "B) Causing a physical shock", "C) Incongruous or disturbing", "D) Slightly different"], correct: "C", explanation: "Jarring means incongruous in a way that causes shock or discomfort." },
  { q: "To 'Leverage' a position means to:", options: ["A) Lose an advantage", "B) Use it to maximum advantage", "C) Transfer responsibility", "D) Defend it aggressively"], correct: "B", explanation: "Leverage means to use something to maximum advantage." },
  { q: "The word 'Mundane' means:", options: ["A) Exciting and unusual", "B) Global in scope", "C) Lacking interest or excitement; ordinary", "D) Financial in nature"], correct: "C", explanation: "Mundane means lacking interest or excitement; dull; ordinary." },
  { q: "To 'Nullify' a contract means to:", options: ["A) Sign it", "B) Extend it", "C) Make it legally void or invalid", "D) Summarise it"], correct: "C", explanation: "Nullify means to make legally null and void; to invalidate." },
  { q: "The word 'Overt' means:", options: ["A) Hidden and secret", "B) Done openly; not secret", "C) Strongly negative", "D) Technical and complex"], correct: "B", explanation: "Overt means done openly; not secret or hidden." },
  { q: "To 'Polarise' opinion means to:", options: ["A) Unite people around one view", "B) Divide people into two opposing groups", "C) Moderate views on both sides", "D) Ignore public opinion"], correct: "B", explanation: "Polarise means to divide into two sharply contrasting groups or opinions." },
  { q: "To 'Rectify' an error means to:", options: ["A) Repeat it", "B) Identify it", "C) Put it right; correct it", "D) Hide it"], correct: "C", explanation: "Rectify means to put right; correct." },
  { q: "The word 'Serene' means:", options: ["A) Anxious and troubled", "B) Calm, peaceful, and untroubled", "C) Bright and colourful", "D) Strict and demanding"], correct: "B", explanation: "Serene means calm, peaceful, and untroubled." },
  { q: "To 'Thwart' someone's plans means to:", options: ["A) Support them fully", "B) Analyse them", "C) Prevent them from succeeding", "D) Improve them"], correct: "C", explanation: "Thwart means to prevent someone from accomplishing something." },
  { q: "The word 'Undermine' is closest in meaning to:", options: ["A) Support", "B) Measure", "C) Weaken gradually", "D) Remove completely"], correct: "C", explanation: "Undermine means to erode the base or foundation of; to weaken gradually." }
); // end vocab.push (100 new)

// ── 100 New GRAMMAR MCQs ──────────────────────────────────────────────
IELTS_MCQ_BANK.grammar.push(
  { q: "The bridge __ before the storm arrived.", options: ["A) had been repaired", "B) has been repaired", "C) was repaired", "D) repaired"], correct: "A", explanation: "Past perfect passive: 'had been + past participle' for an action before another past event." },
  { q: "Governments are responsible __ ensuring clean drinking water.", options: ["A) to", "B) at", "C) for", "D) with"], correct: "C", explanation: "'Responsible for' is the correct dependent preposition." },
  { q: "Only by working together __ the problem be solved.", options: ["A) the problem can", "B) can the problem", "C) the problem will", "D) will the problem can"], correct: "B", explanation: "'Only by' requires subject-auxiliary inversion: 'can the problem'." },
  { q: "I wish I __ speak three languages fluently.", options: ["A) can", "B) will", "C) could", "D) would"], correct: "C", explanation: "'Wish + could' expresses a desire about a present ability you don't have." },
  { q: "She is capable __ solving very complex problems.", options: ["A) to solve", "B) of solving", "C) to solving", "D) solve"], correct: "B", explanation: "After 'capable of', use a gerund: 'of solving'." },
  { q: "This time next week, the scientists __ the results.", options: ["A) will analyse", "B) analyse", "C) will be analysing", "D) are analysing"], correct: "C", explanation: "Future continuous (will be + -ing) describes an action in progress at a future point." },
  { q: "The situation is __ we initially expected.", options: ["A) more worse than", "B) worse than", "C) worst than", "D) more bad than"], correct: "B", explanation: "'Worse than' is the correct comparative of 'bad'. Never use 'more worse'." },
  { q: "She asked me where I __ my degree.", options: ["A) studied", "B) had studied", "C) study", "D) was study"], correct: "B", explanation: "Reported question shifts tense: 'had studied' (past perfect) for past simple 'studied'." },
  { q: "Scientists are studying __ Sun's magnetic field.", options: ["A) a", "B) an", "C) the", "D) no article"], correct: "C", explanation: "Unique nouns ('the Sun', 'the Moon', 'the Earth') always take 'the'." },
  { q: "He taught __ to play the piano.", options: ["A) him", "B) himself", "C) his", "D) he"], correct: "B", explanation: "Reflexive pronoun 'himself' is used when the subject and object are the same person." },
  { q: "It is essential that every student __ the examination.", options: ["A) passes", "B) will pass", "C) pass", "D) passed"], correct: "C", explanation: "After 'it is essential/vital/important + that', use the subjunctive base form (pass)." },
  { q: "He speaks __ he knows everything about the topic.", options: ["A) as if", "B) like", "C) such as", "D) alike"], correct: "A", explanation: "'As if' introduces an unreal or hypothetical comparison in formal English." },
  { q: "If the government __ more funding to education, outcomes __ significantly.", options: ["A) provides / improve", "B) provided / would improve", "C) will provide / improve", "D) provided / will improve"], correct: "B", explanation: "Second conditional: past simple in if-clause, would + base verb in result clause." },
  { q: "Traffic pollution has increased. __, the number of respiratory illnesses has risen.", options: ["A) However", "B) Moreover", "C) Consequently", "D) Although"], correct: "C", explanation: "'Consequently' introduces a result or consequence — a formal cause-effect linker." },
  { q: "This issue __ addressed immediately by the authorities.", options: ["A) should be", "B) should being", "C) should is", "D) must being"], correct: "A", explanation: "Modal passive: modal + 'be' + past participle (should be addressed)." },
  { q: "The project will succeed __ all team members cooperate.", options: ["A) unless", "B) despite", "C) provided that", "D) although"], correct: "C", explanation: "'Provided that' means 'on the condition that' — a formal conditional linker." },
  { q: "__ economic growth, the country performed well last year.", options: ["A) In terms of", "B) In terms for", "C) In regard with", "D) With terms of"], correct: "A", explanation: "'In terms of' is the fixed phrase used to specify the aspect being discussed." },
  { q: "Which sentence is grammatically incorrect?", options: ["A) This equipment belongs to the university.", "B) She owns three properties.", "C) The results are seeming positive.", "D) I understand your concern."], correct: "C", explanation: "'Seem' is a stative verb and cannot be used in continuous tenses." },
  { q: "The report __ last week contained significant errors.", options: ["A) published", "B) which publishing", "C) publishing", "D) that publish"], correct: "A", explanation: "Reduced passive relative clause: 'published' = 'which was published'." },
  { q: "__ the government __ the private sector must invest in infrastructure.", options: ["A) Either / or", "B) Neither / nor", "C) Both / and", "D) Not only / also"], correct: "C", explanation: "'Both A and B' is used to join two elements inclusively." },
  { q: "Success in IELTS depends largely __ consistent practice.", options: ["A) at", "B) for", "C) on", "D) with"], correct: "C", explanation: "'Depend on' is the fixed prepositional collocation." },
  { q: "Which sentence correctly uses the present perfect?", options: ["A) She has graduated in 2020.", "B) She graduated in 2020.", "C) She has graduated last year.", "D) She has graduate already."], correct: "B", explanation: "When a specific past time is given (in 2020), use simple past, not present perfect." },
  { q: "Urban populations are growing rapidly. __, rural communities are declining.", options: ["A) In addition", "B) Therefore", "C) In contrast", "D) Furthermore"], correct: "C", explanation: "'In contrast' introduces a contrasting idea — a key cohesion device." },
  { q: "The pollution was __ severe __ the government declared a health emergency.", options: ["A) very / that", "B) so / that", "C) too / that", "D) such / that"], correct: "B", explanation: "'So + adjective + that' expresses a degree resulting in a consequence." },
  { q: "There are __ opportunities for young people in rural areas.", options: ["A) less", "B) fewer", "C) little", "D) much"], correct: "B", explanation: "'Fewer' is used with countable nouns (opportunities); 'less' with uncountable." },
  { q: "It was __ significant discovery that it was reported worldwide.", options: ["A) so", "B) such", "C) such a", "D) so a"], correct: "C", explanation: "'Such a/an + adjective + noun' introduces a result: 'such a significant discovery'." },
  { q: "__ facing many obstacles, she completed her PhD.", options: ["A) Despite of", "B) Although", "C) Despite", "D) In spite"], correct: "C", explanation: "'Despite + gerund (facing)' expresses contrast without a full clause." },
  { q: "The authorities __ acted sooner — the situation was preventable.", options: ["A) should have", "B) must have", "C) could be", "D) might be"], correct: "A", explanation: "'Should have + past participle' expresses criticism about a past action not taken." },
  { q: "Which sentence punctuates a fronted adverbial correctly?", options: ["A) In recent years healthcare costs have risen sharply.", "B) In recent years, healthcare costs have risen sharply.", "C) In recent years healthcare costs, have risen sharply.", "D) In recent years; healthcare costs have risen sharply."], correct: "B", explanation: "A fronted adverbial phrase is followed by a comma before the main clause." },
  { q: "Which option correctly nominalises the verb 'contribute'?", options: ["A) The government's contribute to education", "B) The government's contributing to education", "C) The government's contribution to education", "D) The government's contributed to education"], correct: "C", explanation: "Nominalisation turns a verb into a noun: 'contribute' becomes 'contribution'." },
  { q: "The majority voted __ the new environmental policy.", options: ["A) in favour of", "B) in favour for", "C) for favour of", "D) of favour for"], correct: "A", explanation: "'In favour of' is the fixed prepositional phrase meaning 'in support of'." },
  { q: "Had the researchers followed the protocol, the results __ more reliable.", options: ["A) would have been", "B) will have been", "C) would be", "D) are"], correct: "A", explanation: "Inverted third conditional: 'Had + subject + past participle, would + have + past participle'." },
  { q: "Developed nations emit more carbon per capita, __ developing nations emit far less.", options: ["A) however", "B) whereas", "C) therefore", "D) besides"], correct: "B", explanation: "'Whereas' links two contrasting clauses within the same sentence." },
  { q: "Which adjective order is correct?", options: ["A) a wooden small ancient table", "B) a small ancient wooden table", "C) an ancient small wooden table", "D) a wooden ancient small table"], correct: "B", explanation: "Adjective order: size then age then material (small ancient wooden)." },
  { q: "Men are still paid more than women in many industries. __, women now outnumber men in universities.", options: ["A) Similarly", "B) As a result", "C) By contrast", "D) In addition"], correct: "C", explanation: "'By contrast' introduces a contrasting fact in the next sentence." },
  { q: "The CEO __ the annual report prepared by the finance team.", options: ["A) did have", "B) had", "C) got", "D) Both B and C are correct"], correct: "D", explanation: "Both 'had' and 'got' are correct in causative structures (have/get + object + past participle)." },
  { q: "Suppose the funding __ cut — what would the consequences be?", options: ["A) is", "B) was", "C) were", "D) will be"], correct: "C", explanation: "'Suppose + were' (subjunctive) introduces a hypothetical situation." },
  { q: "She revised her essay carefully __ avoid any grammatical errors.", options: ["A) so that", "B) so as to", "C) in order that", "D) for"], correct: "B", explanation: "'So as to + infinitive' expresses purpose — formal alternative to 'in order to'." },
  { q: "Which phrase is most appropriate to begin a conclusion in IELTS Task 2?", options: ["A) To sum up,", "B) So,", "C) Anyway,", "D) As I said,"], correct: "A", explanation: "'To sum up' is a formal discourse marker used to introduce a conclusion." },
  { q: "Which sentence is grammatically standard in formal English?", options: ["A) There isn't no evidence to support this.", "B) There is no evidence to support this.", "C) There isn't none of the evidence.", "D) There is not no evidence."], correct: "B", explanation: "Double negatives are grammatically non-standard in formal English." },
  { q: "__ science has transformed our understanding of the universe.", options: ["A) A", "B) The", "C) An", "D) No article"], correct: "D", explanation: "No article for abstract nouns used in a general sense (science, art, technology)." },
  { q: "__ recent studies, screen time has increased significantly among teenagers.", options: ["A) According to", "B) According with", "C) Due to", "D) Owing with"], correct: "A", explanation: "'According to' is the fixed phrase used to cite a source." },
  { q: "Researchers __ the effects of social media for the past decade.", options: ["A) study", "B) have studied", "C) have been studying", "D) studied"], correct: "C", explanation: "Present perfect continuous (have been + -ing) emphasises duration of an ongoing activity." },
  { q: "The issue is not a lack of funding, __ a lack of coordination.", options: ["A) instead", "B) but rather", "C) however", "D) yet"], correct: "B", explanation: "'Not A, but rather B' is a formal structure used to correct or redirect an idea." },
  { q: "The government reduced taxes __ businesses would invest more.", options: ["A) so that", "B) so as to", "C) in order to", "D) for"], correct: "A", explanation: "'So that + clause' expresses purpose when the subject of each clause is different." },
  { q: "Climate change has a profound impact __ biodiversity.", options: ["A) at", "B) for", "C) on", "D) of"], correct: "C", explanation: "'Impact on' is the correct dependent preposition." },
  { q: "By the time she __ the presentation, the audience had already left.", options: ["A) finished", "B) has finished", "C) had finished", "D) finishes"], correct: "A", explanation: "'By the time + simple past, past perfect' — the leaving happened before the finishing." },
  { q: "Either the manager or the employees __ responsible for the decision.", options: ["A) is", "B) are", "C) was", "D) were"], correct: "B", explanation: "With 'either...or', the verb agrees with the nearer subject (employees = plural)." },
  { q: "After hours of debate, the committee finally __ a consensus.", options: ["A) made", "B) did", "C) reached", "D) had"], correct: "C", explanation: "'Reach a consensus' is the standard academic collocation." },
  { q: "Several factors contribute to urban poverty, __ unemployment, inadequate housing, and lack of education.", options: ["A) such", "B) namely", "C) for example that", "D) that is to"], correct: "B", explanation: "'Namely' is used to specify what has just been mentioned." },
  { q: "__ surprised everyone was the speed of the scientific breakthrough.", options: ["A) That", "B) Which", "C) What", "D) It"], correct: "C", explanation: "'What + clause' is a nominal relative clause used for emphasis in formal writing." },
  { q: "__ last year, unemployment rates have fallen by 2%.", options: ["A) Compared to", "B) In comparison with", "C) Both A and B are correct", "D) Comparing with"], correct: "C", explanation: "Both 'compared to' and 'in comparison with' are correct for comparison." },
  { q: "When she __ the results, she __ that she had won.", options: ["A) saw / realises", "B) saw / realised", "C) sees / realised", "D) had seen / realised"], correct: "B", explanation: "Narrative past: both verbs in simple past when events happen in sequence." },
  { q: "__ we act now, the consequences will be severe.", options: ["A) If", "B) Unless", "C) Provided", "D) Although"], correct: "B", explanation: "'Unless' means 'if not' — it introduces a negative condition." },
  { q: "Many everyday products contain harmful chemicals. __, several common cleaning agents have been linked to respiratory problems.", options: ["A) However", "B) On the contrary", "C) For instance", "D) Nevertheless"], correct: "C", explanation: "'For instance' introduces a specific example of the general claim just made." },
  { q: "The accident __ been avoided if proper safety measures had been followed.", options: ["A) can have", "B) could have", "C) should", "D) might"], correct: "B", explanation: "'Could have + past participle' expresses a past possibility that did not happen." },
  { q: "__ widely accepted that exercise improves mental health.", options: ["A) They are", "B) It has", "C) It is", "D) This is"], correct: "C", explanation: "'It is + adjective + that' is the standard impersonal passive structure." },
  { q: "The professor, __ I most admire, retired last year.", options: ["A) which", "B) that", "C) who", "D) whom"], correct: "D", explanation: "'Whom' is the formal object relative pronoun used as an object." },
  { q: "From the data, we can __ a clear conclusion.", options: ["A) make", "B) do", "C) draw", "D) take"], correct: "C", explanation: "'Draw a conclusion' is the correct academic collocation." },
  { q: "Temperatures have risen by 1.5 degrees. __, glaciers are melting at an alarming rate.", options: ["A) Besides", "B) In contrast", "C) As a consequence", "D) Nevertheless"], correct: "C", explanation: "'As a consequence' introduces a result — a formal cause-effect connector." },
  { q: "__ the findings, further research is clearly needed.", options: ["A) Regarding with", "B) With regard to", "C) In regard with", "D) For regard of"], correct: "B", explanation: "'With regard to' is the correct fixed phrase meaning 'concerning'." },
  { q: "Which sentence uses 'while' to show contrast?", options: ["A) While she was studying, the phone rang.", "B) While urban areas are growing, rural areas are declining.", "C) She listened while he spoke.", "D) While cooking, she listened to music."], correct: "B", explanation: "'While' can show contrast (= whereas) when comparing two different situations." },
  { q: "You can borrow the book __ you return it by Friday.", options: ["A) in case", "B) as long as", "C) although", "D) despite"], correct: "B", explanation: "'As long as' introduces a condition that must be met for the result to occur." },
  { q: "They __ the building inspected before purchasing it.", options: ["A) did have", "B) had had", "C) had", "D) Both B and C are correct"], correct: "D", explanation: "Both 'had had the building inspected' and 'had the building inspected' are correct causatives." },
  { q: "The programme aims to reduce poverty, __ inequality, and promote education.", options: ["A) address", "B) addressing", "C) to address", "D) addressed"], correct: "A", explanation: "Parallel infinitive structure after 'aims to': reduce, address, promote — all base form." },
  { q: "__ the economy to collapse, millions would lose their jobs.", options: ["A) If", "B) Should", "C) Were", "D) Had"], correct: "C", explanation: "'Were the economy to collapse' is an inverted formal conditional — no 'if' needed." },
  { q: "Not until the 20th century __ electricity become widely available.", options: ["A) electricity did", "B) did electricity", "C) electricity does", "D) does electricity"], correct: "B", explanation: "'Not until' requires subject-auxiliary inversion: 'did electricity'." },
  { q: "The company wants to reduce its carbon footprint. __, it has invested in solar energy.", options: ["A) In contrast", "B) Nevertheless", "C) To this end", "D) In addition to this"], correct: "C", explanation: "'To this end' means 'in order to achieve this goal' — a formal cohesion device." },
  { q: "Antibiotic resistance __ a serious threat to global health.", options: ["A) makes", "B) does", "C) poses", "D) gives"], correct: "C", explanation: "'Pose a threat' is the correct academic collocation." },
  { q: "Fossil fuels __ for approximately 80% of global energy consumption.", options: ["A) make up", "B) account", "C) result", "D) Both A and B are correct"], correct: "D", explanation: "Both 'make up' and 'account for' mean 'constitute/represent' and are correct here." },
  { q: "The results were promising, __ further investigation is required.", options: ["A) despite", "B) however", "C) though", "D) whereas"], correct: "C", explanation: "'Though' used mid-sentence as a concessive adverb is acceptable in formal writing." },
  { q: "__ respondents agreed that climate change is a priority.", options: ["A) A majority of", "B) The majority of", "C) The most of", "D) Most of the all"], correct: "B", explanation: "'The majority of' refers to the largest part of a specific group." },
  { q: "He said: 'You had better submit your application today.' In reported speech:", options: ["A) He said I had better to submit my application that day.", "B) He said I had better submit my application that day.", "C) He told me I would better submit my application that day.", "D) He said I better submitted my application that day."], correct: "B", explanation: "'Had better + base verb' does not change in reported speech; 'today' becomes 'that day'." },
  { q: "__ the conference, several groundbreaking papers were presented.", options: ["A) While", "B) During", "C) Whereas", "D) When"], correct: "B", explanation: "'During + noun phrase' (the conference) is correct; 'while' requires a clause." },
  { q: "The rise in obesity is largely attributable __ poor diet and lack of exercise.", options: ["A) at", "B) for", "C) to", "D) by"], correct: "C", explanation: "'Attributable to' is the fixed prepositional phrase." },
  { q: "__ that social media has had a predominantly negative impact on mental health.", options: ["A) Some argue", "B) It is argued", "C) They arguing", "D) It argues"], correct: "B", explanation: "'It is argued that' is the standard impersonal passive reporting structure." },
  { q: "Both the president and the minister __ present at the summit.", options: ["A) was", "B) is", "C) were", "D) has been"], correct: "C", explanation: "'Both A and B' always takes a plural verb." },
  { q: "He cannot afford basic food, __ a university education.", options: ["A) much less", "B) as much as", "C) let alone", "D) Both A and C are correct"], correct: "D", explanation: "Both 'much less' and 'let alone' add a more extreme negative element." },
  { q: "The economy is recovering slowly. Having said that, __ some sectors are thriving.", options: ["A) however", "B) although", "C) there are", "D) but"], correct: "C", explanation: "'Having said that' is a discourse marker; the next clause continues normally." },
  { q: "Economic growth should not come __ the expense __ the environment.", options: ["A) for / of", "B) at / of", "C) in / of", "D) at / for"], correct: "B", explanation: "'At the expense of' is the fixed phrase meaning 'with the sacrifice of'." },
  { q: "__ did the scientists realise the full extent of the damage.", options: ["A) Only then", "B) Only so", "C) Only after", "D) Just then"], correct: "A", explanation: "'Only then + auxiliary + subject' requires inversion: 'Only then did the scientists realise'." },
  { q: "Several factors __ to the decline in biodiversity.", options: ["A) contribute", "B) contribute to", "C) contributing", "D) are contributing for"], correct: "B", explanation: "'Contribute to' is the correct dependent preposition." },
  { q: "The new policy focuses on prevention __ cure.", options: ["A) rather than", "B) as opposed to", "C) instead", "D) Both A and B are correct"], correct: "D", explanation: "Both 'rather than' and 'as opposed to' correctly express contrast with a noun." },
  { q: "Which sentence contains a dangling participle error?", options: ["A) Walking through the park, she found a lost dog.", "B) Having completed the study, the results were published.", "C) After finishing the exam, the students left quietly.", "D) Feeling tired, he went to bed early."], correct: "B", explanation: "Dangling participle: 'Having completed the study' should refer to people, not results." },
  { q: "__ the outcome, the research has significantly advanced the field.", options: ["A) Wherever", "B) Whenever", "C) Whatever", "D) However"], correct: "C", explanation: "'Whatever the outcome' = 'regardless of the outcome' — a formal concession." },
  { q: "The pollution was severe, __ the city declared a state of emergency.", options: ["A) very much that", "B) so much so that", "C) so much as", "D) such much that"], correct: "B", explanation: "'So much so that' emphasises a degree and introduces the result." },
  { q: "The lawyer spoke __ behalf __ her client.", options: ["A) in / of", "B) on / of", "C) for / of", "D) at / for"], correct: "B", explanation: "'On behalf of' is the fixed phrase meaning 'as a representative of'." },
  { q: "You should __ your eyes tested annually.", options: ["A) do", "B) make", "C) get", "D) have done"], correct: "C", explanation: "'Get something done' is the causative structure — get + object + past participle." },
  { q: "__ the challenges, the team completed the project on time.", options: ["A) Notwithstanding", "B) Notwithout", "C) Notwithless", "D) Nottaking"], correct: "A", explanation: "'Notwithstanding' is a formal alternative to 'despite' or 'in spite of'." },
  { q: "Which sentence contains a comma splice error?", options: ["A) The results were inconclusive; further research is needed.", "B) The results were inconclusive, further research is needed.", "C) Although the results were inconclusive, further research is needed.", "D) The results were inconclusive. Further research is needed."], correct: "B", explanation: "A comma splice joins two independent clauses with only a comma — this is a grammatical error." },
  { q: "The plan is unique __ it combines both economic and environmental goals.", options: ["A) because of", "B) in that", "C) because which", "D) by that"], correct: "B", explanation: "'In that' is a formal subordinator meaning 'because of the fact that'." },
  { q: "The government introduced the reforms __ a view __ reducing inequality.", options: ["A) to / for", "B) with / to", "C) for / of", "D) at / to"], correct: "B", explanation: "'With a view to + gerund' means with the intention or hope of doing something." },
  { q: "Under no circumstances __ personal data be shared without consent.", options: ["A) personal data should", "B) should personal data", "C) personal data must", "D) must personal data should"], correct: "B", explanation: "'Under no circumstances' requires subject-auxiliary inversion: 'should personal data'." },
  { q: "This is the most significant discovery that scientists __ ever __.", options: ["A) did / make", "B) have / made", "C) had / made", "D) have / make"], correct: "B", explanation: "After superlatives, use present perfect: 'the most...that + have + past participle'." },
  { q: "__ the new evidence, the court has agreed to review the case.", options: ["A) In light of", "B) In sight of", "C) On light of", "D) With light to"], correct: "A", explanation: "'In light of' means 'taking into account' — a formal academic phrase." },
  { q: "The company's policies are __ line __ international standards.", options: ["A) on / with", "B) in / for", "C) in / with", "D) at / with"], correct: "C", explanation: "'In line with' is the fixed phrase meaning 'in accordance with'." },
  { q: "Either the candidate accepts the terms, __ the contract will be terminated.", options: ["A) or", "B) nor", "C) and", "D) but"], correct: "A", explanation: "'Either A or B' is the standard correlative conjunction for alternatives." }
); // end grammar.push (100 new)

// ── 50 New MIXED MCQs ─────────────────────────────────────────────────
IELTS_MCQ_BANK.mixed.push(
  { q: "Which sentence correctly uses a formal impersonal structure for IELTS Task 2?", options: ["A) People think that nuclear energy is risky.", "B) It is generally acknowledged that nuclear energy carries significant risks.", "C) I think nuclear energy is really risky.", "D) Everyone says nuclear energy is bad."], correct: "B", explanation: "Impersonal passive structures ('It is acknowledged that') are preferred in academic writing." },
  { q: "Which word correctly completes: 'The findings __ a strong correlation between sleep deprivation and poor academic performance.'", options: ["A) show", "B) reveal", "C) demonstrate", "D) All of the above are correct"], correct: "D", explanation: "Show, reveal, and demonstrate are all appropriate academic verbs for reporting findings." },
  { q: "In IELTS Writing Task 1, which phrase should you use to describe a gradual decline?", options: ["A) fell off a cliff", "B) declined steadily", "C) went really low", "D) came down slowly slowly"], correct: "B", explanation: "'Declined steadily' uses precise academic language — avoid informal phrasing." },
  { q: "Which option correctly paraphrases 'Young people use social media excessively'?", options: ["A) Young people use social media excessively.", "B) Social media is used to excess by the younger generation.", "C) Youths are addicted all day to social media.", "D) Young people use too much social media every day."], correct: "B", explanation: "Good paraphrasing uses passive voice, synonyms (younger generation), and restructuring." },
  { q: "Which word is a collocation with 'evidence'?", options: ["A) make evidence", "B) do evidence", "C) provide evidence", "D) give evidence to"], correct: "C", explanation: "'Provide evidence' (or 'present', 'gather', 'cite' evidence) are the correct collocations." },
  { q: "Choose the most formal way to write 'the main reason why crime is rising':", options: ["A) The key factor behind the rise in crime", "B) The main reason crime is going up", "C) The biggest thing making crime worse", "D) Why crime is getting higher"], correct: "A", explanation: "'The key factor behind' is a formal, academic phrasing using nominalisation." },
  { q: "Which sentence is the strongest thesis statement for an IELTS Task 2 opinion essay?", options: ["A) I will discuss both sides of this topic.", "B) This essay will talk about education.", "C) While some argue that technology harms education, this essay contends that its benefits far outweigh the drawbacks.", "D) Technology and education are both very important topics."], correct: "C", explanation: "A strong thesis acknowledges the opposing view and clearly states your position." },
  { q: "Which is NOT a feature of IELTS Band 7 writing?", options: ["A) A range of complex sentence structures", "B) Some errors in grammar and punctuation", "C) Extensive use of bullet points throughout", "D) Accurate use of a varied vocabulary"], correct: "C", explanation: "IELTS essays should be written in paragraphed prose — bullet points are not appropriate." },
  { q: "Which discourse marker correctly introduces an additional point that reinforces the previous one?", options: ["A) On the other hand", "B) However", "C) Moreover", "D) Nevertheless"], correct: "C", explanation: "'Moreover' adds a point that reinforces or builds on the previous one." },
  { q: "Which sentence correctly uses 'whereas' to show contrast?", options: ["A) Whereas it was raining, we stayed indoors.", "B) Whereas urban areas are densely populated, rural areas are sparsely inhabited.", "C) Whereas government is responsible for healthcare.", "D) Whereas the policy was good, and it succeeded."], correct: "B", explanation: "'Whereas' correctly contrasts two parallel clauses with different factual content." },
  { q: "Choose the correct way to introduce a concession in IELTS Task 2:", options: ["A) Admittedly, there are some merits to this argument.", "B) OK, some people think this.", "C) I agree to some extent.", "D) Although I agree a little."], correct: "A", explanation: "'Admittedly' introduces a concession formally — acknowledging the opposing view's merit." },
  { q: "Which academic phrase best introduces a counterargument?", options: ["A) But wait, some people think differently.", "B) Opponents of this view argue that...", "C) Some people don't agree and say...", "D) On the flip side..."], correct: "B", explanation: "'Opponents of this view argue that' is a formal, academic phrase for counterarguments." },
  { q: "In IELTS Task 1, the phrase 'accounted for' is used to:", options: ["A) Explain a reason", "B) Show the proportion or share of a total", "C) Describe a trend over time", "D) Compare two different graphs"], correct: "B", explanation: "'Accounted for' means represented or made up a proportion: 'Coal accounted for 40% of energy use'." },
  { q: "Which phrase expresses cause and effect most formally?", options: ["A) Because of this, things got worse.", "B) This led to a deterioration in outcomes.", "C) So the situation got bad.", "D) Because of the problem, it was bad."], correct: "B", explanation: "'Led to' is a formal cause-effect verb using nominalisation ('deterioration in outcomes')." },
  { q: "Which sentence avoids the common IELTS error of overgeneralisation?", options: ["A) All people believe that education is the key to success.", "B) Technology always improves people's lives.", "C) A large proportion of researchers suggest that physical activity has positive health outcomes.", "D) Everyone knows that pollution is caused by factories."], correct: "C", explanation: "Hedging language ('a large proportion', 'suggest') avoids the overgeneralisation band-penalty." },
  { q: "Which option correctly introduces an example in formal writing?", options: ["A) Like, for example Singapore has great transport.", "B) To illustrate this point, Singapore's public transport system serves as a model for urban planning.", "C) For example; Singapore.", "D) An example is, Singapore."], correct: "B", explanation: "'To illustrate this point' introduces a specific example formally and with correct punctuation." },
  { q: "Which feature distinguishes Band 8 writing from Band 6?", options: ["A) Using longer sentences only", "B) Precise collocation, minimal errors, and sophisticated cohesive devices", "C) Writing more paragraphs", "D) Starting every sentence with a linking word"], correct: "B", explanation: "Band 8 writing is characterised by precise vocabulary, near error-free grammar, and sophisticated cohesion." },
  { q: "Choose the best academic alternative to 'get rid of' pollution:", options: ["A) reduce and clean up", "B) eliminate", "C) throw away", "D) get away from"], correct: "B", explanation: "'Eliminate' is a precise, Band 7+ academic verb — avoid informal phrasal verbs like 'get rid of'." },
  { q: "Which sentence demonstrates effective use of nominalisation?", options: ["A) The government decided to reduce taxes, which improved the economy.", "B) The government's decision to reduce taxation resulted in economic improvement.", "C) The government reduced the taxes and the economy got better.", "D) When the government reduced taxes, the economy improved."], correct: "B", explanation: "Nominalisation ('decision', 'taxation', 'improvement') is a key feature of academic writing style." },
  { q: "In the IELTS Speaking test, which approach best demonstrates Band 7 fluency?", options: ["A) Speaking very fast without pausing", "B) Using filler words like 'um' and 'you know' frequently", "C) Speaking at a natural pace with occasional self-correction and minimal hesitation", "D) Memorising and reciting a pre-prepared answer"], correct: "C", explanation: "Band 7 fluency means speaking naturally and coherently with only occasional hesitation." },
  { q: "Which word best completes: 'The two studies produced __ results, making it difficult to draw conclusions.'", options: ["A) same", "B) conflicting", "C) excellent", "D) expected"], correct: "B", explanation: "'Conflicting results' is the precise academic collocation for contradictory findings." },
  { q: "What does IELTS 'Coherence and Cohesion' primarily assess?", options: ["A) The accuracy of grammar only", "B) The range of vocabulary used", "C) How well ideas are organised and connected", "D) The length of the essay"], correct: "C", explanation: "Coherence = logical organisation; Cohesion = use of linking devices and referencing." },
  { q: "Which sentence uses the correct collocation with 'role'?", options: ["A) Education does a vital role in society.", "B) Education makes a vital role in society.", "C) Education plays a vital role in society.", "D) Education gives a vital role in society."], correct: "C", explanation: "'Play a role' is the only correct collocation with 'role'." },
  { q: "Which sentence uses 'albeit' correctly?", options: ["A) The results were positive, albeit with some limitations.", "B) The results were positive albeit they had limitations.", "C) Albeit the results were positive, they had limitations.", "D) The results, albeit positive, but had limitations."], correct: "A", explanation: "'Albeit' means 'although' and is followed by a noun phrase or adjective, not a full clause." },
  { q: "Which is an example of a complex sentence appropriate for Band 7+ IELTS writing?", options: ["A) Climate change is bad. It affects everyone.", "B) Climate change is a problem and it affects everyone.", "C) Although the effects of climate change vary by region, the overall impact on biodiversity is undeniable.", "D) Climate change affects everybody in the world today."], correct: "C", explanation: "Complex sentences with subordinating conjunctions and precise vocabulary characterise Band 7+ writing." },
  { q: "Which option best describes the purpose of a 'hook' sentence in an IELTS Task 2 introduction?", options: ["A) To state your conclusion", "B) To provide background context that engages the reader", "C) To list your main points", "D) To define every key word in the question"], correct: "B", explanation: "A hook introduces the topic with context — it should engage the reader before the thesis." },
  { q: "Choose the correct collocation: 'The report __ light on the causes of urban poverty.'", options: ["A) shed", "B) threw", "C) gave", "D) made"], correct: "A", explanation: "'Shed light on' is the fixed academic collocation meaning to make something clearer." },
  { q: "Which word correctly completes: 'The data __ that investment in education yields long-term economic benefits.'", options: ["A) suggest", "B) suggests", "C) are suggesting", "D) suggested"], correct: "B", explanation: "'Data' in academic writing often takes a singular verb in contemporary usage: 'the data suggests'." },
  { q: "Which is the best topic sentence for a body paragraph arguing that technology improves education?", options: ["A) Technology is very good for students.", "B) One significant advantage of technology in education is its ability to personalise learning experiences.", "C) Technology helps kids learn better.", "D) I think technology is useful in schools."], correct: "B", explanation: "A Band 7+ topic sentence is specific, formal, and introduces the paragraph's central argument." },
  { q: "In IELTS Speaking Part 2, what should you do during the one-minute preparation time?", options: ["A) Write a full speech to read aloud", "B) Make brief notes on each bullet point of the cue card", "C) Memorise statistics and facts", "D) Practise your pronunciation"], correct: "B", explanation: "Use the prep time to jot key words for each bullet — it gives your talk a clear structure." },
  { q: "Which sentence correctly avoids a split infinitive in formal writing?", options: ["A) The aim is to quickly resolve the issue.", "B) The aim is to resolve the issue quickly.", "C) The aim is quickly to resolve the issue.", "D) Both B and C avoid the split infinitive."], correct: "D", explanation: "A split infinitive places an adverb between 'to' and the verb. B and C both avoid this." },
  { q: "Which is the correct use of 'the former' and 'the latter'?", options: ["A) Economic growth and sustainability are important. The former refers to sustainability.", "B) Economic growth and sustainability are important. The latter refers to sustainability.", "C) Economic growth and sustainability are important. The former refers to both.", "D) 'The former' and 'the latter' cannot be used in academic writing."], correct: "B", explanation: "'The former' = the first mentioned; 'the latter' = the second mentioned (sustainability)." },
  { q: "Which academic verb best replaces 'go up' in a graph description?", options: ["A) escalate", "B) rise", "C) surge", "D) All of the above"], correct: "D", explanation: "Escalate, rise, and surge all formally describe an increase — choice depends on speed and degree." },
  { q: "Which sentence uses the passive voice most appropriately in academic writing?", options: ["A) They did the experiment three times.", "B) We found the results to be inconclusive.", "C) The experiment was conducted on three separate occasions.", "D) Someone performed the experiment."], correct: "C", explanation: "Academic writing prefers passive voice to remove personal subjects — 'was conducted' is ideal." },
  { q: "What is the recommended minimum word count for IELTS Task 2?", options: ["A) 150 words", "B) 200 words", "C) 250 words", "D) 300 words"], correct: "C", explanation: "IELTS Task 2 requires a minimum of 250 words. Task 1 requires 150 words." },
  { q: "Which option demonstrates the best lexical range for IELTS Band 7+?", options: ["A) The problem is very big and very serious.", "B) The issue is significant and has considerable implications.", "C) The problem is important and affects many people.", "D) There is a big problem that many people are affected by."], correct: "B", explanation: "Precise, varied vocabulary ('significant', 'considerable implications') characterises Band 7+ lexical resource." },
  { q: "Which of the following is a feature of IELTS Reading question type 'Matching Headings'?", options: ["A) You match statements to paragraphs", "B) You choose the best heading for each paragraph from a list", "C) You fill in gaps in a table", "D) You write True, False, or Not Given"], correct: "B", explanation: "Matching Headings requires selecting the most appropriate heading from a list for each paragraph." },
  { q: "In IELTS Listening, what does 'NO MORE THAN TWO WORDS' mean?", options: ["A) Write only one word", "B) Write exactly two words", "C) Write one or two words (not three or more)", "D) Write two words minimum"], correct: "C", explanation: "'No more than two words' means your answer can be one word or two words, but not three." },
  { q: "Choose the best formal alternative to 'nowadays':", options: ["A) these days", "B) in the present era", "C) right now", "D) at this point in time we live in"], correct: "B", explanation: "'In the present era' is formal; 'nowadays' and 'these days' are informal for IELTS Academic." },
  { q: "Which of these is an example of 'hedging' in academic writing?", options: ["A) This proves that diet causes cancer.", "B) Research suggests that diet may be linked to certain types of cancer.", "C) Everyone knows that diet causes cancer.", "D) Diet definitely causes cancer according to all scientists."], correct: "B", explanation: "Hedging ('suggests', 'may be linked') avoids overconfident claims — a Band 7+ skill." },
  { q: "Which sentence contains a spelling error?", options: ["A) The government's commitment to sustainability is commendable.", "B) The enviroment requires immediate protection.", "C) Technological innovation drives economic growth.", "D) Globalisation has both advantages and disadvantages."], correct: "B", explanation: "'Environment' is the correct spelling — not 'enviroment'. A common IELTS error." },
  { q: "What does 'Task Achievement' assess in IELTS Writing Task 2?", options: ["A) The number of words written", "B) The quality of spelling and punctuation", "C) Whether the essay fully addresses all parts of the question", "D) The variety of sentence structures used"], correct: "C", explanation: "Task Achievement assesses whether you fully address the task — including both views if asked." },
  { q: "Which sentence uses an appropriate Band 8 structure to present a supporting point?", options: ["A) Also, it is good because people learn more.", "B) Furthermore, it could be argued that access to digital resources significantly enhances educational outcomes.", "C) And another thing is that education gets better.", "D) Plus, technology makes learning good."], correct: "B", explanation: "A Band 8 supporting sentence uses formal linkers, hedging, and precise academic vocabulary." },
  { q: "Which sentence correctly uses an appositive to add information?", options: ["A) Dr Aisha Khan, a leading climate scientist, published a groundbreaking study last year.", "B) Dr Aisha Khan she is a climate scientist published a study.", "C) A climate scientist Dr Aisha Khan published a study.", "D) Dr Aisha Khan published a study, she is a climate scientist."], correct: "A", explanation: "An appositive ('a leading climate scientist') renames or adds information about the noun beside it." },
  { q: "Which word pair correctly completes: 'The __ between rich and poor nations has __ in recent decades.'", options: ["A) gap / widened", "B) difference / enlarged", "C) gap / bigened", "D) divide / largened"], correct: "A", explanation: "'Gap has widened' is the precise collocation — 'enlarged' and 'bigened'/'largened' are incorrect." },
  { q: "In IELTS Speaking, 'Pronunciation' is assessed on:", options: ["A) Having a native-English accent", "B) Speaking without any accent", "C) The ability to be clearly understood, including intonation and word stress", "D) The speed at which you speak"], correct: "C", explanation: "Pronunciation in IELTS is about intelligibility, intonation, and word stress — not having a native accent." },
  { q: "Which sentence correctly uses 'as a result of' to express cause?", options: ["A) As a result of the drought, crop yields fell sharply.", "B) As a result of, the drought caused crop yields to fall.", "C) As a result, the drought of falling crop yields.", "D) The drought, as a result of, fell crop yields."], correct: "A", explanation: "'As a result of + noun phrase' is the correct structure for expressing cause." },
  { q: "Which sentence best demonstrates the use of a concessive clause for Band 7+?", options: ["A) Although poverty is a problem, it still exists.", "B) Even though considerable progress has been made in reducing poverty, significant disparities persist.", "C) Poverty is bad but some progress is happening.", "D) While poverty exists, things are getting better."], correct: "B", explanation: "A Band 7+ concessive clause is specific, uses precise vocabulary, and contrasts meaningfully." },
  { q: "Choose the correct spelling of this commonly misspelled IELTS word:", options: ["A) Goverment", "B) Govornment", "C) Government", "D) Governmant"], correct: "C", explanation: "Government: 'govern' + 'ment' — a very commonly misspelled word in IELTS writing." },
  { q: "Which phrase correctly signals a concluding paragraph in IELTS Task 2?", options: ["A) At last,", "B) In conclusion,", "C) Lastly, I want to say", "D) As I mentioned before,"], correct: "B", explanation: "'In conclusion,' is the standard formal phrase to begin a concluding paragraph in IELTS." }
); // end mixed.push (50 new)

// ── Part 1 — 20 new questions ─────────────────────────────────────────
IELTS_SPEAKING_BANK.part1.push(
  "Do you enjoy cooking at home? What kinds of food do you like to make?",
  "How do you usually celebrate special occasions like birthdays or festivals?",
  "Do you prefer watching films at home or at the cinema? Why?",
  "Have you ever taken a course outside of your regular education? What was it?",
  "How important is punctuality to you? Are you usually on time?",
  "Do you enjoy reading the news? How do you usually keep up with current events?",
  "What do you think is the best way to learn a new language?",
  "How has your hometown changed since you were a child?",
  "Do you prefer working alone or in a group? Why?",
  "What kind of gifts do you prefer to give or receive?",
  "Do you think it is important to have hobbies? What are yours?",
  "How do you feel about doing household chores? Do you have a routine?",
  "Do you enjoy spending time in nature? What do you like to do outdoors?",
  "How often do you exercise, and what type of exercise do you prefer?",
  "Do you think your eating habits have changed as you have grown older?",
  "What do you think makes a good neighbourhood to live in?",
  "Do you enjoy visiting markets or shopping centres? Why?",
  "Have you ever learned a skill from watching online videos? What did you learn?",
  "How do you usually relax after a long or stressful day?",
  "Is there a sport you would like to try that you have never played before?"
); // end part1.push (20 new)

// ── Part 2 — 10 new cue cards ─────────────────────────────────────────
IELTS_SPEAKING_BANK.part2.push(
  "Describe a historical place you have visited or would like to visit. You should say: where it is, why it is historically significant, what you did or would do there, and explain why you find it interesting.",
  "Describe a time when you had to be very patient. You should say: what the situation was, how long you had to wait, how you felt during this time, and explain what you learned from the experience.",
  "Describe a person in your life who is very creative. You should say: who this person is, how you know them, what kind of creative things they do, and explain why you admire their creativity.",
  "Describe a subject you enjoyed studying at school. You should say: what the subject was, who taught it, what you found interesting about it, and explain how it has influenced your life since.",
  "Describe an occasion when you received very helpful advice. You should say: who gave you the advice, what the advice was, what situation you were facing at the time, and explain how the advice helped you.",
  "Describe a time when you tried a new type of food. You should say: what the food was, where you tried it, who you were with, and explain whether you enjoyed it and why.",
  "Describe a goal you have set for yourself recently. You should say: what the goal is, why you set it, what steps you are taking to achieve it, and explain how you will feel if you achieve it.",
  "Describe a public space in your city or town that you enjoy spending time in. You should say: where it is, what people do there, how often you visit it, and explain why you like it.",
  "Describe a time when you had to make a difficult choice between two things. You should say: what the two options were, why the decision was difficult, what you chose in the end, and explain whether you are happy with your decision.",
  "Describe an event in your country that you think is important. You should say: what the event is, when and where it takes place, what happens during it, and explain why you think it is significant."
); // end part2.push (10 new)

// ── Part 3 — 20 new discussion questions ─────────────────────────────
IELTS_SPEAKING_BANK.part3.push(
  "How important do you think it is for governments to invest in preserving historical buildings and monuments?",
  "Do you think patience is a quality that can be taught, or is it something people are born with?",
  "In what ways do you think creativity can be encouraged in schools and workplaces?",
  "Do you think the school curriculum should be more focused on practical skills or academic knowledge?",
  "How has the role of personal advice from family and friends changed in the age of the internet?",
  "To what extent do you think cultural food traditions are important to preserve in a globalised world?",
  "Do you think people today set more ambitious goals than previous generations? Why?",
  "How important is it for cities to maintain green public spaces as they continue to grow?",
  "Do you think the ability to make difficult decisions is a sign of good leadership? Why?",
  "How do large national events and festivals help to shape a country's identity?",
  "Do you think social media platforms should be more strictly regulated? Why or why not?",
  "How do you think the concept of work-life balance has changed in recent decades?",
  "To what extent should individuals be responsible for their own health, rather than governments?",
  "Do you think competitive sport teaches young people valuable life skills?",
  "How has increased global travel affected cultural identity in your opinion?",
  "Do you think it is important for people to continue learning new skills throughout their lives?",
  "What do you think are the most significant challenges facing cities in the 21st century?",
  "How has the relationship between employers and employees changed in recent years?",
  "Do you think art and culture receive enough government funding in your country?",
  "To what extent do you agree that economic growth should be prioritised over environmental protection?"
); // end part3.push (20 new)

// ══════════════════════════════════════════════════════════════════════
//  100 NEW VOCABULARY MCQs — Batch 4 (all unique words)
// ══════════════════════════════════════════════════════════════════════
IELTS_MCQ_BANK.vocab.push(
  { q: "The word 'Ameliorate' means:", options: ["A) To make worse", "B) To make better or more tolerable", "C) To study carefully", "D) To remove completely"], correct: "B", explanation: "Ameliorate means to make something bad or unsatisfactory better." },
  { q: "A 'Benevolent' leader is one who is:", options: ["A) Cruel and strict", "B) Well-meaning and kind", "C) Indifferent to others", "D) Highly ambitious"], correct: "B", explanation: "Benevolent means well-meaning and kindly — often used to describe charitable organisations." },
  { q: "The word 'Capricious' means:", options: ["A) Predictable and steady", "B) Given to sudden changes of mood or behaviour", "C) Extremely careful", "D) Highly intelligent"], correct: "B", explanation: "Capricious means given to sudden and unaccountable changes of mood or behaviour." },
  { q: "To 'Delineate' a boundary means to:", options: ["A) Ignore it", "B) Cross it illegally", "C) Describe or indicate it precisely", "D) Expand it"], correct: "C", explanation: "Delineate means to describe or portray something precisely." },
  { q: "The word 'Equivocal' means:", options: ["A) Perfectly clear", "B) Open to more than one interpretation; ambiguous", "C) Completely false", "D) Strongly argued"], correct: "B", explanation: "Equivocal means open to more than one interpretation — often used to suggest deliberate vagueness." },
  { q: "A 'Frugal' person is someone who:", options: ["A) Spends money freely", "B) Is careful and sparing with money", "C) Is very generous", "D) Is extremely wealthy"], correct: "B", explanation: "Frugal means sparing or economical with money or food." },
  { q: "The word 'Garrulous' means:", options: ["A) Silent and reserved", "B) Excessively talkative", "C) Aggressive and hostile", "D) Calm and thoughtful"], correct: "B", explanation: "Garrulous means excessively talkative, especially on trivial matters." },
  { q: "'Hegemony' refers to:", options: ["A) A type of government", "B) Leadership or dominance of one country or group over others", "C) A form of currency", "D) A legal agreement"], correct: "B", explanation: "Hegemony means leadership or dominance, especially of one country or social group over others." },
  { q: "The word 'Idiosyncratic' means:", options: ["A) Common and ordinary", "B) Peculiar to an individual; distinctive", "C) Highly formal", "D) Scientifically proven"], correct: "B", explanation: "Idiosyncratic means relating to a distinctive or peculiar characteristic of an individual." },
  { q: "'Jargon' refers to:", options: ["A) A type of formal writing", "B) Specialised vocabulary used by a particular group", "C) A grammatical error", "D) A type of argument"], correct: "B", explanation: "Jargon means special words or expressions used by a profession or group that are difficult for others to understand." },
  { q: "The word 'Lethargic' means:", options: ["A) Energetic and active", "B) Lacking energy; sluggish", "C) Highly motivated", "D) Extremely careful"], correct: "B", explanation: "Lethargic means affected by lethargy; sluggish and apathetic." },
  { q: "The word 'Mendacious' means:", options: ["A) Truthful and honest", "B) Not telling the truth; lying", "C) Highly intelligent", "D) Extremely cautious"], correct: "B", explanation: "Mendacious means not telling the truth; lying." },
  { q: "A 'Nonchalant' attitude is one that is:", options: ["A) Anxious and worried", "B) Casually calm and relaxed", "C) Aggressive and forceful", "D) Highly enthusiastic"], correct: "B", explanation: "Nonchalant means feeling or appearing casually calm and relaxed." },
  { q: "To 'Ostracise' someone means to:", options: ["A) Celebrate them", "B) Exclude them from a group", "C) Promote them", "D) Educate them"], correct: "B", explanation: "Ostracise means to exclude someone from a society or group." },
  { q: "A 'Pedantic' person is someone who:", options: ["A) Is very creative", "B) Is excessively concerned with minor details or rules", "C) Is highly practical", "D) Is very generous"], correct: "B", explanation: "Pedantic means excessively concerned with minor details or rules." },
  { q: "The word 'Querulous' means:", options: ["A) Calm and accepting", "B) Complaining in a petulant or whining manner", "C) Highly curious", "D) Extremely logical"], correct: "B", explanation: "Querulous means complaining in a petulant or whining manner." },
  { q: "A 'Recalcitrant' student is one who:", options: ["A) Works very hard", "B) Stubbornly refuses to obey authority", "C) Is very shy", "D) Is highly talented"], correct: "B", explanation: "Recalcitrant means having an obstinately uncooperative attitude." },
  { q: "The word 'Sycophantic' means:", options: ["A) Honest and direct", "B) Excessively flattering to gain favour", "C) Highly critical", "D) Completely neutral"], correct: "B", explanation: "Sycophantic means behaving in an obsequious way to gain advantage." },
  { q: "A 'Taciturn' person is someone who:", options: ["A) Talks constantly", "B) Says very little; reserved in speech", "C) Is very emotional", "D) Is highly opinionated"], correct: "B", explanation: "Taciturn means reserved or uncommunicative in speech; saying little." },
  { q: "The word 'Ubiquitous' most precisely means:", options: ["A) Extremely rare", "B) Present or appearing everywhere simultaneously", "C) Very old", "D) Highly dangerous"], correct: "B", explanation: "Ubiquitous means present, appearing, or found everywhere at the same time." },
  { q: "The word 'Vacuous' means:", options: ["A) Full of meaning", "B) Having or showing a lack of thought or intelligence", "C) Very energetic", "D) Highly organised"], correct: "B", explanation: "Vacuous means having or showing a lack of thought or intelligence; empty." },
  { q: "The word 'Wary' means:", options: ["A) Confident and bold", "B) Feeling or showing caution about possible dangers", "C) Extremely tired", "D) Highly motivated"], correct: "B", explanation: "Wary means feeling or showing caution about possible dangers or problems." },
  { q: "The word 'Xenial' means:", options: ["A) Foreign and strange", "B) Friendly to strangers or guests", "C) Hostile to outsiders", "D) Relating to foreign policy"], correct: "B", explanation: "Xenial means friendly to strangers or guests — from the Greek concept of hospitality." },
  { q: "The word 'Yearn' means:", options: ["A) To feel satisfied", "B) To have an intense longing for something", "C) To work hard", "D) To study carefully"], correct: "B", explanation: "Yearn means to have an intense feeling of longing for something." },
  { q: "The word 'Zeal' means:", options: ["A) Indifference", "B) Great energy or enthusiasm in pursuit of a cause", "C) Extreme caution", "D) Mild interest"], correct: "B", explanation: "Zeal means great energy or enthusiasm in pursuit of a cause or objective." },
  { q: "The word 'Abstruse' means:", options: ["A) Simple and clear", "B) Difficult to understand; obscure", "C) Very common", "D) Highly practical"], correct: "B", explanation: "Abstruse means difficult to understand; obscure." },
  { q: "The word 'Benign' means:", options: ["A) Harmful and dangerous", "B) Gentle and kindly; not harmful", "C) Extremely strict", "D) Highly complex"], correct: "B", explanation: "Benign means gentle and kindly; not harmful in effect." },
  { q: "The word 'Candid' means:", options: ["A) Secretive and evasive", "B) Truthful and straightforward", "C) Highly formal", "D) Extremely cautious"], correct: "B", explanation: "Candid means truthful and straightforward; frank." },
  { q: "The word 'Deft' means:", options: ["A) Clumsy and awkward", "B) Neatly skilful and quick", "C) Extremely slow", "D) Highly theoretical"], correct: "B", explanation: "Deft means neatly skilful and quick in movement or action." },
  { q: "The word 'Ebullient' means:", options: ["A) Quiet and reserved", "B) Cheerful and full of energy", "C) Extremely cautious", "D) Highly formal"], correct: "B", explanation: "Ebullient means cheerful and full of energy." },
  { q: "The word 'Facile' means:", options: ["A) Difficult and complex", "B) Appearing neat and effortless but lacking depth", "C) Highly detailed", "D) Extremely accurate"], correct: "B", explanation: "Facile means appearing neat and effortless but lacking depth or substance." },
  { q: "The word 'Germane' means:", options: ["A) Irrelevant", "B) Relevant and appropriate to the subject", "C) Foreign in origin", "D) Highly technical"], correct: "B", explanation: "Germane means relevant to a subject under consideration." },
  { q: "The word 'Hapless' means:", options: ["A) Very lucky", "B) Unfortunate; unlucky", "C) Extremely happy", "D) Highly skilled"], correct: "B", explanation: "Hapless means unfortunate; unlucky." },
  { q: "The word 'Iconoclast' refers to:", options: ["A) Someone who follows tradition", "B) Someone who attacks cherished beliefs or institutions", "C) A religious leader", "D) A type of artist"], correct: "B", explanation: "An iconoclast is a person who attacks or criticises cherished beliefs or institutions." },
  { q: "The word 'Jocular' means:", options: ["A) Serious and formal", "B) Fond of joking; humorous", "C) Extremely cautious", "D) Highly ambitious"], correct: "B", explanation: "Jocular means fond of or characterised by joking; humorous." },
  { q: "The word 'Kinetic' means:", options: ["A) Relating to stillness", "B) Relating to or resulting from motion", "C) Relating to sound", "D) Relating to colour"], correct: "B", explanation: "Kinetic means relating to or resulting from motion." },
  { q: "The word 'Laconic' means:", options: ["A) Very talkative", "B) Using very few words; brief", "C) Highly emotional", "D) Extremely detailed"], correct: "B", explanation: "Laconic means using very few words; brief and concise." },
  { q: "The word 'Malleable' means:", options: ["A) Rigid and inflexible", "B) Easily influenced or shaped", "C) Extremely hard", "D) Highly resistant"], correct: "B", explanation: "Malleable means easily influenced, trained, or controlled; adaptable." },
  { q: "The word 'Nebulous' means:", options: ["A) Clear and precise", "B) Unclear, vague, or ill-defined", "C) Extremely bright", "D) Highly organised"], correct: "B", explanation: "Nebulous means in the form of a cloud; unclear, vague, or ill-defined." },
  { q: "The word 'Obsequious' means:", options: ["A) Honest and direct", "B) Excessively eager to serve or please", "C) Highly critical", "D) Completely independent"], correct: "B", explanation: "Obsequious means obedient or attentive to an excessive or servile degree." },
  { q: "The word 'Pernicious' means:", options: ["A) Harmless and mild", "B) Having a harmful effect, especially in a gradual way", "C) Extremely beneficial", "D) Highly visible"], correct: "B", explanation: "Pernicious means having a harmful effect, especially in a subtle or gradual way." },
  { q: "The word 'Quandary' means:", options: ["A) A clear solution", "B) A state of uncertainty or perplexity", "C) A type of argument", "D) A mathematical problem"], correct: "B", explanation: "Quandary means a state of perplexity or uncertainty over what to do in a difficult situation." },
  { q: "The word 'Rancour' means:", options: ["A) Goodwill and kindness", "B) Bitterness or resentfulness", "C) Extreme happiness", "D) Mild disagreement"], correct: "B", explanation: "Rancour means bitterness or resentfulness, especially when long-standing." },
  { q: "The word 'Sagacious' means:", options: ["A) Foolish and reckless", "B) Having or showing keen mental discernment; wise", "C) Extremely cautious", "D) Highly emotional"], correct: "B", explanation: "Sagacious means having or showing keen mental discernment and good judgement; wise." },
  { q: "The word 'Trepidation' means:", options: ["A) Confidence and boldness", "B) A feeling of fear or anxiety about something", "C) Extreme happiness", "D) Mild curiosity"], correct: "B", explanation: "Trepidation means a feeling of fear or agitation about something that may happen." },
  { q: "The word 'Unequivocal' means:", options: ["A) Open to interpretation", "B) Leaving no doubt; clear and unambiguous", "C) Highly complex", "D) Partially true"], correct: "B", explanation: "Unequivocal means leaving no doubt; unambiguous." },
  { q: "The word 'Veracious' means:", options: ["A) Dishonest", "B) Truthful; habitually speaking the truth", "C) Extremely cautious", "D) Highly formal"], correct: "B", explanation: "Veracious means speaking or representing the truth; truthful." },
  { q: "The word 'Whimsical' means:", options: ["A) Serious and formal", "B) Playfully quaint or fanciful", "C) Extremely logical", "D) Highly organised"], correct: "B", explanation: "Whimsical means playfully quaint or fanciful, especially in an appealing way." },
  { q: "The word 'Xenophile' means:", options: ["A) Someone who fears foreigners", "B) Someone who is attracted to foreign cultures", "C) A type of diplomat", "D) A foreign language expert"], correct: "B", explanation: "Xenophile means a person who is attracted to foreign peoples, cultures, or customs." },
  { q: "The word 'Zealot' means:", options: ["A) A moderate and balanced person", "B) A person who is fanatical about a cause", "C) A religious scholar", "D) A political leader"], correct: "B", explanation: "Zealot means a person who is fanatical and uncompromising in pursuit of their ideals." },
  { q: "The word 'Acumen' means:", options: ["A) A lack of understanding", "B) The ability to make good judgements quickly", "C) A type of argument", "D) A formal qualification"], correct: "B", explanation: "Acumen means the ability to make good judgements and quick decisions." },
  { q: "The word 'Beguile' means:", options: ["A) To frighten someone", "B) To charm or enchant someone, sometimes deceptively", "C) To educate someone", "D) To criticise someone"], correct: "B", explanation: "Beguile means to charm or enchant someone, sometimes in a deceptive way." },
  { q: "The word 'Cogent' means:", options: ["A) Weak and unconvincing", "B) Clear, logical, and convincing", "C) Highly emotional", "D) Extremely complex"], correct: "B", explanation: "Cogent means clear, logical, and convincing." },
  { q: "The word 'Diffident' means:", options: ["A) Confident and assertive", "B) Modest or shy due to lack of self-confidence", "C) Highly aggressive", "D) Extremely talkative"], correct: "B", explanation: "Diffident means modest or shy because of a lack of self-confidence." },
  { q: "The word 'Efficacious' means:", options: ["A) Ineffective", "B) Successful in producing a desired result", "C) Extremely expensive", "D) Highly complex"], correct: "B", explanation: "Efficacious means successful in producing a desired or intended result; effective." },
  { q: "The word 'Fastidious' means:", options: ["A) Careless and sloppy", "B) Very attentive to accuracy and detail", "C) Extremely fast", "D) Highly creative"], correct: "B", explanation: "Fastidious means very attentive to and concerned about accuracy and detail." },
  { q: "The word 'Gaunt' means:", options: ["A) Well-fed and healthy", "B) Lean and haggard, especially from suffering", "C) Extremely tall", "D) Highly energetic"], correct: "B", explanation: "Gaunt means lean and haggard, especially because of suffering, hunger, or age." },
  { q: "The word 'Hubris' means:", options: ["A) Extreme humility", "B) Excessive pride or self-confidence", "C) A type of argument", "D) A formal agreement"], correct: "B", explanation: "Hubris means excessive pride or self-confidence, often leading to downfall." },
  { q: "The word 'Impervious' means:", options: ["A) Easily affected", "B) Not allowing something to pass through; unaffected by", "C) Highly sensitive", "D) Completely open"], correct: "B", explanation: "Impervious means not allowing fluid to pass through; unable to be affected by." },
  { q: "The word 'Judicious' most precisely means:", options: ["A) Relating to the legal system", "B) Having or showing good judgement", "C) Extremely strict", "D) Highly formal"], correct: "B", explanation: "Judicious means having, showing, or done with good judgement or sense." },
  { q: "The word 'Kindle' most precisely means:", options: ["A) To extinguish", "B) To arouse or inspire a feeling or interest", "C) To measure", "D) To transfer"], correct: "B", explanation: "Kindle means to arouse or inspire a feeling, interest, or emotion." },
  { q: "The word 'Languid' means:", options: ["A) Energetic and lively", "B) Displaying or having a disinclination for physical exertion", "C) Highly motivated", "D) Extremely cautious"], correct: "B", explanation: "Languid means displaying a disinclination for physical exertion or effort; weak." },
  { q: "The word 'Magnanimous' means:", options: ["A) Petty and resentful", "B) Generous or forgiving, especially toward a rival", "C) Extremely proud", "D) Highly ambitious"], correct: "B", explanation: "Magnanimous means generous or forgiving, especially towards a rival or less powerful person." },
  { q: "The word 'Nascent' means:", options: ["A) Fully developed", "B) Just coming into existence; beginning to develop", "C) Completely finished", "D) Highly advanced"], correct: "B", explanation: "Nascent means just coming into existence and beginning to display signs of future potential." },
  { q: "The word 'Opaque' means:", options: ["A) Completely transparent", "B) Not able to be seen through; not clear or easy to understand", "C) Extremely bright", "D) Highly detailed"], correct: "B", explanation: "Opaque means not able to be seen through; not transparent; difficult to understand." },
  { q: "The word 'Penchant' means:", options: ["A) A strong dislike", "B) A strong or habitual liking for something", "C) A type of argument", "D) A formal qualification"], correct: "B", explanation: "Penchant means a strong or habitual liking for something or tendency to do it." },
  { q: "The word 'Quixotic' means:", options: ["A) Practical and realistic", "B) Exceedingly idealistic; unrealistic and impractical", "C) Highly organised", "D) Extremely cautious"], correct: "B", explanation: "Quixotic means exceedingly idealistic; unrealistic and impractical." },
  { q: "The word 'Repudiate' means:", options: ["A) To accept fully", "B) To refuse to accept or be associated with", "C) To study carefully", "D) To support strongly"], correct: "B", explanation: "Repudiate means to refuse to accept; to reject or disown." },
  { q: "The word 'Stoic' means:", options: ["A) Highly emotional", "B) Enduring pain or hardship without complaint", "C) Extremely cautious", "D) Highly talkative"], correct: "B", explanation: "Stoic means enduring pain or hardship without showing feelings or complaining." },
  { q: "The word 'Terse' means:", options: ["A) Long and detailed", "B) Sparing in the use of words; abrupt", "C) Highly emotional", "D) Extremely formal"], correct: "B", explanation: "Terse means sparing in the use of words; abrupt." },
  { q: "The word 'Untenable' means:", options: ["A) Strongly supported", "B) Not able to be maintained or defended against criticism", "C) Highly practical", "D) Completely proven"], correct: "B", explanation: "Untenable means not able to be maintained or defended against attack or objection." },
  { q: "The word 'Venerate' means:", options: ["A) To criticise harshly", "B) To regard with great respect", "C) To study carefully", "D) To ignore completely"], correct: "B", explanation: "Venerate means to regard with great respect; to revere." },
  { q: "The word 'Wistful' means:", options: ["A) Cheerful and content", "B) Having a feeling of vague longing or regret", "C) Extremely energetic", "D) Highly ambitious"], correct: "B", explanation: "Wistful means having or showing a feeling of vague or regretful longing." },
  { q: "The word 'Xenocentric' means:", options: ["A) Focused on one's own culture", "B) Believing other cultures are superior to one's own", "C) Hostile to foreigners", "D) Neutral about all cultures"], correct: "B", explanation: "Xenocentric means believing that another culture is superior to one's own." },
  { q: "The word 'Yoke' (figurative) means:", options: ["A) A type of food", "B) A burden or constraint that limits freedom", "C) A form of agreement", "D) A type of tool"], correct: "B", explanation: "Yoke (figuratively) means something that restricts freedom or is a heavy burden." },
  { q: "The word 'Zealous' most precisely means:", options: ["A) Indifferent and passive", "B) Having or showing great energy and enthusiasm for a cause", "C) Extremely cautious", "D) Highly formal"], correct: "B", explanation: "Zealous means having or showing great energy or enthusiasm in pursuit of a cause." },
  { q: "The word 'Aberrant' means:", options: ["A) Normal and expected", "B) Departing from an accepted standard", "C) Highly creative", "D) Extremely cautious"], correct: "B", explanation: "Aberrant means departing from an accepted standard or norm." },
  { q: "The word 'Bucolic' means:", options: ["A) Urban and industrial", "B) Relating to the pleasant aspects of the countryside", "C) Highly formal", "D) Extremely complex"], correct: "B", explanation: "Bucolic means relating to the pleasant aspects of the countryside and rural life." },
  { q: "The word 'Circumspect' means:", options: ["A) Reckless and impulsive", "B) Wary and unwilling to take risks", "C) Highly confident", "D) Extremely talkative"], correct: "B", explanation: "Circumspect means wary and unwilling to take risks; careful." },
  { q: "The word 'Didactic' means:", options: ["A) Entertaining without purpose", "B) Intended to teach or instruct", "C) Highly creative", "D) Extremely informal"], correct: "B", explanation: "Didactic means intended to teach, particularly in having moral instruction as an ulterior motive." },
  { q: "The word 'Enervate' means:", options: ["A) To energise", "B) To weaken or drain of energy", "C) To motivate", "D) To educate"], correct: "B", explanation: "Enervate means to make someone feel drained of energy or vitality." },
  { q: "The word 'Furtive' means:", options: ["A) Open and honest", "B) Attempting to avoid notice; secretive", "C) Highly confident", "D) Extremely talkative"], correct: "B", explanation: "Furtive means attempting to avoid notice or attention, typically because of guilt." },
  { q: "The word 'Gregarious' most precisely means:", options: ["A) Preferring solitude", "B) Fond of company; sociable", "C) Highly aggressive", "D) Extremely cautious"], correct: "B", explanation: "Gregarious means fond of company; sociable." },
  { q: "The word 'Harangue' means:", options: ["A) A quiet conversation", "B) A lengthy and aggressive speech", "C) A formal agreement", "D) A type of argument"], correct: "B", explanation: "Harangue means a lengthy and aggressive speech." },
  { q: "The word 'Inimical' means:", options: ["A) Friendly and supportive", "B) Tending to obstruct or harm; hostile", "C) Highly neutral", "D) Completely indifferent"], correct: "B", explanation: "Inimical means tending to obstruct or harm; unfriendly; hostile." },
  { q: "The word 'Jejune' means:", options: ["A) Rich and complex", "B) Naive, simplistic, and superficial", "C) Highly formal", "D) Extremely detailed"], correct: "B", explanation: "Jejune means naive, simplistic, and superficial." },
  { q: "The word 'Kowtow' means:", options: ["A) To stand firm", "B) To act in an excessively subservient way", "C) To argue strongly", "D) To study carefully"], correct: "B", explanation: "Kowtow means to act in an excessively subservient manner." },
  { q: "The word 'Loquacious' means:", options: ["A) Silent and reserved", "B) Tending to talk a great deal", "C) Highly logical", "D) Extremely cautious"], correct: "B", explanation: "Loquacious means tending to talk a great deal; talkative." },
  { q: "The word 'Myriad' means:", options: ["A) A small number", "B) A countless or extremely large number", "C) A specific measurement", "D) A type of pattern"], correct: "B", explanation: "Myriad means a countless or extremely great number." },
  { q: "The word 'Nefarious' means:", options: ["A) Honest and upright", "B) Wicked or criminal", "C) Highly cautious", "D) Extremely formal"], correct: "B", explanation: "Nefarious means wicked or criminal." },
  { q: "The word 'Ominous' means:", options: ["A) Reassuring and positive", "B) Giving the impression that something bad is going to happen", "C) Highly neutral", "D) Completely harmless"], correct: "B", explanation: "Ominous means giving the impression that something bad or unpleasant is going to happen." },
  { q: "The word 'Perfidious' means:", options: ["A) Loyal and trustworthy", "B) Deceitful and untrustworthy", "C) Highly cautious", "D) Extremely formal"], correct: "B", explanation: "Perfidious means deceitful and untrustworthy." },
  { q: "The word 'Querulous' most precisely means:", options: ["A) Calm and accepting", "B) Complaining in a petulant or whining manner", "C) Highly curious", "D) Extremely logical"], correct: "B", explanation: "Querulous means complaining in a petulant or whining manner." },
  { q: "The word 'Recondite' means:", options: ["A) Well-known and popular", "B) Not known by many people; obscure", "C) Highly practical", "D) Extremely simple"], correct: "B", explanation: "Recondite means not known by many people; abstruse." },
  { q: "The word 'Sanguine' means:", options: ["A) Pessimistic and gloomy", "B) Optimistic, especially in a difficult situation", "C) Highly cautious", "D) Extremely formal"], correct: "B", explanation: "Sanguine means optimistic or positive, especially in a difficult situation." },
  { q: "The word 'Truculent' means:", options: ["A) Calm and cooperative", "B) Eager or quick to argue or fight; aggressively defiant", "C) Highly formal", "D) Extremely cautious"], correct: "B", explanation: "Truculent means eager or quick to argue or fight; aggressively defiant." },
  { q: "The word 'Umbrage' means:", options: ["A) A feeling of happiness", "B) Offence or annoyance", "C) A type of shadow", "D) A formal agreement"], correct: "B", explanation: "Umbrage means offence or annoyance — as in 'to take umbrage at something'." },
  { q: "The word 'Vicarious' means:", options: ["A) Experienced directly", "B) Experienced in the imagination through another person", "C) Highly formal", "D) Extremely cautious"], correct: "B", explanation: "Vicarious means experienced in the imagination through the feelings or actions of another person." },
  { q: "The word 'Winsome' means:", options: ["A) Unpleasant and off-putting", "B) Attractive or appealing in a fresh, innocent way", "C) Highly formal", "D) Extremely cautious"], correct: "B", explanation: "Winsome means attractive or appealing in appearance or character." }
); // end vocab.push (100 new — Batch 4)

// ══════════════════════════════════════════════════════════════════════
//  IELTS READING MODULE
//  — Passage bank (5 full passages, 4 question types each)
//  — State management
//  — Render / answer / score / results logic
//  — AI "Why?" explanation on demand
//  — Band score → progress tracking
// ══════════════════════════════════════════════════════════════════════

// ── Reading state ─────────────────────────────────────────────────────
let _readingState = {
  passageIndex:  0,
  questionIndex: 0,
  userAnswers:   [],
  score:         0,
  passage:       null,
  allQuestions:  [],
  started:       false,
};

// ── Band score table (correct out of 40 → band) ───────────────────────
// Scaled to per-passage (10 Q): correct/10 * 40 → lookup
const IELTS_READING_BAND_TABLE = [
  [39,9.0],[37,8.5],[35,8.0],[33,7.5],[30,7.0],
  [27,6.5],[23,6.0],[19,5.5],[15,5.0],[12,4.5],
  [9,4.0],[6,3.5],[4,3.0],[0,2.5],
];

function _ieltsReadingBandFromScore(correct, total) {
  // Scale to /40 equivalent
  const scaled = Math.round((correct / total) * 40);
  for (const [threshold, band] of IELTS_READING_BAND_TABLE) {
    if (scaled >= threshold) return band;
  }
  return 2.5;
}


// ── Passage bank ──────────────────────────────────────────────────────
const IELTS_READING_PASSAGES = [

  // ── PASSAGE 1: Biomimicry ─────────────────────────────────────────
  {
    id: 'biomimicry',
    title: 'Biomimicry: Learning from Nature',
    topic: 'Science & Technology',
    difficulty: 'medium',
    text: `Biomimicry is an approach to innovation that seeks sustainable solutions to human challenges by emulating nature's time-tested patterns and strategies. The core idea is elegantly simple: nature, through billions of years of evolution, has already solved many of the problems we are grappling with today. Animals, plants, and microbes are the consummate engineers. After 3.8 billion years of research and development, failures are fossils, and what surrounds us is the secret to survival.

The term was popularised by biologist and author Janine Benyus in her 1997 book, which argued that human designers could learn from the natural world. Since then, biomimicry has influenced fields as diverse as architecture, medicine, robotics, and materials science. The Eastgate Centre in Harare, Zimbabwe, for example, was designed to mimic the self-cooling mounds of African termites. The building maintains a stable temperature without conventional air conditioning, reducing energy consumption by more than 90 percent compared to similar buildings.

In the field of materials science, researchers have drawn inspiration from the lotus plant, whose leaves repel water and dirt through microscopic surface structures. This principle has been applied to create self-cleaning glass and water-repellent fabrics. Similarly, the adhesive properties of gecko feet — which can cling to surfaces through millions of tiny hair-like structures — have inspired the development of reusable dry adhesives used in robotics and medicine.

Perhaps the most celebrated example of biomimicry is the Shinkansen bullet train in Japan. Engineers redesigned the train's nose to mimic the beak of the kingfisher bird, which dives from air into water with minimal splash. The redesign not only reduced the sonic boom the train produced when exiting tunnels but also decreased energy consumption by 15 percent and increased speed by 10 percent.

Critics of biomimicry argue that not all natural solutions are directly transferable to human engineering contexts, and that the process of translation from biology to technology is often far more complex than proponents suggest. Nevertheless, the field continues to grow, with dedicated research centres and university programmes emerging worldwide. As climate change and resource depletion intensify, the pressure to find sustainable solutions makes biomimicry an increasingly attractive framework for innovation.`,
    questionsMCQ: [
      { q: "According to the passage, what is the central principle of biomimicry?", options: ["A) Using technology to improve natural systems", "B) Solving human problems by imitating nature's strategies", "C) Studying fossils to understand evolution", "D) Replacing natural materials with synthetic ones"], correct: "B", rationale: "The passage states biomimicry 'seeks sustainable solutions to human challenges by emulating nature's time-tested patterns and strategies'." },
      { q: "The Eastgate Centre in Zimbabwe was designed to imitate:", options: ["A) The cooling system of a lotus plant", "B) The structure of a kingfisher's beak", "C) The self-cooling mounds of African termites", "D) The adhesive properties of gecko feet"], correct: "C", rationale: "The passage explicitly states the building 'was designed to mimic the self-cooling mounds of African termites'." },
      { q: "What improvement did the Shinkansen redesign achieve in terms of energy?", options: ["A) 90% reduction", "B) 10% reduction", "C) 15% reduction", "D) 3.8% reduction"], correct: "C", rationale: "The passage states the redesign 'decreased energy consumption by 15 percent'." },
      { q: "Which of the following is mentioned as a criticism of biomimicry?", options: ["A) It is too expensive to implement", "B) Natural solutions are not always directly transferable to engineering", "C) It ignores the role of evolution", "D) It only applies to architecture"], correct: "B", rationale: "Critics argue 'not all natural solutions are directly transferable to human engineering contexts'." },
    ],
    questionsTFNG: [
      { q: "Janine Benyus coined the term 'biomimicry' in a book published in 1997.", correct: "TRUE", rationale: "The passage states the term 'was popularised by biologist and author Janine Benyus in her 1997 book'." },
      { q: "The Eastgate Centre uses conventional air conditioning to maintain temperature.", correct: "FALSE", rationale: "The passage states it 'maintains a stable temperature without conventional air conditioning'." },
      { q: "Gecko-inspired adhesives are currently used in consumer clothing products.", correct: "NOT GIVEN", rationale: "The passage mentions robotics and medicine but does not mention consumer clothing." },
      { q: "Biomimicry research centres and university programmes are growing worldwide.", correct: "TRUE", rationale: "The passage states 'dedicated research centres and university programmes emerging worldwide'." },
    ],
    questionsSentence: [
      { q: "The lotus plant's leaves repel water through __ on their surface.", answer: "microscopic surface structures", rationale: "The passage states the lotus leaf repels water 'through microscopic surface structures'." },
      { q: "The Shinkansen's nose was redesigned to mimic the beak of the __.", answer: "kingfisher", rationale: "The passage states engineers redesigned the nose 'to mimic the beak of the kingfisher bird'." },
    ],
    questionsHeadings: [
      { paragraph: "Biomimicry is an approach to innovation that seeks sustainable solutions...", options: ["A) A brief history of engineering", "B) Defining biomimicry and its origins", "C) The problems with modern technology", "D) How animals evolved over time"], correct: "B", rationale: "This paragraph introduces and defines biomimicry and its origins." },
      { paragraph: "Perhaps the most celebrated example of biomimicry is the Shinkansen bullet train...", options: ["A) Problems with Japanese transport", "B) The physics of water entry", "C) A landmark case study in transport engineering", "D) How birds inspired aviation"], correct: "C", rationale: "This paragraph describes the Shinkansen as a celebrated case study." },
    ],
  },

  // ── PASSAGE 2: Decision Fatigue ───────────────────────────────────
  {
    id: 'decision_fatigue',
    title: 'Decision Fatigue and the Limits of Willpower',
    topic: 'Psychology & Behaviour',
    difficulty: 'medium',
    text: `Every day, human beings make thousands of decisions — from trivial choices about what to eat for breakfast to consequential judgements about career and relationships. Psychologists have long been interested in the quality of these decisions and, in particular, whether the ability to make good decisions deteriorates over the course of a day. The phenomenon they have identified is known as decision fatigue: the finding that the quality of decisions declines after a long session of decision-making.

The concept gained widespread attention following a landmark study of Israeli judges published in 2011. Researchers analysed over 1,100 parole hearings and found a striking pattern: prisoners who appeared before the board in the morning were granted parole approximately 65 percent of the time, while those who appeared later in the day were granted parole far less frequently — sometimes as low as zero percent just before a break. After a food break, approval rates returned to around 65 percent. The researchers concluded that the judges, exhausted by the mental effort of decision-making, defaulted to the safer, easier option of denying parole as the session wore on.

This research sparked considerable debate. Some critics argued that the pattern could be explained by factors other than mental fatigue — for example, that more serious cases might be scheduled later in the day. Others questioned whether the effect was truly about decision fatigue or simply about hunger and low blood sugar. Subsequent research has produced mixed results, with some studies replicating the effect and others failing to do so.

Despite the controversy, the broader concept of ego depletion — the idea that self-control and decision-making draw on a limited mental resource that can be exhausted — has been influential in psychology and behavioural economics. Practical applications have emerged in areas ranging from product design to public policy. Supermarkets, for instance, strategically place tempting items near checkouts, knowing that shoppers who have spent time making decisions are more susceptible to impulse purchases. Some organisations have responded by reducing the number of decisions employees must make, or by scheduling important decisions for the morning.

However, more recent research has challenged the ego depletion model itself. A large-scale replication study in 2016 involving 23 laboratories across the world failed to find evidence for the effect. Some researchers now argue that the experience of fatigue during decision-making is more about motivation and mindset than about a depleted cognitive resource. The debate continues, but the practical insight remains: the conditions under which decisions are made matter enormously.`,
    questionsMCQ: [
      { q: "What did the Israeli judges study find about parole decisions made in the morning?", options: ["A) They were more likely to be denied", "B) They were granted approximately 65% of the time", "C) They were influenced by the seriousness of the case", "D) They were made more quickly than afternoon decisions"], correct: "B", rationale: "The passage states 'prisoners who appeared before the board in the morning were granted parole approximately 65 percent of the time'." },
      { q: "What happened to parole approval rates after a food break?", options: ["A) They dropped to zero", "B) They remained low", "C) They returned to around 65 percent", "D) They exceeded morning rates"], correct: "C", rationale: "The passage states 'After a food break, approval rates returned to around 65 percent'." },
      { q: "Which of the following is a criticism of the Israeli judges study mentioned in the passage?", options: ["A) The sample size was too small", "B) More serious cases may have been scheduled later in the day", "C) The judges were not properly trained", "D) The study was conducted in only one country"], correct: "B", rationale: "Critics argued 'more serious cases might be scheduled later in the day'." },
      { q: "What did the 2016 large-scale replication study find?", options: ["A) Strong evidence for ego depletion", "B) That decision fatigue only affects judges", "C) No evidence for the ego depletion effect", "D) That hunger is the main cause of poor decisions"], correct: "C", rationale: "The passage states the 2016 study 'failed to find evidence for the effect'." },
    ],
    questionsTFNG: [
      { q: "The Israeli judges study analysed more than 1,000 parole hearings.", correct: "TRUE", rationale: "The passage states 'Researchers analysed over 1,100 parole hearings'." },
      { q: "All subsequent research has successfully replicated the decision fatigue effect.", correct: "FALSE", rationale: "The passage states 'some studies replicating the effect and others failing to do so'." },
      { q: "Supermarkets place tempting items near checkouts to exploit decision fatigue.", correct: "TRUE", rationale: "The passage explicitly states this strategy." },
      { q: "The 2016 replication study was conducted in a single laboratory.", correct: "FALSE", rationale: "The passage states it involved '23 laboratories across the world'." },
    ],
    questionsSentence: [
      { q: "Decision fatigue refers to the finding that decision quality __ after prolonged decision-making.", answer: "declines", rationale: "The passage defines decision fatigue as 'the finding that the quality of decisions declines after a long session of decision-making'." },
      { q: "The ego depletion model suggests that self-control draws on a __ that can be exhausted.", answer: "limited mental resource", rationale: "The passage describes ego depletion as the idea that self-control draws on 'a limited mental resource that can be exhausted'." },
    ],
    questionsHeadings: [
      { paragraph: "Every day, human beings make thousands of decisions...", options: ["A) The history of psychology", "B) Introducing decision fatigue", "C) How to make better decisions", "D) The science of willpower"], correct: "B", rationale: "This paragraph introduces the concept of decision fatigue." },
      { paragraph: "Despite the controversy, the broader concept of ego depletion...", options: ["A) Criticisms of behavioural economics", "B) Practical applications of ego depletion research", "C) Why supermarkets are unethical", "D) The limits of public policy"], correct: "B", rationale: "This paragraph discusses practical applications of the ego depletion concept." },
    ],
  },

  // ── PASSAGE 3: Urban Heat Islands ────────────────────────────────
  {
    id: 'urban_heat',
    title: 'Urban Heat Islands: Cities and Climate',
    topic: 'Environment & Geography',
    difficulty: 'hard',
    text: `An urban heat island (UHI) is a metropolitan area that is significantly warmer than its surrounding rural areas due to human activities. The phenomenon was first systematically documented by Luke Howard, a British chemist, in the early nineteenth century, when he observed that London was consistently warmer than the surrounding countryside. Today, the effect is recognised as one of the most significant ways in which urbanisation alters local climate.

The primary drivers of the urban heat island effect are well understood. Dark surfaces such as asphalt roads and rooftops absorb solar radiation and re-emit it as heat. The dense concentration of buildings reduces wind flow, trapping warm air. Waste heat from vehicles, air conditioning units, and industrial processes adds further thermal energy to the urban environment. Meanwhile, the replacement of vegetation with impermeable surfaces reduces evapotranspiration — the process by which plants release water vapour, which has a cooling effect.

The consequences of urban heat islands are wide-ranging. Higher temperatures increase energy demand for cooling, which in turn increases greenhouse gas emissions, creating a feedback loop. Heat-related illness and mortality rise, particularly among elderly populations and those without access to air conditioning. Urban biodiversity is affected as heat-sensitive species are displaced. Water quality can also deteriorate, as warmer temperatures accelerate the growth of harmful algae in urban waterways.

Mitigation strategies have been developed and implemented in cities around the world. Green roofs — rooftops covered with vegetation — reduce surface temperatures and provide insulation. Cool roofs, which use reflective materials to reduce heat absorption, have been mandated in some jurisdictions. Urban tree planting programmes increase shade and evapotranspiration. Permeable pavements allow rainwater to infiltrate the ground, supporting vegetation and reducing surface temperatures. In Singapore, the government has integrated green infrastructure into urban planning at a national scale, earning the city-state a reputation as a model for sustainable urban development.

The challenge of addressing urban heat islands is compounded by the fact that cities are also the primary drivers of economic growth and innovation. Policymakers must balance the imperative to reduce urban heat with the need to accommodate growing urban populations and maintain economic competitiveness. As global temperatures rise due to climate change, the urgency of addressing the urban heat island effect will only increase.`,
    questionsMCQ: [
      { q: "Who first systematically documented the urban heat island effect?", options: ["A) A German physicist in the twentieth century", "B) Luke Howard, a British chemist, in the nineteenth century", "C) A team of researchers in Singapore", "D) An American urban planner in the 1950s"], correct: "B", rationale: "The passage states the effect 'was first systematically documented by Luke Howard, a British chemist, in the early nineteenth century'." },
      { q: "Which process is reduced when vegetation is replaced by impermeable surfaces?", options: ["A) Solar radiation absorption", "B) Wind flow reduction", "C) Evapotranspiration", "D) Greenhouse gas emission"], correct: "C", rationale: "The passage states 'the replacement of vegetation with impermeable surfaces reduces evapotranspiration'." },
      { q: "What is described as a consequence of higher urban temperatures on energy use?", options: ["A) Reduced demand for heating", "B) Increased demand for cooling, raising greenhouse gas emissions", "C) Lower electricity costs", "D) Improved air quality"], correct: "B", rationale: "The passage states 'Higher temperatures increase energy demand for cooling, which in turn increases greenhouse gas emissions'." },
      { q: "Which city is cited as a model for integrating green infrastructure at a national scale?", options: ["A) London", "B) Tokyo", "C) New York", "D) Singapore"], correct: "D", rationale: "The passage states 'In Singapore, the government has integrated green infrastructure into urban planning at a national scale'." },
    ],
    questionsTFNG: [
      { q: "Luke Howard observed that London was warmer than the surrounding countryside.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "Cool roofs use dark materials to absorb heat and redistribute it.", correct: "FALSE", rationale: "The passage states cool roofs 'use reflective materials to reduce heat absorption'." },
      { q: "Urban heat islands have no effect on water quality.", correct: "FALSE", rationale: "The passage states 'Water quality can also deteriorate, as warmer temperatures accelerate the growth of harmful algae'." },
      { q: "All cities worldwide have now mandated the use of cool roofs.", correct: "NOT GIVEN", rationale: "The passage says cool roofs 'have been mandated in some jurisdictions' — not all cities worldwide." },
    ],
    questionsSentence: [
      { q: "Dark surfaces such as asphalt absorb solar radiation and re-emit it as __.", answer: "heat", rationale: "The passage states dark surfaces 'absorb solar radiation and re-emit it as heat'." },
      { q: "Green roofs reduce surface temperatures and provide __.", answer: "insulation", rationale: "The passage states green roofs 'reduce surface temperatures and provide insulation'." },
    ],
    questionsHeadings: [
      { paragraph: "The primary drivers of the urban heat island effect are well understood...", options: ["A) Solutions to urban warming", "B) The causes of the urban heat island effect", "C) The history of climate science", "D) How cities affect rainfall"], correct: "B", rationale: "This paragraph explains the causes of the UHI effect." },
      { paragraph: "Mitigation strategies have been developed and implemented in cities around the world...", options: ["A) Why cities are getting hotter", "B) The economic cost of urban heat", "C) Strategies to reduce urban heat islands", "D) How Singapore became wealthy"], correct: "C", rationale: "This paragraph describes mitigation strategies." },
    ],
  },

  // ── PASSAGE 4: The Printing Press ────────────────────────────────
  {
    id: 'printing_press',
    title: 'The Printing Press and the Transformation of Knowledge',
    topic: 'History & Culture',
    difficulty: 'medium',
    text: `Few inventions have transformed human society as profoundly as the printing press. When Johannes Gutenberg developed his movable-type printing press in the mid-fifteenth century, he set in motion a revolution in the production and dissemination of knowledge that would reshape European civilisation and, ultimately, the world. Before Gutenberg, books were produced by hand — a laborious process that made them expensive and rare. A single scribe might spend months copying a single manuscript, and the resulting book would be accessible only to the wealthy or to religious institutions.

Gutenberg's press changed this fundamentally. By using individual metal letters that could be rearranged and reused, the press could produce hundreds of copies of a text in the time it previously took to produce one. The cost of books fell dramatically, and literacy rates began to rise as texts became more widely available. Within fifty years of Gutenberg's invention, an estimated eight million books had been printed in Europe — more than had been produced in the entire previous history of the continent.

The consequences were far-reaching. The Protestant Reformation, which began in 1517 when Martin Luther published his Ninety-Five Theses, was accelerated by the printing press. Luther's ideas spread rapidly across Europe in printed pamphlets, reaching audiences that would have been impossible to access through manuscript culture. The Scientific Revolution of the sixteenth and seventeenth centuries was similarly enabled by the press, which allowed scientists to share findings, build on each other's work, and establish a cumulative body of knowledge.

Not all consequences were positive. The printing press also facilitated the spread of misinformation, propaganda, and inflammatory political content. Governments and religious authorities quickly recognised the threat posed by uncontrolled printing and introduced censorship regimes. In England, the Licensing Act of 1662 required all publications to be approved before printing. Such controls were ultimately unsuccessful in suppressing the free flow of ideas, but they established a pattern of tension between information technology and authority that persists to the present day.

Historians debate the extent to which the printing press was a cause of these transformations or merely a facilitator. Some argue that the Reformation and Scientific Revolution would have occurred regardless, driven by underlying social and intellectual forces. Others maintain that the press was a necessary condition — that without it, the rapid dissemination of new ideas would have been impossible. What is not in dispute is that the printing press fundamentally altered the relationship between knowledge, power, and society.`,
    questionsMCQ: [
      { q: "Before Gutenberg's press, why were books expensive and rare?", options: ["A) Paper was scarce and costly", "B) They were produced by hand by scribes", "C) Only religious texts were permitted", "D) Metal type was too expensive to produce"], correct: "B", rationale: "The passage states 'books were produced by hand — a laborious process that made them expensive and rare'." },
      { q: "Approximately how many books had been printed in Europe within fifty years of Gutenberg's invention?", options: ["A) One million", "B) Five million", "C) Eight million", "D) Twenty million"], correct: "C", rationale: "The passage states 'an estimated eight million books had been printed in Europe'." },
      { q: "How did the printing press contribute to the Protestant Reformation?", options: ["A) It allowed Luther to write the Bible in German", "B) It enabled Luther's ideas to spread rapidly in printed pamphlets", "C) It replaced the role of the Church in education", "D) It made religious texts free of charge"], correct: "B", rationale: "The passage states 'Luther's ideas spread rapidly across Europe in printed pamphlets'." },
      { q: "What was the purpose of England's Licensing Act of 1662?", options: ["A) To promote literacy among the poor", "B) To fund the printing industry", "C) To require all publications to be approved before printing", "D) To standardise the English language"], correct: "C", rationale: "The passage states the Act 'required all publications to be approved before printing'." },
    ],
    questionsTFNG: [
      { q: "Gutenberg's press used individual metal letters that could be rearranged and reused.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "The printing press had no negative consequences for society.", correct: "FALSE", rationale: "The passage states it 'facilitated the spread of misinformation, propaganda, and inflammatory political content'." },
      { q: "All historians agree that the printing press was the sole cause of the Reformation.", correct: "FALSE", rationale: "The passage states 'Historians debate the extent to which the printing press was a cause of these transformations or merely a facilitator'." },
      { q: "The Scientific Revolution occurred before the invention of the printing press.", correct: "FALSE", rationale: "The passage places the Scientific Revolution in the sixteenth and seventeenth centuries, after Gutenberg's mid-fifteenth century invention." },
    ],
    questionsSentence: [
      { q: "The printing press allowed scientists to share findings and establish a __ body of knowledge.", answer: "cumulative", rationale: "The passage states the press allowed scientists to 'establish a cumulative body of knowledge'." },
      { q: "Governments introduced __ regimes to control the spread of printed material.", answer: "censorship", rationale: "The passage states 'Governments and religious authorities... introduced censorship regimes'." },
    ],
    questionsHeadings: [
      { paragraph: "The consequences were far-reaching. The Protestant Reformation...", options: ["A) The decline of the Catholic Church", "B) How the press enabled major intellectual movements", "C) The invention of the scientific method", "D) Luther's personal beliefs"], correct: "B", rationale: "This paragraph describes how the press enabled the Reformation and Scientific Revolution." },
      { paragraph: "Not all consequences were positive. The printing press also facilitated...", options: ["A) The benefits of censorship", "B) How governments supported printing", "C) The darker consequences of the printing press", "D) The rise of democracy"], correct: "C", rationale: "This paragraph discusses the negative consequences of the press." },
    ],
  },

  // ── PASSAGE 5: Microplastics ──────────────────────────────────────
  {
    id: 'microplastics',
    title: 'Microplastics: An Invisible Threat',
    topic: 'Environment & Science',
    difficulty: 'hard',
    text: `Microplastics — plastic particles smaller than five millimetres in diameter — have become one of the most pervasive environmental contaminants of the twenty-first century. They are found in the deepest ocean trenches, in Arctic ice, in the soil of remote mountain ranges, and, increasingly, in the human body. Their ubiquity is a direct consequence of the world's dependence on plastic, a material that does not biodegrade but instead fragments into ever-smaller pieces over time.

Microplastics enter the environment through multiple pathways. Primary microplastics are manufactured at a small size for specific purposes — microbeads in cosmetics and personal care products, for example, or plastic pellets used as raw material in manufacturing. Secondary microplastics result from the breakdown of larger plastic items: a plastic bottle left in sunlight will gradually fragment into thousands of microscopic particles. Synthetic textiles are another significant source; a single wash of a polyester garment can release hundreds of thousands of plastic fibres into wastewater.

The ecological consequences of microplastic pollution are a subject of active research. Marine organisms, from zooplankton to whales, ingest microplastics, which can cause physical harm, block digestive systems, and introduce toxic chemicals into the food chain. Studies have found microplastics in the tissues of fish consumed by humans, raising concerns about the implications for human health. However, the precise health effects of microplastic ingestion in humans remain poorly understood, and establishing causal links between microplastic exposure and specific health outcomes is methodologically challenging.

Regulatory responses have been uneven. Several countries, including the United Kingdom and the United States, have banned microbeads in rinse-off cosmetics. The European Union has introduced restrictions on intentionally added microplastics in a range of products. However, these measures address only a fraction of the total microplastic load entering the environment. The vast majority of microplastics come from secondary sources — the fragmentation of existing plastic waste — which is far harder to regulate.

Scientists and policymakers broadly agree that reducing plastic production and improving waste management are essential long-term strategies. Some researchers are investigating biodegradable alternatives to conventional plastics, though these materials present their own challenges and are not yet available at the scale required. The microplastic crisis is, at its core, a consequence of a linear economic model in which materials are used once and discarded. Addressing it will require a fundamental shift towards a circular economy in which materials are kept in use for as long as possible.`,
    questionsMCQ: [
      { q: "How are secondary microplastics formed?", options: ["A) They are manufactured at a small size for specific uses", "B) They result from the breakdown of larger plastic items", "C) They are released from cosmetic microbeads", "D) They are produced during plastic recycling"], correct: "B", rationale: "The passage states 'Secondary microplastics result from the breakdown of larger plastic items'." },
      { q: "What concern is raised about microplastics found in fish tissues?", options: ["A) They make fish inedible", "B) They reduce fish populations", "C) They may have implications for human health", "D) They cause fish to migrate to new areas"], correct: "C", rationale: "The passage states this raises 'concerns about the implications for human health'." },
      { q: "Why are regulatory measures described as addressing 'only a fraction' of the problem?", options: ["A) Most countries have not passed any laws", "B) The majority of microplastics come from secondary sources that are harder to regulate", "C) Bans on microbeads have not been enforced", "D) Plastic production has increased despite regulations"], correct: "B", rationale: "The passage states 'The vast majority of microplastics come from secondary sources... which is far harder to regulate'." },
      { q: "What economic model does the passage identify as the root cause of the microplastic crisis?", options: ["A) A circular economy", "B) A green economy", "C) A linear economic model", "D) A market-based economy"], correct: "C", rationale: "The passage states 'The microplastic crisis is, at its core, a consequence of a linear economic model'." },
    ],
    questionsTFNG: [
      { q: "Microplastics have been found in Arctic ice.", correct: "TRUE", rationale: "The passage explicitly states microplastics are found 'in Arctic ice'." },
      { q: "The precise health effects of microplastic ingestion in humans are well established.", correct: "FALSE", rationale: "The passage states 'the precise health effects of microplastic ingestion in humans remain poorly understood'." },
      { q: "The UK and US have banned microbeads in rinse-off cosmetics.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "Biodegradable plastics are currently available at the scale needed to replace conventional plastics.", correct: "FALSE", rationale: "The passage states these materials 'are not yet available at the scale required'." },
    ],
    questionsSentence: [
      { q: "A single wash of a polyester garment can release hundreds of thousands of plastic __ into wastewater.", answer: "fibres", rationale: "The passage states 'a single wash of a polyester garment can release hundreds of thousands of plastic fibres into wastewater'." },
      { q: "Addressing the microplastic crisis requires a shift towards a __ economy.", answer: "circular", rationale: "The passage states it requires 'a fundamental shift towards a circular economy'." },
    ],
    questionsHeadings: [
      { paragraph: "Microplastics enter the environment through multiple pathways...", options: ["A) The history of plastic production", "B) How microplastics enter the environment", "C) The effects of microplastics on marine life", "D) How to recycle plastic effectively"], correct: "B", rationale: "This paragraph describes the pathways through which microplastics enter the environment." },
      { paragraph: "Regulatory responses have been uneven...", options: ["A) Why governments support plastic production", "B) The success of international environmental law", "C) The limitations of current regulatory responses", "D) How the EU leads on environmental policy"], correct: "C", rationale: "This paragraph discusses the limitations of regulatory responses." },
    ],
  },
];


// ── Strategy tips for each question type ─────────────────────────────
const IELTS_READING_STRATEGY_TIPS = {
  tfng:     '💡 T/F/NG tip: If the passage says "some" and the question says "all", the answer is FALSE. If the information is not mentioned at all, choose NOT GIVEN — do not guess from general knowledge.',
  heading:  '💡 Headings tip: Read the first and last sentence of each paragraph first — they usually contain the main idea. Eliminate headings that are too specific or too broad.',
  sentence: '💡 Sentence Completion tip: Copy words exactly from the passage. Check the word limit — "the Queensland coast" is wrong if the answer is "Queensland coast". Plurals and verb forms must match.',
  mcq:      '💡 MCQ tip: Eliminate obviously wrong options first. The correct answer paraphrases the passage — it rarely uses the exact same words. Watch for absolute words like "always" or "never".',
};
const IELTS_READING_WEAK_KEY = 'ielts_reading_weak_types';

function _ieltsReadingGetWeakTypes() {
  try { return JSON.parse(localStorage.getItem(IELTS_READING_WEAK_KEY) || '{}'); }
  catch(e) { return {}; }
}
function _ieltsReadingTrackWeak(type) {
  const data = _ieltsReadingGetWeakTypes();
  data[type] = (data[type] || 0) + 1;
  try { localStorage.setItem(IELTS_READING_WEAK_KEY, JSON.stringify(data)); } catch(e) {}
}
function _ieltsReadingGetWeakestType() {
  const data = _ieltsReadingGetWeakTypes();
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries[0][0] : null;
}

// ── Setup: populate passage grid with filter UI ───────────────────────
function _ieltsInitReadingSetup() {
  const grid = document.getElementById('ieltsReadingPassageGrid');
  if (!grid) return;

  // Always ensure setup is visible and session/results are hidden on entry
  const setup   = document.getElementById('ieltsReadingSetup');
  const session = document.getElementById('ieltsReadingSession');
  const results = document.getElementById('ieltsReadingResults');
  if (setup)   setup.style.display   = 'block';
  if (session) session.style.display = 'none';
  if (results) results.style.display = 'none';

  // Only rebuild the grid if not already built (reset clears this flag)
  if (grid.dataset.built) return;
  grid.dataset.built = '1';

  // Build unique topic list
  const topics = ['All', ...new Set(IELTS_READING_PASSAGES.map(p => p.topic))].sort();
  const diffs  = ['All', 'easy', 'medium', 'hard'];

  // Render filter bar + passage cards
  function renderGrid(topicFilter, diffFilter) {
    const filtered = IELTS_READING_PASSAGES.filter((p, i) => {
      const matchTopic = topicFilter === 'All' || p.topic === topicFilter;
      const matchDiff  = diffFilter  === 'All' || p.difficulty === diffFilter;
      return matchTopic && matchDiff;
    });

    const cards = filtered.map(p => {
      const idx = IELTS_READING_PASSAGES.indexOf(p);
      const diffColor = p.difficulty === 'hard' ? '#ef4444' : p.difficulty === 'medium' ? '#eab308' : '#22c55e';
      return '<button class="ielts-reading-passage-btn" onclick="_ieltsStartReading(' + idx + ')">' +
        '<span class="irpb-topic">' + _esc(p.topic) + '</span>' +
        '<span class="irpb-title">' + _esc(p.title) + '</span>' +
        '<span class="irpb-meta">' +
          '<span class="irpb-diff" style="color:' + diffColor + '">' + p.difficulty + '</span>' +
          ' · 10 Q · 4 types' +
        '</span>' +
      '</button>';
    }).join('');

    const randomBtn =
      '<button class="ielts-reading-passage-btn irpb-random" onclick="_ieltsStartReadingFiltered(\'' + topicFilter + '\',\'' + diffFilter + '\')">' +
        '<span class="irpb-topic">🎲 Random</span>' +
        '<span class="irpb-title">Surprise me' + (topicFilter !== 'All' || diffFilter !== 'All' ? ' (filtered)' : '') + '</span>' +
        '<span class="irpb-meta">' + filtered.length + ' passage' + (filtered.length !== 1 ? 's' : '') + ' match</span>' +
      '</button>';

    grid.innerHTML =
      '<div class="ielts-reading-filters">' +
        '<div class="ielts-rf-group">' +
          '<span class="ielts-rf-label">Topic</span>' +
          '<select class="ielts-rf-select" id="ieltsReadingTopicFilter" onchange="_ieltsReadingApplyFilter()">' +
            topics.map(t => '<option value="' + _esc(t) + '"' + (t === topicFilter ? ' selected' : '') + '>' + _esc(t) + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="ielts-rf-group">' +
          '<span class="ielts-rf-label">Difficulty</span>' +
          '<select class="ielts-rf-select" id="ieltsReadingDiffFilter" onchange="_ieltsReadingApplyFilter()">' +
            diffs.map(d => '<option value="' + d + '"' + (d === diffFilter ? ' selected' : '') + '>' + (d === 'All' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)) + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<span class="ielts-rf-count">' + filtered.length + ' / ' + IELTS_READING_PASSAGES.length + '</span>' +
      '</div>' +
      '<div class="ielts-reading-passage-list">' + randomBtn + cards + '</div>';
  }

  renderGrid('All', 'All');

  // Weak area nudge
  const weakType = _ieltsReadingGetWeakestType();
  // Remove any previously inserted nudge first — prevents stacking on re-entry
  grid.parentNode.querySelectorAll('.ielts-reading-weak-nudge').forEach(el => el.remove());
  if (weakType) {
    const typeNames = { mcq: 'Multiple Choice', tfng: 'True/False/NG', sentence: 'Sentence Completion', heading: 'Matching Headings' };
    const nudge = document.createElement('div');
    nudge.className = 'ielts-reading-weak-nudge';
    nudge.innerHTML = '💡 Nexora noticed you struggle most with <strong>' + (typeNames[weakType] || weakType) + '</strong>. Keep practising to improve!';
    grid.parentNode.insertBefore(nudge, grid);
  }
}

// Apply filter from dropdowns
window._ieltsReadingApplyFilter = function() {
  const topic = document.getElementById('ieltsReadingTopicFilter')?.value || 'All';
  const diff  = document.getElementById('ieltsReadingDiffFilter')?.value  || 'All';
  // Re-init with new filters
  const grid = document.getElementById('ieltsReadingPassageGrid');
  if (grid) { delete grid.dataset.built; }
  // Rebuild by calling renderGrid indirectly via re-init
  _ieltsInitReadingSetup._renderGrid(topic, diff);
};

// Attach renderGrid to function so _ieltsReadingApplyFilter can call it
_ieltsInitReadingSetup._renderGrid = function(topicFilter, diffFilter) {
  const grid = document.getElementById('ieltsReadingPassageGrid');
  if (!grid) return;
  const topics = ['All', ...new Set(IELTS_READING_PASSAGES.map(p => p.topic))].sort();
  const diffs  = ['All', 'easy', 'medium', 'hard'];
  const filtered = IELTS_READING_PASSAGES.filter(p => {
    return (topicFilter === 'All' || p.topic === topicFilter) &&
           (diffFilter  === 'All' || p.difficulty === diffFilter);
  });
  const cards = filtered.map(p => {
    const idx = IELTS_READING_PASSAGES.indexOf(p);
    const diffColor = p.difficulty === 'hard' ? '#ef4444' : p.difficulty === 'medium' ? '#eab308' : '#22c55e';
    return '<button class="ielts-reading-passage-btn" onclick="_ieltsStartReading(' + idx + ')">' +
      '<span class="irpb-topic">' + _esc(p.topic) + '</span>' +
      '<span class="irpb-title">' + _esc(p.title) + '</span>' +
      '<span class="irpb-meta"><span class="irpb-diff" style="color:' + diffColor + '">' + p.difficulty + '</span> · 10 Q · 4 types</span>' +
    '</button>';
  }).join('');
  const randomBtn = '<button class="ielts-reading-passage-btn irpb-random" onclick="_ieltsStartReadingFiltered(\'' + topicFilter + '\',\'' + diffFilter + '\')">' +
    '<span class="irpb-topic">🎲 Random</span><span class="irpb-title">Surprise me' + (topicFilter !== 'All' || diffFilter !== 'All' ? ' (filtered)' : '') + '</span>' +
    '<span class="irpb-meta">' + filtered.length + ' passage' + (filtered.length !== 1 ? 's' : '') + ' match</span></button>';
  grid.innerHTML =
    '<div class="ielts-reading-filters">' +
      '<div class="ielts-rf-group"><span class="ielts-rf-label">Topic</span>' +
        '<select class="ielts-rf-select" id="ieltsReadingTopicFilter" onchange="_ieltsReadingApplyFilter()">' +
          topics.map(t => '<option value="' + _esc(t) + '"' + (t === topicFilter ? ' selected' : '') + '>' + _esc(t) + '</option>').join('') +
        '</select></div>' +
      '<div class="ielts-rf-group"><span class="ielts-rf-label">Difficulty</span>' +
        '<select class="ielts-rf-select" id="ieltsReadingDiffFilter" onchange="_ieltsReadingApplyFilter()">' +
          diffs.map(d => '<option value="' + d + '"' + (d === diffFilter ? ' selected' : '') + '>' + (d === 'All' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)) + '</option>').join('') +
        '</select></div>' +
      '<span class="ielts-rf-count">' + filtered.length + ' / ' + IELTS_READING_PASSAGES.length + '</span>' +
    '</div>' +
    '<div class="ielts-reading-passage-list">' + randomBtn + cards + '</div>';
};

// Start a random passage from the current filter
window._ieltsStartReadingFiltered = function(topicFilter, diffFilter) {
  const pool = IELTS_READING_PASSAGES
    .map((p, i) => ({ p, i }))
    .filter(({ p }) =>
      (topicFilter === 'All' || p.topic === topicFilter) &&
      (diffFilter  === 'All' || p.difficulty === diffFilter)
    );
  if (!pool.length) return;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  _ieltsStartReading(pick.i);
};

// ── Start a reading session ───────────────────────────────────────────
// ── No-repeat random: track recently seen passages ────────────────────
let _readingRecentHistory = [];
const READING_HISTORY_MAX = 10; // don't repeat last 10 passages

function _ieltsStartReading(index) {
  let idx;
  if (index < 0) {
    // Random — avoid recent passages
    const total = IELTS_READING_PASSAGES.length;
    const pool  = Array.from({ length: total }, (_, i) => i)
      .filter(i => !_readingRecentHistory.includes(i));
    // If all passages seen, reset history
    if (!pool.length) { _readingRecentHistory = []; pool.push(...Array.from({ length: total }, (_, i) => i)); }
    idx = pool[Math.floor(Math.random() * pool.length)];
  } else {
    idx = index;
  }

  // Record in history
  _readingRecentHistory.push(idx);
  if (_readingRecentHistory.length > READING_HISTORY_MAX) _readingRecentHistory.shift();
  const passage = IELTS_READING_PASSAGES[idx];
  if (!passage) return;

  // Build flat question list: MCQ → TFNG → Sentence → Headings
  const allQ = [
    ...(passage.questionsMCQ      || []).map(q => ({ ...q, type: 'mcq' })),
    ...(passage.questionsTFNG     || []).map(q => ({ ...q, type: 'tfng' })),
    ...(passage.questionsSentence || []).map(q => ({ ...q, type: 'sentence' })),
    ...(passage.questionsHeadings || []).map(q => ({ ...q, type: 'heading' })),
  ];

  // Guard: passage has no questions in any category — don't enter a blank session
  if (!allQ.length) {
    if (typeof _showStudyToast === 'function') {
      _showStudyToast('This passage has no questions yet. Try another one.');
    }
    return;
  }

  _readingState = {
    passageIndex:  idx,
    questionIndex: 0,
    userAnswers:   [],
    score:         0,
    passage,
    allQuestions:  allQ,
    started:       true,
  };

  // Show session, hide setup
  document.getElementById('ieltsReadingSetup').style.display   = 'none';
  document.getElementById('ieltsReadingSession').style.display = 'block';
  document.getElementById('ieltsReadingResults').style.display = 'none';

  // Populate passage
  document.getElementById('ieltsReadingPassageTitle').textContent = passage.title;
  document.getElementById('ieltsReadingPassageBody').innerHTML =
    passage.text.split('\n\n').map((para, i) =>
      '<p><strong>[' + String.fromCharCode(65 + i) + ']</strong> ' + _esc(para) + '</p>'
    ).join('');

  // Vocab sidebar — show topic-relevant high-value words
  const vocabWords = typeof window._ieltsGetTopicVocab === 'function'
    ? window._ieltsGetTopicVocab(passage.title + ' ' + passage.topic)
    : [];
  const passageCard = document.getElementById('ieltsReadingPassageCard');
  const existingSidebar = document.getElementById('ieltsReadingVocabSidebar');
  if (existingSidebar) existingSidebar.remove();
  if (vocabWords.length && passageCard) {
    const sidebar = document.createElement('div');
    sidebar.id = 'ieltsReadingVocabSidebar';
    sidebar.className = 'ielts-reading-vocab-sidebar';
    sidebar.innerHTML =
      '<div class="irvs-title">📚 Topic Vocabulary</div>' +
      vocabWords.slice(0, 6).map(w =>
        '<span class="irvs-word" onclick="_ieltsHighlightWord(' + JSON.stringify(w) + ')">' + _esc(w) + '</span>'
      ).join('');
    passageCard.after(sidebar);
  }

  // Start timer
  const mins = parseInt(document.getElementById('ieltsTimerCustom_reading')?.value || '0', 10);
  const secs = mins > 0 ? mins * 60 : IELTS_TIMER_DEFAULTS.reading;
  _ieltsStartTimer('reading', secs);
  const btn = document.getElementById('ieltsTimerBtn_reading');
  if (btn) btn.textContent = '⏹ Stop Timer';

  _ieltsRenderReadingQuestion();
}

// ── Render current question ───────────────────────────────────────────
function _ieltsRenderReadingQuestion() {
  const { allQuestions, questionIndex, score } = _readingState;
  const q     = allQuestions[questionIndex];
  const total = allQuestions.length;
  const area  = document.getElementById('ieltsReadingQArea');
  if (!area || !q) return;

  const typeLabels = {
    mcq:      '📝 Multiple Choice',
    tfng:     '✅ True / False / Not Given',
    sentence: '✏️ Sentence Completion',
    heading:  '🔖 Matching Headings',
  };

  let inputHtml = '';

  if (q.type === 'mcq' || q.type === 'heading') {
    inputHtml = '<div class="mcq-options-list" id="ieltsReadingOptions">' +
      (q.options || []).map((opt, i) => {
        const letter = ['A','B','C','D'][i];
        return '<button class="mcq-option-btn" data-choice="' + letter + '" ' +
          'onclick="_ieltsAnswerReading(\'' + letter + '\')">' +
          '<span class="mcq-option-letter">' + letter + '</span>' +
          '<span class="mcq-option-text">' + _esc(opt.replace(/^[A-D]\)\s*/, '')) + '</span>' +
        '</button>';
      }).join('') +
    '</div>';
  } else if (q.type === 'tfng') {
    inputHtml = '<div class="mcq-options-list" id="ieltsReadingOptions">' +
      ['TRUE', 'FALSE', 'NOT GIVEN'].map(val =>
        '<button class="mcq-option-btn ielts-tfng-btn" onclick="_ieltsAnswerReading(\'' + val + '\')">' +
          '<span class="mcq-option-text">' + val + '</span>' +
        '</button>'
      ).join('') +
    '</div>';
  } else if (q.type === 'sentence') {
    inputHtml =
      '<div class="ielts-reading-sentence-wrap">' +
        '<input type="text" id="ieltsReadingSentenceInput" class="ielts-reading-sentence-input" ' +
          'placeholder="Type your answer…" autocomplete="off">' +
        '<button class="mcq-btn-primary" onclick="_ieltsSubmitSentenceAnswer()" style="margin-top:8px;width:100%">' +
          'Submit Answer' +
        '</button>' +
      '</div>';
  }

  area.innerHTML =
    '<div class="ielts-reading-q-card">' +
      '<div class="ielts-reading-q-header">' +
        '<span class="ielts-reading-q-type">' + (typeLabels[q.type] || '') + '</span>' +
        '<span class="ielts-reading-q-counter">Q' + (questionIndex + 1) + '/' + total + '</span>' +
      '</div>' +
      '<div class="quiz-progress-bar" style="margin:6px 0 10px">' +
        '<div class="quiz-progress-fill" style="width:' + Math.round((questionIndex / total) * 100) + '%"></div>' +
      '</div>' +
      (q.type === 'heading'
        ? '<div class="ielts-reading-para-excerpt">' + _esc((q.paragraph || '').slice(0, 180)) + '…</div>'
        : '') +
      '<div class="mcq-question-text">' + _esc(q.q || q.question || '') + '</div>' +
      inputHtml +
      '<div id="ieltsReadingFeedback"></div>' +
      '<button id="ieltsReadingNextBtn" class="mcq-next-btn" style="display:none" ' +
        'onclick="_ieltsNextReadingQuestion()">Next →</button>' +
    '</div>';

  // Wire Enter key for sentence input
  if (q.type === 'sentence') {
    const inp = document.getElementById('ieltsReadingSentenceInput');
    if (inp) inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') _ieltsSubmitSentenceAnswer();
    });
  }
}

// ── Answer handlers ───────────────────────────────────────────────────
function _ieltsAnswerReading(chosen) {
  const { allQuestions, questionIndex } = _readingState;
  const q = allQuestions[questionIndex];
  if (!q) return;

  const isRight = chosen.toUpperCase() === (q.correct || '').toUpperCase();
  _ieltsProcessReadingAnswer(chosen, isRight, q);
}

function _ieltsSubmitSentenceAnswer() {
  const inp = document.getElementById('ieltsReadingSentenceInput');
  const raw = (inp?.value || '').trim();
  if (!raw) return;

  const { allQuestions, questionIndex } = _readingState;
  const q = allQuestions[questionIndex];

  const isRight = _ieltsCheckSentenceAnswer(raw, q.answer || '');
  _ieltsProcessReadingAnswer(raw, isRight, q);
}

// Flexible sentence answer checker:
// 1. Exact match (case/space insensitive)
// 2. All key words (>3 chars) present in user answer
// 3. Plural/singular tolerance — "apple" matches "apples" and vice versa
// 4. Levenshtein distance ≤ 2 for short answers (typo tolerance)
function _ieltsCheckSentenceAnswer(userInput, correctAnswer) {
  const clean = s => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const u = clean(userInput);
  const c = clean(correctAnswer);

  // 1. Exact
  if (u === c) return true;

  // 2. Key word coverage — all significant words must appear
  const keyWords = c.split(/\s+/).filter(w => w.length > 3);
  if (keyWords.length && keyWords.every(w => u.includes(w))) return true;

  // 3. Plural/singular tolerance — strip trailing 's' from both and compare
  const deplural = s => s.replace(/s\b/g, '').replace(/\s+/g, ' ').trim();
  if (deplural(u) === deplural(c)) return true;
  // Key word coverage after depluraling
  const keyWordsDP = c.split(/\s+/).filter(w => w.length > 3).map(deplural);
  if (keyWordsDP.length && keyWordsDP.every(w => deplural(u).includes(w))) return true;

  // 4. Levenshtein for short answers (≤ 20 chars) — tolerates 1-2 typos
  if (c.length <= 20) {
    const dist = _levenshtein(u, c);
    if (dist <= Math.floor(c.length / 8) + 1) return true;
  }

  return false;
}

function _levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function _ieltsProcessReadingAnswer(chosen, isRight, q) {
  if (isRight) _readingState.score++;
  _readingState.userAnswers.push({ chosen, correct: q.correct || q.answer, isRight, type: q.type });

  // Track weak question types
  if (!isRight && q.type) _ieltsReadingTrackWeak(q.type);

  // Disable inputs
  document.querySelectorAll('#ieltsReadingOptions .mcq-option-btn, #ieltsReadingOptions .ielts-tfng-btn')
    .forEach(btn => {
      btn.disabled = true;
      const val = btn.dataset.choice || btn.textContent.trim();
      if (val === (q.correct || '').toUpperCase()) btn.classList.add('mcq-correct');
      else if (val === chosen.toUpperCase() && !isRight) btn.classList.add('mcq-wrong');
    });
  const sentInput = document.getElementById('ieltsReadingSentenceInput');
  if (sentInput) sentInput.disabled = true;

  // Feedback
  const fb = document.getElementById('ieltsReadingFeedback');
  if (fb) {
    fb.innerHTML =
      '<div class="mcq-feedback ' + (isRight ? 'mcq-feedback-correct' : 'mcq-feedback-wrong') + '">' +
        (isRight ? '✅ Correct!' : '❌ Incorrect — correct answer: <strong>' + _esc(q.correct || q.answer || '') + '</strong>') +
        (q.rationale ? '<div class="mcq-explanation">' + _esc(q.rationale) + '</div>' : '') +
        '<div class="ielts-explain-actions">' +
          '<button class="mcq-explain-btn" onclick="_ieltsReadingAIExplain(' + _readingState.questionIndex + ')">🧠 Why?</button>' +
        '</div>' +
      '</div>' +
      '<div id="ieltsReadingExplainPanel_' + _readingState.questionIndex + '" class="ielts-explain-panel" style="display:none"></div>';
  }

  const nextBtn = document.getElementById('ieltsReadingNextBtn');
  if (nextBtn) nextBtn.style.display = 'block';
}

// ── Paragraph extractor — sends only the relevant paragraph to AI ─────
// Finds the paragraph most likely to contain the answer evidence.
// For headings questions the paragraph excerpt is stored on q.paragraph.
// For all others we search the passage text for the first paragraph
// that contains a key word from the question or rationale.
function _ieltsExtractRelevantParagraph(passage, q) {
  const paragraphs = (passage.text || '').split('\n\n').filter(Boolean);

  // Empty passage — return empty string rather than crashing on undefined.slice
  if (!paragraphs.length) return '';

  // Heading questions store the paragraph text directly
  if (q.type === 'heading' && q.paragraph) {
    // q.paragraph is the excerpt — find the full paragraph it belongs to
    const match = paragraphs.find(p => p.includes((q.paragraph || '').slice(0, 40)));
    return match ? match.slice(0, 400) : q.paragraph.slice(0, 400);
  }

  // For other types: find the paragraph that best matches the rationale or question
  const hint = (q.rationale || q.q || q.question || '').toLowerCase();
  const keywords = hint.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 4);

  let bestPara = paragraphs[0];
  let bestScore = 0;
  paragraphs.forEach(para => {
    const lower = para.toLowerCase();
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestPara = para; }
  });

  return bestPara.slice(0, 400); // cap at ~400 chars to keep API cost low
}

// ── AI "Why?" explanation ─────────────────────────────────────────────
async function _ieltsReadingAIExplain(qIdx) {
  const panelId = 'ieltsReadingExplainPanel_' + qIdx;
  const panel   = document.getElementById(panelId);
  if (!panel) return;

  panel.style.display = 'block';
  panel.innerHTML = '<div class="ielts-explain-loading"><span class="nb-rag-spinner"></span> Nexora is explaining…</div>';

  const q       = _readingState.allQuestions[qIdx];
  const passage = _readingState.passage;
  const ans     = _readingState.userAnswers[qIdx];

  // Guard: state may have been reset if user navigated away mid-session
  if (!q || !passage) {
    panel.innerHTML = '<div class="ielts-explain-result"><div class="ielts-explain-text">Session ended — please start a new passage.</div></div>';
    return;
  }

  // Extract only the relevant paragraph — not the full passage
  const snippet = _ieltsExtractRelevantParagraph(passage, q);

  const sys = 'You are Nexora, an expert IELTS tutor. Using only the passage excerpt provided, explain in 2–3 sentences why the correct answer is correct. Quote the key phrase from the excerpt. Be specific and educational.';
  const usr = 'Passage: "' + passage.title + '"\n\nRelevant excerpt:\n' + snippet +
    '\n\nQuestion: ' + (q.q || q.question || '') +
    '\nCorrect answer: ' + (q.correct || q.answer) +
    '\nStudent answered: ' + (ans?.chosen || 'unknown') +
    '\nHint: ' + (q.rationale || 'none');

  try {
    const explanation = await callStudyAI(sys, usr);
    panel.innerHTML =
      '<div class="ielts-explain-result">' +
        '<div class="ielts-explain-label">🧠 Nexora explains:</div>' +
        '<div class="ielts-explain-text">' + _esc(explanation) + '</div>' +
        '<button class="ielts-explain-close" onclick="this.closest(\'.ielts-explain-panel\').style.display=\'none\'">✕ Close</button>' +
      '</div>';
  } catch(e) {
    panel.innerHTML =
      '<div class="ielts-explain-result">' +
        '<div class="ielts-explain-text">' + _esc(q.rationale || 'AI explanation unavailable. Check your API key.') + '</div>' +
        '<button class="ielts-explain-close" onclick="this.closest(\'.ielts-explain-panel\').style.display=\'none\'">✕ Close</button>' +
      '</div>';
  }
}

// ── Next question / finish ────────────────────────────────────────────
function _ieltsNextReadingQuestion() {
  _readingState.questionIndex++;
  const { allQuestions, questionIndex } = _readingState;

  if (questionIndex < allQuestions.length) {
    _ieltsRenderReadingQuestion();
    // Scroll passage back to top
    const passageCard = document.getElementById('ieltsReadingPassageCard');
    if (passageCard) passageCard.scrollTop = 0;
    return;
  }

  _ieltsFinishReading();
}

// ── Results ───────────────────────────────────────────────────────────
function _ieltsFinishReading() {
  _ieltsStopTimer('reading');

  const { score, allQuestions, passage } = _readingState;
  const total = allQuestions.length;
  const pct   = Math.round((score / total) * 100);
  const band  = _ieltsReadingBandFromScore(score, total);

  _ieltsRecordBand('reading', band);

  document.getElementById('ieltsReadingSession').style.display  = 'none';
  const resultsDiv = document.getElementById('ieltsReadingResults');
  resultsDiv.style.display = 'block';

  const cls   = _ieltsBandClass(band);
  const emoji = pct >= 80 ? '🎉' : pct >= 60 ? '📚' : '💪';

  // Per-type breakdown
  const types = ['mcq', 'tfng', 'sentence', 'heading'];
  const typeLabels = { mcq: 'Multiple Choice', tfng: 'True/False/NG', sentence: 'Sentence Completion', heading: 'Matching Headings' };
  const breakdown = types.map(t => {
    const qs      = allQuestions.filter(q => q.type === t);
    const correct = _readingState.userAnswers
      .filter((a, i) => allQuestions[i]?.type === t && a.isRight).length;
    if (!qs.length) return '';
    const tPct = Math.round((correct / qs.length) * 100);
    const tColor = tPct >= 75 ? '#10b981' : tPct >= 50 ? '#eab308' : '#ef4444';
    return '<div class="ielts-reading-breakdown-row">' +
      '<span>' + typeLabels[t] + '</span>' +
      '<span style="color:' + tColor + '">' + correct + '/' + qs.length + ' (' + tPct + '%)</span>' +
    '</div>';
  }).join('');

  // Weak area feedback + targeted strategy tip
  const weakType = _ieltsReadingGetWeakestType();
  const typeNames = { mcq: 'Multiple Choice', tfng: 'True/False/Not Given', sentence: 'Sentence Completion', heading: 'Matching Headings' };
  const strategyTip = weakType ? (IELTS_READING_STRATEGY_TIPS[weakType] || '') : '';
  const weakHtml = weakType
    ? '<div class="ielts-reading-weak-result">' +
        '💡 Your weakest area overall: <strong>' + (typeNames[weakType] || weakType) + '</strong>. Keep practising!' +
        (strategyTip ? '<div class="ielts-reading-strategy-tip">' + _esc(strategyTip) + '</div>' : '') +
      '</div>'
    : '';

  // Vocabulary export — collect sentence completion answers as study words
  const sentenceAnswers = allQuestions
    .map((q, i) => ({ q, a: _readingState.userAnswers[i] }))
    .filter(({ q, a }) => q.type === 'sentence' && a && !a.isRight)
    .map(({ q }) => q.answer || '')
    .filter(Boolean);
  const vocabExportHtml = sentenceAnswers.length
    ? '<div class="ielts-reading-vocab-export">' +
        '<div class="irvs-title">📌 Missed answers — added to your study list</div>' +
        sentenceAnswers.map(w => '<span class="irvs-word">' + _esc(w) + '</span>').join('') +
      '</div>'
    : '';

  // Add missed sentence answers to SRS for review
  if (sentenceAnswers.length) {
    allQuestions.forEach((q, i) => {
      if (q.type === 'sentence' && _readingState.userAnswers[i] && !_readingState.userAnswers[i].isRight) {
        _ieltsAddMissedToSRS({ q: q.q || q.question || '', correct: q.answer, explanation: q.rationale || '' }, '');
      }
    });
  }

  resultsDiv.innerHTML =
    '<div class="mcq-done-card">' +
      '<div class="mcq-done-emoji">' + emoji + '</div>' +
      '<div class="viva-critique-header" style="margin:8px 0">' +
        '<span class="viva-critique-label">Reading Score</span>' +
        '<span class="viva-score-badge ' + cls + '">Band ' + band.toFixed(1) + ' — ' + _ieltsBandLabel(band) + '</span>' +
      '</div>' +
      '<div class="mcq-done-score">' + score + ' / ' + total + '</div>' +
      '<div class="mcq-done-pct">' + pct + '% correct</div>' +
      '<div class="ielts-reading-breakdown">' + breakdown + '</div>' +
      weakHtml +
      vocabExportHtml +
      '<div class="mcq-done-actions">' +
        '<button class="mcq-btn-primary" onclick="_ieltsRestartReading()">🔁 Try Again</button>' +
        '<button class="mcq-btn-secondary" onclick="_ieltsReadingNewPassage()">📰 New Passage</button>' +
        '<button class="mcq-btn-secondary" onclick="_ieltsShowSubtab(\'progress\')">📊 Progress</button>' +
      '</div>' +
    '</div>';
}

function _ieltsRestartReading() {
  _ieltsStartReading(_readingState.passageIndex);
}

function _ieltsReadingNewPassage() {
  document.getElementById('ieltsReadingSetup').style.display   = 'block';
  document.getElementById('ieltsReadingSession').style.display = 'none';
  document.getElementById('ieltsReadingResults').style.display = 'none';
}

// ── Global exports ────────────────────────────────────────────────────
// ── Contextual word highlight in passage ──────────────────────────────
// Highlights the clicked vocab word in the passage body and speaks it
window._ieltsHighlightWord = function(word) {
  const body = document.getElementById('ieltsReadingPassageBody');
  if (!body) return;

  // Remove any previous highlights
  body.querySelectorAll('mark.irvs-highlight').forEach(m => {
    m.replaceWith(document.createTextNode(m.textContent));
  });

  // Highlight all case-insensitive occurrences
  const regex = new RegExp('(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  body.querySelectorAll('p').forEach(p => {
    p.innerHTML = p.innerHTML.replace(regex, '<mark class="irvs-highlight">$1</mark>');
  });

  // Scroll to first highlight
  const first = body.querySelector('mark.irvs-highlight');
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Orb speaks the word with its topic context
  _ieltsOrbTeach('The word ' + word + ' is key academic vocabulary for this topic. Listen for it in the passage.');
};
window._ieltsStartReading        = _ieltsStartReading;
window._ieltsAnswerReading       = _ieltsAnswerReading;
window._ieltsResetReadingToSetup = _ieltsResetReadingToSetup;
window._ieltsSubmitSentenceAnswer = _ieltsSubmitSentenceAnswer;
window._ieltsNextReadingQuestion = _ieltsNextReadingQuestion;
window._ieltsReadingAIExplain    = _ieltsReadingAIExplain;
window._ieltsRestartReading      = _ieltsRestartReading;
window._ieltsReadingNewPassage   = _ieltsReadingNewPassage;
window._ieltsExtractRelevantParagraph = _ieltsExtractRelevantParagraph;


// ── Additional passages pushed into the bank ──────────────────────────
IELTS_READING_PASSAGES.push(

  // ── PASSAGE 6: Neuroplasticity ────────────────────────────────────
  {
    id: 'neuroplasticity',
    title: 'Neuroplasticity and Adult Learning',
    topic: 'Science & Psychology',
    difficulty: 'hard',
    text: `For much of the twentieth century, the dominant view in neuroscience was that the adult brain was essentially fixed — a static organ whose structure was determined by early childhood development and could not be meaningfully altered thereafter. This view, sometimes called the "hardwired brain" hypothesis, held that neurons lost in adulthood could not be replaced and that the neural connections formed in youth were largely permanent. The implications for education and rehabilitation were profoundly pessimistic: adults were thought to be fundamentally limited in their capacity to acquire new skills or recover from brain injury.

This consensus has been overturned by decades of research into neuroplasticity — the brain's ability to reorganise itself by forming new neural connections throughout life. The term encompasses a range of phenomena, from the sprouting of new synaptic connections in response to learning, to the large-scale reorganisation of cortical maps following injury. Studies using functional magnetic resonance imaging (fMRI) have demonstrated that practising a skill — whether playing a musical instrument, learning a second language, or mastering a complex motor task — produces measurable changes in brain structure and function.

One of the most compelling demonstrations of adult neuroplasticity comes from studies of London taxi drivers. Researchers found that the hippocampus — a brain region associated with spatial navigation — was significantly larger in experienced taxi drivers than in control subjects, and that the size of this region correlated with the number of years spent driving. This finding suggested that sustained mental activity could physically reshape the brain, even in adulthood.

The educational implications of neuroplasticity are substantial. If the adult brain retains the capacity for structural change, then the traditional view that learning is primarily a childhood phenomenon must be revised. Research suggests that the key conditions for adult neuroplasticity include focused attention, spaced repetition, and the experience of challenge — conditions that are often absent from passive or routine activities. Sleep also plays a critical role: it is during sleep that the brain consolidates newly formed connections and clears metabolic waste products that accumulate during waking hours.

Critics caution against overstating the implications of neuroplasticity research. The brain's capacity for change is not unlimited, and the rate of plasticity does decline with age. Furthermore, not all forms of brain change are beneficial: neuroplasticity also underlies the development of addiction and chronic pain. Nevertheless, the field has fundamentally transformed our understanding of human potential and opened new avenues for education, therapy, and cognitive enhancement across the lifespan.`,
    questionsMCQ: [
      { q: "What was the 'hardwired brain' hypothesis?", options: ["A) That the brain grows throughout life", "B) That adult brain structure was fixed and could not be meaningfully altered", "C) That neurons could be replaced through exercise", "D) That childhood learning was less important than adult learning"], correct: "B", rationale: "The passage defines the hardwired brain hypothesis as the view that adult brain structure 'could not be meaningfully altered'." },
      { q: "What did the London taxi driver study find about the hippocampus?", options: ["A) It was smaller in experienced drivers", "B) It showed no difference between drivers and non-drivers", "C) It was significantly larger in experienced taxi drivers", "D) It was only larger in drivers under 40"], correct: "C", rationale: "The passage states the hippocampus 'was significantly larger in experienced taxi drivers than in control subjects'." },
      { q: "According to the passage, which conditions support adult neuroplasticity?", options: ["A) Passive activities and routine tasks", "B) Focused attention, spaced repetition, and challenge", "C) Physical exercise and good nutrition", "D) Early childhood education and parental support"], correct: "B", rationale: "The passage states 'the key conditions for adult neuroplasticity include focused attention, spaced repetition, and the experience of challenge'." },
      { q: "Which of the following is mentioned as a negative application of neuroplasticity?", options: ["A) Language learning", "B) Spatial navigation", "C) Addiction and chronic pain", "D) Musical skill development"], correct: "C", rationale: "The passage states 'neuroplasticity also underlies the development of addiction and chronic pain'." },
    ],
    questionsTFNG: [
      { q: "The hardwired brain hypothesis was optimistic about adult learning potential.", correct: "FALSE", rationale: "The passage states the implications were 'profoundly pessimistic'." },
      { q: "fMRI studies have shown that practising skills produces measurable changes in brain structure.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "The hippocampus size in taxi drivers was unrelated to years of driving experience.", correct: "FALSE", rationale: "The passage states size 'correlated with the number of years spent driving'." },
      { q: "Sleep helps consolidate newly formed neural connections.", correct: "TRUE", rationale: "The passage states 'it is during sleep that the brain consolidates newly formed connections'." },
    ],
    questionsSentence: [
      { q: "Neuroplasticity refers to the brain's ability to reorganise itself by forming new __ throughout life.", answer: "neural connections", rationale: "The passage defines neuroplasticity as 'the brain's ability to reorganise itself by forming new neural connections throughout life'." },
      { q: "The rate of neuroplasticity __ with age, though it does not disappear entirely.", answer: "declines", rationale: "The passage states 'the rate of plasticity does decline with age'." },
    ],
    questionsHeadings: [
      { paragraph: "For much of the twentieth century, the dominant view in neuroscience was that the adult brain was essentially fixed", options: ["A) New discoveries in brain surgery", "B) The outdated view of the fixed adult brain", "C) How children learn faster than adults", "D) The history of fMRI technology"], correct: "B", rationale: "This paragraph describes the old 'hardwired brain' hypothesis." },
      { paragraph: "The educational implications of neuroplasticity are substantial.", options: ["A) Why schools should teach neuroscience", "B) The limits of adult memory", "C) What neuroplasticity means for learning and education", "D) How sleep affects children's performance"], correct: "C", rationale: "This paragraph discusses the educational implications of neuroplasticity." },
    ],
  },

  // ── PASSAGE 7: Hydrogen Fuel Cells ───────────────────────────────
  {
    id: 'hydrogen_fuel',
    title: 'Hydrogen Fuel Cells in Transport',
    topic: 'Science & Technology',
    difficulty: 'medium',
    text: `As the world seeks to decarbonise its transport sector, hydrogen fuel cells have emerged as a compelling alternative to both conventional internal combustion engines and battery electric vehicles. A hydrogen fuel cell generates electricity through an electrochemical reaction between hydrogen and oxygen, producing only water vapour as a by-product. This zero-emission profile, combined with the high energy density of hydrogen, has attracted significant interest from governments, automakers, and investors worldwide.

The operating principle of a fuel cell is straightforward. Hydrogen gas is fed to the anode of the cell, where it is split into protons and electrons. The electrons travel through an external circuit, generating an electric current that powers the vehicle's motor. The protons pass through a membrane to the cathode, where they combine with oxygen from the air and the returning electrons to form water. The entire process is silent, efficient, and produces no direct emissions at the point of use.

Despite these advantages, hydrogen fuel cell vehicles face significant practical challenges. The production of hydrogen itself is currently dominated by a process called steam methane reforming, which uses natural gas and releases substantial quantities of carbon dioxide. So-called "green hydrogen" — produced by electrolysis of water using renewable electricity — is far cleaner but remains expensive and is produced in limited quantities. Until green hydrogen becomes widely available and affordable, the environmental credentials of hydrogen vehicles are compromised.

Infrastructure is another major barrier. Unlike battery electric vehicles, which can be charged using existing electricity networks, hydrogen vehicles require a dedicated network of refuelling stations. These stations are expensive to build and operate, and their sparse distribution severely limits the practical range of hydrogen vehicles outside of specific corridors. Japan and South Korea have made the most progress in building hydrogen infrastructure, while deployment in Europe and North America remains limited.

Proponents argue that hydrogen fuel cells are particularly well suited to applications where battery technology struggles: long-haul trucking, shipping, aviation, and heavy industry. In these sectors, the weight and recharging time of batteries are prohibitive, while hydrogen's high energy density and rapid refuelling make it a more practical option. Several major shipping companies and airlines have announced pilot programmes using hydrogen propulsion, suggesting that the technology's future may lie in heavy transport rather than passenger cars.`,
    questionsMCQ: [
      { q: "What is the only by-product of a hydrogen fuel cell reaction?", options: ["A) Carbon dioxide", "B) Nitrogen oxide", "C) Water vapour", "D) Methane"], correct: "C", rationale: "The passage states the reaction produces 'only water vapour as a by-product'." },
      { q: "What is the main environmental problem with current hydrogen production?", options: ["A) It uses too much water", "B) Steam methane reforming releases substantial CO2", "C) Electrolysis produces toxic waste", "D) Hydrogen is extracted from coal"], correct: "B", rationale: "The passage states current production 'uses natural gas and releases substantial quantities of carbon dioxide'." },
      { q: "Which countries have made the most progress in hydrogen infrastructure?", options: ["A) Germany and France", "B) USA and Canada", "C) Japan and South Korea", "D) China and Australia"], correct: "C", rationale: "The passage explicitly states 'Japan and South Korea have made the most progress in building hydrogen infrastructure'." },
      { q: "For which applications does the passage suggest hydrogen is most suitable?", options: ["A) Small urban passenger cars", "B) Short-distance commuting", "C) Long-haul trucking, shipping, and aviation", "D) Motorcycles and bicycles"], correct: "C", rationale: "The passage states hydrogen is 'particularly well suited to applications where battery technology struggles: long-haul trucking, shipping, aviation'." },
    ],
    questionsTFNG: [
      { q: "Hydrogen fuel cells produce carbon dioxide at the point of use.", correct: "FALSE", rationale: "The passage states the process 'produces no direct emissions at the point of use'." },
      { q: "Green hydrogen is currently produced in large quantities at low cost.", correct: "FALSE", rationale: "The passage states it 'remains expensive and is produced in limited quantities'." },
      { q: "Hydrogen vehicles can be refuelled using existing electricity networks.", correct: "FALSE", rationale: "The passage states they 'require a dedicated network of refuelling stations'." },
      { q: "Some airlines have announced pilot programmes using hydrogen propulsion.", correct: "TRUE", rationale: "The passage explicitly states this." },
    ],
    questionsSentence: [
      { q: "In a fuel cell, hydrogen is split into protons and electrons at the __.", answer: "anode", rationale: "The passage states 'Hydrogen gas is fed to the anode of the cell, where it is split into protons and electrons'." },
      { q: "Hydrogen produced by electrolysis using renewable electricity is called __ hydrogen.", answer: "green", rationale: "The passage refers to 'green hydrogen — produced by electrolysis of water using renewable electricity'." },
    ],
    questionsHeadings: [
      { paragraph: "Despite these advantages, hydrogen fuel cell vehicles face significant practical challenges.", options: ["A) Why hydrogen is better than batteries", "B) The challenges facing hydrogen vehicles", "C) How to build a refuelling station", "D) The cost of renewable energy"], correct: "B", rationale: "This paragraph introduces the practical challenges facing hydrogen vehicles." },
      { paragraph: "Proponents argue that hydrogen fuel cells are particularly well suited to applications where battery technology struggles", options: ["A) Why passenger cars should use hydrogen", "B) The future of battery technology", "C) Hydrogen's strongest use cases in heavy transport", "D) How airlines are reducing emissions"], correct: "C", rationale: "This paragraph argues hydrogen is best suited to heavy transport applications." },
    ],
  },

  // ── PASSAGE 8: The Silk Road ──────────────────────────────────────
  {
    id: 'silk_road',
    title: 'The Silk Road: Trade, Culture, and Connection',
    topic: 'History & Culture',
    difficulty: 'medium',
    text: `The Silk Road was not a single road but a vast network of trade routes connecting China with Central Asia, the Middle East, and ultimately Europe. Spanning more than 6,400 kilometres at its greatest extent, it was one of the most significant conduits of cultural and commercial exchange in human history. The name, coined by German geographer Ferdinand von Richthofen in 1877, reflects the prominence of Chinese silk among the goods traded, though the routes carried a far wider range of commodities, ideas, and peoples.

Trade along the Silk Road flourished most vigorously during the Han Dynasty in China (206 BCE – 220 CE) and again during the Tang Dynasty (618–907 CE), when the routes were protected by powerful empires and relatively safe for merchants. Caravans of camels and horses transported silk, spices, glassware, precious metals, and textiles across deserts and mountain passes. The journey from China to the Mediterranean could take years, and few merchants travelled the entire route; instead, goods passed through a succession of intermediaries, each adding to the price.

The Silk Road was as much a conduit for ideas as for goods. Buddhism spread from India to China along these routes, transforming Chinese culture and society. Islam later spread westward and eastward from Arabia, carried by merchants and missionaries. Technologies including papermaking, printing, and gunpowder travelled from China to the Islamic world and eventually to Europe, where they contributed to the Renaissance and the Scientific Revolution. The exchange of agricultural products — including cotton, rice, and various fruits — altered diets and farming practices across Eurasia.

The routes also facilitated the spread of disease. The Black Death, which devastated Europe in the fourteenth century, is believed to have originated in Central Asia and spread westward along Silk Road trade networks. This darker legacy serves as a reminder that connectivity, while generally beneficial, also carries risks.

The Silk Road declined as a major trade artery following the rise of maritime trade routes in the fifteenth and sixteenth centuries. Portuguese and Spanish navigators opened sea routes to Asia that were faster, cheaper, and capable of carrying far larger volumes of goods than overland caravans. The Ottoman Empire's control of key overland routes also made trade more difficult and expensive for European merchants. Today, the Silk Road survives as a powerful symbol of intercultural exchange, and China's Belt and Road Initiative — a massive infrastructure investment programme — has been explicitly framed as a modern revival of the ancient network.`,
    questionsMCQ: [
      { q: "Who coined the term 'Silk Road' and when?", options: ["A) A Chinese emperor during the Han Dynasty", "B) Ferdinand von Richthofen, a German geographer, in 1877", "C) A Portuguese navigator in the fifteenth century", "D) An Arab merchant during the Tang Dynasty"], correct: "B", rationale: "The passage states the name was 'coined by German geographer Ferdinand von Richthofen in 1877'." },
      { q: "Why did few merchants travel the entire length of the Silk Road?", options: ["A) The journey was too dangerous due to bandits", "B) Goods passed through a succession of intermediaries", "C) Only camels could survive the full journey", "D) Imperial laws restricted travel beyond certain borders"], correct: "B", rationale: "The passage states 'goods passed through a succession of intermediaries, each adding to the price'." },
      { q: "Which of the following technologies travelled from China to Europe via the Silk Road?", options: ["A) The printing press and the compass", "B) Papermaking, printing, and gunpowder", "C) The steam engine and electricity", "D) Glass-blowing and iron smelting"], correct: "B", rationale: "The passage explicitly lists 'papermaking, printing, and gunpowder' as technologies that travelled from China." },
      { q: "What caused the decline of the Silk Road as a major trade route?", options: ["A) The collapse of the Chinese empire", "B) Climate change making deserts impassable", "C) The rise of maritime trade routes in the 15th–16th centuries", "D) The spread of the Black Death along the routes"], correct: "C", rationale: "The passage states the Silk Road 'declined as a major trade artery following the rise of maritime trade routes in the fifteenth and sixteenth centuries'." },
    ],
    questionsTFNG: [
      { q: "The Silk Road was a single, well-defined road connecting China to Europe.", correct: "FALSE", rationale: "The passage states it was 'not a single road but a vast network of trade routes'." },
      { q: "Buddhism spread from India to China along the Silk Road.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "The Black Death is believed to have originated in China.", correct: "FALSE", rationale: "The passage states it 'is believed to have originated in Central Asia'." },
      { q: "China's Belt and Road Initiative has been framed as a revival of the ancient Silk Road.", correct: "TRUE", rationale: "The passage explicitly states this." },
    ],
    questionsSentence: [
      { q: "The Silk Road flourished most during the Han Dynasty and again during the __ Dynasty.", answer: "Tang", rationale: "The passage states trade 'flourished most vigorously during the Han Dynasty... and again during the Tang Dynasty'." },
      { q: "The Ottoman Empire's control of key overland routes made trade more __ for European merchants.", answer: "difficult and expensive", rationale: "The passage states Ottoman control 'made trade more difficult and expensive for European merchants'." },
    ],
    questionsHeadings: [
      { paragraph: "The Silk Road was as much a conduit for ideas as for goods.", options: ["A) The goods traded on the Silk Road", "B) How the Silk Road spread religion and technology", "C) The decline of overland trade", "D) China's influence on European art"], correct: "B", rationale: "This paragraph describes the spread of ideas, religion, and technology along the Silk Road." },
      { paragraph: "The routes also facilitated the spread of disease.", options: ["A) The benefits of global trade", "B) How merchants avoided illness", "C) The darker consequences of Silk Road connectivity", "D) Medical advances along the trade routes"], correct: "C", rationale: "This paragraph discusses the spread of disease as a negative consequence of connectivity." },
    ],
  },

  // ── PASSAGE 9: Vertical Farming ───────────────────────────────────
  {
    id: 'vertical_farming',
    title: 'Vertical Farming: Growing Up',
    topic: 'Environment & Technology',
    difficulty: 'medium',
    text: `As the global population approaches ten billion and arable land becomes increasingly scarce, vertical farming has emerged as a radical reimagining of how food can be produced. Rather than spreading crops across vast horizontal fields, vertical farms stack growing layers in controlled indoor environments — warehouses, repurposed factories, or purpose-built towers — using artificial lighting, hydroponic or aeroponic growing systems, and precise climate control. Proponents argue that the approach can produce far more food per square metre than conventional agriculture while using a fraction of the water and eliminating the need for pesticides.

The environmental case for vertical farming is compelling in several respects. Hydroponic systems, in which plants grow in nutrient-rich water rather than soil, can reduce water consumption by up to 95 percent compared to field agriculture. Because crops are grown indoors, they are protected from weather extremes, pests, and diseases, reducing crop losses and the need for chemical interventions. Vertical farms can be located in or near cities, dramatically shortening supply chains and reducing the carbon emissions associated with food transportation.

However, the technology faces significant economic and energy challenges. The capital cost of establishing a vertical farm is substantially higher than that of a conventional farm of equivalent output. More critically, vertical farms rely entirely on artificial lighting — typically LED arrays — which consumes large quantities of electricity. If this electricity is generated from fossil fuels, the carbon footprint of vertically farmed produce can exceed that of conventionally grown food. The economics only work convincingly when electricity is cheap and clean, or when the crops being grown are high-value items such as leafy greens, herbs, and strawberries.

Several large-scale vertical farming companies have struggled financially in recent years. AeroFarms, once considered a pioneer of the industry, filed for bankruptcy in 2023. AppHarvest, which operated large indoor tomato farms in Kentucky, also faced severe financial difficulties. These failures have prompted a reassessment of the sector's near-term viability and highlighted the gap between the technology's theoretical promise and its commercial reality.

Despite these setbacks, investment in vertical farming continues, driven by long-term concerns about food security, climate change, and the resilience of global supply chains. Researchers are working to reduce the energy intensity of LED lighting and to develop crop varieties better suited to indoor growing conditions. In regions where land is extremely scarce — Singapore, Japan, and parts of the Middle East — vertical farming is already economically viable for certain crops. The technology is unlikely to replace conventional agriculture entirely, but it may play an increasingly important role in feeding urban populations and providing food security in vulnerable regions.`,
    questionsMCQ: [
      { q: "What is the primary advantage of hydroponic systems mentioned in the passage?", options: ["A) They eliminate the need for artificial lighting", "B) They can reduce water consumption by up to 95 percent", "C) They produce crops faster than soil-based farming", "D) They require less capital investment than conventional farms"], correct: "B", rationale: "The passage states hydroponic systems 'can reduce water consumption by up to 95 percent compared to field agriculture'." },
      { q: "What is identified as the most critical energy challenge for vertical farms?", options: ["A) Heating and cooling systems", "B) Water pumping and filtration", "C) Artificial LED lighting consuming large quantities of electricity", "D) Automated harvesting machinery"], correct: "C", rationale: "The passage states 'vertical farms rely entirely on artificial lighting — typically LED arrays — which consumes large quantities of electricity'." },
      { q: "What happened to AeroFarms in 2023?", options: ["A) It was acquired by a larger agricultural company", "B) It expanded into Asian markets", "C) It filed for bankruptcy", "D) It switched to solar-powered operations"], correct: "C", rationale: "The passage explicitly states 'AeroFarms... filed for bankruptcy in 2023'." },
      { q: "In which regions is vertical farming described as already economically viable?", options: ["A) The United States and Canada", "B) Sub-Saharan Africa and South America", "C) Singapore, Japan, and parts of the Middle East", "D) Northern Europe and Scandinavia"], correct: "C", rationale: "The passage states 'In regions where land is extremely scarce — Singapore, Japan, and parts of the Middle East — vertical farming is already economically viable'." },
    ],
    questionsTFNG: [
      { q: "Vertical farms can be located near cities to reduce food transportation emissions.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "The capital cost of a vertical farm is lower than that of a conventional farm of equivalent output.", correct: "FALSE", rationale: "The passage states the capital cost 'is substantially higher'." },
      { q: "AppHarvest operated large indoor tomato farms in Kentucky.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "Vertical farming is expected to completely replace conventional agriculture within 20 years.", correct: "NOT GIVEN", rationale: "The passage states it is 'unlikely to replace conventional agriculture entirely' but gives no 20-year timeline." },
    ],
    questionsSentence: [
      { q: "Vertical farming is economically most convincing when electricity is cheap and clean, or when crops are __ items.", answer: "high-value", rationale: "The passage states 'The economics only work convincingly when electricity is cheap and clean, or when the crops being grown are high-value items'." },
      { q: "Researchers are working to reduce the __ of LED lighting to make vertical farming more viable.", answer: "energy intensity", rationale: "The passage states 'Researchers are working to reduce the energy intensity of LED lighting'." },
    ],
    questionsHeadings: [
      { paragraph: "However, the technology faces significant economic and energy challenges.", options: ["A) The environmental benefits of indoor farming", "B) Why vertical farms are always profitable", "C) The economic and energy obstacles to vertical farming", "D) How LED technology works"], correct: "C", rationale: "This paragraph introduces the economic and energy challenges facing vertical farming." },
      { paragraph: "Several large-scale vertical farming companies have struggled financially in recent years.", options: ["A) Success stories in vertical farming", "B) High-profile financial failures in the sector", "C) Why investors avoid agriculture", "D) The future of food technology"], correct: "B", rationale: "This paragraph describes financial failures of major vertical farming companies." },
    ],
  },

  // ── PASSAGE 10: Deep Sea Bioluminescence ──────────────────────────
  {
    id: 'bioluminescence',
    title: 'Deep Sea Bioluminescence: Light in the Dark',
    topic: 'Science & Nature',
    difficulty: 'medium',
    text: `More than 80 percent of the ocean lies in perpetual darkness, beyond the reach of sunlight. Yet this vast, lightless realm is far from lifeless. Many of its inhabitants have evolved the remarkable ability to produce their own light — a phenomenon known as bioluminescence. From the ghostly glow of deep-sea jellyfish to the flashing lures of anglerfish, bioluminescence is one of the most widespread and evolutionarily successful adaptations in the ocean, having evolved independently in at least 40 separate lineages of marine organisms.

Bioluminescence is produced through a chemical reaction involving a light-emitting molecule called luciferin and an enzyme called luciferase. When luciferin is oxidised in the presence of luciferase, it releases energy in the form of light. The reaction is remarkably efficient: unlike incandescent bulbs, which convert only about 5 percent of energy into light, bioluminescent reactions convert nearly all of their chemical energy into light, producing almost no heat. The colour of the light produced varies by species, though blue-green wavelengths predominate in marine environments because they travel furthest through seawater.

Bioluminescence serves a variety of functions in the deep sea. Predators use it to attract prey: the anglerfish dangles a bioluminescent lure above its mouth to draw in curious smaller fish. Prey species use it defensively — some squid eject clouds of bioluminescent ink to confuse predators, while others use counter-illumination, producing light on their undersides to match the faint downwelling light from above and render themselves invisible to predators looking upward. Communication is another function: certain species of firefly squid use complex patterns of bioluminescent flashes to signal potential mates.

The study of bioluminescence has yielded significant practical applications. Green fluorescent protein (GFP), originally isolated from a bioluminescent jellyfish, has become one of the most important tools in molecular biology, allowing researchers to tag and track specific proteins and cells in living organisms. This discovery earned its researchers the Nobel Prize in Chemistry in 2008. Bioluminescent bacteria are being investigated as biosensors for detecting environmental pollutants, and bioluminescent markers are being explored for use in medical imaging.

Despite decades of research, the deep ocean remains poorly explored, and scientists estimate that the majority of bioluminescent species have yet to be discovered or described. Advances in deep-sea submersible technology and in situ imaging are gradually revealing the full extent of this hidden light show, with implications not only for our understanding of marine biology but also for the development of new biotechnologies inspired by nature's most elegant chemical reaction.`,
    questionsMCQ: [
      { q: "What two molecules are involved in producing bioluminescence?", options: ["A) Chlorophyll and carotene", "B) Luciferin and luciferase", "C) Haemoglobin and myoglobin", "D) ATP and ADP"], correct: "B", rationale: "The passage states bioluminescence involves 'a light-emitting molecule called luciferin and an enzyme called luciferase'." },
      { q: "Why do blue-green wavelengths predominate in marine bioluminescence?", options: ["A) They are the only colours luciferase can produce", "B) They are most visible to deep-sea predators", "C) They travel furthest through seawater", "D) They require the least chemical energy to produce"], correct: "C", rationale: "The passage states 'blue-green wavelengths predominate in marine environments because they travel furthest through seawater'." },
      { q: "What is counter-illumination?", options: ["A) Using bioluminescent ink to blind predators", "B) Producing light on the underside to match downwelling light and avoid detection", "C) Flashing light patterns to attract mates", "D) Using a bioluminescent lure to attract prey"], correct: "B", rationale: "The passage defines counter-illumination as 'producing light on their undersides to match the faint downwelling light from above'." },
      { q: "What Nobel Prize-winning discovery came from bioluminescence research?", options: ["A) The structure of DNA", "B) The discovery of luciferase", "C) Green fluorescent protein (GFP) from a jellyfish", "D) The development of LED lighting"], correct: "C", rationale: "The passage states 'Green fluorescent protein (GFP), originally isolated from a bioluminescent jellyfish... earned its researchers the Nobel Prize in Chemistry in 2008'." },
    ],
    questionsTFNG: [
      { q: "Bioluminescence has evolved independently in at least 40 separate lineages of marine organisms.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "Bioluminescent reactions produce significant amounts of heat as a by-product.", correct: "FALSE", rationale: "The passage states bioluminescent reactions produce 'almost no heat'." },
      { q: "The majority of bioluminescent species have already been discovered and described.", correct: "FALSE", rationale: "The passage states 'the majority of bioluminescent species have yet to be discovered or described'." },
      { q: "Bioluminescent bacteria are being investigated as biosensors for detecting pollutants.", correct: "TRUE", rationale: "The passage explicitly states this." },
    ],
    questionsSentence: [
      { q: "The anglerfish uses a bioluminescent __ to attract smaller fish towards its mouth.", answer: "lure", rationale: "The passage states 'the anglerfish dangles a bioluminescent lure above its mouth to draw in curious smaller fish'." },
      { q: "GFP has become one of the most important tools in __ biology.", answer: "molecular", rationale: "The passage states GFP 'has become one of the most important tools in molecular biology'." },
    ],
    questionsHeadings: [
      { paragraph: "Bioluminescence serves a variety of functions in the deep sea.", options: ["A) How bioluminescence is produced chemically", "B) The many roles bioluminescence plays in survival", "C) Why the deep sea is dangerous", "D) How squid communicate underwater"], correct: "B", rationale: "This paragraph describes the various survival functions of bioluminescence." },
      { paragraph: "The study of bioluminescence has yielded significant practical applications.", options: ["A) The history of marine biology", "B) Why the deep ocean is unexplored", "C) Real-world applications of bioluminescence research", "D) How Nobel Prizes are awarded"], correct: "C", rationale: "This paragraph describes practical applications derived from bioluminescence research." },
    ],
  }
);


IELTS_READING_PASSAGES.push(

  // ── PASSAGE 11: Desalination ──────────────────────────────────────
  {
    id: 'desalination',
    title: 'Desalination and the Global Water Crisis',
    topic: 'Environment & Technology',
    difficulty: 'hard',
    text: `Fresh water is among the most unevenly distributed resources on Earth. While the planet's surface is approximately 71 percent water, only about 2.5 percent of that total is fresh water, and the vast majority of this is locked in glaciers and ice caps. The remainder — accessible in rivers, lakes, and aquifers — is under increasing pressure from population growth, agricultural demand, industrial use, and climate change. By 2025, the United Nations estimates that two-thirds of the world's population could be living under water-stressed conditions.

Desalination — the process of removing salt and other dissolved minerals from seawater or brackish water to produce fresh water — has long been proposed as a technological solution to water scarcity. The two dominant technologies are thermal desalination, which heats seawater until it evaporates and then condenses the vapour, and reverse osmosis, which forces water through semi-permeable membranes under high pressure, leaving salt and impurities behind. Reverse osmosis has become the preferred method in most new installations due to its lower energy requirements and greater scalability.

The Middle East and North Africa region accounts for nearly half of the world's desalination capacity, driven by the combination of extreme water scarcity and abundant fossil fuel resources to power the energy-intensive process. Saudi Arabia, the United Arab Emirates, and Israel are among the world's largest producers of desalinated water. Israel, in particular, has become a global leader in desalination technology, with desalinated water now supplying more than 80 percent of the country's domestic water needs.

Despite its potential, desalination faces serious environmental and economic challenges. The process is highly energy-intensive: producing one cubic metre of fresh water through reverse osmosis requires approximately 3–10 kilowatt-hours of electricity, depending on the salinity of the source water. When this energy comes from fossil fuels, desalination contributes significantly to greenhouse gas emissions. The disposal of brine — the highly concentrated salt solution left after desalination — poses additional environmental risks, as its discharge into the ocean can harm marine ecosystems by raising local salinity levels and depleting oxygen.

Research into next-generation desalination technologies is ongoing. Solar-powered desalination systems are being developed that could dramatically reduce the carbon footprint of the process. Graphene-based membranes, which are thinner and more permeable than conventional materials, promise to reduce energy requirements further. Forward osmosis, which uses a concentrated draw solution to pull water through a membrane without high-pressure pumps, is another area of active investigation. Whether these innovations can make desalination affordable and sustainable at the scale required to address global water scarcity remains an open question.`,
    questionsMCQ: [
      { q: "What percentage of Earth's water is fresh water?", options: ["A) 71 percent", "B) 50 percent", "C) 2.5 percent", "D) 10 percent"], correct: "C", rationale: "The passage states 'only about 2.5 percent of that total is fresh water'." },
      { q: "Why has reverse osmosis become the preferred desalination method?", options: ["A) It produces higher quality water than thermal methods", "B) It has lower energy requirements and greater scalability", "C) It does not produce brine as a by-product", "D) It can be powered entirely by solar energy"], correct: "B", rationale: "The passage states reverse osmosis is preferred 'due to its lower energy requirements and greater scalability'." },
      { q: "What percentage of Israel's domestic water needs is supplied by desalinated water?", options: ["A) More than 50 percent", "B) More than 80 percent", "C) Approximately 60 percent", "D) Nearly 100 percent"], correct: "B", rationale: "The passage states 'desalinated water now supplying more than 80 percent of the country's domestic water needs'." },
      { q: "What environmental risk is associated with brine disposal?", options: ["A) It contaminates groundwater aquifers", "B) It raises local salinity and depletes oxygen in the ocean", "C) It releases toxic chemicals into the atmosphere", "D) It accelerates coastal erosion"], correct: "B", rationale: "The passage states brine discharge 'can harm marine ecosystems by raising local salinity levels and depleting oxygen'." },
    ],
    questionsTFNG: [
      { q: "The UN estimates two-thirds of the world's population could face water stress by 2025.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "Thermal desalination is currently the most widely used method in new installations.", correct: "FALSE", rationale: "The passage states reverse osmosis 'has become the preferred method in most new installations'." },
      { q: "Saudi Arabia and the UAE are among the world's largest producers of desalinated water.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "Graphene-based membranes are already in widespread commercial use for desalination.", correct: "NOT GIVEN", rationale: "The passage mentions graphene membranes as a research development but does not state they are in widespread commercial use." },
    ],
    questionsSentence: [
      { q: "Reverse osmosis forces water through semi-permeable __ under high pressure.", answer: "membranes", rationale: "The passage states reverse osmosis 'forces water through semi-permeable membranes under high pressure'." },
      { q: "Solar-powered desalination systems could dramatically reduce the __ of the process.", answer: "carbon footprint", rationale: "The passage states solar-powered systems 'could dramatically reduce the carbon footprint of the process'." },
    ],
    questionsHeadings: [
      { paragraph: "Fresh water is among the most unevenly distributed resources on Earth.", options: ["A) How oceans cover the Earth", "B) The global fresh water scarcity problem", "C) Why glaciers are melting", "D) The history of water management"], correct: "B", rationale: "This paragraph establishes the global fresh water scarcity problem." },
      { paragraph: "Research into next-generation desalination technologies is ongoing.", options: ["A) The current cost of desalination", "B) Why reverse osmosis is inefficient", "C) Emerging technologies to improve desalination", "D) How graphene is manufactured"], correct: "C", rationale: "This paragraph describes next-generation desalination technologies under development." },
    ],
  },

  // ── PASSAGE 12: Circadian Rhythms ────────────────────────────────
  {
    id: 'circadian_rhythms',
    title: 'Circadian Rhythms and Human Health',
    topic: 'Science & Medicine',
    difficulty: 'hard',
    text: `Every living organism on Earth, from single-celled bacteria to complex mammals, possesses an internal biological clock that regulates physiological processes in alignment with the 24-hour cycle of day and night. In humans, this circadian clock — from the Latin circa diem, meaning "around a day" — governs a remarkable range of functions, including sleep-wake cycles, hormone secretion, body temperature, metabolism, immune function, and cell division. The molecular mechanisms underlying the clock were elucidated in a series of discoveries that earned Jeffrey Hall, Michael Rosbash, and Michael Young the Nobel Prize in Physiology or Medicine in 2017.

The master clock in humans is located in a tiny region of the hypothalamus called the suprachiasmatic nucleus (SCN), which contains approximately 20,000 neurons. The SCN receives direct input from light-sensitive cells in the retina and uses this information to synchronise the body's internal clock with the external environment. When light enters the eye, it suppresses the production of melatonin — a hormone produced by the pineal gland that promotes sleep — and signals the body to remain alert. As light fades in the evening, melatonin production rises, preparing the body for sleep.

Disruption of circadian rhythms has been linked to a wide range of health problems. Shift workers, who regularly work at night and sleep during the day, experience chronic misalignment between their internal clocks and the external environment — a condition sometimes called social jetlag. Research has associated shift work with increased risks of obesity, type 2 diabetes, cardiovascular disease, and certain cancers. The mechanisms are complex but include disruption of metabolic hormones such as insulin and cortisol, impaired immune function, and altered patterns of cell division that may increase cancer risk.

The timing of medical treatments — a field known as chronotherapy — is an emerging area of research that exploits the body's circadian rhythms to improve therapeutic outcomes. Studies have shown that the efficacy and toxicity of many drugs vary significantly depending on the time of day they are administered. Chemotherapy drugs, for example, are often more effective and less toxic when given at specific times aligned with the circadian rhythms of tumour cells. Similarly, blood pressure medications may be more effective when taken at night, when blood pressure naturally rises in some patients.

The widespread use of artificial light at night — from smartphones, tablets, and LED lighting — has raised concerns about its effects on circadian health. Blue-wavelength light, which is particularly abundant in the screens of electronic devices, is especially effective at suppressing melatonin production. Public health researchers have called for greater awareness of the importance of circadian health and for design standards that reduce the blue-light content of artificial lighting in the evening hours.`,
    questionsMCQ: [
      { q: "Where is the master circadian clock located in humans?", options: ["A) The pineal gland", "B) The cerebral cortex", "C) The suprachiasmatic nucleus in the hypothalamus", "D) The retina"], correct: "C", rationale: "The passage states 'The master clock in humans is located in a tiny region of the hypothalamus called the suprachiasmatic nucleus (SCN)'." },
      { q: "What effect does light have on melatonin production?", options: ["A) It increases melatonin production", "B) It suppresses melatonin production", "C) It has no effect on melatonin", "D) It delays melatonin production by several hours"], correct: "B", rationale: "The passage states 'light... suppresses the production of melatonin'." },
      { q: "What is chronotherapy?", options: ["A) A treatment for jet lag", "B) Using circadian rhythms to improve the timing of medical treatments", "C) A form of sleep therapy", "D) The study of biological clocks in animals"], correct: "B", rationale: "The passage defines chronotherapy as 'a field... that exploits the body's circadian rhythms to improve therapeutic outcomes'." },
      { q: "Why is blue-wavelength light from screens particularly concerning for circadian health?", options: ["A) It causes eye strain and headaches", "B) It is especially effective at suppressing melatonin production", "C) It disrupts the SCN's ability to receive light signals", "D) It increases cortisol levels during the day"], correct: "B", rationale: "The passage states blue-wavelength light 'is especially effective at suppressing melatonin production'." },
    ],
    questionsTFNG: [
      { q: "The Nobel Prize for circadian rhythm research was awarded in 2017.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "Shift workers have been shown to have lower risks of obesity and diabetes.", correct: "FALSE", rationale: "The passage states shift work is associated with 'increased risks of obesity, type 2 diabetes'." },
      { q: "All chemotherapy drugs are equally effective regardless of the time of day they are given.", correct: "FALSE", rationale: "The passage states 'the efficacy and toxicity of many drugs vary significantly depending on the time of day they are administered'." },
      { q: "The SCN contains approximately 20,000 neurons.", correct: "TRUE", rationale: "The passage explicitly states this." },
    ],
    questionsSentence: [
      { q: "The condition where shift workers experience misalignment between their internal clock and environment is called __ jetlag.", answer: "social", rationale: "The passage refers to this condition as 'social jetlag'." },
      { q: "Blood pressure medications may be more effective when taken at __, when blood pressure naturally rises.", answer: "night", rationale: "The passage states 'blood pressure medications may be more effective when taken at night'." },
    ],
    questionsHeadings: [
      { paragraph: "Disruption of circadian rhythms has been linked to a wide range of health problems.", options: ["A) How the body clock works", "B) The health consequences of circadian disruption", "C) Why night shifts are popular", "D) The role of insulin in metabolism"], correct: "B", rationale: "This paragraph describes health problems linked to circadian rhythm disruption." },
      { paragraph: "The widespread use of artificial light at night — from smartphones, tablets, and LED lighting — has raised concerns", options: ["A) The benefits of LED technology", "B) How smartphones affect productivity", "C) The impact of artificial light on circadian health", "D) Why blue light is used in screens"], correct: "C", rationale: "This paragraph discusses the impact of artificial light at night on circadian health." },
    ],
  },

  // ── PASSAGE 13: The Science of Procrastination ────────────────────
  {
    id: 'procrastination',
    title: 'The Science of Procrastination',
    topic: 'Psychology',
    difficulty: 'easy',
    text: `Procrastination — the act of delaying or postponing tasks despite knowing that doing so will have negative consequences — is one of the most universal human experiences. Surveys suggest that between 15 and 20 percent of adults are chronic procrastinators, and the behaviour is particularly prevalent among students, with some studies estimating that up to 70 percent of college students procrastinate regularly. Despite its ubiquity, procrastination is frequently misunderstood as a time management problem or a character flaw. Research in psychology and neuroscience suggests a more nuanced picture.

Contemporary research frames procrastination primarily as an emotion regulation problem rather than a failure of time management. When people face a task they find aversive — whether because it is boring, difficult, anxiety-provoking, or associated with self-doubt — they experience negative emotions. Procrastination offers a short-term escape from these feelings: by avoiding the task, the individual temporarily relieves the discomfort. The relief is immediate and certain, while the negative consequences of delay are distant and uncertain, making avoidance behaviourally reinforcing.

The neuroscience of procrastination points to a conflict between two brain systems. The limbic system, which is associated with immediate emotional responses and reward-seeking, tends to favour avoidance of aversive tasks. The prefrontal cortex, which is responsible for planning, self-regulation, and long-term thinking, pushes towards task completion. In chronic procrastinators, research using brain imaging has found that the amygdala — a key component of the limbic system — is larger and more strongly connected to the rest of the brain, making emotional responses to tasks more powerful and harder to override.

Effective interventions for procrastination therefore target emotion regulation rather than time management. Self-compassion — treating oneself with kindness rather than harsh self-criticism after procrastinating — has been shown to reduce future procrastination by breaking the cycle of shame and avoidance. Implementation intentions — specific plans of the form "When X happens, I will do Y" — have been shown to significantly increase follow-through on intentions. Breaking tasks into smaller, more manageable steps reduces the emotional aversiveness of getting started.

Understanding procrastination as an emotional rather than a moral failing has important implications for how we respond to it — both in ourselves and in others. Punitive approaches, such as harsh deadlines and public shaming, may increase anxiety and paradoxically worsen procrastination. Supportive environments that reduce task aversiveness, build self-efficacy, and encourage self-compassion are more likely to produce lasting behavioural change.`,
    questionsMCQ: [
      { q: "How does contemporary research primarily frame procrastination?", options: ["A) As a time management problem", "B) As a character flaw", "C) As an emotion regulation problem", "D) As a neurological disorder"], correct: "C", rationale: "The passage states 'Contemporary research frames procrastination primarily as an emotion regulation problem'." },
      { q: "Why does procrastination become behaviourally reinforcing?", options: ["A) Because it leads to better long-term outcomes", "B) Because the relief from avoidance is immediate while consequences are distant", "C) Because the prefrontal cortex rewards avoidance behaviour", "D) Because procrastinators are more creative when under pressure"], correct: "B", rationale: "The passage states 'The relief is immediate and certain, while the negative consequences of delay are distant and uncertain'." },
      { q: "What brain imaging finding was associated with chronic procrastinators?", options: ["A) A smaller prefrontal cortex", "B) A larger and more strongly connected amygdala", "C) Reduced activity in the limbic system", "D) Increased connectivity between the two brain hemispheres"], correct: "B", rationale: "The passage states 'the amygdala... is larger and more strongly connected to the rest of the brain' in chronic procrastinators." },
      { q: "What are 'implementation intentions'?", options: ["A) Harsh deadlines set by managers", "B) Specific plans of the form 'When X happens, I will do Y'", "C) Rewards given after completing a task", "D) Techniques for breaking tasks into smaller steps"], correct: "B", rationale: "The passage defines implementation intentions as 'specific plans of the form \"When X happens, I will do Y\"'." },
    ],
    questionsTFNG: [
      { q: "Between 15 and 20 percent of adults are chronic procrastinators.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "Procrastination is best addressed through strict deadlines and public accountability.", correct: "FALSE", rationale: "The passage states 'Punitive approaches, such as harsh deadlines and public shaming, may increase anxiety and paradoxically worsen procrastination'." },
      { q: "Self-compassion has been shown to reduce future procrastination.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "The prefrontal cortex is associated with immediate emotional responses.", correct: "FALSE", rationale: "The passage states the prefrontal cortex is 'responsible for planning, self-regulation, and long-term thinking' — it is the limbic system that handles immediate emotional responses." },
    ],
    questionsSentence: [
      { q: "Procrastination offers a short-term __ from the negative emotions associated with aversive tasks.", answer: "escape", rationale: "The passage states 'Procrastination offers a short-term escape from these feelings'." },
      { q: "Breaking tasks into smaller steps reduces the emotional __ of getting started.", answer: "aversiveness", rationale: "The passage states 'Breaking tasks into smaller, more manageable steps reduces the emotional aversiveness of getting started'." },
    ],
    questionsHeadings: [
      { paragraph: "The neuroscience of procrastination points to a conflict between two brain systems.", options: ["A) How the brain processes rewards", "B) The neurological basis of procrastination", "C) Why students procrastinate more than adults", "D) The role of memory in task completion"], correct: "B", rationale: "This paragraph describes the neurological conflict underlying procrastination." },
      { paragraph: "Effective interventions for procrastination therefore target emotion regulation rather than time management.", options: ["A) Why time management courses fail", "B) How to punish procrastinators effectively", "C) Evidence-based strategies to overcome procrastination", "D) The role of deadlines in productivity"], correct: "C", rationale: "This paragraph describes effective, evidence-based interventions for procrastination." },
    ],
  },

  // ── PASSAGE 14: Endangered Languages ─────────────────────────────
  {
    id: 'endangered_languages',
    title: 'Endangered Languages: The Silent Extinction',
    topic: 'Culture & Linguistics',
    difficulty: 'medium',
    text: `Of the approximately 7,000 languages spoken in the world today, linguists estimate that between 50 and 90 percent will be extinct or severely endangered by the end of the twenty-first century. A language is considered endangered when it is no longer being transmitted to children as a first language — the point at which its long-term survival becomes uncertain. At the current rate of language loss, one language disappears approximately every two weeks, taking with it a unique system of knowledge, cultural memory, and ways of understanding the world.

The causes of language endangerment are complex and interrelated. Economic and political pressures frequently drive speakers of minority languages to adopt dominant languages in order to access education, employment, and social mobility. Globalisation has accelerated this process, as English, Mandarin, Spanish, and a handful of other languages have come to dominate international commerce, media, and the internet. In many post-colonial contexts, the languages of former colonial powers were imposed as official languages of government and education, marginalising indigenous languages and associating them with poverty and backwardness.

The loss of a language is not merely a cultural tragedy; it also represents a significant loss of knowledge. Many indigenous languages encode detailed ecological knowledge accumulated over thousands of years — knowledge about local plants, animals, weather patterns, and land management practices that may have no equivalent in dominant languages. Ethnobotanists and ecologists have documented cases where indigenous plant names encode information about medicinal properties, seasonal availability, and ecological relationships that would take years of scientific research to rediscover.

Efforts to revitalise endangered languages have met with mixed success. The revival of Hebrew as a spoken language in the twentieth century is often cited as the most successful example of language revitalisation in history — a language that had ceased to be spoken as a mother tongue was restored to full vitality within a few generations. The Welsh language in the United Kingdom has also experienced a significant revival, supported by government policy, Welsh-medium education, and a dedicated broadcasting service. However, these successes are exceptional; most revitalisation efforts face formidable obstacles, including small speaker communities, lack of resources, and the powerful economic incentives to use dominant languages.

Technology has emerged as both a threat and an opportunity for endangered languages. The internet and social media have accelerated the spread of dominant languages, but they have also provided new platforms for minority language communities to create content, connect with diaspora communities, and document their languages. Apps, online dictionaries, and digital archives are being developed for hundreds of endangered languages, offering new tools for both documentation and revitalisation.`,
    questionsMCQ: [
      { q: "At what point is a language considered endangered?", options: ["A) When fewer than 1,000 people speak it", "B) When it is no longer being transmitted to children as a first language", "C) When it has no written form", "D) When it is not recognised by any government"], correct: "B", rationale: "The passage states a language is endangered 'when it is no longer being transmitted to children as a first language'." },
      { q: "What is cited as the most successful example of language revitalisation in history?", options: ["A) Welsh in the United Kingdom", "B) Māori in New Zealand", "C) Hebrew in the twentieth century", "D) Catalan in Spain"], correct: "C", rationale: "The passage states 'The revival of Hebrew as a spoken language in the twentieth century is often cited as the most successful example'." },
      { q: "What type of knowledge do many indigenous languages encode?", options: ["A) Mathematical and scientific formulas", "B) Detailed ecological knowledge about local plants, animals, and land management", "C) Historical records of ancient civilisations", "D) Astronomical observations and navigation techniques"], correct: "B", rationale: "The passage states 'Many indigenous languages encode detailed ecological knowledge accumulated over thousands of years'." },
      { q: "How has technology affected endangered languages?", options: ["A) It has only accelerated their decline", "B) It has had no significant effect", "C) It has been both a threat and an opportunity", "D) It has primarily helped revitalise them"], correct: "C", rationale: "The passage explicitly states 'Technology has emerged as both a threat and an opportunity for endangered languages'." },
    ],
    questionsTFNG: [
      { q: "Approximately one language disappears every two weeks.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "The Welsh language has experienced a significant revival supported by government policy.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "Most language revitalisation efforts have been as successful as the Hebrew revival.", correct: "FALSE", rationale: "The passage states 'these successes are exceptional; most revitalisation efforts face formidable obstacles'." },
      { q: "All 7,000 languages currently spoken will be extinct within 50 years.", correct: "NOT GIVEN", rationale: "The passage estimates 50–90% will be extinct or endangered by end of the century, not all 7,000 within 50 years." },
    ],
    questionsSentence: [
      { q: "Globalisation has accelerated language loss as English and a handful of other languages dominate international __, media, and the internet.", answer: "commerce", rationale: "The passage states these languages 'dominate international commerce, media, and the internet'." },
      { q: "Welsh-medium __ and a dedicated broadcasting service have supported the Welsh language revival.", answer: "education", rationale: "The passage mentions 'Welsh-medium education, and a dedicated broadcasting service'." },
    ],
    questionsHeadings: [
      { paragraph: "The causes of language endangerment are complex and interrelated.", options: ["A) How to save endangered languages", "B) The scale of language loss worldwide", "C) Why languages become endangered", "D) The role of colonialism in history"], correct: "C", rationale: "This paragraph explains the causes of language endangerment." },
      { paragraph: "The loss of a language is not merely a cultural tragedy; it also represents a significant loss of knowledge.", options: ["A) Why culture matters more than knowledge", "B) The knowledge lost when a language dies", "C) How scientists study indigenous plants", "D) The economic value of biodiversity"], correct: "B", rationale: "This paragraph describes the knowledge lost when a language becomes extinct." },
    ],
  },

  // ── PASSAGE 15: The Architecture of Skyscrapers ───────────────────
  {
    id: 'skyscrapers',
    title: 'The Architecture of Skyscrapers',
    topic: 'Technology & Architecture',
    difficulty: 'medium',
    text: `The skyscraper is one of the defining architectural achievements of the modern era — a symbol of urban ambition, technological ingenuity, and economic power. The first true skyscrapers emerged in Chicago and New York in the 1880s, made possible by two key innovations: the development of steel-frame construction, which allowed buildings to bear their loads through an internal skeleton rather than thick masonry walls, and the invention of the safety elevator by Elisha Otis, which made upper floors practically accessible. These innovations transformed the economics of urban land use, allowing cities to grow vertically rather than horizontally.

The structural engineering of tall buildings presents unique challenges that do not arise in low-rise construction. As a building increases in height, the forces acting upon it change in character. Wind loads — the lateral forces exerted by wind on the building's facade — become increasingly dominant relative to gravity loads as height increases. A skyscraper must be designed not only to support its own weight but to resist the swaying motion induced by wind, which can cause discomfort to occupants and, in extreme cases, structural failure. Engineers address this through a variety of strategies, including the use of tuned mass dampers — large pendulum-like devices installed near the top of the building that oscillate out of phase with the building's natural frequency, reducing sway.

The Burj Khalifa in Dubai, completed in 2010, stands at 828 metres and remains the world's tallest building. Its design incorporates a Y-shaped floor plan that reduces wind loads by breaking up the vortices that form around tall structures. The building's concrete core provides structural rigidity, while its tapering profile reduces the surface area exposed to wind at higher elevations. These design features allow the Burj Khalifa to withstand wind speeds of up to 240 kilometres per hour.

Sustainability has become an increasingly important consideration in skyscraper design. Tall buildings are significant consumers of energy, primarily for heating, cooling, and lighting. Green skyscrapers incorporate features such as double-skin facades — two layers of glass with an air gap between them — that reduce heat gain and loss, natural ventilation systems, and integrated photovoltaic panels. The Bosco Verticale (Vertical Forest) in Milan, completed in 2014, incorporates over 900 trees and 20,000 plants on its balconies, providing insulation, absorbing carbon dioxide, and creating habitat for urban wildlife.

Critics of skyscrapers argue that they are inherently unsustainable, requiring enormous quantities of steel, concrete, and glass to construct, and consuming disproportionate amounts of energy to operate. They also argue that tall buildings can create uncomfortable urban microclimates by channelling wind and casting shadows over surrounding streets. Proponents counter that by concentrating large numbers of people in a small footprint, skyscrapers reduce urban sprawl and the associated environmental costs of low-density development.`,
    questionsMCQ: [
      { q: "What two innovations made the first skyscrapers possible?", options: ["A) Reinforced concrete and hydraulic lifts", "B) Steel-frame construction and the safety elevator", "C) Glass curtain walls and air conditioning", "D) Electric lighting and central heating"], correct: "B", rationale: "The passage states skyscrapers were 'made possible by two key innovations: the development of steel-frame construction... and the invention of the safety elevator by Elisha Otis'." },
      { q: "What is the purpose of a tuned mass damper?", options: ["A) To support the building's weight against gravity", "B) To reduce wind loads on the facade", "C) To oscillate out of phase with the building and reduce sway", "D) To distribute the building's weight evenly across the foundation"], correct: "C", rationale: "The passage states tuned mass dampers 'oscillate out of phase with the building's natural frequency, reducing sway'." },
      { q: "What is the height of the Burj Khalifa?", options: ["A) 600 metres", "B) 700 metres", "C) 828 metres", "D) 1,000 metres"], correct: "C", rationale: "The passage states the Burj Khalifa 'stands at 828 metres'." },
      { q: "What argument do proponents of skyscrapers make regarding sustainability?", options: ["A) They use less steel than conventional buildings", "B) They generate their own electricity through solar panels", "C) They concentrate people in a small footprint, reducing urban sprawl", "D) They are cheaper to heat and cool than low-rise buildings"], correct: "C", rationale: "The passage states proponents argue skyscrapers 'reduce urban sprawl and the associated environmental costs of low-density development'." },
    ],
    questionsTFNG: [
      { q: "The first skyscrapers emerged in Chicago and New York in the 1880s.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "Wind loads become less important relative to gravity loads as a building increases in height.", correct: "FALSE", rationale: "The passage states wind loads 'become increasingly dominant relative to gravity loads as height increases'." },
      { q: "The Bosco Verticale in Milan incorporates over 900 trees on its balconies.", correct: "TRUE", rationale: "The passage explicitly states this." },
      { q: "The Burj Khalifa has a circular floor plan to reduce wind resistance.", correct: "FALSE", rationale: "The passage states it has 'a Y-shaped floor plan'." },
    ],
    questionsSentence: [
      { q: "A double-skin facade consists of two layers of glass with an __ between them.", answer: "air gap", rationale: "The passage defines double-skin facades as 'two layers of glass with an air gap between them'." },
      { q: "The Burj Khalifa's __ profile reduces the surface area exposed to wind at higher elevations.", answer: "tapering", rationale: "The passage states 'its tapering profile reduces the surface area exposed to wind at higher elevations'." },
    ],
    questionsHeadings: [
      { paragraph: "The structural engineering of tall buildings presents unique challenges that do not arise in low-rise construction.", options: ["A) The history of steel manufacturing", "B) Why skyscrapers are expensive to build", "C) The unique structural engineering challenges of tall buildings", "D) How elevators changed urban design"], correct: "C", rationale: "This paragraph describes the unique structural engineering challenges of skyscrapers." },
      { paragraph: "Sustainability has become an increasingly important consideration in skyscraper design.", options: ["A) The environmental cost of concrete production", "B) How green features are incorporated into modern skyscrapers", "C) Why skyscrapers should be banned", "D) The history of solar panel technology"], correct: "B", rationale: "This paragraph describes sustainability features in modern skyscraper design." },
    ],
  }
);


// ══════════════════════════════════════════════════════════════════════
//  HARD PASSAGES — Batch 1 (passages 16–20)
// ══════════════════════════════════════════════════════════════════════
IELTS_READING_PASSAGES.push(

  {
    id: 'passage_001',
    title: 'The Epigenetic Revolution: Beyond the Genetic Blueprint',
    topic: 'Science / Biology',
    difficulty: 'hard',
    text: `For much of the twentieth century, the genome was regarded as a fixed and deterministic blueprint — a molecular script written at conception that would unfold inexorably across a lifetime. The discovery of the double helix in 1953 only reinforced this mechanistic view, lending the impression that biology had at last reduced the organism to something as legible as a circuit diagram. Yet the subsequent decades of molecular research have forced a dramatic revision of this picture. The field of epigenetics — the study of heritable changes in gene expression that do not involve alterations to the underlying DNA sequence — has demonstrated that the genome is not a static text but a dynamic document, perpetually annotated, edited, and re-read in response to environmental signals.

The mechanisms through which epigenetic regulation operates are numerous and often interacting. DNA methylation, the addition of a methyl group to cytosine residues, typically silences gene expression by preventing transcription factors from accessing promoter regions. Histone modification — the chemical tagging of the proteins around which DNA is coiled — can either loosen or tighten chromatin structure, thereby facilitating or impeding transcription. Non-coding RNA molecules, once dismissed as transcriptional noise, are now understood to orchestrate sweeping programmes of gene silencing. Crucially, many of these modifications can be transmitted across cell divisions and, in some cases, across generations — a phenomenon that challenges the Weismann barrier, the long-held principle that acquired characteristics cannot be inherited.

The implications for medicine are profound. Research has shown that early-life adversity — malnutrition, chronic stress, exposure to toxins — can imprint lasting epigenetic signatures on developing organisms, with consequences that persist well into adulthood and may even be detectable in offspring. A landmark study of the Dutch Hunger Winter, a famine that gripped the Netherlands in 1944–45, revealed that individuals conceived during the famine carried distinct methylation patterns decades later, exhibiting elevated risks of obesity, diabetes, and cardiovascular disease. Such findings have revitalised longstanding debates about the relative contributions of nature and nurture, suggesting that the dichotomy itself may be a false one: environment acts upon biology not merely by selecting among pre-existing variants, but by rewriting the very instructions by which those variants are expressed.

Critics of the more expansive claims in epigenetics counsel caution. Distinguishing genuine transgenerational epigenetic inheritance from confounding variables — shared environments, microbiome transmission, or behavioural imprinting — remains methodologically fraught, particularly in human studies where controlled experiments are ethically impermissible. Furthermore, many epigenetic marks are reset during gamete formation and early embryogenesis, raising questions about the fidelity of intergenerational transmission. Nevertheless, even the most sceptical commentators acknowledge that epigenetics has permanently altered the conceptual landscape of biology, replacing a gene-centric determinism with a richer, more contingent account of how organisms develop, age, and respond to the worlds they inhabit.`,
    questionsMCQ: [
      { q: "What was the prevailing view of the genome before the rise of epigenetics?", options: ["A) It was considered highly responsive to environmental stimuli.", "B) It was seen as an unchanging set of instructions determined at conception.", "C) It was believed to be partially inherited from acquired traits.", "D) It was thought to interact directly with histone proteins to regulate behaviour."], correct: "B", rationale: "The passage states the genome was regarded as 'a fixed and deterministic blueprint — a molecular script written at conception that would unfold inexorably across a lifetime.'" },
      { q: "According to the passage, what is the significance of the Dutch Hunger Winter study?", options: ["A) It confirmed that famine directly alters the DNA sequence of survivors.", "B) It showed that methylation patterns linked to famine can persist into adulthood and elevate disease risk.", "C) It demonstrated that epigenetic changes are always reversed within one generation.", "D) It proved that environmental stress has no lasting biological impact if nutrition is restored."], correct: "B", rationale: "The study 'revealed that individuals conceived during the famine carried distinct methylation patterns decades later, exhibiting elevated risks of obesity, diabetes, and cardiovascular disease.'" },
      { q: "Which of the following best describes the author's treatment of critics of epigenetics?", options: ["A) The author dismisses their concerns as methodologically uninformed.", "B) The author presents their objections as valid while affirming the field's broader significance.", "C) The author suggests critics are motivated by ideological resistance to new science.", "D) The author argues that critics have been entirely vindicated by recent research."], correct: "B", rationale: "The passage acknowledges critics' valid methodological concerns yet concludes that 'even the most sceptical commentators acknowledge that epigenetics has permanently altered the conceptual landscape of biology.'" },
      { q: "What does the author mean by describing the genome as 'a dynamic document, perpetually annotated'?", options: ["A) The DNA sequence itself is constantly being rewritten by environmental factors.", "B) Gene expression is continuously modified by chemical processes without changing the underlying sequence.", "C) Scientists regularly update genomic databases to reflect new mutations.", "D) The genome undergoes spontaneous duplication in response to stress."], correct: "B", rationale: "Epigenetics involves 'heritable changes in gene expression that do not involve alterations to the underlying DNA sequence' — the sequence is fixed but its reading is continuously modified." },
    ],
    questionsTFNG: [
      { q: "The discovery of the double helix in 1953 led scientists to question the deterministic view of genetics.", correct: "FALSE", rationale: "The passage states the discovery 'only reinforced this mechanistic view,' not questioned it." },
      { q: "Non-coding RNA molecules were once considered to have no functional role in gene regulation.", correct: "TRUE", rationale: "The passage states non-coding RNAs 'were once dismissed as transcriptional noise' before their regulatory role was understood." },
      { q: "All epigenetic marks are reliably preserved through the process of gamete formation.", correct: "FALSE", rationale: "The passage states 'many epigenetic marks are reset during gamete formation and early embryogenesis,' contradicting complete preservation." },
      { q: "Some researchers have proposed that the nature versus nurture debate is based on a misleading distinction.", correct: "TRUE", rationale: "The passage suggests 'the dichotomy itself may be a false one,' as environment actively rewrites biological instructions." },
    ],
    questionsSentence: [
      { q: "DNA methylation typically suppresses gene expression by blocking __ from reaching promoter regions.", answer: "transcription factors", rationale: "The passage states methylation 'silences gene expression by preventing transcription factors from accessing promoter regions.'" },
      { q: "A key challenge in human epigenetic research is that __ are ethically impermissible.", answer: "controlled experiments", rationale: "The passage notes studies are difficult 'particularly in human studies where controlled experiments are ethically impermissible.'" },
    ],
    questionsHeadings: [
      { paragraph: "For much of the twentieth century, the genome was regarded as a fixed and deterministic blueprint...", options: ["A) Early Discoveries in Molecular Biology", "B) The Shift from a Static to a Dynamic View of the Genome", "C) Limitations of the Double Helix Model", "D) The Origins of Genetic Determinism in Philosophy"], correct: "B", rationale: "The paragraph introduces how the static 'blueprint' view was overturned by epigenetics, making B the most accurate heading." },
      { paragraph: "Critics of the more expansive claims in epigenetics counsel caution...", options: ["A) Disproving the Core Claims of Epigenetic Research", "B) Ethical Concerns in Genetic Experimentation", "C) Methodological Challenges and Measured Scepticism", "D) The Collapse of Transgenerational Inheritance Theory"], correct: "C", rationale: "The paragraph presents critics' methodological concerns while stopping short of rejecting the field entirely — fitting 'measured scepticism.'" },
    ],
  },


  {
    id: 'passage_002',
    title: 'The Paradox of Plenty: Resource Wealth and Economic Stagnation',
    topic: 'Economics / Development',
    difficulty: 'hard',
    text: `The intuition that natural resource wealth should confer economic advantage is both widespread and, historically speaking, frequently confounded. Economists and political scientists have long puzzled over what has come to be known as the 'resource curse' — the counterintuitive phenomenon whereby countries abundantly endowed with oil, minerals, or other extractable commodities tend, on average, to exhibit lower rates of economic growth, weaker democratic institutions, and higher incidences of violent conflict than their resource-poor counterparts. The paradox is not universal, and its causes remain contested, but its empirical signature is sufficiently robust to have animated decades of scholarly debate and informed significant shifts in international development policy.

Several causal mechanisms have been proposed to explain the resource curse. The most widely cited is the Dutch Disease model, named after the economic difficulties that followed the Netherlands' discovery of natural gas in the 1960s. When a resource boom generates large inflows of foreign currency, the real exchange rate appreciates, rendering other export sectors — manufacturing and agriculture in particular — internationally uncompetitive. Over time, the economy becomes structurally dependent on the extractive sector, a form of concentration that proves catastrophic when commodity prices inevitably fall. A second mechanism operates through the political economy of rent-seeking: where revenues accrue to the state rather than being generated through productive taxation of citizens, governments face weaker accountability pressures and citizens have diminished incentives to demand transparency or fiscal responsibility. Oil states, in particular, can finance patronage networks and security apparatuses that insulate ruling elites from popular pressure, stunting the development of civil society and representative institutions.

A third, and perhaps subtler, pathway involves the volatility inherent in commodity markets. Unlike revenue streams derived from diversified industrial economies, resource revenues fluctuate dramatically with global price cycles. Governments that calibrate public expenditure to boom-period revenues find themselves locked into spending commitments that become unsustainable during downturns, generating cycles of fiscal expansion and austerity that impede long-term investment in education, infrastructure, and institutions. Empirical work by economists such as Jeffrey Sachs and Andrew Warner, and later by Paul Collier, has attempted to quantify these effects, though their methodologies have attracted criticism for failing to adequately control for pre-existing institutional quality — a variable that may independently explain both resource dependence and poor developmental outcomes.

The resource curse thesis is not without its detractors. Botswana's sustained development trajectory, built substantially on diamond revenues, is frequently cited as a counter-example, as are Norway's management of its North Sea oil wealth through the Government Pension Fund and the economic trajectories of Gulf states such as the UAE. These cases suggest that the curse is not inherent to resource wealth itself, but is instead mediated by institutional capacity, governance quality, and the timing of resource discovery relative to state formation. Where robust institutions pre-exist the resource boom, or where revenues are deliberately sequestered from the political budget cycle, the pathological dynamics described above can be substantially attenuated. The policy implication — that institution-building should precede or accompany resource extraction — is easier to articulate than to implement in contexts where the discovery of resources often unleashes powerful political forces resistant to fiscal constraint.`,
    questionsMCQ: [
      { q: "What does the Dutch Disease model primarily explain?", options: ["A) How resource revenues fund authoritarian governments.", "B) Why resource booms cause other export sectors to lose competitiveness.", "C) How oil price volatility creates fiscal instability.", "D) Why democratic institutions are weakened by foreign currency inflows."], correct: "B", rationale: "Dutch Disease describes how a resource boom appreciates the exchange rate, making 'other export sectors — manufacturing and agriculture in particular — internationally uncompetitive.'" },
      { q: "According to the passage, what distinguishes resource-rich states from states that tax citizens productively?", options: ["A) Resource states attract more foreign investment.", "B) Citizens in resource states have stronger incentives for political participation.", "C) Resource revenues reduce governmental accountability to citizens.", "D) Resource states tend to develop more diversified economies."], correct: "C", rationale: "The passage states that where revenues come to the state without taxing citizens, 'governments face weaker accountability pressures and citizens have diminished incentives to demand transparency.'" },
      { q: "What criticism has been levelled at the empirical work of Sachs, Warner, and Collier?", options: ["A) Their datasets were too geographically limited.", "B) They ignored the role of commodity price volatility.", "C) Their methods did not sufficiently account for pre-existing institutional quality.", "D) They conflated oil wealth with mineral wealth in their analyses."], correct: "C", rationale: "The passage notes criticism 'for failing to adequately control for pre-existing institutional quality — a variable that may independently explain both resource dependence and poor developmental outcomes.'" },
      { q: "What does the passage suggest is the key variable determining whether resource wealth leads to positive or negative outcomes?", options: ["A) The global price of the resource at the time of discovery.", "B) The size and diversity of the country's population.", "C) The quality of governance and institutional capacity.", "D) The degree of foreign investment in the extractive sector."], correct: "C", rationale: "The passage concludes the curse 'is mediated by institutional capacity, governance quality, and the timing of resource discovery relative to state formation.'" },
    ],
    questionsTFNG: [
      { q: "The resource curse affects every country that discovers significant natural resource deposits.", correct: "FALSE", rationale: "The passage states 'the paradox is not universal,' and cites Botswana and Norway as counter-examples." },
      { q: "Norway manages its oil revenues through a fund that separates resource income from the general political budget.", correct: "TRUE", rationale: "The passage references Norway's 'Government Pension Fund' as an example of revenues being 'deliberately sequestered from the political budget cycle.'" },
      { q: "The resource curse was first identified and named by economists studying the Netherlands in the 1960s.", correct: "NOT GIVEN", rationale: "The passage explains what Dutch Disease is and where the name comes from, but does not specify when or by whom the 'resource curse' term was coined." },
      { q: "Countries with strong pre-existing institutions can significantly reduce the negative effects of resource wealth.", correct: "TRUE", rationale: "The passage states 'where robust institutions pre-exist the resource boom... the pathological dynamics described above can be substantially attenuated.'" },
    ],
    questionsSentence: [
      { q: "The resource curse refers to the tendency of resource-rich countries to show lower growth, weaker __, and more conflict.", answer: "democratic institutions", rationale: "The passage defines the resource curse as correlating with 'weaker democratic institutions, and higher incidences of violent conflict.'" },
      { q: "Governments that set spending levels based on boom-period revenues struggle to maintain commitments during __, leading to damaging cycles.", answer: "downturns", rationale: "The passage describes spending commitments becoming 'unsustainable during downturns, generating cycles of fiscal expansion and austerity.'" },
    ],
    questionsHeadings: [
      { paragraph: "Several causal mechanisms have been proposed to explain the resource curse...", options: ["A) Historical Evidence for the Resource Curse", "B) The Dutch Disease and Political Economy Explanations", "C) Volatility and Its Effect on Public Investment", "D) Why Resource States Avoid Democratic Reform"], correct: "B", rationale: "The paragraph introduces and explains the Dutch Disease model and the rent-seeking / accountability mechanism — two major causal explanations." },
      { paragraph: "The resource curse thesis is not without its detractors...", options: ["A) Counter-Examples and the Role of Institutions", "B) Why the Resource Curse Theory Has Been Abandoned", "C) The Success of Oil States in the Gulf Region", "D) Policy Recommendations for Developing Nations"], correct: "A", rationale: "The paragraph presents Botswana, Norway, and UAE as counter-examples and argues institutions mediate outcomes — making A the best heading." },
    ],
  },


  {
    id: 'passage_003',
    title: 'The Architecture of Attention: How Digital Environments Reshape Cognition',
    topic: 'Technology / Psychology',
    difficulty: 'hard',
    text: `Attention — the selective concentration of consciousness on one aspect of the environment to the exclusion of others — has long been understood as a finite and depletable resource. William James, writing in 1890, described it as 'the taking possession by the mind, in clear and vivid form, of one out of what seem several simultaneously possible objects or trains of thought.' What James could not have anticipated was that, a century later, human attention would itself become the primary commodity of a multi-trillion-dollar industry, harvested at scale through interfaces engineered with the explicit goal of maximising what the technology sector calls 'engagement' — a euphemism, critics argue, for compulsive use.

The business model of the dominant digital platforms — social media networks, search engines, streaming services, and mobile applications — is premised on the sale of user attention to advertisers. This creates a structural incentive to design interfaces that capture and retain attention by any means available. Techniques drawn from behavioural psychology and neuroscience are routinely deployed: variable-ratio reinforcement schedules, borrowed from the study of gambling addiction, deliver unpredictable rewards (likes, messages, novel content) that provoke compulsive checking behaviour; social comparison cues exploit evolved status-monitoring instincts; infinite scroll eliminates the natural stopping points that might otherwise allow the user to disengage. These are not incidental features but deliberate design choices, documented in the internal communications and patent filings of major technology companies, and acknowledged by former employees who have subsequently become prominent critics.

The cognitive consequences of sustained exposure to such environments are a matter of active scientific inquiry and considerable public concern. Laboratory studies have linked heavy social media use to reduced working memory capacity, diminished capacity for sustained attention, and elevated rates of mind-wandering. Longitudinal research suggests correlations — though causal directionality remains disputed — between screen time and symptoms of anxiety and depression, particularly among adolescents. Some researchers invoke the concept of cognitive offloading: as digital devices assume an increasing share of memory and navigational tasks, the neural circuits responsible for these functions may attenuate through disuse, in a manner analogous to the documented reduction in hippocampal grey matter observed in individuals who rely on satellite navigation rather than internalising spatial routes.

Defenders of digital technology contest this narrative on multiple grounds. They point to methodological limitations in the existing literature — the reliance on self-reported screen time, the difficulty of isolating digital media effects from correlated lifestyle factors, and the tendency of moral panics about new media to recapitulate concerns that proved exaggerated in earlier technological transitions, from the printing press to television. Some researchers argue that digital technologies may enhance certain cognitive capacities — rapid information retrieval, parallel processing, collaborative knowledge construction — even as they diminish others, and that the net effect may be positive for well-adapted users. The resolution of this debate has significant implications not only for individual wellbeing but for the design of educational systems, public health policy, and the regulatory frameworks that govern the technology industry.`,
    questionsMCQ: [
      { q: "What does the author suggest is the primary purpose of the term 'engagement' in the technology industry?", options: ["A) To describe how users interact meaningfully with educational content.", "B) To mask the deliberate cultivation of compulsive usage patterns.", "C) To measure the productivity gains from digital tools.", "D) To quantify the social benefits of online community building."], correct: "B", rationale: "The author calls 'engagement' a 'euphemism' for compulsive use, suggesting the term obscures the manipulative intent behind platform design." },
      { q: "What is the variable-ratio reinforcement schedule, as described in the passage?", options: ["A) A technique that delivers rewards at fixed, predictable intervals to sustain interest.", "B) A design approach that limits the amount of content shown to improve user wellbeing.", "C) A method of delivering unpredictable rewards that encourages compulsive checking.", "D) A psychological theory used to design educational curricula."], correct: "C", rationale: "The passage describes it as delivering 'unpredictable rewards (likes, messages, novel content) that provoke compulsive checking behaviour,' borrowed from gambling addiction research." },
      { q: "What does the concept of cognitive offloading suggest about heavy reliance on digital devices?", options: ["A) Users develop stronger memory and navigation skills through repeated digital exposure.", "B) Neural circuits handling offloaded tasks may weaken due to reduced use.", "C) Digital devices eliminate the need for education in core cognitive skills.", "D) Satellite navigation has been proven to reduce hippocampal activity in all users."], correct: "B", rationale: "Cognitive offloading suggests 'neural circuits responsible for these functions may attenuate through disuse,' as illustrated by the satellite navigation example." },
      { q: "How do defenders of digital technology respond to concerns about cognitive harm?", options: ["A) They argue that all screen time is inherently beneficial for cognitive development.", "B) They claim that no credible research links digital use to psychological harm.", "C) They highlight methodological weaknesses in studies and note potential cognitive benefits.", "D) They accept that digital media reduces attention spans but argue this is culturally adaptive."], correct: "C", rationale: "Defenders 'point to methodological limitations' in research and argue that digital technologies 'may enhance certain cognitive capacities... even as they diminish others.'" },
    ],
    questionsTFNG: [
      { q: "William James predicted that human attention would eventually be commodified by the technology industry.", correct: "FALSE", rationale: "The passage explicitly states James 'could not have anticipated' this development." },
      { q: "The use of behavioural psychology techniques in platform design is confirmed by internal company documents.", correct: "TRUE", rationale: "The passage states these are 'documented in the internal communications and patent filings of major technology companies.'" },
      { q: "Studies have conclusively established that social media causes anxiety and depression in adolescents.", correct: "FALSE", rationale: "The passage says research shows 'correlations — though causal directionality remains disputed' — not conclusive causation." },
      { q: "Some researchers believe digital technology may improve particular cognitive abilities in well-adapted users.", correct: "TRUE", rationale: "The passage states 'the net effect may be positive for well-adapted users' citing benefits like rapid retrieval and parallel processing." },
    ],
    questionsSentence: [
      { q: "Infinite scroll is a design technique that removes natural __ which might otherwise prompt users to stop using an application.", answer: "stopping points", rationale: "The passage states infinite scroll 'eliminates the natural stopping points that might otherwise allow the user to disengage.'" },
      { q: "Critics draw a parallel between reduced hippocampal grey matter and people who use __ instead of learning routes themselves.", answer: "satellite navigation", rationale: "The passage references 'the documented reduction in hippocampal grey matter observed in individuals who rely on satellite navigation rather than internalising spatial routes.'" },
    ],
    questionsHeadings: [
      { paragraph: "The business model of the dominant digital platforms — social media networks, search engines...", options: ["A) The History of Advertising in Digital Media", "B) How Platform Design Deliberately Exploits Human Psychology", "C) The Economic Benefits of User Engagement", "D) Regulatory Gaps in the Technology Industry"], correct: "B", rationale: "The paragraph details specific psychological techniques used deliberately to capture attention, making B the most precise heading." },
      { paragraph: "Defenders of digital technology contest this narrative on multiple grounds...", options: ["A) The Case for Banning Social Media Among Adolescents", "B) Why Cognitive Research on Digital Media is Irrelevant", "C) Counterarguments and the Complexity of Digital Cognition", "D) Positive Outcomes from Increased Screen Time"], correct: "C", rationale: "The paragraph presents multiple counterarguments and notes cognitive complexity, with neither wholesale acceptance nor rejection of harm — fitting C." },
    ],
  },


  {
    id: 'passage_004',
    title: 'Deep Time and the Human Reckoning with Geological Scale',
    topic: 'Earth Science / Philosophy',
    difficulty: 'hard',
    text: `In 1788, the Scottish geologist James Hutton gazed upon the exposed rock strata at Siccar Point on the Berwickshire coast and perceived, for perhaps the first time in intellectual history, the vertiginous depth of time inscribed in the Earth's crust. The unconformity he observed — older, near-vertical Silurian greywackes overlain at a sharp angle by younger, horizontal Old Red Sandstone — represented not merely a geological contact but an enormous hiatus, a gap of approximately 65 million years compressed into a few centimetres of rock. Hutton's famous pronouncement that the geological record showed 'no vestige of a beginning, no prospect of an end' marked the birth of what geologists now call deep time: the recognition that the Earth is incomprehensibly ancient, and that the human timescale is, in geological terms, essentially negligible.

The concept of deep time is simultaneously one of science's most consequential and psychologically most challenging contributions to human self-understanding. Consequential, because it underpins virtually every modern Earth science, from plate tectonics to palaeoclimatology; the reconstruction of past climates, ocean chemistry, and biodiversity are all predicated on the capacity to read temporal information from rock, ice, and isotope. Psychologically challenging, because deep time resists intuitive grasp in a manner that even the astronomical scales of cosmology do not quite replicate. Humans can be awestruck by the distances between galaxies without necessarily feeling existentially displaced; the recognition that multicellular life has existed for over 600 million years, that dinosaurs persisted for 165 million years, and that Homo sapiens has existed for a mere 300,000 — less than 0.05% of the Earth's history — can induce a peculiar form of ontological vertigo.

The capacity to reason accurately about deep time has considerable practical importance beyond the theoretical. Climate science depends on the ability to interpret proxy records from ice cores, tree rings, and marine sediments that extend thousands or tens of thousands of years into the past. Evolutionary biology requires an intuitive feel for the pace of natural selection operating across millions of generations. Perhaps most urgently, the governance of long-lived nuclear waste requires human institutions to contemplate timeframes of 10,000 years or more — scales that dwarf all recorded human history and challenge the communicative assumptions on which institutional continuity depends. Finland's Onkalo repository, designed to isolate high-level nuclear waste for 100,000 years, has prompted remarkable exercises in speculative communication: how do you warn future civilisations, which may share neither our language nor our symbolic conventions, of the dangers buried underground?

Philosophers and cognitive scientists have explored why deep time is so cognitively resistant. One explanation emphasises the mismatch between deep time and the timescales on which human cognition evolved: perception, planning, and causal reasoning are adapted to the immediate ecological environment, not to geological epochs. A second explanation focuses on the poverty of analogical scaffolding available to anchor such scales: the familiar metaphors — 'if Earth's history were a calendar year, humans appear in the last few seconds' — gesture at the problem without resolving it. What such metaphors reveal, paradoxically, is not so much the length of deep time as the inadequacy of the human mind to contain it.`,
    questionsMCQ: [
      { q: "What was the geological significance of what Hutton observed at Siccar Point?", options: ["A) It showed that rock strata always form in horizontal layers.", "B) It revealed a massive time gap between two different rock formations.", "C) It proved that the Earth was created approximately 65 million years ago.", "D) It demonstrated that Silurian rocks were younger than Old Red Sandstone."], correct: "B", rationale: "The unconformity 'represented not merely a geological contact but an enormous hiatus, a gap of approximately 65 million years compressed into a few centimetres of rock.'" },
      { q: "What does the author mean by 'ontological vertigo' in the context of deep time?", options: ["A) The physical dizziness experienced when looking at tall geological formations.", "B) A scientific error arising from miscalculating geological timescales.", "C) A disorienting sense of one's own insignificance in relation to geological history.", "D) The difficulty palaeontologists face when dating ancient rock strata."], correct: "C", rationale: "The passage describes the realisation of humanity's tiny place in geological time as capable of inducing 'a peculiar form of ontological vertigo' — an existential disorientation." },
      { q: "Why does the Onkalo nuclear repository present a communication challenge?", options: ["A) Finland lacks the technical expertise to label hazardous materials properly.", "B) Future civilisations may not share current language or symbols, making warnings unreliable.", "C) The repository is so deep that no known material can mark its location.", "D) International law prohibits the use of warning signs on nuclear waste sites."], correct: "B", rationale: "The passage asks 'how do you warn future civilisations, which may share neither our language nor our symbolic conventions, of the dangers buried underground?'" },
      { q: "According to the passage, why do familiar metaphors about deep time fail to convey its true scale?", options: ["A) They use inaccurate data about the age of the Earth.", "B) They are only accessible to people with a scientific background.", "C) They reveal the human mind's fundamental inability to truly grasp such scales.", "D) They compare deep time to human history rather than to astronomical distances."], correct: "C", rationale: "The passage says such metaphors 'reveal, paradoxically, is not so much the length of deep time as the inadequacy of the human mind to contain it.'" },
    ],
    questionsTFNG: [
      { q: "James Hutton believed the geological record indicated the Earth had a clearly identifiable beginning.", correct: "FALSE", rationale: "Hutton proclaimed there was 'no vestige of a beginning, no prospect of an end' — the opposite of identifying a beginning." },
      { q: "Homo sapiens has existed for less than one tenth of one percent of Earth's total history.", correct: "TRUE", rationale: "The passage states Homo sapiens represents 'less than 0.05% of the Earth's history.'" },
      { q: "Most scientists agree that humans can develop an intuitive understanding of geological timescales with adequate training.", correct: "NOT GIVEN", rationale: "The passage discusses why deep time is cognitively resistant but does not address whether training can overcome this." },
      { q: "Climate scientists use ice cores and marine sediments to reconstruct past environmental conditions.", correct: "TRUE", rationale: "The passage states 'climate science depends on the ability to interpret proxy records from ice cores, tree rings, and marine sediments.'" },
    ],
    questionsSentence: [
      { q: "Human cognitive systems for reasoning are adapted to immediate environments rather than to __.", answer: "geological epochs", rationale: "The passage states cognition 'is adapted to the immediate ecological environment, not to geological epochs.'" },
      { q: "The Onkalo repository was designed to contain nuclear waste safely for a period of __.", answer: "100,000 years", rationale: "The passage explicitly states Onkalo is 'designed to isolate high-level nuclear waste for 100,000 years.'" },
    ],
    questionsHeadings: [
      { paragraph: "The concept of deep time is simultaneously one of science's most consequential...", options: ["A) Why Deep Time is Irrelevant to Modern Science", "B) The Scientific Importance and Psychological Difficulty of Deep Time", "C) Comparing Geological and Astronomical Scales of Time", "D) The History of Palaeoclimatology and Plate Tectonics"], correct: "B", rationale: "The paragraph explicitly addresses both the scientific importance ('underpins virtually every modern Earth science') and the psychological challenge of deep time." },
      { paragraph: "Philosophers and cognitive scientists have explored why deep time is so cognitively resistant...", options: ["A) Philosophical Solutions to the Problem of Deep Time", "B) How Metaphors Help Scientists Communicate with the Public", "C) Why the Human Mind Struggles to Grasp Geological Scale", "D) The Role of Education in Building Deep Time Literacy"], correct: "C", rationale: "The paragraph presents two cognitive science explanations for why deep time 'is so cognitively resistant' and concludes the mind cannot fully contain it." },
    ],
  },


  {
    id: 'passage_005',
    title: 'The Commons Reconsidered: Governing Shared Resources in the Twenty-First Century',
    topic: 'Political Science / Environment',
    difficulty: 'hard',
    text: `In 1968, the ecologist Garrett Hardin published an essay in Science that would become one of the most cited — and most disputed — texts in environmental and economic thought. In 'The Tragedy of the Commons,' Hardin argued that any resource held in common — open to use by all and owned by none — was fated to be destroyed by the rational self-interest of individual users. Drawing on an image of a shared pasture, he showed that each herdsman, calculating his own marginal benefit, would have an incentive to add cattle beyond the carrying capacity of the commons, even knowing that the resulting degradation would eventually destroy it for all. The tragedy, in Hardin's formulation, was not the product of ignorance or irrationality but of the inescapable logic of individually rational action in collectively managed settings. His conclusion was stark: the commons must be either privatised or subjected to coercive state regulation.

For two decades, Hardin's model served as a powerful justification for enclosure — the conversion of communally held land and resources into private property — and for centralised regulatory frameworks governing fisheries, groundwater, and forests. It was not until the publication in 1990 of Elinor Ostrom's Governing the Commons that an empirically grounded alternative framework emerged. Ostrom, who would later receive the Nobel Memorial Prize in Economic Sciences, marshalled case studies from Swiss alpine meadows, Japanese forests, Spanish irrigation systems, and Maine lobster fisheries to demonstrate that many communities had, over centuries, developed sophisticated self-governing institutions capable of managing shared resources sustainably without either privatisation or state control. These arrangements shared a set of recurring design principles: clearly defined boundaries, rules adapted to local conditions, collective-choice arrangements allowing users to participate in rule modification, monitoring, graduated sanctions, conflict-resolution mechanisms, and recognition by external governmental authorities.

What distinguished successful commons governance from failed attempts was not, Ostrom argued, the nature of the resource itself, but the characteristics of the institutional arrangements through which it was managed. The pastoralists in Hardin's allegory were imagined as isolated, anonymous individuals, incapable of communication, coordination, or the development of binding norms — assumptions that, while analytically tractable, bore little resemblance to the actual social communities that manage real-world common-pool resources. When users know one another, interact repeatedly, share a common future, and are embedded in social norms that stigmatise free-riding, the predicted tragedy fails to materialise. Cooperation, in such conditions, is not irrational but socially rational, and the institutional forms through which it is achieved are often more nuanced and adaptive than either market mechanisms or state regulation.

The contemporary relevance of this debate extends far beyond pastoral land use. Global commons — the atmosphere, the deep oceans, the electromagnetic spectrum, outer space, and increasingly the digital information commons — pose governance challenges of an entirely different order of magnitude. Unlike a Swiss alpine meadow, the atmosphere admits no clearly defined user community, no prospect of repeated interaction among all parties affected, and no feasible mechanism for graduated sanctions against free-riding nations. Climate change in particular represents a commons problem of unprecedented spatial scale and temporal complexity: the harms inflicted by emissions are globally distributed and intergenerationally dispersed, while the benefits of emission reduction are collective and non-excludable. The gap between the institutional richness of successful local commons governance and the institutional poverty of global environmental regimes remains one of the most pressing unsolved problems in international political economy.`,
    questionsMCQ: [
      { q: "What was the central argument of Hardin's 'Tragedy of the Commons'?", options: ["A) Shared resources are always destroyed by ignorant or irrational users.", "B) Rational individual behaviour in common-pool settings inevitably leads to resource destruction.", "C) State regulation is always more effective than privatisation in protecting shared resources.", "D) Communities can self-govern shared resources if given sufficient financial incentives."], correct: "B", rationale: "Hardin argued the tragedy arose not from irrationality but from 'the inescapable logic of individually rational action in collectively managed settings.'" },
      { q: "What was Ostrom's primary methodological contribution to this debate?", options: ["A) She developed a mathematical model that refined Hardin's original equations.", "B) She used laboratory experiments to test cooperation in anonymous settings.", "C) She drew on case studies of communities that had successfully self-governed shared resources.", "D) She proposed a new legal framework for international resource management."], correct: "C", rationale: "Ostrom 'marshalled case studies from Swiss alpine meadows, Japanese forests, Spanish irrigation systems, and Maine lobster fisheries' as empirical evidence." },
      { q: "According to the passage, what assumption in Hardin's model was fundamentally unrealistic?", options: ["A) That individual users would seek to maximise personal gain.", "B) That users were isolated, anonymous, and incapable of developing social norms.", "C) That pastures had a finite carrying capacity.", "D) That privatisation could solve the problem of resource depletion."], correct: "B", rationale: "Ostrom argued Hardin's pastoralists were imagined as 'isolated, anonymous individuals, incapable of communication, coordination, or the development of binding norms' — unrealistic assumptions." },
      { q: "Why does the passage suggest global commons like the atmosphere are harder to govern than local commons?", options: ["A) International law lacks any mechanism for addressing environmental issues.", "B) Nation states always prioritise economic growth over environmental protection.", "C) The atmosphere lacks defined user communities, repeated interaction, and enforceable sanctions.", "D) Scientific uncertainty about climate change prevents the development of binding agreements."], correct: "C", rationale: "The passage states the atmosphere 'admits no clearly defined user community, no prospect of repeated interaction among all parties affected, and no feasible mechanism for graduated sanctions.'" },
    ],
    questionsTFNG: [
      { q: "Elinor Ostrom published her response to Hardin within five years of his original essay.", correct: "FALSE", rationale: "'Governing the Commons' was published in 1990, twenty-two years after Hardin's 1968 essay." },
      { q: "Ostrom's design principles for commons governance include mechanisms for resolving disputes among users.", correct: "TRUE", rationale: "The passage lists 'conflict-resolution mechanisms' as one of the recurring design principles in successful commons governance." },
      { q: "Hardin ultimately revised his conclusions after the publication of Ostrom's work.", correct: "NOT GIVEN", rationale: "The passage discusses Ostrom's challenge to Hardin but says nothing about whether Hardin revised his own views." },
      { q: "Climate change is described as a commons problem with both global spatial distribution and intergenerational temporal complexity.", correct: "TRUE", rationale: "The passage states climate harms are 'globally distributed and intergenerationally dispersed' — confirming both dimensions." },
    ],
    questionsSentence: [
      { q: "Successful commons governance depends not on the type of resource but on the quality of the __ managing it.", answer: "institutional arrangements", rationale: "The passage states 'what distinguished successful commons governance... was not... the nature of the resource itself, but the characteristics of the institutional arrangements.'" },
      { q: "In communities where users interact repeatedly and share a common future, __ is socially rational rather than irrational.", answer: "cooperation", rationale: "The passage concludes that under such conditions, 'cooperation... is not irrational but socially rational.'" },
    ],
    questionsHeadings: [
      { paragraph: "For two decades, Hardin's model served as a powerful justification for enclosure...", options: ["A) The Legal History of Property Rights in Common Land", "B) Ostrom's Empirical Challenge to the Privatisation Paradigm", "C) Why State Regulation Failed to Protect Natural Resources", "D) The Economic Theory Behind Resource Enclosure"], correct: "B", rationale: "The paragraph introduces Ostrom's work as an empirically grounded alternative to Hardin's model, directly challenging the privatisation and state-regulation conclusions." },
      { paragraph: "The contemporary relevance of this debate extends far beyond pastoral land use...", options: ["A) Solutions to the Climate Crisis from Local Commons Models", "B) Why International Law Must Replace National Environmental Policy", "C) Global Commons and the Limits of Existing Governance Frameworks", "D) The Digital Information Commons as a New Form of Shared Resource"], correct: "C", rationale: "The paragraph extends the commons debate to global-scale resources and argues existing governance frameworks are institutionally inadequate — matching C." },
    ],
  }

); // end IELTS_READING_PASSAGES.push (hard batch)


// ══════════════════════════════════════════════════════════════════════
//  HARD PASSAGES — Batch 2 (passages 21–25)
// ══════════════════════════════════════════════════════════════════════
IELTS_READING_PASSAGES.push(

  {
    id: 'passage_006',
    title: 'The Neuroscience of Decision-Making: Rationality, Emotion, and the Limits of Choice',
    topic: 'Neuroscience / Psychology',
    difficulty: 'hard',
    text: `The Enlightenment bequeathed to Western intellectual culture an enduring ideal of the rational agent: a being capable of surveying available options, calculating probable outcomes, and selecting the course of action most likely to maximise utility. This model, refined by economists into the apparatus of expected utility theory, dominated thinking about human behaviour for much of the twentieth century. Its elegance was matched by its prescriptive power — and, as a growing body of empirical evidence would eventually reveal, by its profound descriptive inadequacy. The work of psychologists Daniel Kahneman and Amos Tversky in the 1970s and 1980s systematically documented the ways in which human judgment departs from rational norms, cataloguing a taxonomy of cognitive biases — anchoring, availability, representativeness, framing effects — that render human decision-making far messier, more contextual, and more emotionally inflected than classical theory had assumed.

Neuroscience has since added a further layer of complexity to this picture. The somatic marker hypothesis, developed by neurologist António Damásio, proposes that emotional signals — encoded as bodily states and registered in structures such as the ventromedial prefrontal cortex and the amygdala — play an indispensable role in practical reasoning. Damásio's studies of patients with lesions to the ventromedial prefrontal cortex provided striking evidence for this view: despite intact general intelligence and the capacity for logical reasoning, these patients exhibited catastrophically impaired real-world decision-making, unable to weigh options in a way that served their long-term interests. Without the affective signal that ordinarily tags memories and anticipated outcomes with emotional valence, they were overwhelmed by an infinite regress of logically equivalent considerations. Far from impeding rational thought, emotion, in Damásio's account, is its necessary substrate.

This reconceptualisation has implications that extend well beyond academic psychology. Behavioural economics, which applies insights from cognitive and emotional psychology to market behaviour, has demonstrated that consumers systematically violate the predictions of classical utility maximisation: they are loss-averse (losses loom larger than equivalent gains), present-biased (they discount future rewards at rates inconsistent with standard exponential discounting), and susceptible to framing effects that alter choices without altering objective payoffs. These findings have been applied in the design of 'nudge' interventions — subtle alterations to the choice architecture of public policy — intended to steer individuals toward behaviours, such as retirement saving and organ donation, that they would endorse on reflection but frequently fail to enact spontaneously.

Critics of nudge theory raise objections on both empirical and normative grounds. Empirically, the replication crisis in social psychology has cast doubt on the robustness of several foundational findings in the field, including some priming effects and social norm interventions once thought reliable. Normatively, philosophers and political theorists have questioned whether nudging, even in pursuit of the individual's own declared preferences, constitutes a form of manipulation that bypasses autonomous rational agency — the very faculty that liberal political philosophy places at the centre of legitimate governance. Whether the appropriate response is more transparent nudging, stronger regulation of private sector choice architecture, or a wholesale rethinking of the rational agent model remains a vigorously contested question at the intersection of cognitive science, ethics, and public policy.`,
    questionsMCQ: [
      { q: "What was the primary contribution of Kahneman and Tversky's research to the understanding of human decision-making?", options: ["A) They confirmed that humans reliably maximise utility in economic decisions.", "B) They developed the somatic marker hypothesis as an alternative to expected utility theory.", "C) They catalogued systematic cognitive biases showing human judgment departs from rational norms.", "D) They demonstrated that emotional signals are unnecessary for effective decision-making."], correct: "C", rationale: "The passage states Kahneman and Tversky 'systematically documented the ways in which human judgment departs from rational norms, cataloguing a taxonomy of cognitive biases.'" },
      { q: "What did Damásio's studies of prefrontal cortex lesion patients reveal?", options: ["A) Emotional impairment always coincides with a loss of general intelligence.", "B) Patients without emotional signals made better decisions by relying purely on logic.", "C) Intact logical reasoning is insufficient for effective real-world decision-making without emotional input.", "D) The amygdala is the sole structure responsible for rational thought."], correct: "C", rationale: "Despite 'intact general intelligence and the capacity for logical reasoning,' lesion patients showed 'catastrophically impaired real-world decision-making,' demonstrating emotion's necessity." },
      { q: "What does 'loss aversion' mean as described in the context of behavioural economics?", options: ["A) Consumers avoid purchasing goods that decrease in value over time.", "B) People experience losses as more significant than equivalent gains.", "C) Investors refuse to sell assets even when doing so would be profitable.", "D) Consumers systematically underestimate the probability of financial losses."], correct: "B", rationale: "The passage defines loss aversion as the phenomenon where 'losses loom larger than equivalent gains.'" },
      { q: "What normative objection do philosophers raise against nudge interventions?", options: ["A) Nudges are too expensive to implement at a population scale.", "B) Nudges do not actually change behaviour in statistically significant ways.", "C) Nudges may constitute manipulation that undermines individuals' rational autonomy.", "D) Nudges favour certain political ideologies over others in their design."], correct: "C", rationale: "Philosophers question 'whether nudging... constitutes a form of manipulation that bypasses autonomous rational agency — the very faculty that liberal political philosophy places at the centre of legitimate governance.'" },
    ],
    questionsTFNG: [
      { q: "Expected utility theory was primarily developed as a descriptive account of how humans actually make decisions.", correct: "FALSE", rationale: "The passage describes it as having 'prescriptive power' — it was a normative ideal, not a descriptive account — and notes its 'profound descriptive inadequacy.'" },
      { q: "Damásio argued that emotional responses are an essential component of effective practical reasoning.", correct: "TRUE", rationale: "Damásio's account holds that emotion 'is the necessary substrate' of rational thought, not an impediment to it." },
      { q: "All behavioural economics findings cited in the passage have been successfully replicated in subsequent studies.", correct: "FALSE", rationale: "The passage notes 'the replication crisis in social psychology has cast doubt on the robustness of several foundational findings in the field.'" },
      { q: "Nudge interventions have been used in policy contexts related to organ donation and retirement saving.", correct: "TRUE", rationale: "The passage explicitly mentions 'retirement saving and organ donation' as examples of behaviours targeted by nudge policy design." },
    ],
    questionsSentence: [
      { q: "Patients with damage to the ventromedial prefrontal cortex lacked __ to guide their choices, leaving them overwhelmed by logically equivalent considerations.", answer: "affective signal", rationale: "The passage states 'without the affective signal that ordinarily tags memories and anticipated outcomes with emotional valence, they were overwhelmed by an infinite regress of logically equivalent considerations.'" },
      { q: "Present bias refers to individuals discounting future rewards at rates inconsistent with __.", answer: "standard exponential discounting", rationale: "The passage states people are 'present-biased (they discount future rewards at rates inconsistent with standard exponential discounting).'" },
    ],
    questionsHeadings: [
      { paragraph: "Neuroscience has since added a further layer of complexity to this picture...", options: ["A) How Brain Lesions Impair General Intelligence", "B) The Role of Emotion as a Foundation for Rational Decision-Making", "C) Damásio's Critique of Behavioural Economics", "D) Why the Amygdala Controls Financial Decision-Making"], correct: "B", rationale: "The paragraph presents Damásio's somatic marker hypothesis, arguing emotion is the 'necessary substrate' of rational thought — directly matching B." },
      { paragraph: "Critics of nudge theory raise objections on both empirical and normative grounds...", options: ["A) Why Nudge Theory Has Been Abandoned by Governments", "B) The Replication Crisis and Its Effect on Neuroscience", "C) Empirical and Ethical Challenges to Behavioural Interventions", "D) The Philosophical Case for Stronger Market Regulation"], correct: "C", rationale: "The paragraph covers both empirical doubts (replication crisis) and normative objections (autonomy), making C the most accurate and complete heading." },
    ],
  },


  {
    id: 'passage_007',
    title: 'Urban Heat Islands: The Thermal Consequences of Urbanisation',
    topic: 'Environment / Urban Planning',
    difficulty: 'hard',
    text: `Cities are, by their nature, thermal anomalies. The replacement of vegetated land with impervious surfaces — concrete, asphalt, steel, and glass — transforms the way solar energy is absorbed, stored, and released. Where soil and vegetation dissipate incoming radiation through evapotranspiration, channelling latent heat into the atmosphere and keeping surface temperatures relatively stable, urban materials absorb heat during the day and release it slowly at night, maintaining surface and air temperatures measurably above those of surrounding rural areas. This phenomenon, first documented systematically by the meteorologist Luke Howard in his 1820 study of London's climate, has come to be known as the urban heat island effect — and in an era of accelerating urbanisation and anthropogenic climate change, it represents one of the most consequential and underappreciated challenges in environmental management.

The mechanisms that drive urban heat islands are multiple and mutually reinforcing. The geometry of urban canyons — the narrow corridors between tall buildings — reduces the sky view factor, trapping longwave radiation that would otherwise escape to space and limiting the ventilation needed to carry away accumulated heat. Dark-coloured roofing and paving materials have low albedo, absorbing a greater fraction of incoming solar radiation than the lighter surfaces they replace. Waste heat from human activities — vehicles, air conditioning units, industrial processes, and the metabolic activity of millions of bodies — adds a further anthropogenic heat flux that can be substantial in the densest urban cores. Finally, the scarcity of urban vegetation removes one of the most effective natural mechanisms for thermal regulation: a single mature tree may transpire hundreds of litres of water per day, producing a cooling effect comparable to several air conditioning units.

The health consequences of urban heat islands are both direct and indirect. Heat stress is the leading cause of weather-related mortality across much of the temperate world, and urban populations bear a disproportionate burden: during the 2003 European heat wave, excess mortality in Paris was estimated at approximately 4,800 deaths, with the elderly living alone in poorly insulated upper-floor apartments at particular risk. Indirectly, elevated temperatures accelerate the photochemical reactions that produce tropospheric ozone and secondary particulate matter, compounding the respiratory burden already imposed by urban air quality. The synergistic interaction between heat and air pollution means that the health costs of urban heat islands are systematically underestimated when each hazard is assessed in isolation.

Mitigation strategies range from the technologically straightforward to the institutionally challenging. Cool roofs — surfaces coated with highly reflective materials — can reduce rooftop temperatures by 30°C or more, with measurable effects on building energy consumption and localised air temperature. Urban greening, through street trees, green roofs, and constructed wetlands, offers cooling benefits that are simultaneously aesthetic, psychological, and thermal. However, the implementation of such strategies at meaningful scale requires overcoming fragmented land ownership, competing planning priorities, and the perennial challenge of distributing costs and benefits equitably across socioeconomically diverse urban populations. The poorest neighbourhoods, characterised by the highest building densities, least green space, and lowest adaptive capacity, typically experience the most severe heat island intensification — a distributional injustice that underscores the inseparability of environmental and social policy.`,
    questionsMCQ: [
      { q: "What is the primary reason urban surfaces retain more heat than vegetated land?", options: ["A) Urban areas generate more human activity and therefore more metabolic heat.", "B) Buildings trap wind and prevent heat from dispersing through convection.", "C) Urban materials absorb and slowly release solar energy rather than dissipating it through evapotranspiration.", "D) Cities are located in geographically warmer areas than rural regions."], correct: "C", rationale: "The passage explains that urban materials 'absorb heat during the day and release it slowly at night' while vegetation dissipates heat through evapotranspiration." },
      { q: "What is the 'sky view factor' and why is it relevant to urban heat islands?", options: ["A) A measure of solar panel efficiency used in urban energy planning.", "B) An indicator of how much longwave radiation can escape from street-level to the atmosphere.", "C) The proportion of sky visible from a given point, affecting how much wind reaches street level.", "D) A metric used to calculate the albedo of roofing materials in dense urban areas."], correct: "B", rationale: "The passage explains that urban canyon geometry 'reduces the sky view factor, trapping longwave radiation that would otherwise escape to space.'" },
      { q: "According to the passage, why are the health costs of urban heat islands underestimated?", options: ["A) Governments lack the data needed to attribute deaths to heat exposure accurately.", "B) The elderly are not included in standard epidemiological mortality surveys.", "C) Heat and air pollution interact synergistically, but are typically assessed separately.", "D) Most studies of urban heat islands focus on energy consumption rather than public health."], correct: "C", rationale: "'The synergistic interaction between heat and air pollution means that the health costs of urban heat islands are systematically underestimated when each hazard is assessed in isolation.'" },
      { q: "What distributional concern does the author raise about urban heat island mitigation?", options: ["A) Cool roof technology is too expensive for use in developing countries.", "B) Wealthier residents oppose urban greening because it reduces property values.", "C) The most vulnerable communities suffer the worst heat effects but have the least capacity to adapt.", "D) Green infrastructure benefits are concentrated in commercial districts rather than residential areas."], correct: "C", rationale: "'The poorest neighbourhoods... typically experience the most severe heat island intensification — a distributional injustice that underscores the inseparability of environmental and social policy.'" },
    ],
    questionsTFNG: [
      { q: "Luke Howard was the first scientist to formally study and document the urban heat island effect.", correct: "TRUE", rationale: "The passage attributes the first systematic documentation of the phenomenon to Howard's 1820 study of London's climate." },
      { q: "A single mature tree can produce a cooling effect through transpiration equivalent to several air conditioning units.", correct: "TRUE", rationale: "The passage states 'a single mature tree may transpire hundreds of litres of water per day, producing a cooling effect comparable to several air conditioning units.'" },
      { q: "During the 2003 European heat wave, the highest mortality rates were recorded in London.", correct: "NOT GIVEN", rationale: "The passage only mentions excess mortality figures for Paris; it makes no comparison with other European cities." },
      { q: "Cool roofs can reduce rooftop temperatures by up to thirty degrees Celsius.", correct: "TRUE", rationale: "The passage states cool roofs 'can reduce rooftop temperatures by 30°C or more.'" },
    ],
    questionsSentence: [
      { q: "Urban heat islands worsen air quality indirectly by accelerating __ that generate tropospheric ozone.", answer: "photochemical reactions", rationale: "'Elevated temperatures accelerate the photochemical reactions that produce tropospheric ozone and secondary particulate matter.'" },
      { q: "Implementing mitigation strategies at scale is hindered by fragmented land ownership, competing planning priorities, and the challenge of distributing __ equitably.", answer: "costs and benefits", rationale: "The passage states the 'perennial challenge of distributing costs and benefits equitably across socioeconomically diverse urban populations.'" },
    ],
    questionsHeadings: [
      { paragraph: "The mechanisms that drive urban heat islands are multiple and mutually reinforcing...", options: ["A) The History of Urban Thermal Research", "B) Four Interconnected Causes of Urban Overheating", "C) Why Building Height Affects Local Climate", "D) Albedo and Its Role in Global Climate Change"], correct: "B", rationale: "The paragraph systematically describes four reinforcing mechanisms (canyon geometry, albedo, waste heat, lack of vegetation), best captured by B." },
      { paragraph: "Mitigation strategies range from the technologically straightforward to the institutionally challenging...", options: ["A) The Economic Cost of Urban Greening Programmes", "B) Why Cool Roofs Are the Most Effective Climate Solution", "C) Solutions and the Social Equity Challenges of Implementation", "D) Government Policy Failures in Environmental Management"], correct: "C", rationale: "The paragraph covers both available solutions (cool roofs, greening) and the equity-related institutional challenges of deploying them at scale — matching C." },
    ],
  },


  {
    id: 'passage_008',
    title: 'The Origins of Writing: From Accounting to Literature',
    topic: 'History / Linguistics',
    difficulty: 'hard',
    text: `Writing is so deeply embedded in the fabric of literate societies that it is tempting to imagine it as a natural extension of human language — an inevitable technology awaiting only the right moment to emerge. This intuition is misleading. Spoken language, with its evolutionary roots extending hundreds of thousands of years into the hominin past, is a biological endowment; writing is a cultural invention of recent and relatively rare occurrence. Of the thousands of languages ever spoken, only a small fraction have ever been committed to a writing system, and the independent invention of writing appears to have occurred, by most scholarly accounts, no more than three or four times in human history — in Mesopotamia around 3200 BCE, in Egypt shortly thereafter, in China around 1200 BCE, and possibly in Mesoamerica with the Olmec and later Maya scripts. All other writing systems are derived, through direct transmission or inspiration, from one of these origins.

The Mesopotamian case is the best documented and the most instructive. Cuneiform script, impressed into clay tablets with a reed stylus, did not emerge from an impulse toward literary expression. Its origins were administrative: the need to record commodity transfers, livestock inventories, and labour allocations in the expanding temple economies of Sumerian city-states such as Uruk. The earliest tablets, dating to approximately 3200 BCE, are essentially accounting documents — lists of goods, names, and quantities that required a mnemonic system capable of outlasting the individual memory of any single administrator. The pictographic signs of the earliest proto-cuneiform gradually evolved toward greater abstraction and phonetic flexibility, as scribes discovered that representing the sounds of spoken words, rather than merely their referents, allowed the script to capture an indefinitely wider range of information. This shift, from logographic to increasingly syllabic representation, is perhaps the most consequential single development in the history of written communication.

The social consequences of literacy in the ancient world were far-reaching but by no means uniformly democratising. In Mesopotamia, Egypt, and China alike, literacy was overwhelmingly the preserve of a trained scribal class whose expertise conferred economic and political privilege. The acquisition of cuneiform, with its repertoire of several hundred to several thousand signs depending on period and script variant, required years of arduous training in scribal schools known as the edubba in Sumerian — institutions that functioned simultaneously as professional academies and ideological apparatus, instilling the values and worldview of the administrative elite. Writing, in this context, was less an instrument of popular communication than a technology of power: it enabled the recording of contracts, legal codes, and royal decrees in forms that were authoritative, reproducible, and resistant to the distortions of oral transmission.

The eventual expansion of literacy beyond the scribal elite was driven in part by technological innovation. The development of alphabetic scripts — in which a small number of signs represent consonantal or vocalic sounds rather than whole words or syllables — dramatically reduced the learning burden associated with full literacy. The Phoenician alphabet, developed around 1050 BCE, required mastery of only 22 signs, compared to the hundreds required for cuneiform or hieroglyphics. Adapted by the Greeks, who added vowel signs to produce the first fully phonemic alphabet, and subsequently transmitted across the Mediterranean world, alphabetic writing laid the infrastructural foundation for the eventual, if historically gradual, expansion of literacy to wider social strata.`,
    questionsMCQ: [
      { q: "According to the passage, what was the original purpose of Mesopotamian cuneiform writing?", options: ["A) To record religious hymns and mythological narratives for temple ceremonies.", "B) To preserve the oral traditions of Sumerian city-states in permanent form.", "C) To manage administrative and economic records in temple economies.", "D) To communicate diplomatic messages between rival city-states."], correct: "C", rationale: "The passage states cuneiform's origins 'were administrative: the need to record commodity transfers, livestock inventories, and labour allocations in the expanding temple economies.'" },
      { q: "What does the passage identify as the most significant development in the history of written communication?", options: ["A) The invention of the clay tablet as a durable recording medium.", "B) The shift from representing referents to representing the sounds of spoken words.", "C) The emergence of scribal schools as centres of professional training.", "D) The adaptation of Phoenician script by the Greeks to include vowel signs."], correct: "B", rationale: "The passage calls the shift 'from logographic to increasingly syllabic representation... perhaps the most consequential single development in the history of written communication.'" },
      { q: "How does the passage characterise the relationship between writing and power in ancient civilisations?", options: ["A) Writing quickly democratised access to political and economic life in ancient societies.", "B) Writing was used primarily to challenge the authority of ruling elites.", "C) Writing functioned as a technology that reinforced the privileges of a trained scribal class.", "D) Writing emerged independently among common people before being adopted by elites."], correct: "C", rationale: "The passage states writing was 'less an instrument of popular communication than a technology of power' that conferred 'economic and political privilege' on the scribal class." },
      { q: "Why did alphabetic writing systems enable a broader expansion of literacy than cuneiform or hieroglyphics?", options: ["A) Alphabetic scripts were more aesthetically appealing and therefore more widely taught.", "B) Alphabetic systems required mastery of far fewer signs, reducing the learning burden.", "C) Alphabetic writing was invented in regions with higher population density.", "D) Alphabetic scripts were better suited to recording spoken dialogue and literature."], correct: "B", rationale: "The passage states alphabetic scripts 'dramatically reduced the learning burden' — the Phoenician alphabet needed only 22 signs versus hundreds for cuneiform." },
    ],
    questionsTFNG: [
      { q: "Writing is considered by the author to be a natural and inevitable extension of spoken human language.", correct: "FALSE", rationale: "The passage explicitly states this 'intuition is misleading,' distinguishing spoken language as biological and writing as a rare cultural invention." },
      { q: "The Phoenician alphabet contained fewer than thirty individual signs.", correct: "TRUE", rationale: "The passage states the Phoenician alphabet 'required mastery of only 22 signs.'" },
      { q: "The edubba was a Sumerian institution that trained scribes and also promoted the values of the administrative class.", correct: "TRUE", rationale: "The passage describes the edubba as functioning 'simultaneously as professional academies and ideological apparatus, instilling the values and worldview of the administrative elite.'" },
      { q: "Chinese writing is believed to have been influenced by the earlier Mesopotamian cuneiform system.", correct: "NOT GIVEN", rationale: "The passage lists China as one of the sites of independent writing invention but makes no claim about any connection to Mesopotamia." },
    ],
    questionsSentence: [
      { q: "Proto-cuneiform evolved so scribes could represent the __ of spoken words rather than only their meaning.", answer: "sounds", rationale: "'Scribes discovered that representing the sounds of spoken words, rather than merely their referents, allowed the script to capture an indefinitely wider range of information.'" },
      { q: "Writing enabled legal and royal records to be produced in forms that were authoritative, reproducible, and resistant to __ of oral transmission.", answer: "the distortions", rationale: "The passage states writing resisted 'the distortions of oral transmission,' making records more authoritative and stable." },
    ],
    questionsHeadings: [
      { paragraph: "The social consequences of literacy in the ancient world were far-reaching but by no means uniformly democratising...", options: ["A) How Scribal Schools Spread Literacy Across Ancient Societies", "B) Writing as an Instrument of Elite Power and Social Control", "C) The Economic Benefits of Literacy in Mesopotamia and Egypt", "D) The Decline of Oral Tradition in the Ancient Near East"], correct: "B", rationale: "The paragraph argues literacy was concentrated among a privileged scribal class and functioned as 'a technology of power' — directly matching B." },
      { paragraph: "The eventual expansion of literacy beyond the scribal elite was driven in part by technological innovation...", options: ["A) The Greek Contribution to Mediterranean Cultural Exchange", "B) Why the Phoenician Alphabet Replaced Cuneiform in the Ancient World", "C) How Alphabetic Writing Reduced Barriers to Broader Literacy", "D) The Political Motivations Behind Alphabetic Script Development"], correct: "C", rationale: "The paragraph focuses on how alphabetic writing's simplicity 'laid the infrastructural foundation for the eventual... expansion of literacy to wider social strata' — matching C." },
    ],
  },


  {
    id: 'passage_009',
    title: 'Antimicrobial Resistance: A Slow-Motion Pandemic',
    topic: 'Public Health / Medicine',
    difficulty: 'hard',
    text: `Among the defining threats to global public health in the twenty-first century, antimicrobial resistance occupies a position that is simultaneously well-understood in its mechanisms, widely acknowledged in its severity, and stubbornly resistant to the co-ordinated international response its scale demands. The capacity of bacteria, viruses, fungi, and parasites to evolve mechanisms that neutralise the drugs developed to kill them is not a failure of medical science but an expression of one of biology's most fundamental dynamics: natural selection operating under intense selective pressure. Every course of antibiotics eliminates susceptible organisms and creates ecological space for resistant variants to proliferate; the more extensively a drug is used, and the more inconsistently it is administered, the more rapidly this selection pressure operates. The result, projected across decades of global antibiotic overuse and misuse in human medicine, veterinary practice, and agricultural production, is a world in which infections once routinely treatable are becoming progressively harder to cure.

The epidemiological dimensions of this problem are already visible in clinical settings. Multi-drug-resistant organisms — including methicillin-resistant Staphylococcus aureus (MRSA), carbapenem-resistant Enterobacteriaceae, and drug-resistant Mycobacterium tuberculosis — impose substantial morbidity and mortality, with a 2022 global analysis attributing approximately 1.27 million deaths directly to antimicrobial-resistant infections in 2019. The pipeline of new antibiotic development, which might be expected to compensate for rising resistance, has instead contracted alarmingly: the economic model of drug development, which favours chronic-use products with large patient populations over short-course treatments for acute infections, creates a market failure that has driven most major pharmaceutical companies to exit antibiotic research entirely. The few candidates that do reach the clinic tend to be reserved as last-resort agents to slow the development of resistance against them — a conservation strategy that further limits their commercial viability.

Agricultural use of antimicrobials presents a challenge of comparable magnitude but even greater regulatory complexity. In many countries, antibiotics are administered to livestock not only to treat disease but as growth promoters — low-dose prophylactic administration that accelerates weight gain through mechanisms that remain incompletely understood but likely involve modification of the gut microbiome. This practice, which has been banned in the European Union since 2006 but persists widely elsewhere, creates vast reservoirs of selection pressure in which resistance genes can develop, be horizontally transferred between bacterial species, and ultimately enter the human food chain through the consumption of meat or the environmental contamination of water and soil by animal waste. The interconnectedness of human, animal, and environmental health — captured in the concept of One Health — underscores the inadequacy of any purely clinical approach to the resistance problem.

The international governance architecture for addressing antimicrobial resistance reflects the wider difficulties of co-ordinating action on complex global health threats. The World Health Organisation's Global Action Plan on Antimicrobial Resistance, adopted in 2015, established a framework for national action plans, surveillance systems, and stewardship programmes; by 2023, the majority of member states had developed such plans, though implementation quality varies enormously. Economists have proposed pull incentives — guaranteed revenue commitments, market entry rewards, and subscription-based payment models — to restructure the economic case for antibiotic development, decoupling revenue from volume of use. Whether these mechanisms, individually or in combination, will prove sufficient to reverse the trajectory of a problem that has been decades in the making remains, at best, an open question.`,
    questionsMCQ: [
      { q: "According to the passage, why has the development of new antibiotics declined rather than increased in response to rising resistance?", options: ["A) Pharmaceutical companies lack the scientific expertise to develop new antibiotic classes.", "B) Regulatory agencies have imposed excessively restrictive approval standards for antibiotics.", "C) The economic model of drug development makes antibiotics commercially unattractive to manufacturers.", "D) Most new antibiotic candidates fail in clinical trials due to insufficient efficacy."], correct: "C", rationale: "The passage states the 'economic model of drug development... creates a market failure that has driven most major pharmaceutical companies to exit antibiotic research entirely.'" },
      { q: "What is the significance of horizontal gene transfer mentioned in the passage?", options: ["A) It allows resistance genes developed in agricultural settings to spread between bacterial species and potentially reach humans.", "B) It is the primary mechanism by which bacteria develop new resistance mutations spontaneously.", "C) It enables pharmaceutical companies to transfer antibiotic patents across national borders.", "D) It describes how resistance genes are passed from parent to offspring bacteria during reproduction."], correct: "A", rationale: "The passage states resistance genes can 'be horizontally transferred between bacterial species, and ultimately enter the human food chain' from agricultural settings." },
      { q: "What does the 'One Health' concept refer to in the context of this passage?", options: ["A) A WHO initiative requiring all countries to adopt a single antibiotic stewardship policy.", "B) The recognition that human, animal, and environmental health are interconnected systems.", "C) A pharmaceutical industry consortium dedicated to funding antibiotic research.", "D) The idea that a single antibiotic should be developed to treat all drug-resistant infections."], correct: "B", rationale: "The passage describes One Health as capturing 'the interconnectedness of human, animal, and environmental health,' underscoring the inadequacy of purely clinical approaches." },
      { q: "What are 'pull incentives' as proposed by economists in the passage?", options: ["A) Regulatory mechanisms that remove barriers to antibiotic approval.", "B) Financial mechanisms designed to make antibiotic development commercially attractive without depending on sales volume.", "C) International treaties that obligate wealthy nations to fund antibiotic research in developing countries.", "D) Clinical protocols that pull resistant bacteria out of patient populations through targeted treatment."], correct: "B", rationale: "The passage describes pull incentives as mechanisms 'decoupling revenue from volume of use,' including market entry rewards and subscription-based models." },
    ],
    questionsTFNG: [
      { q: "Antimicrobial resistance is caused primarily by deliberate misuse of antibiotics by patients.", correct: "FALSE", rationale: "The passage attributes resistance to 'global antibiotic overuse and misuse in human medicine, veterinary practice, and agricultural production' — a systemic, multi-sector problem." },
      { q: "The European Union prohibited the use of antibiotics as growth promoters in livestock before 2010.", correct: "TRUE", rationale: "The passage states this practice 'has been banned in the European Union since 2006.'" },
      { q: "The WHO's Global Action Plan has been fully implemented by all member states that adopted it.", correct: "FALSE", rationale: "The passage states that 'implementation quality varies enormously' among the majority of member states that developed plans." },
      { q: "New antibiotics that reach the clinic are sometimes deliberately restricted in use to preserve their effectiveness.", correct: "TRUE", rationale: "The passage states new candidates 'tend to be reserved as last-resort agents to slow the development of resistance against them.'" },
    ],
    questionsSentence: [
      { q: "The selection pressure that drives antimicrobial resistance operates most rapidly when a drug is used extensively and __.", answer: "inconsistently administered", rationale: "'The more extensively a drug is used, and the more inconsistently it is administered, the more rapidly this selection pressure operates.'" },
      { q: "A 2022 global analysis estimated that approximately __ deaths were directly attributable to antimicrobial-resistant infections in 2019.", answer: "1.27 million", rationale: "The passage states 'a 2022 global analysis attributing approximately 1.27 million deaths directly to antimicrobial-resistant infections in 2019.'" },
    ],
    questionsHeadings: [
      { paragraph: "Agricultural use of antimicrobials presents a challenge of comparable magnitude but even greater regulatory complexity...", options: ["A) Why European Agriculture Has Eliminated Antibiotic Resistance", "B) The Livestock Industry's Role in Accelerating Resistance and the One Health Framework", "C) How Animal Waste Contaminates Global Water Supplies", "D) The Science of Gut Microbiome Modification in Livestock"], correct: "B", rationale: "The paragraph covers agricultural antibiotic use, its resistance consequences, resistance spread to humans, and the One Health concept — all captured in B." },
      { paragraph: "The international governance architecture for addressing antimicrobial resistance reflects the wider difficulties...", options: ["A) The WHO's Successful Elimination of Drug-Resistant Tuberculosis", "B) Why National Action Plans Are Sufficient to Address Antimicrobial Resistance", "C) Global Governance Challenges and Economic Solutions for Antibiotic Development", "D) The Role of International Law in Regulating Pharmaceutical Companies"], correct: "C", rationale: "The paragraph covers international governance limitations and economist-proposed pull incentives for fixing antibiotic development — matching C." },
    ],
  },


  {
    id: 'passage_010',
    title: 'The Philosophy of Memory: Identity, Authenticity, and the Reconstructive Mind',
    topic: 'Philosophy / Cognitive Science',
    difficulty: 'hard',
    text: `Memory occupies a peculiar position in the philosophy of personal identity. It is simultaneously the mechanism through which the self extends across time and an unreliable witness to the past it purports to record. John Locke, writing in the seventeenth century, proposed that personal identity consists in continuity of consciousness, particularly the capacity to remember one's own past experiences: to be the same person as the child who learned to walk is to be able, in principle, to remember what that child experienced. This memory criterion, despite its intuitive appeal, was challenged almost immediately. Thomas Reid observed that if a general could remember being flogged as a boy, and a boy could remember his first battle, but the general could no longer remember the flogging, then by Locke's criterion the general was and was not the same person as the boy — a logical contradiction that reveals the difficulties of founding identity on any single psychological thread.

Contemporary philosophy of mind and cognitive neuroscience have deepened rather than dissolved these puzzles. The neuroscientific study of memory has overturned a model of memory as a recording device — a neural archive faithfully preserving past experience — in favour of a reconstructive account. Every act of remembering is simultaneously an act of reconstruction: memories are not retrieved from storage in the way a file is retrieved from a computer, but are reassembled each time from distributed neural traces, subject to distortion by subsequent experience, current emotional state, social influence, and the pressures of narrative coherence. Elizabeth Loftus's decades of research on eyewitness testimony has demonstrated the alarming ease with which false memories can be implanted through leading questions, post-event information, or suggestive social contexts — with subjects displaying full subjective confidence in fabricated recollections. If memory is the foundation of personal identity, and memory is systematically reconstructive rather than reproductive, then the self built on memory is, in some sense, a perpetual confabulation.

This has implications not only for philosophy but for law, therapy, and the ethics of historical reckoning. In forensic contexts, the realisation that eyewitness memory is fallible has contributed to the reform of identification procedures, the mandatory use of video recording in custodial interviews, and the increased weight given to physical and digital evidence relative to testimonial evidence. In clinical psychology, the so-called 'memory wars' of the 1980s and 1990s — centred on the controversy surrounding recovered memories of trauma, particularly childhood abuse — exposed the potential for therapeutic techniques to generate rather than recover genuine memories, with severe consequences for both patients and those falsely accused. The appropriate framework for distinguishing therapeutically recovered memories from therapeutically induced ones remains contested.

Philosophers who are troubled by the reconstructive character of memory have occasionally sought refuge in narrative identity theory, most prominently associated with Paul Ricoeur and Charles Taylor. On this view, the self is not a metaphysical substance that persists through time but a narrative achievement: we constitute our identities by integrating past experiences, present commitments, and future aspirations into a coherent story. Memory, on this account, need not be perfectly accurate to do its identity-constituting work — what matters is not fidelity to a fixed past but the ongoing interpretive activity through which we make the past intelligible and render ourselves as unified agents across time. Whether this narrative turn adequately addresses the more radical implications of reconstructive memory theory, or merely relocates the problem of reliability from epistemology to hermeneutics, remains a question that divides contemporary philosophers.`,
    questionsMCQ: [
      { q: "What was Thomas Reid's objection to Locke's memory criterion of personal identity?", options: ["A) He argued that memory is too unreliable to form the basis of any philosophical theory.", "B) He showed that Locke's criterion produced a logical contradiction when memory gaps existed between life stages.", "C) He proposed that bodily continuity, not memory, is the true foundation of personal identity.", "D) He demonstrated that consciousness cannot extend backwards in time through acts of remembering."], correct: "B", rationale: "Reid's example showed that Locke's criterion implies 'the general was and was not the same person as the boy — a logical contradiction' arising from memory gaps." },
      { q: "How does the contemporary neuroscientific account of memory differ from the 'recording device' model?", options: ["A) Neuroscience has shown that memories are stored in a single dedicated brain region rather than distributed networks.", "B) The contemporary account holds that memories are faithfully preserved but selectively accessed.", "C) Neuroscience has established that memory is reconstructed each time rather than retrieved from a fixed archive.", "D) The contemporary view holds that emotional memories are more reliable than factual ones."], correct: "C", rationale: "The passage states memories 'are reassembled each time from distributed neural traces, subject to distortion' — contrasting with retrieval from a fixed archive." },
      { q: "What was the central concern raised by the 'memory wars' in clinical psychology?", options: ["A) That patients were deliberately fabricating memories of trauma to obtain legal compensation.", "B) That therapeutic techniques could generate false memories rather than recovering genuine ones.", "C) That repressed memories were being used as unreliable evidence in criminal trials.", "D) That trauma victims were unable to form new memories due to neurological damage."], correct: "B", rationale: "The memory wars concerned 'the potential for therapeutic techniques to generate rather than recover genuine memories, with severe consequences for both patients and those falsely accused.'" },
      { q: "According to narrative identity theory, what makes memory sufficient for identity even if inaccurate?", options: ["A) Narrative coherence is more philosophically important than factual accuracy in defining the self.", "B) The self is constituted through an ongoing interpretive integration of past, present, and future into a story.", "C) Memory's inaccuracies are corrected over time through social interaction and cultural reinforcement.", "D) Identity is grounded in emotional continuity rather than the factual content of remembered events."], correct: "B", rationale: "Narrative identity holds that 'what matters is not fidelity to a fixed past but the ongoing interpretive activity through which we make the past intelligible and render ourselves as unified agents.'" },
    ],
    questionsTFNG: [
      { q: "Locke argued that personal identity is grounded in the continuous existence of the physical body.", correct: "FALSE", rationale: "Locke grounded personal identity in 'continuity of consciousness, particularly the capacity to remember one's own past experiences' — not the body." },
      { q: "Elizabeth Loftus's research demonstrated that individuals can hold false memories with full subjective confidence.", correct: "TRUE", rationale: "The passage states subjects display 'full subjective confidence in fabricated recollections' implanted through leading questions or post-event information." },
      { q: "Narrative identity theory, as described in the passage, was developed primarily in response to the memory wars controversy.", correct: "NOT GIVEN", rationale: "The passage associates narrative identity theory with Ricoeur and Taylor but does not link its development specifically to the memory wars." },
      { q: "Forensic reforms motivated by memory research have increased the relative importance given to physical and digital evidence over eyewitness testimony.", correct: "TRUE", rationale: "The passage states reforms included 'increased weight given to physical and digital evidence relative to testimonial evidence.'" },
    ],
    questionsSentence: [
      { q: "Memories are vulnerable to distortion by subsequent experience, emotional state, social influence, and the pressures of __.", answer: "narrative coherence", rationale: "'Memories... are reassembled each time from distributed neural traces, subject to distortion by subsequent experience, current emotional state, social influence, and the pressures of narrative coherence.'" },
      { q: "Some philosophers argue that narrative identity theory merely relocates the reliability problem from epistemology to __.", answer: "hermeneutics", rationale: "The final sentence asks whether narrative theory 'merely relocates the problem of reliability from epistemology to hermeneutics.'" },
    ],
    questionsHeadings: [
      { paragraph: "Contemporary philosophy of mind and cognitive neuroscience have deepened rather than dissolved these puzzles...", options: ["A) How Brain Imaging Has Resolved Long-Standing Debates About Memory", "B) The Reconstructive Nature of Memory and Its Challenge to the Idea of a Stable Self", "C) Elizabeth Loftus and the Reform of Eyewitness Testimony Law", "D) Why False Memories Are More Common in Traumatised Populations"], correct: "B", rationale: "The paragraph develops the neuroscientific reconstructive account and its implication that 'the self built on memory is... a perpetual confabulation' — best captured by B." },
      { paragraph: "Philosophers who are troubled by the reconstructive character of memory have occasionally sought refuge in narrative identity theory...", options: ["A) Paul Ricoeur's Solution to the Problem of Traumatic Memory", "B) Why Narrative Approaches to Identity Are Philosophically Unsatisfactory", "C) Narrative Identity as a Response to the Limits of Reconstructive Memory", "D) The Difference Between Epistemology and Hermeneutics in Memory Research"], correct: "C", rationale: "The paragraph presents narrative identity as a philosophical response to reconstructive memory's challenges, while noting it may not fully resolve them — matching C." },
    ],
  }

); // end IELTS_READING_PASSAGES.push (batch 2)


// ══════════════════════════════════════════════════════════════════════
//  PASSAGES — Batch 3 (passages 26–30)
// ══════════════════════════════════════════════════════════════════════
IELTS_READING_PASSAGES.push(

  {
    id: 'passage_011',
    title: 'Neuroplasticity and Adult Learning: Rewiring the Mature Brain',
    topic: 'Science',
    difficulty: 'hard',
    text: `For most of the twentieth century, neuroscience operated under a doctrine of adult cerebral fixity: the brain, once it had completed its developmental trajectory in early adulthood, was understood to be a largely static organ whose neural architecture was essentially immutable. Damage was permanent, lost functions were irrecoverable, and the capacity for learning in later life was thought to rely on existing circuitry rather than the generation of new connections. This consensus began to fracture in the 1960s and has been progressively dismantled over the subsequent decades by a convergence of animal studies, neuroimaging advances, and clinical observations that collectively establish the phenomenon of neuroplasticity — the capacity of the nervous system to reorganise its structural and functional architecture in response to experience, injury, or environmental demand — as one of the most consequential revisions in modern neuroscience.

The cellular mechanisms underlying neuroplasticity are diverse and operate across multiple timescales. At the synaptic level, long-term potentiation (LTP) — the sustained strengthening of synaptic connections following repeated co-activation — provides a molecular substrate for learning and memory consolidation. Structural plasticity involves the growth of new dendritic spines, the pruning of underused connections, and, crucially, the process of adult neurogenesis: the generation of new neurons from neural progenitor cells, documented most robustly in the hippocampal dentate gyrus and the olfactory bulb. The discovery that the adult mammalian brain retains the capacity to produce new neurons — long considered an impossibility — has provoked both excitement and controversy, with debates persisting about the extent to which human adult neurogenesis is functionally significant rather than merely a vestigial or quantitatively marginal process.

The implications for adult education and cognitive rehabilitation are considerable. Research on expert performance has demonstrated that sustained, deliberate practice produces measurable structural changes in relevant cortical regions: studies of London taxi drivers revealed enlarged hippocampal volume correlated with years of navigational experience, while professional musicians show expanded cortical representations of the fingers used in instrument playing. These findings suggest that the adult brain is not merely capable of acquiring new information but of physically reorganising itself in ways that optimise task-relevant processing — a phenomenon sometimes described as experience-dependent plasticity. Rehabilitation programmes for stroke patients have exploited this principle through constraint-induced movement therapy, which forces the use of impaired limbs and has been shown to produce cortical remapping that partially compensates for lesion-induced deficits.

The practical implications, however, must be tempered by an understanding of the limits and conditions of adult plasticity. Neuroplasticity is not unlimited: critical periods in early development represent windows of heightened plasticity that, once closed, cannot be fully reopened; the rate and extent of plastic change decline with age; and the quality of plastic reorganisation may differ from that achievable during development. Moreover, not all plasticity is adaptive — the maladaptive plasticity that underlies phantom limb pain, tinnitus, and certain forms of addiction represents the same mechanisms operating in ways that entrench dysfunction rather than restore function. The translational challenge for neuroscience is therefore not merely to demonstrate that adult plasticity exists, but to characterise the conditions — attentional engagement, sleep quality, emotional state, pharmacological context — under which it can be reliably harnessed for learning and recovery.`,
    questionsMCQ: [
      { q: "What was the prevailing scientific view of the adult brain before the emergence of neuroplasticity research?", options: ["A) The adult brain was thought to generate new neurons continuously throughout life.", "B) The adult brain was considered structurally fixed and incapable of meaningful reorganisation.", "C) Scientists believed adult learning depended entirely on the hippocampus.", "D) The adult brain was understood to compensate for injury by recruiting embryonic stem cells."], correct: "B", rationale: "The passage states the brain 'was understood to be a largely static organ whose neural architecture was essentially immutable.'" },
      { q: "What do the studies of London taxi drivers demonstrate about adult neuroplasticity?", options: ["A) That stress from urban driving accelerates hippocampal deterioration.", "B) That navigational training increases activity in the prefrontal cortex.", "C) That sustained expert practice produces measurable structural changes in relevant brain regions.", "D) That professional experience slows the normal age-related decline in memory."], correct: "C", rationale: "The taxi driver studies showed 'enlarged hippocampal volume correlated with years of navigational experience,' demonstrating structural change from sustained practice." },
      { q: "What is 'maladaptive plasticity' as described in the passage?", options: ["A) Plasticity that occurs too slowly to be clinically useful in rehabilitation settings.", "B) Plasticity occurring in younger brains that cannot be replicated in adults.", "C) Neural reorganisation that reinforces dysfunction rather than restoring healthy function.", "D) Plasticity induced by pharmacological agents that produces unpredictable side effects."], correct: "C", rationale: "The passage describes maladaptive plasticity as 'the same mechanisms operating in ways that entrench dysfunction rather than restore function,' as in phantom limb pain." },
      { q: "Why does the passage suggest that the discovery of adult neurogenesis remains controversial?", options: ["A) The findings have only been replicated in rodents and cannot be confirmed in primates.", "B) Debates persist about whether human adult neurogenesis is functionally significant.", "C) The methods used to detect new neurons have been shown to be technically flawed.", "D) Funding bodies have refused to support further research in this area."], correct: "B", rationale: "The passage notes 'debates persisting about the extent to which human adult neurogenesis is functionally significant rather than merely a vestigial or quantitatively marginal process.'" },
    ],
    questionsTFNG: [
      { q: "Long-term potentiation refers to the permanent elimination of underused synaptic connections in the adult brain.", correct: "FALSE", rationale: "LTP is described as 'the sustained strengthening of synaptic connections following repeated co-activation' — strengthening, not elimination." },
      { q: "Adult neurogenesis has been most robustly documented in the hippocampal dentate gyrus and the olfactory bulb.", correct: "TRUE", rationale: "The passage states neurogenesis is 'documented most robustly in the hippocampal dentate gyrus and the olfactory bulb.'" },
      { q: "Constraint-induced movement therapy works by resting the impaired limb to allow natural neural recovery.", correct: "FALSE", rationale: "The therapy 'forces the use of impaired limbs' — the opposite of resting them — to produce cortical remapping." },
      { q: "The rate of plastic change in the brain decreases as a person ages.", correct: "TRUE", rationale: "The passage states 'the rate and extent of plastic change decline with age' as one of the limits of adult plasticity." },
    ],
    questionsSentence: [
      { q: "Neuroplasticity refers to the nervous system's capacity to reorganise its __ in response to experience, injury, or environmental demand.", answer: "structural and functional architecture", rationale: "The passage defines neuroplasticity as 'the capacity of the nervous system to reorganise its structural and functional architecture in response to experience, injury, or environmental demand.'" },
      { q: "The translational challenge is not only to show that adult plasticity exists, but to identify the __ under which it can be reliably harnessed.", answer: "conditions", rationale: "The passage states the challenge is 'to characterise the conditions — attentional engagement, sleep quality, emotional state, pharmacological context — under which it can be reliably harnessed.'" },
    ],
    questionsHeadings: [
      { paragraph: "The cellular mechanisms underlying neuroplasticity are diverse and operate across multiple timescales...", options: ["A) The Discovery of Long-Term Potentiation in Animal Models", "B) Molecular and Structural Mechanisms of Neural Reorganisation", "C) Why Adult Neurogenesis Remains a Contested Finding", "D) How Memory Consolidation Differs Between Young and Old Brains"], correct: "B", rationale: "The paragraph covers LTP, structural plasticity, and neurogenesis — multiple mechanisms at different levels — best captured by B." },
      { paragraph: "The practical implications, however, must be tempered by an understanding of the limits...", options: ["A) Why Neuroplasticity Research Has Failed to Improve Clinical Outcomes", "B) Critical Periods and the Absolute Boundaries of Brain Change", "C) The Conditions and Limits of Adult Neuroplasticity", "D) Pharmacological Approaches to Enhancing Neural Recovery"], correct: "C", rationale: "The paragraph outlines both limiting conditions and factors that modulate plasticity — 'limits and conditions' is the central theme, matching C." },
    ],
  },


  {
    id: 'passage_012',
    title: 'The Silk Road: Commerce, Culture, and Contagion Across Eurasia',
    topic: 'History',
    difficulty: 'medium',
    text: `The term 'Silk Road' was coined not by an ancient merchant but by the nineteenth-century German geographer Ferdinand von Richthofen, who used it to describe the overland trade routes connecting China to the Mediterranean world. The name, while evocative, is in several respects misleading. There was never a single road but a shifting network of routes across deserts, mountain passes, and river valleys; silk, though among the most prized commodities exchanged, was accompanied by a vast array of other goods; and the network was not confined to overland passage but encompassed maritime routes linking East Africa, the Arabian Peninsula, the Indian subcontinent, and Southeast Asia to the trading centres of East Asia. Despite these caveats, the concept captures something genuinely important: for roughly fifteen centuries, from around 200 BCE to 1450 CE, Eurasia was traversed by flows of goods, people, ideas, religions, technologies, and diseases that shaped civilisations on both ends and at every point in between.

The commodities exchanged along the Silk Road reflected the comparative advantages and luxury demands of the civilisations involved. From China flowed silk, porcelain, paper, and gunpowder; from Central Asia, horses, which the Han dynasty desperately needed for military purposes; from the Middle East, glassware, gold, and silver; from the Mediterranean, wool textiles, olive oil, and wine. The trade was not conducted by individual merchants crossing the entire route but through a relay system of intermediary traders — Parthian, Sogdian, and later Arab merchants playing particularly prominent roles — who purchased and resold goods at successive entrepôts. The Sogdians, an Iranian-speaking people from the region of modern Uzbekistan, were perhaps the most accomplished long-distance traders of the ancient and early medieval world, establishing merchant colonies from Byzantium to the Tang dynasty capital of Chang'an and leaving behind archives of commercial correspondence that survive in fragmentary form.

The transmission of ideas and religions along the Silk Road was at least as consequential as the movement of goods. Buddhism spread from the Indian subcontinent to Central Asia, China, Korea, and Japan largely through the networks of merchants and pilgrims who followed trade routes; the caves at Dunhuang, at the edge of the Taklamakan desert, contain thousands of manuscripts and murals that bear witness to the cosmopolitan cultural exchanges of the first millennium CE. Islam, following the Arab conquests of the seventh and eighth centuries, spread rapidly across Central Asia, displacing earlier Buddhist and Zoroastrian traditions and reshaping the cultural map of the region. Nestorianism, a branch of Christianity declared heretical by the Council of Ephesus in 431 CE, survived and flourished along the Silk Road, reaching China by the seventh century, where the so-called Nestorian Stele, erected in Chang'an in 781 CE, commemorates the presence of a Christian community at the Tang imperial court.

The Silk Road also served as a conduit for disease. The Antonine Plague that struck the Roman Empire in the second century CE, and the Plague of Justinian that devastated the Byzantine world in the sixth, both appear to have been facilitated by the intensification of long-distance contact. Most consequentially, the Black Death — caused by the bacterium Yersinia pestis — almost certainly travelled westward along the Silk Road from its origins in Central or East Asian reservoir populations, reaching the Black Sea port of Caffa in 1346 and from there spreading into Europe with catastrophic mortality. The same networks that carried silk, ideas, and religious traditions thus also carried pathogens, a reminder that the connectivity that enables cultural flourishing is inseparable from the vulnerability it creates.`,
    questionsMCQ: [
      { q: "Why does the author describe the term 'Silk Road' as misleading?", options: ["A) The routes were primarily maritime rather than overland.", "B) Silk was not actually traded along these routes until the medieval period.", "C) The name implies a single route and a single commodity, whereas the reality was far more complex.", "D) The term was invented to promote German colonial interests in Central Asia."], correct: "C", rationale: "The author notes there was 'never a single road' and silk was accompanied by 'a vast array of other goods' — the name oversimplifies both route and commodity." },
      { q: "What made the Sogdians particularly significant in Silk Road trade?", options: ["A) They controlled the production of silk and set prices across the entire network.", "B) They were accomplished long-distance traders who established colonies from Byzantium to China.", "C) They served as the primary link between maritime and overland Silk Road routes.", "D) They translated Buddhist texts that facilitated the spread of religion along the routes."], correct: "B", rationale: "The passage describes Sogdians as 'perhaps the most accomplished long-distance traders of the ancient and early medieval world, establishing merchant colonies from Byzantium to... Chang'an.'" },
      { q: "How did Buddhism spread from the Indian subcontinent to East Asia?", options: ["A) Through military conquest by Buddhist rulers who imposed the religion on subjugated peoples.", "B) Via official diplomatic missions sent by the Indian Mauryan Empire to neighbouring states.", "C) Largely through merchant and pilgrim networks that followed Silk Road trade routes.", "D) Through the writings of Nestorian monks who translated Buddhist texts into Central Asian languages."], correct: "C", rationale: "The passage states Buddhism spread 'largely through the networks of merchants and pilgrims who followed trade routes.'" },
      { q: "What does the passage suggest about the relationship between trade connectivity and disease?", options: ["A) Trade networks were only responsible for spreading disease after the development of maritime routes.", "B) The connectivity that enables cultural and commercial exchange also facilitates the spread of pathogens.", "C) Disease spread along the Silk Road was exclusively caused by the movement of animals.", "D) The Black Death originated in Mediterranean port cities before spreading eastward."], correct: "B", rationale: "The passage concludes that 'the connectivity that enables cultural flourishing is inseparable from the vulnerability it creates' through disease transmission." },
    ],
    questionsTFNG: [
      { q: "The term 'Silk Road' was first used by an ancient Chinese imperial historian during the Han dynasty.", correct: "FALSE", rationale: "The term was coined by 'the nineteenth-century German geographer Ferdinand von Richthofen,' not an ancient historian." },
      { q: "Goods along the Silk Road were typically carried by a single merchant travelling the full length of the route.", correct: "FALSE", rationale: "The passage describes 'a relay system of intermediary traders' who 'purchased and resold goods at successive entrepôts' — not individual merchants crossing the entire route." },
      { q: "The Nestorian Stele in Chang'an was erected during the Tang dynasty.", correct: "TRUE", rationale: "The passage states the Nestorian Stele was 'erected in Chang'an in 781 CE' and refers to 'the Tang imperial court.'" },
      { q: "The Black Death is believed to have originated in Western Europe before spreading eastward to Central Asia.", correct: "FALSE", rationale: "The passage states the Black Death 'almost certainly travelled westward along the Silk Road from its origins in Central or East Asian reservoir populations.'" },
    ],
    questionsSentence: [
      { q: "The Han dynasty sought horses from Central Asia primarily for __ purposes.", answer: "military", rationale: "The passage states 'from Central Asia, horses, which the Han dynasty desperately needed for military purposes.'" },
      { q: "The caves at Dunhuang contain thousands of manuscripts and murals that document the __ cultural exchanges of the first millennium CE.", answer: "cosmopolitan", rationale: "The passage describes the Dunhuang caves as bearing 'witness to the cosmopolitan cultural exchanges of the first millennium CE.'" },
    ],
    questionsHeadings: [
      { paragraph: "The commodities exchanged along the Silk Road reflected the comparative advantages...", options: ["A) The Role of Arab Merchants in Transforming Silk Road Trade", "B) Goods, Relay Trading, and the Sogdian Commercial Network", "C) How Chinese Silk Dominated Eurasian Trade for Fifteen Centuries", "D) The Economics of Long-Distance Trade in the Ancient World"], correct: "B", rationale: "The paragraph covers traded commodities, the relay trading system, and highlights the Sogdians as dominant traders — all captured in B." },
      { paragraph: "The Silk Road also served as a conduit for disease...", options: ["A) The Medical Knowledge Exchanged Along the Silk Road", "B) How the Roman Empire Used Trade Networks to Spread Disease Prevention", "C) Disease Transmission as an Unintended Consequence of Trade Connectivity", "D) The Origins of the Black Death in Mediterranean Port Cities"], correct: "C", rationale: "The paragraph presents disease spread as an unintended consequence of the same networks enabling trade and culture — directly matching C." },
    ],
  },


  {
    id: 'passage_013',
    title: 'Deep-Sea Bioluminescence: Light in the Permanent Dark',
    topic: 'Science',
    difficulty: 'medium',
    text: `Below approximately 200 metres, sunlight effectively disappears. The mesopelagic and bathypelagic zones of the ocean — spanning depths from 200 to roughly 4,000 metres — exist in a state of perpetual near-darkness, where the only light is biological in origin. Bioluminescence, the production and emission of light by living organisms through biochemical reactions, is not a marginal curiosity of the deep sea but one of its defining ecological features. Estimates suggest that 76% or more of deep-sea organisms are capable of producing light, making bioluminescence the most common form of communication in the largest inhabitable space on Earth. Yet because the deep ocean remains among the least explored environments on the planet, the full ecological significance of this light remains incompletely understood.

The chemistry of bioluminescence is broadly consistent across the remarkable diversity of organisms that employ it. The reaction typically involves a substrate molecule called luciferin being oxidised in a reaction catalysed by an enzyme called luciferase, producing light with very little heat — a phenomenon sometimes described as 'cold light.' Different organisms use chemically distinct luciferins, and the evolutionary origins of bioluminescence appear to be highly polyphyletic: genetic analyses suggest that the capacity for light production has evolved independently at least 40 to 50 times across the tree of life, in organisms ranging from bacteria and dinoflagellates to fish, squid, and jellyfish. This repeated independent evolution suggests that bioluminescence confers significant adaptive advantages in the deep-sea environment.

The functional roles of bioluminescence in the deep sea are diverse and often interacting. Counterillumination is used by many mesopelagic fish and squid: by producing ventral light that matches the faint downwelling sunlight from above, these organisms eliminate their silhouettes and become invisible to predators looking upward — a form of camouflage that works in the dim twilight zone. Bioluminescence is also used offensively, with some predators using light to attract prey into striking range; the anglerfish, whose bioluminescent lure dangles from a modified dorsal spine, is the most familiar example but far from the only one. Communication and mate attraction represent additional functions, particularly among ostracods and certain deep-sea fish species that produce species-specific light patterns. Finally, some organisms deploy bioluminescence defensively, either by startling predators with sudden flashes, by releasing luminescent clouds to confuse attackers, or by 'burglar alarming' — producing light that attracts secondary predators to the organism attacking them.

Research into deep-sea bioluminescence has yielded practical applications that extend well beyond marine biology. The luciferase enzyme system from the North American firefly (Photinus pyralis) has become one of the most widely used reporter systems in molecular biology, allowing researchers to track gene expression, monitor cellular processes, and image tumour growth in living animals by coupling luciferase genes to the genes under investigation. The green fluorescent protein (GFP) originally isolated from the jellyfish Aequorea victoria — technically a fluorescent rather than bioluminescent protein — has similarly transformed cell biology, earning its discoverers the 2008 Nobel Prize in Chemistry. These examples illustrate a broader principle: the organisms of the deep ocean, living under extreme conditions and having evolved solutions to problems of communication, camouflage, and predation over millions of years, represent an extraordinary reservoir of biochemical innovation with potential applications that remain largely untapped.`,
    questionsMCQ: [
      { q: "What does the passage suggest about the evolutionary origin of bioluminescence?", options: ["A) It evolved once in a common ancestor of all marine organisms and was inherited by descendants.", "B) It evolved independently many times across unrelated groups of organisms.", "C) It was first developed by bacteria and then transferred horizontally to other organisms.", "D) It evolved primarily in freshwater species before spreading to marine environments."], correct: "B", rationale: "Genetic analyses suggest bioluminescence 'has evolved independently at least 40 to 50 times across the tree of life' — a polyphyletic origin." },
      { q: "How does counterillumination function as a survival strategy?", options: ["A) Organisms produce bright flashes to blind predators approaching from above.", "B) Organisms generate ventral light matching ambient downwelling light to eliminate their silhouette.", "C) Organisms reflect light from the surface to confuse predators in the mesopelagic zone.", "D) Organisms use light to signal danger to members of the same species."], correct: "B", rationale: "The passage explains counterillumination as 'producing ventral light that matches the faint downwelling sunlight from above,' eliminating silhouettes from predators below." },
      { q: "What is 'burglar alarming' in the context of deep-sea bioluminescence?", options: ["A) Producing light to warn members of the same species of approaching predators.", "B) Using sudden flashes to temporarily blind an attacking predator.", "C) Emitting light that attracts a second predator to attack the organism currently threatening you.", "D) Releasing a luminescent cloud that obscures the organism's location from a predator."], correct: "C", rationale: "The passage defines burglar alarming as 'producing light that attracts secondary predators to the organism attacking them.'" },
      { q: "Why is the firefly luciferase system valuable in molecular biology?", options: ["A) It can repair damaged DNA in cells exposed to deep-sea pressure conditions.", "B) It allows scientists to track gene expression and visualise biological processes in living organisms.", "C) It produces light bright enough to illuminate specimens without artificial lighting.", "D) It can be used to measure the age of biological samples through light decay analysis."], correct: "B", rationale: "The passage states the luciferase system allows researchers 'to track gene expression, monitor cellular processes, and image tumour growth in living animals.'" },
    ],
    questionsTFNG: [
      { q: "More than three quarters of deep-sea organisms are estimated to be capable of producing light.", correct: "TRUE", rationale: "The passage states 'estimates suggest that 76% or more of deep-sea organisms are capable of producing light.'" },
      { q: "The bioluminescent reaction typically generates substantial heat as a by-product.", correct: "FALSE", rationale: "The reaction produces 'light with very little heat,' described as 'cold light' — the opposite of substantial heat." },
      { q: "Green fluorescent protein is produced naturally by the anglerfish to attract prey.", correct: "FALSE", rationale: "GFP was 'originally isolated from the jellyfish Aequorea victoria,' not the anglerfish." },
      { q: "The discoverers of green fluorescent protein were awarded the Nobel Prize in Chemistry.", correct: "TRUE", rationale: "The passage states GFP earned 'its discoverers the 2008 Nobel Prize in Chemistry.'" },
    ],
    questionsSentence: [
      { q: "The bioluminescent reaction involves a substrate called luciferin being oxidised by an enzyme called __, producing cold light.", answer: "luciferase", rationale: "The passage states the reaction involves 'luciferin being oxidised in a reaction catalysed by an enzyme called luciferase.'" },
      { q: "Deep-sea organisms represent a reservoir of __ innovation with largely untapped potential applications.", answer: "biochemical", rationale: "The passage describes them as 'an extraordinary reservoir of biochemical innovation with potential applications that remain largely untapped.'" },
    ],
    questionsHeadings: [
      { paragraph: "The functional roles of bioluminescence in the deep sea are diverse and often interacting...", options: ["A) How the Anglerfish Uses Light to Dominate Deep-Sea Food Chains", "B) Four Distinct Survival Functions of Deep-Sea Bioluminescence", "C) Communication and Mating Behaviour in Bioluminescent Species", "D) Why Bioluminescence Evolved Differently in Fish and Invertebrates"], correct: "B", rationale: "The paragraph presents four functions — camouflage, predation, communication, and defence — making B the most comprehensive and accurate heading." },
      { paragraph: "Research into deep-sea bioluminescence has yielded practical applications...", options: ["A) Why Marine Biology Is More Important Than Terrestrial Biology", "B) The Nobel Prize and Its Role in Promoting Ocean Research", "C) Biochemical Innovations from Deep-Sea Organisms and Their Scientific Applications", "D) How Firefly Genes Are Used to Treat Cancer in Clinical Settings"], correct: "C", rationale: "The paragraph discusses luciferase and GFP as practical scientific tools derived from deep-sea research — matching C." },
    ],
  },


  {
    id: 'passage_014',
    title: 'Urbanisation and Mental Health: The City as Psychological Environment',
    topic: 'Sociology',
    difficulty: 'hard',
    text: `The city has been both celebrated and condemned as a peculiarly modern form of human habitat. From the optimistic urbanism of the nineteenth-century reformers who saw dense settlement as the engine of civilisational progress, to the anxious sociology of Georg Simmel, who in 1903 described the metropolitan individual as armoured against overstimulation by a protective 'blasé attitude,' urban life has been understood as psychologically distinctive — demanding, liberating, and potentially pathogenic in ways that rural and small-town environments are not. Today, with more than half the world's population living in cities and urbanisation projected to intensify across Africa and Asia over coming decades, the relationship between urban environments and mental health has acquired a public health urgency that has generated a substantial and rapidly growing body of empirical research.

The epidemiological evidence linking urban residence to elevated rates of certain psychiatric conditions is robust, if complex in its interpretation. Rates of schizophrenia and other psychotic disorders are consistently higher among individuals raised in cities than in rural areas, with a dose-response relationship — higher rates in larger and denser cities — suggesting a genuine environmental effect rather than diagnostic artefact or rural-to-urban migration of vulnerable individuals. Depression and anxiety disorders also show urban excess in many but not all studies, with the pattern modulated by factors including socioeconomic status, neighbourhood quality, and the availability of green space. Suicide rates present a more mixed picture: historically higher in rural areas in many countries, they have shifted toward urban populations in some national contexts, a pattern thought to reflect changing distributions of social isolation and access to lethal means.

Several candidate mechanisms have been proposed to explain the urban mental health deficit. Social fragmentation — the weakening of community ties and the erosion of stable social networks characteristic of high-density, high-mobility urban environments — is associated with reduced social support, increased loneliness, and diminished collective efficacy. Chronic noise and air pollution impose physiological stress loads that activate the hypothalamic-pituitary-adrenal (HPA) axis, generating sustained cortisol elevation with downstream effects on neurological function and mood regulation. The perception of threat and social evaluative concern may be heightened in densely populated environments where anonymity coexists with surveillance, a combination that neuroimaging studies have associated with hyperactivation of the amygdala — the structure most centrally implicated in fear and anxiety processing.

Counterintuitively, access to the social, cultural, and economic resources concentrated in cities may buffer against some of these risks for those well-positioned to exploit them. Higher incomes, more robust mental health services, and greater social tolerance of diversity — including sexual and gender diversity — mean that urban environments are, for some populations, considerably more protective of wellbeing than rural alternatives. The mental health consequences of urbanisation are therefore deeply unequal: concentrated in the poorest and most socially isolated urban residents, living in the most polluted, noisiest, and most resource-deprived neighbourhoods, while better-resourced urban dwellers may enjoy mental health benefits unavailable to their rural counterparts. Addressing the urban mental health burden thus requires attention not merely to urban form but to the distributional justice of urban life.`,
    questionsMCQ: [
      { q: "What does a 'dose-response relationship' between city size and schizophrenia rates suggest?", options: ["A) Schizophrenia medication is more effective when administered in larger doses in urban settings.", "B) Larger and denser cities are associated with higher rates, implying a genuine environmental effect.", "C) The relationship between city size and mental illness is too weak to be statistically meaningful.", "D) Urban density increases exposure to pathogens that cause psychotic disorders."], correct: "B", rationale: "The passage states 'a dose-response relationship — higher rates in larger and denser cities — suggesting a genuine environmental effect rather than diagnostic artefact.'" },
      { q: "According to the passage, how does chronic noise and air pollution affect mental health?", options: ["A) They directly damage neuronal tissue in the prefrontal cortex.", "B) They activate stress hormone systems that chronically elevate cortisol, affecting mood and neurological function.", "C) They reduce access to green space, which is the primary protective factor against urban depression.", "D) They interfere with sleep architecture, causing the same neurological changes as chronic sleep deprivation."], correct: "B", rationale: "Pollution and noise 'activate the hypothalamic-pituitary-adrenal (HPA) axis, generating sustained cortisol elevation with downstream effects on neurological function and mood regulation.'" },
      { q: "What does the passage identify as a paradox of urban mental health outcomes?", options: ["A) Cities with the highest rates of depression also have the most mental health services.", "B) Urban environments can be simultaneously harmful and protective depending on a resident's resources and position.", "C) Rural populations have higher anxiety rates despite lower exposure to urban stressors.", "D) Wealthier urban residents are more likely to develop schizophrenia than poorer ones."], correct: "B", rationale: "The passage presents the counterintuitive finding that cities can be protective for well-resourced residents while being harmful for the poorest — a paradox of unequal outcomes." },
      { q: "What does Simmel's concept of the 'blasé attitude' refer to?", options: ["A) The tendency of urban dwellers to engage more superficially in cultural activities.", "B) A psychological defence mechanism developed to cope with the overstimulation of city life.", "C) The indifference of urban elites to the suffering of poorer city residents.", "D) A clinical condition caused by chronic exposure to urban noise and crowding."], correct: "B", rationale: "Simmel described the metropolitan individual as 'armoured against overstimulation by a protective blasé attitude' — a psychological shield against excessive stimulation." },
    ],
    questionsTFNG: [
      { q: "Suicide rates are consistently higher in urban areas than in rural areas across all countries studied.", correct: "FALSE", rationale: "The passage describes suicide rates as presenting 'a more mixed picture,' historically higher in rural areas in many countries." },
      { q: "Neuroimaging studies have linked dense urban environments to heightened amygdala activity associated with fear and anxiety.", correct: "TRUE", rationale: "The passage states density and surveillance are associated with 'hyperactivation of the amygdala — the structure most centrally implicated in fear and anxiety processing.'" },
      { q: "Greater social tolerance of diversity in cities has been identified as a potential mental health benefit for some urban populations.", correct: "TRUE", rationale: "The passage lists 'greater social tolerance of diversity — including sexual and gender diversity' as a factor making urban environments 'more protective of wellbeing' for some populations." },
      { q: "The passage argues that urban planning alone is sufficient to address the mental health burden of cities.", correct: "FALSE", rationale: "The passage concludes that addressing the burden 'requires attention not merely to urban form but to the distributional justice of urban life.'" },
    ],
    questionsSentence: [
      { q: "Social fragmentation in cities is associated with reduced social support, increased loneliness, and diminished __.", answer: "collective efficacy", rationale: "The passage states social fragmentation is 'associated with reduced social support, increased loneliness, and diminished collective efficacy.'" },
      { q: "The mental health consequences of urbanisation are most concentrated among the poorest residents living in the most __, noisiest, and most resource-deprived neighbourhoods.", answer: "polluted", rationale: "The passage states the burden is concentrated in 'the most polluted, noisiest, and most resource-deprived neighbourhoods.'" },
    ],
    questionsHeadings: [
      { paragraph: "Several candidate mechanisms have been proposed to explain the urban mental health deficit...", options: ["A) Why Air Pollution Is the Leading Cause of Urban Depression", "B) Three Biological and Social Pathways Linking Urban Life to Poor Mental Health", "C) The Role of the Amygdala in Urban Anxiety Disorders", "D) How Social Isolation Affects Cortisol Levels in City Dwellers"], correct: "B", rationale: "The paragraph presents three mechanisms — social fragmentation, pollution/noise, and threat perception — making B the most accurate heading." },
      { paragraph: "Counterintuitively, access to the social, cultural, and economic resources concentrated in cities...", options: ["A) Why Wealthy Urban Residents Never Experience Mental Health Problems", "B) The Case for Universal Urban Mental Health Services", "C) Urban Resources as a Buffer: The Unequal Distribution of Mental Health Benefits", "D) How Rural Populations Can Access Urban Mental Health Advantages"], correct: "C", rationale: "The paragraph argues that urban resources can buffer some residents but notes this is deeply unequal — the core theme matching C." },
    ],
  },


  {
    id: 'passage_015',
    title: 'The Great Fire of London: Disaster, Rebuilding, and Urban Transformation',
    topic: 'History',
    difficulty: 'easy',
    text: `In the early hours of Sunday, 2 September 1666, a fire broke out in a bakery on Pudding Lane in the City of London. What began as a small domestic fire quickly spread through the densely packed wooden buildings of the medieval city, driven by a strong easterly wind and accelerated by the dry conditions following an unusually hot summer. By the time the fire was finally brought under control four days later, it had consumed an estimated 13,200 houses, 87 parish churches — including the old St Paul's Cathedral — and most of the buildings of the City authorities. Roughly 70,000 of London's 80,000 inhabitants were left homeless, though recorded deaths were surprisingly few, with contemporary accounts suggesting no more than a handful of confirmed fatalities.

The fire exposed the profound vulnerability of the old city. London's buildings were predominantly timber-framed and densely clustered, with upper storeys projecting over narrow streets that allowed fire to jump easily from one side to another. Water supply was unreliable and fire-fighting equipment primitive; the fire engines of the period were little more than hand-operated pumps incapable of projecting water to upper storeys. Attempts to create firebreaks by demolishing buildings in the fire's path were hampered by the reluctance of property owners to destroy their homes and by the speed of the fire's advance. The Lord Mayor, Sir Thomas Bloodworth, initially dismissed the fire as insignificant — a misjudgement that cost precious hours in the early stages when it might have been contained.

In the aftermath of the fire, several architects and city planners — most notably Christopher Wren, John Evelyn, and Robert Hooke — submitted ambitious plans for rebuilding London on a rational grid, with wide stone-paved streets, public spaces, and a logical arrangement of trades and functions. These plans, while admired, were ultimately set aside in favour of a more pragmatic approach: rebuilding largely on the existing street pattern, which reflected established property rights that were too complex and contested to unravel swiftly. What did change fundamentally was the material of construction. The Rebuilding Act of 1667 mandated that all new buildings be constructed in brick or stone rather than timber, established minimum street widths, and specified the height of buildings according to the importance of the street on which they stood. These regulations laid the foundation for a city that was both more fire-resistant and more architecturally coherent.

Christopher Wren's most enduring contribution to the rebuilt city was the new St Paul's Cathedral, completed in 1710 after 35 years of construction, whose dome became one of the defining landmarks of the London skyline for three centuries. Wren also designed 51 of the 52 churches rebuilt in the City, creating a remarkably unified architectural legacy within a relatively small area. Beyond its immediate physical consequences, the Great Fire prompted the development of fire insurance — the first fire insurance company, the Fire Office, was established in 1681 — and contributed to gradual improvements in fire-fighting organisation that would eventually give rise to professional fire brigades. The disaster, for all its destruction, thus acted as a catalyst for urban reforms that shaped London's character for generations.`,
    questionsMCQ: [
      { q: "What factors contributed to the rapid spread of the Great Fire of London?", options: ["A) Deliberate arson by rival merchants combined with a failure of the city watch.", "B) Dense timber buildings, a strong dry wind, and inadequate fire-fighting capacity.", "C) The absence of the king and his court, who had retreated from the city during a plague outbreak.", "D) The deliberate demolition of firebreaks by property owners hoping to claim insurance."], correct: "B", rationale: "The passage cites 'densely packed wooden buildings,' 'a strong easterly wind,' dry conditions, and primitive fire-fighting equipment as the key contributing factors." },
      { q: "Why were the ambitious rebuilding plans of Wren, Evelyn, and Hooke not implemented?", options: ["A) The plans were too expensive for the city's depleted post-fire treasury.", "B) King Charles II rejected the plans in favour of preserving London's medieval character.", "C) Established property rights on the existing street pattern were too complex to overturn quickly.", "D) The architects disagreed among themselves and could not produce a unified proposal."], correct: "C", rationale: "The plans 'were ultimately set aside... rebuilding largely on the existing street pattern, which reflected established property rights that were too complex and contested to unravel swiftly.'" },
      { q: "What was the most significant building regulation introduced by the Rebuilding Act of 1667?", options: ["A) A requirement for all buildings to include a built-in water supply for firefighting.", "B) A ban on the construction of buildings more than two storeys high in residential areas.", "C) A mandate that all new buildings be constructed in brick or stone rather than timber.", "D) A requirement for all property owners to contribute to a central fire insurance fund."], correct: "C", rationale: "The Rebuilding Act 'mandated that all new buildings be constructed in brick or stone rather than timber' — the most fundamental change to building practice." },
      { q: "What lasting institutions or practices emerged as a consequence of the Great Fire?", options: ["A) A national system of municipal water supply and modern plumbing.", "B) Fire insurance and gradual improvements in fire-fighting organisation.", "C) The first professional police force and a permanent city fire watch.", "D) A national building code applied uniformly across all English cities."], correct: "B", rationale: "The fire 'prompted the development of fire insurance' and 'contributed to gradual improvements in fire-fighting organisation that would eventually give rise to professional fire brigades.'" },
    ],
    questionsTFNG: [
      { q: "The Great Fire of London resulted in a very large number of confirmed deaths relative to the scale of destruction.", correct: "FALSE", rationale: "The passage notes recorded deaths were 'surprisingly few, with contemporary accounts suggesting no more than a handful of confirmed fatalities.'" },
      { q: "The Lord Mayor's initial response to the fire has been criticised for causing a significant delay in containment efforts.", correct: "TRUE", rationale: "The passage states Bloodworth's dismissal of the fire 'cost precious hours in the early stages when it might have been contained.'" },
      { q: "Christopher Wren personally supervised the construction of all 52 churches rebuilt in the City of London after the fire.", correct: "FALSE", rationale: "The passage states Wren 'designed 51 of the 52 churches rebuilt in the City' — he designed them, and only 51, not all 52." },
      { q: "The new St Paul's Cathedral took more than three decades to complete after the Great Fire.", correct: "TRUE", rationale: "The passage states it was 'completed in 1710 after 35 years of construction' — more than three decades." },
    ],
    questionsSentence: [
      { q: "The first fire insurance company, called the Fire Office, was established in __.", answer: "1681", rationale: "The passage explicitly states 'the first fire insurance company, the Fire Office, was established in 1681.'" },
      { q: "Attempts to create firebreaks were hampered by the reluctance of property owners and by the __ of the fire's advance.", answer: "speed", rationale: "The passage states firebreak attempts were 'hampered by the reluctance of property owners to destroy their homes and by the speed of the fire's advance.'" },
    ],
    questionsHeadings: [
      { paragraph: "In the aftermath of the fire, several architects and city planners — most notably Christopher Wren...", options: ["A) Why London Was Rebuilt Exactly as It Was Before the Fire", "B) Ambitious Plans, Practical Compromises, and New Building Standards", "C) Christopher Wren's Vision for a Modern European Capital", "D) How Property Owners Shaped the Post-Fire Rebuilding Effort"], correct: "B", rationale: "The paragraph covers grand plans that were not adopted, the pragmatic rebuilding approach taken, and the new material regulations — all in B." },
      { paragraph: "Christopher Wren's most enduring contribution to the rebuilt city was the new St Paul's Cathedral...", options: ["A) The Architectural Legacy of St Paul's Cathedral in European History", "B) How the Great Fire Led to Long-Term Urban and Institutional Reforms", "C) The Role of Christopher Wren in Establishing the London Fire Brigade", "D) Why the Great Fire Was Ultimately Beneficial for London's Economy"], correct: "B", rationale: "The paragraph covers Wren's legacy, fire insurance, and fire-fighting improvements — all long-term reforms catalysed by the fire, matching B." },
    ],
  }

); // end IELTS_READING_PASSAGES.push (batch 3)


// ══════════════════════════════════════════════════════════════════════
//  PASSAGES — Batch 4 (passages 31–33)
// ══════════════════════════════════════════════════════════════════════
IELTS_READING_PASSAGES.push(

  {
    id: 'passage_031',
    title: 'Antimicrobial Resistance',
    topic: 'Science',
    difficulty: 'hard',
    text: `Antimicrobial resistance (AMR) occurs when bacteria, viruses, fungi, and parasites evolve mechanisms that render drugs such as antibiotics, antivirals, and antifungals less effective or completely ineffective. Once a microbe becomes resistant, infections that were previously treatable can become extremely difficult, if not impossible, to manage, leading to longer hospital stays, higher mortality, and increased healthcare costs.

Resistance arises through natural selection: when antimicrobial agents are used, susceptible microbes die, while resistant variants survive and reproduce. Overuse and misuse of antibiotics in human medicine, agriculture, and aquaculture accelerate this process. In some regions, antibiotics are available over the counter and are taken for viral infections, against which they have no effect, further promoting the spread of resistant strains.

Global health agencies warn that without coordinated action, AMR could return medicine to a pre-antibiotic era. Routine surgeries, chemotherapy, and organ transplants would become far riskier because even minor infections could turn deadly. The economic burden is also projected to rise dramatically, with some estimates suggesting global costs exceeding trillions of dollars by 2050.

Solutions proposed by experts include stricter prescription guidelines, improved infection-control practices, and increased investment in new antimicrobial drugs and alternative therapies. Public-health campaigns aim to reduce unnecessary antibiotic use and educate patients and clinicians about the risks of self-medication. However, implementing these measures requires international cooperation and sustained political commitment.`,
    questionsMCQ: [
      { q: "What is antimicrobial resistance (AMR)?", options: ["A) A disease that directly affects humans.", "B) A condition in which drugs become stronger over time.", "C) The loss of effectiveness of drugs against microbes.", "D) A side effect of all vaccines."], correct: "C", rationale: "The first paragraph defines AMR as microbes evolving mechanisms that make drugs less effective." },
      { q: "How does the passage describe the role of overuse and misuse of antibiotics?", options: ["A) It has no effect on resistance.", "B) It slows down the evolution of resistant microbes.", "C) It accelerates the development of resistant strains.", "D) It prevents all infections."], correct: "C", rationale: "The second paragraph explicitly states that overuse and misuse accelerate the emergence of resistant variants." },
      { q: "What risk does the passage associate with uncontrolled AMR?", options: ["A) The complete disappearance of all microbes.", "B) A return to a pre-antibiotic era with higher surgical and treatment risks.", "C) The immediate cure of all chronic diseases.", "D) The end of global travel."], correct: "B", rationale: "The third paragraph warns that AMR could bring medicine back to a pre-antibiotic situation, making many treatments riskier." },
      { q: "What do experts suggest to combat AMR?", options: ["A) Removing all antibiotics from hospitals.", "B) Stricter prescription rules, better infection control, and new drug research.", "C) Using antibiotics for every minor illness.", "D) Stopping all public-health education."], correct: "B", rationale: "The final paragraph lists stricter guidelines, infection-control improvement, and new-drug research as key solutions." },
    ],
    questionsTFNG: [
      { q: "The passage implies that antimicrobial resistance can make treatable infections more dangerous.", correct: "TRUE", rationale: "The first paragraph notes that previously treatable infections can become extremely difficult or impossible to manage." },
      { q: "The passage states that antimicrobial drugs are always effective against viral infections.", correct: "FALSE", rationale: "The text says antibiotics are sometimes used for viral infections, against which they have no effect." },
      { q: "Antimicrobial resistance arises only through human error and not through natural selection.", correct: "FALSE", rationale: "The second paragraph explicitly links resistance to natural selection among microbes." },
      { q: "The passage claims that global health agencies are unconcerned about antimicrobial resistance.", correct: "FALSE", rationale: "The third paragraph states that global health agencies warn about the dangers of uncontrolled AMR." },
    ],
    questionsSentence: [
      { q: "The passage suggests that routine medical procedures become riskier under widespread AMR because __.", answer: "even minor infections could turn deadly", rationale: "The third paragraph says that minor infections could become life-threatening without effective antimicrobials." },
      { q: "Public-health campaigns aim to reduce __ to slow the spread of resistant microbes.", answer: "unnecessary antibiotic use", rationale: "The last paragraph notes that campaigns try to cut down unnecessary antibiotic use and self-medication." },
    ],
    questionsHeadings: [
      { paragraph: "Antimicrobial resistance (AMR) occurs when bacteria, viruses, fungi, and parasites evolve mechanisms...", options: ["A) The history of vaccines", "B) What is antimicrobial resistance?", "C) The economics of healthcare", "D) How viruses spread globally"], correct: "B", rationale: "This paragraph introduces and defines AMR, making B the most accurate heading." },
      { paragraph: "Solutions proposed by experts include stricter prescription guidelines...", options: ["A) Why antibiotics should be banned", "B) The failure of international health policy", "C) Expert-recommended strategies to address AMR", "D) The role of agriculture in spreading disease"], correct: "C", rationale: "This paragraph outlines expert-proposed solutions to AMR, directly matching C." },
    ],
  },

  {
    id: 'passage_032',
    title: 'Philosophy of Memory',
    topic: 'Philosophy',
    difficulty: 'hard',
    text: `Memory is often treated as a simple repository of past experiences, but philosophers have long questioned this view. Some argue that memory is not merely a record but a reconstructive process in which the mind actively shapes and even distorts what is recalled. Each retrieval of a memory can subtly alter its content, which means that remembering is not a neutral replay of the past.

From this perspective, autobiographical memory — the memory of one's own life — is particularly unstable. Studies show that people's recollections of childhood events can change over time, influenced by later narratives, cultural expectations, and interpersonal feedback. In some cases, false memories can be implanted through suggestion, blurring the line between authentic experience and imagination.

The implications extend beyond psychology into ethics and law. Eyewitness testimony, once regarded as highly reliable, is now understood to be susceptible to distortion and suggestion. Courts in many jurisdictions have begun to treat memory as fallible and context-dependent, requiring additional corroborating evidence before accepting testimony as conclusive.

Finally, memory plays a central role in personal identity. Philosophers such as John Locke argued that a person's identity is tied to continuity of memory rather than to a stable, unchanging self. If memory is reconstructive and malleable, then personal identity itself may be less fixed than commonly assumed. This view challenges the notion of a coherent, continuous 'I' and invites a more fluid understanding of who we are.`,
    questionsMCQ: [
      { q: "What is the main point about memory in the first paragraph?", options: ["A) Memory is an exact replay of past events.", "B) Memory is a passive storage system.", "C) Memory is a reconstructive and potentially distorting process.", "D) Memory is entirely independent of the mind."], correct: "C", rationale: "The first paragraph stresses that memory is reconstructive and that each retrieval can alter the content." },
      { q: "What does the passage suggest about autobiographical memory?", options: ["A) It is the most stable type of memory.", "B) It is completely immune to cultural influence.", "C) It can change over time due to narratives and feedback.", "D) It is always identical to original experience."], correct: "C", rationale: "The second paragraph notes that autobiographical memories can shift due to later narratives, culture, and interpersonal feedback." },
      { q: "How has the legal system's view of memory changed, according to the passage?", options: ["A) Memory is now seen as infallible.", "B) Eyewitness testimony is treated as definitively reliable.", "C) Memory is regarded as fallible and context-dependent.", "D) Memory is no longer used in courts."], correct: "C", rationale: "The third paragraph states that courts increasingly treat memory as fallible and context-dependent." },
      { q: "What does Locke's view imply about personal identity?", options: ["A) Identity is fixed from birth and cannot change.", "B) Identity is based on physical continuity alone.", "C) Identity is connected to continuity of memory.", "D) Identity is unrelated to the past."], correct: "C", rationale: "The last paragraph says Locke linked personal identity to continuity of memory rather than a fixed self." },
    ],
    questionsTFNG: [
      { q: "The passage suggests that every act of remembering can slightly change the memory.", correct: "TRUE", rationale: "The first paragraph states that each retrieval can subtly alter the content of a memory." },
      { q: "Autobiographical memories are completely immune to later narratives.", correct: "FALSE", rationale: "The text explicitly says they are influenced by later narratives, culture, and feedback." },
      { q: "The passage claims that eyewitness testimony is always more reliable than physical evidence.", correct: "FALSE", rationale: "The third paragraph treats memory as fallible and pushes courts to require additional evidence." },
      { q: "The passage states that memory plays a role in shaping personal identity.", correct: "TRUE", rationale: "The last paragraph links memory continuity to the idea of personal identity." },
    ],
    questionsSentence: [
      { q: "The author argues that memory is __ rather than a neutral replay of the past.", answer: "a reconstructive and potentially distorting process", rationale: "The first paragraph contrasts memory with a neutral replay and emphasises its reconstructive nature." },
      { q: "According to the passage, if memory is malleable, then personal identity may be __.", answer: "less fixed than commonly assumed", rationale: "The last paragraph suggests that malleable memory implies a more fluid, less fixed identity." },
    ],
    questionsHeadings: [
      { paragraph: "Memory is often treated as a simple repository of past experiences, but philosophers have long questioned this view.", options: ["A) The science of brain cells", "B) Is memory just a record?", "C) The history of legal trials", "D) The biology of neurons"], correct: "B", rationale: "This paragraph introduces the idea that memory is more than a simple record, so B fits best." },
      { paragraph: "Finally, memory plays a central role in personal identity.", options: ["A) The future of memory research", "B) Memory and personal identity", "C) False memories in therapy", "D) The geography of the brain"], correct: "B", rationale: "This paragraph focuses on how memory relates to personal identity, so B is the best heading." },
    ],
  },

  {
    id: 'passage_033',
    title: 'Deep Time and Human Scale',
    topic: 'Science',
    difficulty: 'hard',
    text: `The concept of 'deep time' refers to the geological timescale over which Earth has changed, spanning billions of years. Unlike the human timescale of days, years, or even centuries, deep time operates on orders of magnitude that are difficult for the mind to grasp. Geologists reconstruct past climates, mountain-building events, and mass extinctions by interpreting rock layers, isotopic signatures, and fossil sequences.

One consequence of deep-time thinking is that many processes appear almost imperceptible in a human lifetime. For example, continents drift at a rate comparable to the growth of a fingernail, yet over millions of years these movements can open entire oceans or close them entirely. Similarly, sea levels rise and fall over tens of thousands of years due to glacial cycles, even though a single lifetime may register only subtle coastal changes.

Human activities, however, have begun to compress certain geological processes into historical timescales. Climate models indicate that the current rate of atmospheric carbon-dioxide increase is faster than any natural event in the past 66 million years. Ocean acidification, glacier retreat, and species migrations are now occurring on decades-long rather than millennial timescales, blending the realms of deep time and human experience.

Some scholars argue that appreciating deep time can foster a sense of humility and long-term responsibility. If one imagines the Earth's history as a single calendar year, humans appear only in the last few minutes, yet their impact rivals that of asteroid impacts or volcanic super-eruptions. This perspective challenges short-term political and economic thinking, calling for planetary-scale stewardship rather than purely local planning.`,
    questionsMCQ: [
      { q: "What is 'deep time' mainly used to describe?", options: ["A) The length of human history.", "B) The timescale of everyday human activities.", "C) The geological timescale of Earth's history.", "D) The duration of a single human life."], correct: "C", rationale: "The first paragraph defines deep time as the geological timescale spanning billions of years." },
      { q: "What does the passage suggest about continental drift?", options: ["A) It is too slow to ever be observed.", "B) It occurs at a rate similar to fingernail growth but can reshape oceans over millions of years.", "C) It is mainly driven by human infrastructure.", "D) It stopped occurring several centuries ago."], correct: "B", rationale: "The second paragraph compares continental drift to fingernail growth and notes its large-scale effects over millions of years." },
      { q: "How does the passage describe the current rate of atmospheric carbon-dioxide increase?", options: ["A) Slower than any natural event of the past.", "B) Comparable to rates seen in the last Ice Age.", "C) Faster than any natural event in the past 66 million years.", "D) Impossible to measure with current technology."], correct: "C", rationale: "The third paragraph states that the present CO2-rise rate exceeds any natural event in the last 66 million years." },
      { q: "What is one proposed psychological effect of understanding deep time?", options: ["A) Greater focus on short-term profit.", "B) Increased anxiety about the future.", "C) A sense of humility and long-term responsibility.", "D) A belief that humans are insignificant and powerless."], correct: "C", rationale: "The last paragraph argues that deep-time thinking can foster humility and long-term responsibility toward the planet." },
    ],
    questionsTFNG: [
      { q: "The passage claims that deep time is easy for most people to imagine intuitively.", correct: "FALSE", rationale: "The first paragraph explicitly says that deep time is difficult for the mind to grasp." },
      { q: "According to the passage, sea-level changes over tens of thousands of years are linked to glacial cycles.", correct: "TRUE", rationale: "The second paragraph notes that sea-level fluctuations over tens of thousands of years are driven by glacial cycles." },
      { q: "The passage states that human influence on climate operates only on millennial timescales.", correct: "FALSE", rationale: "The text says human-driven changes now occur on decades-long rather than millennial timescales." },
      { q: "If Earth's history were compressed into a calendar year, humans appear at the very end.", correct: "TRUE", rationale: "The passage states that in this timescale humans appear only in the last few minutes." },
    ],
    questionsSentence: [
      { q: "The author suggests that deep-time thinking can challenge short-term political thinking by __.", answer: "encouraging planetary-scale stewardship", rationale: "The last paragraph links deep-time awareness to a call for planetary-scale stewardship instead of local, short-term planning." },
      { q: "The passage implies that present-day climate changes are occurring on __ rather than millennial timescales.", answer: "decades-long", rationale: "The third paragraph states that certain changes are now happening on decades-long rather than millennial timescales." },
    ],
    questionsHeadings: [
      { paragraph: "The concept of 'deep time' refers to the geological timescale over which Earth has changed, spanning billions of years.", options: ["A) The limits of human memory", "B) Defining deep time", "C) The history of geology", "D) The speed of earthquakes"], correct: "B", rationale: "This paragraph introduces and defines the concept of deep time, so B best fits." },
      { paragraph: "Some scholars argue that appreciating deep time can foster a sense of humility and long-term responsibility.", options: ["A) The dangers of geological study", "B) Deep time and human responsibility", "C) The measurement of fingernail growth", "D) The chemistry of atmospheric gases"], correct: "B", rationale: "This paragraph focuses on how deep-time awareness shapes attitudes toward long-term responsibility, so B is the best heading." },
    ],
  }

); // end IELTS_READING_PASSAGES.push (batch 4)


// ══════════════════════════════════════════════════════════════════════
//  PASSAGES — Batch 5 (passages 34–35)
// ══════════════════════════════════════════════════════════════════════
IELTS_READING_PASSAGES.push(

  {
    id: 'passage_034',
    title: 'Digital Attention and Cognition',
    topic: 'Psychology',
    difficulty: 'hard',
    text: `Contemporary discussions of 'digital attention' often centre on how constant connectivity alters the way people process information. Neuroscientists have observed that frequent switching between digital tasks — such as checking messages, browsing social media, and working on documents — can fragment attention and reduce the capacity for sustained focus. This pattern contrasts with the deep-reading and prolonged concentration once associated with book-based learning.

Cognitive scientists use the term 'attentional residue' to describe the lingering mental load of unfinished tasks. When readers frequently interrupt themselves to respond to notifications, residual cognitive load prevents them from fully engaging with complex material. Experimental studies show that even the mere presence of a smartphone on the desk can reduce working-memory performance and comprehension scores.

Some psychologists argue that these changes are not inherently negative. The modern digital environment demands rapid information-sifting and multitasking, skills that may be advantageous in dynamic work settings. However, critics warn that the trade-off may be a decline in deep-level processing, such as critical analysis and creative synthesis, which require uninterrupted time.

Long-term, the implications for education and professional life are still being debated. Certain educators advocate for 'attention hygiene': structured digital-free intervals, minimalist interface design, and explicit training in focus strategies. Others caution that regulations or overly restrictive policies may ignore the benefits of digital connectivity and personalised learning platforms.

In this context, the question is not simply whether digital tools are harmful, but how they are configured and used. Design choices — such as notification frequency, interface clutter, and default screen orientation — can significantly shape users' attention patterns, often without their conscious awareness.`,
    questionsMCQ: [
      { q: "What does the passage mainly discuss?", options: ["A) The history of smartphones.", "B) How digital environments affect attention and cognition.", "C) The advantages of social media for education.", "D) A comparison of all types of memory."], correct: "B", rationale: "The passage focuses on how digital tools and constant connectivity alter attention and deeper cognitive processes." },
      { q: "What is meant by 'attentional residue' in the passage?", options: ["A) The physical residue left by screens on the eyes.", "B) The mental load of unfinished tasks that lingers.", "C) The improvement of memory through repetition.", "D) The permanent re-wiring of the brain after digital use."], correct: "B", rationale: "The text defines attentional residue as the lingering mental load of tasks that have not been completed." },
      { q: "According to the passage, what effect can merely having a smartphone nearby have?", options: ["A) It improves working-memory performance.", "B) It encourages deeper reading.", "C) It reduces working-memory performance and comprehension.", "D) It has no measurable effect on cognition."], correct: "C", rationale: "The passage states that even the presence of a smartphone on the desk can reduce working-memory performance and comprehension." },
      { q: "What do some educators propose under the idea of 'attention hygiene'?", options: ["A) Banning all digital devices permanently.", "B) Structured digital-free intervals and focus training.", "C) Increasing the number of notifications per day.", "D) Replacing books with video games."], correct: "B", rationale: "The passage describes 'attention hygiene' as including structured digital-free intervals and explicit focus-training strategies." },
    ],
    questionsTFNG: [
      { q: "The passage suggests that frequent task-switching on digital devices can weaken sustained focus.", correct: "TRUE", rationale: "The first paragraph states that constant switching can fragment attention and reduce sustained focus." },
      { q: "The passage claims that digital tools have no benefits for education.", correct: "FALSE", rationale: "The text notes that digital connectivity can enable rapid information-sifting and personalised learning, which are framed as potential benefits." },
      { q: "According to the passage, deep-reading is a skill that requires uninterrupted time.", correct: "TRUE", rationale: "The passage links deep-reading and critical analysis to prolonged, uninterrupted concentration." },
      { q: "All cognitive scientists agree that digital attention is harmful to humans.", correct: "NOT GIVEN", rationale: "The passage presents differing views but does not state that all scientists agree on harm." },
    ],
    questionsSentence: [
      { q: "The author implies that the mere presence of a smartphone can reduce __ and comprehension scores.", answer: "working-memory performance", rationale: "The second paragraph states that even the presence of a smartphone on the desk can reduce working-memory performance and comprehension scores." },
      { q: "Design choices such as notification frequency and interface clutter can shape users' attention patterns, often without their __.", answer: "conscious awareness", rationale: "The final paragraph states these design choices operate 'often without their conscious awareness.'" },
    ],
    questionsHeadings: [
      { paragraph: "Cognitive scientists use the term 'attentional residue' to describe the lingering mental load of unfinished tasks.", options: ["A) The benefits of multitasking", "B) How unfinished tasks impair cognitive engagement", "C) The history of cognitive science", "D) Why smartphones improve memory"], correct: "B", rationale: "This paragraph introduces attentional residue and explains how it prevents full engagement with complex material." },
      { paragraph: "In this context, the question is not simply whether digital tools are harmful, but how they are configured and used.", options: ["A) Why all digital tools should be banned", "B) The irrelevance of interface design", "C) Design choices as the key variable in digital attention", "D) The future of book-based learning"], correct: "C", rationale: "This paragraph shifts focus to how design choices — not the tools themselves — shape attention patterns, matching C." },
    ],
  },

  {
    id: 'passage_035',
    title: 'The Resource Curse',
    topic: 'Economics',
    difficulty: 'hard',
    text: `The term 'resource curse' describes the paradox whereby countries rich in natural resources, particularly oil, minerals, and gas, often experience slower economic growth and worse development outcomes than resource-poor nations. Economists have traced this counterintuitive pattern to several interconnected factors.

First, heavy reliance on a single export commodity can lead to an overvalued currency, which renders other sectors — especially manufacturing and agriculture — less competitive in global markets. This phenomenon, known as 'Dutch disease', reduces diversification and makes the economy vulnerable to commodity price swings. When prices fall, governments face sudden revenue shortfalls and may resort to austerity measures that deepen inequality.

Second, resource rents often concentrate wealth in the hands of elites and fuel corruption. Political leaders may prioritise protecting lucrative concessions over investing in public services such as education and healthcare. Empirical studies show a correlation between high resource dependence and lower institutional quality, though causation remains debated.

Third, regions hosting extraction projects can suffer from environmental degradation and social unrest. Local communities may experience displacement, pollution, and loss of livelihoods, while national elites benefit disproportionately. In some cases, armed groups fight to control resource revenues, increasing conflict risk.

Despite these challenges, certain resource-rich countries have managed to avoid the resource curse. Norway, for example, channels oil revenues into a sovereign wealth fund and invests in education and infrastructure, while enforcing strict transparency rules. Such examples suggest that the curse is not inevitable, but rather highly contingent on institutions and governance choices.`,
    questionsMCQ: [
      { q: "What is the main idea of the passage?", options: ["A) Resource-rich countries always grow faster than resource-poor ones.", "B) Natural resources invariably benefit all sectors of the economy.", "C) Wealth in natural resources can sometimes harm a country's development.", "D) Dutch disease is the only cause of the resource curse."], correct: "C", rationale: "The passage defines the resource curse as a situation where resource-rich countries have slower growth and worse outcomes." },
      { q: "What does 'Dutch disease' lead to in resource-dependent economies?", options: ["A) Higher diversification of industries.", "B) A weaker currency and booming manufacturing.", "C) An overvalued currency and weakened non-resource sectors.", "D) Immediate increases in education spending."], correct: "C", rationale: "The passage explains that Dutch disease causes currency overvaluation and makes non-resource sectors less competitive." },
      { q: "According to the passage, how can resource rents negatively affect politics?", options: ["A) They encourage more transparent institutions.", "B) They increase funding for environmental conservation.", "C) They concentrate wealth and foster corruption.", "D) They reduce the risk of armed conflict."], correct: "C", rationale: "The text notes that resource rents often concentrate wealth in elites' hands and fuel corruption." },
      { q: "What does Norway's experience suggest about the resource curse?", options: ["A) No country can escape the curse.", "B) Strong institutions and governance can prevent it.", "C) Oil revenues must be banned to avoid problems.", "D) Only poor countries experience Dutch disease."], correct: "B", rationale: "The passage presents Norway as an example where good governance and institutions have helped avoid the worst effects of the resource curse." },
    ],
    questionsTFNG: [
      { q: "The resource curse always occurs in all resource-rich countries.", correct: "FALSE", rationale: "The passage explicitly states that some resource-rich countries, like Norway, have avoided the curse." },
      { q: "Dutch disease can make non-resource sectors less competitive in global markets.", correct: "TRUE", rationale: "The passage says Dutch disease makes other sectors less competitive by overvaluing the currency." },
      { q: "Empirical studies mentioned in the passage prove that resource dependence always causes weak institutions.", correct: "FALSE", rationale: "The passage notes a correlation, but also states that causation remains debated." },
      { q: "Extraction projects can lead to both environmental harm and social unrest in local communities.", correct: "TRUE", rationale: "The passage states that host regions may experience environmental degradation, displacement, and social unrest." },
    ],
    questionsSentence: [
      { q: "The author argues that the resource curse is not inevitable, because __.", answer: "it depends on institutions and governance choices", rationale: "The final paragraph attributes the possibility of avoiding the curse to the quality of institutions and governance." },
      { q: "According to the passage, a key risk when commodity prices fall is that governments may __.", answer: "resort to austerity measures that deepen inequality", rationale: "The text notes that revenue shortfalls can push governments toward austerity, which worsens inequality." },
    ],
    questionsHeadings: [
      { paragraph: "The term 'resource curse' describes the paradox whereby countries rich in natural resources, particularly oil, minerals, and gas, often experience slower economic growth...", options: ["A) Why natural resources are beneficial", "B) Defining the resource curse", "C) The history of Dutch disease", "D) Comparing oil-rich countries"], correct: "B", rationale: "This paragraph introduces and defines the concept of the resource curse." },
      { paragraph: "Despite these challenges, certain resource-rich countries have managed to avoid the resource curse.", options: ["A) The inevitability of resource dependence", "B) Case studies of failed economies", "C) Breaking the resource curse", "D) The political costs of transparency"], correct: "C", rationale: "This paragraph focuses on how some countries have successfully avoided the resource curse." },
    ],
  }

); // end IELTS_READING_PASSAGES.push (batch 5)


// ══════════════════════════════════════════════════════════════════════
//  PASSAGES — Batch 6 (passages 36–38)
// ══════════════════════════════════════════════════════════════════════
IELTS_READING_PASSAGES.push(

  {
    id: 'passage_036',
    title: 'CRISPR and Gene Editing',
    topic: 'Science',
    difficulty: 'hard',
    text: `CRISPR technology has revolutionised the field of genetics by enabling precise, relatively inexpensive gene editing. CRISPR-Cas systems, originally discovered in bacteria as a form of immune defence, can be adapted to cut specific DNA sequences in a wide range of organisms. By designing a short guide RNA that matches a target sequence, scientists direct the Cas enzyme to a precise location in the genome, where it creates a break in the DNA.

Once the DNA is cut, the cell's natural repair machinery takes over. Depending on the method used, researchers can either allow the cell to repair the break in a way that disrupts the gene (often disabling it) or introduce a new DNA template to insert or replace a desired sequence. This flexibility makes CRISPR useful for studying gene function, developing disease-resistant crops, and exploring potential therapies for genetic disorders.

Despite its promise, CRISPR raises significant ethical and safety questions. Off-target effects — where the enzyme cuts unintended regions of the genome — can introduce harmful mutations. There are also concerns about germline editing, in which changes to sperm, egg, or embryo DNA could be inherited by future generations. Several countries have imposed strict regulations or moratoria on such applications.

Nevertheless, CRISPR-based tools continue to evolve. New variants of Cas enzymes offer greater precision or altered targeting capabilities, and base-editing techniques allow single-letter changes in DNA without making a full double-strand break. As the technology matures, scientists and ethicists emphasise the need for clear guidelines and transparent public debate before CRISPR is used in sensitive human-germline contexts.`,
    questionsMCQ: [
      { q: "What is CRISPR mainly used for, according to the passage?", options: ["A) Storing computer data in DNA.", "B) Precise gene editing in various organisms.", "C) Measuring atmospheric temperature.", "D) Designing new languages."], correct: "B", rationale: "The first paragraph introduces CRISPR as a tool for precise gene editing across many species." },
      { q: "What role does the guide RNA play in CRISPR-Cas systems?", options: ["A) It repairs the DNA after a cut.", "B) It matches a target sequence and directs Cas to that location.", "C) It copies the entire genome.", "D) It replaces the need for enzymes."], correct: "B", rationale: "The first paragraph explains that guide RNA matches the target sequence and directs the Cas enzyme." },
      { q: "What is a major safety concern raised about CRISPR?", options: ["A) It is too slow to be useful in research.", "B) It can only edit bacterial DNA.", "C) It may cause off-target cuts in the genome.", "D) It stabilises mutations in all cells."], correct: "C", rationale: "The third paragraph identifies off-target effects as a key safety issue." },
      { q: "What is a specific concern about germline editing with CRISPR?", options: ["A) It is too expensive to be used in plants.", "B) It cannot be applied to humans.", "C) Edited changes can be inherited by future generations.", "D) It stops evolution from occurring."], correct: "C", rationale: "The third paragraph notes that germline edits could be inherited, which is a central ethical concern." },
    ],
    questionsTFNG: [
      { q: "The passage states that CRISPR-Cas systems were first discovered in bacteria as part of an immune defence.", correct: "TRUE", rationale: "The first paragraph explicitly mentions that CRISPR-Cas systems originated in bacteria as an immune mechanism." },
      { q: "CRISPR can only be used to delete genes, not to insert new sequences.", correct: "FALSE", rationale: "The second paragraph explains that researchers can introduce new DNA templates to insert or replace sequences." },
      { q: "The passage claims that off-target effects are a minor concern with no practical consequences.", correct: "FALSE", rationale: "The third paragraph highlights off-target effects as a significant safety issue that can introduce harmful mutations." },
      { q: "Some countries have imposed strict regulations or bans on germline editing with CRISPR.", correct: "TRUE", rationale: "The third paragraph notes that several countries have introduced strict rules or moratoria on germline applications." },
    ],
    questionsSentence: [
      { q: "CRISPR's flexibility comes from the fact that it can either disrupt a gene or __ a desired sequence.", answer: "introduce a new DNA template to insert or replace", rationale: "The second paragraph contrasts gene disruption via repair errors with the use of a new DNA template to insert or replace sequences." },
      { q: "To address ethical concerns, the passage argues that clear guidelines and public debate are needed before CRISPR is used in __ contexts.", answer: "sensitive human-germline", rationale: "The final paragraph calls for guidelines and debate before CRISPR is applied in 'sensitive human-germline contexts.'" },
    ],
    questionsHeadings: [
      { paragraph: "Once the DNA is cut, the cell's natural repair machinery takes over.", options: ["A) The discovery of CRISPR in bacteria", "B) How CRISPR edits genes after cutting DNA", "C) The ethics of genetic research", "D) Why DNA repair always fails"], correct: "B", rationale: "This paragraph explains what happens after the DNA cut — the repair process and how it enables editing — matching B." },
      { paragraph: "Nevertheless, CRISPR-based tools continue to evolve.", options: ["A) Why CRISPR has been abandoned by scientists", "B) The dangers of base editing", "C) Advances in CRISPR precision and the call for ethical guidelines", "D) How bacteria defend against viruses"], correct: "C", rationale: "This paragraph covers new Cas variants, base editing, and the call for ethical guidelines — all captured in C." },
    ],
  },

  {
    id: 'passage_037',
    title: 'Space Exploration and Astronomy',
    topic: 'Science',
    difficulty: 'hard',
    text: `Space exploration and astronomy have profoundly reshaped humanity's understanding of the universe. While early astronomers relied on naked-eye observations and simple instruments, modern telescopes located on Earth and in orbit collect electromagnetic radiation across the spectrum, from radio waves to gamma rays. These instruments reveal structures such as galaxies, black holes, and exoplanets that are invisible to the unaided eye.

Space-based observatories, such as the Hubble Space Telescope, avoid atmospheric distortion and can capture images with exceptional clarity. They have led to breakthroughs such as precise measurements of the universe's expansion rate and the detection of thousands of planets orbiting distant stars. Ground-based telescopes, often equipped with adaptive optics, now complement these observations by monitoring large areas of the sky over long periods.

Human spaceflight adds another dimension to exploration. Missions to the Moon and the International Space Station have enabled long-duration experiments in microgravity, from material science to biological studies. Future plans include robotic missions to Mars and the outer planets, as well as potential crewed missions that would test human endurance over multi-year voyages.

At the same time, space exploration poses practical and ethical challenges. Orbital debris from defunct satellites and rocket stages threatens operational spacecraft, and the risk of collision is rising. There are also debates over the commercialisation of space, the potential militarisation of orbits, and the environmental impact of frequent rocket launches. Astronomers and policymakers therefore call for international frameworks to govern the sustainable use of space.`,
    questionsMCQ: [
      { q: "What does the passage mainly discuss?", options: ["A) The history of television broadcasting.", "B) Space exploration and astronomy and their impact on our understanding of the universe.", "C) The design of computer software.", "D) The biology of Earth-based animals."], correct: "B", rationale: "The passage focuses on how space exploration and astronomy have changed our cosmic understanding." },
      { q: "What is an advantage of space-based telescopes such as Hubble?", options: ["A) They are cheaper to maintain than ground-based telescopes.", "B) They avoid atmospheric distortion and provide clearer images.", "C) They only observe visible light.", "D) They can land on planets to collect soil samples."], correct: "B", rationale: "The second paragraph notes that space-based observatories avoid atmospheric distortion and capture clearer images." },
      { q: "What do human space missions such as those on the International Space Station allow scientists to study?", options: ["A) Only astronomy from the surface of the Moon.", "B) Only Earth-based weather patterns.", "C) Experiments in microgravity across various scientific fields.", "D) The history of ancient civilisations."], correct: "C", rationale: "The third paragraph lists material science and biological studies in microgravity as key benefits of human space missions." },
      { q: "What is a major concern regarding orbital debris?", options: ["A) It makes space tourism more affordable.", "B) It increases the risk of collisions with operational spacecraft.", "C) It improves the clarity of ground-based images.", "D) It reduces the need for international cooperation."], correct: "B", rationale: "The last paragraph warns that debris threatens operational spacecraft and raises collision risk." },
    ],
    questionsTFNG: [
      { q: "The passage states that early astronomers used only the naked eye and very simple instruments.", correct: "TRUE", rationale: "The first paragraph notes that early astronomers relied on the naked eye and simple tools." },
      { q: "Modern telescopes can observe electromagnetic radiation beyond the visible spectrum.", correct: "TRUE", rationale: "The first paragraph mentions that modern instruments collect radiation from radio waves to gamma rays." },
      { q: "All modern astronomical observations are conducted only from space-based telescopes.", correct: "FALSE", rationale: "The second paragraph explains that ground-based telescopes, often with adaptive optics, complement space-based observations." },
      { q: "The passage suggests that policymakers are ignoring the challenges of orbital debris.", correct: "FALSE", rationale: "The last paragraph says astronomers and policymakers call for international frameworks to manage space sustainably." },
    ],
    questionsSentence: [
      { q: "The passage argues that space-based observatories provide clearer images because they __.", answer: "avoid atmospheric distortion", rationale: "The second paragraph explicitly states that space-based telescopes avoid atmospheric distortion." },
      { q: "To address the risks posed by orbital debris, the passage suggests the need for __.", answer: "international frameworks to govern the sustainable use of space", rationale: "The last paragraph calls for international rules to ensure sustainable use of space." },
    ],
    questionsHeadings: [
      { paragraph: "Space exploration and astronomy have profoundly reshaped humanity's understanding of the universe.", options: ["A) The design of rocket engines", "B) How space science changes our view of the cosmos", "C) The history of Earth-based clocks", "D) The economics of satellite launches"], correct: "B", rationale: "This paragraph opens with the idea that space science has transformed our cosmic understanding, so B is most appropriate." },
      { paragraph: "At the same time, space exploration poses practical and ethical challenges.", options: ["A) The benefits of space tourism", "B) Challenges and governance of space exploration", "C) The discovery of new galaxies", "D) The simplicity of orbital mechanics"], correct: "B", rationale: "This paragraph focuses on debris, commercialisation, and governance issues, so B best fits." },
    ],
  },

  {
    id: 'passage_038',
    title: 'Artificial Intelligence and Machine Learning',
    topic: 'Science',
    difficulty: 'hard',
    text: `Artificial intelligence (AI) broadly refers to systems that can perform tasks normally requiring human intelligence, such as reasoning, learning, and problem-solving. Within AI, machine learning has become the dominant approach, in which algorithms are trained on large datasets to recognise patterns and make predictions. Rather than being explicitly programmed with fixed rules, these systems 'learn' from examples and adjust their internal parameters through statistical methods.

Modern machine-learning models, especially deep neural networks, can analyse images, speech, and text at scales that surpass human processing speed. For instance, AI-assisted diagnosis tools can detect subtle patterns in medical scans that a human radiologist might overlook. However, such systems are not infallible; they depend heavily on the quality and representativeness of training data, and they can inherit and even amplify biases present in historical datasets.

Another challenge is the opacity of many advanced models. Deep-learning systems often operate as 'black boxes', meaning their internal decision-making processes are difficult to interpret. This lack of transparency raises concerns in high-stakes domains such as criminal justice, hiring, and financial lending, where individuals may be affected by opaque algorithmic decisions.

In response, researchers are developing 'explainable AI' techniques that aim to make model outputs more interpretable without sacrificing performance. Some approaches generate visual heatmaps or natural-language explanations to show which parts of the input most influenced the decision. At the same time, policymakers are debating how to regulate AI use, balancing innovation with accountability, privacy, and fairness.`,
    questionsMCQ: [
      { q: "What is the main idea of the passage?", options: ["A) AI will replace all human workers in the near future.", "B) Machine learning is a dominant AI approach that learns from data but has limitations.", "C) Deep-learning models are always more accurate than humans.", "D) Traditional rule-based programming is the most advanced AI method."], correct: "B", rationale: "The passage emphasises that machine learning learns from data but is limited by data quality, bias, and opacity." },
      { q: "What is a key characteristic of machine-learning systems compared to traditional programs?", options: ["A) They follow only fixed rules written by programmers.", "B) They learn patterns from data and adjust their parameters.", "C) They never use statistical methods.", "D) They are always transparent and easy to understand."], correct: "B", rationale: "The first paragraph explains that machine-learning systems learn from data instead of relying solely on fixed rules." },
      { q: "According to the passage, what problem can arise from biased training data?", options: ["A) Models become faster at generating random errors.", "B) Biases are only removed automatically.", "C) Models can inherit and amplify existing biases.", "D) Data sets automatically self-correct after one use."], correct: "C", rationale: "The second paragraph notes that models can inherit and even amplify biases present in historical datasets." },
      { q: "What is the goal of 'explainable AI'?", options: ["A) To make AI models slower and more expensive.", "B) To maximise data privacy by hiding all outputs.", "C) To make model decisions more interpretable without losing performance.", "D) To replace machine learning with rule-based systems."], correct: "C", rationale: "The last paragraph states that explainable-AI techniques aim to make outputs more interpretable while preserving performance." },
    ],
    questionsTFNG: [
      { q: "The passage defines machine learning as a method where programs are trained to recognise patterns in data.", correct: "TRUE", rationale: "The first paragraph explicitly describes machine learning in this way." },
      { q: "The passage claims that AI-assisted medical tools are always more accurate than human radiologists.", correct: "FALSE", rationale: "The passage only says AI can detect subtle patterns, not that it is always more accurate." },
      { q: "Many deep-learning models are described as 'black boxes' because their internal reasoning is hard to interpret.", correct: "TRUE", rationale: "The third paragraph states that deep-learning systems often operate as black boxes with unclear decision-making." },
      { q: "The passage suggests that policymakers are not considering any regulation of AI use.", correct: "FALSE", rationale: "The last paragraph notes that policymakers are debating how to regulate AI use." },
    ],
    questionsSentence: [
      { q: "The author argues that machine learning differs from traditional programming because it __.", answer: "learns from data and adjusts its internal parameters", rationale: "The first paragraph contrasts rule-based programming with data-driven learning and parameter adjustment." },
      { q: "To address the opacity of AI decisions, researchers are developing __.", answer: "explainable AI techniques", rationale: "The last paragraph introduces 'explainable AI' as a response to the opacity of advanced models." },
    ],
    questionsHeadings: [
      { paragraph: "Artificial intelligence (AI) broadly refers to systems that can perform tasks normally requiring human intelligence, such as reasoning, learning, and problem-solving.", options: ["A) The future of video games", "B) Defining artificial intelligence and machine learning", "C) The history of programming languages", "D) The role of biology in computing"], correct: "B", rationale: "This paragraph introduces and defines AI and machine learning, so B best fits." },
      { paragraph: "In response, researchers are developing 'explainable AI' techniques that aim to make model outputs more interpretable without sacrificing performance.", options: ["A) The complete replacement of human doctors", "B) Making AI decisions more transparent and accountable", "C) The benefits of data opacity", "D) The end of AI research"], correct: "B", rationale: "This paragraph focuses on efforts to make AI decisions more understandable and on regulatory debate, so B is the best heading." },
    ],
  }

); // end IELTS_READING_PASSAGES.push (batch 6)


// ══════════════════════════════════════════════════════════════════════
//  PASSAGES — Batch 7 (passages 39–43)
// ══════════════════════════════════════════════════════════════════════
IELTS_READING_PASSAGES.push(

  {
    id: 'passage_039',
    title: 'The Dual Revolution: Solar and Wind Power',
    topic: 'Renewable Energy',
    difficulty: 'hard',
    text: `The 21st century has witnessed a paradigm shift in global energy systems, with solar photovoltaic (PV) and wind power emerging as the cheapest sources of new electricity generation in most major economies. According to the International Energy Agency (IEA), renewables accounted for over 80% of new power capacity added worldwide in 2022, with solar and wind comprising the vast majority. This transformation, driven by precipitous cost declines and policy support, is reshaping geopolitics, trade, and even the very structure of electricity grids.

Solar PV costs have fallen by nearly 90% since 2010, while onshore wind costs have dropped by about 70%. These reductions are not merely incremental improvements but reflect a virtuous cycle of manufacturing scale, technological learning, and supply chain optimisation. China now produces over 70% of the world's solar modules and a significant share of wind turbine components, raising concerns about strategic dependencies. The European Union's recent Net-Zero Industry Act and the US Inflation Reduction Act represent attempts to reshore or friend-shore clean energy manufacturing.

Yet the rapid deployment of variable renewables poses technical challenges. Unlike coal or gas plants, solar and wind output fluctuate with weather and time of day. Grid operators must balance supply and demand in real time, often relying on flexible backup (batteries, pumped hydro, demand response) or geographic diversification. The 'duck curve' — a graph showing the net load on a grid as solar ramps down in the evening — has become iconic in energy circles, illustrating the need for energy storage and better interconnection.

Battery storage costs have also plummeted, falling by 85% over the past decade. Utility-scale lithium-ion batteries now provide short-duration storage (2–4 hours), enabling evening peak shifting. However, seasonal storage for weeks or months — hydrogen, compressed air, or flow batteries — remains nascent and expensive. Long-duration energy storage (LDES) is considered the missing piece for deeply decarbonised grids with high renewables penetration (80–100%).

Environmental trade-offs exist. Solar farms require land, potentially competing with agriculture or ecosystems. Wind turbines kill birds and bats, though far fewer than fossil fuel infrastructure or building collisions. Rare earth metals for magnets and minerals for solar cells raise mining and recycling challenges. Nonetheless, the life-cycle emissions of solar and wind are orders of magnitude lower than coal or natural gas. The energy transition is not without friction, but the trajectory is clear: a world powered increasingly by the sun and wind is not only plausible — it is already unfolding.`,
    questionsMCQ: [
      { q: "According to the IEA, what percentage of new power capacity added worldwide in 2022 came from renewables?", options: ["A) Approximately 50%", "B) Approximately 70%", "C) More than 80%", "D) Less than 30%"], correct: "C", rationale: "The passage states: 'renewables accounted for over 80% of new power capacity added worldwide in 2022'." },
      { q: "The 'duck curve' is used to illustrate:", options: ["A) The seasonal variation of wind power.", "B) The need for energy storage and grid flexibility as solar ramps down.", "C) The optimal shape of wind turbine blades.", "D) The decline in solar PV costs over time."], correct: "B", rationale: "The passage explains the duck curve as 'a graph showing the net load on a grid as solar ramps down in the evening, illustrating the need for energy storage and better interconnection.'" },
      { q: "What is described as 'the missing piece for deeply decarbonised grids with high renewables penetration'?", options: ["A) More solar farms.", "B) Higher wind turbine towers.", "C) Long-duration energy storage (LDES).", "D) Natural gas backup plants."], correct: "C", rationale: "The passage explicitly says: 'Long-duration energy storage (LDES) is considered the missing piece for deeply decarbonised grids with high renewables penetration (80–100%).'" },
      { q: "Which of the following is mentioned as an environmental drawback of solar and wind energy?", options: ["A) They emit large amounts of CO2 during operation.", "B) They require land that may compete with agriculture or ecosystems.", "C) They are more harmful to human health than coal.", "D) They cannot be recycled at all."], correct: "B", rationale: "The passage notes: 'Solar farms require land, potentially competing with agriculture or ecosystems.'" },
    ],
    questionsTFNG: [
      { q: "Onshore wind costs have fallen by approximately 70% since 2010.", correct: "TRUE", rationale: "The passage states: 'onshore wind costs have dropped by about 70%.'" },
      { q: "China produces less than 50% of the world's solar modules.", correct: "FALSE", rationale: "The passage says 'China now produces over 70% of the world's solar modules'." },
      { q: "Utility-scale lithium-ion batteries currently provide seasonal storage of several months.", correct: "FALSE", rationale: "The passage says batteries provide 'short-duration storage (2–4 hours)', not seasonal." },
      { q: "The life-cycle emissions of wind power are higher than those of natural gas.", correct: "FALSE", rationale: "The passage states 'the life-cycle emissions of solar and wind are orders of magnitude lower than coal or natural gas.'" },
    ],
    questionsSentence: [
      { q: "The dramatic cost reductions in solar and wind reflect a virtuous cycle of manufacturing scale, technological learning, and __.", answer: "supply chain optimisation", rationale: "The second paragraph lists these three factors: 'manufacturing scale, technological learning, and supply chain optimisation.'" },
      { q: "The __ and the US Inflation Reduction Act aim to bring clean energy manufacturing back to domestic or allied countries.", answer: "European Union's Net-Zero Industry Act", rationale: "The passage mentions both acts as attempts to reshore production." },
    ],
    questionsHeadings: [
      { paragraph: "The 21st century has witnessed a paradigm shift in global energy systems, with solar photovoltaic (PV) and wind power emerging as the cheapest sources of new electricity generation...", options: ["A) Technical challenges of variable renewables", "B) The global rise of solar and wind", "C) A history of fossil fuels", "D) The role of batteries in grid stability"], correct: "B", rationale: "This paragraph introduces the overall shift to solar and wind as the cheapest sources, affecting geopolitics and grids." },
      { paragraph: "Environmental trade-offs exist. Solar farms require land... Wind turbines kill birds and bats... Nonetheless, the life-cycle emissions of solar and wind are orders of magnitude lower...", options: ["A) No perfect energy source", "B) The superiority of nuclear power", "C) How to recycle solar panels", "D) Birds versus windmills"], correct: "A", rationale: "This paragraph acknowledges environmental drawbacks but concludes emissions are far lower than fossil fuels — 'no perfect energy source' captures the balanced assessment." },
    ],
  },


  {
    id: 'passage_040',
    title: 'The Silent Crisis: Ocean Acidification and Marine Conservation',
    topic: 'Ocean Acidification / Marine Conservation',
    difficulty: 'hard',
    text: `Ocean acidification (OA) has been called the 'evil twin' of climate change. While global warming absorbs most public attention, OA represents an equally profound threat to marine ecosystems. Since the Industrial Revolution, the oceans have absorbed about 30% of anthropogenic carbon dioxide emissions. This uptake has slowed atmospheric warming but has altered seawater chemistry: CO2 reacts with water to form carbonic acid, which dissociates into bicarbonate and hydrogen ions, increasing acidity — a process that has lowered surface ocean pH by approximately 0.1 units (a 30% increase in acidity) and will likely reduce it by another 0.3–0.4 units by 2100 under business-as-usual scenarios.

The biological consequences are most severe for calcifying organisms — corals, molluscs (oysters, clams, mussels), echinoderms (sea urchins, starfish), and some plankton species that form the base of marine food webs. These organisms build shells or skeletons from calcium carbonate (CaCO3). Lower pH reduces the availability of carbonate ions, making calcification energetically expensive or impossible. In the cold waters of the Southern Ocean, levels of aragonite (a soluble form of calcium carbonate) are already undersaturated, meaning shells begin to dissolve.

Coral reefs, often called the 'rainforests of the sea', are particularly vulnerable. OA, combined with rising sea temperatures (coral bleaching), pollution, and overfishing, has pushed reefs into a 'state-shift' from coral-dominated to algae-dominated ecosystems. The loss of reef structure impacts biodiversity, fisheries, and coastal protection for hundreds of millions of people. The Great Barrier Reef has experienced three mass bleaching events in the past five years, and its recovery capacity is severely compromised.

Marine conservation strategies are evolving to address OA. Marine Protected Areas (MPAs) can reduce local stressors like overfishing and pollution, building resilience. However, MPAs cannot stop OA itself, as CO2 diffuses globally. Proposals for geoengineering — such as ocean alkalinity enhancement (adding crushed olivine or limestone to seawater) — are being researched but raise ecological and governance questions. The only fundamental solution is rapid decarbonisation of the global economy.

International policy has begun to respond. The UN Sustainable Development Goal 14 (Life Below Water) includes targets to minimise OA impacts. The Intergovernmental Panel on Climate Change (IPCC) Special Report on the Ocean and Cryosphere highlighted OA risks. Yet funding and enforcement lag. As with climate, the window for action is closing. The silent crisis demands not silence, but a global response as urgent as the climate emergency.`,
    questionsMCQ: [
      { q: "Why is ocean acidification called the 'evil twin' of climate change?", options: ["A) Because it causes hurricanes and cyclones.", "B) Because it is a serious consequence of CO2 emissions that receives less public attention.", "C) Because it only affects cold-water corals.", "D) Because it is caused by methane instead of CO2."], correct: "B", rationale: "The passage states that OA is a 'profound threat' but receives less attention than global warming." },
      { q: "According to the passage, which marine organisms are most severely affected by ocean acidification?", options: ["A) Fish and sharks.", "B) Sea turtles.", "C) Calcifying organisms such as corals and molluscs.", "D) Marine mammals like whales."], correct: "C", rationale: "The second paragraph begins: 'The biological consequences are most severe for calcifying organisms — corals, molluscs...'" },
      { q: "What does the term 'state-shift' refer to in the context of coral reefs?", options: ["A) A change from algae-dominated to coral-dominated.", "B) A change from coral-dominated to algae-dominated.", "C) A shift in ocean currents.", "D) The migration of corals to deeper water."], correct: "B", rationale: "The passage: 'pushed reefs into a state-shift from coral-dominated to algae-dominated ecosystems.'" },
      { q: "Which of the following is proposed as a geoengineering solution to ocean acidification?", options: ["A) Pumping oxygen into deep ocean layers.", "B) Ocean alkalinity enhancement by adding crushed minerals.", "C) Building artificial coral reefs from concrete.", "D) Relocating all calcifying species to aquariums."], correct: "B", rationale: "The passage gives the example: 'ocean alkalinity enhancement (adding crushed olivine or limestone to seawater)'." },
    ],
    questionsTFNG: [
      { q: "The oceans have absorbed approximately 30% of anthropogenic CO2 since the Industrial Revolution.", correct: "TRUE", rationale: "The first paragraph states exactly that." },
      { q: "Aragonite undersaturation already occurs in tropical coral reefs.", correct: "NOT GIVEN", rationale: "The passage mentions aragonite undersaturation in the 'cold waters of the Southern Ocean', not in tropical reefs. It does not state whether this occurs in tropical regions." },
      { q: "Marine Protected Areas can stop ocean acidification by absorbing CO2.", correct: "FALSE", rationale: "The passage says MPAs 'cannot stop OA itself, as CO2 diffuses globally.'" },
      { q: "The UN Sustainable Development Goal 14 includes targets to address ocean acidification impacts.", correct: "TRUE", rationale: "The passage says 'The UN Sustainable Development Goal 14 (Life Below Water) includes targets to minimise OA impacts.'" },
    ],
    questionsSentence: [
      { q: "Since the Industrial Revolution, surface ocean pH has decreased by approximately __ units.", answer: "0.1", rationale: "The passage: 'lowered surface ocean pH by approximately 0.1 units'." },
      { q: "The Great Barrier Reef's recovery capacity is severely compromised due to multiple __ events over five years.", answer: "mass bleaching", rationale: "The passage says 'three mass bleaching events in the past five years'." },
    ],
    questionsHeadings: [
      { paragraph: "The biological consequences are most severe for calcifying organisms... Lower pH reduces the availability of carbonate ions... In the cold waters of the Southern Ocean, levels of aragonite are already undersaturated...", options: ["A) The chemical mechanism of shell dissolution", "B) How warming helps coral growth", "C) Effects on calcifying species and polar seas", "D) Geoengineering proposals"], correct: "C", rationale: "This paragraph details the impact on calcifiers and gives an example from the Southern Ocean." },
      { paragraph: "Marine conservation strategies are evolving... Marine Protected Areas can reduce local stressors... However, MPAs cannot stop OA itself. Proposals for geoengineering are being researched... The only fundamental solution is rapid decarbonisation.", options: ["A) Local and global solutions to acidification", "B) Why MPAs are useless", "C) The success of the Montreal Protocol", "D) Fishing regulations only"], correct: "A", rationale: "This paragraph discusses MPAs (local solutions) and geoengineering/decarbonisation (global solutions)." },
    ],
  },


  {
    id: 'passage_041',
    title: 'The Age of Movement: Migration, Refugees, and Global Displacement',
    topic: 'Migration / Refugees',
    difficulty: 'hard',
    text: `The 21st century has become the age of human mobility, with more people living outside their country of birth than at any time in history. According to the United Nations, there were approximately 281 million international migrants in 2020 — 3.6% of the global population. Among them, 26.4 million were refugees and 4.1 million asylum-seekers, fleeing persecution, conflict, or violence. These numbers, vast as they are, exclude internally displaced persons (IDPs), who number over 55 million — uprooted within their own nations.

The distinction between 'voluntary' economic migrants and 'forced' refugees has become increasingly blurred. Climate change, land degradation, and resource scarcity are creating new categories of displaced persons — 'environmental migrants' — who fall outside the legal protections of the 1951 Refugee Convention. A World Bank report estimates that by 2050, over 143 million people in just three regions (Sub-Saharan Africa, South Asia, and Latin America) could be forced to move within their own borders due to slow-onset climate impacts.

Europe's migration 'crisis' of 2015–2016, when over 1.3 million asylum-seekers arrived, exposed the fault lines in global governance. The Dublin Regulation, which required asylum to be processed in the first EU country of entry, placed disproportionate burdens on frontline states like Greece and Italy. Subsequent attempts at a Common European Asylum System have been stymied by disagreements over quotas and national sovereignty. Similarly, the US's 'Remain in Mexico' policy and the UK's Rwanda asylum partnership reflect a trend towards externalising border controls.

Developing countries host the overwhelming majority of refugees — 86% according to UNHCR, with Turkey, Colombia, Pakistan, Uganda, and Germany leading. Yet funding for humanitarian response falls short. The World Food Programme has repeatedly cut rations for refugees in East Africa due to donor fatigue and competing crises. Education for refugee children remains precarious: only 68% of refugee children attend primary school, compared to 91% globally, and just 34% attend secondary school.

Progressive frameworks exist. The Global Compact on Refugees (2018), affirmed by the UN General Assembly, seeks to ease pressures on host countries, enhance refugee self-reliance, and expand resettlement. The Global Compact for Safe, Orderly and Regular Migration addresses broader migration governance. However, both are non-binding, and their implementation lags. As climate impacts intensify and conflicts persist, the age of movement shows no sign of ending. The question is not whether people will move, but whether the world will manage displacement with dignity or coercion.`,
    questionsMCQ: [
      { q: "According to the passage, how many international migrants were there in 2020?", options: ["A) 26.4 million", "B) 55 million", "C) 143 million", "D) 281 million"], correct: "D", rationale: "The passage states: 'approximately 281 million international migrants in 2020'." },
      { q: "What does the passage say about 'environmental migrants' and the 1951 Refugee Convention?", options: ["A) They are fully covered by the Convention.", "B) They are explicitly excluded from its legal protections.", "C) They fall outside its protections.", "D) The Convention was amended to include them in 2018."], correct: "C", rationale: "The passage: 'environmental migrants... who fall outside the legal protections of the 1951 Refugee Convention.'" },
      { q: "What was a consequence of the Dublin Regulation during the 2015–2016 migration crisis?", options: ["A) It distributed asylum-seekers evenly across all EU states.", "B) It placed disproportionate burdens on Greece and Italy.", "C) It eliminated all asylum applications in Europe.", "D) It was immediately replaced by a global compact."], correct: "B", rationale: "The passage: 'placed disproportionate burdens on frontline states like Greece and Italy.'" },
      { q: "Which region hosts the largest number of refugees, according to the passage?", options: ["A) North America", "B) Europe", "C) Developing countries", "D) Australia"], correct: "C", rationale: "The passage explicitly says 'Developing countries host the overwhelming majority of refugees — 86%'." },
    ],
    questionsTFNG: [
      { q: "The number of internally displaced persons (IDPs) is greater than the number of refugees and asylum-seekers combined.", correct: "TRUE", rationale: "Refugees + asylum-seekers = 26.4M + 4.1M = 30.5M. IDPs are over 55M, which is larger." },
      { q: "The World Bank report predicts that over 143 million people will move internationally by 2050 due to climate change.", correct: "FALSE", rationale: "The report estimates people 'could be forced to move within their own borders' — internal displacement, not international." },
      { q: "The Global Compact on Refugees is a legally binding treaty for all UN members.", correct: "FALSE", rationale: "The passage says both compacts are 'non-binding'." },
      { q: "Worldwide, more than two-thirds of refugee children attend primary school.", correct: "TRUE", rationale: "The passage states '68% of refugee children attend primary school' — that is over two-thirds." },
    ],
    questionsSentence: [
      { q: "A World Bank report estimates that by 2050, over 143 million people in three regions could be displaced within their own countries due to __ climate impacts.", answer: "slow-onset", rationale: "The passage qualifies the impacts as 'slow-onset climate impacts'." },
      { q: "The US 'Remain in Mexico' policy and the UK's Rwanda partnership reflect a trend towards __ border controls.", answer: "externalising", rationale: "The phrase 'externalising border controls' is used in the passage." },
    ],
    questionsHeadings: [
      { paragraph: "The distinction between 'voluntary' economic migrants and 'forced' refugees has become increasingly blurred. Climate change, land degradation, and resource scarcity are creating new categories of displaced persons — 'environmental migrants' — who fall outside...", options: ["A) Legal gaps for climate displacement", "B) The success of the 1951 Convention", "C) Economic benefits of migration", "D) A history of refugee law"], correct: "A", rationale: "This paragraph focuses on the blurring of categories and the fact that environmental migrants lack legal protection." },
      { paragraph: "Progressive frameworks exist. The Global Compact on Refugees (2018)... The Global Compact for Safe, Orderly and Regular Migration... However, both are non-binding, and their implementation lags.", options: ["A) Binding treaties that work perfectly", "B) Non-binding compacts with weak implementation", "C) The end of all forced migration", "D) Regional agreements only"], correct: "B", rationale: "This paragraph describes the existence of these compacts but notes they are non-binding and implementation lags." },
    ],
  },


  {
    id: 'passage_042',
    title: 'Feeding Nine Billion: Food Security in a Changing Climate',
    topic: 'Food Security / Agriculture',
    difficulty: 'hard',
    text: `By 2050, the global population is projected to reach nearly 10 billion. Simultaneously, climate change is already disrupting agricultural systems, reducing yields of staple crops and increasing the frequency of extreme weather events. The Food and Agriculture Organization (FAO) defines food security as existing 'when all people, at all times, have physical, social and economic access to sufficient, safe and nutritious food'. Yet after decades of progress, hunger is on the rise again: an estimated 735 million people faced hunger in 2022, up from 613 million in 2019.

Agricultural productivity must increase by about 60% to meet demand, but the Green Revolution model of high-input, monoculture farming is reaching ecological limits. Nitrogen and phosphorus runoff has created over 500 ocean 'dead zones'. Groundwater depletion — particularly in major aquifers like the Ogallala (US) and the North China Plain — threatens long-term irrigation. Topsoil erosion outpaces natural formation by orders of magnitude. In short, the conventional agricultural system is both a victim and a driver of environmental degradation.

Climate change affects food systems through multiple pathways. Rising temperatures reduce yields of wheat, rice, and maize — with every 1°C increase estimated to cut yields by 6–10%. Shifting precipitation patterns cause droughts or floods. Extreme weather (cyclones, heatwaves) destroys harvests. Ocean warming and acidification harm fisheries. Pests and diseases expand their ranges. The Intergovernmental Panel on Climate Change (IPCC) warns that without adaptation, crop yields could decline by up to 25% by mid-century, with the worst impacts in tropical regions where food insecurity is already high.

Agroecological approaches offer a promising alternative. These include agroforestry (integrating trees with crops), conservation agriculture (minimal tillage, permanent soil cover, crop rotation), integrated pest management, and diversification. Studies from the UN Special Rapporteur on the Right to Food show that agroecology can double yields within a decade on smallholder farms while restoring ecosystem services. Unlike industrial agriculture, which relies on external inputs, agroecology builds on local knowledge and biological synergies.

Technology also plays a role. Precision agriculture — using GPS, sensors, and AI — optimises water, fertiliser, and pesticide application. Gene editing (CRISPR) can develop drought-tolerant or disease-resistant varieties without transgenes. Digital advisory services deliver weather forecasts and planting advice to smallholders via mobile phones. Yet these technologies are not silver bullets; they require infrastructure, literacy, and affordability. Food security in the 21st century demands a portfolio of solutions: from regenerative farming to smarter supply chains, from reduced food waste (one-third of all food is wasted) to policy support for resilient livelihoods.`,
    questionsMCQ: [
      { q: "According to the FAO definition, food security includes which of the following components?", options: ["A) Only physical access to any kind of food.", "B) Economic access to sufficient, safe, and nutritious food at all times.", "C) Unlimited supply of processed foods.", "D) Only food availability, not access."], correct: "B", rationale: "The passage quotes the FAO definition including 'physical, social and economic access to sufficient, safe and nutritious food'." },
      { q: "What is one of the environmental consequences of conventional high-input agriculture mentioned in the passage?", options: ["A) Reduced ocean dead zones.", "B) Increased atmospheric oxygen.", "C) Creation of over 500 ocean 'dead zones'.", "D) Elimination of groundwater depletion."], correct: "C", rationale: "The passage states: 'Nitrogen and phosphorus runoff has created over 500 ocean dead zones.'" },
      { q: "What does the IPCC warn about crop yields without adaptation to climate change?", options: ["A) They will double by mid-century.", "B) They could decline by up to 25% in tropical regions.", "C) They will remain unchanged.", "D) They will improve due to CO2 fertilisation."], correct: "B", rationale: "The passage: 'crop yields could decline by up to 25% by mid-century, with the worst impacts in tropical regions.'" },
      { q: "Which of the following is described as an agroecological approach?", options: ["A) High-input monoculture.", "B) Agroforestry.", "C) Genetically modified monocrops.", "D) Deep-sea fishing."], correct: "B", rationale: "The fourth paragraph lists agroecological approaches including 'agroforestry (integrating trees with crops)'." },
    ],
    questionsTFNG: [
      { q: "The number of people facing hunger decreased between 2019 and 2022.", correct: "FALSE", rationale: "The passage says hunger rose: from 613M (2019) to 735M (2022)." },
      { q: "Every 1°C temperature increase is estimated to reduce yields of wheat, rice, and maize by 6–10%.", correct: "TRUE", rationale: "The passage states exactly that." },
      { q: "Agroecology has been shown to double yields on smallholder farms within one year.", correct: "FALSE", rationale: "The passage says 'within a decade', not one year." },
      { q: "Gene editing (CRISPR) is a technology that can develop drought-resistant crop varieties.", correct: "TRUE", rationale: "The passage mentions 'Gene editing (CRISPR) can develop drought-tolerant or disease-resistant varieties'." },
    ],
    questionsSentence: [
      { q: "The Green Revolution model of farming is described as high-input, __, and is reaching ecological limits.", answer: "monoculture", rationale: "The phrase 'high-input, monoculture farming' appears in the second paragraph." },
      { q: "Approximately one-third of all food produced is __, representing a major inefficiency in the food system.", answer: "wasted", rationale: "The final paragraph notes 'reduced food waste (one-third of all food is wasted)'." },
    ],
    questionsHeadings: [
      { paragraph: "By 2050, the global population is projected to reach nearly 10 billion. Simultaneously, climate change is already disrupting agricultural systems... Yet after decades of progress, hunger is on the rise again...", options: ["A) The challenge of feeding a growing and hungry world", "B) How to eliminate all hunger by 2030", "C) The history of the Green Revolution", "D) Ocean dead zones and their causes"], correct: "A", rationale: "This paragraph sets up the dual challenge of population growth and climate change, plus rising hunger." },
      { paragraph: "Agroecological approaches offer a promising alternative. These include agroforestry... Studies from the UN Special Rapporteur show that agroecology can double yields within a decade on smallholder farms while restoring ecosystem services.", options: ["A) The limits of technology", "B) A return to traditional farming practices", "C) Agroecology as a viable solution", "D) The dangers of pesticides"], correct: "C", rationale: "This paragraph presents agroecology as a promising alternative with evidence." },
    ],
  },


  {
    id: 'passage_043',
    title: 'Ancient Echoes: Egypt, Greece, and Rome',
    topic: 'Ancient Civilisations',
    difficulty: 'hard',
    text: `The civilisations of ancient Egypt, Greece, and Rome have exerted a disproportionate influence on modern Western culture, politics, art, and philosophy. Though separated by thousands of years and distinct geographies, they shared a common Mediterranean cradle and a tendency towards monumental achievement. Their legacies are not merely academic curiosities but living foundations: from democratic institutions to architectural orders, from epic literature to legal codes.

Ancient Egypt, unified around 3100 BCE, lasted for over three millennia — one of the longest continuous civilisations in history. Its stability derived from the predictable flooding of the Nile, which enabled surplus agriculture and, in turn, a complex bureaucracy, monumental construction (pyramids, temples), and a sophisticated belief system focused on the afterlife. Egyptian hieroglyphs, deciphered after the Rosetta Stone discovery in 1799, record not only royal decrees but also medical texts, love poetry, and administrative records. The concept of 'ma'at' — truth, balance, cosmic order — infused law and governance.

Classical Greece (5th–4th centuries BCE) produced a cultural flowering that remains a touchstone. Athenian democracy, though limited to male citizens, introduced the idea of popular sovereignty and deliberation. Greek philosophy — Socrates, Plato, Aristotle — laid the groundwork for logic, ethics, metaphysics, and political theory. The Parthenon exemplifies classical ideals of proportion and harmony. Greek drama (Aeschylus, Sophocles, Euripides) explored fate, justice, and human nature. Yet Greece was also a collection of often-warring city-states, and its achievements rested on slave labour.

The Roman Republic (509–27 BCE) and the subsequent Roman Empire (27 BCE – 476 CE) transformed the Mediterranean world. Rome's genius lay in governance, law, engineering, and military organisation. The Latin legal tradition — concepts like 'innocent until proven guilty', contracts, and property rights — underpins many modern legal systems. Roman architecture (arches, concrete, aqueducts, roads) enabled urbanisation and defence. The Pax Romana, two centuries of relative peace, facilitated trade and cultural exchange. However, the empire also relied on slavery, conquest, and sometimes brutal suppression.

The influence of these civilisations permeates contemporary life. Renaissance humanism revived Greek and Roman learning. Neoclassical architecture adorns capitals from Washington, D.C. to Paris. Even the names of planets (Mercury, Venus, Mars, Jupiter, Saturn) echo Roman gods. Understanding ancient civilisations is not an escape into the past but a mirror for the present: their achievements inspire, their failures warn. In the words of classicist Edith Hamilton, 'The Greek miracle... was a new thing in the world: the creation of the intellect by the intellect.'`,
    questionsMCQ: [
      { q: "What factor contributed most to the longevity and stability of ancient Egyptian civilisation?", options: ["A) Military conquest of neighbouring empires.", "B) The predictable flooding of the Nile enabling surplus agriculture.", "C) Isolation from all other cultures.", "D) The invention of iron tools."], correct: "B", rationale: "The passage states: 'Its stability derived from the predictable flooding of the Nile, which enabled surplus agriculture.'" },
      { q: "What does the passage identify as a limitation of Athenian democracy?", options: ["A) It had no written laws.", "B) It was restricted to male citizens, excluding women, slaves, and foreigners.", "C) It only lasted for ten years.", "D) It was a monarchy in disguise."], correct: "B", rationale: "The passage says 'Athenian democracy, though limited to male citizens'." },
      { q: "According to the passage, which of the following was a Roman innovation that influenced later civilisations?", options: ["A) Nuclear power.", "B) The Latin legal tradition including concepts like 'innocent until proven guilty'.", "C) Steel production.", "D) The printing press."], correct: "B", rationale: "The passage highlights Roman legal tradition as underpinning modern systems." },
      { q: "The phrase 'ma'at' in ancient Egyptian culture refers to:", options: ["A) The name of a pharaoh.", "B) A building technique for pyramids.", "C) Truth, balance, and cosmic order.", "D) A type of hieroglyphic script."], correct: "C", rationale: "The passage defines 'ma'at' as 'truth, balance, cosmic order — infused law and governance.'" },
    ],
    questionsTFNG: [
      { q: "The Rosetta Stone allowed scholars to decipher Egyptian hieroglyphs in the 19th century.", correct: "TRUE", rationale: "The passage mentions the Rosetta Stone discovery in 1799 leading to decipherment." },
      { q: "Ancient Greece was a unified nation-state similar to modern Germany.", correct: "FALSE", rationale: "The passage says Greece was 'a collection of often-warring city-states', not a unified nation." },
      { q: "The Pax Romana was a period of constant warfare and instability.", correct: "FALSE", rationale: "The passage says the Pax Romana was 'two centuries of relative peace'." },
      { q: "Edith Hamilton described the Greek achievement as a miracle of the intellect.", correct: "TRUE", rationale: "The final quote: 'The Greek miracle... was a new thing in the world: the creation of the intellect by the intellect.'" },
    ],
    questionsSentence: [
      { q: "Ancient Egypt, unified around 3100 BCE, is described as one of the longest __ civilisations in history.", answer: "continuous", rationale: "The phrase: 'one of the longest continuous civilisations in history.'" },
      { q: "The period of relative peace established by Rome that facilitated trade and cultural exchange is known as the __.", answer: "Pax Romana", rationale: "The passage explicitly names the Pax Romana." },
    ],
    questionsHeadings: [
      { paragraph: "The civilisations of ancient Egypt, Greece, and Rome have exerted a disproportionate influence on modern Western culture... Their legacies are not merely academic curiosities but living foundations...", options: ["A) Why Rome fell", "B) The enduring legacy of ancient Mediterranean civilisations", "C) A comparison of Egyptian and Greek art", "D) The conquests of Alexander the Great"], correct: "B", rationale: "This paragraph introduces the lasting impact of these three civilisations." },
      { paragraph: "The influence of these civilisations permeates contemporary life. Renaissance humanism revived Greek and Roman learning... In the words of classicist Edith Hamilton...", options: ["A) Modern irrelevance of ancient history", "B) How to build a pyramid", "C) Ancient wisdom for the present", "D) A list of Roman emperors"], correct: "C", rationale: "This paragraph connects ancient achievements to modern culture and ends with Hamilton's quote." },
    ],
  }

); // end IELTS_READING_PASSAGES.push (batch 7)


// ══════════════════════════════════════════════════════════════════════
//  PASSAGES — Batch 8 (passages 44–50) — COMPLETES THE 50-PASSAGE BANK
// ══════════════════════════════════════════════════════════════════════
IELTS_READING_PASSAGES.push(

  {
    id: 'passage_044',
    title: 'The Infodemic: Fake News, Misinformation, and Media Literacy',
    topic: 'Media / Fake News',
    difficulty: 'medium',
    text: `The term 'fake news' entered popular lexicon during the 2016 US presidential election, but the phenomenon of misinformation is as old as communication itself. What distinguishes the current era is the scale, speed, and algorithmic amplification of false content. Social media platforms, optimised for engagement, reward sensationalism and outrage — precisely the emotional triggers that make misinformation go viral. Studies suggest that false stories on Twitter spread significantly farther, faster, and more broadly than the truth, a pattern confirmed across multiple domains from politics to health.

The consequences are not abstract. During the COVID-19 pandemic, the World Health Organisation coined the term 'infodemic' — an overabundance of information, some accurate, some not, that makes it hard for people to find trustworthy guidance. Fake cures, anti-vaccine conspiracy theories, and downplaying of public health measures directly contributed to preventable deaths. Similarly, in democratic societies, coordinated disinformation campaigns have been linked to reduced voter turnout, increased political polarisation, and even violence.

Why do people believe and share misinformation? Cognitive psychology offers several explanations. Confirmation bias leads individuals to accept information that aligns with pre-existing beliefs. The illusory truth effect means repeated exposure — even to false claims — increases perceived accuracy. Emotional resonance: content that evokes anger or fear is shared more readily. Moreover, the 'continued influence effect' shows that even after misinformation is corrected, its residual effects persist in memory, shaping attitudes and behaviour.

Solutions require a multi-pronged approach. Media literacy education — teaching critical evaluation skills — has shown modest but positive effects in randomised trials. Fact-checking organisations (Snopes, PolitiFact, Full Fact) help debunk false claims, though their reach is limited. Platform interventions include labelling disputed content, reducing algorithmic promotion of unverified sources, and removing repeat offenders. The European Union's Code of Practice on Disinformation mandates transparency for political ads. However, critics argue that content moderation risks censorship and that algorithms could be made more transparent without harming free expression.

Ultimately, individual responsibility and systemic reform must work in tandem. As legal scholar Cass Sunstein argues, a 'well-functioning system of free expression' requires both robust protections for speech and careful attention to the architecture of information. The fight against fake news is not a war to be won but a continuous effort to cultivate epistemic resilience — the capacity to discern, doubt, and deliberate in an age of information abundance.`,
    questionsMCQ: [
      { q: "What distinguishes the current phenomenon of fake news from historical misinformation?", options: ["A) It is entirely new and unprecedented.", "B) The scale, speed, and algorithmic amplification of false content.", "C) It only affects political content.", "D) Governments created all fake news."], correct: "B", rationale: "The passage states: 'What distinguishes the current era is the scale, speed, and algorithmic amplification of false content.'" },
      { q: "According to the passage, which emotional response makes misinformation particularly likely to be shared?", options: ["A) Joy and contentment.", "B) Surprise and wonder.", "C) Anger and fear.", "D) Sadness and nostalgia."], correct: "C", rationale: "The passage mentions 'emotional resonance: content that evokes anger or fear is shared more readily.'" },
      { q: "What is the 'illusory truth effect' as described in the passage?", options: ["A) People always tell the truth.", "B) Repeated exposure to a claim increases its perceived accuracy.", "C) Lies are always detected.", "D) Social media automatically deletes false content."], correct: "B", rationale: "The passage defines it as 'repeated exposure — even to false claims — increases perceived accuracy.'" },
      { q: "What does Cass Sunstein argue is needed for a 'well-functioning system of free expression'?", options: ["A) Complete deregulation of all speech.", "B) Only government control of media.", "C) Both robust speech protections and attention to information architecture.", "D) Abolition of all social media."], correct: "C", rationale: "The passage quotes Sunstein requiring 'both robust protections for speech and careful attention to the architecture of information.'" },
    ],
    questionsTFNG: [
      { q: "False stories on Twitter spread more slowly than true stories.", correct: "FALSE", rationale: "The passage states false stories spread 'significantly farther, faster, and more broadly than the truth.'" },
      { q: "The World Health Organisation coined the term 'infodemic' during the COVID-19 pandemic.", correct: "TRUE", rationale: "The passage says exactly that." },
      { q: "Media literacy education has been proven completely ineffective in all studies.", correct: "FALSE", rationale: "The passage says media literacy has shown 'modest but positive effects'." },
      { q: "The EU's Code of Practice on Disinformation applies only to traditional newspapers.", correct: "FALSE", rationale: "The passage mentions it mandates transparency for political ads on digital platforms, not traditional newspapers only." },
    ],
    questionsSentence: [
      { q: "The 'continued influence effect' shows that even after misinformation is corrected, its __ persist in memory.", answer: "residual effects", rationale: "The phrase in the passage is 'residual effects persist in memory.'" },
      { q: "The fight against fake news requires cultivating __ — the capacity to discern, doubt, and deliberate.", answer: "epistemic resilience", rationale: "The passage ends with 'epistemic resilience'." },
    ],
    questionsHeadings: [
      { paragraph: "Why do people believe and share misinformation? Cognitive psychology offers several explanations. Confirmation bias... The illusory truth effect... Emotional resonance... Moreover, the 'continued influence effect'...", options: ["A) The psychology of belief in falsehoods", "B) How to build a social media platform", "C) The history of journalism", "D) Legal responses to fake news"], correct: "A", rationale: "This paragraph lists cognitive biases explaining why people believe misinformation." },
      { paragraph: "Solutions require a multi-pronged approach. Media literacy education... Fact-checking organisations... Platform interventions... The European Union's Code of Practice... However, critics argue...", options: ["A) A single magic bullet", "B) Censorship as the only answer", "C) A toolkit of responses — from education to regulation", "D) Why nothing can be done"], correct: "C", rationale: "This paragraph lists multiple solutions (education, fact-checking, platform changes, regulations) — a multi-pronged toolkit." },
    ],
  },


  {
    id: 'passage_045',
    title: 'Mind Matters: Understanding Depression and the Promise of Therapy',
    topic: 'Mental Health',
    difficulty: 'medium',
    text: `Depression is more than sadness. The World Health Organisation (WHO) characterises it as a persistent low mood, loss of interest or pleasure (anhedonia), feelings of guilt or low self-worth, disturbed sleep or appetite, low energy, and poor concentration. Major depressive disorder (MDD) affects an estimated 280 million people globally, making it a leading cause of disability. Unlike fleeting sadness, which responds to circumstances, clinical depression often requires treatment and does not simply 'snap out'.

The aetiology of depression is biopsychosocial. Genetic vulnerability accounts for approximately 40% of risk, with specific genes affecting serotonin, dopamine, and norepinephrine pathways. Neuroimaging studies reveal reduced volume in the prefrontal cortex — responsible for executive function — and hyperactivity in the amygdala, the brain's fear centre. Stressful life events (trauma, loss, chronic adversity) interact with genetic predisposition to trigger episodes. Social determinants — poverty, isolation, discrimination — also play powerful roles.

Psychological therapies have proven as effective as medication for mild to moderate depression, with lower relapse rates. Cognitive Behavioural Therapy (CBT), the most widely studied, helps patients identify and restructure negative thought patterns. Interpersonal Therapy (IPT) focuses on relationship conflicts, role transitions, and grief. Behavioural Activation (BA) is simpler: scheduling pleasant or mastery activities to reverse the withdrawal spiral. Meta-analyses show that all three outperform waitlist controls, with effect sizes comparable to antidepressants.

Antidepressants, particularly selective serotonin reuptake inhibitors (SSRIs) like fluoxetine (Prozac) and sertraline (Zoloft), are first-line for moderate to severe depression. They typically take 2–4 weeks to show effect. However, side effects (nausea, weight gain, sexual dysfunction) and withdrawal symptoms limit adherence. For treatment-resistant depression, other options include electroconvulsive therapy (ECT), ketamine/esketamine (a rapid-acting NMDA antagonist), and transcranial magnetic stimulation (TMS).

Barriers to care remain formidable. Stigma prevents many from seeking help. Shortages of mental health professionals — especially in low-income countries, where there may be fewer than one psychiatrist per million people — create treatment gaps. Digital mental health interventions (apps, online CBT) show promise but have higher dropout rates. The WHO's Mental Health Gap Action Programme (mhGAP) trains non-specialist health workers to deliver brief psychological interventions. Expanding access, reducing stigma, and integrating mental health into primary care are essential steps. Depression is treatable, but only if those suffering can reach help.`,
    questionsMCQ: [
      { q: "What is one of the neuroimaging findings associated with depression mentioned in the passage?", options: ["A) Enlarged prefrontal cortex.", "B) Reduced volume in the prefrontal cortex.", "C) Complete absence of the amygdala.", "D) Increased serotonin production."], correct: "B", rationale: "The passage states: 'reduced volume in the prefrontal cortex' and 'hyperactivity in the amygdala'." },
      { q: "Which psychological therapy focuses on scheduling pleasant activities to reverse withdrawal?", options: ["A) Cognitive Behavioural Therapy (CBT).", "B) Interpersonal Therapy (IPT).", "C) Behavioural Activation (BA).", "D) Psychoanalysis."], correct: "C", rationale: "The passage describes BA as 'scheduling pleasant or mastery activities to reverse the withdrawal spiral.'" },
      { q: "What is a major barrier to mental health care identified in the passage?", options: ["A) Depression is untreatable.", "B) Stigma and shortage of professionals in low-income countries.", "C) All antidepressants are ineffective.", "D) Therapy has no scientific basis."], correct: "B", rationale: "The passage mentions stigma and shortages as barriers." },
      { q: "What does the WHO's mhGAP programme do?", options: ["A) Distributes free antidepressants worldwide.", "B) Trains non-specialist health workers to deliver brief psychological interventions.", "C) Builds psychiatric hospitals.", "D) Funds pharmaceutical research."], correct: "B", rationale: "The passage says mhGAP 'trains non-specialist health workers to deliver brief psychological interventions.'" },
    ],
    questionsTFNG: [
      { q: "Major depressive disorder affects approximately 280 million people globally.", correct: "TRUE", rationale: "The passage gives that exact number." },
      { q: "Antidepressants work immediately, usually within a few hours.", correct: "FALSE", rationale: "The passage says 'typically take 2–4 weeks to show effect.'" },
      { q: "Cognitive Behavioural Therapy is the only effective treatment for depression.", correct: "FALSE", rationale: "The passage lists multiple therapies (CBT, IPT, BA) and medications." },
      { q: "Low-income countries often have fewer than one psychiatrist per million people.", correct: "TRUE", rationale: "The passage mentions that as a fact." },
    ],
    questionsSentence: [
      { q: "Depression is characterised by persistent low mood and __, the loss of interest or pleasure.", answer: "anhedonia", rationale: "The passage defines anhedonia as loss of interest or pleasure." },
      { q: "Genetic vulnerability accounts for approximately __ percent of depression risk.", answer: "40", rationale: "The passage states 'approximately 40% of risk'." },
    ],
    questionsHeadings: [
      { paragraph: "The aetiology of depression is biopsychosocial. Genetic vulnerability accounts... Neuroimaging studies reveal... Stressful life events... Social determinants...", options: ["A) Biological causes only", "B) The multiple roots of depression", "C) Why therapy is useless", "D) A history of antidepressants"], correct: "B", rationale: "This paragraph discusses biological, psychological, and social factors — the biopsychosocial model." },
      { paragraph: "Barriers to care remain formidable. Stigma prevents... Shortages of mental health professionals... Digital mental health interventions show promise... The WHO's mhGAP...", options: ["A) A future without mental illness", "B) Obstacles and pathways to treatment", "C) The success of online CBT", "D) Why rich countries have no problems"], correct: "B", rationale: "This paragraph lists barriers and then presents solutions (mhGAP, digital interventions)." },
    ],
  },


  {
    id: 'passage_046',
    title: 'The Bilingual Brain: Cognitive Advantages and Neural Plasticity',
    topic: 'Language Acquisition / Bilingualism',
    difficulty: 'medium',
    text: `Half of the world's population is bilingual, able to communicate in two or more languages. Yet for much of the 20th century, bilingualism was viewed with suspicion — believed to cause confusion, cognitive delay, or even 'mental retardation'. This myth has been thoroughly debunked. Modern research, using neuroimaging and longitudinal behavioural studies, has revealed that bilingualism confers significant cognitive advantages across the lifespan, from infancy to old age.

The most robust finding is enhanced executive function. Bilinguals constantly manage two language systems, inhibiting one while activating the other. This mental juggling practice strengthens domain-general executive control: attention switching, conflict resolution, and working memory. Bilingual children outperform monolinguals on tasks requiring ignoring irrelevant information (e.g., the Stroop test). Bilingual adults show faster reaction times and more efficient neural activity in prefrontal regions. In older adults, bilingualism delays the onset of dementia symptoms by an average of 4–5 years, independent of education and socioeconomic status.

Neuroplasticity underlies these effects. Bilinguals have greater grey matter density in the left inferior parietal cortex and increased white matter integrity in tracts connecting frontal and temporal regions. While early bilinguals (acquiring two languages before age 5) show more native-like neural organisation, late bilinguals also demonstrate structural changes, though less pronounced. The critical period hypothesis — that language learning becomes difficult after puberty — has been modified; adults can achieve high proficiency, especially in immersion contexts, but rarely attain native-like phonology.

However, bilingualism is not without trade-offs. Bilinguals have smaller vocabularies in each language compared to monolinguals (though combined vocabulary is larger). They also experience more tip-of-the-tongue states — feeling that a word is known but momentarily inaccessible. Speech production is slightly slower, and lexical retrieval less automatic. These costs are modest and context-dependent, outweighed by cognitive benefits.

Implications for education are significant. Dual-language immersion programmes, where subjects are taught in two languages, produce academic outcomes equal to or better than monolingual instruction, while conferring bilingual proficiency. The myth that bilingual education confuses children or delays reading acquisition has no scientific basis. Rather, supporting home languages while teaching a dominant language promotes both academic success and cultural identity. As globalisation continues, bilingualism is not a deficit but an asset — a fitter brain for a connected world.`,
    questionsMCQ: [
      { q: "What was the historical view of bilingualism in the early 20th century?", options: ["A) It was considered beneficial for intelligence.", "B) It was thought to cause cognitive delay or 'mental retardation'.", "C) It was ignored entirely.", "D) It was mandatory in all schools."], correct: "B", rationale: "The passage states that bilingualism was 'believed to cause confusion, cognitive delay, or even mental retardation'." },
      { q: "What is the most robust cognitive advantage associated with bilingualism?", options: ["A) Larger vocabulary in each language.", "B) Enhanced executive function, including attention switching and conflict resolution.", "C) Faster speech production.", "D) Superior musical ability."], correct: "B", rationale: "The passage says 'the most robust finding is enhanced executive function' and lists attention switching, conflict resolution, working memory." },
      { q: "By how many years does bilingualism delay the onset of dementia symptoms on average?", options: ["A) 1–2 years.", "B) 2–3 years.", "C) 4–5 years.", "D) 10–12 years."], correct: "C", rationale: "The passage says 'delays the onset of dementia symptoms by an average of 4–5 years'." },
      { q: "What limitation do even highly proficient late bilinguals typically experience compared to early bilinguals?", options: ["A) They cannot learn any new words.", "B) They rarely attain native-like phonology (accent).", "C) They lose their first language completely.", "D) They have lower IQ."], correct: "B", rationale: "The passage notes late bilinguals 'rarely attain native-like phonology.'" },
    ],
    questionsTFNG: [
      { q: "Bilingual children outperform monolinguals on tasks requiring ignoring irrelevant information.", correct: "TRUE", rationale: "The passage gives the Stroop test as an example." },
      { q: "Bilinguals have larger combined vocabulary across both languages than monolinguals have in their single language.", correct: "TRUE", rationale: "The passage says 'combined vocabulary is larger.'" },
      { q: "The critical period hypothesis has been completely disproven in all aspects.", correct: "FALSE", rationale: "The passage says the hypothesis 'has been modified' and that adults rarely attain native-like phonology, so not completely disproven." },
      { q: "Dual-language immersion programmes produce worse academic outcomes than monolingual instruction.", correct: "FALSE", rationale: "The passage says outcomes are 'equal to or better than monolingual instruction'." },
    ],
    questionsSentence: [
      { q: "Bilinguals show greater grey matter density in the left inferior __ cortex.", answer: "parietal", rationale: "The phrase is 'left inferior parietal cortex'." },
      { q: "Bilinguals experience more __ states, feeling that a word is known but momentarily inaccessible.", answer: "tip-of-the-tongue", rationale: "The passage uses the phrase 'tip-of-the-tongue states'." },
    ],
    questionsHeadings: [
      { paragraph: "Half of the world's population is bilingual... Yet for much of the 20th century, bilingualism was viewed with suspicion... Modern research has revealed that bilingualism confers significant cognitive advantages...", options: ["A) A history of language policy", "B) From myth to evidence: the cognitive benefits of bilingualism", "C) Why monolingualism is superior", "D) The impossibility of learning two languages"], correct: "B", rationale: "This paragraph contrasts historical myths with modern evidence of benefits." },
      { paragraph: "However, bilingualism is not without trade-offs. Bilinguals have smaller vocabularies in each language... They also experience more tip-of-the-tongue states... These costs are modest... outweighed by cognitive benefits.", options: ["A) The heavy price of bilingualism", "B) Small costs in a sea of benefits", "C) Why everyone should be monolingual", "D) How to lose your first language"], correct: "B", rationale: "This paragraph acknowledges trade-offs but emphasises they are modest and outweighed." },
    ],
  },


  {
    id: 'passage_047',
    title: 'The Science of Sleep: Restoring Body and Mind',
    topic: 'Sleep Science',
    difficulty: 'medium',
    text: `Sleep is not merely a passive state of unconsciousness but an active, dynamic process essential for survival. Humans spend approximately one-third of their lives asleep — a significant evolutionary investment that suggests profound biological functions. Modern neuroscience has revealed that sleep serves multiple restorative roles: memory consolidation, metabolic regulation, immune function, and brain waste clearance.

The two main sleep stages are non-rapid eye movement (NREM) and rapid eye movement (REM). NREM sleep, particularly slow-wave sleep (SWS), dominates the first half of the night and is crucial for declarative memory (facts, events). During SWS, the hippocampus replays daily experiences, transferring them to the neocortex for long-term storage. REM sleep, characterised by rapid eye movements and vivid dreaming, occupies the latter half and supports procedural memory (skills, habits) and emotional processing. Sleep deprivation impairs both types of memory.

One of the most striking discoveries is the glymphatic system — a brain-wide clearance pathway active primarily during sleep. Cerebrospinal fluid flows through the brain, washing away metabolic waste products including beta-amyloid and tau proteins, which accumulate in Alzheimer's disease. Chronic sleep restriction may therefore increase dementia risk. Indeed, epidemiological studies show that adults sleeping less than 6 hours per night have a 30% higher risk of developing Alzheimer's compared to those sleeping 7–8 hours.

Sleep duration recommendations vary by age. The National Sleep Foundation advises 7–9 hours for adults, 8–10 for teenagers, and 9–12 for school-aged children. Yet modern lifestyles — artificial light, shift work, screen time before bed — have eroded sleep duration. Over one-third of adults report sleeping less than the recommended minimum. The economic costs are staggering: lost productivity, workplace accidents, and healthcare utilisation. In the US alone, insufficient sleep costs an estimated $411 billion annually.

Addressing the sleep crisis requires both individual and societal changes. Personal sleep hygiene includes consistent bedtimes, dark cool bedrooms, limiting caffeine and alcohol, and avoiding screens before bed. At the policy level, later school start times for adolescents (who have delayed circadian rhythms) improve academic performance and reduce car crashes. Workplace flexibility and public awareness campaigns can shift cultural norms. Sleep is not a luxury; it is a biological necessity. As sleep scientist Matthew Walker warns, 'The decimation of sleep throughout industrialised nations is having a catastrophic impact on our health, our life expectancy, our safety, our productivity, and the education of our children.'`,
    questionsMCQ: [
      { q: "What is the function of the glymphatic system as described in the passage?", options: ["A) To produce cerebrospinal fluid.", "B) To clear metabolic waste products from the brain, especially during sleep.", "C) To regulate body temperature.", "D) To store memories."], correct: "B", rationale: "The passage states the glymphatic system 'washes away metabolic waste products including beta-amyloid and tau proteins'." },
      { q: "Which stage of sleep is most associated with declarative memory consolidation?", options: ["A) REM sleep.", "B) Non-REM sleep, specifically slow-wave sleep (SWS).", "C) Light NREM stage 1.", "D) Dreamless sleep only."], correct: "B", rationale: "The passage says: 'NREM sleep, particularly slow-wave sleep (SWS), is crucial for declarative memory.'" },
      { q: "According to epidemiological studies, what is the increased risk of Alzheimer's for adults sleeping less than 6 hours per night?", options: ["A) 10%.", "B) 30%.", "C) 50%.", "D) 100%."], correct: "B", rationale: "The passage gives the figure of 30% higher risk." },
      { q: "What policy change does the author recommend to improve adolescent sleep health?", options: ["A) Banning all screen use.", "B) Later school start times.", "C) Mandatory napping at work.", "D) Prescribing sleeping pills for all teenagers."], correct: "B", rationale: "The passage explicitly mentions 'later school start times for adolescents'." },
    ],
    questionsTFNG: [
      { q: "REM sleep mostly occurs in the first half of the night.", correct: "FALSE", rationale: "The passage says REM sleep 'occupies the latter half' of the night." },
      { q: "The glymphatic system is only active during wakefulness.", correct: "FALSE", rationale: "It is 'active primarily during sleep.'" },
      { q: "The National Sleep Foundation recommends 7–9 hours of sleep for adults.", correct: "TRUE", rationale: "The passage states that recommendation." },
      { q: "Insufficient sleep costs the US economy approximately $411 billion annually.", correct: "TRUE", rationale: "The passage gives that figure." },
    ],
    questionsSentence: [
      { q: "During slow-wave sleep, the __ replays daily experiences, transferring them to the neocortex.", answer: "hippocampus", rationale: "The passage: 'the hippocampus replays daily experiences'." },
      { q: "Matthew Walker warns that the decimation of sleep is having a catastrophic impact on health, life expectancy, safety, productivity, and __.", answer: "the education of our children", rationale: "The quote at the end includes that phrase." },
    ],
    questionsHeadings: [
      { paragraph: "Sleep duration recommendations vary by age... Yet modern lifestyles have eroded sleep duration. Over one-third of adults report sleeping less than the recommended minimum. The economic costs are staggering... $411 billion annually.", options: ["A) The ideal sleep duration for everyone", "B) Sleep debt and its economic toll", "C) How to fall asleep faster", "D) The benefits of napping"], correct: "B", rationale: "This paragraph focuses on how many people are sleep-deprived and the economic costs." },
      { paragraph: "Addressing the sleep crisis requires both individual and societal changes. Personal sleep hygiene includes... At the policy level, later school start times... Sleep is not a luxury; it is a biological necessity.", options: ["A) A personal problem only", "B) Individual and collective solutions to the sleep crisis", "C) Why sleep is a waste of time", "D) The history of sleep research"], correct: "B", rationale: "This paragraph lists both individual and policy solutions." },
    ],
  },


  {
    id: 'passage_048',
    title: 'The Sixth Extinction: Biodiversity Loss in the Anthropocene',
    topic: 'Biodiversity / Extinction',
    difficulty: 'medium',
    text: `Earth has experienced five mass extinction events in its 4.5-billion-year history, each wiping out over 75% of species. Evidence increasingly suggests that a sixth mass extinction is already underway — this time caused not by asteroids or volcanism, but by a single species: Homo sapiens. The current rate of species extinction is estimated to be 100 to 1,000 times higher than the natural background rate, a pace unprecedented since the demise of the dinosaurs 66 million years ago.

The primary drivers are well-established. Habitat loss, driven by agriculture, logging, and urban expansion, tops the list. Over 70% of tropical deforestation is linked to cattle ranching, soybean cultivation, and palm oil production. Overexploitation — hunting, fishing, poaching — has decimated species from passenger pigeons to vaquita porpoises. Climate change is rapidly becoming a dominant threat: rising temperatures shift habitats faster than many species can adapt. In Australia, the 2019–2020 bushfires pushed dozens of species closer to extinction. Pollution, invasive species, and disease complete the picture.

The consequences of biodiversity loss are not merely aesthetic. Ecosystem services valued at over $125 trillion annually — pollination, water purification, carbon sequestration, soil formation — depend on diverse biological communities. Pollinator decline threatens $500 billion in crop production each year. Loss of coastal mangroves and coral reefs increases vulnerability to storm surges. The recent emergence of zoonotic diseases (COVID-19, Ebola, Nipah) is linked to habitat encroachment and wildlife trade. In short, we are sawing off the branch we sit on.

Conservation efforts have achieved notable successes. Protected areas now cover 15% of land and 7% of oceans. The Convention on Biological Diversity's Aichi Targets, though largely missed, were succeeded by the Kunming-Montreal Global Biodiversity Framework (2022), which aims to protect 30% of land and oceans by 2030 (30x30). Species-specific interventions — captive breeding, anti-poaching patrols, wildlife corridors — have saved the giant panda, Arabian oryx, and California condor from extinction.

Yet much more is needed. To bend the curve of biodiversity loss, experts call for transformative change: reducing consumption in wealthy nations, shifting to plant-based diets, eliminating subsidies for environmentally harmful industries, and integrating biodiversity into economic accounting. As E.O. Wilson famously argued, we need 'half-earth' — setting aside half the planet for nature. Whether we can summon the will before it is too late remains the defining environmental question of our era.`,
    questionsMCQ: [
      { q: "What is the estimated current rate of species extinction compared to the natural background rate?", options: ["A) 10 to 50 times higher.", "B) 100 to 1,000 times higher.", "C) 10,000 to 100,000 times higher.", "D) Approximately the same."], correct: "B", rationale: "The passage says '100 to 1,000 times higher than the natural background rate'." },
      { q: "According to the passage, which human activity is the largest driver of tropical deforestation?", options: ["A) Mining.", "B) Urban expansion.", "C) Cattle ranching, soybean cultivation, and palm oil production.", "D) Tourism infrastructure."], correct: "C", rationale: "The passage notes 'Over 70% of tropical deforestation is linked to cattle ranching, soybean cultivation, and palm oil production.'" },
      { q: "What is the target of the Kunming-Montreal Global Biodiversity Framework?", options: ["A) Protect 50% of land and oceans by 2025.", "B) Protect 30% of land and oceans by 2030.", "C) End all deforestation by 2020.", "D) Achieve zero extinctions by 2050."], correct: "B", rationale: "The passage states the framework aims to 'protect 30% of land and oceans by 2030 (30x30)'." },
      { q: "What value of ecosystem services is cited in the passage?", options: ["A) $50 trillion annually.", "B) $125 trillion annually.", "C) $500 billion annually.", "D) $1 trillion annually."], correct: "B", rationale: "The passage: 'Ecosystem services valued at over $125 trillion annually'." },
    ],
    questionsTFNG: [
      { q: "There have been five previous mass extinction events in Earth's history.", correct: "TRUE", rationale: "The first sentence states that." },
      { q: "The Aichi Targets for biodiversity protection were fully achieved by 2020.", correct: "FALSE", rationale: "The passage says they were 'largely missed'." },
      { q: "The giant panda has been brought back from the brink of extinction through conservation measures.", correct: "TRUE", rationale: "The species is listed as a conservation success story." },
      { q: "E.O. Wilson argued that setting aside 10% of the planet for nature would be sufficient.", correct: "FALSE", rationale: "Wilson argued for 'half-earth' (50%), not 10%." },
    ],
    questionsSentence: [
      { q: "The emergence of zoonotic diseases such as COVID-19 is linked to habitat encroachment and the __.", answer: "wildlife trade", rationale: "The passage mentions 'habitat encroachment and wildlife trade'." },
      { q: "The Kunming-Montreal framework aims to protect 30% of land and oceans by 2030, also known as the __ target.", answer: "30x30", rationale: "The passage uses the shorthand '30x30'." },
    ],
    questionsHeadings: [
      { paragraph: "Earth has experienced five mass extinction events... Evidence increasingly suggests that a sixth mass extinction is already underway — this time caused not by asteroids or volcanism, but by a single species: Homo sapiens.", options: ["A) Natural causes of extinction", "B) The Anthropocene extinction: humans as a geological force", "C) How to save all species", "D) The success of conservation"], correct: "B", rationale: "This paragraph introduces the sixth extinction caused by humans." },
      { paragraph: "Yet much more is needed. To bend the curve of biodiversity loss, experts call for transformative change... As E.O. Wilson famously argued, we need 'half-earth'...", options: ["A) Small adjustments are enough", "B) The need for radical change and half-earth", "C) Why biodiversity loss is irreversible", "D) The success of protected areas"], correct: "B", rationale: "This paragraph calls for transformative change and mentions half-earth." },
    ],
  },


  {
    id: 'passage_049',
    title: 'The Wealth Gap: Inequality and Poverty in the Modern Economy',
    topic: 'Inequality / Poverty',
    difficulty: 'medium',
    text: `Economic inequality has risen sharply in most advanced economies since the 1980s. The top 1% of earners in the United States now capture nearly 20% of national income, up from 10% in 1980. In the United Kingdom, France, and Germany, the increase has been less dramatic but still significant. Meanwhile, global poverty has declined dramatically — from 36% of the world population living in extreme poverty (under $1.90 per day) in 1990 to under 10% today — driven largely by growth in China and India. Yet progress within countries has been uneven, and relative poverty (living below 60% of median income) remains stubbornly high in many nations.

What explains rising inequality? Economists point to several structural factors. Technological change increasingly favours skilled labour, automating routine tasks while complementing high-skill workers. The 'skill-biased technical change' hypothesis explains the widening gap between college graduates and non-graduates. Globalisation — specifically offshoring and trade liberalisation — has reduced demand for manufacturing workers in rich countries while benefiting consumers and capital owners. The decline of labour unions and the erosion of minimum wage purchasing power have shifted bargaining power away from workers. Finally, financialisation and the rise of 'superstar' firms have concentrated wealth among owners and top executives.

The consequences of high inequality extend beyond fairness. Unequal societies experience worse health outcomes, lower social mobility, and higher rates of crime and mental illness, as documented in The Spirit Level by Wilkinson and Pickett. Political polarisation and populism are partly driven by economic grievances. The Occupy movement's slogan 'We are the 99%' captured a widespread sense that the system is rigged. Moreover, high inequality can reduce aggregate demand — since wealthy households save a larger share of income — potentially slowing economic growth.

Policy responses vary by ideology. Redistribution through progressive taxation and cash transfers (welfare benefits, child allowances) is the classic social-democratic remedy. Nordic countries combine high taxes with generous public services and have achieved low inequality without sacrificing growth. The earned income tax credit (EITC) in the US supplements wages for low-income workers. Minimum wage increases, sectoral bargaining, and union strengthening address pre-distribution — earnings before taxes. Investment in education and training can mitigate skill gaps. Wealth taxes on large fortunes have been proposed but face implementation challenges and capital flight risks.

Poverty alleviation has also benefited from targeted interventions. Conditional cash transfers (CCTs) programmes like Brazil's Bolsa Família and Mexico's Prospera provide cash to poor families contingent on children's school attendance and health check-ups — proven to reduce poverty and improve human capital. Universal basic income (UBI) experiments are underway, though results on employment effects are mixed. The UN's Sustainable Development Goal 1 aims to end extreme poverty by 2030, but recent setbacks from COVID-19 and conflict have stalled progress. As economist Angus Deaton warns, 'Progress is not inevitable; it can be reversed.'`,
    questionsMCQ: [
      { q: "According to the passage, what share of national income does the top 1% of earners in the US now capture?", options: ["A) 10%.", "B) 15%.", "C) Nearly 20%.", "D) 30%."], correct: "C", rationale: "The passage states 'nearly 20% of national income'." },
      { q: "What does the 'skill-biased technical change' hypothesis explain?", options: ["A) Why robots will replace all humans.", "B) The widening gap between college graduates and non-graduates.", "C) Why skilled workers earn less.", "D) The decline of the internet."], correct: "B", rationale: "The passage explicitly explains skill-biased technical change as explaining the gap between college graduates and non-graduates." },
      { q: "Which policy is described as a 'pre-distribution' measure?", options: ["A) Progressive income tax.", "B) Wealth taxes.", "C) Minimum wage increases and union strengthening.", "D) Universal basic income."], correct: "C", rationale: "The passage says 'Minimum wage increases, sectoral bargaining, and union strengthening address pre-distribution — earnings before taxes.'" },
      { q: "What is a condition of the conditional cash transfer (CCT) programmes mentioned?", options: ["A) Adults must work full-time.", "B) Children's school attendance and health check-ups.", "C) Home ownership.", "D) Voting in elections."], correct: "B", rationale: "The passage says 'contingent on children's school attendance and health check-ups'." },
    ],
    questionsTFNG: [
      { q: "Global extreme poverty has increased since 1990.", correct: "FALSE", rationale: "The passage says it declined from 36% to under 10%." },
      { q: "The Spirit Level by Wilkinson and Pickett found that unequal societies have better health outcomes.", correct: "FALSE", rationale: "The passage says 'worse health outcomes'." },
      { q: "Nordic countries have achieved low inequality without sacrificing economic growth.", correct: "TRUE", rationale: "The passage states they 'have achieved low inequality without sacrificing growth'." },
      { q: "Universal basic income trials have shown consistently positive effects on employment.", correct: "FALSE", rationale: "The passage says 'results on employment effects are mixed' — not consistently positive." },
    ],
    questionsSentence: [
      { q: "The Occupy movement's slogan 'We are the __' captured a widespread sense that the system is rigged.", answer: "99%", rationale: "The passage quotes 'We are the 99%'." },
      { q: "Angus Deaton warns that 'Progress is not inevitable; it can be __'.", answer: "reversed", rationale: "The exact quote ends with 'reversed'." },
    ],
    questionsHeadings: [
      { paragraph: "What explains rising inequality? Economists point to several structural factors. Technological change... Globalisation... The decline of labour unions... Finally, financialisation and the rise of 'superstar' firms...", options: ["A) The causes of growing economic divides", "B) Why inequality is good for growth", "C) The end of poverty", "D) A single factor explanation"], correct: "A", rationale: "This paragraph lists multiple causes of rising inequality." },
      { paragraph: "Policy responses vary by ideology. Redistribution through progressive taxation... Nordic countries... Minimum wage increases... Investment in education... Wealth taxes...", options: ["A) Only one policy works", "B) A toolkit of inequality-reduction measures", "C) Why taxes are theft", "D) The inevitability of inequality"], correct: "B", rationale: "This paragraph presents a range of policy tools." },
    ],
  },


  {
    id: 'passage_050',
    title: 'Made in the World: Global Trade, Supply Chains, and Globalisation',
    topic: 'Global Trade / Globalisation',
    difficulty: 'medium',
    text: `Globalisation — the increasing integration of economies, cultures, and political systems — has transformed the world since the late 20th century. The volume of world trade has grown from $6 trillion in 1990 to over $28 trillion in 2022, far outpacing global GDP growth. This expansion has lifted billions out of poverty, lowered consumer prices, and spread technology and ideas. Yet it has also created winners and losers, fuelled backlash, and exposed vulnerabilities in tightly coupled supply chains.

The rise of global value chains (GVCs) is a defining feature. A single product — say, an iPhone — is designed in California, uses chips from Taiwan and South Korea, glass from Japan, assembly in China, and software from India. Such fragmentation allows firms to exploit comparative advantages across borders, reducing costs and increasing efficiency. GVCs now account for nearly 70% of global trade, up from 40% in 1990. However, they also transmit shocks: the 2011 Thai floods disrupted hard drive production worldwide; COVID-19 lockdowns exposed over-reliance on Chinese manufacturing; the Suez Canal blockage in 2021 delayed $9 billion in daily trade.

International institutions facilitate and regulate global trade. The World Trade Organization (WTO), successor to GATT, sets rules, adjudicates disputes, and hosts negotiating rounds. Regional agreements — EU single market, USMCA (formerly NAFTA), RCEP in Asia — go deeper than WTO rules. Critics argue that trade agreements have benefited corporations at the expense of workers and the environment. Proponents counter that trade reduces poverty and fosters cooperation, reducing the likelihood of war.

Globalisation's critics have gained political traction. The 'China shock' — the rapid surge in Chinese exports after its 2001 WTO accession — devastated manufacturing employment in the US Rust Belt and parts of Europe. Studies estimate it cost 1–2 million US jobs, contributing to political realignment and the rise of populism. The Brexit vote (2016) and Trump's election were partly reactions against perceived trade-related harms. In response, many countries have pursued industrial policy and reshoring — bringing production back home — though economists warn this would increase costs for consumers.

The future of globalisation is uncertain but likely to be 'slobalisation' — slower, more regional, and with greater emphasis on resilience and security. The pandemic and Russia's invasion of Ukraine have accelerated deglobalisation trends: trade in goods has stabilised as a share of GDP, while trade in services (digital) continues to grow. New alliances (e.g., the Indo-Pacific Economic Framework) aim to rebuild supply chains on trusted terms. Globalisation is not ending, but it is being remade — less naïve, more pragmatic, and aware that its benefits are not automatic or evenly distributed.`,
    questionsMCQ: [
      { q: "What was the volume of world trade in 2022 according to the passage?", options: ["A) $6 trillion.", "B) $15 trillion.", "C) Over $28 trillion.", "D) $50 trillion."], correct: "C", rationale: "The passage states 'over $28 trillion in 2022'." },
      { q: "What percentage of global trade do global value chains (GVCs) account for?", options: ["A) 40%.", "B) 50%.", "C) 60%.", "D) Nearly 70%."], correct: "D", rationale: "The passage says 'GVCs now account for nearly 70% of global trade'." },
      { q: "What is the 'China shock' as described in the passage?", options: ["A) A financial crisis in Chinese banks.", "B) The rapid surge in Chinese exports after WTO accession, which devastated manufacturing jobs elsewhere.", "C) An earthquake in Sichuan.", "D) A Chinese technological breakthrough."], correct: "B", rationale: "The passage defines China shock as the surge in exports after 2001 WTO accession that cost manufacturing jobs." },
      { q: "What does the term 'slobalisation' refer to?", options: ["A) The end of all international trade.", "B) Slower, more regional globalisation with emphasis on resilience.", "C) A new currency.", "D) The speed of digital payments."], correct: "B", rationale: "The passage defines 'slobalisation' as 'slower, more regional, and with greater emphasis on resilience and security.'" },
    ],
    questionsTFNG: [
      { q: "World trade volume has grown faster than global GDP since 1990.", correct: "TRUE", rationale: "The passage says trade growth 'far outpacing global GDP growth'." },
      { q: "The 2011 Thai floods had no impact on global supply chains.", correct: "FALSE", rationale: "The passage says they 'disrupted hard drive production worldwide'." },
      { q: "The Suez Canal blockage in 2021 delayed $9 billion in daily trade.", correct: "TRUE", rationale: "The passage gives that figure." },
      { q: "The WTO has been replaced by the Indo-Pacific Economic Framework.", correct: "FALSE", rationale: "The passage mentions both as coexisting; WTO is not replaced." },
    ],
    questionsSentence: [
      { q: "An iPhone is designed in California, uses chips from Taiwan and South Korea, glass from Japan, assembly in China, and software from __.", answer: "India", rationale: "The passage lists India for software." },
      { q: "The US __ region experienced devastating manufacturing job losses due to the China shock.", answer: "Rust Belt", rationale: "The passage mentions 'US Rust Belt'." },
    ],
    questionsHeadings: [
      { paragraph: "The rise of global value chains (GVCs) is a defining feature. A single product — say, an iPhone —... Such fragmentation allows firms... reducing costs... However, they also transmit shocks: the 2011 Thai floods... COVID-19... Suez Canal blockage...", options: ["A) The vulnerability of interconnected production", "B) How to build a car alone", "C) The benefits of isolationism", "D) A single-country supply chain"], correct: "A", rationale: "This paragraph explains both the efficiency of GVCs and their vulnerability to shocks." },
      { paragraph: "The future of globalisation is uncertain but likely to be 'slobalisation' — slower, more regional... The pandemic and Russia's invasion of Ukraine have accelerated deglobalisation trends... Globalisation is not ending, but it is being remade...", options: ["A) The end of globalisation", "B) A new phase: slower and more pragmatic", "C) Why regionalisation is impossible", "D) The success of the WTO"], correct: "B", rationale: "This paragraph discusses the evolution towards slower, more regional globalisation." },
    ],
  }

); // end IELTS_READING_PASSAGES.push — 50-PASSAGE BANK COMPLETE


// ============================================================
// IELTS LISTENING MODULE
// ============================================================

// ── Listening State ───────────────────────────────────────────
let _ieltsListeningState = {
  section:      1,
  clip:         null,
  questions:    [],
  answers:      {},
  utterance:    null,
  playing:      false,
  playbackDone: false,
};

// ── Listening Clips Bank ──────────────────────────────────────
const IELTS_LISTENING_CLIPS = [
  // ========== SECTION 1 ==========
  {
    section: 1, id: 'l1_01',
    topic: 'Booking a hotel room',
    script: `Receptionist: Good morning, Maple Inn, how can I help you? Caller: Hi, I'd like to book a room for two nights, please. From the 14th to the 16th of June. Receptionist: Of course. What type of room would you prefer — single, double, or twin? Caller: A double room, please. Do you have one with a sea view? Receptionist: Yes, we do. The sea-view double is £120 per night, including breakfast. Caller: That sounds great. And is parking available? Receptionist: Yes, free parking for hotel guests. May I take your name? Caller: It's Harrison. James Harrison. Receptionist: And a contact number? Caller: 07823 441 990. Receptionist: Perfect. So that's a sea-view double from the 14th for two nights, under James Harrison. Caller: Yes, that's right. Thank you!`,
    questions: [
      { type: 'fill', q: 'The caller wants a ________ room with a sea view.', answer: 'double', hint: 'Type of room' },
      { type: 'fill', q: 'The price per night, including breakfast, is £________.', answer: '120', hint: 'Number' },
      { type: 'mcq', q: 'What dates is the room booked for?', options: ['13th–15th June', '14th–16th June', '15th–17th June', '14th–15th June'], correct: 1 },
      { type: 'mcq', q: 'What is included with the room?', options: ['Dinner only', 'Breakfast only', 'Breakfast and dinner', 'No meals'], correct: 1 },
      { type: 'fill', q: "The caller's surname is ________.", answer: 'Harrison', hint: 'Surname' },
      { type: 'mcq', q: "What is the caller's contact number?", options: ['07823 441 990', '07823 441 919', '07832 441 990', '07823 414 990'], correct: 0 },
      { type: 'mcq', q: 'How many nights will the caller stay?', options: ['One', 'Two', 'Three', 'Four'], correct: 1 },
      { type: 'fill', q: 'The hotel name is ________ Inn.', answer: 'Maple', hint: 'Name of the hotel' },
    ],
  },
  {
    section: 1, id: 'l1_02',
    topic: 'Registering at a library',
    script: `Librarian: Welcome to Westfield Public Library. Are you registering as a new member? Student: Yes, please. I just moved to the area. Librarian: Great! I'll need your full name and address. Student: Emily Chen. I'm at 34 Oak Street, Westfield, WF4 2BT. Librarian: Thank you. And do you have a form of ID? Student: I have my student card from Westfield University. Librarian: That's perfect. With a student card you get extended loans — 4 weeks instead of 2. You can borrow up to 8 books at a time. Student: Oh wonderful. Can I also access online journals? Librarian: Yes, through our website. You'll receive a PIN by email within 24 hours. Student: And is there a fee? Librarian: Membership is completely free. There's only a fine of 20 pence per day for late returns. Student: Great, thank you so much.`,
    questions: [
      { type: 'fill', q: "The student's postcode is ________.", answer: 'WF4 2BT', hint: 'UK postcode' },
      { type: 'mcq', q: 'How long is the loan period for a student?', options: ['1 week', '2 weeks', '3 weeks', '4 weeks'], correct: 3 },
      { type: 'fill', q: 'Students can borrow up to ________ books at one time.', answer: '8', hint: 'Number' },
      { type: 'mcq', q: 'What is the daily fine for late returns?', options: ['10p', '15p', '20p', '25p'], correct: 2 },
      { type: 'mcq', q: 'How will the student receive their online PIN?', options: ['By post', 'By text message', 'By email', 'In person'], correct: 2 },
      { type: 'fill', q: "The student's first name is ________.", answer: 'Emily', hint: 'First name' },
      { type: 'mcq', q: 'What ID does the student provide?', options: ["Driver's licence", 'Passport', 'Student card', 'Library card'], correct: 2 },
      { type: 'mcq', q: 'What is the membership fee?', options: ['£5/year', '£10/year', '£2/month', 'Free'], correct: 3 },
    ],
  },
  // ========== SECTION 2 ==========
  {
    section: 2, id: 'l2_01',
    topic: 'Community centre tour guide talk',
    script: `Guide: Good afternoon everyone, and welcome to the Greenpark Community Centre. I'm going to give you a quick overview of what we offer. As you come in through the main entrance, you'll find the reception on your left, where you can sign up for any of our classes. We run over 40 weekly sessions ranging from yoga to pottery. Most classes cost between £5 and £8 per session, but we offer a concession rate of 50% off for students and pensioners. Moving along the corridor, you'll pass the sports hall — it holds up to 200 people and can be hired for events at £150 per hour on weekdays, or £200 at weekends. Upstairs, we have a fully equipped gym open from 6 am to 10 pm daily, and a café serving hot meals from 8 am to 4 pm. Our newest addition is the digital skills suite on the ground floor — 20 computers available free of charge for residents to use. It's open Monday to Saturday, 9 am to 5 pm. Finally, don't forget our summer fair on the 3rd of August. Admission is free and all are welcome. Thank you for joining us today!`,
    questions: [
      { type: 'mcq', q: 'Where is the reception located?', options: ['Right of entrance', 'Left of entrance', 'Upstairs', 'In corridor'], correct: 1 },
      { type: 'fill', q: 'The concession discount is ________%.', answer: '50', hint: 'Percentage' },
      { type: 'fill', q: 'Weekday sports hall hire: £________ per hour.', answer: '150', hint: 'Number' },
      { type: 'mcq', q: 'What time does the café close?', options: ['2 pm', '3 pm', '4 pm', '5 pm'], correct: 2 },
      { type: 'fill', q: 'Summer fair is on the ________ of August.', answer: '3rd', hint: 'Ordinal date' },
      { type: 'mcq', q: 'How many computers are in the digital suite?', options: ['10', '15', '20', '25'], correct: 2 },
      { type: 'mcq', q: 'The gym opens at what time?', options: ['5 am', '6 am', '7 am', '8 am'], correct: 1 },
      { type: 'fill', q: 'Weekend sports hall hire costs £________ per hour.', answer: '200', hint: 'Number' },
    ],
  },
  {
    section: 2, id: 'l2_02',
    topic: 'Museum audio guide: Ancient Egypt exhibit',
    script: `Welcome to the Ancient Egypt gallery. As you enter, you'll see the sarcophagus of Pharaoh Ramses II to your left — it dates back to 1213 BC. In the central case you'll find the famous golden death mask of Tutankhamun, discovered in 1922 by Howard Carter. To your right is the Book of the Dead scroll — one of the longest surviving papyri, measuring over 12 metres. The hieroglyphs describe the journey to the afterlife. Now move to the next room — the Amarna period collection. Here you'll see statues of Akhenaten and Nefertiti. What's unusual? The artistic style is more naturalistic than the rigid forms of earlier dynasties. Finally, the daily life section: tools, bread-making models, and a replica of a farmer's house. Notice the shaduf — a water-lifting device used for irrigation since 1500 BC. Children often ask: how heavy was the bucket? About 20 litres of water — that's roughly 20 kilograms. Thank you for visiting. The exhibit closes at 5:30 pm.`,
    questions: [
      { type: 'mcq', q: "Who discovered Tutankhamun's mask?", options: ['Ramses II', 'Howard Carter', 'Akhenaten', 'Nefertiti'], correct: 1 },
      { type: 'fill', q: 'The Book of the Dead scroll measures over ________ metres.', answer: '12', hint: 'Number' },
      { type: 'mcq', q: 'What is unusual about Amarna period art?', options: ['More rigid', 'More naturalistic', 'Larger scale', 'Brighter colours'], correct: 1 },
      { type: 'fill', q: 'A shaduf bucket carries about ________ litres of water.', answer: '20', hint: 'Number' },
      { type: 'mcq', q: "What year did Ramses II's sarcophagus date to?", options: ['1200 BC', '1213 BC', '1220 BC', '1235 BC'], correct: 1 },
      { type: 'mcq', q: 'The daily life section includes a replica of a:', options: ['Palace', 'Temple', "Farmer's house", 'Workshop'], correct: 2 },
      { type: 'fill', q: 'The museum exhibit closes at ________ pm.', answer: '5:30', hint: 'Time' },
      { type: 'mcq', q: 'Which pharaoh is associated with the naturalistic art style?', options: ['Ramses II', 'Tutankhamun', 'Akhenaten', 'Cleopatra'], correct: 2 },
    ],
  },
  // ========== SECTION 3 ==========
  {
    section: 3, id: 'l3_01',
    topic: 'Psychology research project meeting',
    script: `Tutor: So, how is the research project coming along, Priya and Marcus? Priya: We've divided the work. I'm focusing on the literature review and Marcus is handling the data collection. Marcus: Yes, I've already gathered data from three different surveys. The sample size is 250 respondents, which should be sufficient for statistical significance. Tutor: Good. Have you agreed on a methodology? Priya: We decided on a mixed-methods approach — quantitative data from the surveys, supplemented by five in-depth interviews. Tutor: And the interviews — have those been completed? Marcus: Two of them are done. The others are scheduled for next week. Tutor: Fine. What challenges have you encountered? Priya: The main issue has been access to secondary data. Several reports we needed are behind paywalls. Marcus: We did manage to get access through the university library database, though it took some time. Tutor: Good thinking. And what's your timeline for the draft submission? Priya: We're aiming for the 20th, which gives us a week's buffer before the hard deadline on the 27th. Tutor: That's sensible. Make sure your references follow the APA 7th edition format.`,
    questions: [
      { type: 'mcq', q: 'Who is responsible for the literature review?', options: ['Marcus', 'Tutor', 'Priya', 'Both'], correct: 2 },
      { type: 'fill', q: 'Survey sample size: ________ respondents.', answer: '250', hint: 'Number' },
      { type: 'mcq', q: 'What methodology did they choose?', options: ['Qualitative', 'Quantitative', 'Mixed-methods', 'Case study'], correct: 2 },
      { type: 'fill', q: 'Hard deadline is the ________.', answer: '27th', hint: 'Date' },
      { type: 'mcq', q: 'Reference format required?', options: ['Harvard', 'MLA', 'Chicago', 'APA 7th'], correct: 3 },
      { type: 'mcq', q: 'How many interviews are planned in total?', options: ['Two', 'Three', 'Four', 'Five'], correct: 3 },
      { type: 'fill', q: 'Number of completed interviews so far: ________.', answer: '2', hint: 'Number' },
      { type: 'mcq', q: 'What was the main challenge?', options: ['Time management', 'Access to secondary data', 'Survey design', 'Participant recruitment'], correct: 1 },
    ],
  },
  {
    section: 3, id: 'l3_02',
    topic: 'Environmental economics debate',
    script: `Professor: Today we're discussing carbon pricing mechanisms. Sarah, what's your view on carbon taxes versus cap-and-trade? Sarah: I think carbon taxes are more straightforward. A tax of $50 per tonne of CO2 would create a predictable price signal, encouraging investment in renewables. However, critics say it's regressive — it hits low-income households harder. James: I disagree. Cap-and-trade is more politically feasible. You set a declining cap on emissions, then let companies trade allowances. The EU's Emissions Trading System has reduced power sector emissions by 37% since 2005. Professor: Good points. Sarah, how would you address the regressivity concern? Sarah: You could recycle the tax revenue — give each household a dividend. British Columbia does this: their carbon tax is revenue-neutral, and low-income families actually come out ahead. James: But cap-and-trade can also include a price floor and ceiling, like California's system. And it guarantees the environmental outcome — you know exactly how much emissions will fall. Professor: So both have merits. For your assignment, I want you to evaluate which system suits a developing economy like India. Consider administrative capacity, political economy, and equity.`,
    questions: [
      { type: 'mcq', q: 'What carbon price does Sarah mention?', options: ['$30/tonne', '$40/tonne', '$50/tonne', '$60/tonne'], correct: 2 },
      { type: 'fill', q: 'EU ETS reduced power sector emissions by ________% since 2005.', answer: '37', hint: 'Percentage' },
      { type: 'mcq', q: 'How does British Columbia address regressivity?', options: ['Subsidies', 'Dividend to households', 'Tax exemptions', 'Lower rates for poor'], correct: 1 },
      { type: 'mcq', q: 'Which system guarantees the environmental outcome?', options: ['Carbon tax', 'Cap-and-trade', 'Both', 'Neither'], correct: 1 },
      { type: 'fill', q: "James mentions California's system includes a price floor and ________.", answer: 'ceiling', hint: 'One word' },
      { type: 'mcq', q: 'What country is the case study for the assignment?', options: ['China', 'Brazil', 'India', 'Indonesia'], correct: 2 },
      { type: 'mcq', q: 'Sarah says carbon taxes create a ________ price signal.', options: ['Volatile', 'Unpredictable', 'Predictable', 'Hidden'], correct: 2 },
      { type: 'fill', q: 'Professor lists three factors: administrative capacity, political economy, and ________.', answer: 'equity', hint: 'Fairness' },
    ],
  },
  {
    section: 3, id: 'l3_03',
    topic: 'Artificial intelligence ethics seminar',
    script: `Moderator: Today we have Dr. Lee and Professor Okonkwo to discuss AI and algorithmic bias. Dr. Lee: Thank you. Let me start with a stark fact. In 2019, a healthcare algorithm used on 200 million people in the US was found to be racially biased — it recommended less care for Black patients with the same medical conditions. Why? The algorithm used past healthcare costs as a proxy for need. But because systemic racism means Black patients historically received less funding, the algorithm learned to penalise them. Prof. Okonkwo: That's a classic case of historical bias perpetuated by machine learning. But there are also representation biases. Facial recognition systems from major tech companies have error rates below 1% for light-skinned males, but up to 35% for dark-skinned females. Dr. Lee: Exactly. So what do we do? Three solutions: first, audit datasets for demographic representation. Second, use fairness metrics — like equalised odds, which requires that prediction errors are equal across groups. Third, involve affected communities in design. Moderator: Are there trade-offs? Prof. Okonkwo: Yes, sometimes fairness reduces overall accuracy. But many argue that a slightly less accurate but fair model is ethically superior. The EU's AI Act now requires high-risk systems to pass conformity assessments.`,
    questions: [
      { type: 'fill', q: 'The biased healthcare algorithm was used on ________ million people in the US.', answer: '200', hint: 'Number' },
      { type: 'mcq', q: 'What proxy did the algorithm use for medical need?', options: ['Age', 'Past healthcare costs', 'Zip code', 'Employment status'], correct: 1 },
      { type: 'fill', q: 'Error rate for dark-skinned females in facial recognition can be up to ________%.', answer: '35', hint: 'Percentage' },
      { type: 'mcq', q: 'Which fairness metric requires equal prediction errors across groups?', options: ['Demographic parity', 'Equalised odds', 'Individual fairness', 'Calibration'], correct: 1 },
      { type: 'mcq', q: 'What does the EU AI Act require for high-risk systems?', options: ['Ban on AI', 'Conformity assessments', 'Open-source code', 'Human oversight only'], correct: 1 },
      { type: 'fill', q: 'Dr. Lee lists three solutions: audit datasets, use fairness metrics, and involve ________ communities in design.', answer: 'affected', hint: 'Adjective' },
      { type: 'mcq', q: 'According to Prof. Okonkwo, what is the trade-off when improving fairness?', options: ['Higher cost', 'Slower processing', 'Reduced accuracy', 'More data needed'], correct: 2 },
      { type: 'mcq', q: 'The healthcare algorithm recommended less care for which group?', options: ['Elderly', 'Women', 'Black patients', 'Rural patients'], correct: 2 },
    ],
  },
  // ========== SECTION 4 (Band 8.5–9, faster speech) ==========
  {
    section: 4, id: 'l4_01',
    topic: 'Urban Heat Islands: Causes and Mitigation',
    script: `Lecturer: Good morning. Today I want to talk about a phenomenon increasingly relevant to city planners and climate scientists alike — the urban heat island effect, or UHI. An urban heat island occurs when a city experiences significantly warmer temperatures than its surrounding rural areas. The primary cause is the replacement of natural land cover — trees, soil, and vegetation — with surfaces like asphalt, concrete, and dark rooftops. These materials absorb solar radiation during the day and release it as heat at night, preventing cities from cooling down. Research shows that urban areas can be 1 to 3 degrees Celsius warmer than rural areas on average, with differences of up to 12 degrees on calm, clear nights. This temperature gap has significant consequences: increased energy consumption for air conditioning, elevated air pollution levels, greater strain on urban infrastructure, and heightened health risks — particularly for vulnerable groups such as the elderly and those with respiratory conditions. Mitigation strategies fall into three categories. First, green infrastructure: planting trees, creating parks, and installing green roofs and walls. Studies show that urban trees can reduce local temperatures by up to 8 degrees through shade and evapotranspiration. Second, cool surfaces: using light-coloured or reflective materials for roads and rooftops that reflect rather than absorb sunlight. Third, urban planning: designing buildings and streets to maximise wind flow and shade. Some cities are already leading the way. Singapore's City in a Garden vision has integrated greenery into its urban fabric so extensively that green cover has increased even as the population grew. In Los Angeles, the Cool Pavement programme has resurfaced streets with a light-grey coating, reducing local surface temperatures by up to 10 degrees Fahrenheit. In conclusion, urban heat islands are not inevitable. With targeted policy, innovative design, and community engagement, cities can be made cooler, healthier, and more sustainable for all residents.`,
    questions: [
      { type: 'mcq', q: 'Primary cause of UHI?', options: ['Car traffic', 'Replacement of natural surfaces', 'Industrial pollution', 'Population density'], correct: 1 },
      { type: 'fill', q: 'Urban areas can be ________ to 3°C warmer than rural areas.', answer: '1', hint: 'Number' },
      { type: 'mcq', q: 'Which group is at higher health risk?', options: ['Children', 'Athletes', 'Elderly & respiratory', 'Office workers'], correct: 2 },
      { type: 'fill', q: 'Trees reduce local temperatures by up to ________ degrees.', answer: '8', hint: 'Number' },
      { type: 'mcq', q: "Singapore's initiative is called?", options: ['Green City Plan', 'City in a Garden', 'Urban Nature', 'Cool Singapore'], correct: 1 },
      { type: 'mcq', q: "LA's Cool Pavement reduced surface temps by up to how many °F?", options: ['5', '8', '10', '12'], correct: 2 },
      { type: 'fill', q: 'Temperature difference on calm, clear nights can reach ________°C.', answer: '12', hint: 'Number' },
      { type: 'mcq', q: 'Which mitigation strategy uses reflective materials?', options: ['Green infrastructure', 'Cool surfaces', 'Urban planning', 'Water features'], correct: 1 },
      { type: 'fill', q: 'Evapotranspiration is associated with ________ infrastructure.', answer: 'green', hint: 'Colour' },
      { type: 'mcq', q: 'What happens at night with dark surfaces?', options: ['Absorb heat', 'Release stored heat', 'Reflect heat', 'Create shade'], correct: 1 },
    ],
  },
  {
    section: 4, id: 'l4_02',
    topic: 'Behavioural Economics: Nudge Theory',
    script: `Professor: Today we explore Richard Thaler's Nobel prize-winning work on nudge theory. A nudge is any aspect of choice architecture that alters people's behaviour predictably without forbidding options or changing economic incentives significantly. Classic example: the cafeteria. If you place healthy food at eye level and junk food in a hard-to-reach spot, salad sales increase by 25% without banning cheeseburgers. That's a nudge. Another powerful nudge is default bias. In countries with opt-out organ donation — where everyone is a donor unless they actively say no — consent rates exceed 85%. In opt-in countries, rates often fall below 20%. People stick with the default, even for life-saving decisions. But critics raise concerns. Sunstein and Thaler argue nudges preserve liberty because you can always choose differently. However, some say governments could manipulate citizens without their awareness. The ethical line is transparency — a good nudge is transparent and easily avoidable. Consider saving for retirement. When companies automatically enrol employees in pension plans with an opt-out choice, participation jumps from 40% to over 90% after three years. The nudge doesn't force anyone — but it overcomes inertia. For your essay, analyse one nudge policy in your country. Is it ethical? Does it work? Use evidence from at least three studies.`,
    questions: [
      { type: 'fill', q: 'A nudge alters behaviour without forbidding options or changing ________ incentives.', answer: 'economic', hint: 'Adjective' },
      { type: 'mcq', q: 'Placing healthy food at eye level increased sales by what percentage?', options: ['15%', '20%', '25%', '30%'], correct: 2 },
      { type: 'fill', q: 'In opt-out countries, organ donation consent exceeds ________%.', answer: '85', hint: 'Number' },
      { type: 'mcq', q: 'Opt-in consent rates are often below ________%.', options: ['20%', '30%', '40%', '50%'], correct: 0 },
      { type: 'fill', q: 'Automatic enrolment in pensions increased participation from 40% to over ________% after three years.', answer: '90', hint: 'Number' },
      { type: 'mcq', q: 'Who wrote the book "Nudge"?', options: ['Kahneman & Tversky', 'Thaler & Sunstein', 'Ariely & Thaler', 'Sunstein & Kahneman'], correct: 1 },
      { type: 'mcq', q: 'What is a key ethical requirement for a nudge?', options: ['Legally binding', 'Expensive', 'Transparent', 'Secret'], correct: 2 },
      { type: 'fill', q: 'Nudges overcome ________, the tendency to do nothing by default.', answer: 'inertia', hint: 'One word' },
      { type: 'mcq', q: 'Which bias is demonstrated by organ donation rates?', options: ['Confirmation bias', 'Default bias', 'Anchoring', 'Availability'], correct: 1 },
      { type: 'fill', q: 'The essay requires evidence from at least ________ studies.', answer: 'three', hint: 'Number word' },
    ],
  },
  {
    section: 4, id: 'l4_03',
    topic: 'Quantum Computing: Principles and Applications',
    script: `Lecturer: Quantum computing leverages two principles of quantum mechanics: superposition and entanglement. A classical bit is either 0 or 1. A quantum bit, or qubit, can be 0, 1, or any superposition of both simultaneously. This means a quantum computer with n qubits can process 2 to the power of n states at once. Entanglement links qubits so that measuring one instantly affects the other, regardless of distance. Einstein called this spooky action at a distance, but it's real and enables powerful error correction. Currently, quantum supremacy has been demonstrated by Google's Sycamore processor in 2019 — it solved a problem in 200 seconds that would take a classical supercomputer 10,000 years. However, these are niche problems. Useful quantum computing for drug discovery, optimisation, and cryptography is likely 5 to 10 years away. The biggest challenge is decoherence — qubits lose their quantum state if disturbed by heat or electromagnetic noise. That's why quantum computers are kept at temperatures near absolute zero, around 15 millikelvin — colder than outer space. Major players include IBM with its 433-qubit Osprey processor, and China's 66-qubit Zuchongzhi. For your assignment, evaluate one potential application — either Shor's algorithm for factoring or Grover's algorithm for search — and discuss its societal implications.`,
    questions: [
      { type: 'mcq', q: 'Quantum computers use ________ instead of bits.', options: ['Qubits', 'Qwords', 'Qbytes', 'Qcells'], correct: 0 },
      { type: 'fill', q: 'A qubit can be 0, 1, or any ________ of both.', answer: 'superposition', hint: 'Physics term' },
      { type: 'mcq', q: 'What did Einstein call entanglement?', options: ['Magic', 'Spooky action at a distance', 'Quantum weirdness', 'Impossible'], correct: 1 },
      { type: 'fill', q: "Google's Sycamore solved a problem in 200 seconds that would take ________ years classically.", answer: '10000', hint: 'Number' },
      { type: 'mcq', q: 'Quantum computers are kept near ________.', options: ['Room temperature', 'Freezing point', 'Absolute zero', 'Liquid nitrogen'], correct: 2 },
      { type: 'fill', q: 'The temperature mentioned is around ________ millikelvin.', answer: '15', hint: 'Number' },
      { type: 'mcq', q: "IBM's Osprey processor has how many qubits?", options: ['127', '433', '512', '1024'], correct: 1 },
      { type: 'mcq', q: "China's quantum processor is called ________.", options: ['Zuchongzhi', 'Tianhe', 'Shenwei', 'Sunway'], correct: 0 },
      { type: 'fill', q: 'Decoherence happens when qubits are disturbed by heat or ________ noise.', answer: 'electromagnetic', hint: 'Type of noise' },
      { type: 'mcq', q: 'Which algorithm is mentioned for factoring?', options: ["Grover's", "Shor's", 'Deutsch-Jozsa', "Simon's"], correct: 1 },
    ],
  },
]; // end IELTS_LISTENING_CLIPS

// ── Official IELTS Listening band conversion (40-question scale, scaled to clip size) ──
function _ilpRawToband(correct, total) {
  // Scale correct to 40-question equivalent
  const scaled = Math.round((correct / total) * 40);
  // Official IELTS conversion table
  if (scaled >= 39) return 9.0;
  if (scaled >= 37) return 8.5;
  if (scaled >= 35) return 8.0;
  if (scaled >= 33) return 7.5;
  if (scaled >= 30) return 7.0;
  if (scaled >= 27) return 6.5;
  if (scaled >= 23) return 6.0;
  if (scaled >= 20) return 5.5;
  if (scaled >= 16) return 5.0;
  if (scaled >= 13) return 4.5;
  if (scaled >= 10) return 4.0;
  if (scaled >= 8)  return 3.5;
  if (scaled >= 6)  return 3.0;
  return 2.5;
}

// ── Flexible fill-in answer matching ─────────────────────────
function _ilpCheckFillAnswer(userRaw, q) {
  const normalise = s => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const user = normalise(userRaw);
  if (!user) return false;

  // Build list of acceptable answers
  const acceptable = [q.answer, ...(q.acceptableAnswers || [])];

  // Also auto-generate number/word variants
  const numWords = { '1':'one','2':'two','3':'three','4':'four','5':'five',
    '6':'six','7':'seven','8':'eight','9':'nine','10':'ten',
    '20':'twenty','30':'thirty','40':'forty','50':'fifty',
    '60':'sixty','70':'seventy','80':'eighty','90':'ninety','100':'hundred' };
  const wordNums = Object.fromEntries(Object.entries(numWords).map(([k,v]) => [v,k]));

  const expanded = [...acceptable];
  acceptable.forEach(a => {
    const n = normalise(a);
    if (numWords[n])  expanded.push(numWords[n]);
    if (wordNums[n])  expanded.push(wordNums[n]);
    // percent variants: "50" ↔ "50%" ↔ "50 percent"
    const pctMatch = a.match(/^(\d+)\s*%?$/);
    if (pctMatch) {
      expanded.push(pctMatch[1] + '%', pctMatch[1] + ' percent', pctMatch[1] + 'percent');
    }
  });

  return expanded.some(a => normalise(a) === user);
}

// ── Listening state extras ────────────────────────────────────
let _ilpExamMode = false; // false = practice (replay allowed), true = exam (one play)
let _ilpPreReadTimer = null;
let _ilpPreReadActive = false;

// ── Start Listening Session ───────────────────────────────────
function startIELTSListening(sectionNum) {
  const clips = IELTS_LISTENING_CLIPS.filter(c => c.section === sectionNum);
  if (!clips.length) return;
  const clip = clips[Math.floor(Math.random() * clips.length)];
  _ieltsListeningState = {
    section: sectionNum,
    clip,
    questions: clip.questions,
    answers: {},
    utterance: null,
    playing: false,
    playbackDone: false,
  };

  document.getElementById('ieltsListeningSetup').style.display   = 'none';
  document.getElementById('ieltsListeningSession').style.display = 'block';
  document.getElementById('ieltsListeningResults').style.display = 'none';

  document.getElementById('ilpSectionLabel').textContent = 'Section ' + sectionNum;
  document.getElementById('ilpTopic').textContent        = clip.topic;
  document.getElementById('ilpTranscriptWrap').style.display = 'none';
  document.getElementById('ilpTranscriptBody').style.display = 'none';
  document.getElementById('ilpTranscriptBody').textContent   = '';

  // Render questions immediately (pre-read phase)
  _renderListeningQuestions();
  _ilpSetWaveform(false);

  // Reset notepad
  const notepad = document.getElementById('ilpNotepad');
  if (notepad) notepad.value = '';

  // Update exam/practice mode UI
  _ilpUpdateModeUI();

  // Start 30-second pre-read countdown before enabling play
  _ilpStartPreRead();
}

function _ilpStartPreRead() {
  _ilpPreReadActive = true;
  const playBtn = document.getElementById('ilpPlayBtn');
  const statusEl = document.getElementById('ilpStatus');
  const preReadEl = document.getElementById('ilpPreReadTimer');
  if (playBtn) { playBtn.disabled = true; playBtn.style.opacity = '0.5'; }

  let remaining = 30;
  if (preReadEl) { preReadEl.style.display = 'flex'; preReadEl.querySelector('.ilp-prt-count').textContent = remaining + 's'; }
  if (statusEl) statusEl.textContent = '📖 Pre-read questions (' + remaining + 's)';

  _ilpPreReadTimer = setInterval(() => {
    remaining--;
    if (preReadEl) preReadEl.querySelector('.ilp-prt-count').textContent = remaining + 's';
    if (statusEl) statusEl.textContent = '📖 Pre-read questions (' + remaining + 's)';
    if (remaining <= 0) {
      _ilpEndPreRead();
    }
  }, 1000);
}

function _ilpEndPreRead() {
  _ilpPreReadActive = false;
  if (_ilpPreReadTimer) { clearInterval(_ilpPreReadTimer); _ilpPreReadTimer = null; }
  const playBtn = document.getElementById('ilpPlayBtn');
  const statusEl = document.getElementById('ilpStatus');
  const preReadEl = document.getElementById('ilpPreReadTimer');
  if (playBtn) { playBtn.disabled = false; playBtn.style.opacity = '1'; }
  if (preReadEl) preReadEl.style.display = 'none';
  if (statusEl) statusEl.textContent = '▶ Ready — press Play';
}

function _ilpSkipPreRead() {
  _ilpEndPreRead();
}

function _ilpUpdateModeUI() {
  const modeLabel = document.getElementById('ilpModeLabel');
  const replayBtn = document.getElementById('ilpReplayBtn');
  if (modeLabel) modeLabel.textContent = _ilpExamMode ? '🎓 Exam Mode' : '📚 Practice Mode';
  if (replayBtn) replayBtn.style.display = _ilpExamMode ? 'none' : 'inline-flex';
}

function ilpToggleMode() {
  _ilpExamMode = !_ilpExamMode;
  _ilpUpdateModeUI();
  if (typeof _showStudyToast === 'function') {
    _showStudyToast(_ilpExamMode ? '🎓 Exam mode — audio plays once only' : '📚 Practice mode — replay enabled');
  }
}

function _renderListeningQuestions() {
  const area = document.getElementById('ieltsListeningQArea');
  const qs   = _ieltsListeningState.questions;
  let html   = '<div class="ilq-list">';
  qs.forEach((q, i) => {
    html += '<div class="ilq-item" id="ilq_' + i + '">';
    html += '<div class="ilq-num">Q' + (i + 1) + '</div>';
    html += '<div class="ilq-body">';
    html += '<div class="ilq-text">' + q.q + '</div>';
    if (q.type === 'fill') {
      html += '<input class="ilq-input" id="ilqInput_' + i + '" type="text" placeholder="' + (q.hint || 'Your answer') + '" autocomplete="off">';
    } else if (q.type === 'mcq') {
      q.options.forEach((opt, oi) => {
        html += '<label class="ilq-option"><input type="radio" name="ilq_' + i + '" value="' + oi + '"> ' + opt + '</label>';
      });
    }
    html += '</div></div>';
  });
  html += '</div>';
  area.innerHTML = html;
  document.getElementById('ieltsListeningSubmitBtn').style.display = 'block';
}

// ── TTS Audio Player ──────────────────────────────────────────
function ilpTogglePlay() {
  if (_ieltsListeningState.playing) {
    speechSynthesis.cancel();
    _ieltsListeningState.playing = false;
    document.getElementById('ilpPlayBtn').textContent  = '▶ Resume';
    document.getElementById('ilpStatus').textContent   = 'Paused';
    _ilpSetWaveform(false);
  } else {
    // Exam mode: disable play button after first play
    if (_ilpExamMode && _ieltsListeningState.playbackDone) {
      if (typeof _showStudyToast === 'function') _showStudyToast('🎓 Exam mode — audio plays once only');
      return;
    }
    _ilpSpeak();
  }
}

function ilpReplay() {
  if (_ilpExamMode) {
    if (typeof _showStudyToast === 'function') _showStudyToast('🎓 Exam mode — replay disabled');
    return;
  }
  speechSynthesis.cancel();
  _ieltsListeningState.playing      = false;
  _ieltsListeningState.playbackDone = false;
  document.getElementById('ilpPlayBtn').textContent        = '▶ Play Audio';
  document.getElementById('ilpStatus').textContent         = 'Ready';
  document.getElementById('ilpTranscriptWrap').style.display = 'none';
  _ilpSetWaveform(false);
}

function _ilpSpeak() {
  const clip = _ieltsListeningState.clip;
  if (!clip) return;
  const text      = clip.script.replace(/\n\s*/g, ' ').trim();
  const utterance = new SpeechSynthesisUtterance(text);

  // Sections 3 & 4 are faster — more realistic for high band scores
  let rate = 0.92;
  if (_ieltsListeningState.section === 3) rate = 0.98;
  if (_ieltsListeningState.section === 4) rate = 1.02;
  utterance.rate  = rate;
  utterance.pitch = 1.0;

  const voices   = speechSynthesis.getVoices();
  const engVoice = voices.find(v => v.lang.startsWith('en') && !v.name.includes('Google')) ||
                   voices.find(v => v.lang.startsWith('en'));
  if (engVoice) utterance.voice = engVoice;

  utterance.onstart = () => {
    _ieltsListeningState.playing = true;
    document.getElementById('ilpPlayBtn').textContent = '⏸ Pause';
    document.getElementById('ilpStatus').textContent  = '🔊 Playing…';
    _ilpSetWaveform(true);
  };
  utterance.onend = () => {
    _ieltsListeningState.playing      = false;
    _ieltsListeningState.playbackDone = true;
    document.getElementById('ilpPlayBtn').textContent        = '▶ Play Again';
    document.getElementById('ilpStatus').textContent         = '✅ Done — answer below';
    _ilpSetWaveform(false);
    document.getElementById('ilpTranscriptWrap').style.display = 'block';
  };
  utterance.onerror = () => {
    _ieltsListeningState.playing = false;
    document.getElementById('ilpStatus').textContent         = '⚠️ TTS error — use transcript below';
    _ilpSetWaveform(false);
    document.getElementById('ilpTranscriptWrap').style.display = 'block';
    const body = document.getElementById('ilpTranscriptBody');
    body.style.display = 'block';
    body.innerHTML     = _ilpFormatTranscript(clip.script);
  };
  _ieltsListeningState.utterance = utterance;
  speechSynthesis.speak(utterance);
}

function ilpToggleTranscript() {
  const body = document.getElementById('ilpTranscriptBody');
  if (body.style.display === 'none' || !body.style.display) {
    body.style.display = 'block';
    body.innerHTML     = _ilpFormatTranscript(_ieltsListeningState.clip.script);
  } else {
    body.style.display = 'none';
  }
}

function _ilpFormatTranscript(script) {
  return script.trim().split('\n').map(line => {
    line = line.trim();
    if (!line) return '';
    const match = line.match(/^([^:]+):(.*)/);
    if (match) {
      return '<div class="ilp-tr-line"><span class="ilp-tr-speaker">' + match[1].trim() + ':</span><span class="ilp-tr-text">' + match[2].trim() + '</span></div>';
    }
    return '<div class="ilp-tr-line"><span class="ilp-tr-text">' + line + '</span></div>';
  }).join('');
}

function _ilpSetWaveform(active) {
  const wf = document.getElementById('ilpWaveform');
  if (!wf) return;
  if (active) wf.classList.add('ilp-wf-active');
  else        wf.classList.remove('ilp-wf-active');
}

// ── Submit & Score ────────────────────────────────────────────
function submitIELTSListening() {
  const qs = _ieltsListeningState.questions;
  let correct = 0;
  const results = [];

  qs.forEach((q, i) => {
    if (q.type === 'fill') {
      const userRaw   = document.getElementById('ilqInput_' + i)?.value || '';
      const isCorrect = _ilpCheckFillAnswer(userRaw, q);
      if (isCorrect) correct++;
      results.push({ q: q.q, type: 'fill', userAnswer: userRaw.trim(), correctAnswer: q.answer, isCorrect });
    } else if (q.type === 'mcq') {
      const selected  = document.querySelector('input[name="ilq_' + i + '"]:checked');
      const userIdx   = selected ? parseInt(selected.value) : -1;
      const isCorrect = userIdx === q.correct;
      if (isCorrect) correct++;
      results.push({ q: q.q, type: 'mcq', userAnswer: userIdx >= 0 ? q.options[userIdx] : '(no answer)', correctAnswer: q.options[q.correct], isCorrect });
    }
  });

  const total  = qs.length;
  const pct    = Math.round((correct / total) * 100);
  const band   = _ilpRawToband(correct, total);

  if (typeof _ieltsSaveSkillProgress === 'function') _ieltsSaveSkillProgress('listening', band);
  else _ieltsRecordBand('listening', band);

  speechSynthesis.cancel();
  _ieltsListeningState.playing = false;

  const resultsEl = document.getElementById('ieltsListeningResults');
  const bandCls   = band >= 7 ? 'good' : band >= 5 ? 'mid' : 'low';
  let html = '<div class="vg-card" style="margin-top:10px">' +
    '<div class="ielts-results-header">' +
      '<div class="ielts-results-score">' + correct + '/' + total + '</div>' +
      '<div class="ielts-results-band viva-score-badge ' + bandCls + '">Band ' + band.toFixed(1) + '</div>' +
      '<div class="ielts-results-pct">' + pct + '% correct</div>' +
    '</div>' +
    '<div class="ielts-results-list">';

  results.forEach((r, i) => {
    html += '<div class="ielts-result-item ' + (r.isCorrect ? 'ilr-correct' : 'ilr-wrong') + '">' +
      '<span class="ilr-icon">' + (r.isCorrect ? '✅' : '❌') + '</span>' +
      '<div class="ilr-content">' +
        '<div class="ilr-q">Q' + (i + 1) + ': ' + r.q + '</div>' +
        (!r.isCorrect ? '<div class="ilr-your">Your answer: <em>' + (r.userAnswer || '—') + '</em></div>' : '') +
        (!r.isCorrect ? '<div class="ilr-correct">Correct: <strong>' + r.correctAnswer + '</strong></div>' : '') +
      '</div></div>';
  });

  html += '</div>' +
    '<button class="study-gen-btn" style="width:100%;margin-top:12px" onclick="_ieltsListeningReset()">🔄 Try Another Section</button>' +
    '</div>';

  resultsEl.innerHTML = html;
  document.getElementById('ieltsListeningSession').style.display = 'none';
  resultsEl.style.display = 'block';
}

function _ieltsListeningReset() {
  if (_ilpPreReadTimer) { clearInterval(_ilpPreReadTimer); _ilpPreReadTimer = null; }
  document.getElementById('ieltsListeningSession').style.display = 'none';
  document.getElementById('ieltsListeningResults').style.display = 'none';
  document.getElementById('ieltsListeningSetup').style.display   = 'block';
  speechSynthesis.cancel();
}

// Expose globals
window.startIELTSListening    = startIELTSListening;
window.ilpTogglePlay          = ilpTogglePlay;
window.ilpReplay              = ilpReplay;
window.ilpToggleTranscript    = ilpToggleTranscript;
window.submitIELTSListening   = submitIELTSListening;
window._ieltsListeningReset   = _ieltsListeningReset;
window.ilpToggleMode          = ilpToggleMode;
window._ilpSkipPreRead        = _ilpSkipPreRead;
window.speakingContinueSpeaking = speakingContinueSpeaking;
