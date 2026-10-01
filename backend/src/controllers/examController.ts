import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import Exam from '../models/Exam';
import Question from '../models/Question';

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

// Move SUBJECT_CATEGORIES before the functions that use it

/**
 * @desc    Get all exam types with their subjects
 * @route   GET /api/exams
 * @access  Public
 */
export const getExams = async (req: AuthRequest, res: Response): Promise<void> => {
  const defaultExams = {
    JAMB: {
      id: 'jamb',
      name: 'JAMB UTME',
      displayName: 'JAMB UTME',
      desc: 'Unified Tertiary Matriculation Examination',
      color: '#7B2FF7',
      years: '2000 - 2024',
      subjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government'],
      questionCount: '420'
    },
    WAEC: {
      id: 'waec',
      name: 'WAEC SSCE',
      displayName: 'WAEC SSCE',
      desc: 'West African Senior School Certificate Examination',
      color: '#10B981',
      years: '2000 - 2024',
      subjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Civic Education'],
      questionCount: '480'
    },
    NECO: {
      id: 'neco',
      name: 'NECO SSCE',
      displayName: 'NECO SSCE',
      desc: 'National Examinations Council',
      color: '#F59E0B',
      years: '2000 - 2024',
      subjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government'],
      questionCount: '420'
    }
  };

  try {
    const exams = await Exam.find({});
    
    if (!exams || exams.length === 0) {
      res.json(defaultExams);
      return;
    }

    const formattedExams: Record<string, any> = {};
    exams.forEach(exam => {
      formattedExams[exam.name] = {
        subjects: exam.subjects,
        color: exam.color,
        years: exam.years,
        desc: exam.description,
        questionCount: exam.questionCount || '0',
        displayName: exam.displayName || exam.name
      };
    });
    
    res.json(formattedExams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.json(defaultExams);
  }
};

/**
 * @desc    Get subjects for a specific exam
 * @route   GET /api/exams/:exam/subjects
 * @access  Public
 */
export const getExamSubjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { exam } = req.params;
    const examData = await Exam.findOne({ name: exam.toUpperCase() });
    
    if (!examData) {
      res.status(404).json({ message: 'Exam not found' });
      return;
    }
    
    res.json({
      subjects: examData.subjects,
      color: examData.color,
      years: examData.years,
      desc: examData.description
    });
  } catch (error) {
    console.error('Error fetching exam subjects:', error);
    res.status(500).json({ message: 'Error fetching exam subjects' });
  }
};

/**
 * @desc    Get categories for subjects
 * @route   GET /api/exams/categories
 * @access  Public
 */
export const getSubjectCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json(SUBJECT_CATEGORIES);
  } catch (error) {
    console.error('Error fetching subject categories:', error);
    res.status(500).json({ message: 'Error fetching subject categories' });
  }
};

/**
 * @desc    Get subject icons
 * @route   GET /api/exams/icons
 * @access  Public
 */
export const getSubjectIcons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json(SUBJECT_ICONS);
  } catch (error) {
    console.error('Error fetching subject icons:', error);
    res.status(500).json({ message: 'Error fetching subject icons' });
  }
};

/**
 * @desc    Get subject tips
 * @route   GET /api/exams/tips
 * @access  Public
 */
export const getSubjectTips = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json(SUBJECT_TIPS);
  } catch (error) {
    console.error('Error fetching subject tips:', error);
    res.status(500).json({ message: 'Error fetching subject tips' });
  }
};

/**
 * @desc    Get real availability data from question bank (years, subjects, topics per exam)
 * @route   GET /api/exams/availability
 * @access  Public
 */
export const getExamAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Aggregate all published questions by exam, subject, year, and topic
    const pipeline = [
      { $match: { status: { $ne: 'archived' } } },
      {
        $group: {
          _id: { exam: '$exam', subject: '$subject', year: '$year', topic: '$topic' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: { exam: '$_id.exam', subject: '$_id.subject', year: '$_id.year' },
          topics: { $addToSet: '$_id.topic' },
          count: { $sum: '$count' }
        }
      },
      {
        $group: {
          _id: { exam: '$_id.exam', subject: '$_id.subject' },
          years: { $addToSet: '$_id.year' },
          topics: { $push: { year: '$_id.year', topics: '$topics' } },
          totalCount: { $sum: '$count' }
        }
      },
      {
        $group: {
          _id: '$_id.exam',
          subjects: {
            $push: {
              subject: '$_id.subject',
              years: '$years',
              topics: '$topics',
              count: '$totalCount'
            }
          },
          totalCount: { $sum: '$totalCount' }
        }
      }
    ];

    const results = await Question.aggregate(pipeline as any);

    // Format into a structured response
    const availability: Record<string, {
      hasQuestions: boolean;
      totalCount: number;
      years: string[];
      subjects: string[];
      subjectYears: Record<string, string[]>;
      topics: Record<string, string[]>;
    }> = {};

    for (const examResult of results) {
      const examName = examResult._id;
      const allYears = new Set<string>();
      const allSubjects: string[] = [];
      const subjectYears: Record<string, string[]> = {};
      const topics: Record<string, string[]> = {};

      for (const subjectData of examResult.subjects) {
        const subjectName = subjectData.subject;
        allSubjects.push(subjectName);

        // Collect years for this subject
        const subjectYearsList = (subjectData.years || []).filter((y: string) => y && y !== 'undefined');
        subjectYears[subjectName] = subjectYearsList.sort((a: string, b: string) => Number(b) - Number(a));
        subjectYearsList.forEach((y: string) => allYears.add(y));

        // Collect all unique topics for this subject (across all years)
        const allTopics = new Set<string>();
        for (const yearTopics of subjectData.topics || []) {
          for (const t of yearTopics.topics || []) {
            if (t && t !== 'General' && t !== 'undefined') allTopics.add(t);
          }
        }
        if (allTopics.size > 0) {
          topics[subjectName] = Array.from(allTopics);
        }
      }

      const sortedYears = Array.from(allYears)
        .filter(y => y && y !== 'undefined')
        .sort((a, b) => Number(b) - Number(a));

      availability[examName] = {
        hasQuestions: examResult.totalCount > 0,
        totalCount: examResult.totalCount,
        years: sortedYears,
        subjects: allSubjects,
        subjectYears,
        topics
      };
    }

    res.json(availability);
  } catch (error) {
    console.error('Error fetching exam availability:', error);
    res.status(500).json({ message: 'Error fetching exam availability' });
  }
};