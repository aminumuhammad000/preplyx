import mongoose from 'mongoose';
import Question from '../models/Question';
import { connectDB } from '../config/db';

export const VERIFIED_QUESTIONS = [
  // ==========================================
  // MATHEMATICS (JAMB)
  // ==========================================
  {
    exam: 'JAMB',
    subject: 'Mathematics',
    topic: 'Logarithms',
    subtopic: 'Logarithmic Laws and Expansions',
    year: '2023',
    difficulty: 'medium',
    text: 'If log₁₀ 2 = 0.3010 and log₁₀ 3 = 0.4771, evaluate log₁₀ 18 without using mathematical tables.',
    options: ['1.2552', '1.0791', '1.4313', '0.7781'],
    correctAnswer: '1.2552',
    explanation: 'log₁₀ 18 = log₁₀(2 × 3²) = log₁₀ 2 + 2 log₁₀ 3 = 0.3010 + 2(0.4771) = 0.3010 + 0.9542 = 1.2552.',
    cognitiveTrap: 'Students frequently forget to multiply log₁₀ 3 by 2 for the square (3²), erroneously computing log 2 + log 3 = 0.7781.',
    conceptSummary: 'Log product rule log(ab) = log a + log b and power rule log(aⁿ) = n log a.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Mathematics',
    topic: 'Calculus',
    subtopic: 'Differentiation & Tangents',
    year: '2023',
    difficulty: 'medium',
    text: 'Find the derivative of f(x) = 3x³ - 5x² + 7x - 4 at x = 2.',
    options: ['23', '19', '15', '27'],
    correctAnswer: '23',
    explanation: 'Differentiating term by term: f\'(x) = 9x² - 10x + 7. At x = 2: f\'(2) = 9(2)² - 10(2) + 7 = 9(4) - 20 + 7 = 36 - 20 + 7 = 23.',
    cognitiveTrap: 'Candidates often make arithmetic errors in substituting x = 2 or differentiate 7x to 0 instead of 7.',
    conceptSummary: 'Power rule for differentiation: d/dx(axⁿ) = a·n·xⁿ⁻¹.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Mathematics',
    topic: 'Quadratic Equations',
    subtopic: 'Factorization and Roots',
    year: '2022',
    difficulty: 'easy',
    text: 'Solve for x in the quadratic equation 2x² - 5x + 2 = 0.',
    options: ['x = 2 or x = 1/2', 'x = -2 or x = -1/2', 'x = 3 or x = 1', 'x = 4 or x = 1/4'],
    correctAnswer: 'x = 2 or x = 1/2',
    explanation: 'Factorize by grouping: 2x² - 4x - x + 2 = 0 => 2x(x - 2) - 1(x - 2) = 0 => (2x - 1)(x - 2) = 0. Thus x = 1/2 or x = 2.',
    cognitiveTrap: 'Students often switch signs when transposing roots from (2x - 1)(x - 2) = 0, choosing negative roots.',
    conceptSummary: 'Roots of ax² + bx + c = 0 are obtained by factoring into (px + q)(rx + s) = 0.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Mathematics',
    topic: 'Trigonometry',
    subtopic: 'Special Angles & Identitites',
    year: '2022',
    difficulty: 'medium',
    text: 'If tan θ = 3/4 and θ is an acute angle, find the value of (cos θ - sin θ) / (cos θ + sin θ).',
    options: ['1/7', '2/7', '3/7', '4/7'],
    correctAnswer: '1/7',
    explanation: 'From tan θ = 3/4, opposite = 3, adjacent = 4, hypotenuse = √(3² + 4²) = 5. cos θ = 4/5, sin θ = 3/5. (4/5 - 3/5) / (4/5 + 3/5) = (1/5) / (7/5) = 1/7.',
    cognitiveTrap: 'Dividing numerator and denominator by cos θ gives (1 - tan θ) / (1 + tan θ) = (1 - 3/4) / (1 + 3/4) = (1/4) / (7/4) = 1/7.',
    conceptSummary: 'Right-triangle trigonometric ratios and simplification of rational trigonometric expressions.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Mathematics',
    topic: 'Matrices & Determinants',
    subtopic: '2x2 Matrix Inversion',
    year: '2024',
    difficulty: 'hard',
    text: 'Find the determinant of the matrix A = [[4, 3], [2, 5]].',
    options: ['14', '26', '20', '6'],
    correctAnswer: '14',
    explanation: 'For a 2x2 matrix [[a, b], [c, d]], det(A) = ad - bc. Here det(A) = (4 × 5) - (3 × 2) = 20 - 6 = 14.',
    cognitiveTrap: 'Students occasionally add instead of subtract (ad + bc = 26), which is an intentional distractor.',
    conceptSummary: 'Determinant of order 2 matrix is ad - bc.',
    source: 'official_past_question',
    isVerified: true,
  },

  // ==========================================
  // ENGLISH LANGUAGE (JAMB)
  // ==========================================
  {
    exam: 'JAMB',
    subject: 'English Language',
    topic: 'Lexis & Structure',
    subtopic: 'Synonyms (Nearest in Meaning)',
    year: '2023',
    difficulty: 'medium',
    text: 'Choose the word nearest in meaning to the underlined word: The candidate gave a METICULOUS explanation of the theorem.',
    options: ['Thorough and precise', 'Careless and brief', 'Vague and complicated', 'Hasty and short'],
    correctAnswer: 'Thorough and precise',
    explanation: '\'Meticulous\' means showing great attention to detail; very careful and precise.',
    cognitiveTrap: 'Students confuse \'meticulous\' with \'miraculous\' or \'mysterious\', assuming it means vague or complicated.',
    conceptSummary: 'Adjective meaning precision, diligence, and exhaustive attention to detail.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'English Language',
    topic: 'Grammar',
    subtopic: 'Subject-Verb Agreement (Concord)',
    year: '2023',
    difficulty: 'medium',
    text: 'Neither the principal nor the teachers _____ present at the assembly yesterday.',
    options: ['were', 'was', 'is', 'are'],
    correctAnswer: 'were',
    explanation: 'Under the Rule of Proximity with correlative conjunctions \'neither...nor\', the verb agrees with the closer subject (\'teachers\', which is plural). Since the context is past tense (\'yesterday\'), the correct plural past verb is \'were\'.',
    cognitiveTrap: 'Students often look at \'principal\' (singular) and wrongly select \'was\', or ignore the past tense indicator \'yesterday\'.',
    conceptSummary: 'Correlative concord with \'neither...nor\' follows the nearer subject.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'English Language',
    topic: 'Figures of Speech',
    subtopic: 'Metaphor & Personification',
    year: '2022',
    difficulty: 'easy',
    text: 'Identify the figure of speech in: "The city streets stretched their weary arms in the morning sun."',
    options: ['Personification', 'Hyperbole', 'Oxymoron', 'Euphemism'],
    correctAnswer: 'Personification',
    explanation: 'Giving the human action and anatomy of \'weary arms stretching\' to inanimate city streets is personification.',
    cognitiveTrap: 'Candidates often pick Hyperbole whenever an image is dramatic, overlooking the human attributes applied to non-human entities.',
    conceptSummary: 'Personification endows non-human entities with human attributes, actions, and emotions.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'English Language',
    topic: 'Antonyms',
    subtopic: 'Opposite in Meaning',
    year: '2024',
    difficulty: 'hard',
    text: 'Choose the option opposite in meaning to the capitalized word: The committee regarded his proposals as EPHEMERAL.',
    options: ['Enduring', 'Transient', 'Fleeting', 'Momentary'],
    correctAnswer: 'Enduring',
    explanation: '\'Ephemeral\' means lasting for a very short time. Its direct antonym is \'enduring\' (permanent or long-lasting).',
    cognitiveTrap: 'Transient, fleeting, and momentary are all SYNONYMS of ephemeral. In a hurry, candidates pick synonyms instead of the required antonym.',
    conceptSummary: 'Distinguishing between synonymous distractor clusters and true antonyms.',
    source: 'official_past_question',
    isVerified: true,
  },

  // ==========================================
  // CHEMISTRY (JAMB)
  // ==========================================
  {
    exam: 'JAMB',
    subject: 'Chemistry',
    topic: 'Organic Chemistry',
    subtopic: 'Hydrocarbons & Isomerism',
    year: '2023',
    difficulty: 'hard',
    text: 'What is the correct IUPAC name for CH₃-CH(CH₃)-CH₂-CH=CH₂?',
    options: ['4-methylpent-1-ene', '2-methylpent-4-ene', '4-methylpent-2-ene', '2-methylpent-1-ene'],
    correctAnswer: '4-methylpent-1-ene',
    explanation: 'Number the carbon chain from the end closest to the double bond: C1 is =CH₂, C2 is -CH=, C3 is -CH₂-, C4 is -CH(CH₃)-, C5 is -CH₃. The methyl substituent is at C4, giving 4-methylpent-1-ene.',
    cognitiveTrap: 'Numbering from the left gives 2-methylpent-4-ene, but IUPAC rules give priority to the alkene functional group over alkyl substituents.',
    conceptSummary: 'Functional group priority in IUPAC nomenclature: double bonds take precedence over alkyl substituents in numbering.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Chemistry',
    topic: 'Electrochemistry',
    subtopic: 'Oxidation Numbers & Redox',
    year: '2023',
    difficulty: 'medium',
    text: 'What is the oxidation number of manganese in KMnO₄?',
    options: ['+7', '+6', '+5', '+4'],
    correctAnswer: '+7',
    explanation: 'In KMnO₄: K is +1, O is -2. Total charge is 0. (+1) + Mn + 4(-2) = 0 => 1 + Mn - 8 = 0 => Mn = +7.',
    cognitiveTrap: 'Students sometimes forget the potassium atom (+1) and divide -8 by 2 or take -4 directly.',
    conceptSummary: 'Rules for assigning oxidation numbers in neutral polyatomic compounds.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Chemistry',
    topic: 'Stoichiometry',
    subtopic: 'Gas Laws and Molar Volume',
    year: '2022',
    difficulty: 'medium',
    text: 'What volume of oxygen at s.t.p. is required for the complete combustion of 2.5 moles of ethanol (C₂H₅OH)? [Molar volume at s.t.p. = 22.4 dm³]',
    options: ['168 dm³', '56 dm³', '112 dm³', '224 dm³'],
    correctAnswer: '168 dm³',
    explanation: 'Balanced equation: C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O. 1 mole ethanol requires 3 moles O₂. 2.5 moles ethanol requires 2.5 × 3 = 7.5 moles O₂. Volume = 7.5 × 22.4 dm³ = 168 dm³.',
    cognitiveTrap: 'Failing to balance the combustion equation properly (forgetting the oxygen already present in ethanol).',
    conceptSummary: 'Stoichiometric mole ratios in combustion equations and molar gas volume conversion.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Chemistry',
    topic: 'Acids, Bases & Salts',
    subtopic: 'pH and Solubility Product',
    year: '2024',
    difficulty: 'medium',
    text: 'Calculate the pH of a 0.005 M solution of tetraoxosulphate(VI) acid, H₂SO₄, assuming complete dissociation.',
    options: ['2.0', '1.0', '2.3', '3.0'],
    correctAnswer: '2.0',
    explanation: 'H₂SO₄ is a diprotic acid: H₂SO₄ → 2H⁺ + SO₄²⁻. [H⁺] = 2 × 0.005 M = 0.01 M = 10⁻² M. pH = -log₁₀[H⁺] = -log₁₀(10⁻²) = 2.0.',
    cognitiveTrap: 'Students forget that H₂SO₄ is diprotic and calculate -log(0.005) = 2.3.',
    conceptSummary: 'Diprotic acid ionization yields twice the molar concentration of hydrogen ions.',
    source: 'official_past_question',
    isVerified: true,
  },

  // ==========================================
  // PHYSICS (JAMB)
  // ==========================================
  {
    exam: 'JAMB',
    subject: 'Physics',
    topic: 'Mechanics',
    subtopic: 'Work, Energy & Power',
    year: '2023',
    difficulty: 'medium',
    text: 'A body of mass 4 kg moves with a velocity of 10 m/s. If a constant retarding force of 8 N acts on it until it comes to rest, calculate the distance covered before stopping.',
    options: ['25 m', '50 m', '12.5 m', '20 m'],
    correctAnswer: '25 m',
    explanation: 'Using the Work-Energy Theorem: Work done by retarding force = Initial Kinetic Energy. F × s = 1/2 m v². 8 × s = 1/2 × 4 × (10)² = 2 × 100 = 200 J. s = 200 / 8 = 25 m.',
    cognitiveTrap: 'Students often calculate acceleration a = F/m = 2 m/s² and use v² = u² - 2as, but make errors in sign or forget to square velocity.',
    conceptSummary: 'Work-Energy Theorem: Net work done on an object equals the change in its kinetic energy.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Physics',
    topic: 'Electricity',
    subtopic: 'Electric Circuits & Resistors',
    year: '2023',
    difficulty: 'medium',
    text: 'Three resistors of resistances 2 Ω, 3 Ω, and 6 Ω are connected in parallel across a 12 V battery. What is the total current drawn from the battery?',
    options: ['12 A', '2 A', '1 A', '6 A'],
    correctAnswer: '12 A',
    explanation: 'Equivalent resistance in parallel: 1/R = 1/2 + 1/3 + 1/6 = (3 + 2 + 1)/6 = 6/6 = 1 Ω. Total resistance R = 1 Ω. Total current I = V / R = 12 V / 1 Ω = 12 A.',
    cognitiveTrap: 'Students wrongly add the resistances in series (2 + 3 + 6 = 11 Ω) or calculate 1/R = 1 and forget to take the reciprocal.',
    conceptSummary: 'Parallel resistance formula: 1/R_eq = ∑(1/R_i) and Ohm\'s law I = V/R.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Physics',
    topic: 'Waves & Optics',
    subtopic: 'Refraction & Total Internal Reflection',
    year: '2022',
    difficulty: 'hard',
    text: 'If the critical angle for a glass-air boundary is 42°, what is the refractive index of the glass?',
    options: ['1.49', '1.33', '1.50', '0.67'],
    correctAnswer: '1.49',
    explanation: 'Refractive index n = 1 / sin(c) = 1 / sin(42°). sin(42°) ≈ 0.6691. n = 1 / 0.6691 ≈ 1.494.',
    cognitiveTrap: 'Students occasionally multiply by sin(c) instead of taking the reciprocal, yielding 0.67.',
    conceptSummary: 'Relationship between refractive index and critical angle: n = 1 / sin c.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Physics',
    topic: 'Thermal Physics',
    subtopic: 'Specific Heat Capacity',
    year: '2024',
    difficulty: 'medium',
    text: 'An electric kettle rated 2 kW is used to heat 1.5 kg of water from 20°C to 100°C. Calculate the time taken, ignoring heat losses. [Specific heat capacity of water = 4200 J/kg·K]',
    options: ['252 s', '126 s', '504 s', '63 s'],
    correctAnswer: '252 s',
    explanation: 'Heat energy required Q = mcΔθ = 1.5 × 4200 × (100 - 20) = 1.5 × 4200 × 80 = 504,000 J. Power P = 2000 W. Time t = Q / P = 504,000 / 2000 = 252 seconds.',
    cognitiveTrap: 'Using Δθ = 100 instead of (100 - 20 = 80°C) or confusing kW with W.',
    conceptSummary: 'Electrical power conversion to thermal energy: P·t = mcΔθ.',
    source: 'official_past_question',
    isVerified: true,
  },

  // ==========================================
  // BIOLOGY (JAMB)
  // ==========================================
  {
    exam: 'JAMB',
    subject: 'Biology',
    topic: 'Genetics',
    subtopic: 'Mendelian Monohybrid Crosses',
    year: '2023',
    difficulty: 'medium',
    text: 'In a monohybrid cross between two heterozygous tall pea plants (Tt), what percentage of the offspring is expected to be homozygous?',
    options: ['50%', '25%', '75%', '100%'],
    correctAnswer: '50%',
    explanation: 'Crossing Tt × Tt gives genotypes: 1 TT (homozygous dominant), 2 Tt (heterozygous), 1 tt (homozygous recessive). Homozygous offspring = TT + tt = 1/4 + 1/4 = 2/4 = 50%.',
    cognitiveTrap: 'Students often read \'homozygous\' as \'homozygous dominant\' and answer 25%, or confuse genotype with phenotype ratio (75% tall).',
    conceptSummary: 'Mendelian 1:2:1 genotypic ratio contains 50% homozygous and 50% heterozygous individuals.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Biology',
    topic: 'Cell Biology',
    subtopic: 'Cell Organelles & Functions',
    year: '2023',
    difficulty: 'easy',
    text: 'Which cellular organelle is responsible for the synthesis of proteins in eukaryotic cells?',
    options: ['Ribosome', 'Mitochondria', 'Golgi apparatus', 'Lysosome'],
    correctAnswer: 'Ribosome',
    explanation: 'Ribosomes are the cellular machinery where amino acids are assembled into proteins according to mRNA instructions.',
    cognitiveTrap: 'Confusing ribosomes with the Golgi apparatus (which packages and modifies proteins) or mitochondria (which produces ATP).',
    conceptSummary: 'Ribosomes perform protein translation in all living cells.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Biology',
    topic: 'Ecology',
    subtopic: 'Trophic Levels & Food Chains',
    year: '2022',
    difficulty: 'medium',
    text: 'In an ecosystem, which of the following organisms represents a primary consumer?',
    options: ['Herbivore', 'Carnivore', 'Producer', 'Decomposer'],
    correctAnswer: 'Herbivore',
    explanation: 'Primary consumers feed directly on primary producers (green plants). Therefore, herbivores are primary consumers.',
    cognitiveTrap: 'Candidates sometimes confuse \'primary producer\' with \'primary consumer\'.',
    conceptSummary: 'Trophic level hierarchy: Producers → Primary consumers (herbivores) → Secondary consumers → Tertiary consumers.',
    source: 'official_past_question',
    isVerified: true,
  },

  // ==========================================
  // ECONOMICS (JAMB)
  // ==========================================
  {
    exam: 'JAMB',
    subject: 'Economics',
    topic: 'Price Theory',
    subtopic: 'Elasticity of Demand',
    year: '2023',
    difficulty: 'medium',
    text: 'When the price of a commodity increases from ₦100 to ₦120, its quantity demanded falls from 500 units to 400 units. Calculate the price elasticity of demand.',
    options: ['1.0', '1.5', '0.8', '2.0'],
    correctAnswer: '1.0',
    explanation: '% change in quantity demanded = (400 - 500)/500 × 100 = -20%. % change in price = (120 - 100)/100 × 100 = +20%. Elasticity = |-20% / +20%| = 1.0 (Unitary elastic).',
    cognitiveTrap: 'Using the new price as the base in percentage calculation, or confusing arc elasticity with point elasticity.',
    conceptSummary: 'Price elasticity of demand measures responsiveness of quantity demanded to a percentage change in price.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Economics',
    topic: 'Macroeconomics',
    subtopic: 'Inflation & Monetary Policy',
    year: '2023',
    difficulty: 'medium',
    text: 'To control demand-pull inflation, the Central Bank of Nigeria should:',
    options: ['Increase the cash reserve ratio', 'Decrease the discount rate', 'Buy government securities in the open market', 'Reduce tax rates'],
    correctAnswer: 'Increase the cash reserve ratio',
    explanation: 'Increasing the Cash Reserve Ratio (CRR) forces commercial banks to hold more reserves, reducing credit creation and the money supply, which curbs demand-pull inflation.',
    cognitiveTrap: 'Buying securities or decreasing discount rates are expansionary policies that INCREASE the money supply, worsening inflation.',
    conceptSummary: 'Contractionary monetary policy instruments: raising CRR, raising discount rate, selling treasury bills (OMO).',
    source: 'official_past_question',
    isVerified: true,
  },

  // ==========================================
  // GOVERNMENT (JAMB)
  // ==========================================
  {
    exam: 'JAMB',
    subject: 'Government',
    topic: 'Constitutional Development',
    subtopic: 'Pre-Independence Nigerian Constitutions',
    year: '2023',
    difficulty: 'medium',
    text: 'Which Nigerian constitution introduced the elective principle for the first time in 1922?',
    options: ['Clifford Constitution', 'Richards Constitution', 'Macpherson Constitution', 'Lyttelton Constitution'],
    correctAnswer: 'Clifford Constitution',
    explanation: 'The 1922 Clifford Constitution introduced the elective principle, allowing four elected Africans (three from Lagos, one from Calabar) into the Legislative Council.',
    cognitiveTrap: 'Richards Constitution (1946) introduced regionalism, Macpherson (1951) introduced ministerial government, and Lyttelton (1954) established federalism.',
    conceptSummary: '1922 Clifford Constitution gave birth to modern electoral politics and political parties in Nigeria.',
    source: 'official_past_question',
    isVerified: true,
  },
  {
    exam: 'JAMB',
    subject: 'Government',
    topic: 'Political Systems',
    subtopic: 'Federalism and Separation of Powers',
    year: '2022',
    difficulty: 'easy',
    text: 'In a presidential system of government, the chief executive is:',
    options: ['Elected independently of the legislature', 'Chosen by the majority party in parliament', 'A member of the judiciary', 'Appointed by traditional rulers'],
    correctAnswer: 'Elected independently of the legislature',
    explanation: 'In a presidential system (like Nigeria and the USA), the President is elected directly or through an electoral college separately from the legislature, preserving separation of powers.',
    cognitiveTrap: 'Option B describes a parliamentary system (e.g., the British Prime Minister), not a presidential system.',
    conceptSummary: 'Separation of powers and independent executive mandate in presidential democracies.',
    source: 'official_past_question',
    isVerified: true,
  }
];

