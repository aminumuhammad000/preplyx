import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: "Preplyx helped me realize why I kept picking the wrong options in Chemistry and Physics. Once I understood the distractor traps during practice, my confidence soared.",
    author: "Amina B.",
    location: "Kano",
    rating: 5
  },
  {
    quote: "Network is often unstable where I live. Being able to download question sets and practice offline without worrying about mobile data made a massive difference.",
    author: "Ibrahim M.",
    location: "Kaduna",
    rating: 5
  },
  {
    quote: "Knowing what to focus on each day instead of randomly reading textbooks gave me structure. I entered the CBT hall calm and finished my questions well on time.",
    author: "Fatima S.",
    location: "Sokoto",
    rating: 5
  }
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-10 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <span className="text-xs font-bold text-primary uppercase tracking-widest block mb-2 sm:mb-3">
            Student Experiences
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mb-3 sm:mb-4">
            Real Students Preparing Smarter
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
            How candidates are replacing last-minute cramming with focused preparation and deeper understanding.
          </p>
        </div>

        {/* Minimalist 3-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {TESTIMONIALS.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ y: -3 }}
              className="bg-white border border-gray-200/80 rounded-2xl p-5 sm:p-6 lg:p-7 flex flex-col justify-between hover:border-gray-300 transition-colors duration-200 shadow-xs"
            >
              <div>
                {/* 5-Star Rating */}
                <div className="flex gap-1 mb-4 sm:mb-5">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-xs sm:text-sm md:text-base text-gray-700 leading-relaxed mb-5 sm:mb-6">
                  "{item.quote}"
                </p>
              </div>

              {/* Author Footer */}
              <div className="pt-3.5 sm:pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900">{item.author}</h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 font-medium">{item.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Testimonials;
