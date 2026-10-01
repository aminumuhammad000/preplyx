import { motion } from 'framer-motion';
import { Download, ArrowRight } from 'lucide-react';

const CTA = () => {
  return (
    <section id="cta" className="py-12 relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative rounded-[2.5rem] bg-gray-900 overflow-hidden shadow-2xl">
          {/* Neon Glow Effects */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/40 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/30 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="grid lg:grid-cols-2 items-center gap-12 p-12 md:p-20 relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                Start Preparing <br />
                <span className="text-gradient">Smarter Today</span>
              </h2>
              <p className="text-lg text-gray-300 mb-10 max-w-md leading-relaxed">
                Join thousands of Nigerian students using Preplyx to prepare for WAEC, NECO, and JAMB. Turn your goals into reality.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => alert('Download starting...')} className="flex items-center justify-center gap-2 bg-primary hover:bg-secondary text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(123,47,247,0.4)] hover:shadow-[0_0_30px_rgba(123,47,247,0.6)]">
                  <Download className="w-5 h-5" /> Download APK
                </button>
                <a href="https://dash.preplyx.com.ng" className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-xl font-bold text-lg transition-all backdrop-blur-sm inline-flex">
                  Get Started <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative h-[400px] flex items-center justify-center lg:justify-end"
            >
              {/* Floating Phone Illustration */}
              <motion.div 
                animate={{ y: [0, -20, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                className="relative w-64 h-[500px] bg-black rounded-[3rem] border-8 border-gray-800 shadow-2xl overflow-hidden flex flex-col"
              >
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-20" />
                
                {/* Screen Content */}
                <div className="flex-1 bg-background pt-12 p-4 relative">
                  <div className="w-full h-32 bg-primary-gradient rounded-2xl mb-4 p-4 text-white flex flex-col justify-end">
                    <p className="text-xs opacity-80">Next Exam</p>
                    <p className="font-bold">JAMB 2026</p>
                  </div>
                  <div className="space-y-3">
                    <div className="w-full h-16 bg-white rounded-xl shadow-sm flex items-center p-3 gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="w-1/2 h-2 bg-gray-200 rounded-full" />
                        <div className="w-3/4 h-2 bg-gray-200 rounded-full" />
                      </div>
                    </div>
                    <div className="w-full h-16 bg-white rounded-xl shadow-sm flex items-center p-3 gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="w-2/3 h-2 bg-gray-200 rounded-full" />
                        <div className="w-1/2 h-2 bg-gray-200 rounded-full" />
                      </div>
                    </div>
                    <div className="w-full h-16 bg-white rounded-xl shadow-sm flex items-center p-3 gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="w-1/3 h-2 bg-gray-200 rounded-full" />
                        <div className="w-3/4 h-2 bg-gray-200 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
