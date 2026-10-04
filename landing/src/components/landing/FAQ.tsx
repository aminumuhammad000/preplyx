import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "What makes Preplyx different from other past-question apps?",
      answer: "Most apps simply show you questions and an answer key. Preplyx is a preparation system: it helps you diagnose what to study, gives you realistic timed CBT practice, explains why you picked the wrong options, and tracks your readiness score before exam day."
    },
    {
      question: "How does offline practice work?",
      answer: "You can download question sets for your subjects directly to your device via the Offline Download Manager. Once saved, you can practice questions and study solution breakdowns smoothly even when you have no active internet connection."
    },
    {
      question: "Who is Preplyx built for?",
      answer: "Preplyx is designed for secondary-school students and candidates preparing for JAMB UTME, WAEC SSCE, and NECO SSCE. It was built with the everyday realities of Northern Nigerian students in mind—prioritizing low-data usage, offline practice, clear conceptual explanations, and structured study guidance."
    },
    {
      question: "Is CBT exam simulation available?",
      answer: "Yes. Preplyx provides both single-subject drills and authentic 4-subject JAMB UTME simulations with official time limits, question navigators, and authoritative scoring out of 400."
    },
    {
      question: "What devices can I use to study with Preplyx?",
      answer: "Preplyx works smoothly on any smartphone, tablet, or laptop through your web browser. You can also install it directly to your home screen as a fast, lightweight app without taking up large phone storage."
    },
    {
      question: "Is Preplyx free to start?",
      answer: "Yes! You can create an account and begin practicing immediately. We offer free diagnostic assessments and practice sessions, with affordable student-friendly token options funded directly via Nigerian bank transfer."
    }
  ];

  return (
    <section id="faq" className="py-10 sm:py-16 bg-background relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 sm:mb-3">FAQ</h2>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-dark mb-3 sm:mb-4">Got Questions?</h3>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Find answers to common questions about Preplyx.
            </p>
          </motion.div>
        </div>

        <div className="space-y-3 sm:space-y-3.5">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden transition-colors duration-200 hover:border-gray-300 shadow-2xs"
            >
              <button
                className="w-full px-4 sm:px-6 py-3.5 sm:py-4.5 text-left flex justify-between items-center focus:outline-none"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-semibold text-sm sm:text-base md:text-lg text-gray-900 pr-2 leading-snug">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-primary transition-transform duration-300 shrink-0 ml-2 ${openIndex === index ? 'rotate-180' : ''}`} 
                />
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <div className="px-4 sm:px-6 pb-4 sm:pb-5 text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed border-t border-gray-100 pt-3 sm:pt-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
