import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative pt-24 sm:pt-32 pb-10 sm:pb-16 overflow-hidden flex items-center bg-background">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 rounded-[100%] blur-[120px] pointer-events-none" />
      <div className="absolute top-40 right-[-5%] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[5%] left-[-5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.2] mb-4 sm:mb-6">
            Master WAEC, NECO & JAMB with <span className="text-gradient font-extrabold">confidence</span>.
          </h1>
          
          <p className="text-sm sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed max-w-2xl mx-auto px-2 sm:px-0">
            Get instant access to thousands of real past questions, detailed step-by-step explanations, and performance analytics.
          </p>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 max-w-xs sm:max-w-none mx-auto">
            <a 
              href="https://dash.preplyx.com.ng" 
              className="group inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl font-semibold text-sm sm:text-base text-white bg-primary hover:bg-secondary transition-all duration-200 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
            >
              <span>Start Practicing</span>
              <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </a>
            <a 
              href="#exams" 
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl font-semibold text-sm sm:text-base text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 shadow-xs hover:shadow-sm active:scale-[0.98]"
            >
              Explore CBT Exams
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Supported Exams:</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {["JAMB", "WAEC", "NECO"].map((exam) => (
                <span key={exam} className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3.5 py-1 rounded-full shadow-xs">
                  {exam}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
