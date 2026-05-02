import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Stethoscope, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ArrowRight,
  Clock,
  History,
  MessageSquare
} from 'lucide-react';
import { getStructuredHealthData } from '../lib/aiService';
import { formatGeminiError } from '../lib/gemini';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { useLanguage } from '../lib/LanguageContext';

interface TriageResult {
  severity: 'Critical' | 'Urgent' | 'Routine' | 'Self-care';
  summary: string;
  potentialConditions: string[];
  recommendations: string[];
  urgentWarnings: string[];
  followUpQuestions: string[];
}

const triageSchema = {
  type: "object",
  properties: {
    severity: { 
      type: "string", 
      enum: ["Critical", "Urgent", "Routine", "Self-care"],
      description: "The urgency of the situation"
    },
    summary: { 
      type: "string", 
      description: "A concise medical-style summary of the input" 
    },
    potentialConditions: { 
      type: "array", 
      items: { type: "string" },
      description: "Possible issues to discuss with a professional"
    },
    recommendations: { 
      type: "array", 
      items: { type: "string" },
      description: "Specific next steps for the user"
    },
    urgentWarnings: { 
      type: "array", 
      items: { type: "string" },
      description: "Red-flag symptoms that require immediate ER visit"
    },
    followUpQuestions: { 
      type: "array", 
      items: { type: "string" },
      description: "Questions the user should be prepared to answer"
    }
  },
  required: ["severity", "summary", "potentialConditions", "recommendations", "urgentWarnings", "followUpQuestions"]
};

export default function AITriage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const prompt = `Analyze the following symptoms for medical triage. Provide a structured assessment. 
      IMPORTANT: Include a strong medical disclaimer that this is AI-generated and not a diagnosis.
      
      Symptoms: ${symptoms}`;

      const data = await getStructuredHealthData(prompt, triageSchema);
      setResult(data);

      // Save to Firestore
      if (user) {
        try {
          await addDoc(collection(db, 'symptomsAnalyses'), {
            userId: user.uid,
            type: 'triage',
            input: symptoms,
            result: data,
            timestamp: new Date().toISOString(),
          });
        } catch (fsErr) {
          console.error('Failed to save triage record:', fsErr);
        }
      }
    } catch (err: any) {
      console.error('Triage Error:', err);
      setError(`Neural processing failed: ${formatGeminiError(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-sos/10 text-sos border-sos/20';
      case 'Urgent': return 'bg-warning/10 text-warning border-warning/20';
      case 'Routine': return 'bg-primary/10 text-primary border-primary/20';
      case 'Self-care': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted/10 text-muted border-muted/20';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Stethoscope className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-natural-text">{t('ai_triage')}</h1>
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Medical-Grade Symptom Assessment Engine</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white border border-accent rounded-[32px] p-8 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Info size={16} className="text-primary" />
              Symptom Description
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted">
                  How are you feeling?
                </label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g., I have a sharp pain in my lower back that started 2 hours ago..."
                  className="w-full h-48 bg-natural-bg border border-accent rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !symptoms.trim()}
                className="w-full py-4 bg-primary text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Clock size={16} />
                    </motion.div>
                    Processing...
                  </>
                ) : (
                  <>
                    Run Assessment
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="p-6 bg-warning/10 border border-warning/20 rounded-2xl flex gap-4">
            <AlertTriangle className="text-warning shrink-0" size={20} />
            <p className="text-[10px] leading-relaxed text-warning font-black uppercase tracking-wider">
              Emergency: If you are experiencing chest pain, difficulty breathing, or sudden numbness, dial emergency services immediately.
            </p>
          </div>
        </div>

        {/* Results Section */}
        <div className="md:col-span-7">
          <AnimatePresence mode="wait">
            {!result && !loading && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center border-2 border-dashed border-accent rounded-[32px] p-12 text-center"
              >
                <div className="p-6 bg-natural-bg rounded-full mb-6">
                  <Stethoscope size={48} className="text-muted/30" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-muted">Awaiting Input</h3>
                <p className="text-[10px] text-muted/60 mt-2 max-w-[240px] uppercase font-bold tracking-widest leading-relaxed">
                  Provide your symptoms to begin the neural diagnostic sweep
                </p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center bg-white border border-accent rounded-[32px] p-12 text-center shadow-sm"
              >
                <div className="relative w-24 h-24 mb-8">
                  <motion.div 
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 border-4 border-t-primary border-r-primary/20 border-b-primary/10 border-l-primary/5 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Stethoscope size={32} className="text-primary" />
                  </div>
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-primary animate-pulse">Neural Triage in Progress</h3>
                <p className="text-[10px] text-muted font-black uppercase tracking-[0.2em] mt-4">Cross-referencing symptoms with clinical patterns...</p>
              </motion.div>
            )}

            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-sos/5 border border-sos/20 p-8 rounded-[32px] text-center"
              >
                <AlertTriangle size={32} className="text-sos mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-sos">{error}</p>
              </motion.div>
            )}

            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Header Info */}
                <div className={`p-8 border rounded-[32px] shadow-sm ${getSeverityStyles(result.severity)}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Urgency Level</span>
                    <span className="px-4 py-1.5 rounded-full border border-current text-xs font-black uppercase tracking-widest">
                      {result.severity}
                    </span>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tighter leading-tight">{result.summary}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Conditions & Recommendations */}
                  <div className="bg-white border border-accent rounded-[32px] p-6 shadow-sm">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
                       <History size={14} className="text-primary" />
                       Possible Findings
                    </h4>
                    <div className="space-y-2">
                      {result.potentialConditions.map((condition, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-natural-bg rounded-xl">
                          <CheckCircle2 size={12} className="text-primary mt-0.5" />
                          <span className="text-[10px] font-bold text-natural-text uppercase leading-tight">{condition}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-accent rounded-[32px] p-6 shadow-sm">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
                       <Send size={14} className="text-secondary" />
                       Next Actions
                    </h4>
                    <div className="space-y-2">
                      {result.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 border border-accent rounded-xl">
                          <div className="w-5 h-5 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-black">{idx + 1}</span>
                          </div>
                          <span className="text-[10px] font-bold text-natural-text uppercase leading-tight">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Red Flags */}
                {result.urgentWarnings.length > 0 && (
                  <div className="bg-sos text-white p-8 rounded-[32px] shadow-xl shadow-sos/20">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle size={20} />
                      <h4 className="text-xs font-black uppercase tracking-widest tracking-[0.2em]">Urgent Warning Indicators</h4>
                    </div>
                    <ul className="space-y-3">
                      {result.urgentWarnings.map((warning, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-xs font-black uppercase tracking-wider bg-black/10 p-3 rounded-xl border border-white/10">
                          <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Follow ups */}
                <div className="bg-accent/30 border border-accent rounded-[32px] p-8">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-6 flex items-center gap-2">
                    <MessageSquare size={14} className="text-primary" />
                    Clinical Preparation Questions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.followUpQuestions.map((question, idx) => (
                      <div key={idx} className="p-4 bg-white border border-accent rounded-2xl">
                        <p className="text-[10px] font-bold italic text-natural-text leading-relaxed">"{question}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="text-center px-12 italic text-[9px] text-muted font-bold uppercase tracking-widest">
                  Disclaimer: This tool provides AI-generated health information and is NOT a medical diagnosis. Consult a qualified professional for all health decisions.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
