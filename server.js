import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = process.env.PORT || 3000;
const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const SECTIONS = ["General Intelligence & Reasoning", "General Awareness", "Quantitative Aptitude", "English Comprehension"];
const BLUEPRINT = {
  "General Intelligence & Reasoning": { easy: 12, moderate: 10, difficult: 3 },
  "General Awareness": { easy: 7, moderate: 12, difficult: 6 },
  "Quantitative Aptitude": { easy: 7, moderate: 13, difficult: 5 },
  "English Comprehension": { easy: 13, moderate: 10, difficult: 2 }
};
const TIER_TWO_SECTIONS = ["Mathematical Abilities", "Reasoning and General Intelligence", "English Language and Comprehension", "General Awareness", "Computer Knowledge Test"];
const TIER_TWO_COUNTS = {
  "Mathematical Abilities": 30,
  "Reasoning and General Intelligence": 30,
  "English Language and Comprehension": 45,
  "General Awareness": 25,
  "Computer Knowledge Test": 20
};

app.use(express.json());
app.use(express.static(path.join(projectDirectory, "public")));

function shuffle(values) {
  const output = [...values];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

function question(section, difficulty, topic, text, correct, wrong, explanation) {
  const options = shuffle([correct, ...wrong]);
  if (new Set(options.map((option) => option.toLowerCase())).size !== 4) throw new Error(`Duplicate option in: ${text}`);
  return { section, difficulty, topic, question: text, options, answerIndex: options.indexOf(correct), explanation };
}

function offlineMock() {
  const reasoning = [];
  [2, 3, 4, 5, 6].forEach((n, i) => reasoning.push(question("General Intelligence & Reasoning", i < 3 ? "easy" : "moderate", "Number series", `Find the next number: ${n ** 2}, ${(n + 1) ** 2}, ${(n + 2) ** 2}, ${(n + 3) ** 2}, ?`, String((n + 4) ** 2), [String((n + 4) ** 2 - 1), String((n + 4) ** 2 + 1), String((n + 3) ** 2 + 5)], `These are consecutive squares. The next term is ${n + 4}² = ${(n + 4) ** 2}.`)));
  ["CAT", "DOG", "PEN", "SUN", "MAP"].forEach((word, i) => { const code = [...word].map((char) => String.fromCharCode(char.charCodeAt(0) + 1)).join(""); reasoning.push(question("General Intelligence & Reasoning", i < 3 ? "easy" : "moderate", "Coding-decoding", `If every letter is replaced by the next letter in the alphabet, how is ${word} coded?`, code, [word, [...word].reverse().join(""), `${code.slice(0, 2)}Z`], "Move every letter one place forward in the alphabet.")); });
  [["Bird", "Nest", "Bee", "Hive"], ["Author", "Book", "Painter", "Canvas"], ["Doctor", "Hospital", "Teacher", "School"], ["Fish", "Water", "Camel", "Desert"], ["Key", "Lock", "Password", "Account"]].forEach(([a,b,c,d], i) => reasoning.push(question("General Intelligence & Reasoning", i < 3 ? "easy" : "moderate", "Analogy", `${a} is related to ${b} in the same way as ${c} is related to:`, d, [a,b,c], `${a} is associated with ${b}; similarly ${c} is associated with ${d}.`)));
  [["Ravi", "Mohan", "brother", "Brother"], ["Neha", "Pooja", "sister", "Sister"], ["Amit", "Kiran", "father", "Father"], ["Sita", "Rohan", "mother", "Mother"], ["Arun", "Meera", "wife", "Wife"]].forEach(([person,relative,relation,answer], i) => reasoning.push(question("General Intelligence & Reasoning", i < 3 ? "easy" : "moderate", "Blood relation", `${person} says, “${relative} is my ${relation}.” How is ${relative} related to ${person}?`, answer, ["Cousin", "Uncle", "Friend"], `The sentence directly identifies ${relative} as ${person}'s ${relation}.`)));
  [["All pens are stationery. All stationery is useful.", "All pens are useful."], ["All squares are rectangles. All rectangles have four sides.", "All squares have four sides."], ["All cats are animals. No animal is a plant.", "No cat is a plant."], ["All doctors are graduates. Some graduates are teachers.", "All doctors are graduates."], ["All metals conduct heat. Copper is a metal.", "Copper conducts heat."]].forEach(([statement, conclusion], i) => reasoning.push(question("General Intelligence & Reasoning", i < 3 ? "moderate" : "difficult", "Syllogism", `Statement: ${statement} Which conclusion follows?`, conclusion, ["No conclusion follows.", "The opposite conclusion follows.", "Both groups are identical."], "The conclusion follows directly from the stated relationship.")));

  const awarenessFacts = [
    ["Which Article guarantees equality before law in India?", "Article 14", ["Article 19", "Article 21", "Article 32"], "Polity"], ["Who wrote the Indian National Anthem?", "Rabindranath Tagore", ["Bankim Chandra Chattopadhyay", "Sarojini Naidu", "Jawaharlal Nehru"], "Culture"], ["Which planet is known as the Red Planet?", "Mars", ["Venus", "Jupiter", "Mercury"], "Science"], ["What is the capital of Australia?", "Canberra", ["Sydney", "Melbourne", "Perth"], "Geography"], ["The currency of Japan is the:", "Yen", ["Won", "Yuan", "Baht"], "Economy"], ["Which is the longest river in India?", "Ganga", ["Godavari", "Narmada", "Krishna"], "Geography"], ["Who chaired the Drafting Committee of the Indian Constitution?", "B. R. Ambedkar", ["Rajendra Prasad", "Mahatma Gandhi", "Sardar Patel"], "Polity"], ["The SI unit of electric current is:", "Ampere", ["Volt", "Ohm", "Watt"], "Science"], ["Which gas is most abundant in Earth’s atmosphere?", "Nitrogen", ["Oxygen", "Carbon dioxide", "Argon"], "Science"], ["The Harappan civilisation is also called the:", "Indus Valley Civilisation", ["Vedic Civilisation", "Mauryan Civilisation", "Gupta Civilisation"], "History"], ["Which organ produces insulin?", "Pancreas", ["Liver", "Kidney", "Heart"], "Science"], ["The largest gland in the human body is the:", "Liver", ["Thyroid", "Pancreas", "Pituitary"], "Science"], ["Which Schedule lists the recognised languages of India?", "Eighth Schedule", ["Fifth Schedule", "Sixth Schedule", "Tenth Schedule"], "Polity"], ["The headquarters of the Reserve Bank of India is in:", "Mumbai", ["New Delhi", "Kolkata", "Chennai"], "Economy"], ["Which Mughal emperor built the Red Fort?", "Shah Jahan", ["Akbar", "Babur", "Aurangzeb"], "History"], ["Vitamin C deficiency causes:", "Scurvy", ["Rickets", "Night blindness", "Beriberi"], "Science"], ["Which is India’s highest civilian award?", "Bharat Ratna", ["Padma Vibhushan", "Padma Bhushan", "Param Vir Chakra"], "Awards"], ["The First Battle of Panipat was fought in:", "1526", ["1498", "1556", "1757"], "History"], ["The process by which plants make food is:", "Photosynthesis", ["Respiration", "Transpiration", "Fermentation"], "Science"], ["Who discovered penicillin?", "Alexander Fleming", ["Louis Pasteur", "Edward Jenner", "Robert Koch"], "Science"], ["Which is the largest ocean on Earth?", "Pacific Ocean", ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean"], "Geography"], ["The Right to Constitutional Remedies is under:", "Article 32", ["Article 14", "Article 19", "Article 21"], "Polity"], ["Which metal is liquid at room temperature?", "Mercury", ["Iron", "Aluminium", "Copper"], "Science"], ["Who wrote The Discovery of India?", "Jawaharlal Nehru", ["Mahatma Gandhi", "Vallabhbhai Patel", "B. R. Ambedkar"], "History"], ["India’s national aquatic animal is the:", "Ganges river dolphin", ["Blue whale", "Olive ridley turtle", "Tiger"], "Environment"]
  ];
  const awareness = awarenessFacts.map(([text, correct, wrong, topic], i) => question("General Awareness", i < 7 ? "easy" : i < 19 ? "moderate" : "difficult", topic, text, correct, wrong, `${correct} is the correct answer.`));

  const quant = [];
  [[500,10],[800,15],[1200,20],[750,12],[900,25]].forEach(([p,r], i) => { const a = p * (100-r) / 100; quant.push(question("Quantitative Aptitude", i < 3 ? "easy" : "moderate", "Percentage", `An article marked at ₹${p} is sold at a ${r}% discount. Find the selling price.`, `₹${a}`, [`₹${a+20}`,`₹${a-20}`,`₹${a+40}`], `Selling price = ₹${p} × ${100-r}% = ₹${a}.`)); });
  [[14,18,22,26,24],[10,15,20,25,18],[12,16,20,24,19],[20,25,30,35,28],[8,12,16,20,15]].forEach(([a,b,c,d,avg], i) => { const x = avg*5-a-b-c-d; quant.push(question("Quantitative Aptitude", i < 2 ? "easy" : "moderate", "Average", `The average of ${a}, ${b}, ${c}, ${d} and x is ${avg}. Find x.`, String(x), [String(x+2),String(x-2),String(x+4)], `Required total is ${avg} × 5; subtract the known values.`)); });
  [[1000,10],[1500,20],[800,25],[1200,15],[2000,12]].forEach(([cost,rate], i) => { const a = cost*(100+rate)/100; quant.push(question("Quantitative Aptitude", i < 2 ? "easy" : "moderate", "Profit and loss", `An item costs ₹${cost} and is sold at a profit of ${rate}%. Find its selling price.`, `₹${a}`, [`₹${a+100}`,`₹${a-100}`,`₹${a+200}`], `Selling price = cost price × ${100+rate}%.`)); });
  [[3,2,30],[5,3,40],[4,5,32],[7,2,49],[6,4,54]].forEach(([a,b,known], i) => { const ans=known/a*b; quant.push(question("Quantitative Aptitude", i < 2 ? "easy" : "moderate", "Ratio", `The ratio of boys to girls is ${a}:${b}. If there are ${known} boys, how many girls are there?`, String(ans), [String(ans+5),String(ans-5),String(ans+10)], `One ratio part is ${known} ÷ ${a}; girls have ${b} parts.`)); });
  [[1000,10,2],[1500,8,3],[2000,5,4],[1200,12,2],[2500,6,2]].forEach(([p,r,t], i) => { const a=p*r*t/100; quant.push(question("Quantitative Aptitude", i < 2 ? "moderate" : "difficult", "Simple interest", `Find the simple interest on ₹${p} at ${r}% per annum for ${t} years.`, `₹${a}`, [`₹${a+50}`,`₹${a-50}`,`₹${a+100}`], `SI = P × R × T ÷ 100 = ₹${a}.`)); });

  const englishFacts = [
    ["Choose the synonym of ABUNDANT.","Plentiful",["Scarce","Brief","Empty"],"Vocabulary"],["Choose the antonym of ANCIENT.","Modern",["Old","Historic","Antique"],"Vocabulary"],["Choose the correct spelling for a place to stay.","Accommodation",["Accomodation","Acommodation","Accommadation"],"Spelling"],["Fill in the blank: She has lived here _____ 2019.","since",["for","from","by"],"Grammar"],["Fill in the blank: He is good _____ mathematics.","at",["in","on","for"],"Grammar"],["Choose the synonym of BRAVE.","Courageous",["Cowardly","Weak","Timid"],"Vocabulary"],["Choose the antonym of EXPAND.","Contract",["Increase","Extend","Develop"],"Vocabulary"],["Select the correct spelling for the word meaning required.","Necessary",["Neccessary","Necesary","Necassary"],"Spelling"],["Fill in the blank: Neither Ram nor his friends _____ present.","were",["was","is","has"],"Grammar"],["Choose the synonym of RAPID.","Swift",["Slow","Late","Weak"],"Vocabulary"],["Choose the antonym of GENEROUS.","Stingy",["Kind","Liberal","Helpful"],"Vocabulary"],["Fill in the blank: I prefer tea _____ coffee.","to",["than","over","from"],"Grammar"],["Identify the correct spelling of a special right or advantage.","Privilege",["Privelege","Priviledge","Privilage"],"Spelling"],["Choose the synonym of CONCISE.","Brief",["Lengthy","Confusing","Loud"],"Vocabulary"],["Choose the antonym of VICTORY.","Defeat",["Success","Triumph","Win"],"Vocabulary"],["Fill in the blank: The train arrived _____ time.","on",["in","at","by"],"Grammar"],["Identify the correct spelling for a group appointed for a task.","Committee",["Comittee","Commitee","Committie"],"Spelling"],["Choose the synonym of DILIGENT.","Hardworking",["Lazy","Careless","Idle"],"Vocabulary"],["Choose the antonym of ACCEPT.","Reject",["Receive","Take","Allow"],"Vocabulary"],["Fill in the blank: Each of the students _____ a book.","has",["have","are having","were having"],"Grammar"],["Choose the correct spelling for a written survey form.","Questionnaire",["Questionaire","Questionnair","Quetionnaire"],"Spelling"],["Choose the synonym of HOSTILE.","Unfriendly",["Friendly","Gentle","Calm"],"Vocabulary"],["Choose the antonym of PERMANENT.","Temporary",["Lasting","Fixed","Stable"],"Vocabulary"],["Fill in the blank: She insisted _____ paying the bill.","on",["for","to","at"],"Grammar"],["Choose the correct spelling for a feeling of self-consciousness.","Embarrassment",["Embarassment","Embarrasment","Embarasment"],"Spelling"]
  ];
  const english = englishFacts.map(([text, correct, wrong, topic], i) => question("English Comprehension", i < 13 ? "easy" : i < 23 ? "moderate" : "difficult", topic, text, correct, wrong, `${correct} is the correct answer.`));
  return [shuffle(reasoning), shuffle(awareness), shuffle(quant), shuffle(english)].flat();
}

function azureClient() {
  const { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_API_VERSION = "2024-10-21", AZURE_OPENAI_DEPLOYMENT } = process.env;
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_DEPLOYMENT) return null;
  return new OpenAI({ apiKey: AZURE_OPENAI_API_KEY, baseURL: `${AZURE_OPENAI_ENDPOINT.replace(/\/$/, "")}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}`, defaultQuery: { "api-version": AZURE_OPENAI_API_VERSION }, defaultHeaders: { "api-key": AZURE_OPENAI_API_KEY } });
}

async function generateAiMock(tier) {
  const client = azureClient();
  if (!client) return null;
  const tierOnePrompt = `Create exactly 100 unique SSC CGL Tier-I full-mock MCQs for a 60-minute, 200-mark paper. Produce exactly 25 each from General Intelligence & Reasoning, General Awareness, Quantitative Aptitude and English Comprehension. Difficulty blueprint: Reasoning 12 easy/10 moderate/3 difficult; GA 7/12/6; Quant 7/13/5; English 13/10/2. Keep Quant feasible without a calculator and GA stable, with no current affairs.`;
  const tierTwoPrompt = `Create exactly 150 unique SSC CGL Tier-II Paper-I MCQs for a 135-minute, 450-mark paper. Include exactly: Mathematical Abilities 30, Reasoning and General Intelligence 30, English Language and Comprehension 45, General Awareness 25, Computer Knowledge Test 20. Calibrate the paper to real Tier-II level: Maths and English should be more demanding than Tier I; cover advanced arithmetic, algebra, geometry, mensuration, trigonometry, statistics and data interpretation in Maths; include computer fundamentals, networking, MS Office, internet and cybersecurity basics in Computer Knowledge. Use only stable GA facts. This is objective Paper I only; do not include DEST questions.`;
  const prompt = `${tier === 2 ? tierTwoPrompt : tierOnePrompt} Every question requires exactly four unique options, one correct answer, a difficulty of easy, moderate or difficult, a topic and a concise explanation. Do not repeat question templates. Return JSON only: {"questions":[{"section":"...","difficulty":"easy|moderate|difficult","topic":"...","question":"...","options":["...","...","...","..."],"answerIndex":0,"explanation":"..."}]}.`;
  const response = await client.chat.completions.create({ model: process.env.AZURE_OPENAI_DEPLOYMENT, messages: [{ role: "system", content: `You are a rigorous SSC CGL Tier-${tier} question-setter.` }, { role: "user", content: prompt }], response_format: { type: "json_object" }, temperature: 0.85 });
  const data = JSON.parse(response.choices[0]?.message?.content || "{}");
  if (tier === 2) validateTierTwoMock(data.questions); else validateAiMock(data.questions);
  const sections = tier === 2 ? TIER_TWO_SECTIONS : SECTIONS;
  return sections.flatMap((section) => data.questions.filter((item) => item.section === section));
}

function validateAiMock(questions) {
  if (!Array.isArray(questions) || questions.length !== 100) throw new Error("AI did not return a complete 100-question mock.");
  if (new Set(questions.map((item) => item.question?.trim().toLowerCase())).size !== 100) throw new Error("AI response contains repeated questions.");
  for (const section of SECTIONS) {
    const items = questions.filter((item) => item.section === section);
    if (items.length !== 25) throw new Error(`AI did not return 25 ${section} questions.`);
    for (const [difficulty, count] of Object.entries(BLUEPRINT[section])) if (items.filter((item) => item.difficulty?.toLowerCase() === difficulty).length !== count) throw new Error(`AI did not meet the ${section} difficulty blueprint.`);
    if (items.some((item) => !Array.isArray(item.options) || item.options.length !== 4 || new Set(item.options.map((option) => option.trim().toLowerCase())).size !== 4 || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3)) throw new Error("AI returned invalid answer options.");
  }
}

function validateTierTwoMock(questions) {
  if (!Array.isArray(questions) || questions.length !== 150) throw new Error("AI did not return a complete 150-question Tier-II mock.");
  if (new Set(questions.map((item) => item.question?.trim().toLowerCase())).size !== 150) throw new Error("AI response contains repeated Tier-II questions.");
  for (const section of TIER_TWO_SECTIONS) {
    const items = questions.filter((item) => item.section === section);
    if (items.length !== TIER_TWO_COUNTS[section]) throw new Error(`AI did not return the required number of ${section} questions.`);
    if (items.some((item) => !Array.isArray(item.options) || item.options.length !== 4 || new Set(item.options.map((option) => option.trim().toLowerCase())).size !== 4 || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3)) throw new Error("AI returned invalid Tier-II answer options.");
  }
}

app.post("/api/test", async (req, res) => {
  const tier = Number(req.body?.tier) === 2 ? 2 : 1;
  try {
    const aiQuestions = await generateAiMock(tier);
    if (tier === 2 && !aiQuestions) return res.status(503).json({ error: "Tier II needs Azure AI configuration for fresh 150-question papers." });
    res.json({ questions: aiQuestions || offlineMock(), source: aiQuestions ? "ai" : "practice bank", tier });
  } catch (error) {
    console.error("AI generation failed:", error.message);
    res.json({ questions: offlineMock(), source: "practice bank" });
  }
});

app.listen(port, () => console.log(`SSC CGL Mock Test is running at http://localhost:${port}`));
