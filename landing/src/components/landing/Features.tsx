import { motion } from 'framer-motion';
import { BookCopy, Laptop, LineChart, WifiOff, Timer, Lightbulb } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: <BookCopy className="w-6 h-6" />,
      title: "Real Past Questions",
      description: "Access thousands of verified, up-to-date past questions for WAEC, NECO, and JAMB."
    },
    {
      icon: <Laptop className="w-6 h-6" />,
      title: "CBT Practice Mode",
      description: "Experience the exact look and feel of the JAMB CBT environment before the real exam."
    },
    {
      icon: <LineChart className="w-6 h-6" />,
      title: "Performance Tracking",
      description: "Detailed analytics on your strengths and weaknesses to help you focus your study time."
    },
    {
      icon: <WifiOff className="w-6 h-6" />,
      title: "Offline Reading",
      description: "Download questions and practice offline. No data connection required to study."
    },
    {
      icon: <Timer className="w-6 h-6" />,
      title: "Exam Simulation",
      description: "Strictly timed mock exams to improve your speed and time management skills."
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: "Instant Explanations",
      description: "Step-by-step solutions and explanations for every question you attempt."
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
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 sm:mb-3">Why Choose Preplyx</h2>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-dark mb-3 sm:mb-4">Everything you need to succeed</h3>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Powerful features designed specifically to help Nigerian students pass their exams in one sitting.
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
