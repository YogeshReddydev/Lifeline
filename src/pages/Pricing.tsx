import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Shield, Zap, Crown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Pricing() {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Standard AI',
      price: '$0',
      period: 'forever',
      desc: 'Essential AI diagnostics for individuals and families.',
      features: [
        'AI Symptom Analysis (Unlimited)',
        'Basic Skin Scan (2/month)',
        'Personal Health Vault',
        'Basic Medication Insights'
      ],
      current: true,
      buttonText: 'Current Plan',
      color: 'bg-natural-bg'
    },
    {
      name: 'Expert Pro',
      price: '$19',
      period: 'month',
      desc: 'Enhanced speed and access to human specialists.',
      features: [
        'Instant Doctor Matching',
        'Unlimited AI Skin Scans',
        'Detailed Lab Report Analysis',
        'Priority Technical Support'
      ],
      current: false,
      badge: 'Highly Requested',
      buttonText: 'Coming Soon',
      color: 'bg-primary/5 border-primary/20'
    },
    {
      name: 'Elite Concierge',
      price: '$49',
      period: 'month',
      desc: 'Full-spectrum medical management and 24/7 care.',
      features: [
        '24/7 Instant Video Consults',
        'Personal Medical Liaison',
        'Family Health Circles',
        'Advanced Predictive Wellness'
      ],
      current: false,
      badge: 'Institutional',
      buttonText: 'Coming Soon',
      color: 'bg-natural-text text-white'
    }
  ];

  return (
    <div className="space-y-12 pb-20">
      <header className="text-center max-w-3xl mx-auto space-y-4">
        <h2 className="text-5xl font-black text-natural-text tracking-tight">Access Levels</h2>
        <p className="text-muted font-medium text-lg leading-relaxed italic">
          Choose the level of medical intelligence and human expertise that fits your health journey.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`relative p-10 rounded-[48px] border flex flex-col h-full ${
              plan.name === 'Elite Concierge' ? 'bg-natural-text border-transparent shadow-2xl' : 'bg-white border-accent'
            } transition-all hover:scale-[1.02]`}
          >
            {plan.badge && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                {plan.badge}
              </span>
            )}

            <div className="mb-8">
              <h3 className={`text-2xl font-black ${plan.name === 'Elite Concierge' ? 'text-white' : 'text-natural-text'}`}>
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mt-4">
                <span className={`text-4xl font-black ${plan.name === 'Elite Concierge' ? 'text-white' : 'text-natural-text'}`}>
                  {plan.price}
                </span>
                <span className={`text-sm font-bold opacity-60 ${plan.name === 'Elite Concierge' ? 'text-white/60' : 'text-muted'}`}>
                  /{plan.period}
                </span>
              </div>
              <p className={`mt-4 text-sm font-medium leading-relaxed ${plan.name === 'Elite Concierge' ? 'text-white/70' : 'text-muted'}`}>
                {plan.desc}
              </p>
            </div>

            <ul className="space-y-5 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-4">
                  <CheckCircle2 
                    size={18} 
                    className={`mt-0.5 shrink-0 ${plan.name === 'Elite Concierge' ? 'text-primary' : 'text-primary'}`} 
                  />
                  <span className={`text-sm font-bold ${plan.name === 'Elite Concierge' ? 'text-white/90' : 'text-natural-text'}`}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              disabled={!plan.current}
              className={`mt-10 px-8 py-5 rounded-3xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 ${
                plan.current
                  ? 'bg-primary text-white shadow-xl shadow-primary/30 hover:scale-105 active:scale-95'
                  : plan.name === 'Elite Concierge'
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'bg-natural-bg text-muted cursor-not-allowed'
              }`}
            >
              {plan.buttonText}
              {plan.current && <ArrowRight size={16} />}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto bg-natural-bg p-8 rounded-[40px] border border-accent flex flex-col md:flex-row items-center gap-8 justify-between">
        <div>
          <h4 className="text-xl font-black text-natural-text italic">Need Enterprise scales?</h4>
          <p className="text-xs font-bold text-muted mt-1 uppercase tracking-widest">For Hospitals & Clinics</p>
        </div>
        <button className="px-8 py-4 bg-white border border-accent rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-natural-bg transition-colors">
          Contact Sales
        </button>
      </div>
    </div>
  );
}
