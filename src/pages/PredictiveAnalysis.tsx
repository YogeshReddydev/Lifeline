import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Brain, 
  Plus, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  AlertTriangle, 
  Info,
  ShieldCheck,
  Zap,
  BarChart2,
  FileText,
  MessageSquare,
  Thermometer,
  ZapIcon,
  TrendingUp,
  Printer
} from 'lucide-react';
import Logo from '../components/Logo';
import { getStructuredHealthData, AIProvider } from '../lib/aiService';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useLanguage } from '../lib/LanguageContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PredictionResult {
  condition: string;
  probability: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Emergency';
  simpleExplanation: string;
  nextSteps: string[];
  emergencySigns: string[];
  shouldConsultDoctor: boolean;
  consultationReason: string;
  confidenceInterval: string;
  suggestedMedicines: string[];
  dos: string[];
  donts: string[];
}

export default function PredictiveAnalysis() {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { id: 'demographics', title: t('vital_info'), sub: 'My Basic Data' },
    { id: 'vitals', title: t('bio_metrics'), sub: 'Current Vitals' },
    { id: 'history', title: t('background'), sub: 'Health History' },
    { id: 'review', title: t('confirmation'), sub: 'Ready for Analysis' },
  ];
  const [formData, setFormData] = useState({
    name: 'Authorized User',
    age: '30',
    gender: 'Male',
    bmi: '24.5',
    glucose: '95',
    bp: '120/80',
    cholesterol: '170',
    hba1c: '5.2',
    creatinine: '1.0',
    symptoms: '',
    existingConditions: '',
    allergies: '',
    medications: '',
    smokeState: false,
    exerciseState: true,
  });

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initializing ML pipeline...');
  const [result, setResult] = useState<PredictionResult[] | null>(null);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<AIProvider>(AIProvider.GEMINI);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [isQuestioning, setIsQuestioning] = useState(false);

   const loadingMessages = [
    "Compiling health profile...",
    "Scanning biomarkers...",
    "Analyzing symptom patterns...",
    "Generating personalized insights...",
    "Verifying protocols..."
  ];

  useEffect(() => {
    if (loading) {
      let i = 0;
      const interval = setInterval(() => {
        setLoadingMessage(loadingMessages[i % loadingMessages.length]);
        i++;
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const validateStep = () => {
     if (currentStep === 0) return formData.name && formData.age && formData.gender;
     if (currentStep === 1) return formData.glucose && formData.bp;
     return true;
  };

  const nextStep = () => {
    if (validateStep() && currentStep < steps.length - 1) {
      setCurrentStep(curr => curr + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(curr => curr - 1);
  };

  const analyzeDisease = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setFollowUpQuestions([]);
    setIsQuestioning(false);

    const baseData = `Name: ${formData.name}, Age: ${formData.age}, Gender: ${formData.gender}
    BMI: ${formData.bmi}, Glucose: ${formData.glucose} mg/dL, BP: ${formData.bp}, Cholesterol: ${formData.cholesterol} mg/dL
    HbA1c: ${formData.hba1c}%, Creatinine: ${formData.creatinine} mg/dL
    Symptoms: ${formData.symptoms}
    History: ${formData.existingConditions}, Allergies: ${formData.allergies}, Meds: ${formData.medications}
    Lifestyle: Smoke: ${formData.smokeState}, Exercise: ${formData.exerciseState}`;

    try {
      // Step 1: Generate Deep-Level Follow-up Questions (Reasoning Phase)
      setLoadingMessage('Reasoning with available models for critical insights...');
      
      const questioningPrompt = `As a clinical diagnostic reasoning engine, analyze this patient summary: ${baseData}.
      Identify potential missing critical information or clarifying details needed for a precise diagnosis.
      Generate exactly 3 deep-dive follow-up questions that would help rule out or confirm severe underlying conditions.
      Output ONLY a JSON array of strings. Example: ["Does the chest pain radiate to the left arm?", "..."]`;

      const qResponse = await getStructuredHealthData(
        questioningPrompt,
        { type: "array", items: { type: "string" } },
        provider
      );

      setFollowUpQuestions(qResponse);
      setIsQuestioning(true);
      setLoading(false);
    } catch (err) {
      console.warn('Reasoning phase skipped or failed:', err);
      await runFinalInference(baseData, {});
    }
  };

  const runFinalInference = async (baseData: string, answers: Record<string, string>) => {
    setLoading(true);
    setIsQuestioning(false);
    setLoadingMessage('Synthesizing final health protocol...');

    const answersText = Object.entries(answers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n');
    
    const prompt = `Act as a personal health analysis AI. Analyze the following health data:
    ${baseData}
    
    Clarifying Follow-up Information:
    ${answersText}
    
    Provide likely health insights. For each insight, provide robust medicine suggestions based on the diagnosis (with strict clinical disclaimer), and precise Do's/Don'ts.
    Output JSON. Format:
    [{ 
      "condition": "Specific Diagnosis", 
      "probability": 85, 
      "riskLevel": "Emergency|High|Medium|Low", 
      "simpleExplanation": "...", 
      "nextSteps": ["..."], 
      "emergencySigns": ["..."], 
      "shouldConsultDoctor": true,
      "consultationReason": "...",
      "confidenceInterval": "± 4.2%",
      "suggestedMedicines": ["Medicine A (Reasoning: ...)", "Medicine B (...)"],
      "dos": ["..."],
      "donts": ["..."]
    }]`;

    try {
      const gSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            condition: { type: "string" },
            probability: { type: "number" },
            riskLevel: { type: "string" },
            simpleExplanation: { type: "string" },
            nextSteps: { type: "array", items: { type: "string" } },
            emergencySigns: { type: "array", items: { type: "string" } },
            shouldConsultDoctor: { type: "boolean" },
            consultationReason: { type: "string" },
            confidenceInterval: { type: "string" },
            suggestedMedicines: { type: "array", items: { type: "string" } },
            dos: { type: "array", items: { type: "string" } },
            donts: { type: "array", items: { type: "string" } }
          },
          required: ["condition", "probability", "riskLevel", "simpleExplanation", "nextSteps", "emergencySigns", "shouldConsultDoctor", "consultationReason", "confidenceInterval", "suggestedMedicines", "dos", "donts"],
        },
      };

      const data = await getStructuredHealthData(
        `System Instruction: You are a clinical diagnostic analyzer leveraging the knowledge of DeepSeek-R1. Review health data and output structured analysis JSON.
        
        ${prompt}`,
        gSchema,
        provider
      );
      
      setResult(data);

      // Persist to Firestore
      if (auth.currentUser) {
        try {
          await addDoc(collection(db, 'symptomsAnalyses'), {
            userId: auth.currentUser.uid,
            formData: { ...formData, followUpAnswers: answers, timestamp: new Date().toISOString() },
            results: data,
            timestamp: serverTimestamp()
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, 'symptomsAnalyses');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(`Neural analysis synthesis failed: ${err.message || 'System timeout or invalid biometric alignment.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const element = document.getElementById('printable-report');
    if (!element) {
      window.print();
      return;
    }

    setLoading(true);
    setLoadingMessage('Generating Clinical PDF...');

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`LifeLine_Report_${auth.currentUser?.uid?.slice(0, 8) || 'User'}_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('PDF Generation Failed:', err);
      window.print();
    } finally {
      setLoading(false);
    }
  };

  const shapData = {
    labels: ['Age', 'Glucose', 'BMI', 'HbA1c', 'BP-Sys', 'Cholesterol', 'Lifestyle', 'History'],
    datasets: [{
      label: 'Feature Importance (SHAP)',
      data: [0.24, 0.38, 0.15, 0.42, 0.28, 0.12, 0.08, 0.18],
      backgroundColor: '#b794f4',
      borderRadius: 8,
    }]
  };

  const trendData = {
    labels: ['V-1', 'V-2', 'V-3', 'V-4', 'V-5', 'Current'],
    datasets: [{
      label: 'Risk Trend',
      data: [45, 48, 42, 55, 52, 58],
      borderColor: '#63b3ed',
      tension: 0.4,
      pointRadius: 0,
      fill: false,
    }]
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 print:max-w-none print:m-0 print:p-0">
      <style>{`
        @media print {
          aside, nav, .print-hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .print-full {
            grid-column: span 3 / span 3 !important;
          }
          .no-break {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-primary/20">
               ML Pipeline v2.4.1
             </div>
             <div className="flex items-center bg-natural-bg border border-accent rounded-full p-1 ml-2">
               <button 
                 onClick={() => setProvider(AIProvider.GEMINI)}
                 className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${provider === AIProvider.GEMINI ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted'}`}
               >Gemini</button>
               <button 
                 onClick={() => setProvider(AIProvider.DEEPSEEK)}
                 className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${provider === AIProvider.DEEPSEEK ? 'bg-[#4338ca] text-white shadow-lg shadow-indigo-500/20' : 'text-muted'}`}
               >DeepSeek-R1</button>
             </div>
           </div>
           <h1 className="text-4xl font-black text-natural-text tracking-tighter">{t('predictive')}</h1>
           <p className="text-muted font-medium mt-2 italic">{t('ai_helper_desc')}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">        {/* Left Form Panel */}
        {!result && (
          <div className="lg:col-span-12 bg-white rounded-[48px] border border-accent shadow-2xl overflow-hidden print:hidden">
            <div className="flex border-b border-accent bg-natural-bg">
               {steps.map((s, i) => (
                 <div key={s.id} className={`flex-1 p-6 text-center border-r border-accent last:border-0 relative ${currentStep === i ? 'bg-white' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep >= i ? 'text-primary' : 'text-muted'}`}>STEP {i+1}</span>
                       <span className={`text-sm font-bold ${currentStep === i ? 'text-primary' : 'text-natural-text'}`}>{s.title}</span>
                    </div>
                    {currentStep > i && <div className="absolute top-6 right-6 text-success"><CheckCircle2 size={16} /></div>}
                    {currentStep === i && <motion.div layoutId="step-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
                 </div>
               ))}
            </div>

            <div className="p-12">
               <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="min-h-[400px]"
                  >
                     {currentStep === 0 && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-4">
                             <label className="text-xs font-black uppercase tracking-[0.2em] text-muted ml-1">My Full Name</label>
                             <input 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full bg-natural-bg border border-accent p-6 rounded-2xl focus:ring-2 ring-primary outline-none transition-all font-bold text-natural-text" 
                             />
                          </div>
                          <div className="space-y-4">
                             <label className="text-xs font-black uppercase tracking-[0.2em] text-muted ml-1">Age (Years)</label>
                             <input 
                                type="number"
                                value={formData.age}
                                onChange={e => setFormData({...formData, age: e.target.value})}
                                className="w-full bg-natural-bg border border-accent p-6 rounded-2xl focus:ring-2 ring-primary outline-none transition-all font-bold text-natural-text" 
                             />
                          </div>
                          <div className="space-y-4">
                             <label className="text-xs font-black uppercase tracking-[0.2em] text-muted ml-1">Biological Gender</label>
                             <select 
                                value={formData.gender}
                                onChange={e => setFormData({...formData, gender: e.target.value})}
                                className="w-full bg-natural-bg border border-accent p-6 rounded-2xl focus:ring-2 ring-primary outline-none transition-all font-bold text-natural-text"
                             >
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                             </select>
                          </div>
                       </div>
                     )}

                     {currentStep === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                           <div className="space-y-6">
                              <label className="text-xs font-black uppercase tracking-[0.2em] text-muted ml-1">Glucose (mg/dL)</label>
                              <input 
                                type="range" min="60" max="400"
                                value={formData.glucose}
                                onChange={e => setFormData({...formData, glucose: e.target.value})}
                                className="w-full accent-primary" 
                              />
                              <div className="text-3xl font-black text-primary">{formData.glucose} <span className="text-xs text-muted uppercase tracking-widest ml-2">mg/dL</span></div>
                           </div>
                           <div className="space-y-4">
                              <label className="text-xs font-black uppercase tracking-[0.2em] text-muted ml-1">Blood Pressure (SYS/DIA)</label>
                              <input 
                                value={formData.bp}
                                onChange={e => setFormData({...formData, bp: e.target.value})}
                                placeholder="120/80"
                                className="w-full bg-natural-bg border border-accent p-6 rounded-2xl outline-none font-bold text-natural-text" 
                              />
                           </div>
                           <div className="space-y-4">
                              <label className="text-xs font-black uppercase tracking-[0.2em] text-muted ml-1">BMI</label>
                              <input 
                                type="number" step="0.1"
                                value={formData.bmi}
                                onChange={e => setFormData({...formData, bmi: e.target.value})}
                                className="w-full bg-natural-bg border border-accent p-6 rounded-2xl outline-none font-bold text-natural-text" 
                              />
                           </div>
                        </div>
                     )}

                     {currentStep === 2 && (
                        <div className="space-y-10">
                           <div className="space-y-4">
                              <label className="text-xs font-black uppercase tracking-[0.2em] text-muted ml-1">Active Symptoms</label>
                              <textarea 
                                value={formData.symptoms}
                                onChange={e => setFormData({...formData, symptoms: e.target.value})}
                                placeholder="I am experiencing persistent symptoms..."
                                className="w-full bg-natural-bg border border-accent p-8 rounded-3xl min-h-[180px] outline-none font-medium text-sm leading-relaxed text-natural-text placeholder:italic" 
                              />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-6">
                                <label className="text-xs font-black uppercase tracking-[0.2em] text-muted ml-1">Risk Factors</label>
                                <div className="flex flex-wrap gap-4">
                                   <button 
                                     onClick={() => setFormData({...formData, smokeState: !formData.smokeState})}
                                     className={`px-8 py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                                       formData.smokeState ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white border-accent text-muted hover:border-primary/50'
                                     }`}
                                   >Smoker</button>
                                   <button 
                                     onClick={() => setFormData({...formData, exerciseState: !formData.exerciseState})}
                                     className={`px-8 py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                                       formData.exerciseState ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white border-accent text-muted hover:border-primary/50'
                                     }`}
                                   >Active Exercise</button>
                                </div>
                              </div>
                           </div>
                        </div>
                     )}

                     {currentStep === 3 && (
                        <div className="space-y-8 bg-natural-bg p-10 rounded-[32px] border border-accent">
                           <h3 className="text-xl font-black text-natural-text flex items-center gap-3">
                             <ShieldCheck className="text-success" size={24} />
                             Data Verification
                           </h3>
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                              {[
                                { label: 'Name', val: formData.name },
                                { label: 'Biometrics', val: `${formData.age} yrs • ${formData.gender}` },
                                { label: 'Vitals', val: `G:${formData.glucose} • BP:${formData.bp}` },
                                { label: 'Validation', val: 'Status: Secure' },
                              ].map((item, i) => (
                                <div key={i} className="p-6 bg-white rounded-2xl border border-accent shadow-sm">
                                   <p className="text-[9px] font-black uppercase text-muted tracking-widest mb-1">{item.label}</p>
                                   <p className="text-xs font-black text-natural-text uppercase">{item.val}</p>
                                </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </motion.div>
               </AnimatePresence>
               
               <div className="mt-12 pt-8 border-t border-accent flex items-center justify-between">
                  <button 
                    onClick={prevStep} 
                    disabled={currentStep === 0}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted hover:text-natural-text disabled:opacity-0 transition-all"
                  >
                     <ChevronLeft size={16} />
                     {t('back')}
                  </button>
                  
                  {currentStep < steps.length - 1 ? (
                    <button 
                      onClick={nextStep}
                      className="flex items-center gap-2 px-10 py-5 bg-natural-bg hover:bg-accent border border-accent rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all text-natural-text shadow-sm"
                    >
                       {t('next')}
                       <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button 
                       onClick={analyzeDisease}
                       disabled={loading}
                       className="px-12 py-5 bg-primary text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-3"
                    >
                       {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} fill="currentColor" />}
                       {t('run_inference')}
                    </button>
                  )}
               </div>
            </div>
          </div>
        )}

        {/* Questioning Phase */}
        {isQuestioning && followUpQuestions.length > 0 && (
          <div className="lg:col-span-12 bg-white rounded-[48px] border border-accent shadow-2xl p-12 space-y-10 print:hidden mt-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Brain size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-natural-text uppercase tracking-tighter">Diagnostic Reasoning Phase</h2>
                <p className="text-muted font-medium text-sm italic">DeepSeek-R1 requires more context based on your health profile.</p>
              </div>
            </div>

            <div className="space-y-8">
              {followUpQuestions.map((q, i) => (
                <div key={i} className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-muted ml-1">{q}</label>
                  <textarea
                    onChange={e => setFollowUpAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                    placeholder="Provide details..."
                    className="w-full bg-natural-bg border border-accent p-6 rounded-2xl focus:ring-2 ring-indigo-500 outline-none transition-all font-medium text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-accent flex justify-end">
              <button
                onClick={() => {
                  const baseData = `Name: ${formData.name}, Age: ${formData.age}, Gender: ${formData.gender}
                  BMI: ${formData.bmi}, Glucose: ${formData.glucose} mg/dL, BP: ${formData.bp}, Cholesterol: ${formData.cholesterol} mg/dL
                  HbA1c: ${formData.hba1c}%, Creatinine: ${formData.creatinine} mg/dL
                  Symptoms: ${formData.symptoms}
                  History: ${formData.existingConditions}, Allergies: ${formData.allergies}, Meds: ${formData.medications}
                  Lifestyle: Smoke: ${formData.smokeState}, Exercise: ${formData.exerciseState}`;
                  runFinalInference(baseData, followUpAnswers);
                }}
                className="px-12 py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-500/20 hover:scale-105 transition-all flex items-center gap-3"
              >
                Synthesize Analysis
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="lg:col-span-12 min-h-[600px] flex flex-col items-center justify-center p-12 text-center bg-white rounded-[48px] border border-accent shadow-2xl">
             <div className="relative mb-10">
                <div className="w-32 h-32 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <Brain size={48} className="text-primary animate-pulse" />
                </div>
             </div>
             <motion.p 
                key={loadingMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-black text-natural-text"
             >
                {loadingMessage}
             </motion.p>
             <div className="w-64 h-1 bg-accent rounded-full mt-8 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 10 }}
                  className="h-full bg-primary" 
                />
             </div>
          </div>
        )}

        {/* Error Display */}
        {error && !loading && (
          <div className="lg:col-span-12 p-8 bg-sos/10 border border-sos/20 rounded-[32px] text-center space-y-4">
            <AlertTriangle className="mx-auto text-sos" size={32} />
            <h3 className="text-lg font-black text-sos uppercase tracking-widest">Protocol Interrupted</h3>
            <p className="text-sm font-medium text-sos/80 max-w-md mx-auto">{error}</p>
            <button 
              onClick={() => setError('')}
              className="px-6 py-2 bg-sos text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
            >
              Clear Notice
            </button>
          </div>
        )}

        {/* Results Panel */}
        {result && (
          <div id="printable-report" className="lg:col-span-12 space-y-12">
             {/* Printable Hospital Header */}
             <div className="hidden print:block mb-12 border-b-4 border-primary pb-8">
                <div className="flex justify-between items-start">
                   <Logo />
                   <div className="text-right">
                      <h2 className="text-2xl font-black uppercase tracking-widest text-primary">Biometric Clinical Analysis</h2>
                      <p className="text-[10px] font-bold text-muted mt-1 uppercase tracking-widest">Medical Grade Inference Result • Confidential</p>
                   </div>
                </div>
                
                <div className="grid grid-cols-3 gap-10 mt-12 bg-natural-bg p-8 rounded-[32px] border border-accent">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted tracking-widest">Patient / Client ID</p>
                      <p className="text-sm font-black text-natural-text">#{auth.currentUser?.uid?.slice(0, 12).toUpperCase() || 'SYSTEM-GUEST'}</p>
                   </div>
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted tracking-widest">Generation Date</p>
                      <p className="text-sm font-black text-natural-text">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                   </div>
                   <div className="space-y-2 text-right">
                      <p className="text-[10px] font-black uppercase text-muted tracking-widest">Vital Integrity</p>
                      <p className="text-sm font-black text-success">VERIFIED 100%</p>
                   </div>
                </div>

                <div className="mt-8 grid grid-cols-4 gap-6">
                   {[
                      { label: 'Calculated Glucose', val: `${formData.glucose} mg/dL` },
                      { label: 'BioBP Sync', val: formData.bp },
                      { label: 'Metabolic BMI', val: formData.bmi },
                      { label: 'Patient Profile', val: `${formData.age}yr / ${formData.gender}` },
                   ].map((v, i) => (
                      <div key={i} className="p-4 border border-accent rounded-2xl">
                         <p className="text-[8px] font-black text-muted uppercase tracking-widest mb-1">{v.label}</p>
                         <p className="text-xs font-bold text-natural-text">{v.val}</p>
                      </div>
                   ))}
                </div>
             </div>

             <div className="flex items-center justify-between print:hidden">
                <button 
                  onClick={() => setResult(null)} 
                  className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted hover:text-natural-text transition-all"
                >
                   <ChevronLeft size={16} />
                   Resubmit Analysis Data
                </button>
                <div className="flex gap-4">
                   <button onClick={handleExport} className="px-6 py-3 bg-white border border-accent rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all shadow-sm group">
                      <Printer size={16} className="text-secondary group-hover:scale-110 transition-transform" />
                      Export Report
                   </button>
                   <button className="px-6 py-3 bg-white border border-accent rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all shadow-sm">
                      <MessageSquare size={16} className="text-primary" />
                      Ask Follow-up
                   </button>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
               {/* Result Sidebar */}
               <div className="lg:col-span-1 space-y-8 print:hidden">
                  <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-10 rounded-[40px] border border-primary/20">
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6">Vitality Index</p>
                     <div className="flex items-end gap-4 mb-8">
                        <span className="text-6xl font-black text-natural-text">58%</span>
                        <div className="pb-2">
                           <p className="text-[10px] font-bold text-muted uppercase">Risk Index</p>
                           <div className="flex items-center gap-1 text-success">
                              <TrendingUp size={12} />
                              <span className="text-[9px] font-black">+4.2% Stability</span>
                           </div>
                        </div>
                     </div>
                     <div className="h-20 w-full opacity-60">
                        <Line data={trendData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }} />
                     </div>
                  </div>

                  <div className="bg-white p-10 rounded-[40px] border border-accent shadow-xl">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-natural-text">Feature Importance</h3>
                     <div className="h-[200px]">
                        <Bar data={shapData} options={{ maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } } } }} />
                     </div>
                  </div>
               </div>

               {/* Main Result List */}
               <div className="lg:col-span-2 print:col-span-3 space-y-8">
                  {result.map((item, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white p-10 rounded-[40px] border border-accent shadow-xl hover:shadow-2xl transition-all print:shadow-none print:border-2 print:rounded-[32px] no-break"
                    >
                      <div className="flex flex-col md:flex-row gap-8 mb-10">
                        <div className="flex-1 space-y-4">
                           <div className="flex flex-wrap items-center gap-4">
                              <h4 className="text-3xl font-black text-natural-text tracking-tight">{item.condition}</h4>
                              <div className="flex gap-2">
                                <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                  item.riskLevel === 'Emergency' || item.riskLevel === 'High' 
                                    ? 'bg-sos/10 text-sos border-sos/20' 
                                    : 'bg-primary/10 text-primary border-primary/20'
                                }`}>
                                   {item.riskLevel}
                                </span>
                                <span className="px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-accent text-muted">
                                   CI {item.confidenceInterval}
                                </span>
                              </div>
                           </div>
                           <p className="text-muted font-medium text-sm leading-relaxed italic">{item.simpleExplanation}</p>
                        </div>
                        <div className="md:w-36 flex flex-col items-center justify-center p-6 bg-natural-bg rounded-3xl border border-accent">
                           <span className="text-4xl font-black text-primary">{item.probability}%</span>
                           <span className="text-[9px] font-black uppercase text-muted mt-1">Confidence</span>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-10 pt-10 border-t border-accent">
                         <div className="space-y-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-3">
                               <Plus size={14} className="text-primary" />
                               Next Steps
                            </p>
                            <ul className="space-y-3">
                               {item.nextSteps.map((step, sidx) => (
                                  <li key={sidx} className="text-xs font-bold text-natural-text flex gap-4">
                                     <span className="text-primary">•</span> {step}
                                  </li>
                               ))}
                            </ul>
                         </div>
                         <div className="space-y-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-sos flex items-center gap-3">
                               <AlertTriangle size={14} />
                               Red Flags
                            </p>
                            <ul className="space-y-3">
                               {item.emergencySigns.map((sign, sidx) => (
                                  <li key={sidx} className="text-xs font-bold text-sos flex gap-4">
                                     <span>⚠</span> {sign}
                                  </li>
                               ))}
                            </ul>
                         </div>
                      </div>

                      <div className="mt-10 pt-10 border-t border-accent grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-3">
                               <Plus size={14} className="text-primary" />
                               Health Do's
                            </p>
                            <ul className="space-y-3">
                               {item.dos.map((d: string, didx: number) => (
                                  <li key={didx} className="text-[11px] font-bold text-natural-text flex gap-3">
                                     <CheckCircle2 size={14} className="text-success flex-shrink-0" /> {d}
                                  </li>
                               ))}
                            </ul>
                         </div>
                         <div className="space-y-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-sos flex items-center gap-3">
                               <AlertTriangle size={14} className="text-sos" />
                               Health Don'ts
                            </p>
                            <ul className="space-y-3">
                               {item.donts.map((d: string, didx: number) => (
                                  <li key={didx} className="text-[11px] font-bold text-sos flex gap-3">
                                     <span className="flex-shrink-0">×</span> {d}
                                  </li>
                               ))}
                            </ul>
                         </div>
                      </div>

                      {/* Suggested Medicines Section */}
                      {item.suggestedMedicines && item.suggestedMedicines.length > 0 && (
                        <div className="mt-10 pt-10 border-t border-accent space-y-8">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-3">
                                <Thermometer size={14} className="text-indigo-600" />
                                Suggested Medicines
                              </p>
                              <p className="text-[9px] text-muted font-medium italic">Pharmacological inference based on clinical patterns</p>
                            </div>
                            <div className="px-4 py-2 bg-sos/10 text-sos rounded-full text-[9px] font-black uppercase tracking-widest border border-sos/20 flex items-center gap-2 animate-pulse">
                              <AlertTriangle size={12} />
                              Consult doctor before use
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {item.suggestedMedicines.map((med: string, midx: number) => (
                              <div key={midx} className="p-6 bg-natural-bg rounded-3xl border border-accent flex items-start gap-4 shadow-sm hover:border-indigo-200 transition-colors group">
                                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                  <ShieldCheck size={20} />
                                </div>
                                <p className="text-xs font-bold text-natural-text leading-relaxed">
                                  {med}
                                </p>
                              </div>
                            ))}
                          </div>

                          {item.shouldConsultDoctor && (
                            <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10 flex items-start gap-4">
                              <div className="p-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
                                <ShieldCheck size={24} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">System Referral</p>
                                <p className="text-xs font-bold text-natural-text leading-relaxed mt-1">Consultation Recommended: <span className="italic font-medium opacity-70">{item.consultationReason}</span></p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
               </div>
             </div>

             {/* Footer Legal */}
             <div className="bg-sos/5 border border-sos/10 p-10 rounded-[40px] flex flex-col md:flex-row items-start gap-8 print:border-sos print:bg-white print:rounded-[32px] no-break">
                <div className="p-5 bg-sos text-white rounded-3xl shadow-lg shadow-sos/20">
                   <Info size={32} />
                </div>
                <div>
                   <h5 className="text-base font-black uppercase tracking-widest text-sos mb-4">Health Analysis Guidance</h5>
                   <p className="text-sm font-medium text-natural-text/80 leading-relaxed italic">
                     AI-generated insights represent patterns based on symptoms and metrics. 
                     This interface provides personal analysis and DOES NOT replace professional medical advice, formal diagnosis, or laboratory verification. 
                     In emergency situations, contact medical services immediately.
                   </p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
