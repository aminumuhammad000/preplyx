import { motion } from 'framer-motion';
import { BookCopy, Laptop, LineChart, WifiOff, Timer, Lightbulb } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: <BookCopy className="w-6 h-6" />,
      title: "Practice with Exam-Style Questions",
      description: "Master questions covering major JAMB, WAEC, and NECO subjects, structured according to official syllabus standards."
    },
    {
      icon: <Laptop className="w-6 h-6" />,
      title: "Practice Like the Real Exam",
      description: "Experience the authentic interface, countdown timer, and 4-subject UTME simulation so you feel at home in the CBT hall."
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: "Understand Your Mistakes",
      description: "Go beyond answer keys. See why incorrect choices are tempting and review underlying formulas and concepts step-by-step."
    },
    {
      icon: <LineChart className="w-6 h-6" />,
      title: "Know Where You Are Improving",
      description: "Track your accuracy trends, time spent per question, and subject readiness scores so you always know where you stand."
    },
    {
      icon: <WifiOff className="w-6 h-6" />,
      title: "Prepare Even When Offline",
      description: "Save question sets directly to your device. Keep solving questions and reviewing solutions without burning mobile data."
    },
    {
      icon: <Timer className="w-6 h-6" />,
      title: "Identify Weak Subjects Early",
      description: "Calibrate your starting baseline through diagnostic assessment and turn low-scoring topics into confident strengths."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section id="features" className="py-10 sm:py-16 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 sm:mb-3">The Preparation System</h2>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-dark mb-3 sm:mb-4">Everything You Need to Prepare Properly</h3>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Features designed to help Nigerian candidates understand concepts, build speed, and improve before exam day.
            </p>
          </motion.div>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              variants={itemVariants}
              className="glass-card bg-white/80 border border-gray-200/80 p-5 sm:p-6 rounded-2xl glass-card-hover group relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white shadow-xs flex items-center justify-center text-primary mb-4 sm:mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 flex-shrink-0">
                {feature.icon}
              </div>
              
              <h4 className="text-base sm:text-lg lg:text-xl font-bold text-text-dark mb-2">{feature.title}</h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
