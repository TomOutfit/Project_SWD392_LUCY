const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'uploads/podcasts');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const podcasts = [
  {
    id: "podcast-en-1",
    text: "Hello and welcome to the LUCY Business English Intensive podcast! Today, we are discussing professional email etiquette, high-impact meeting phrases, and how to negotiate effectively with international clients. First, when writing an email to a senior stakeholder, always start with a clear, respectful subject line. For example: Project Update: Q3 Deliverables and Timeline. Next, use professional openings such as Dear Sarah, or I hope this email finds you well. Practice these phrases out loud to build your speaking confidence!"
  },
  {
    id: "podcast-en-2",
    text: "Welcome to American Accent Masterclass! In this lesson, we master connected speech and linking sounds in spoken American English. Native speakers rarely pronounce every word separately. Instead, words blend together smoothly. For instance, what do you do often sounds like whadaya do. Listen closely and repeat after me: What are you going to do tonight? Whadaya gonna do tonight? Notice how the T and D sounds soften. Keep practicing!"
  },
  {
    id: "podcast-en-3",
    text: "This is IELTS Band 8 Preparation with David Miller. Today we focus on IELTS Speaking Part 2. When you receive your cue card, you have exactly one minute to prepare. Use a bullet-point structure: Who, When, Where, What happened, and Why it was memorable. Using advanced vocabulary like unforgettable experience, profoundly impacted, and pivotal moment will boost your Lexical Resource score to Band 8 or higher!"
  },
  {
    id: "podcast-en-4",
    text: "Welcome to Tech and AI Discussions! Today we explore artificial intelligence, neural networks, and modern software architecture. When presenting your system design to senior engineers, clear vocabulary is key. Terms like high throughput, event-driven architecture, and microservices decoupling communicate technical mastery. Let us break down how real-time WebRTC audio streaming works under the hood."
  },
  {
    id: "podcast-en-5",
    text: "Hey language learners! Welcome to Everyday Idioms and Slang. Today we learn 5 top idioms native English speakers use every single day. Number 1: Hit the nail on the head - which means to be exactly right about something. Number 2: Bite the bullet - to face a difficult situation with courage. Number 3: Break the ice - to start a conversation in a social setting. Try using one of these idioms in your next speaking room!"
  },
  {
    id: "podcast-en-6",
    text: "Welcome to Job Interview Masterclass! Today we master the classic interview question: Tell me about yourself. The secret to a winning response is the Present-Past-Future formula. Start with your current role and recent achievements, briefly summarize past relevant experience, and conclude with why you are excited about this opportunity. Let us rehearse your introduction together!"
  },
  {
    id: "podcast-en-7",
    text: "This is BBC News Vocabulary with David Miller. In this episode, we analyze international news headlines and extract C1-level political and economic vocabulary. Key terms include: fiscal stimulus, multilateral agreements, inflation mitigation, and diplomatic consensus. Mastering these terms will help you comprehend global podcasts and express nuanced opinions."
  },
  {
    id: "podcast-en-8",
    text: "Welcome to Silicon Valley English! Designed for software engineers, product managers, and tech founders. Today we cover pitch deck vocabulary: scaling user acquisition, product-market fit, venture capital valuation, and agile sprint planning. Clear communication builds trust with global investors!"
  },
  {
    id: "podcast-ja-1",
    text: "Konnichiwa! Welcome to LUCY Japanese Speaking Podcast. Today we learn Tokyo daily conversations, keigo etiquette, and polite Japanese phrases for business and travel. Practice saying: Arigatou gozaimasu, and Yoroshiku onegaishimasu out loud!"
  },
  {
    id: "podcast-zh-1",
    text: "Ni hao! Welcome to LUCY Mandarin Speaking Podcast. Today we practice HSK 4 core vocabulary and business negotiation phrases. Repeat after me: Hen gaoxing yu gui gongsi hezuo!"
  },
  {
    id: "podcast-es-1",
    text: "Hola a todos! Welcome to LUCY Spanish Speaking Podcast. Today we practice daily conversations in Madrid and popular idioms in Mexico. Practice saying: Que tal todo, and Muchas gracias por tu ayuda!"
  },
  {
    id: "podcast-fr-1",
    text: "Bonjour! Welcome to LUCY French Speaking Podcast. Today we learn daily Paris conversation skills, ordering at a cafe, and polite French phrases. Practice saying: C'est un plaisir de vous rencontrer!"
  },
  {
    id: "podcast-de-1",
    text: "Willkommen! Welcome to LUCY German Speaking Podcast. Today we discuss useful expressions for everyday life in Berlin. Practice saying: Vielen Dank und auf Wiedersehen!"
  },
  {
    id: "podcast-ko-1",
    text: "Annyeonghaseyo! Welcome to LUCY Korean Speaking Podcast. Today we practice daily Seoul conversations, honorifics, and K-Drama expressions. Practice saying: Gamsahabnida, and Jo-eun haru bonaese-yo!"
  }
];

podcasts.forEach(p => {
  const wavPath = path.join(outputDir, `${p.id}.wav`);
  const psScript = `
Add-Type -AssemblyName System.Speech;
$v = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$v.Rate = 0;
$v.SetOutputToWaveFile('${wavPath.replace(/\\/g, '\\\\')}');
$v.Speak('${p.text.replace(/'/g, "''")}');
$v.Dispose();
  `;
  console.log(`Generating spoken voice audio for ${p.id}...`);
  try {
    execSync(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`);
  } catch (err) {
    console.error(`Failed generating ${p.id}:`, err.message);
  }
});

console.log('All spoken audio podcast WAV files generated successfully!');
