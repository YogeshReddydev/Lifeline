import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Activity, Microscope, UserPlus, Zap, CheckCircle, Heart, Globe } from 'lucide-react';
import { motion } from 'motion/react';

import Logo from '../components/Logo';
import { useLanguage } from '../lib/LanguageContext';

export default function Landing() {
  const { t, setLanguage, language } = useLanguage();

  const features = [
    { icon: <Activity className="text-primary" />, title: 'AI Triage', desc: 'Secure symptom checking with intelligent questioning.' },
    { icon: <Microscope className="text-secondary" />, title: 'Medicine Analyzer', desc: 'Validates medication usage and potential risks using AI.' },
    { icon: <Zap className="text-secondary" />, title: 'Skin Scanner', desc: 'Dermatology analysis via photo upload or symptoms.' },
    { icon: <Shield className="text-primary" />, title: 'Guardian System', desc: 'Real-time monitoring for your loved ones.' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-24">
      {/* Top Nav */}
      <nav className="flex items-center justify-between py-10">
        <Logo />
        <div className="flex items-center gap-8">
          <div className="flex items-center bg-natural-bg border border-accent rounded-full p-1 shadow-sm">
            <button 
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-primary text-white shadow-lg' : 'text-muted'}`}
            >EN</button>
            <button 
              onClick={() => setLanguage('hi')}
              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${language === 'hi' ? 'bg-primary text-white shadow-lg' : 'text-muted'}`}
            >हि</button>
            <button 
              onClick={() => setLanguage('te')}
              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${language === 'te' ? 'bg-primary text-white shadow-lg' : 'text-muted'}`}
            >తె</button>
          </div>
          <Link to="/login" className="text-xs font-black uppercase tracking-widest text-muted hover:text-primary transition-colors">{t('login_portal')}</Link>
          <Link to="/signup" className="px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">{t('get_started')}</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col lg:flex-row items-center gap-16 py-20">
        <div className="flex-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1 bg-accent text-primary rounded-full font-bold text-xs uppercase tracking-widest border border-primary/10"
          >
            {t('hero_title')}
          </motion.div>
          <h1 className="text-5xl md:text-6xl font-black text-natural-text leading-tight tracking-tight">
            Your Personal <span className="text-primary">AI Health</span> Guardian.
          </h1>
          <p className="text-lg text-muted max-w-2xl font-medium">
            {t('hero_subtitle')}
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link to="/signup" className="px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-xl shadow-primary/20">
              {t('get_started')}
            </Link>
            <Link to="/login" className="px-8 py-4 bg-white border border-accent text-natural-text rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-natural-bg transition-all">
              {t('login_portal')}
            </Link>
          </div>
          <div className="flex items-center gap-6 pt-4 text-[10px] font-black uppercase tracking-widest text-muted">
            <span className="flex items-center gap-1"><CheckCircle size={16} className="text-primary" /> HIPAA Compliant</span>
            <span className="flex items-center gap-1"><CheckCircle size={16} className="text-primary" /> AI-Driven</span>
          </div>
        </div>
        <div className="flex-1 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="rounded-[40px] overflow-hidden shadow-2xl shadow-accent border-8 border-white"
          >
            <img 
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800" 
              alt="Individual monitoring health data" 
              className="w-full"
            />
          </motion.div>
          <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl border border-accent flex items-center gap-4">
            <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-primary shadow-sm">
              <Zap />
            </div>
            <div>
              <p className="font-black text-natural-text uppercase tracking-widest text-[10px]">Live Triage</p>
              <p className="text-[10px] text-muted font-bold italic">Processing analysis...</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white border-y border-accent relative">
        <div className="absolute inset-0 bg-white" />
        <div className="container mx-auto relative z-10">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-black text-natural-text">Intelligent Health Modules</h2>
            <p className="text-muted font-medium max-w-2xl mx-auto italic">Modular healthcare built for proactive individuals and personal wellness management.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="p-10 rounded-[32px] bg-natural-bg border border-accent hover:bg-white hover:shadow-2xl transition-all group"
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-8 group-hover:bg-accent transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-xl font-black mb-4 text-natural-text">{f.title}</h3>
                <p className="text-muted text-sm leading-relaxed font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-10">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-10 bg-primary rounded-[40px] text-white space-y-6 shadow-xl shadow-primary/20">
            <h3 className="text-2xl font-black uppercase tracking-widest">Self-Assessment</h3>
            <p className="font-medium opacity-90">Take control of your health with AI-powered symptom analysis and personalized wellness protocols.</p>
            <Link to="/signup" className="inline-block bg-white text-primary px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform">Get Started</Link>
          </div>
          <div className="p-10 bg-natural-text rounded-[40px] text-white space-y-6">
            <h3 className="text-2xl font-black uppercase tracking-widest">Visual Analysis</h3>
            <p className="font-medium opacity-90">Detect skin conditions and visible symptoms instantly with our neural vision scanner system.</p>
            <Link to="/signup" className="inline-block bg-white text-natural-text px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform">Start Scanning</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-accent flex flex-col md:flex-row justify-between items-center gap-10 text-muted text-[10px] font-black uppercase tracking-[0.2em]">
        <Logo iconSize={28} />
        <div>© 2026 Lifeline AI. All rights reserved.</div>
        <div className="flex gap-10">
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms</a>
        </div>
      </footer>
    </div>
  );
}

