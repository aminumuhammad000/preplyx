import { motion } from 'framer-motion';

const Subjects = () => {
  const subjects = [
    "Mathematics", "English", "Biology", "Chemistry", 
    "Physics", "Economics", "Government", "Literature"
  ];

  return (
    <section id="subjects" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-3">Comprehensive Coverage</h2>
          <h3 className="text-4xl font-extrabold text-text-dark mb-6">All Your Subjects in One Place</h3>
          <p className="text-lg text-gray-600">
            Practice past questions across all major subjects required for WAEC, NECO, and JAMB.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 md:gap-6 max-w-4xl mx-auto">
          {subjects.map((subject, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ y: -3 }}
              className="cursor-pointer"
            >
              <div className="bg-white px-8 py-4 rounded-full border border-gray-200 hover:border-primary transition-all duration-300 flex items-center justify-center">
                <span className="font-bold text-text-dark hover:text-primary transition-colors">
                  {subject}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Subjects;
