import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Exam from '../models/Exam';
import Question from '../models/Question';
import ExamSession from '../models/ExamSession';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';
import BroadcastNotification from '../models/BroadcastNotification';
import { connectDB } from '../config/db';

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting full database seed...');

    // 1. Clear existing collections
    await User.deleteMany({});
    await Exam.deleteMany({});
    await Question.deleteMany({});
    await ExamSession.deleteMany({});
    await Wallet.deleteMany({});
    await Transaction.deleteMany({});
    await BroadcastNotification.deleteMany({});
    console.log('🧹 Cleared existing database records.');

    // 2. Create Exams
    const examData = [
      {
        name: 'JAMB',
        displayName: 'JAMB UTME',
        subjects: [
          'English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 
          'Economics', 'Government', 'Literature in English', 'Commerce', 'Civic Education'
        ],
        color: '#7B2FF7',
        years: '2004 – 2024',
        description: 'Unified Tertiary Matriculation Examination for Nigerian Universities'
      },
      {
        name: 'WAEC',
        displayName: 'WAEC SSCE',
        subjects: [
          'English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
          'Economics', 'Government', 'Civic Education', 'Agricultural Science'
        ],
        color: '#10B981',
        years: '2000 – 2024',
        description: 'West African Senior School Certificate Examination'
      },
      {
        name: 'NECO',
        displayName: 'NECO SSCE',
        subjects: [
          'English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
          'Economics', 'Government', 'Civic Education'
        ],
        color: '#F59E0B',
        years: '2003 – 2024',
        description: 'National Examinations Council Senior School Certificate'
      }
    ];

    const createdExams = await Exam.insertMany(examData);
    console.log(`✅ Seeded ${createdExams.length} Exam categories.`);

    // 3. Create Sample Questions
    const sampleQuestions = [
      // Mathematics (JAMB)
      {
        exam: 'JAMB',
        subject: 'Mathematics',
        text: 'If log₁₀ 2 = 0.3010 and log₁₀ 3 = 0.4771, evaluate log₁₀ 18.',
        options: ['1.2552', '1.0791', '1.4313', '0.7781'],
        correctAnswer: '1.2552',
        explanation: 'log₁₀ 18 = log₁₀(2 × 3²) = log₁₀ 2 + 2 log₁₀ 3 = 0.3010 + 2(0.4771) = 0.3010 + 0.9542 = 1.2552.'
      },
      {
        exam: 'JAMB',
        subject: 'Mathematics',
        text: 'Find the derivative of f(x) = 3x³ - 5x² + 7x - 4 at x = 2.',
        options: ['19', '23', '15', '27'],
        correctAnswer: '23',
        explanation: 'f\'(x) = 9x² - 10x + 7. At x = 2: f\'(2) = 9(4) - 10(2) + 7 = 36 - 20 + 7 = 23.'
      },
      {
        exam: 'JAMB',
        subject: 'Mathematics',
        text: 'Solve for x in the quadratic equation 2x² - 5x + 2 = 0.',
        options: ['x = 2 or x = 1/2', 'x = -2 or x = -1/2', 'x = 3 or x = 1', 'x = 4 or x = 1/4'],
        correctAnswer: 'x = 2 or x = 1/2',
        explanation: '(2x - 1)(x - 2) = 0 => x = 1/2 or x = 2.'
      },

      // English Language (JAMB)
      {
        exam: 'JAMB',
        subject: 'English Language',
        text: 'Choose the word nearest in meaning to the underlined word: The candidate gave a **meticulous** explanation of the formula.',
        options: ['Thorough and precise', 'Careless and brief', 'Vague and complicated', 'Hasty and short'],
        correctAnswer: 'Thorough and precise',
        explanation: '\'Meticulous\' means showing great attention to detail; very careful and precise.'
      },
      {
        exam: 'JAMB',
        subject: 'English Language',
        text: 'Choose the option opposite in meaning to **ephemeral**.',
        options: ['Permanent', 'Transient', 'Fleeting', 'Short-lived'],
        correctAnswer: 'Permanent',
        explanation: '\'Ephemeral\' means lasting for a very short time. Its antonym is permanent.'
      },

      // Physics (JAMB)
      {
        exam: 'JAMB',
        subject: 'Physics',
        text: 'Calculate the kinetic energy of an object of mass 4 kg moving at a velocity of 5 m/s.',
        options: ['50 J', '100 J', '20 J', '10 J'],
        correctAnswer: '50 J',
        explanation: 'KE = 1/2 m v² = 1/2 × 4 × (5)² = 2 × 25 = 50 Joules.'
      },
      {
        exam: 'JAMB',
        subject: 'Physics',
        text: 'Which of the following electromagnetic waves has the highest frequency?',
        options: ['Gamma Rays', 'X-Rays', 'Ultraviolet Light', 'Radio Waves'],
        correctAnswer: 'Gamma Rays',
        explanation: 'Gamma rays have the shortest wavelength and highest frequency in the electromagnetic spectrum.'
      },

      // Chemistry (JAMB)
      {
        exam: 'JAMB',
        subject: 'Chemistry',
        text: 'What is the oxidation number of Manganese in KMnO₄?',
        options: ['+7', '+6', '+5', '+4'],
        correctAnswer: '+7',
        explanation: 'K(+1) + Mn + 4(-2) = 0 => 1 + Mn - 8 = 0 => Mn = +7.'
      },
      {
        exam: 'JAMB',
        subject: 'Chemistry',
        text: 'The gas produced when sodium metal reacts with water is:',
        options: ['Hydrogen', 'Oxygen', 'Carbon dioxide', 'Nitrogen'],
        correctAnswer: 'Hydrogen',
        explanation: '2Na + 2H₂O → 2NaOH + H₂↑. Hydrogen gas is evolved.'
      },

      // Biology (JAMB)
      {
        exam: 'JAMB',
        subject: 'Biology',
        text: 'Which organelle is known as the powerhouse of the cell?',
        options: ['Mitochondria', 'Ribosome', 'Golgi Apparatus', 'Nucleus'],
        correctAnswer: 'Mitochondria',
        explanation: 'Mitochondria generate most of the chemical energy (ATP) needed to power cellular reactions.'
      },

      // WAEC Questions
      {
        exam: 'WAEC',
        subject: 'Mathematics',
        text: 'In a right-angled triangle, if the opposite side is 6 cm and hypotenuse is 10 cm, find sin θ.',
        options: ['0.6', '0.8', '0.75', '1.25'],
        correctAnswer: '0.6',
        explanation: 'sin θ = opposite / hypotenuse = 6 / 10 = 0.6.'
      },
      {
        exam: 'WAEC',
        subject: 'English Language',
        text: 'Identify the grammatically correct sentence:',
        options: [
          'Neither the teacher nor the students were present.',
          'Neither the teacher nor the students was present.',
          'Neither the teacher or the students were present.',
          'Neither teacher and students was present.'
        ],
        correctAnswer: 'Neither the teacher nor the students were present.',
        explanation: 'When using \'neither...nor\', the verb agrees with the subject closest to it (\'students\' -> \'were\').'
      }
    ];

    const createdQuestions = await Question.insertMany(sampleQuestions);
    console.log(`✅ Seeded ${createdQuestions.length} Practice Questions.`);

    // 4. Create Top Candidate Users for Leaderboard & Testing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('12345678', salt);

    const candidatesData = [
      { name: 'Sarah Johnson', email: 'sarah.j@example.com', exam_type: 'JAMB', phone: '08012345671' },
      { name: 'Emmanuel Okafor', email: 'emmanuel.o@example.com', exam_type: 'WAEC', phone: '08012345672' },
      { name: 'Fatima Ahmed', email: 'fatima.a@example.com', exam_type: 'JAMB', phone: '08012345673' },
      { name: 'Chinedu Eze', email: 'chinedu.e@example.com', exam_type: 'NECO', phone: '08012345674' },
      { name: 'Grace Adebayo', email: 'grace.a@example.com', exam_type: 'JAMB', phone: '08012345675' },
      { name: 'David Nnamdi', email: 'david.n@example.com', exam_type: 'WAEC', phone: '08012345676' },
      { name: 'Blessing Ibrahim', email: 'blessing.i@example.com', exam_type: 'JAMB', phone: '08012345677' },
      { name: 'Olusegun Peters', email: 'olusegun.p@example.com', exam_type: 'NECO', phone: '08012345678' },
      { name: 'Ngozi Onwudiwe', email: 'ngozi.o@example.com', exam_type: 'JAMB', phone: '08012345679' },
      { name: 'Tunde Bakare', email: 'tunde.b@example.com', exam_type: 'WAEC', phone: '08012345680' },
      { name: 'Student Demo', email: 'demo@preplyx.com', exam_type: 'JAMB', phone: '08000000000' }
    ];

    const usersToCreate = candidatesData.map(c => ({
      name: c.name,
      email: c.email,
      password: hashedPassword,
      phone: c.phone,
      exam_type: c.exam_type,
      settings: { darkMode: true, notifications: true, emailNotifications: true, language: 'English' },
      notifications: []
    }));

    const createdUsers = await User.insertMany(usersToCreate);
    console.log(`✅ Seeded ${createdUsers.length} Candidate Users.`);

    // 5. Seed Exam Sessions for Each User to Generate Real Scores & Leaderboard XP
    const pointsTarget = [2840, 2560, 2390, 2150, 1980, 1820, 1650, 1540, 1420, 1310, 1750];
    const sessionsToCreate: any[] = [];

    createdUsers.forEach((user, index) => {
      const targetScore = pointsTarget[index] || 1500;
      const numSessions = Math.floor(targetScore / 100);
      const scorePerSession = Math.round(targetScore / numSessions);

      for (let i = 0; i < numSessions; i++) {
        const daysAgo = (numSessions - i) * 2;
        const sessionDate = new Date();
        sessionDate.setDate(sessionDate.getDate() - daysAgo);

        const score = i === numSessions - 1 ? targetScore - (scorePerSession * (numSessions - 1)) : scorePerSession;
        const total = 10;
        const percentage = Math.min(100, Math.round((score / (total * 10)) * 100));

        sessionsToCreate.push({
          user: user._id,
          exam: user.exam_type || 'JAMB',
          subject: i % 2 === 0 ? 'Mathematics' : 'English Language',
          score: Math.max(score, 10),
          total: total,
          percentage: percentage,
          timeSpentSeconds: 300 + (i * 20),
          createdAt: sessionDate,
          updatedAt: sessionDate,
          details: [
            {
              questionId: createdQuestions[0]?._id?.toString() || 'q1',
              questionText: sampleQuestions[0].text,
              userAnswer: sampleQuestions[0].options[0],
              correctAnswer: sampleQuestions[0].correctAnswer,
              isCorrect: true,
              explanation: sampleQuestions[0].explanation
            }
          ]
        });
      }
    });

    const createdSessions = await ExamSession.insertMany(sessionsToCreate);
    console.log(`✅ Seeded ${createdSessions.length} Exam Sessions for Leaderboard calculation.`);

    // 6. Create Wallets for Users
    const walletsToCreate = createdUsers.map((user, idx) => ({
      user: user._id,
      balance: idx === createdUsers.length - 1 ? 5000 : 2500,
      totalFunded: 5000,
      totalSpent: 2500,
      welcomeBonus: 1000,
      virtualAccount: {
        bankName: 'Moniepoint Microfinance Bank',
        accountName: `PREPLYX / ${user.name}`,
        accountNumber: `90${Math.floor(10000000 + Math.random() * 90000000)}`
      }
    }));

    await Wallet.insertMany(walletsToCreate);
    console.log(`✅ Seeded ${walletsToCreate.length} User Wallets with Virtual Bank Accounts.`);

    // 7. Create Broadcast Notifications
    await BroadcastNotification.create({
      title: '2026 JAMB UTME Practice Mode Active',
      message: 'Practice with updated 2026 syllabus questions and real CBT exam interface.',
      type: 'info',
      targetAudience: 'all'
    });
    console.log('✅ Seeded System Notifications.');

    console.log('\n🎉 ALL DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  }
};

seedDatabase();
