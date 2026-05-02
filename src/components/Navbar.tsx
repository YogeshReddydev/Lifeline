import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Heart, User, LogOut, Menu, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import Logo from './Logo';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-accent sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/">
          <Logo iconSize={28} />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          {user ? (
            <>
              <Link to="/dashboard" className="text-muted hover:text-primary transition-colors font-black uppercase tracking-widest text-[10px]">Dashboard</Link>
              <Link to="/prediction" className="text-muted hover:text-primary transition-colors font-black uppercase tracking-widest text-[10px]">Prediction Engine</Link>
              <Link to="/triage" className="text-muted hover:text-primary transition-colors font-black uppercase tracking-widest text-[10px]">AI Triage</Link>
              <Link to="/sos" className="flex items-center gap-1 px-4 py-1.5 bg-sos/10 text-sos rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-sos/20 transition-colors border border-sos/10">
                <ShieldAlert size={14} />
                <span>SOS</span>
              </Link>
              <div className="flex items-center gap-4 border-l border-accent pl-6 ml-2">
                <div className="text-right">
                  <p className="text-[10px] font-black text-natural-text uppercase tracking-widest leading-none mb-1">{profile?.name}</p>
                  <p className="text-[9px] text-muted font-bold capitalize tracking-wider leading-none italic">{profile?.role}</p>
                </div>
                <button onClick={handleSignOut} className="p-2 text-muted hover:text-primary transition-colors">
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-muted hover:text-primary transition-colors font-black uppercase tracking-widest text-[10px]">Login</Link>
              <Link to="/signup" className="px-6 py-2 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-md shadow-primary/20">Sign Up</Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-white border-b border-accent px-4 py-4 absolute w-full shadow-lg"
          >
            <div className="flex flex-col gap-4">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)} className="font-medium text-muted hover:text-primary">Dashboard</Link>
                  <Link to="/triage" onClick={() => setIsOpen(false)} className="font-medium text-muted hover:text-primary">AI Triage</Link>
                  <Link to="/sos" onClick={() => setIsOpen(false)} className="text-sos font-bold">SOS Emergency</Link>
                  <button onClick={handleSignOut} className="text-left font-medium text-muted py-2 border-t border-accent mt-2">Sign Out</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsOpen(false)} className="font-medium text-muted hover:text-primary">Login</Link>
                  <Link to="/signup" onClick={() => setIsOpen(false)} className="bg-primary text-white p-3 rounded-xl text-center font-bold">Sign Up</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
