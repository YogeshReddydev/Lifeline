import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Scan, Camera, ShieldCheck, AlertTriangle, Loader2, RefreshCw, Brain, ChevronRight, History, Clock } from 'lucide-react';
import { generateImageAnalysis, formatGeminiError } from '../lib/gemini';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { getStructuredHealthData, AIProvider } from '../lib/aiService';
import { useLanguage } from '../lib/LanguageContext';

export default function ImageScanner() {
  const { t } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Neural Scanning...');
  const [result, setResult] = useState<any>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [isQuestioning, setIsQuestioning] = useState(false);
  const [initialScanData, setInitialScanData] = useState<any>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'skinAnalyses'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(scans);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'skinAnalyses');
    });

    return () => unsubscribe();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension 800px for speed and Firestore limits
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG for smaller footprint
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setImage(resizedDataUrl);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    setAnalyzing(true);
    setResult(null);
    setFollowUpQuestions([]);
    setIsQuestioning(false);
    setError('');
    setLoadingMessage('Optimizing neural scan packets...');

    try {
      const base64Data = image.split(',')[1];
      const detectedMimeType = "image/jpeg"; // We forced it in canvas.toDataURL
      
      const visualDescription = await generateImageAnalysis(
        "Analyze this health-related image. Describe visible symptoms, marks, or anomalies in a clinical context. Be technical and precise.",
        base64Data,
        detectedMimeType
      );
      
      setInitialScanData(visualDescription);

      setLoadingMessage('Gemini-Flash calculating clinical reasoning nodes...');
      const questioningPrompt = `Based on this visual description: "${visualDescription}", generate 3 critical follow-up questions to understand the history or symptoms.
      Output ONLY a JSON array of strings.`;

      const qResponse = await getStructuredHealthData(
        questioningPrompt,
        { type: "array", items: { type: "string" } },
        AIProvider.GEMINI
      );

      setFollowUpQuestions(qResponse);
      setIsQuestioning(true);
    } catch (err: any) {
      console.error(err);
      setError(`Scan Failed: ${formatGeminiError(err)}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const finalizeAnalysis = async () => {
    setAnalyzing(true);
    setIsQuestioning(false);
    setLoadingMessage('Gemini-Flash synthesizing final clinical protocol...');

    const answersText = Object.entries(followUpAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n');
    
    const finalPrompt = `Analyze:
    Visual: ${initialScanData}
    Details: ${answersText}
    
    Provide (JSON):
    1. condition (string)
    2. confidence (string, e.g. "92%")
    3. explanation (string)
    4. medicines (array)
    5. dos (array)
    6. donts (array)
    7. emergency (string)`;

    try {
      const gSchema = {
        type: "object",
        properties: {
          condition: { type: "string" },
          confidence: { type: "string" },
          explanation: { type: "string" },
          medicines: { type: "array", items: { type: "string" } },
          dos: { type: "array", items: { type: "string" } },
          donts: { type: "array", items: { type: "string" } },
          emergency: { type: "string" }
        },
        required: ["condition", "confidence", "explanation", "medicines", "dos", "donts"]
      };

      // Switched to GEMINI for 3x speed increase over DeepSeek for this task
      const analysisData = await getStructuredHealthData(finalPrompt, gSchema, AIProvider.GEMINI);
      setResult(analysisData);

      if (auth.currentUser) {
        try {
          await addDoc(collection(db, 'skinAnalyses'), {
            userId: auth.currentUser.uid,
            imageUrl: image,
            analysis: analysisData,
            timestamp: serverTimestamp()
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, 'skinAnalyses');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(`Synthesis Error: ${formatGeminiError(err)}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const loadPreviousScan = (scan: any) => {
    setImage(scan.imageUrl);
    setResult(scan.analysis);
    setIsQuestioning(false);
    setFollowUpQuestions([]);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <header>
        <h2 className="text-3xl font-black text-natural-text">{t('image_scanner')}</h2>
        <p className="text-muted font-medium mt-1 italic">{t('scanner_desc')}</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[48px] border border-accent shadow-xl flex flex-col items-center justify-center min-h-[500px]">
          {!image ? (
            <label className="w-full h-full border-4 border-dashed border-accent rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 transition-all group">
              <div className="p-6 bg-natural-bg rounded-3xl mb-6 group-hover:scale-110 transition-transform">
                <Upload size={40} className="text-primary" />
              </div>
              <p className="text-sm font-black text-natural-text uppercase tracking-widest">{t('upload_image')}</p>
              <p className="text-[10px] text-muted font-bold mt-2 uppercase">Skin, rashes, or visible symptoms</p>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          ) : (
            <div className="w-full space-y-6">
              <div className="relative rounded-[32px] overflow-hidden border-4 border-accent shadow-inner">
                <img src={image} alt="Target" className="w-full h-[400px] object-cover" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute top-4 right-4 p-2 bg-sos text-white rounded-xl shadow-lg"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
              <button 
                onClick={analyzeImage}
                disabled={analyzing || isQuestioning}
                className="w-full py-5 bg-primary text-white rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    {t('analyzing_neural')}
                  </>
                ) : (
                  <>
                    <Scan size={24} />
                    {t('analyze')}
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 bg-sos/10 text-sos rounded-2xl flex items-center gap-3 border border-sos/20 text-[10px] font-black uppercase tracking-widest">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {isQuestioning && followUpQuestions.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-10 rounded-[48px] border border-accent shadow-xl space-y-8"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                    <Brain size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-natural-text uppercase tracking-tighter">Clinical Reasoning</h3>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">Follow-up context required</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {followUpQuestions.map((q, i) => (
                    <div key={i} className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted">{q}</label>
                      <input 
                        type="text"
                        onChange={e => setFollowUpAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                        placeholder="Answer details..."
                        className="w-full bg-natural-bg border border-accent p-4 rounded-xl text-sm font-medium focus:ring-2 ring-indigo-500 outline-none"
                      />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={finalizeAnalysis}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  Finalize Clinical Synthesis <ChevronRight size={14} />
                </button>
              </motion.div>
            ) : result ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-10 rounded-[48px] border border-accent shadow-xl space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Inferred Condition</p>
                    <h3 className="text-3xl font-black text-natural-text uppercase leading-none">{result.condition}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Confidence</p>
                    <p className="text-3xl font-black text-primary">{result.confidence}</p>
                  </div>
                </div>

                <div className="p-6 bg-natural-bg rounded-3xl border border-accent italic text-sm text-natural-text leading-relaxed">
                  {result.explanation}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-success uppercase tracking-widest">Medical Do's</p>
                     <ul className="space-y-2">
                        {result.dos.map((item: any, i: number) => (
                          <li key={i} className="text-[11px] font-bold text-natural-text flex gap-2">
                            <span className="text-success">✓</span> {item}
                          </li>
                        ))}
                     </ul>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-sos uppercase tracking-widest">Strict Don'ts</p>
                     <ul className="space-y-2">
                        {result.donts.map((item: any, i: number) => (
                          <li key={i} className="text-[11px] font-bold text-natural-text flex gap-2">
                            <span className="text-sos">×</span> {item}
                          </li>
                        ))}
                     </ul>
                  </div>
                </div>

                {result.emergency && (
                  <div className="p-6 bg-sos/10 border border-sos/20 rounded-3xl flex items-start gap-4">
                    <AlertTriangle className="text-sos flex-shrink-0" size={24} />
                    <div>
                      <p className="text-[10px] font-black text-sos uppercase tracking-widest leading-none mb-1">Emergency Warning</p>
                      <p className="text-xs font-bold text-natural-text">{result.emergency}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : analyzing ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                <Loader2 size={48} className="animate-spin text-primary opacity-20" />
                <p className="text-xs font-black text-muted uppercase tracking-widest">Processing visual biomarkers...</p>
              </div>
            ) : (
              <div className="bg-natural-bg p-10 rounded-[48px] border border-accent border-dashed h-full flex flex-col items-center justify-center text-center space-y-4">
                <Camera size={40} className="text-muted opacity-30" />
                <p className="text-sm font-bold text-muted">Awaiting image for neural diagnosis visualization.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* History Section */}
      <section className="pt-10 border-t border-accent space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-natural-bg rounded-2xl flex items-center justify-center text-muted border border-accent">
              <History size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-natural-text uppercase tracking-tighter">{t('recent_scans')}</h3>
              <p className="text-[10px] font-black text-muted uppercase tracking-widest">Neural diagnostic history</p>
            </div>
          </div>
        </div>

        {history.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -5 }}
                onClick={() => loadPreviousScan(item)}
                className="group bg-white p-5 rounded-[32px] border border-accent hover:border-primary/30 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border border-accent shrink-0">
                    <img src={item.imageUrl} alt="Scan" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={12} className="text-muted" />
                      <span className="text-[9px] font-bold text-muted uppercase tracking-widest">
                        {item.timestamp?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || 'Pending'}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-natural-text uppercase truncate mb-1">{item.analysis.condition}</h4>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[8px] font-black uppercase">
                        {item.analysis.confidence} Match
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-accent flex items-center justify-between">
                  <span className="text-[9px] font-black text-muted uppercase tracking-widest">{t('view_report')}</span>
                  <ChevronRight size={14} className="text-muted group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-20 bg-natural-bg rounded-[48px] border border-accent border-dashed text-center">
             <p className="text-sm font-bold text-muted uppercase tracking-widest opacity-50">{t('no_history')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
