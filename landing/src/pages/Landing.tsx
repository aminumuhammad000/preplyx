// Landing page component
import {
  Navbar,
  Hero,
  About,
  Features,
  Exams,
  InteractiveDemo,
  Testimonials,
  FAQ,
  Footer
} from '../components/landing';

const Landing = () => {
  return (
    <div className="font-sans text-text-dark bg-background min-h-screen overflow-x-hidden w-full">
      <Navbar />
      <Hero />
      <About />
      <Features />
      <Exams />
      <InteractiveDemo />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  );
};

export default Landing;
