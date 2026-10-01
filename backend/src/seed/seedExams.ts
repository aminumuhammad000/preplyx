import mongoose from 'mongoose';
import Exam from '../models/Exam';
import { connectDB } from '../config/db';

const examData = [
  {
    name: 'JAMB',
    displayName: 'JAMB',
    subjects: [
      'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 
      'Economics', 'Government', 'Literature in English', 'Accounting', 'Commerce',
      'Agricultural Science', 'Geography', 'History', 'Christian Religious Studies', 
      'Islamic Religious Studies', 'Civic Education', 'Computer Studies', 'Further Mathematics',
      'French', 'Arabic', 'Yoruba', 'Igbo', 'Hausa', 'Music', 'Art', 'Physical Education',
      'Office Practice', 'Insurance', 'Principles of Management', 'Business Management'
    ],
    color: '#4B0FA3',
    years: '2004 – 2024',
    description: 'Joint Admissions and Matriculation Board'
  },
  {
    name: 'WAEC',
    displayName: 'WAEC',
    subjects: [
      'Mathematics', 'English Language', 'Biology', 'Economics', 'Physics', 'Chemistry',
      'Agricultural Science', 'Government', 'Literature in English', 'Accounting', 'Commerce',
      'Geography', 'History', 'Christian Religious Studies', 'Islamic Religious Studies',
      'Civic Education', 'Computer Studies', 'Further Mathematics', 'French', 'Arabic',
      'Yoruba', 'Igbo', 'Hausa', 'Music', 'Art', 'Physical Education', 'Office Practice',
      'Insurance', 'Principles of Management', 'Business Management', 'Food and Nutrition',
      'Clothing and Textile', 'Home Management', 'Technical Drawing', 'Metalwork',
      'Woodwork', 'Electronics', 'Auto Mechanics', 'Basic Electricity', 'Applied Electricity',
      'Shorthand', 'Typewriting', 'Bookkeeping', 'Salesmanship'
    ],
    color: '#7B2FF7',
    years: '2000 – 2024',
    description: 'West African Examinations Council'
  },
  {
    name: 'NECO',
    displayName: 'NECO',
    subjects: [
      'Mathematics', 'English Language', 'Biology', 'Economics', 'Physics', 'Chemistry',
      'Agricultural Science', 'Government', 'Literature in English', 'Accounting', 'Commerce',
      'Geography', 'History', 'Christian Religious Studies', 'Islamic Religious Studies',
      'Civic Education', 'Computer Studies', 'Further Mathematics', 'French', 'Arabic',
      'Yoruba', 'Igbo', 'Hausa', 'Music', 'Art', 'Physical Education', 'Office Practice',
      'Insurance', 'Principles of Management', 'Business Management', 'Food and Nutrition',
      'Clothing and Textile', 'Home Management', 'Technical Drawing', 'Metalwork',
      'Woodwork', 'Electronics', 'Auto Mechanics', 'Basic Electricity', 'Applied Electricity'
    ],
    color: '#4B0FA3',
    years: '2003 – 2024',
    description: 'National Examinations Council'
  }
];

const seedExams = async () => {
  try {
    await connectDB();
    
    // Clear existing exams
    await Exam.deleteMany({});
    console.log('Cleared existing exams');
    
    // Insert new exams
    await Exam.insertMany(examData);
    console.log('Successfully seeded exams');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding exams:', error);
    process.exit(1);
  }
};

seedExams();
