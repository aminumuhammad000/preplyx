import { motion } from 'framer-motion';
import { ShieldCheck, Zap, BookOpen, Layers } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: "1. Know What to Study",
    description: "Pinpoint weak subjects and start each day with a clear, targeted study mission instead of flipping through bulky textbooks aimlessly."
  },
  {
    icon: ShieldCheck,
    title: "2. Practice Effectively",
    description: "Build speed and real exam composure with timed CBT practice matching authentic examination interfaces and subject combinations."
  },
  {
    icon: BookOpen,
    title: "3. Understand Mistakes",
    description: "Don't just see the right letter. Discover why wrong choices are tempting, examine step-by-step logic, and fix tricky traps."
  },
  {
    icon: Layers,
    title: "4. Prepare Anywhere Offline",
    description: "Download question packs when you have network and continue practicing smoothly even when mobile data is exhausted or unavailable."
  }
];

const About = () => {
  return (
    <section id="about" className="py-10 sm:py-16 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <span className="text-xs font-bold text-primary uppercase tracking-widest block mb-2 sm:mb-3">
            The Preplyx Approach
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mb-3 sm:mb-4 leading-tight">
            Prepare Smarter, Not Just Answer More Questions
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Built with the realities of Northern Nigerian students in mind, Preplyx provides a structured exam-preparation system designed to turn past questions into real understanding and higher scores.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {FEATURES.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="bg-white border border-gray-200/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-gray-300 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default About;
