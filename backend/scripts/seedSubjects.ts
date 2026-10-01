import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subject from '../src/models/Subject';

dotenv.config();

const SUBJECT_CATEGORIES: Record<string, string[]> = {
  'Mathematics': ['Science', 'Art', 'Commerce'],
  'English Language': ['Science', 'Art', 'Commerce'],
  'Physics': ['Science'],
  'Chemistry': ['Science'],
  'Biology': ['Science'],
  'Agricultural Science': ['Science', 'Vocational'],
  'Economics': ['Commerce', 'Art'],
  'Government': ['Art'],
  'Civic Education': ['Art', 'Commerce'],
  'Literature in English': ['Art'],
  'Accounting': ['Commerce'],
  'Commerce': ['Commerce'],
  'Geography': ['Science', 'Art'],
  'History': ['Art'],
  'Christian Religious Studies': ['Art'],
  'Islamic Religious Studies': ['Art'],
  'Computer Studies': ['Science', 'Vocational'],
  'Further Mathematics': ['Science'],
  'French': ['Language', 'Art'],
  'Arabic': ['Language', 'Art'],
  'Yoruba': ['Language', 'Art'],
  'Igbo': ['Language', 'Art'],
  'Hausa': ['Language', 'Art'],
  'Music': ['Art'],
  'Art': ['Art', 'Vocational'],
  'Physical Education': ['Vocational'],
  'Office Practice': ['Commerce', 'Vocational'],
  'Insurance': ['Commerce'],
  'Principles of Management': ['Commerce'],
  'Business Management': ['Commerce'],
  'Food and Nutrition': ['Vocational'],
  'Clothing and Textile': ['Vocational'],
  'Home Management': ['Vocational'],
  'Technical Drawing': ['Vocational'],
  'Metalwork': ['Vocational'],
  'Woodwork': ['Vocational'],
  'Electronics': ['Vocational'],
  'Auto Mechanics': ['Vocational'],
  'Basic Electricity': ['Vocational'],
  'Applied Electricity': ['Vocational'],
  'Shorthand': ['Commerce', 'Vocational'],
  'Typewriting': ['Commerce', 'Vocational'],
  'Bookkeeping': ['Commerce'],
  'Salesmanship': ['Commerce']
};

const SUBJECT_ICONS: Record<string, string> = {
  Mathematics: 'Calculator',
  'English Language': 'BookType',
  Physics: 'Zap',
  Chemistry: 'FlaskConical',
  Biology: 'Leaf',
  Economics: 'BarChart3',
  Government: 'Landmark',
  'Civic Education': 'Vote',
  'Agricultural Science': 'Sprout',
  'Literature in English': 'BookText',
  Accounting: 'Briefcase',
  Commerce: 'ShoppingCart',
  Geography: 'Globe',
  History: 'Scroll',
  'Christian Religious Studies': 'Cross',
  'Islamic Religious Studies': 'Building2',
  'Computer Studies': 'Monitor',
  'Further Mathematics': 'Calculator',
  French: 'Globe',
  Arabic: 'Globe',
  Yoruba: 'Globe',
  Igbo: 'Globe',
  Hausa: 'Globe',
  Music: 'Music',
  Art: 'Palette',
  'Physical Education': 'Activity',
  'Office Practice': 'Briefcase',
  Insurance: 'Shield',
  'Principles of Management': 'Users',
  'Business Management': 'Briefcase',
  'Food and Nutrition': 'Apple',
  'Clothing and Textile': 'Shirt',
  'Home Management': 'Home',
  'Technical Drawing': 'PenTool',
  Metalwork: 'Hammer',
  Woodwork: 'Hammer',
  Electronics: 'Cpu',
  'Auto Mechanics': 'Wrench',
  'Basic Electricity': 'Zap',
  'Applied Electricity': 'Zap',
  Shorthand: 'Pen',
  Typewriting: 'Keyboard',
  Bookkeeping: 'Book',
  Salesmanship: 'TrendingUp'
};

const SUBJECT_TIPS: Record<string, string> = {
  Mathematics: 'Algebra, Sequences, Statistics',
  'English Language': 'Comprehension, Grammar, Vocabulary',
  Physics: 'Mechanics, Waves, Electromagnetism',
  Chemistry: 'Organic, Inorganic, Physical Chem',
  Biology: 'Genetics, Ecology, Cell Biology',
  'Agricultural Science': 'Crops, Livestock, Soil Science',
  Economics: 'Micro, Macro, Trade & Policy',
  Government: 'Constitution, Governance, Politics',
  'Civic Education': 'Rights, Duties, Citizenship',
  'Literature in English': 'Prose, Poetry, Drama, Figures of Speech',
  Accounting: 'Ledgers, Balance Sheets, Financials',
  Commerce: 'Trade, Finance, Business Organizations',
  Geography: 'Physical, Human, Regional Geography',
  History: 'Nigeria, Africa, World History',
  'Christian Religious Studies': 'Bible, Christian Teachings',
  'Islamic Religious Studies': 'Quran, Islamic Teachings',
  'Computer Studies': 'Programming, Hardware, Networks',
  'Further Mathematics': 'Calculus, Mechanics, Statistics',
  French: 'Grammar, Vocabulary, Comprehension',
  Arabic: 'Grammar, Vocabulary, Comprehension',
  Yoruba: 'Grammar, Literature, Culture',
  Igbo: 'Grammar, Literature, Culture',
  Hausa: 'Grammar, Literature, Culture',
  Music: 'Theory, Practical, History',
  Art: 'Drawing, Painting, Art History',
  'Physical Education': 'Sports, Health, Fitness',
  'Office Practice': 'Secretariat, Administration',
  Insurance: 'Risk, Policies, Claims',
  'Principles of Management': 'Planning, Organizing, Control',
  'Business Management': 'Organization, Strategy, Operations',
  'Food and Nutrition': 'Food Science, Dietetics',
  'Clothing and Textile': 'Fabrics, Design, Production',
  'Home Management': 'Family Resources, Housing',
  'Technical Drawing': 'Engineering, Architectural Drawing',
  Metalwork: 'Fabrication, Welding, Machining',
  Woodwork: 'Carpentry, Joinery, Finishing',
  Electronics: 'Circuits, Devices, Systems',
  'Auto Mechanics': 'Engine, Transmission, Systems',
  'Basic Electricity': 'Circuits, Components, Safety',
  'Applied Electricity': 'Installation, Maintenance',
  Shorthand: 'Speedwriting, Transcription',
  Typewriting: 'Keyboard Skills, Document Production',
  Bookkeeping: 'Recording, Classifying, Summarizing',
  Salesmanship: 'Selling Techniques, Customer Service'
};

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/cbt');
  console.log('Connected to MongoDB');

  const names = Object.keys(SUBJECT_CATEGORIES);
  let created = 0;
  let updated = 0;

  for (const name of names) {
    const categories = SUBJECT_CATEGORIES[name] || [];
    const icon = SUBJECT_ICONS[name] || 'BookOpen';
    const tips = SUBJECT_TIPS[name] || '';

    const existing = await Subject.findOne({ name });
    if (existing) {
      existing.categories = categories;
      existing.icon = icon;
      existing.tips = tips;
      await existing.save();
      updated++;
    } else {
      await Subject.create({
        name,
        categories,
        icon,
        tips
      });
      created++;
    }
  }

  console.log(`Created ${created} subjects, updated ${updated} subjects.`);
  process.exit(0);
}

seed();
