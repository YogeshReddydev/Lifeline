import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  MessageSquare, 
  Sparkles, 
  ShieldCheck, 
  Loader2,
  Pill,
  AlertCircle,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getHealthInsights, getStructuredHealthData, AIProvider } from '../lib/aiService';
import { useLanguage } from '../lib/LanguageContext';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export default function Assistant() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: "Hello! I'm your Lifeline Health Assistant. I can help you understand symptoms, suggest potential conditions (with medical caution), and give you guidance on health protocols. What's on your mind today?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Interaction Checker State
  const [currentMeds, setCurrentMeds] = useState('');
  const [proposedMed, setProposedMed] = useState('');
  const [interactionResult, setInteractionResult] = useState<any>(null);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [showChecker, setShowChecker] = useState(false);
  const [provider, setProvider] = useState<AIProvider>(AIProvider.GEMINI);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const textToSend = input.trim();
    if (!textToSend || loading) return;

    const userMessage = { role: 'user', content: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const aiText = await getHealthInsights(
        `System: You are LifeLine's expert medical assistant. Provide helpful, accurate, and concise health guidance. 
        Language for response: ${language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}.
        Respond naturally in the specified language. Always mention this is not a clinical diagnosis.
        User Question: ${textToSend}`,
        provider
      );

      const aiMessage = { role: 'assistant', content: aiText, timestamp: new Date() };
      setMessages(prev => [...prev, aiMessage]);

      // Log to Firestore
      if (auth.currentUser) {
        try {
          await addDoc(collection(db, 'symptomsAnalyses'), {
            userId: auth.currentUser.uid,
            query: textToSend,
            analysis: aiText,
            timestamp: serverTimestamp(),
            type: 'chat'
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'symptomsAnalyses');
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Error communicating with AI. Please check your connection.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInteractions = async () => {
    if (!currentMeds.trim() || !proposedMed.trim() || checkingInteractions) return;

    setCheckingInteractions(true);
    setInteractionResult(null);

    try {
      const prompt = `System Instruction: You are a clinical pharmacology assistant. Your task is to check for potential drug-drug interactions and contraindications.
      Current Medications: ${currentMeds}
      Proposed Medication: ${proposedMed}

      Please provide a detailed analysis in JSON format with the following structure:
      {
        "status": "Safe" | "Caution" | "Warning" | "Dangerous",
        "explanation": "Brief explanation of the clinical interaction",
        "contraindications": ["list of reasons why not to take them together"],
        "recommendations": ["clinical advice, e.g., 'Consult doctor', 'Space out by 4 hours'"]
      }`;

      const gSchema = {
        type: "object",
        properties: {
          status: { type: "string" },
          explanation: { type: "string" },
          contraindications: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } }
        },
        required: ["status", "explanation", "contraindications", "recommendations"]
      };

      const data = await getStructuredHealthData(prompt, gSchema, provider);
      setInteractionResult(data);

      // Log to Firestore
      if (auth.currentUser) {
        try {
          await addDoc(collection(db, 'symptomsAnalyses'), {
            userId: auth.currentUser.uid,
            query: `Interaction Check: ${currentMeds} vs ${proposedMed}`,
            analysis: data,
            timestamp: serverTimestamp(),
            type: 'interaction'
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'symptomsAnalyses');
        }
      }
    } catch (err) {
      console.error(err);
      setInteractionResult({
        status: 'Warning',
        explanation: 'Could not complete analysis. Please consult a human pharmacist.',
        recommendations: ['Generic safety protocol: Check official labels.']
      });
    } finally {
      setCheckingInteractions(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-natural-text">{t('health_support')}</h2>
          <p className="text-muted font-medium mt-1 italic">{t('ai_helper_desc')}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white border border-accent rounded-full p-1 h-10 shadow-sm">
            <button 
              onClick={() => setProvider(AIProvider.GEMINI)}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${provider === AIProvider.GEMINI ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted'}`}
            >Gemini</button>
            <button 
              onClick={() => setProvider(AIProvider.DEEPSEEK)}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${provider === AIProvider.DEEPSEEK ? 'bg-[#4338ca] text-white shadow-lg shadow-indigo-500/20' : 'text-muted'}`}
            >DeepSeek-R1</button>
          </div>
          <button 
            onClick={() => setShowChecker(!showChecker)}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              showChecker ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-white border border-accent text-muted hover:border-primary/50 shadow-sm'
            }`}
          >
            <Pill size={16} />
            {showChecker ? t('close') : t('medication_checker')}
            {showChecker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showChecker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-[40px] border border-accent p-10 shadow-xl space-y-8 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <Pill size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-natural-text">Safety Protocol: Interaction Analysis</h3>
                  <p className="text-xs text-muted font-medium">Verify safety between current prescription and proposed medication.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted px-2">Current Medications</label>
                  <textarea 
                    value={currentMeds}
                    onChange={e => setCurrentMeds(e.target.value)}
                    placeholder="e.g., Metformin 500mg, Lisinopril 10mg..."
                    className="w-full bg-natural-bg border border-accent rounded-2xl p-6 text-sm italic min-h-[120px] focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted px-2">Proposed Medication</label>
                  <textarea 
                    value={proposedMed}
                    onChange={e => setProposedMed(e.target.value)}
                    placeholder="e.g., Ibuprofen 400mg, Advil..."
                    className="w-full bg-natural-bg border border-accent rounded-2xl p-6 text-sm italic min-h-[120px] focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={handleCheckInteractions}
                  disabled={checkingInteractions || !currentMeds.trim() || !proposedMed.trim()}
                  className="px-10 py-5 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-lg shadow-primary/20 disabled:opacity-30 disabled:hover:scale-100 flex items-center gap-3"
                >
                  {checkingInteractions ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Analyzing Biochemistry...
                    </>
                  ) : (
                    <>
                      <ClipboardCheck size={16} />
                      Check Interactions
                    </>
                  )}
                </button>
              </div>

              {/* Interaction Result */}
              {interactionResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-[32px] border p-8 space-y-6 ${
                    interactionResult.status === 'Safe' ? 'bg-success/5 border-success/20' :
                    interactionResult.status === 'Caution' ? 'bg-amber-50 border-amber-200' :
                    'bg-sos/5 border-sos/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className={
                        interactionResult.status === 'Safe' ? 'text-success' :
                        interactionResult.status === 'Caution' ? 'text-amber-500' : 'text-sos'
                      } size={24} />
                      <h4 className={`text-sm font-black uppercase tracking-widest ${
                        interactionResult.status === 'Safe' ? 'text-success' :
                        interactionResult.status === 'Caution' ? 'text-amber-700' : 'text-sos'
                      }`}>Status: {interactionResult.status}</h4>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-medium leading-relaxed text-natural-text italic">
                      {interactionResult.explanation}
                    </p>

                    {interactionResult.contraindications?.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Potential Risks</span>
                        <div className="flex flex-wrap gap-2">
                          {interactionResult.contraindications.map((c: string, i: number) => (
                            <span key={i} className="px-3 py-1.5 bg-white border border-accent rounded-lg text-[10px] font-semibold">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {interactionResult.recommendations?.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Clinical Recommendations</span>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {interactionResult.recommendations.map((r: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-[10px] font-bold text-natural-text">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-accent/20">
                    <p className="text-[9px] text-muted font-medium italic">
                      Disclaimer: This is an AI-generated analysis. Always verify pharmacological data with a licensed medical professional before altering any medication routine.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col bg-white rounded-[40px] border border-accent overflow-hidden shadow-xl h-[600px]">
         <div className="bg-natural-bg px-8 py-6 border-b border-accent flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <Sparkles size={20} />
               </div>
               <div>
                  <h3 className="text-sm font-black text-natural-text uppercase tracking-widest leading-none">LifeLine Assistant</h3>
                  <span className="text-[9px] font-black text-success uppercase tracking-widest">Active Link</span>
               </div>
            </div>
            <ShieldCheck size={20} className="text-muted opacity-30" />
         </div>

         <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8">
            <AnimatePresence>
              {messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-6 rounded-[28px] ${
                    m.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' 
                      : 'bg-natural-bg border border-accent text-natural-text rounded-tl-none'
                  }`}>
                    <p className="text-xs font-medium leading-relaxed italic">
                      {m.content}
                    </p>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                   <div className="p-4 bg-natural-bg border border-accent rounded-full flex gap-3 items-center">
                      <Loader2 size={14} className="animate-spin text-primary" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted">{t('thinking')}</span>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
         </div>

         <div className="p-10 bg-white border-t border-accent">
            <div className="relative flex-1 group">
               <input 
                 disabled={loading}
                 type="text" 
                 value={input}
                 onChange={e => setInput(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleSend()}
                 placeholder={t('type_message')} 
                 className="w-full bg-natural-bg border border-accent rounded-3xl py-6 px-10 italic text-sm focus:outline-none focus:border-primary/50 transition-all shadow-inner"
               />
               <button 
                 onClick={handleSend}
                 disabled={loading || !input.trim()}
                 className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-primary text-white rounded-2xl hover:scale-105 transition-all shadow-xl shadow-primary/20 disabled:opacity-30 disabled:hover:scale-100"
               >
                  <Send size={20} />
               </button>
            </div>
            <p className="text-[9px] text-center mt-6 text-muted font-black uppercase tracking-widest opacity-40">AI assistant is localized to {language.toUpperCase()} • Powered by Gemini Flash</p>
         </div>
      </div>
    </div>
  );
}
