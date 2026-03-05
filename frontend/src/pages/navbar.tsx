"use client";
import { useState, useEffect } from 'react';
import { Sparkles, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className={`
      fixed top-0 left-0 right-0 z-50 
      transition-all duration-500 ease-out
      ${isScrolled 
        ? "bg-white/95 backdrop-blur-2xl border-b border-slate-200/80 shadow-lg" 
        : "bg-gradient-to-b from-white/90 via-white/80 to-transparent"
      }
    `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Navigation Container */}
        <div className="flex items-center justify-between h-16">
          
          {/* Logo/Brand - Left */}
          <div className="flex-shrink-0">
            <Link 
              to="/"
              onClick={scrollToTop}
              className="flex items-center gap-2 group"
            >
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300
                ${isScrolled 
                  ? "bg-gradient-to-br from-cyan-500 to-teal-600" 
                  : "bg-gradient-to-br from-cyan-500 to-teal-600"
                }
              `}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className={`
                text-lg font-bold transition-all duration-300
                ${isScrolled 
                  ? "text-slate-800" 
                  : "text-slate-800"
                }
                group-hover:text-cyan-600
              `}>
                Marketing OS
              </span>
            </Link>
          </div>

          {/* Right Side - Auth Buttons */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <Link to="/login">
              <button className={`
                text-sm font-medium transition-all duration-300 px-4 py-2 rounded-lg
                ${isScrolled 
                  ? "text-slate-600 hover:text-cyan-600 hover:bg-slate-50" 
                  : "text-slate-600 hover:text-cyan-600 hover:bg-slate-50"
                }
              `}>
                Log in
              </button>
            </Link>
            <Link to="/sign-up">
              <button className={`
                relative overflow-hidden group transition-all duration-300
                px-4 py-2 h-auto text-sm font-medium rounded-lg
                bg-gradient-to-r from-cyan-500 to-teal-600 text-white
                hover:shadow-lg hover:shadow-cyan-500/30
              `}>
                <span className="relative z-10">Sign up</span>
                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`
              lg:hidden transition-all duration-300 p-2 rounded-lg
              ${isScrolled 
                ? "text-slate-600 hover:bg-slate-100" 
                : "text-slate-600 hover:bg-slate-100"
              }
            `}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden">
            {/* Mobile Auth Buttons */}
            <div className="flex flex-col gap-2 mt-3 pt-4 border-t border-slate-200 px-4 pb-4">
              <Link to="/login">
                <button className="
                  w-full py-2.5 px-4 rounded-lg transition-all duration-300 text-sm font-medium text-center
                  text-slate-600 hover:text-cyan-600 hover:bg-slate-50
                ">
                  Log in
                </button>
              </Link>
              <Link to="/sign-up">
                <button className="
                  relative overflow-hidden group py-2.5 px-4 rounded-lg font-medium text-sm text-center
                  bg-gradient-to-r from-cyan-500 to-teal-600 text-white
                ">
                  <span className="relative z-10">Sign up</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;