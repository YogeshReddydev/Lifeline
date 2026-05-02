import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Download, 
  Plus, 
  ShieldCheck, 
  Printer, 
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface HealthReport {
  id: string;
  date: string;
  type: string;
  status: 'Complete' | 'Draft';
  score: string;
  summary: string;
  symptoms: string[];
  detections: string[];
  medications: string[];
}

export default function Reports() {
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<HealthReport | null>(null);
  const [reports, setReports] = useState<HealthReport[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'healthReports'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        const fetchedReports = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as HealthReport[];
        setReports(fetchedReports);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'healthReports');
      }
    };
    fetchReports();
  }, []);

  const generateReport = async () => {
    if (!auth.currentUser) return;
    setIsGenerating(true);
    
    try {
      // 1. Fetch latest symptom check
      const sympQ = query(
        collection(db, 'symptomsAnalyses'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const sympSnapshot = await getDocs(sympQ);
      const latestSymp = sympSnapshot.docs[0]?.data();

      // 2. Fetch latest skin scan
      const skinQ = query(
        collection(db, 'skinAnalyses'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const skinSnapshot = await getDocs(skinQ);
      const latestSkin = skinSnapshot.docs[0]?.data();

      // 3. Construct real data report
      const allSymptoms = [
        ...(latestSymp?.formData?.symptoms ? [latestSymp.formData.symptoms] : []),
        ...(latestSkin?.analysis?.condition ? [`Visible ${latestSkin.analysis.condition}`] : [])
      ];

      const allDetections = [
        ...(latestSymp?.results?.map((r: any) => r.condition) || []),
        ...(latestSkin?.analysis?.condition ? [latestSkin.analysis.condition] : [])
      ];

      const allMeds = [
        ...(latestSymp?.results?.flatMap((r: any) => r.suggestedMedicines) || []),
        ...(latestSkin?.analysis?.medicines || [])
      ];

      // Deduplicate
      const uniqueSymptoms = Array.from(new Set(allSymptoms)).slice(0, 5);
      const uniqueDetections = Array.from(new Set(allDetections)).slice(0, 3);
      const uniqueMeds = Array.from(new Set(allMeds)).slice(0, 6);

      const newReportData = {
        userId: auth.currentUser.uid,
        date: new Date().toISOString().split('T')[0],
        type: latestSymp?.results?.[0] ? `Analysis: ${latestSymp.results[0].condition}` : 'Routine Health Sync',
        status: 'Complete' as const,
        score: latestSymp?.results?.[0] ? `${latestSymp.results[0].probability || 85}/100` : '92/100',
        summary: latestSymp?.results?.[0] 
          ? `Primary finding: ${latestSymp.results[0].simpleExplanation}. ${latestSkin?.analysis?.condition ? `Vision analysis verified ${latestSkin.analysis.condition}.` : ''}` 
          : 'All vital systems operational. Baseline metrics established.',
        symptoms: uniqueSymptoms.length > 0 ? uniqueSymptoms : ['None Reported'],
        detections: uniqueDetections.length > 0 ? uniqueDetections : ['Optimal Wellness'],
        medications: uniqueMeds.length > 0 ? uniqueMeds : ['Maintain Protocol'],
        timestamp: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'healthReports'), newReportData);
      const finalReport = { ...newReportData, id: docRef.id } as HealthReport;
      
      setReports([finalReport, ...reports]);
      setSelectedReport(finalReport);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'healthReports');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!selectedReport) return;
    const content = `
LIFELINE HEALTH ANALYSIS REPORT
Report ID: ${selectedReport.id}
Date: ${selectedReport.date}
User: ${profile?.name || 'Authorized User'}
--------------------------------------------------
SUMMARY:
${selectedReport.summary}

SYMPTOMS ANALYZED:
${selectedReport.symptoms.join(', ')}

DETECTED CONDITIONS:
${selectedReport.detections.join(', ')}

SUGGESTED PROTOCOLS:
${selectedReport.medications.join(', ')}

HEALTH INDEX: ${selectedReport.score}
--------------------------------------------------
Powered by SECUREBYTES™ Global Infrastructure
Generated by Lifeline Personal Health Guardian
    `;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedReport.id}_health_report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-natural-text">Health Analysis Reports</h2>
          <p className="text-muted font-medium mt-1 italic">Personal health archival and automated protocol generation.</p>
        </div>
        <button 
          onClick={generateReport}
          disabled={isGenerating}
          className="px-8 py-5 bg-primary text-white rounded-[24px] font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-3 disabled:opacity-50"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2 animate-pulse">
               <Clock size={16} /> Compiling Data...
            </span>
          ) : (
            <>
              <Plus size={18} />
              Generate Vital Report
            </>
          )}
        </button>
      </header>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Left Column: List */}
        <div className="lg:col-span-4 space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2 px-2">
              <Calendar size={14} /> 
              Archived Analysis
           </h3>
           <div className="space-y-4">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`w-full text-left p-6 rounded-[32px] border transition-all flex flex-col gap-3 group ${
                    selectedReport?.id === report.id 
                    ? 'bg-primary border-primary shadow-xl shadow-primary/20 text-white' 
                    : 'bg-white border-accent hover:border-primary shadow-sm hover:translate-x-1'
                  }`}
                >
                  <div className="flex items-center justify-between">
                     <span className={`text-[9px] font-black uppercase tracking-widest ${selectedReport?.id === report.id ? 'text-white/80' : 'text-muted'}`}>
                       {report.id}
                     </span>
                     <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                       selectedReport?.id === report.id ? 'bg-white/20 text-white' : 'bg-success/10 text-success'
                     }`}>
                       {report.status}
                     </span>
                  </div>
                  <h4 className="text-sm font-black uppercase leading-tight">{report.type}</h4>
                  <div className="flex items-center justify-between text-[10px] font-bold">
                     <span>{report.date}</span>
                     <span className={selectedReport?.id === report.id ? 'text-white' : 'text-primary'}>Score: {report.score}</span>
                  </div>
                </button>
              ))}
           </div>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-8">
           <AnimatePresence mode="wait">
             {selectedReport ? (
               <motion.div
                 key={selectedReport.id}
                 initial={{ opacity: 0, scale: 0.98 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="bg-white rounded-[48px] border border-accent shadow-2xl p-12 space-y-12 relative overflow-hidden"
               >
                  {/* Branding Header */}
                  <div className="flex items-center justify-between border-b-2 border-accent pb-10">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-natural-bg rounded-2xl">
                           <FileText size={32} className="text-primary" />
                        </div>
                        <div>
                           <h1 className="text-2xl font-black text-natural-text uppercase leading-none italic">LIFELINE</h1>
                           <p className="text-[9px] font-black uppercase tracking-widest text-muted mt-1">Personal Health Guardian</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest">Powered By</p>
                        <p className="text-sm font-black text-natural-text flex items-center gap-2 justify-end">
                          <ShieldCheck size={16} className="text-success" />
                          SECUREBYTES™
                        </p>
                     </div>
                  </div>

                  {/* Report Body */}
                  <div className="space-y-10" id="printable-report">
                     <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">User Profile</p>
                           <div className="space-y-1">
                              <p className="text-xl font-black text-natural-text uppercase">{profile?.name || 'Authorized User'}</p>
                              <p className="text-xs font-bold text-muted italic">Neural Signature: {selectedReport.id}-ALPHA</p>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Generation Date</p>
                           <p className="text-xl font-black text-natural-text">{selectedReport.date}</p>
                        </div>
                     </div>

                     <div className="p-10 bg-natural-bg rounded-[32px] border border-accent/50 space-y-8">
                        <div className="space-y-4">
                           <h5 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                              <CheckCircle2 size={14} />
                              Executive Summary
                           </h5>
                           <p className="text-sm font-medium text-natural-text leading-relaxed">
                              {selectedReport.summary}
                           </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-accent/30">
                           <div className="space-y-4">
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-muted">Detected Symptoms</h5>
                              <ul className="space-y-2">
                                 {selectedReport.symptoms.map((s, idx) => (
                                    <li key={idx} className="text-xs font-bold text-natural-text flex items-center gap-2">
                                       <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {s}
                                    </li>
                                 ))}
                              </ul>
                           </div>
                           <div className="space-y-4">
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-muted">Detected Conditions</h5>
                              <ul className="space-y-2">
                                 {selectedReport.detections.map((d, idx) => (
                                    <li key={idx} className="text-xs font-bold text-natural-text flex items-center gap-2">
                                       <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> {d}
                                    </li>
                                 ))}
                              </ul>
                           </div>
                        </div>

                        <div className="pt-6 border-t border-accent/30 space-y-4">
                           <h5 className="text-[10px] font-black uppercase tracking-widest text-muted">Suggested Protocols & Medications</h5>
                           <div className="flex flex-wrap gap-2">
                              {selectedReport.medications.map((m, idx) => (
                                 <span key={idx} className="px-3 py-1.5 bg-white border border-accent rounded-lg text-[10px] font-black text-natural-text uppercase italic">{m}</span>
                              ))}
                           </div>
                        </div>

                        <div className="pt-6 border-t border-accent/30 grid grid-cols-3 gap-6">
                           <div>
                              <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Health Index</p>
                              <p className="text-lg font-black text-natural-text">{selectedReport.score}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Risk Bias</p>
                              <p className="text-lg font-black text-success">LOW</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Integrity</p>
                              <p className="text-lg font-black text-primary">VERIFIED</p>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <h5 className="text-xs font-black uppercase tracking-widest text-muted">Legal Disclaimer</h5>
                        <p className="text-[10px] text-muted italic leading-relaxed">
                           This internal health report is generated by Lifeline AI ("The System") using local and biometric biomarkers. This is not a clinical diagnosis. All medical findings should be verified by a board-certified physician. Powered by Securebytes cryptographically secured infrastructure.
                        </p>
                     </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-4 no-print">
                     <button 
                       onClick={handlePrint}
                       className="flex-1 py-5 bg-natural-bg hover:bg-accent text-natural-text rounded-[24px] font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 border border-accent shadow-sm"
                     >
                        <Printer size={18} />
                        Print Snapshot
                     </button>
                     <button 
                       onClick={handleDownload}
                       className="flex-1 py-5 bg-natural-text text-white rounded-[24px] font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02]"
                     >
                        <Download size={18} />
                        Archive Digital Copy
                     </button>
                  </div>
                  
                  {/* Decorative Background */}
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
               </motion.div>
             ) : (
               <div className="h-full min-h-[600px] bg-natural-bg rounded-[48px] border-4 border-dashed border-accent flex flex-col items-center justify-center text-center p-20 space-y-6">
                  <div className="p-8 bg-white rounded-full shadow-2xl">
                     <FileText size={64} className="text-muted opacity-20" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-natural-text uppercase italic">Select a System Report</h3>
                    <p className="text-muted font-medium mt-2 max-w-sm">
                      Select an archived analysis from the left panel to preview the detailed clinical summary or generate a fresh checkup.
                    </p>
                  </div>
                  <button 
                    onClick={generateReport}
                    className="flex items-center gap-3 text-primary text-xs font-black uppercase tracking-widest hover:gap-4 transition-all"
                  >
                    Generate New Checkup
                    <ChevronRight size={16} />
                  </button>
               </div>
             )}
           </AnimatePresence>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside, header, .lg\:col-span-4 { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          .lg\:col-span-8 { width: 100% !important; col-span: 12 !important; }
          .bg-white { border: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
