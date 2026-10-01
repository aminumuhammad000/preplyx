import { motion } from 'framer-motion';
import { BookOpen, Award, CheckCircle2, ArrowRight, Monitor, GraduationCap, Flame } from 'lucide-react';

const EXAM_CARDS = [
  {
    id: "jamb",
    title: "JAMB UTME CBT Simulator",
    badge: "Most Popular",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
    icon: Monitor,
    iconColor: "text-primary bg-primary/10",
    description: "Full real-time JAMB exam environment with official timer, 4-subject combinations, automatic score calculation out of 400, and instant score slip.",
    highlights: [
      "Real CBT Interface & Keyboard Shortcuts",
      "Full 4-Subject UTME Mock Tests",
      "Instant Score Prediction & Percentile Rank",
      "Step-by-Step Solution Explanations"
    ],
    stats: "300+ Target Score",
    color: "from-primary/5 to-secondary/5",
    border: "border-primary/20 hover:border-primary/40"
  },
  {
    id: "waec",
    title: "WAEC SSCE Prep Vault",
    badge: "Curriculum Aligned",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: GraduationCap,
    iconColor: "text-emerald-600 bg-emerald-50",
    description: "Master Senior Secondary Certificate Examinations with comprehensive objective practice, theory breakdowns, and detailed diagram explanations.",
    highlights: [
      "Year-by-Year Past Questions (2000 - 2025)",
      "Detailed Diagrams & Step-by-Step Math Solutions",
      "Topic-by-Topic Mastery Tracking",
      "WAEC Grading Scheme Alignment"
    ],
    stats: "Aim for A1 Grades",
    color: "from-emerald-500/5 to-teal-500/5",
    border: "border-emerald-200 hover:border-emerald-400"
  },
  {
    id: "neco",
    title: "NECO SSCE Excellence Pack",
    badge: "Speed & Accuracy",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Flame,
    iconColor: "text-amber-600 bg-amber-50",
    description: "Sharpen your speed and accuracy with timed mock drills designed specifically for National Examinations Council (NECO) standards.",
    highlights: [
      "Speed Drills & Time-Management Analytics",
      "Weakness Identification & Focus Mode",
      "All Major Science, Arts & Commercial Subjects",
      "Unlimited Practice Attempts"
    ],
    stats: "100% Exam Readiness",
    color: "from-amber-500/5 to-orange-500/5",
    border: "border-amber-200 hover:border-amber-400"
  }
];

const SUBJECT_TAGS = [
  "Mathematics", "English Language", "Physics", "Chemistry", 
  "Biology", "Economics", "Government", "Literature-in-English",
  "Commerce", "Financial Accounting", "CRK/IRS", "Agricultural Science"
];

const Exams = () => {
  return (
    <section id="exams" className="py-10 sm:py-16 bg-white relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider mb-3 sm:mb-4">
            <Award className="w-3.5 h-3.5" />
            CBT Exam Suite
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mb-3 sm:mb-4">
            Built for Nigeria's Top National Exams
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Simulate real exam conditions with authentic past questions, time limits, and intelligent performance insights.
          </p>
        </div>

        {/* Exam Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-8 sm:mb-12">
          {EXAM_CARDS.map((exam, idx) => {
            const Icon = exam.icon;
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -4 }}
                className={`bg-gradient-to-b ${exam.color} bg-white border ${exam.border} rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative group`}
              >
                <div>
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between gap-2 mb-4 sm:mb-5">
                    <div className={`p-2.5 sm:p-3 rounded-xl ${exam.iconColor} flex-shrink-0`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className={`text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full border ${exam.badgeColor} flex-shrink-0`}>
                      {exam.badge}
                    </span>
                  </div>

                  {/* Card Title */}
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-primary transition-colors">
                    {exam.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-gray-600 mb-5 sm:mb-6 leading-relaxed">
                    {exam.description}
                  </p>

                  {/* Highlights List */}
                  <div className="space-y-2.5 mb-6 pt-2 border-t border-gray-100/80">
                    {exam.highlights.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Footer Action */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                  <span className="text-[11px] sm:text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                    {exam.stats}
                  </span>
                  <a 
                    href="https://dash.preplyx.com.ng"
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-primary group-hover:text-secondary transition-colors"
                  >
                    <span>Practice Now</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Comprehensive Subject Coverage Strip */}
        <div className="bg-gray-50/90 border border-gray-200/80 rounded-2xl p-4 sm:p-6 text-center max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 mb-3.5 sm:mb-4 px-2">
            <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
            <h4 className="text-xs sm:text-xs font-bold uppercase tracking-wider text-gray-600 text-center leading-normal">
              Full Coverage Across All Major Subjects
            </h4>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
            {SUBJECT_TAGS.map((subject, i) => (
              <span 
                key={i} 
                className="text-xs font-medium text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-xs hover:border-primary hover:text-primary transition-colors cursor-default"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default Exams;
