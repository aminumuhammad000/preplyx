import { Mail } from 'lucide-react';

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.847h-7.406l-5.8-7.584-6.638 7.584H.876l8.6-9.823L0 1.153h7.594l5.243 6.932L18.901 1.153Zm-1.03 19.03h1.136L6.17 3.15H4.95l12.92 17.033Z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M13.5 22v-9h3l.45-3.5H13.5V4.2c0-1.01.28-1.7 1.73-1.7H18V.1C17.37.05 16.21 0 14.95 0c-2.43 0-4.1 1.48-4.1 4.2V9.5H7.5V13h3.35v9h2.65Z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="bg-[#1a053a] text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 sm:mb-10">
          <div className="col-span-1">
            <a href="#" className="inline-flex items-center gap-2 mb-4">
              <img src="/logo.svg" alt="Preplyx" className="h-9 w-auto bg-white rounded-lg p-1" />
            </a>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-4 max-w-sm">
              The smartest way to prepare for WAEC, NECO, and JAMB. Join thousands of successful students today.
            </p>
            <div className="flex gap-3">
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="Follow us on X" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors text-white">
                <XIcon />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Facebook" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors text-white">
                <FacebookIcon />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Instagram" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors text-white">
                <InstagramIcon />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-3 sm:mb-4">Platform</h4>
            <ul className="space-y-2 sm:space-y-2.5">
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm">Features</a></li>
              <li><a href="#exams" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm">Exams & CBT</a></li>
              <li><a href="#practice" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm">Practice Demo</a></li>
              <li><a href="#cta" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm">Download App</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-3 sm:mb-4">Support</h4>
            <ul className="space-y-2 sm:space-y-2.5">
              <li><a href="#faq" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm">FAQ</a></li>
              <li><a href="#faq" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm">Help Center</a></li>
              <li><a href="mailto:support@preplyx.com.ng" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm">Contact Us</a></li>
              <li><a href="#testimonials" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm">Community</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-3 sm:mb-4">Contact</h4>
            <ul className="space-y-2.5 sm:space-y-3">
              <li className="flex items-center gap-2.5 text-gray-400 text-xs sm:text-sm">
                <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <a href="mailto:support@preplyx.com.ng" className="hover:text-white transition-colors break-all">
                  support@preplyx.com.ng
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-gray-400 text-xs sm:text-sm">
                <div className="w-3.5 h-3.5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
                <span>All systems operational</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <p className="text-gray-400 text-xs leading-relaxed">
            © {new Date().getFullYear()} Preplyx — A product of{' '}
            <a 
              href="https://ameetechnology.com.ng" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white hover:text-secondary transition-colors font-medium underline underline-offset-4"
            >
              Amee Technologies Ltd
            </a>. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
            <a href="#about" className="text-gray-400 hover:text-white transition-colors text-xs">Privacy Policy</a>
            <a href="#about" className="text-gray-400 hover:text-white transition-colors text-xs">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
