export interface McqQuestion {
  q: string;
  options: string[];
  correct: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export const IELTS_SPEAKING_BANK = {
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

export const IELTS_MCQ_BANK: Record<string, McqQuestion[]> = {
  vocab: [
    { q: "Choose the word closest in meaning to 'Ubiquitous':", options: ["Rare", "Dangerous", "Present everywhere", "Ancient"], correct: "C", explanation: "Ubiquitous means present, appearing, or found everywhere — a key IELTS band 7+ word." },
    { q: "The word 'Mitigate' means:", options: ["To worsen", "To lessen the severity of", "To ignore completely", "To celebrate"], correct: "B", explanation: "Mitigate means to make something less severe, serious, or painful." },
    { q: "Choose the correct synonym for 'Eloquent':", options: ["Silent", "Confused", "Articulate and persuasive", "Aggressive"], correct: "C", explanation: "Eloquent means fluent and persuasive in speaking or writing." },
    { q: "The word 'Pragmatic' means:", options: ["Idealistic", "Dealing with things practically", "Emotional", "Theoretical"], correct: "B", explanation: "Pragmatic means dealing with things sensibly and realistically." },
    { q: "Choose the word that best completes: 'The scientist made a __ discovery that changed medicine.'", options: ["trivial", "groundbreaking", "ordinary", "delayed"], correct: "B", explanation: "Groundbreaking means innovative and pioneering — ideal for IELTS academic writing." },
    { q: "The antonym of 'Exacerbate' is:", options: ["Worsen", "Alleviate", "Ignore", "Accelerate"], correct: "B", explanation: "Exacerbate means to make worse; alleviate means to make better." },
    { q: "Which word means 'to officially forbid something'?", options: ["Permit", "Advocate", "Prohibit", "Encourage"], correct: "C", explanation: "Prohibit means to formally forbid something by law or rule." },
    { q: "The word 'Inevitable' means:", options: ["Avoidable", "Certain to happen", "Surprising", "Temporary"], correct: "B", explanation: "Inevitable means certain to happen and unable to be avoided." },
    { q: "Choose the correct collocation: 'The government needs to __ action on climate change.'", options: ["do", "make", "take", "have"], correct: "C", explanation: "'Take action' is the correct collocation in English." },
    { q: "The word 'Substantial' means:", options: ["Very small", "Considerable in size or value", "Temporary", "Uncertain"], correct: "B", explanation: "Substantial means of considerable importance, size, or worth." },
  ],
  grammar: [
    { q: "Choose the correct sentence:", options: ["If I would have known, I would have helped.", "If I had known, I would have helped.", "If I knew, I would helped.", "If I have known, I would help."], correct: "B", explanation: "Third conditional: If + past perfect, would + have + past participle." },
    { q: "Which sentence uses the passive voice correctly?", options: ["The report written by the team.", "The report was written by the team.", "The report has write by the team.", "The team was written the report."], correct: "B", explanation: "Passive voice: was/were + past participle + by + agent." },
    { q: "Choose the correct relative clause: 'The scientist __ discovered penicillin was Alexander Fleming.'", options: ["which", "whom", "who", "whose"], correct: "C", explanation: "'Who' is used for people as the subject of a relative clause." },
    { q: "Select the correct form: 'By 2030, scientists __ a cure for the disease.'", options: ["will find", "will have found", "found", "have found"], correct: "B", explanation: "Future perfect (will have + past participle) for actions completed before a future point." },
    { q: "Which sentence is grammatically correct?", options: ["Despite of the rain, we went out.", "Despite the rain, we went out.", "Despite that it rained, we went out.", "Despite of raining, we went out."], correct: "B", explanation: "'Despite' is followed directly by a noun/noun phrase, not 'of' or 'that'." },
    { q: "Choose the correct article: '__ information you provided was helpful.'", options: ["A", "An", "The", "No article"], correct: "C", explanation: "'The' is used when referring to specific, known information." },
    { q: "Which is the correct reported speech for: 'I will come tomorrow'?", options: ["He said he will come tomorrow.", "He said he would come the next day.", "He said he comes tomorrow.", "He said he came the next day."], correct: "B", explanation: "Reported speech shifts tense back: will → would, tomorrow → the next day." },
    { q: "Select the correct linking word: 'The project was expensive; __, it was completed on time.'", options: ["however", "therefore", "nevertheless", "furthermore"], correct: "C", explanation: "'Nevertheless' shows contrast despite a preceding negative point." },
  ],
};

export const BCS_MCQ_DECKS: Record<string, McqQuestion[]> = {
  "Bangladesh Affairs": [
    { q: "Who is the Father of the Nation of Bangladesh?", options: ["Sheikh Hasina", "Ziaur Rahman", "Sheikh Mujibur Rahman", "Tajuddin Ahmad"], correct: "C", explanation: "Sheikh Mujibur Rahman led Bangladesh to independence and is revered as the Father of the Nation." },
    { q: "When did Bangladesh gain independence?", options: ["16 Dec 1971", "26 Mar 1971", "14 Aug 1947", "7 Mar 1971"], correct: "A", explanation: "Bangladesh achieved independence on 16 December 1971 after the Liberation War." },
    { q: "What is the national language of Bangladesh?", options: ["Urdu", "Hindi", "Bengali (Bangla)", "Arabic"], correct: "C", explanation: "Bangla (Bengali) is the official and national language of Bangladesh." },
    { q: "The Language Movement of Bangladesh took place in which year?", options: ["1948", "1950", "1952", "1954"], correct: "C", explanation: "The Language Movement (Bhasha Andolon) occurred on 21 February 1952." },
    { q: "How many districts are there in Bangladesh?", options: ["60", "64", "68", "72"], correct: "B", explanation: "Bangladesh is divided into 64 districts (Zila)." },
    { q: "What is the capital of Bangladesh?", options: ["Chittagong", "Khulna", "Dhaka", "Sylhet"], correct: "C", explanation: "Dhaka is the capital and largest city of Bangladesh." },
    { q: "The Padma Bridge was inaugurated in which year?", options: ["2020", "2021", "2022", "2023"], correct: "C", explanation: "The Padma Bridge was inaugurated on 25 June 2022." },
    { q: "Which river is known as the lifeline of Bangladesh?", options: ["Meghna", "Jamuna", "Padma", "Surma"], correct: "C", explanation: "The Padma (Ganges) is considered the lifeline of Bangladesh." },
    { q: "Bangladesh became a member of the United Nations in which year?", options: ["1971", "1972", "1973", "1974"], correct: "C", explanation: "Bangladesh joined the United Nations on 17 September 1974." },
    { q: "The Sundarbans is shared between Bangladesh and which other country?", options: ["India", "Myanmar", "Nepal", "Bhutan"], correct: "A", explanation: "The Sundarbans mangrove forest is shared between Bangladesh and India." },
  ],
  "English Grammar": [
    { q: "Which sentence is grammatically correct?", options: ["He don't know", "He doesn't know", "He not know", "He isn't know"], correct: "B", explanation: "'Doesn't' is used with third-person singular subjects." },
    { q: "Choose the correct passive voice: 'They built the bridge.'", options: ["The bridge was built by them.", "The bridge is built by them.", "The bridge built by them.", "The bridge were built by them."], correct: "A", explanation: "Past simple passive: was/were + past participle." },
    { q: "What is the synonym of 'Benevolent'?", options: ["Cruel", "Kind", "Angry", "Lazy"], correct: "B", explanation: "Benevolent means well-meaning and kindly." },
    { q: "Fill in the blank: She __ to school every day.", options: ["go", "goes", "going", "gone"], correct: "B", explanation: "Third-person singular present simple uses 'goes'." },
    { q: "Which is the correct spelling?", options: ["Accomodation", "Accommodation", "Acommodation", "Acomodation"], correct: "B", explanation: "Accommodation has double 'c' and double 'm'." },
    { q: "The antonym of 'Verbose' is:", options: ["Talkative", "Concise", "Lengthy", "Wordy"], correct: "B", explanation: "Verbose means using too many words; its antonym is concise." },
    { q: "Identify the noun clause: 'What he said was true.'", options: ["What he said", "was true", "he said", "What"], correct: "A", explanation: "'What he said' functions as the subject noun clause." },
    { q: "Choose the correct article: __ honest man.", options: ["A", "An", "The", "No article"], correct: "B", explanation: "'An' is used before words starting with a vowel sound; 'honest' starts with a silent 'h'." },
  ],
  "General Science": [
    { q: "What is the chemical formula of water?", options: ["H2O2", "HO", "H2O", "H3O"], correct: "C", explanation: "Water is composed of two hydrogen atoms and one oxygen atom: H2O." },
    { q: "Which planet is known as the Red Planet?", options: ["Venus", "Jupiter", "Mars", "Saturn"], correct: "C", explanation: "Mars appears red due to iron oxide (rust) on its surface." },
    { q: "What is the speed of light in vacuum?", options: ["3×10⁶ m/s", "3×10⁸ m/s", "3×10¹⁰ m/s", "3×10⁴ m/s"], correct: "B", explanation: "The speed of light in vacuum is approximately 3×10⁸ metres per second." },
    { q: "The powerhouse of the cell is:", options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"], correct: "C", explanation: "Mitochondria produce ATP energy for the cell." },
    { q: "Which gas is most abundant in Earth's atmosphere?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Argon"], correct: "C", explanation: "Nitrogen makes up about 78% of Earth's atmosphere." },
    { q: "What is the SI unit of electric current?", options: ["Volt", "Watt", "Ampere", "Ohm"], correct: "C", explanation: "The ampere (A) is the SI base unit of electric current." },
    { q: "Photosynthesis takes place in which part of the plant?", options: ["Root", "Stem", "Flower", "Chloroplast"], correct: "D", explanation: "Chloroplasts in plant cells are the site of photosynthesis." },
    { q: "Which vitamin is produced when skin is exposed to sunlight?", options: ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"], correct: "D", explanation: "Sunlight triggers synthesis of Vitamin D in the skin." },
  ],
  "Computer & IT": [
    { q: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"], correct: "A", explanation: "CPU stands for Central Processing Unit, the brain of a computer." },
    { q: "Which of the following is an input device?", options: ["Monitor", "Printer", "Keyboard", "Speaker"], correct: "C", explanation: "A keyboard is an input device used to enter data." },
    { q: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Text Machine Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"], correct: "A", explanation: "HTML stands for HyperText Markup Language, the standard for web pages." },
    { q: "1 Kilobyte (KB) is equal to how many bytes?", options: ["100", "512", "1000", "1024"], correct: "D", explanation: "1 KB = 1024 bytes in binary (computing) convention." },
    { q: "Which company developed the Windows operating system?", options: ["Apple", "Google", "Microsoft", "IBM"], correct: "C", explanation: "Microsoft developed and maintains the Windows OS." },
    { q: "What is the full form of URL?", options: ["Uniform Resource Locator", "Universal Resource Link", "Unified Reference Locator", "Uniform Retrieval Link"], correct: "A", explanation: "URL stands for Uniform Resource Locator — the address of a web resource." },
    { q: "Which programming language is known as the mother of all languages?", options: ["Python", "Java", "C", "Assembly"], correct: "C", explanation: "C is often called the mother of modern programming languages." },
    { q: "RAM stands for:", options: ["Read Access Memory", "Random Access Memory", "Rapid Access Module", "Read And Modify"], correct: "B", explanation: "RAM stands for Random Access Memory, the computer's short-term memory." },
  ],
  "International Affairs": [
    { q: "The headquarters of the United Nations is located in:", options: ["Geneva", "Paris", "New York", "London"], correct: "C", explanation: "The UN headquarters is in New York City, USA." },
    { q: "Which country has the largest area in the world?", options: ["USA", "China", "Canada", "Russia"], correct: "D", explanation: "Russia is the largest country by area at about 17.1 million km²." },
    { q: "The International Court of Justice is located in:", options: ["Brussels", "The Hague", "Geneva", "Vienna"], correct: "B", explanation: "The ICJ is the principal judicial organ of the UN, located in The Hague, Netherlands." },
    { q: "SAARC was established in which year?", options: ["1980", "1985", "1990", "1995"], correct: "B", explanation: "SAARC (South Asian Association for Regional Cooperation) was established in 1985." },
    { q: "Which country is the largest producer of rice in the world?", options: ["India", "Bangladesh", "China", "Thailand"], correct: "C", explanation: "China is the world's largest producer of rice." },
    { q: "The G20 summit is a forum of:", options: ["20 richest nations", "20 most populous nations", "19 countries + EU", "20 UN Security Council members"], correct: "C", explanation: "G20 consists of 19 individual countries plus the European Union." },
    { q: "Which country is known as the 'Land of the Rising Sun'?", options: ["China", "South Korea", "Japan", "Vietnam"], correct: "C", explanation: "Japan is called the Land of the Rising Sun (Nihon/Nippon)." },
  ],
  "Bangladesh Constitution": [
    { q: "The Constitution of Bangladesh was adopted on:", options: ["16 Dec 1971", "4 Nov 1972", "26 Mar 1972", "7 Mar 1972"], correct: "B", explanation: "The Constitution of Bangladesh was adopted on 4 November 1972." },
    { q: "How many articles are in the original Constitution of Bangladesh?", options: ["143", "153", "148", "160"], correct: "B", explanation: "The original Constitution had 153 articles." },
    { q: "The fundamental principles of state policy in Bangladesh number:", options: ["2", "3", "4", "5"], correct: "C", explanation: "The four fundamental principles are: nationalism, socialism, democracy, and secularism." },
    { q: "Who is the guardian of the Constitution of Bangladesh?", options: ["President", "Prime Minister", "Supreme Court", "Parliament"], correct: "C", explanation: "The Supreme Court is the guardian of the Constitution." },
    { q: "The national anthem of Bangladesh was written by:", options: ["Kazi Nazrul Islam", "Rabindranath Tagore", "Jasimuddin", "Shamsur Rahman"], correct: "B", explanation: "'Amar Sonar Bangla' was written by Rabindranath Tagore." },
  ],
};

export const PRONUNCIATION_WORDS = [
  { word: 'Ubiquitous',    phonetic: '/juːˈbɪk.wɪ.təs/',   tip: 'Stress the second syllable: yoo-BIK-wi-tus' },
  { word: 'Phenomenon',    phonetic: '/fɪˈnɒm.ɪ.nɒn/',     tip: 'Four syllables: fe-NOM-i-non' },
  { word: 'Particularly',  phonetic: '/pəˈtɪk.jʊ.lə.li/',  tip: "Don't drop the middle: par-TIC-yoo-lar-lee" },
  { word: 'Deteriorate',   phonetic: '/dɪˈtɪə.ri.ə.reɪt/', tip: 'Five syllables: de-TEER-ee-o-rate' },
  { word: 'Consequently',  phonetic: '/ˈkɒn.sɪ.kwənt.li/', tip: 'Stress the first: CON-se-quent-lee' },
  { word: 'Infrastructure',phonetic: '/ˈɪn.frəˌstrʌk.tʃər/', tip: 'Stress: IN-fra-struk-chur' },
  { word: 'Inevitable',    phonetic: '/ɪnˈev.ɪ.tə.bəl/',   tip: 'Stress second: in-EV-i-ta-ble' },
  { word: 'Exacerbate',    phonetic: '/ɪɡˈzæs.ə.beɪt/',    tip: 'Stress second: ig-ZAS-er-bate' },
  { word: 'Substantiate',  phonetic: '/səbˈstæn.ʃi.eɪt/',  tip: 'Stress second: sub-STAN-shee-ate' },
  { word: 'Albeit',        phonetic: '/ˌɔːlˈbiː.ɪt/',      tip: 'Two syllables: awl-BEE-it' },
  { word: 'Conscientious', phonetic: '/ˌkɒn.ʃiˈen.ʃəs/',   tip: 'Stress third: con-shee-EN-shus' },
  { word: 'Ambiguous',     phonetic: '/æmˈbɪɡ.ju.əs/',     tip: 'Stress second: am-BIG-yoo-us' },
];

export const FLASHCARD_TEMPLATES = [
  { front: 'What is the definition of {topic}?', back: 'Explain {topic} in your own words.' },
  { front: 'Why is {topic} important?', back: 'Describe the significance of {topic}.' },
  { front: 'What are the main parts of {topic}?', back: 'List the core components of {topic}.' },
  { front: 'Give an example of {topic}.', back: 'Provide a real-world example of {topic}.' },
  { front: 'Memory trick for {topic}?', back: 'Create an acronym or visual association for {topic}.' },
  { front: 'Common mistake regarding {topic}?', back: 'What do people usually get wrong about {topic}?' },
  { front: 'How does {topic} relate to everyday life?', back: 'Connect {topic} to something you experience daily.' },
  { front: 'What are the pros and cons of {topic}?', back: 'List at least 2 advantages and 2 disadvantages of {topic}.' },
];
