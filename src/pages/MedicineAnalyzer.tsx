import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStructuredHealthData, AIProvider } from '../lib/aiService';
import { Pill, Info, ArrowLeft, Search, Loader2, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../lib/LanguageContext';

export default function MedicineAnalyzer() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<AIProvider>(AIProvider.GEMINI);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const gSchema = {
        type: "object",
        properties: {
          medicineName: { type: "string" },
          usage: { type: "string" },
          dosageRecommendation: { type: "string" },
          risks: { type: "array", items: { type: "string" } },
          warnings: { type: "array", items: { type: "string" } },
          precautions: { type: "array", items: { type: "string" } }
        },
        required: ["medicineName", "usage", "risks", "warnings", "precautions"]
      };

      const data = await getStructuredHealthData(
        `System Instruction: You are a pharmaceutical analyzer. Provide accurate info on usage, risks, warnings, and precautions. Output JSON strictly.
        
        Analyze the medicine: ${query}. Output JSON structure.`,
        gSchema,
        provider
      );

      setResult(data);

      if (user) {
        await addDoc(collection(db, 'medicineAnalyses'), {
          userId: user.uid,
          medicineName: data.medicineName,
          analysis: data,
          timestamp: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to analyze medicine. Please check the name and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Link to="/dashboard" className="p-2 hover:bg-natural-bg rounded-full transition-colors text-muted">
          <ArrowLeft />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Pill size={20} />
          </div>
          <h1 className="text-2xl font-black text-natural-text uppercase tracking-tighter">{t('med_analyzer')}</h1>
          <div className="flex items-center bg-natural-bg border border-accent rounded-full p-1 ml-4 h-8">
            <button 
              onClick={() => setProvider(AIProvider.GEMINI)}
              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${provider === AIProvider.GEMINI ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted'}`}
            >Gemini</button>
            <button 
              onClick={() => setProvider(AIProvider.DEEPSEEK)}
              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${provider === AIProvider.DEEPSEEK ? 'bg-[#4338ca] text-white shadow-lg shadow-indigo-500/20' : 'text-muted'}`}
            >DeepSeek-R1</button>
          </div>
        </div>
      </header>

      <section className="bg-white p-10 rounded-[40px] border border-accent shadow-sm space-y-8">
        <div className="space-y-2">
          <h2 className="text-xl font-black text-natural-text uppercase tracking-widest text-[10px] text-muted">{t('image_scanner')}</h2>
          <p className="text-muted font-medium text-sm italic">{t('med_analyzer_desc')}</p>
        </div>

        <form onSubmit={handleAnalyze} className="relative">
          <input
            type="text"
            required
            placeholder={t('medicine_placeholder')}
            className="w-full pl-14 pr-4 py-5 bg-natural-bg border border-accent rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted" />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-8 py-3 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : t('analyze')}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-sos/10 text-sos rounded-2xl flex items-center gap-3 border border-sos/20 text-[10px] font-black uppercase tracking-widest">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </section>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-3 gap-8"
          >
            <div className="md:col-span-2 space-y-8">
              <div className="bg-white p-10 rounded-[40px] border border-accent shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black text-primary tracking-tight">{result.medicineName}</h2>
                  <div className="bg-accent text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/10 flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> AI Validated
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-black text-natural-text uppercase tracking-widest text-[10px] text-muted">Usage & Application</h3>
                  <p className="text-natural-text text-sm leading-relaxed font-medium">{result.usage}</p>
                </div>

                {result.dosageRecommendation && (
                  <div className="p-6 bg-accent/30 text-primary rounded-3xl border border-primary/10">
                    <h3 className="font-black text-[10px] mb-2 uppercase tracking-[0.2em]">Suggested Dosage</h3>
                    <p className="text-sm font-bold">{result.dosageRecommendation}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-8 pt-4 border-t border-accent">
                  <div className="space-y-4">
                    <h3 className="font-black text-natural-text uppercase tracking-widest text-[10px] text-muted">Precautions</h3>
                    <ul className="space-y-3">
                      {result.precautions.map((p: string, i: number) => (
                        <li key={i} className="text-[11px] text-muted flex items-start gap-3 font-medium italic">
                          <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-black text-sos uppercase tracking-widest text-[10px]">Common Risks</h3>
                    <ul className="space-y-3">
                      {result.risks.map((r: string, i: number) => (
                        <li key={i} className="text-[11px] text-muted flex items-start gap-3 font-medium italic">
                          <AlertCircle size={14} className="text-sos mt-0.5 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-sos/5 p-10 rounded-[40px] border border-sos/10 shadow-sm space-y-6">
                <div className="flex items-center gap-3 text-sos font-black uppercase tracking-[0.2em] text-xs">
                  <ShieldAlert />
                  <h3>Critical Warnings</h3>
                </div>
                <ul className="space-y-4">
                  {result.warnings.map((w: string, i: number) => (
                    <li key={i} className="p-4 bg-white rounded-2xl text-[11px] text-sos font-black border border-sos/10 shadow-sm">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-natural-text p-10 rounded-[40px] text-white space-y-6 shadow-xl shadow-natural-text/10">
                <h3 className="font-black flex items-center gap-3 uppercase tracking-widest text-[10px]">
                  <Info size={18} className="text-secondary" />
                  Health Disclaimer
                </h3>
                <p className="text-[10px] opacity-70 leading-relaxed italic font-medium">
                  Lifeline AI analysis is provided for informational purposes only. Do not change dosages or start new medications without consulting a licensed physician. Always read the physical product label.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