export async function seedVerifiedQuestions() {
  await connectDB();
  console.log('🌱 Seeding verified syllabus questions for Preplyx...');

  let created = 0;
  let updated = 0;

  for (const q of VERIFIED_QUESTIONS) {
    const existing = await Question.findOne({
      exam: q.exam,
      subject: q.subject,
      text: q.text,
    });

    if (existing) {
      existing.topic = q.topic;
      existing.subtopic = q.subtopic;
      existing.difficulty = q.difficulty as any;
      existing.correctAnswer = q.correctAnswer;
      existing.explanation = q.explanation;
      existing.cognitiveTrap = q.cognitiveTrap;
      existing.conceptSummary = q.conceptSummary;
      existing.source = q.source as any;
      existing.isVerified = true;
      existing.status = 'published';
      await existing.save();
      updated++;
    } else {
      await Question.create({
        ...q,
        difficulty: (q.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
        source: (q.source as any) || 'verified_curriculum',
        status: 'published',
      });
      created++;
    }
  }

  console.log(`✅ Verified questions: Created ${created}, Updated ${updated}. Total in set: ${VERIFIED_QUESTIONS.length}`);
}

// Allow direct execution
if (require.main === module) {
  seedVerifiedQuestions().then(() => {
    console.log('Done!');
    process.exit(0);
  }).catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
