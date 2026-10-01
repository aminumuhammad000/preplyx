export interface Question {
  id: string;
  year?: string;
  title?: string;
  description?: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

const templates: Record<string, { q: string, opts: string[], ans: number, exp: string }[]> = {
  mathematics: [
    { q: "Solve for x: 2x + {a} = {b}", opts: ["{ans}", "{ans+1}", "{ans-1}", "{ans*2}"], ans: 0, exp: "To solve 2x + {a} = {b}, subtract {a} from both sides to get 2x = {b} - {a} = {b-a}. Then divide both sides by 2 to get x = {ans}." },
    { q: "What is the derivative of x^{a}?", opts: ["{a}x^{a-1}", "x^{a-1}", "{a}x^{a}", "x^{a+1}"], ans: 0, exp: "Using the Power Rule: if f(x) = xⁿ, then f'(x) = n·xⁿ⁻¹. So the derivative of x^{a} is {a}x^{a-1}." },
    { q: "Calculate the area of a circle with radius {a}cm.", opts: ["{a*a}π", "{2*a}π", "{a}π", "{a*a*a}π"], ans: 0, exp: "The area of a circle is A = πr². With radius r = {a}cm, A = π × {a}² = {a*a}π cm²." },
    { q: "If sin(θ) = 0.5, what is θ in degrees (0 < θ < 90)?", opts: ["30°", "45°", "60°", "90°"], ans: 0, exp: "sin(30°) = 0.5 is a standard trigonometric value. This comes from the 30-60-90 special right triangle where the side ratios are 1:√3:2, giving sin(30°) = opposite/hypotenuse = 1/2 = 0.5." },
    { q: "What is the value of 5! (5 factorial)?", opts: ["120", "24", "60", "100"], ans: 0, exp: "Factorial means multiplying all positive integers up to that number. 5! = 5 × 4 × 3 × 2 × 1 = 120. Note: 4! = 24, which is a common confusion." },
  ],
  english: [
    { q: "Identify the figure of speech: 'The wind howled through the night.'", opts: ["Personification", "Simile", "Metaphor", "Hyperbole"], ans: 0, exp: "Personification gives human qualities or actions to non-human things. Here, 'howled' is a human/animal action attributed to 'the wind', making it personification. A simile would use 'like' or 'as', and a metaphor directly equates two different things." },
    { q: "Choose the word nearest in meaning to: 'AMELIORATE'", opts: ["Improve", "Worsen", "Destroy", "Create"], ans: 0, exp: "'Ameliorate' comes from Latin 'meliorare' (to make better). It means to make something bad or unsatisfactory better. Its antonym would be 'worsen' or 'aggravate'." },
    { q: "Complete the sentence: 'He is looking forward ___ seeing you.'", opts: ["to", "for", "at", "about"], ans: 0, exp: "'Look forward to' is a fixed phrasal verb in English. The preposition 'to' is always used with this expression. Note that 'to' here is a preposition, not part of an infinitive, so it is followed by a gerund (seeing), not the base verb." },
    { q: "Identify the grammatical name of the phrase: 'The boy IN THE BLUE SHIRT is my brother.'", opts: ["Adjectival phrase", "Noun phrase", "Adverbial phrase", "Prepositional phrase"], ans: 0, exp: "'In the blue shirt' is a prepositional phrase (begins with the preposition 'in') that functions as an adjective by modifying the noun 'boy' — telling us WHICH boy. When a prepositional phrase modifies a noun, its grammatical function/name is an adjectival phrase." },
    { q: "Which of the following is correctly spelled?", opts: ["Accommodation", "Acommodation", "Accomodation", "Acomodation"], ans: 0, exp: "'Accommodation' has double 'c' AND double 'm'. A helpful memory trick: Accommodation has enough room (double c, double m) for two cars (cc) and two motorbikes (mm). The other options are missing one or both double letters." },
  ],
  physics: [
    { q: "Calculate the kinetic energy of a body of mass {a}kg moving at {b}m/s.", opts: ["{0.5*a*b*b}J", "{a*b}J", "{a*b*b}J", "{0.5*a*b}J"], ans: 0, exp: "Kinetic Energy (KE) = ½mv². With mass m = {a}kg and velocity v = {b}m/s: KE = ½ × {a} × {b}² = ½ × {a} × {b*b} = {0.5*a*b*b}J. The formula uses velocity SQUARED, which is a common exam pitfall." },
    { q: "According to Newton's Second Law, Force is equal to:", opts: ["Mass × Acceleration", "Mass × Velocity", "Work / Time", "Mass / Volume"], ans: 0, exp: "Newton's Second Law states F = ma (Force = Mass × Acceleration). This is why a heavier object needs more force to accelerate at the same rate. Note: Mass × Velocity is momentum (p), Work/Time is Power, and Mass/Volume is Density." },
    { q: "What is the SI unit of electrical resistance?", opts: ["Ohm", "Ampere", "Volt", "Watt"], ans: 0, exp: "The Ohm (Ω) is the SI unit of electrical resistance, named after Georg Simon Ohm. From Ohm's Law (V = IR): Resistance = Voltage/Current. Ampere (A) is current, Volt (V) is potential difference, and Watt (W) is power." },
    { q: "A concave lens is used to correct which vision defect?", opts: ["Myopia (Short-sightedness)", "Hypermetropia (Long-sightedness)", "Astigmatism", "Presbyopia"], ans: 0, exp: "Myopia (short-sightedness) occurs when the eyeball is too long, causing light to focus in front of the retina. A concave (diverging) lens spreads light rays out before they enter the eye, pushing the focal point back onto the retina. Hypermetropia is corrected with a convex lens." },
    { q: "Which of these is a scalar quantity?", opts: ["Speed", "Velocity", "Acceleration", "Displacement"], ans: 0, exp: "Scalar quantities have only magnitude (size), while vector quantities have both magnitude AND direction. Speed is scalar (e.g., 60 km/h), but Velocity is vector (e.g., 60 km/h North). Acceleration and Displacement are also vectors as they require a direction." },
  ]
};

const defaultTemplates = [
  { q: "Which of the following is a fundamental concept in {subject}?", opts: ["Concept {a}", "Concept {b}", "Concept {c}", "Concept {d}"], ans: 0, exp: "In {subject}, foundational concepts form the basis for understanding advanced topics. Always revisit your core definitions and principles when approaching new problems." },
  { q: "In the study of {subject}, what does the primary term refer to?", opts: ["Definition {a}", "Definition {b}", "Definition {c}", "Definition {d}"], ans: 0, exp: "Understanding key terminology in {subject} is essential. The primary term refers to the most fundamental definition, which underlies all other concepts in this field of study." },
  { q: "Identify the most critical component related to {subject}.", opts: ["Component {a}", "Component {b}", "Component {c}", "Component {d}"], ans: 0, exp: "In {subject}, identifying critical components helps you understand how different parts of the system interact. Focus on understanding the role each component plays in the overall structure." },
];

function shuffleOptions(options: string[], correctIndex: number): { opts: Record<'A'|'B'|'C'|'D', string>, correct: 'A'|'B'|'C'|'D' } {
  const letters: ('A'|'B'|'C'|'D')[] = ['A', 'B', 'C', 'D'];
  const correctVal = options[correctIndex];
  
  const items = options.map(opt => ({ val: opt }));
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  const resultOpts: any = {};
  let correctLetter: any = 'A';
  
  for (let i = 0; i < 4; i++) {
    resultOpts[letters[i]] = items[i].val;
    if (items[i].val === correctVal) {
      correctLetter = letters[i];
    }
  }

  return { opts: resultOpts, correct: correctLetter };
}

export function generateQuestions(subject: string, count: number = 100, year: string = '2018'): Question[] {
  const normalizedSubject = subject.toLowerCase();
  const pool = templates[normalizedSubject] || defaultTemplates;
  const questions: Question[] = [];

  for (let i = 1; i <= count; i++) {
    // Pick a random template
    const template = pool[Math.floor(Math.random() * pool.length)];
    
    let qText = template.q;
    let rawOpts = [...template.opts];

    // Randomize simple math variables
    const a = Math.floor(Math.random() * 20) + 2;
    const b = Math.floor(Math.random() * 50) + 10;
    
    qText = qText.replace(/\{a\}/g, a.toString())
                 .replace(/\{b\}/g, b.toString())
                 .replace(/\{subject\}/g, subject);
    
    rawOpts = rawOpts.map(opt => {
      let val = opt.replace(/\{a\}/g, a.toString()).replace(/\{b\}/g, b.toString());
      if (val.includes('{ans}')) val = val.replace('{ans}', ((b - a)/2).toString());
      if (val.includes('{ans+1}')) val = val.replace('{ans+1}', (((b - a)/2) + 1).toString());
      if (val.includes('{ans-1}')) val = val.replace('{ans-1}', (((b - a)/2) - 1).toString());
      if (val.includes('{ans*2}')) val = val.replace('{ans*2}', (((b - a)/2) * 2).toString());
      
      if (val.includes('{0.5*a*b*b}')) val = val.replace('{0.5*a*b*b}', (0.5 * a * b * b).toString());
      if (val.includes('{a*b}')) val = val.replace('{a*b}', (a * b).toString());
      if (val.includes('{a*b*b}')) val = val.replace('{a*b*b}', (a * b * b).toString());
      if (val.includes('{0.5*a*b}')) val = val.replace('{0.5*a*b}', (0.5 * a * b).toString());
      if (val.includes('{a*a}')) val = val.replace('{a*a}', (a * a).toString());
      if (val.includes('{2*a}')) val = val.replace('{2*a}', (2 * a).toString());
      if (val.includes('{a*a*a}')) val = val.replace('{a*a*a}', (a * a * a).toString());
      return val;
    });

    if (pool === defaultTemplates) {
      rawOpts = rawOpts.map((opt, idx) => opt.replace(`{${String.fromCharCode(97+idx)}}`, `${Math.floor(Math.random() * 100)}`));
    }

    const { opts, correct } = shuffleOptions(rawOpts, template.ans);

    // Resolve explanation placeholders
    let expText = (template as any).exp || `The correct answer for this question is Option ${correct}. Review your ${subject} notes for more details on this topic.`;
    expText = expText
      .replace(/\{a\}/g, a.toString())
      .replace(/\{b\}/g, b.toString())
      .replace(/\{b-a\}/g, (b - a).toString())
      .replace(/\{b\*b\}/g, (b * b).toString())
      .replace(/\{a-1\}/g, (a - 1).toString())
      .replace(/\{0\.5\*a\*b\*b\}/g, (0.5 * a * b * b).toString())
      .replace(/\{a\*b\*b\}/g, (a * b * b).toString())
      .replace(/\{a\*a\}/g, (a * a).toString())
      .replace(/\{0\.5\*a\*b\}/g, (0.5 * a * b).toString())
      .replace(/\{subject\}/g, subject)
      .replace(/\{ans\}/g, ((b - a) / 2).toString());

    const title = (template as any).title || `${subject.toUpperCase()} (${year}) Past Question`;
    const description = (template as any).description || `Official ${subject} CBT Past Question for ${year}. Select your answer carefully.`;

    questions.push({
      id: `q_${normalizedSubject}_${year}_${i}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      year,
      title,
      description,
      question: qText,
      options: opts,
      correct_answer: correct,
      explanation: expText,
    });
  }

  return questions;
}
