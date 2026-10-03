// ============================================================
// nexora-bcs-decks.js
// Real BCS Prelim MCQ Bank — 44th, 45th, 46th, 47th, 48th, 49th BCS
// Source: chakribangla.com (verified answers + explanations)
// License: Educational use — questions are public exam records
//
// Replaces MCQ_BUILTIN_DECKS with 10 subject-merged decks
// covering ~820 real questions from 6 BCS exams.
// ============================================================

(function _loadBCSDecks() {
  if (typeof MCQ_BUILTIN_DECKS === 'undefined') {
    console.warn('[BCS Decks] MCQ_BUILTIN_DECKS not found — retrying in 500ms');
    setTimeout(_loadBCSDecks, 500);
    return;
  }

  // Clear the old generic decks
  const keysToRemove = Object.keys(MCQ_BUILTIN_DECKS).filter(k =>
    !k.startsWith('BCS Live:') && !k.startsWith('Imported')
  );
  keysToRemove.forEach(k => delete MCQ_BUILTIN_DECKS[k]);


  MCQ_BUILTIN_DECKS['BCS · বাংলা ভাষা ও সাহিত্য'] = [
    // ── 47th BCS ──
    { q: "'লুই ভণই গুরু পুছিঅ জান।'- এখানে 'ভণই' শব্দের অর্থ কী?", options: ["বলে","ভাবে","চায়","দেখে"], correct: "A", explanation: "'ভণই' অর্থ বলে। পঙ্‌ক্তিটির রচয়িতা চর্যার কবি লুইপা।" },
    { q: "'শ্রীকৃষ্ণকীর্তন' কাব্যের অংশ নয় কোনটি?", options: ["নৌকা খণ্ড","হার খণ্ড","রাধা বিরহ","প্রণয় খণ্ড"], correct: "D", explanation: "শ্রীকৃষ্ণকীর্তন কাব্য মোট তের খণ্ডে বিভক্ত। প্রণয় খণ্ড নামে কোনো খণ্ড নেই।" },
    { q: "বিবৃত স্বরধ্বনি বলতে বোঝায় –", options: ["যে স্বরধ্বনি উচ্চারণে ঠোঁট বেশি খোলে","যে স্বরধ্বনি উচ্চারণে জিভ উঁচু হয়","যে স্বরধ্বনি অবিকৃতভাবে উচ্চারিত হয়","যে স্বরধ্বনি উচ্চারণে বিকৃতি ঘটে"], correct: "A", explanation: "বিবৃত স্বরধ্বনি [আ] উচ্চারণের সময়ে ঠোঁট সবচেয়ে বেশি খোলে।" },
    { q: "কাজী নজরুল ইসলামের কোন গ্রন্থটি বাজেয়াপ্ত হয়নি?", options: ["অগ্নিবীণা","বিষের বাঁশি","ভাঙার গান","চন্দ্রবিন্দু"], correct: "A", explanation: "নজরুলের নিষিদ্ধ গ্রন্থ ৫টি: যুগবাণী, বিষের বাঁশী, ভাঙার গান, প্রলয় শিখা, চন্দ্রবিন্দু। 'অগ্নিবীণা' নিষিদ্ধ হয়নি।" },
    { q: "জসীম উদ্‌দীনের 'কবর' কবিতাটি কোন কাব্যের অন্তর্গত?", options: ["বালুচর","রাখালী","ধানক্ষেত","মা যে জননী কান্দে"], correct: "B", explanation: "'কবর' কবিতাটি জসীম উদ্‌দীনের প্রথম কাব্যগ্রন্থ 'রাখালী' (১৯২৭)-এর অন্তর্ভুক্ত।" },
    { q: "'গড্ডলিকা প্রবাহ' বাগ্‌ধারার 'গড্ডল' শব্দের অর্থ কী?", options: ["নদী","স্রোত","ভেড়া","মশা"], correct: "C", explanation: "'গড্ডল' একটি সংস্কৃত শব্দ, যার অর্থ ভেড়া বা মেষ।" },
    { q: "সৈয়দ ওয়ালীউল্লাহ্‌র 'চাঁদের অমাবস্যা' উপন্যাসে কোন জীবনদর্শনের রূপায়ণ ঘটেছে?", options: ["মার্কসবাদ","বাস্তববাদ","অস্তিত্ববাদ","পরাবাস্তববাদ"], correct: "C", explanation: "'চাঁদের অমাবস্যা' উপন্যাসে অস্তিত্ববাদী দর্শনের আলোকে নায়ক আরেফ আলীর মানসিক দ্বন্দ্ব রূপায়িত হয়েছে।" },
    { q: "জীবনানন্দ দাশের মৃত্যুর পর কোন কাব্যগ্রন্থটি প্রকাশিত হয়?", options: ["ঝরাপালক","রূপসী বাংলা","বনলতা সেন","সাতটি তারার তিমির"], correct: "B", explanation: "'রূপসী বাংলা' কাব্যগ্রন্থটি জীবনানন্দ দাশের মৃত্যুর পর ১৯৫৭ সালে প্রকাশিত হয়।" },
    { q: "'তুমি অধম তাই বলিয়া আমি উত্তম না হইব কেন?' কোন উপন্যাসে আছে?", options: ["বঙ্কিমচন্দ্রের 'কপালকুণ্ডলা'","রবীন্দ্রনাথের 'গোরা'","শরৎচন্দ্রের 'চরিত্রহীন'","বিভূতিভূষণের 'আরণ্যক'"], correct: "A", explanation: "এই বিখ্যাত উক্তিটি বঙ্কিমচন্দ্র চট্টোপাধ্যায়ের 'কপালকুণ্ডলা' উপন্যাসের নায়ক নবকুমারের।" },
    { q: "বাংলা একাডেমির 'আধুনিক বাংলা অভিধানে'র সম্পাদক কে?", options: ["আনিসুজ্জামান","আবু ইসহাক","মনসুর মুসা","জামিল চৌধুরি"], correct: "D", explanation: "'বাংলা একাডেমি আধুনিক বাংলা অভিধান'-এর সম্পাদক ছিলেন জামিল চৌধুরী।" },
    // ── 46th BCS ──
    { q: "'আনোয়ারা' উপন্যাসের রচয়িতার নাম-", options: ["সৈয়দ মুজতবা আলী","কাজী আবদুল ওদুদ","নজিবর রহমান","রোকেয়া সাখাওয়াৎ হোসেন"], correct: "C", explanation: "'আনোয়ারা' (১৯১৪) মোহাম্মদ নজিবর রহমান রচিত একটি বিখ্যাত সামাজিক উপন্যাস।" },
    { q: "ধ্বনি-পরিবর্তনের নিয়মে কোনটি বর্ণ-বিপর্যয়-এর দৃষ্টান্ত?", options: ["রতন","কবাট","পিচাশ","মুলুক"], correct: "C", explanation: "পিশাচ > পিচাশ — শ ও চ এর স্থান পরিবর্তন ঘটেছে।" },
    { q: "নিচের কোনটি 'অগ্নি'র সমার্থক শব্দ নয়?", options: ["বহ্নি","আবীর","বায়ুসখা","বৈশ্বানর"], correct: "B", explanation: "'আবীর' হলো এক প্রকার রঙিন গুঁড়া। বহ্নি, বায়ুসখা, বৈশ্বানর অগ্নির সমার্থক।" },
    { q: "'যথারীতি' কোন সমাসের দৃষ্টান্ত?", options: ["অব্যয়ীভাব","দ্বিগু","বহুব্রীহি","দ্বন্দ্ব"], correct: "A", explanation: "'যথারীতি' অব্যয়ীভাব সমাসের উদাহরণ — 'রীতিকে অতিক্রম না করে'।" },
    { q: "বিদ্যাপতি মূলত কোন ভাষার কবি ছিলেন?", options: ["মারাঠি","হিন্দি","মৈথিলি","গুজরাটি"], correct: "C", explanation: "মধ্যযুগের বৈষ্ণব পদাবলির কবি বিদ্যাপতি মূলত মৈথিল ভাষায় পদ রচনা করতেন।" },
    { q: "সৈয়দ ওয়ালীউল্লাহর লেখা নাটক কোনটি?", options: ["কবর","বহিপীর","পায়ের আওয়াজ পাওয়া যায়","ওরা কদম আলী"], correct: "B", explanation: "'বহিপীর' সৈয়দ ওয়ালীউল্লাহর লেখা একটি বিখ্যাত নাটক।" },
    { q: "মীর মশাররফ হোসেনের 'বিষাদসিন্ধু' একটি –", options: ["মহাকাব্য","ইতিহাস গ্রন্থ","উপন্যাস","ইতিহাস-আশ্রিত জীবনীগ্রন্থ"], correct: "C", explanation: "'বিষাদ-সিন্ধু' কারবালার বিষাদময় ঘটনা অবলম্বনে রচিত একটি ঐতিহাসিক উপন্যাস।" },
    { q: "'চাঁদের অমাবস্যা' উপন্যাসের যুবক-শিক্ষকের নাম-", options: ["আবদুল কাদের","খতিব মিয়া","আক্কাস আলী","আরেফ আলী"], correct: "D", explanation: "সৈয়দ ওয়ালীউল্লাহর 'চাঁদের অমাবস্যা' উপন্যাসের কেন্দ্রীয় চরিত্র যুবক শিক্ষক আরেফ আলী।" },
    // ── 45th BCS ──
    { q: "'ধ্বনি' সম্পর্কে নিচের কোন বাক্যটি সঠিক নয়?", options: ["ধ্বনি দৃশ্যমান","মানুষের ভাষার মূলে আছে কতগুলো ধ্বনি","ধ্বনি উচ্চারণীয় ও শ্রবণীয়","অর্থবোধক ধ্বনিগুলোই মানুষের বিভিন্ন ভাষার বাগ্‌ধ্বনি"], correct: "A", explanation: "ধ্বনি শ্রবণযোগ্য কিন্তু অদৃশ্য। বর্ণই দৃশ্যমান।" },
    { q: "স্বরান্ত অক্ষরকে কী বলে?", options: ["একাক্ষর","মুক্তাক্ষর","বদ্ধাক্ষর","যুক্তাক্ষর"], correct: "B", explanation: "যে অক্ষরের শেষে স্বরধ্বনি থাকে, তাকে মুক্তাক্ষর বলে।" },
    { q: "সর্বপ্রথম বাংলা ভাষার ব্যাকরণ রচনা করেন কে?", options: ["মানোএল দ্য আস্সু‌ম্পসাঁও","রাজা রামমোহন রায়","রামেন্দ্র সুন্দর ত্রিবেদী","নাথানিয়েল ব্রাসি হ্যালহেড"], correct: "A", explanation: "পর্তুগিজ পাদ্রি মানোএল দ্য আস্সু‌ম্পসাঁও ১৭৩৪ সালে বাংলা ভাষার প্রথম ব্যাকরণ রচনা করেন।" },
    { q: "রবীন্দ্রনাথ ঠাকুর কত বয়সে ছোটগল্পকার হিসেবে আত্মপ্রকাশ করেন?", options: ["১০ বছর","১২ বছর","১৪ বছর","১৬ বছর"], correct: "D", explanation: "রবীন্দ্রনাথ ঠাকুর ১৬ বছর বয়সে 'ভিখারিণী' (১৮৭৭) ছোটগল্পটি রচনার মাধ্যমে আত্মপ্রকাশ করেন।" },
    { q: "মাইকেল মধুসূদন দত্ত প্রবর্তিত 'অমিত্রাক্ষর ছন্দ' প্রকৃত পক্ষে বাংলা কোন ছন্দের নব-রূপায়ণ?", options: ["স্বরবৃত্ত ছন্দ","অক্ষরবৃত্ত ছন্দ","মাত্রাবৃত্ত ছন্দ","গৈরিশ ছন্দ"], correct: "B", explanation: "অমিত্রাক্ষর ছন্দ হলো অক্ষরবৃত্ত ছন্দেরই একটি রূপ, যেখানে চরণের শেষে মিল থাকে না।" },
    { q: "'আমার পথ' প্রবন্ধটি কাজী নজরুল ইসলামের কোন গ্রন্থ থেকে সংকলিত হয়েছে?", options: ["যুগ-বাণী","রুদ্র-মঙ্গল","দুর্দিনের যাত্রী","রাজবন্দির জবানবন্দি"], correct: "B", explanation: "'আমার পথ' প্রবন্ধটি কাজী নজরুল ইসলামের 'রুদ্র-মঙ্গল' (১৯২৬) প্রবন্ধগ্রন্থ থেকে সংকলিত।" },
    // ── 49th BCS Special ──
    { q: "'পরিবার থেকেই শিক্ষার শুরু'-এখানে 'থেকে' শব্দের সাথে যুক্ত 'ই'-এর ব্যাকরণিক পরিচয় কী?", options: ["উপসর্গ","প্রত্যয়","ধাতু","বলক"], correct: "D", explanation: "বাংলা ব্যাকরণে যেসব শব্দাংশ পদের সঙ্গে যুক্ত হলে বক্তব্য জোরালো হয়, সেগুলোকে বলক বলে।" },
    { q: "আহমদ শরীফের মতে মধ্যযুগে চণ্ডীদাস নামে কতজন কবি ছিলেন?", options: ["২","৩","৪","৫"], correct: "B", explanation: "আহমদ শরীফের গবেষণা অনুসারে, মধ্যযুগে চণ্ডীদাস নামে তিনজন কবি ছিলেন।" },
    { q: "মধুসূদন দত্তের পূর্ববর্তী গুরুত্বপূর্ণ কবি কে?", options: ["রবীন্দ্রনাথ ঠাকুর","কায়কোবাদ","ঈশ্বরচন্দ্র গুপ্ত","ইসমাইল হোসেন সিরাজী"], correct: "C", explanation: "ঈশ্বরচন্দ্র গুপ্ত (১৮১২-১৮৫৯) ছিলেন মধুসূদন দত্তের পূর্ববর্তী এবং সমসাময়িক কালের একজন গুরুত্বপূর্ণ কবি।" },
    { q: "'এ কাজ করতে আমি বদ্ধ পরিকর'- এখানে 'পরিকর' শব্দের অর্থ কী?", options: ["শ্বাস","প্রতিজ্ঞা","কোমর","প্রতিশ্রুত"], correct: "C", explanation: "'পরিকর' শব্দের আক্ষরিক অর্থ কোমর বা কটিবন্ধ।" },
  ];

  MCQ_BUILTIN_DECKS['BCS · English Language & Literature'] = [
    // ── 47th BCS ──
    { q: "A speech made without any previous thought, preparation or practice is called a/an ______.", options: ["free speech","extempore speech","maiden speech","rousing speech"], correct: "B", explanation: "An 'extempore speech' is delivered without prior preparation." },
    { q: "Which one has the identical singular and plural form?", options: ["Memorandum","Stimulus","Dice","Oasis"], correct: "C", explanation: "In modern usage 'dice' is used for both singular and plural." },
    { q: "The idiom 'smell a rat' means to _______.", options: ["detect bad smell","be in a bad mood","suspect something wrong","see hidden meaning"], correct: "C", explanation: "To 'smell a rat' means to suspect trickery or deception." },
    { q: "Select the synonym for 'inclement':", options: ["affable","mild","rough","genial"], correct: "C", explanation: "'Inclement' (usually describing weather) means unpleasantly cold or wet. 'Rough' is a synonym." },
    { q: "Which sentence is correct?", options: ["One of my sisters are a nurse.","One of my sister is a nurse.","One of my sisters is a nurse.","One of my sister's are a nurse."], correct: "C", explanation: "The structure is 'One of' + plural noun + singular verb." },
    { q: "Choose the antonym of 'controversy':", options: ["contention","bickering","unanimity","dispute"], correct: "C", explanation: "'Controversy' means disagreement; 'unanimity' means agreement by all." },
    { q: "'For God's sake hold your tongue, and let me love.' This line is taken from the poem ______.", options: ["To His Coy Mistress","The Canonization","The Definition of Love","The Sun Rising"], correct: "B", explanation: "This is the opening line of John Donne's poem 'The Canonization'." },
    { q: "Who authored the futuristic novel 'Brave New World'?", options: ["E. M. Forster","Virginia Woolf","Aldous Leonard Huxley","Graham Greene"], correct: "C", explanation: "'Brave New World' is a dystopian novel by Aldous Huxley, published in 1932." },
    { q: "Who is the playwright of the absurd drama 'Waiting for Godot'?", options: ["Jean Genet","Samuel Beckett","Harold Pinter","Tom Stoppard"], correct: "B", explanation: "'Waiting for Godot' is a landmark play of the Theatre of the Absurd by Samuel Beckett." },
    { q: "Who wrote the novella 'Heart of Darkness'?", options: ["Joseph Conrad","Doris Lessing","John Osborne","Thomas Hardy"], correct: "A", explanation: "'Heart of Darkness' is a famous novella by Joseph Conrad." },
    // ── 46th BCS ──
    { q: "'Sweet are the uses of adversity' is quoted from Shakespeare's –", options: ["Julius Caesar","Macbeth","Comedy of Errors","As you Like It"], correct: "D", explanation: "This famous line is spoken by Duke Senior in Act II, Scene I of 'As You Like It'." },
    { q: "The poetic drama 'Murder in the Cathedral' was written by—", options: ["Harold Pinter","G. B. Shaw","T. S. Eliot","Samuel Beckett"], correct: "C", explanation: "'Murder in the Cathedral' is a verse drama by T. S. Eliot, first performed in 1935." },
    { q: "Caliban is an important character from Shakespeare's—", options: ["The Tempest","Hamlet","Macbeth","Othello"], correct: "A", explanation: "Caliban is a key character in William Shakespeare's play 'The Tempest'." },
    { q: "Who wrote the picaresque novel titled 'Tom Jones'?", options: ["Samuel Richardson","Horace Walpole","Henry Fielding","Laurence Sterne"], correct: "C", explanation: "'Tom Jones' is a comic novel by Henry Fielding." },
    { q: "Which period is known as 'The Golden Age of English Literature'?", options: ["The Victorian Age","The Elizabethan Age","The Eighteen century","The Restoration period"], correct: "B", explanation: "The Elizabethan Age is often called the Golden Age because of the flourishing of literature." },
    // ── 45th BCS ──
    { q: "The phrase 'Achilles heel' means–", options: ["a strong point","a strong solution","a weak point","a permanent solution"], correct: "C", explanation: "An 'Achilles' heel' is a fatal weakness in spite of overall strength." },
    { q: "Who is not a Victorian Poet?", options: ["Alfred Tennyson","Robert Browning","William Wordsworth","Matthew Arnold"], correct: "C", explanation: "William Wordsworth was a major poet of the Romantic Period, not Victorian." },
    { q: "Which of the following novels was written by George Orwell?", options: ["1984","Brave New World","A Clockwork Orange","For Whom the Bell Tolls"], correct: "A", explanation: "'Nineteen Eighty-Four' (1984) is a famous dystopian novel by George Orwell." },
    { q: "The poem 'To his Coy Mistress' was written by-", options: ["Andrew Marvell","John Donne","George Herbert","Henry Vaughan"], correct: "A", explanation: "'To His Coy Mistress' is a famous metaphysical poem written by Andrew Marvell." },
    { q: "The character, Elizabeth Bennet, appears in the novel-", options: ["Pride and Prejudice","Tess of the D'Urbervilles","Wuthering Heights","Jane Eyre"], correct: "A", explanation: "Elizabeth Bennet is the protagonist of Jane Austen's 'Pride and Prejudice'." },
    { q: "Who wrote the poem 'Ozymandias'?", options: ["Thomas Hardy","Robert Frost","P.B. Shelley","Edmund Spenser"], correct: "C", explanation: "'Ozymandias' is a famous sonnet by Percy Bysshe Shelley, first published in 1818." },
    { q: "Clym Yeobright is the protagonist of the novel—", options: ["David Copperfield","Adam Bede","A Passage to India","The Return of the Native"], correct: "D", explanation: "Clym Yeobright is the central character in Thomas Hardy's 'The Return of the Native' (1878)." },
    // ── 44th BCS ──
    { q: "Alexander Pope's 'Essay on Man' is a—", options: ["novel","treatise","short story","poem"], correct: "D", explanation: "'An Essay on Man' is a philosophical poem written by Alexander Pope in heroic couplets." },
    { q: "Francis Bacon is an illustrious—", options: ["essayist","dramatist","novelist","journalist"], correct: "A", explanation: "Francis Bacon is renowned as the 'father of the English essay'." },
    { q: "'He prayeth best, who loveth best.' —Who said it?", options: ["John Milton","John Donne","Lord Byron","S.T. Coleridge"], correct: "D", explanation: "This line is from Samuel Taylor Coleridge's 'The Rime of the Ancient Mariner'." },
    { q: "'Paradise Lost' attempted to—", options: ["justify the ways of man to God","show that Satan and God have equal power","justify the ways of God to man","explain why both good and evil are necessary"], correct: "C", explanation: "In the opening of 'Paradise Lost', John Milton states his purpose is to 'justify the ways of God to men'." },
    // ── 49th BCS Special ──
    { q: "Which sentence is grammatically correct?", options: ["He don't know","He doesn't know","He not know","He isn't know"], correct: "B", explanation: "'Doesn't' is used with third-person singular subjects." },
    { q: "Choose the correct passive voice: 'They built the bridge.'", options: ["The bridge was built by them.","The bridge is built by them.","The bridge built by them.","The bridge were built by them."], correct: "A", explanation: "Past simple passive: was/were + past participle." },
    { q: "The antonym of 'Frugal' is:", options: ["Thrifty","Economical","Extravagant","Careful"], correct: "C", explanation: "Frugal means careful with money; extravagant is its antonym." },
    { q: "Which is the correct spelling?", options: ["Recieve","Receive","Recive","Receeve"], correct: "B", explanation: "The correct spelling is 'Receive' — remember 'i before e except after c'." },
  ];

  MCQ_BUILTIN_DECKS['BCS · বাংলাদেশ বিষয়াবলি'] = [
    // ── 47th BCS ──
    { q: "কোন মুসলিম চিন্তাবিদ প্রথম 'দ্বি-জাতি তত্ত্ব' সম্পর্কে স্পষ্ট ধারণা দেন?", options: ["আল্লামা ইকবাল","সৈয়দ আহমদ খান","মোহাম্মদ আলী জিন্নাহ","মওলানা আকরম খাঁ"], correct: "B", explanation: "স্যার সৈয়দ আহমদ খান ১৮৮৮ সালে মীরাটে প্রথম হিন্দু ও মুসলিমদের দুটি পৃথক জাতি হিসেবে উল্লেখ করেন।" },
    { q: "কোন বছর পাকিস্তান সরকার বাংলাকে অন্যতম রাষ্ট্রভাষা হিসেবে স্বীকৃতি দেয়?", options: ["১৯৫২","১৯৫৪","১৯৫৬","১৯৬৯"], correct: "C", explanation: "১৯৫৬ সালের পাকিস্তানের প্রথম সংবিধানে বাংলা ও উর্দুকে রাষ্ট্রভাষা হিসেবে স্বীকৃতি দেওয়া হয়।" },
    { q: "বাংলাদেশ কোন তারিখে জাতিসংঘের সদস্যপদ লাভ করে?", options: ["১৭ সেপ্টেম্বর ১৯৭৪","১৮ সেপ্টেম্বর ১৯৭৪","১৯ সেপ্টেম্বর ১৯৭৪","২০ সেপ্টেম্বর ১৯৭৪"], correct: "A", explanation: "বাংলাদেশ ১৭ সেপ্টেম্বর ১৯৭৪ সালে জাতিসংঘের সদস্যপদ লাভ করে।" },
    { q: "বাংলাদেশের সংবিধানের রক্ষাকর্তা-", options: ["প্রেসিডেন্ট","জাতীয় সংসদ","বাংলাদেশ সুপ্রীম কোর্ট","হাই কোর্ট"], correct: "C", explanation: "বাংলাদেশ সুপ্রিম কোর্ট সংবিধানের অভিভাবক ও ব্যাখ্যাকারক।" },
    { q: "তত্ত্বাবধায়ক সরকার ব্যবস্থা পুনঃপ্রবর্তনের জন্য সংবিধানের যে সংশোধন বাতিল করতে হবে-", options: ["পঞ্চদশ","দ্বাদশ","একাদশ","ত্রয়োদশ"], correct: "A", explanation: "সংবিধানের পঞ্চদশ সংশোধনীর মাধ্যমে তত্ত্বাবধায়ক সরকার ব্যবস্থা বাতিল করা হয়েছিল।" },
    { q: "ঢাকা বিশ্ববিদ্যালয় বিল কত সালে আইনে পরিণত হয়?", options: ["০৭ মার্চ ১৯১৭","১৮ মার্চ ১৯২০","২১ মার্চ ১৯১৯","১১ মার্চ ১৯১৮"], correct: "B", explanation: "ঢাকা বিশ্ববিদ্যালয় আইন ১৯২০ সালে পাস হয় এবং ১৯২১ সালের ১ জুলাই থেকে কার্যক্রম শুরু হয়।" },
    // ── 46th BCS ──
    { q: "পাহাড়পুরের 'সোমপুর মহাবিহার' বাংলার কোন শাসন আমলের স্থাপত্য কীর্তির নিদর্শন?", options: ["মৌর্য","পাল","গুপ্ত","চন্দ্র"], correct: "B", explanation: "সোমপুর মহাবিহার পাল বংশের দ্বিতীয় রাজা ধর্মপাল কর্তৃক আনুমানিক ৭৮১-৮২১ খ্রিস্টাব্দে স্থাপিত হয়।" },
    { q: "ঐতিহাসিক ৬-দফা দাবিতে কোন দু'টি বিষয় কেন্দ্রিয় সরকারের হাতে রাখার প্রস্তাব ছিল?", options: ["বৈদেশিক বাণিজ্য ও প্রতিরক্ষা","অর্থ ও পররাষ্ট্র","স্বরাষ্ট্র ও পরিকল্পনা","প্রতিরক্ষা ও পররাষ্ট্র"], correct: "D", explanation: "ছয় দফার দ্বিতীয় দফায় কেন্দ্রীয় সরকারের এখতিয়ারে কেবল প্রতিরক্ষা ও পররাষ্ট্র রাখার কথা বলা হয়।" },
    { q: "বাংলাদেশের কোন বিভাগে জনসংখ্যার ঘনত্ব সবচেয়ে কম?", options: ["সিলেট","খুলনা","বরিশাল","চট্টগ্রাম"], correct: "C", explanation: "জনশুমারি ২০২২ অনুযায়ী, বরিশাল বিভাগে জনসংখ্যার ঘনত্ব সবচেয়ে কম।" },
    { q: "বাংলাদেশ সরকার কোন উৎস থেকে সর্বোচ্চ রাজস্ব আয় করে?", options: ["ভূমি রাজস্ব","মূল্য সংযোজন কর","আয়কর","আমদানি শুল্ক"], correct: "B", explanation: "বাংলাদেশ সরকারের রাজস্ব আয়ের বৃহত্তম উৎস হলো মূল্য সংযোজন কর (ভ্যাট)।" },
    { q: "বাংলাদেশের প্রথম রাষ্ট্রপতি কে?", options: ["বঙ্গবন্ধু শেখ মুজিবুর রহমান","সৈয়দ নজরুল ইসলাম","তাজউদ্দীন আহমেদ","বিচারপতি আবু সাঈদ চৌধুরী"], correct: "A", explanation: "মুজিবনগর সরকারের ঘোষণাপত্র অনুযায়ী, বঙ্গবন্ধু শেখ মুজিবুর রহমান ছিলেন গণপ্রজাতন্ত্রী বাংলাদেশের প্রথম রাষ্ট্রপতি।" },
    // ── 44th BCS ──
    { q: "UNESCO কত তারিখে ২১ ফেব্রুয়ারিকে আন্তর্জাতিক মাতৃভাষা দিবস হিসেবে স্বীকৃতি দেয়?", options: ["১৮ নভেম্বর ১৯৯৯","১৭ নভেম্বর ১৯৯৯","১৯ নভেম্বর ২০০১","২০ নভেম্বর ২০০১"], correct: "B", explanation: "১৯৯৯ সালের ১৭ নভেম্বর ইউনেস্কোর ৩০তম সাধারণ অধিবেশনে ২১শে ফেব্রুয়ারিকে আন্তর্জাতিক মাতৃভাষা দিবস ঘোষণা করা হয়।" },
    { q: "বাংলার সর্বপ্রাচীন জনপদের নাম কী?", options: ["পুণ্ড্রু","তাম্রলিপ্ত","গৌড়","হরিকেল"], correct: "A", explanation: "প্রত্নতাত্ত্বিক নিদর্শনের ভিত্তিতে পুণ্ড্র হলো বাংলার সবচেয়ে প্রাচীন জনপদ।" },
    { q: "বাংলাদেশের স্বাধীনতা যুদ্ধে কতজন মুক্তিযোদ্ধাকে 'বীর বিক্রম' খেতাবে ভূষিত করা হয়?", options: ["৭ জন","৬৮ জন","১৭৫ জন","৪২৬ জন"], correct: "C", explanation: "মুক্তিযুদ্ধে বীর বিক্রম (তৃতীয় সর্বোচ্চ খেতাব) লাভ করেন ১৭৫ জন।" },
    { q: "বাংলাদেশের জাতীয় প্রতীকে কয়টি তারকা আছে?", options: ["২টি","৩টি","৪টি","৫টি"], correct: "C", explanation: "বাংলাদেশের জাতীয় প্রতীকে পানিতে ভাসমান শাপলার দুই পাশে দুটি করে মোট চারটি তারকা রয়েছে।" },
    { q: "বাংলাদেশে জুম চাষ কোথায় হয়?", options: ["বান্দরবান","ময়মনসিংহ","রাজশাহী","দিনাজপুর"], correct: "A", explanation: "জুম চাষ পার্বত্য চট্টগ্রাম অঞ্চলের ক্ষুদ্র নৃ-গোষ্ঠীর মানুষেরা অনুসরণ করে।" },
    // ── 45th BCS ──
    { q: "'ভারত ছাড়' আন্দোলন শুরু হয়—", options: ["১৯১৭ সালে","১৯২৭ সালে","১৯৩৭ সালে","১৯৪২ সালে"], correct: "D", explanation: "মহাত্মা গান্ধীর নেতৃত্বে ১৯৪২ সালের আগস্ট মাসে 'ভারত ছাড়' আন্দোলনের প্রস্তাব গৃহীত হয়।" },
    { q: "'প্রজাতন্ত্রের রাষ্ট্রভাষা বাংলা' কথাটি সংবিধানের কোন্‌ অনুচ্ছেদে বলা হয়েছে?", options: ["অনুচ্ছেদ : ২","অনুচ্ছেদ : ৩","অনুচ্ছেদ : ৪","অনুচ্ছেদ : ৫"], correct: "B", explanation: "বাংলাদেশ সংবিধানের ৩য় অনুচ্ছেদে বলা হয়েছে: 'প্রজাতন্ত্রের রাষ্ট্রভাষা বাংলা'।" },
    { q: "কোন দেশ বাংলা ভাষাকে তাদের অন্যতম রাষ্ট্রভাষা হিসেবে স্বীকৃতি দিয়েছে?", options: ["লাইবেরিয়া","নামিবিয়া","হাইতি","সিয়েরা লিওন"], correct: "D", explanation: "সিয়েরা লিওন ২০০২ সালে বাংলাকে তাদের অন্যতম সম্মানসূচক রাষ্ট্রভাষা হিসেবে স্বীকৃতি দেয়।" },
    { q: "আয়তনে বাংলাদেশের সবচেয়ে বড় জেলা কোনটি?", options: ["রাঙ্গামাটি","বরিশাল","চট্টগ্রাম","ময়মনসিংহ"], correct: "A", explanation: "আয়তনের দিক থেকে বাংলাদেশের বৃহত্তম জেলা হলো রাঙ্গামাটি (৬১১৬ বর্গ কিলোমিটার)।" },
    // ── 49th BCS Special ──
    { q: "বাংলাদেশ ব্যাংকের রিজার্ভ থেকে চুরি করা অর্থ পাচার করা হয়-", options: ["যুক্তরাষ্ট্র ও ইন্দোনেশিয়ায়","যুক্তরাষ্ট্র ও ভারতে","যুক্তরাষ্ট্র ও ফিলিপাইনে","শ্রীলংকা ও ফিলিপাইনে"], correct: "D", explanation: "২০১৬ সালে বাংলাদেশ ব্যাংকের রিজার্ভ চুরির ঘটনায় অর্থ শ্রীলঙ্কা ও ফিলিপাইনে স্থানান্তরিত হয়েছিল।" },
    { q: "বাংলাদেশের বৃহত্তম সার কারখানার নাম-", options: ["ইউরিয়া ফার্টিলাইজার ফ্যাক্টরি লিমিটেড","যমুনা ফার্টিলাইজার কোম্পানি লিমিটেড","পলাশ ইউরিয়া ফার্টিলাইজার কোম্পানি লিমিটেড","ন্যাচারাল গ্যাস ফার্টিলাইজার কোম্পানি লিমিটেড"], correct: "C", explanation: "নরসিংদীর ঘোড়াশাল-পলাশ ইউরিয়া ফার্টিলাইজার কোম্পানি লিমিটেড বর্তমানে দেশের সর্ববৃহৎ সার কারখানা।" },
    { q: "জুলাই শহিদ দিবস কোনটি?", options: ["০১ জুলাই","২৯ জুলাই","০৫ আগস্ট","১৬ জুলাই"], correct: "D", explanation: "২০২৪ সালের ছাত্র-জনতার আন্দোলনে ১৬ জুলাই রংপুরে আবু সাঈদ শহীদ হন। এই দিনটিকে জুলাই শহীদ দিবস হিসেবে পালনের ঘোষণা দেওয়া হয়েছে।" },
  ];

  MCQ_BUILTIN_DECKS['BCS · আন্তর্জাতিক বিষয়াবলি'] = [
    { q: "ন্যাটো (NATO) চার্টারের কোন ধারায় সম্মিলিত প্রতিরক্ষার কথা উল্লেখ আছে?", options: ["আর্টিকেল-২","আর্টিকেল-৩","আর্টিকেল-৫","আর্টিকেল-৬"], correct: "C", explanation: "ন্যাটো সনদের আর্টিকেল ৫-এ সম্মিলিত প্রতিরক্ষার নীতি বর্ণিত হয়েছে।" },
    { q: "রোম সংবিধি (Rome Statute) এর ফলে কোন সংস্থাটি প্রতিষ্ঠিত হয়?", options: ["International Court of Justice (ICJ)","International Criminal Court (ICC)","International Atomic Energy Agency (IAEA)","European Union (EU)"], correct: "B", explanation: "১৯৯৮ সালের রোম সংবিধির মাধ্যমে আন্তর্জাতিক অপরাধ আদালত (ICC) প্রতিষ্ঠিত হয়।" },
    { q: "কিয়োটো প্রটোকলের বিষয়বস্তু কী?", options: ["ওজোনস্তরের ক্ষয় হ্রাস","জৈব নিরাপত্তা","জীববৈচিত্র্যের সুরক্ষা","গ্রিন হাউস গ্যাস নির্গমন হ্রাস"], correct: "D", explanation: "কিয়োটো প্রটোকল (১৯৯৭) গ্রিন হাউস গ্যাস নির্গমন হ্রাসের উদ্দেশ্যে গৃহীত একটি আন্তর্জাতিক চুক্তি।" },
    { q: "বিশ্ব পরিবেশ দিবস কোনটি?", options: ["৫ জুন","২২ এপ্রিল","৬ জুলাই","৫ জুলাই"], correct: "A", explanation: "প্রতি বছর ৫ জুন বিশ্ব পরিবেশ দিবস পালিত হয়।" },
    { q: "SAARC এর প্রথম শীর্ষ বৈঠক অনুষ্ঠিত হয়---", options: ["১৯৮৪ সালে","১৯৮৭ সালের","১৯৮৫ সালে","১৯৮৬ সালে"], correct: "C", explanation: "SAARC (South Asian Association for Regional Cooperation) প্রতিষ্ঠিত হয় ১৯৮৫ সালে।" },
    { q: "জাতিসংঘের বিশ্ব পর্যটন সংস্থার সদর দপ্তর কোথায়?", options: ["তুরিন, ইতালি","মাদ্রিদ, স্পেন","প্যারিস, ফ্রান্স","ফ্রাঙ্কফুর্ট, জার্মানি"], correct: "B", explanation: "জাতিসংঘের বিশ্ব পর্যটন সংস্থার (UN Tourism) সদর দপ্তর স্পেনের মাদ্রিদে অবস্থিত।" },
    { q: "কোন দেশটি OPEC এর সদস্য নয়?", options: ["ইন্দোনেশিয়া","নাইজেরিয়া","বাংলাদেশ","গ্যাবন"], correct: "C", explanation: "বাংলাদেশ কখনোই তেল রপ্তানিকারক দেশগুলোর সংস্থা OPEC এর সদস্য ছিল না।" },
    { q: "কোন দেশ থেকে 'আরব বসন্ত'-এর সূচনা হয়?", options: ["মিশর","তিউনিশিয়া","লিবিয়া","সিরিয়া"], correct: "B", explanation: "২০১০ সালের ডিসেম্বরে তিউনিসিয়ায় 'আরব বসন্ত' নামে পরিচিত গণ-আন্দোলনের সূচনা হয়।" },
    { q: "কোন সালে রাশিয়া ক্রিমিয়া দখল করে?", options: ["২০১০","২০১২","২০১৪","২০১৬"], correct: "C", explanation: "২০১৪ সালে রাশিয়া ইউক্রেনের ক্রিমিয়া উপদ্বীপকে সামরিক হস্তক্ষেপের মাধ্যমে দখল করে।" },
    { q: "বৈশ্বিক শান্তিসূচক ২০২৩ অনুযায়ী বিশ্বের সবচেয়ে শান্তিপূর্ণ দেশ হলো –", options: ["আইসল্যান্ড","জাপান","সিংগাপুর","সুইজারল্যান্ড"], correct: "A", explanation: "বৈশ্বিক শান্তি সূচক ২০২৩ অনুযায়ী, বিশ্বের সবচেয়ে শান্তিপূর্ণ দেশ হলো আইসল্যান্ড।" },
    { q: "ভারত ও পাকিস্তানের মধ্যে সিন্ধু নদের পানিবণ্টন চুক্তি কবে সম্পাদিত হয়?", options: ["১৯৬০","১৯৬৬","১৯৭৪","১৯৭৫"], correct: "A", explanation: "১৯৬০ সালে বিশ্বব্যাংকের মধ্যস্থতায় ভারত ও পাকিস্তানের মধ্যে সিন্ধু পানি চুক্তি স্বাক্ষরিত হয়।" },
    { q: "বর্তমানে অর্থনীতির ব্যাপ্তি অনুসারে বিশ্বের বৃহত্তম অর্থনৈতিক জোট কোনটি?", options: ["EU","WTO","RCEP","AU"], correct: "C", explanation: "RCEP (Regional Comprehensive Economic Partnership) বর্তমানে বিশ্বের বৃহত্তম মুক্ত বাণিজ্য ও অর্থনৈতিক জোট।" },
    { q: "জাতিসংঘের নিরাপত্তা পরিষদের অস্থায়ী সদস্য পদ কত সময়ের জন্য?", options: ["১ বছর","২ বছর","৪ বছর","৫ বছর"], correct: "B", explanation: "জাতিসংঘের নিরাপত্তা পরিষদের ১০টি অস্থায়ী সদস্য রাষ্ট্র দুই বছরের জন্য নির্বাচিত হয়।" },
    { q: "ফিফা বিশ্বকাপ ফুটবল কখন প্রথম অনুষ্ঠিত হয়?", options: ["১৯২৯","১৯৩০","১৯৩১","১৯৩২"], correct: "B", explanation: "প্রথম ফিফা বিশ্বকাপ ফুটবল ১৯৩০ সালে উরুগুয়েতে অনুষ্ঠিত হয়।" },
    { q: "বান্দা আচেহ কোথায় অবস্থিত?", options: ["ইন্দোনেশিয়া","থাইল্যান্ড","ফিলিপাইন","কম্বোডিয়া"], correct: "A", explanation: "বান্দা আচেহ ইন্দোনেশিয়ার সুমাত্রা দ্বীপের উত্তর প্রান্তে অবস্থিত আচেহ প্রদেশের রাজধানী।" },
  ];

  MCQ_BUILTIN_DECKS['BCS · সাধারণ বিজ্ঞান'] = [
    { q: "তরঙ্গের বেলায় কোন্‌টি সত্য?", options: ["তড়িৎ চৌম্বকতরঙ্গ আলোর বেগে গমন করে","শব্দতরঙ্গ একধরনের তড়িৎ চৌম্বকতরঙ্গ","সকল তরঙ্গেই প্রতিফলন-প্রতিসরণ হয় না","তরঙ্গবেগ হলো এর কম্পাঙ্ক ও তরঙ্গ দৈর্ঘ্যের অনুপাত"], correct: "A", explanation: "তড়িৎ চৌম্বকীয় তরঙ্গ শূন্য মাধ্যমে আলোর বেগে (৩×১০⁸ মি/সে) চলাচল করে।" },
    { q: "কোন্ গ্যাস গ্রিন হাউস ইফেক্ট ঘটায়?", options: ["হাইড্রোজেন","নাইট্রোজেন","অক্সিজেন","মিথেন"], correct: "D", explanation: "মিথেন (CH₄) একটি শক্তিশালী গ্রিন হাউস গ্যাস।" },
    { q: "কোন ধাতু পানিতে ফেললে আগুন ধরে যায়?", options: ["সোডিয়াম","ম্যাগনেসিয়াম","রেডিয়াম","ইউরেনিয়াম"], correct: "A", explanation: "সোডিয়াম পানির সংস্পর্শে এলে তীব্র বিক্রিয়া করে হাইড্রোজেন গ্যাস উৎপন্ন করে এবং আগুন ধরে যায়।" },
    { q: "কোন স্পেস টেলিস্কোপ ২০২১ সালে হাবল টেলিস্কোপের স্থলাভিষিক্ত হয়?", options: ["জেমস ওয়েব","পাথ ফাইন্ডার","স্পিটজার","জন কেপলার"], correct: "A", explanation: "২০২১ সালের ২৫ ডিসেম্বর জেমস ওয়েব স্পেস টেলিস্কোপ (JWST) উৎক্ষেপণ করা হয়।" },
    { q: "হাইড্রোজেন বোমায় ক্রিয়া করে-", options: ["ফিশন বিক্রিয়া","ফিউশন বিক্রিয়া","ফিশন ও ফিউশন উভয়টিই","সাধারণ রাসায়নিক বিক্রিয়া"], correct: "C", explanation: "হাইড্রোজেন বোমার মূল নীতি ফিউশন হলেও, ফিউশন শুরু করার জন্য প্রথমে একটি ফিশন বোমা বিস্ফোরিত করা হয়।" },
    { q: "ফিটকিরিতে কত অণু পানি থাকে?", options: ["২৪","১৫","০৭","০৫"], correct: "A", explanation: "ফিটকিরি বা পটাশ অ্যালামের রাসায়নিক সংকেত K₂SO₄.Al₂(SO₄)₃.24H₂O। এতে ২৪ অণু পানি থাকে।" },
    { q: "নিচের কোনটি গ্রীনহাউজ গ্যাস নয়?", options: ["জলীয় বাষ্প (H₂O)","কার্বন ডাইঅক্সাইড (CO₂)","মিথেন (CH₄)","নাইট্রিক অক্সাইড (NO)"], correct: "D", explanation: "নাইট্রিক অক্সাইড (NO) একটি বায়ুদূষক কিন্তু সরাসরি গ্রিনহাউস গ্যাস হিসেবে গণ্য হয় না।" },
    { q: "জলীয় দ্রবণে pH এর সর্বোচ্চ মান কোনটি?", options: ["৭","১০","১৪","২০"], correct: "C", explanation: "pH স্কেলের পরিসর ০ থেকে ১৪ পর্যন্ত। ১৪ হলো সর্বোচ্চ ক্ষারীয় মান।" },
    { q: "কোন অর্গানেলটি পর্দা দ্বারা আবেষ্টিত থাকে না?", options: ["রাইবোসোম","ক্লোরোপ্লাস্ট","মাইটোকন্ড্রিয়া","পারোক্সিসোম"], correct: "A", explanation: "রাইবোসোম একটি পর্দাবিহীন কোষীয় অঙ্গাণু, যা প্রোটিন সংশ্লেষণে সাহায্য করে।" },
    { q: "প্রকৃতিতে মৌলিক বল কয়টি?", options: ["2 টি","3 টি","4 টি","5 টি"], correct: "C", explanation: "প্রকৃতিতে মৌলিক বল ৪টি: মহাকর্ষ বল, তড়িৎ-চুম্বকীয় বল, সবল নিউক্লীয় বল এবং দুর্বল নিউক্লীয় বল।" },
    { q: "জেমস্ ওয়েব টেলিস্কোপ কোন ধরনের রেডিয়েশন ব্যবহার করে?", options: ["Ultra-violet","Infrared","Visible","X-ray"], correct: "B", explanation: "জেমস ওয়েব স্পেস টেলিস্কোপ (JWST) মূলত ইনফ্রারেড তরঙ্গদৈর্ঘ্যের আলো পর্যবেক্ষণের জন্য ডিজাইন করা হয়েছে।" },
    { q: "রক্ত জমাট বাঁধার জন্য প্রয়োজনীয় ভিটামিনটি হল-", options: ["Vitamin K","Vitamin A","Vitamin B","Vitamin C"], correct: "A", explanation: "ভিটামিন কে রক্ত জমাট বাঁধার জন্য প্রয়োজনীয় প্রোথ্রোমবিনসহ কয়েকটি ফ্যাক্টর তৈরিতে সাহায্য করে।" },
    { q: "মানুষের দেহকোষে ক্রোমোজমের সংখ্যা –", options: ["৪৪ টি","৪২ টি","৪৬ টি","৪৮ টি"], correct: "C", explanation: "মানুষের প্রতিটি দেহকোষে ২৩ জোড়া বা ৪৬টি ক্রোমোজোম থাকে।" },
    { q: "অণুজীব বিজ্ঞানের জনক কে?", options: ["রবার্ট কক্","লুইস পাস্তুর","এডওয়ার্ড জেনার","এন্টনি ভন লিউয়েনহুক"], correct: "D", explanation: "অ্যান্টনি ভন লিউয়েনহুক সর্বপ্রথম নিজের তৈরি অণুবীক্ষণ যন্ত্রের মাধ্যমে ব্যাকটেরিয়া পর্যবেক্ষণ করেন।" },
    { q: "আর্সেনিকের পারমাণবিক সংখ্যা কত?", options: ["৩৩","৩৮","৩৬","৪৪"], correct: "A", explanation: "আর্সেনিক (As) এর পারমাণবিক সংখ্যা হলো ৩৩।" },
  ];

  MCQ_BUILTIN_DECKS['BCS · কম্পিউটার ও তথ্যপ্রযুক্তি'] = [
    { q: "LLM চালানোর জন্য কম্পিউটারের কোন যন্ত্রাংশ সবচেয়ে বেশি গুরুত্বপূর্ণ?", options: ["RAM","Processor","Graphics Card","Storage Device"], correct: "C", explanation: "লার্জ ল্যাঙ্গুয়েজ মডেল (LLM) প্রসেস করার জন্য প্রচুর প্যারালাল প্রসেসিং ক্ষমতার প্রয়োজন, যা GPU প্রদান করে।" },
    { q: "Quantum Computing এর জনক কাকে মনে করা হয়?", options: ["David Deutsch","Richard Feynman","Paul Benloff","Alexei Kitaev"], correct: "A", explanation: "ডেভিড ডয়েচকে কোয়ান্টাম কম্পিউটিংয়ের জনক বলা হয়।" },
    { q: "ই-কমার্সে সুরক্ষিত অনলাইন লেনদেনে প্রধানত কোন প্রটোকল ব্যবহৃত হয়?", options: ["DHCP","SMTP","HTTPS","ARP"], correct: "C", explanation: "অনলাইনে নিরাপদ তথ্য আদান-প্রদান এবং লেনদেনের জন্য HTTPS প্রটোকল ব্যবহৃত হয়।" },
    { q: "বিভিন্ন নেটওয়ার্কের মধ্যে যোগাযোগ স্থাপনের জন্য নিচের কোন ডিভাইসটি ব্যবহৃত হয়?", options: ["রাউটার","সুইচ","ব্রিজ","হাব"], correct: "A", explanation: "রাউটার ভিন্ন ভিন্ন নেটওয়ার্কের মধ্যে ডেটা প্যাকেট আদান-প্রদান করে।" },
    { q: "কোন CPU আর্কিটেকচার স্মার্টফোনে বেশি ব্যবহৃত হয়?", options: ["X86","X64","Qualcomm","RISC"], correct: "D", explanation: "স্মার্টফোনে ব্যবহৃত প্রসেসরগুলো (যেমন ARM) সাধারণত RISC আর্কিটেকচারের ওপর ভিত্তি করে তৈরি।" },
    { q: "কম্পিউটার টার্ন অন এর সময় সঠিক অর্ডার নিচের কোনটি?", options: ["POST → Kernel → Bootloader","Kernel → POST → Bootloader","Kernel → Bootloader → POST","POST → Bootloader → Kernel"], correct: "D", explanation: "বুটিং প্রক্রিয়ায় প্রথমে POST হয়, তারপর বুটলোডার রান করে এবং শেষে কার্নেল লোড হয়।" },
    { q: "কোন ধরনের Storage Device সবচেয়ে দ্রুত গতি সম্পন্ন?", options: ["HDD","Floppy Disk","SSD","SSHD"], correct: "C", explanation: "SSD (Solid State Drive) ফ্ল্যাশ মেমোরি প্রযুক্তি ব্যবহার করে, যা HDD-এর তুলনায় অনেক দ্রুত।" },
    { q: "ইন্টারনেট যোগাযোগ ব্যবস্থায় Hostname-কে IP Address-এ অনুবাদ করে –", options: ["FTP Server","Firewall","DNS Server","Gateway"], correct: "C", explanation: "DNS (Domain Name System) সার্ভার মানুষের পাঠযোগ্য ডোমেইন নেম কে আইপি অ্যাড্রেসে রূপান্তর করে।" },
    { q: "নিচের কোন সাইবার আক্রমণে গ্রাহক নিজ Computer System ব্যবহার করতে পারেন না এবং অর্থ দাবি করা হয়?", options: ["Phishing","Denial of Service","Ransomware","Man-in-the-Middle"], correct: "C", explanation: "র‍্যানসমওয়্যার ব্যবহারকারীর ফাইল এনক্রিপ্ট করে অকেজো করে দেয় এবং মুক্তিপণ দাবি করে।" },
    { q: "নিচের কোনটি Open Source Software?", options: ["Google Chrome","Microsoft Windows","Zoom","Adobe Photoshop"], correct: "A", explanation: "Google Chrome ব্রাউজারটি Chromium নামক একটি ওপেন-সোর্স প্রকল্পের উপর ভিত্তি করে তৈরি।" },
    { q: "GPU-এর পূর্ণরূপ কী?", options: ["Graph Processing Unit","Graphic Processing Unit","Graphics Processing Unit","Geographical Processing Unit"], correct: "C", explanation: "GPU-এর পূর্ণরূপ হলো Graphics Processing Unit।" },
    { q: "DBMS-এর পূর্ণরূপ কী?", options: ["Data Backup Management System","Database Management Service","Database Management System","Data of Binary Management System"], correct: "C", explanation: "DBMS-এর পূর্ণরূপ হলো Database Management System।" },
    { q: "নিচের কোনটি সার্বজনীন ডিজিটাল লজিক গেইট?", options: ["XOR","AND","NOR","OR"], correct: "C", explanation: "NAND এবং NOR গেইটকে সার্বজনীন বা Universal Logic Gate বলা হয়।" },
    { q: "IPv4-এ Google DNS Server এর IP Address কোনটি?", options: ["8.8.7.6","8.7.8.6","8.8.8.6","8.8.8.8"], correct: "D", explanation: "গুগলের পাবলিক ডিএনএস সার্ভারের প্রাইমারি আইপি অ্যাড্রেস হলো 8.8.8.8।" },
    { q: "প্রতারণামূলকভাবে সংবেদনশীল তথ্য যেমন পাসওয়ার্ড অর্জন করার জন্য ইন্টারনেট ব্যবহারের অনুশীলনকে কী বলা হয়?", options: ["Phishing","Spamming","Ransomware","Sniffing"], correct: "A", explanation: "ফিশিং (Phishing) হলো এক ধরনের সাইবার আক্রমণ যেখানে বিশ্বস্ত উৎস সেজে ব্যক্তিগত তথ্য হাতিয়ে নেওয়া হয়।" },
  ];

  MCQ_BUILTIN_DECKS['BCS · গাণিতিক যুক্তি'] = [
    { q: "যদি কোনো বর্গক্ষেত্রের প্রত্যেক বাহুর পরিমাণ 10% বৃদ্ধি করা হয়, তবে তার ক্ষেত্রফল শতকরা কত বৃদ্ধি পাবে?", options: ["20%","25%","21%","16%"], correct: "C", explanation: "বাহু ১০% বাড়লে ক্ষেত্রফল বাড়ে = ১০ + ১০ + (১০×১০)/১০০ = ২১%।" },
    { q: "100 টাকা 10% হারে 5 বছরের জন্য বিনিয়োগ করা হলে, সরল ও চক্রবৃদ্ধি মুনাফার পার্থক্য কত?", options: ["10.05 টাকা","11.05 টাকা","12.05 টাকা","13.05 টাকা"], correct: "B", explanation: "সরল সুদ = ৫০ টাকা। চক্রবৃদ্ধি সুদ = ৬১.০৫১ টাকা। পার্থক্য = ১১.০৫১ টাকা।" },
    { q: "|x – 5| < 2, x ∈ IN অসমতাটির সমাধান সেট কোনটি?", options: ["(3, 7)","[3, 7]","{4, 5, 6}","{3, 4, 5, 6, 7}"], correct: "C", explanation: "-2 < x-5 < 2 বা 3 < x < 7। যেহেতু x স্বাভাবিক সংখ্যা, তাই x এর মান হবে 4, 5, 6।" },
    { q: "যদি 5x³ – 2x² + x + k = 0 এর একটি উৎপাদক (x – 3) হয়, তাহলে k এর মান কত?", options: ["50","60","– 120","– 60"], correct: "C", explanation: "x=3 বসালে: 5(27) - 2(9) + 3 + k = 0 => 120 + k = 0 => k = -120।" },
    { q: "নিচের সিরিজের ফাঁকা যায়গায় কোন সংখ্যা হবে? 243, 81, ___ , 9, 3, 1", options: ["9","27","12","6"], correct: "B", explanation: "এটি একটি গুণোত্তর ধারা যেখানে সাধারণ অনুপাত ১/৩। ৮১ ÷ ৩ = ২৭।" },
    { q: "যদি logₓ324 = 4 হয়, তবে x এর মান কত?", options: ["3√2","4√2","5√2","√2"], correct: "A", explanation: "x⁴ = 324 = (3√2)⁴। সুতরাং x = 3√2।" },
    { q: "একটি গুণোত্তর ধারার প্রথম ও দ্বিতীয় পদ যথাক্রমে 27 এবং 9, তাহলে ধারাটির দশম পদ কত?", options: ["1/3","1/525","1/729","1/615"], correct: "C", explanation: "a = 27, r = 1/3। 10ম পদ = ar⁹ = 27 × (1/3)⁹ = 1/729।" },
    { q: "4 জন তাঁতী 4 দিনে 4টি মাদুর তৈরি করতে পারে। একই হারে 8 জন তাঁতী 8 দিনে কতটি মাদুর তৈরি করতে পারবে?", options: ["8টি","12টি","16টি","20টি"], correct: "C", explanation: "ঐকিক নিয়মে: ১ জন ১ দিনে করে ১/৪ টি। ৮ জন ৮ দিনে করবে (১/৪) × ৮ × ৮ = ১৬টি।" },
    { q: "যদি nC12 = nC8 হয়, তবে 22Cn এর মান কত?", options: ["230","231","232","233"], correct: "B", explanation: "nC12 = nC8 হলে n = 20। তাহলে 22C20 = 22C2 = (22×21)/(2×1) = 231।" },
    { q: "2log₁₀5 + log₁₀36 – log₁₀9 =?", options: ["2","100","37","4.6"], correct: "A", explanation: "= log₁₀(25 × 36 / 9) = log₁₀(100) = 2।" },
    { q: "ক্রয়মূল্য বিক্রয়মূল্যের দ্বিগুণ হলে শতকরা লাভ বা ক্ষতির পরিমাণ কত?", options: ["লাভ ২৫%","ক্ষতি ২৫%","লাভ ১০%","ক্ষতি ৫০%"], correct: "D", explanation: "বিক্রয়মূল্য = x, ক্রয়মূল্য = 2x। শতকরা ক্ষতি = (x / 2x) × ১০০% = ৫০%।" },
    { q: "বার্ষিক ৫% হার মুনাফায় ৪০০ টাকার ২ বছরের চক্রবৃদ্ধি মূলধন কত?", options: ["৪৪০ টাকা","৪৪১ টাকা","৪৪৫ টাকা","৪৫০ টাকা"], correct: "B", explanation: "C = ৪০০(১.০৫)² = ৪০০ × ১.১০২৫ = ৪৪১ টাকা।" },
    { q: "x² – 7x + 12 ≤ 0 এর সমাধান সেট –", options: ["(- ∞, 3]","(3, 4)","[3, 4]","[4, ∞)"], correct: "C", explanation: "(x - 4)(x - 3) = 0। মূল দুটি x = 3, 4। সমাধান: 3 ≤ x ≤ 4 = [3, 4]।" },
    { q: "3x – y = 3, 5x + y = 21 হলে (x, y) এর মান-", options: ["(2, 5)","(2, 6)","(3, 5)","(3, 6)"], correct: "D", explanation: "সমীকরণ দুটি যোগ করে: 8x = 24 => x=3। তারপর y = 6।" },
    { q: "একটি থলিতে 2টি লাল, 3টি সবুজ এবং 2টি নীল বল আছে। দৈবভাবে 2টি বল নেওয়া হলে বল দুটির কোনটিই নীল না হওয়ার সম্ভাবনা কত?", options: ["10/21","11/21","2/7","5/7"], correct: "A", explanation: "নীল নয় এমন বল ৫টি। সম্ভাবনা = (5C2) / (7C2) = 10 / 21।" },
  ];

  MCQ_BUILTIN_DECKS['BCS · ভূগোল ও দুর্যোগ'] = [
    { q: "বাংলাদেশের দীর্ঘতম স্থলসীমান্ত ভারতের কোন রাজ্যের সাথে?", options: ["মেঘালয়","আসাম","পশ্চিমবঙ্গ","ত্রিপুরা"], correct: "C", explanation: "বাংলাদেশের সাথে পশ্চিমবঙ্গের সীমান্ত সবচেয়ে দীর্ঘ (প্রায় ২২১৭ কিমি)।" },
    { q: "হিমালয় পর্বতমালার উদ্ভব কোন দুটি টেকটোনিক প্লেটের সংঘর্ষে হয়েছে?", options: ["ইউরেশিয়ান ও আফ্রিকান","ইন্দোঅস্ট্রেলিয়ান ও ইউরেশিয়ান","আমেরিকান ও ইউরেশিয়ান","প্যাসিফিক ও ইন্দোঅস্ট্রেলিয়ান"], correct: "B", explanation: "হিমালয় পর্বতমালা ইন্দো-অস্ট্রেলিয়ান প্লেট এবং ইউরেশিয়ান প্লেটের সংঘর্ষের ফলে সৃষ্টি হয়েছে।" },
    { q: "বায়ুমণ্ডলের কোন স্তরে ওজোন গ্যাসের স্তর অবস্থান করে?", options: ["ট্রপোমণ্ডল","থার্মোমণ্ডল","স্ট্র্যাটোমণ্ডল","মেসোমণ্ডল"], correct: "C", explanation: "বায়ুমণ্ডলের স্ট্র্যাটোমণ্ডল স্তরে ওজোন গ্যাসের স্তর অবস্থিত।" },
    { q: "এল নিনো বাংলাদেশ ও দক্ষিণ পূর্ব এশিয়ার আঞ্চলিক আবহাওয়ায় কীভাবে প্রভাব ফেলে?", options: ["শীতকালীন তাপমাত্রা বৃদ্ধি","বর্ষার বৃষ্টিপাতের ধরনে অনিয়ম সৃষ্টি করে","গ্রীষ্মকালীন তাপমাত্রা কমায়","ঘূর্ণিঝড় বৃদ্ধি পায়"], correct: "B", explanation: "এল নিনোর প্রভাবে দক্ষিণ-পূর্ব এশিয়ায় বর্ষাকালীন বায়ুপ্রবাহ দুর্বল হয়ে যায়।" },
    { q: "বাংলাদেশের 'দুর্যোগ ব্যবস্থাপনা আইন' কবে প্রণীত হয়?", options: ["২০০৫","২০০৮","২০১২","২০১৫"], correct: "C", explanation: "বাংলাদেশে 'দুর্যোগ ব্যবস্থাপনা আইন, ২০১২' প্রণয়ন করা হয়।" },
    { q: "হিলি স্থল বন্দরটি বাংলাদেশের কোথায় অবস্থিত?", options: ["বিরামপুর, দিনাজপুর","ঘোড়াঘাট, দিনাজপুর","হাকিমপুর, দিনাজপুর","পাঁচ বিবি, জয়পুর হাট"], correct: "C", explanation: "হিলি স্থল বন্দরটি দিনাজপুর জেলার হাকিমপুর উপজেলায় অবস্থিত।" },
    { q: "জাপানিজ শব্দ 'সুনামি' এর অর্থ কী?", options: ["বিশালাকৃতির ঢেউ","সামুদ্রিক ঢেউ","জলোচ্ছ্বাস","পোতাশ্রয়ের ঢেউ"], correct: "D", explanation: "জাপানি শব্দ 'সুনামি' (津波) এর আক্ষরিক অর্থ হলো 'পোতাশ্রয়ের ঢেউ'।" },
    { q: "বৈশ্বিক উষ্ণায়নের জন্য ঝুঁকিপূর্ণ নয় কোনটি?", options: ["মরুকরণ","বন্যা","সমুদ্র পৃষ্ঠের উচ্চতা বৃদ্ধি","ভূমিকম্প"], correct: "D", explanation: "ভূমিকম্প সংঘটিত হয় পৃথিবীর ভূ-অভ্যন্তরের টেকটোনিক প্লেটের সঞ্চালনের কারণে, যা বৈশ্বিক উষ্ণায়নের সাথে সম্পর্কিত নয়।" },
    { q: "বাংলাদেশে সিডর কখন আঘাত হানে?", options: ["১৫ নভেম্বর ২০০৭","১৬ নভেম্বর ২০০৭","১৭ নভেম্বর ২০০৭","১৮ নভেম্বর ২০০৭"], correct: "A", explanation: "প্রলয়ংকারী ঘূর্ণিঝড় 'সিডর' ২০০৭ সালের ১৫ নভেম্বর সন্ধ্যায় বাংলাদেশের উপকূলীয় অঞ্চলে আঘাত হানে।" },
    { q: "উত্তর গোলার্ধে ক্রান্তীয় ঘূর্ণিঝড়ের বায়ু প্রবাহিত হয়-", options: ["ঘড়ির কাটার দিকে","ঘড়ির কাটার বিপরীতে","সোজা","কোনটাই সঠিক নয়"], correct: "B", explanation: "করিওলিস বলের প্রভাবে উত্তর গোলার্ধে ঘূর্ণিঝড়ের বায়ু ঘড়ির কাঁটার বিপরীতে ঘুরতে থাকে।" },
  ];

  MCQ_BUILTIN_DECKS['BCS · মানসিক দক্ষতা'] = [
    { q: "Seed : Sapling :: Egg : ?", options: ["Omlette","Chicken","Yolk","Chick"], correct: "D", explanation: "বীজ থেকে যেমন চারাগাছ হয়, তেমনি ডিম থেকে বাচ্চা মুরগি (Chick) হয়।" },
    { q: "যদি MFNPO অর্থ 'Lemon' হয়, তবে NBOHP অর্থ কী?", options: ["Mango","Table","Light","Shirt"], correct: "A", explanation: "কোডটি প্রতিটি অক্ষরের পূর্ববর্তী অক্ষর দ্বারা তৈরি। N-1=M, B-1=A, O-1=N, H-1=G, P-1=O = Mango।" },
    { q: "একজন ব্যক্তি ৪ মাইল উত্তরে, ১২ মাইল পূর্বে এবং তারপরে ১২ মাইল উত্তরে ভ্রমণ করেন। তিনি শুরুর বিন্দু থেকে কত দূরে আছেন?", options: ["২৮ মাইল","২৪ মাইল","২১ মাইল","২০ মাইল"], correct: "D", explanation: "মোট উত্তর দূরত্ব = ১৬ মাইল। পূর্ব দূরত্ব = ১২ মাইল। অতিভুজ = √(১৬² + ১২²) = √৪০০ = ২০ মাইল।" },
    { q: "যদি E = 10, J = 20, O = 30 এবং T = 40 হয়, তাহলে B + E + S + T =?", options: ["৭১","৮২","৯০","৯২"], correct: "D", explanation: "প্রতিটি অক্ষরের মান তার বর্ণমালার অবস্থানকে ২ দিয়ে গুণ। B=4, E=10, S=38, T=40। যোগফল = ৯২।" },
    { q: "নিচের কোন শব্দটি অন্যদের থেকে আলাদা?", options: ["Kiwi","Eagle","Emu","Ostrich"], correct: "B", explanation: "Eagle (ঈগল) উড়তে পারে। Kiwi, Emu এবং Ostrich হলো উড়তে অক্ষম পাখি।" },
    { q: "পাঁচটি ধারাবাহিক পূর্ণসংখ্যার গড় হলো ১৫। সবচেয়ে বড় পূর্ণ সংখ্যা কত?", options: ["১৭","১৮","১৯","২০"], correct: "A", explanation: "পাঁচটি ধারাবাহিক সংখ্যার গড় হলো মধ্যম সংখ্যাটি। সংখ্যাগুলো: ১৩, ১৪, ১৫, ১৬, ১৭।" },
    { q: "এই সিরিজটিতে পরের সংখ্যাটি কত? ৩ ৫ ৮ ১৩ ২১", options: ["২৪","২৬","২৯","৩৪"], correct: "D", explanation: "এটি একটি ফিবোনাচ্চি সিরিজ। ১৩+২১=৩৪।" },
    { q: "একটি দেয়ালঘড়িতে যখন ৩টা বাজে তখন ঘণ্টার কাঁটা যদি পূর্বদিকে থাকে তবে মিনিটের কাঁটা কোন দিকে থাকবে?", options: ["উত্তর","পশ্চিম","দক্ষিণ","পূর্ব"], correct: "A", explanation: "ঘড়িতে ৩টা বাজলে ঘণ্টার কাঁটা পূর্ব দিকে থাকলে, মিনিটের কাঁটা (১২ এর ঘরে) তার থেকে ৯০° বামে অর্থাৎ উত্তর দিকে থাকবে।" },
    { q: "যদি 165135 যদি Peace হয়, তবে 1215225 –", options: ["Lead","Love","Loop","Castle"], correct: "B", explanation: "প্রতিটি সংখ্যা ইংরেজি বর্ণমালায় তার অবস্থান নির্দেশ করে। 12=L, 15=O, 22=V, 5=E = LOVE।" },
    { q: "নিম্নলিখিত সংখ্যা শ্রেণির সর্বশেষ সংখ্যার পরের সংখ্যাটি কত হবে? ১, ২, ৪, ৭, ১১, ?", options: ["১৪","১৫","১৬","১৮"], correct: "C", explanation: "ধারাটির পদগুলোর মধ্যে পার্থক্য: +১, +২, +৩, +৪। পরবর্তী পার্থক্য +৫। সুতরাং ১১ + ৫ = ১৬।" },
  ];

  MCQ_BUILTIN_DECKS['BCS · নৈতিকতা ও সুশাসন'] = [
    { q: "নিচের কোনটি পেশাগত নৈতিকতার উপাদান?", options: ["স্বজনপ্রীতি","সাম্প্রদায়িকতা","দরিদ্রতা","দক্ষতা"], correct: "D", explanation: "দক্ষতা বা Competence পেশাগত নৈতিকতার একটি অপরিহার্য উপাদান।" },
    { q: "জাতীয় শুদ্ধাচার কৌশল নীতিমালা কত সালে পাশ হয়?", options: ["২০১০","২০১১","২০১২","২০১৮"], correct: "C", explanation: "বাংলাদেশে 'জাতীয় শুদ্ধাচার কৌশল' ২০১২ সালে প্রণয়ন ও অনুমোদন করা হয়।" },
    { q: "সুশাসন বিষয়ক ধারণাটি কোন আন্তর্জাতিক সংস্থা প্রথম তাদের প্রতিবেদনে বিস্তারিতভাবে তুলে ধরে-", options: ["ইউএনডিপি","বিশ্বব্যাংক","ইসলামি উন্নয়ন ব্যাংক","ট্রান্সপারেন্সি ইন্টারন্যাশনাল"], correct: "B", explanation: "বিশ্বব্যাংকই প্রথম সুশাসন প্রত্যয়টিকে উন্নয়নের আলোচনায় নিয়ে আসে।" },
    { q: "জাতিসংঘের সাধারণ পরিষদে দুর্নীতির বিরুদ্ধে আন্তর্জাতিক কনভেনশনটি গৃহীত হয়?", options: ["৩১ জানুয়ারি ২০০৩","৩১ অক্টোবর ২০০৬","৩১ অক্টোবর ২০০৩","২১ ফেব্রুয়ারি ২০০৮"], correct: "C", explanation: "২০০৩ সালের ৩১ অক্টোবর জাতিসংঘের সাধারণ পরিষদে UNCAC গৃহীত হয়।" },
    { q: "গণতান্ত্রিক মূল্যবোধের সবচেয়ে গুরুত্বপূর্ণ উপাদান-", options: ["নেতৃত্বের প্রতি আনুগত্য","স্বচ্ছ নির্বাচন কমিশন","শক্তিশালী রাজনৈতিক দল","পরমতসহিষ্ণুতা"], correct: "D", explanation: "গণতান্ত্রিক মূল্যবোধের অন্যতম ভিত্তি হলো পরমতসহিষ্ণুতা।" },
    { q: "'Republic' গ্রন্থটির রচয়িতা কে?", options: ["বার্কলে","জন লক","ডেকার্ট","প্লেটো"], correct: "D", explanation: "'রিপাবলিক' হলো গ্রিক দার্শনিক প্লেটোর লেখা একটি বিখ্যাত গ্রন্থ।" },
    { q: "সুশাসনের মূলভিত্তি-", options: ["গণতন্ত্র","আমলাতন্ত্র","আইনের শাসন","মূল্যবোধ"], correct: "C", explanation: "আইনের শাসন (Rule of Law) হলো সুশাসনের মূল ভিত্তি।" },
    { q: "'জ্ঞান হয় পুণ্য'-এই উক্তিটি কার?", options: ["থেলিস","সক্রেটিস","এ্যারিস্টটল","প্লেটো"], correct: "B", explanation: "গ্রিক দার্শনিক সক্রেটিসের বিখ্যাত উক্তি হলো 'Virtue is knowledge' বা 'সদ্গুণই জ্ঞান'।" },
    { q: "'শর্তহীন আদেশ' ধারণাটির প্রবর্তক কে?", options: ["অ্যারিস্টটল","বার্ট্রান্ড রাসেল","হার্বার্ট স্পেন্সার","ইমানূয়েল কান্ট"], correct: "D", explanation: "জার্মান দার্শনিক ইমানুয়েল কান্ট তার কর্তব্যমূলক নীতিবিদ্যায় 'Categorical Imperative'-এর ধারণা দেন।" },
    { q: "নৈতিকতা ও সততা দ্বারা প্রভাবিত আচরণগত উৎকর্ষকে কী বলে?", options: ["শুদ্ধাচার","মূল্যবোধ","মানবিকতা","সফলতা"], correct: "A", explanation: "শুদ্ধাচার (Integrity) বলতে নৈতিকতা ও সততার নীতির প্রতি দৃঢ় adherence বোঝায়।" },
  ];

  // Refresh the deck selector UI
  if (typeof _mcqPopulateDeckSelector === 'function') {
    _mcqPopulateDeckSelector();
  }

  // Update the due badge
  if (typeof _mcqRefreshDueBadge === 'function') {
    _mcqRefreshDueBadge();
  }

  const total = Object.values(MCQ_BUILTIN_DECKS)
    .filter(d => !Array.isArray(d) ? false : true)
    .reduce((sum, d) => sum + d.length, 0);
  console.log('[BCS Decks] Loaded ' + Object.keys(MCQ_BUILTIN_DECKS).length + ' decks, ' + total + ' questions total');

})(); // end _loadBCSDecks IIFE
