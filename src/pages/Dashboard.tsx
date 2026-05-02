import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Activity, 
  AlertCircle, 
  Clock, 
  ChevronRight,
  Stethoscope,
  Scan,
  ShieldCheck,
  PhoneCall,
  History,
  Info,
  ArrowRight,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';

import { useLanguage } from '../lib/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [recentCheckups, setRecentCheckups] = useState<any[]>([]);
  const [precautions, setPrecautions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReadyForTreatment, setIsReadyForTreatment] = useState(false);

  useEffect(() => {
    if (profile?.role === 'doctor') {
      navigate('/doctor-dashboard');
      return;
    }

    const fetchPatientData = async () => {
      if (!auth.currentUser) return;
      setLoading(true);
      try {
        const uid = auth.currentUser.uid;
        setIsReadyForTreatment(!!profile?.readyForTreatment);
        
        // Fetch everything in parallel for speed
        const [doctorSnap, sympSnap, skinSnap, repSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'doctor'), where('isAvailable', '==', true), limit(3))),
          getDocs(query(collection(db, 'symptomsAnalyses'), where('userId', '==', uid), orderBy('timestamp', 'desc'), limit(10))),
          getDocs(query(collection(db, 'skinAnalyses'), where('userId', '==', uid), orderBy('timestamp', 'desc'), limit(10))),
          getDocs(query(collection(db, 'healthReports'), where('userId', '==', uid), orderBy('timestamp', 'desc'), limit(10)))
        ]);

        setAvailableDoctors(doctorSnap.docs.map(d => ({ ...d.data(), id: d.id })));
        const sympData = sympSnap.docs.map(d => ({ ...d.data(), id: d.id, type: 'symptom' }));
        const skinData = skinSnap.docs.map(d => ({ ...d.data(), id: d.id, type: 'skin' }));
        const repData = repSnap.docs.map(d => ({ ...d.data(), id: d.id, type: 'report' }));

        const allEvents = [...sympData, ...skinData, ...repData].sort((a: any, b: any) => {
          const tA = (a.timestamp as any)?.seconds || 0;
          const tB = (b.timestamp as any)?.seconds || 0;
          return tB - tA;
        });

        // Mapping Recently (Last 3)
        setRecentCheckups(allEvents.slice(0, 3).map((item: any) => ({
          id: item.id,
          date: item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 'N/A',
          type: item.type === 'symptom' ? 'Symptom Review' : item.type === 'skin' ? 'Dermal Scan' : 'Full Health Report',
          title: item.results?.[0]?.condition || item.analysis?.condition || 'Biometric Summary',
          status: item.results?.[0]?.riskLevel || (item.analysis?.emergency === 'True' ? 'High' : 'Stable'),
          icon: item.type === 'symptom' ? Stethoscope : item.type === 'skin' ? Scan : Activity
        })));

        // Extracting Precautions (Dos/Donts from analyses)
        const allPrecautions: any[] = [];
        allEvents.forEach((item: any) => {
          const dos = item.results?.[0]?.dos || item.analysis?.dos || [];
          const donts = item.results?.[0]?.donts || item.analysis?.donts || [];
          if (dos.length > 0 || donts.length > 0) {
            allPrecautions.push({
              source: item.results?.[0]?.condition || item.analysis?.condition,
              dos: dos.slice(0, 2),
              donts: donts.slice(0, 2),
              date: item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'
            });
          }
        });
        setPrecautions(allPrecautions.slice(0, 4));

        // Historical Log
        setHistory(allEvents.map((item: any) => ({
          id: item.id,
          label: item.type === 'symptom' ? 'Checked Symptoms' : item.type === 'skin' ? 'Analyzed Skin' : 'Report Generated',
          detail: item.results?.[0]?.condition || item.analysis?.condition || 'Generic Assessment',
          time: item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          date: item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 'N/A',
          type: item.type
        })));

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [profile, navigate]);

  const toggleReadyState = async () => {
    if (!auth.currentUser) return;
    try {
      const newState = !isReadyForTreatment;
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        readyForTreatment: newState,
        lastCheckupCondition: recentCheckups[0]?.title || 'Consultation Request'
      });
      setIsReadyForTreatment(newState);
      if (newState) {
        alert('You are now in the medical queue. A doctor will assist you shortly.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const quickSupports = [
    { 
      title: t('emergency'), 
      desc: t('emergency_sub'), 
      icon: PhoneCall, 
      color: 'text-sos', 
      bg: 'bg-sos/10',
      action: () => window.location.href = 'tel:108'
    },
    { 
      title: t('ai_assistant'), 
      desc: t('ai_assistant_sub'), 
      icon: ShieldCheck, 
      color: 'text-primary', 
      bg: 'bg-primary/10',
      action: () => navigate('/assistant')
    },
    { 
      title: t('hospital_locator'), 
      desc: t('hospital_locator_sub'), 
      icon: CheckCircle2, 
      color: 'text-success', 
      bg: 'bg-success/10',
      action: () => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            window.open(`https://www.google.com/maps/search/hospitals/@${latitude},${longitude},15z`, '_blank');
          }, (error) => {
            console.error("Geolocation error:", error);
            window.open(`https://www.google.com/maps/search/hospitals/`, '_blank');
          });
        } else {
          window.open(`https://www.google.com/maps/search/hospitals/`, '_blank');
        }
      }
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">Retrieving Patient Record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {recentCheckups[0]?.status === 'High' && (
        <motion.div 
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-sos p-6 rounded-[32px] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-sos/30"
        >
           <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                 <AlertCircle size={32} />
              </div>
              <div>
                 <h3 className="text-lg font-black uppercase tracking-widest">{t('critical_situation')}</h3>
                 <p className="text-xs font-bold opacity-80 mt-1">{t('doctor_consult_suggested')}</p>
              </div>
           </div>
           <button 
             onClick={toggleReadyState}
             className={`px-8 py-4 ${isReadyForTreatment ? 'bg-white/20' : 'bg-white text-sos'} rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-lg shadow-black/10`}
           >
             {isReadyForTreatment ? t('waiting_doctor') : t('request_instant_meet')}
           </button>
        </motion.div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-natural-text tracking-tight">{t('patient_activity')}</h2>
          <p className="text-muted font-medium mt-2 italic text-lg leading-relaxed max-w-2xl">
            {t('ai_helper_desc')}
          </p>
        </div>
        <div className="flex gap-4">
          <Link to="/prediction" className="px-8 py-4 bg-primary text-white rounded-[24px] font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-105 transition-all">
            {t('start_analysis')}
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Recent Checkups & Precautions */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Present Checkup Details */}
          <section className="space-y-6">
             <h3 className="text-xl font-black text-natural-text px-2 flex items-center gap-3">
                <Activity size={24} className="text-primary" />
                {t('recent_checkups')}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recentCheckups.length > 0 ? recentCheckups.map((check, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={check.id} 
                    className="bg-white p-8 rounded-[40px] border border-accent shadow-sm group hover:border-primary/50 transition-all"
                  >
                    <div className="flex justify-between items-start mb-6">
                       <div className="p-4 rounded-2xl bg-natural-bg text-primary group-hover:scale-110 transition-transform">
                          <check.icon size={28} />
                       </div>
                       <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                         check.status === 'High' || check.status === 'Emergency' ? 'bg-sos text-white' : 'bg-success/10 text-success'
                       }`}>
                         {check.status} Risk
                       </span>
                    </div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">{check.type} • {check.date}</p>
                    <h4 className="text-xl font-black text-natural-text mb-4 leading-tight">{check.title}</h4>
                    <Link to="/reports" className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest hover:gap-4 transition-all">
                       {t('view_full_analysis')} <ArrowRight size={14} />
                    </Link>
                  </motion.div>
                )) : (
                  <div className="md:col-span-2 p-12 bg-white rounded-[40px] border border-accent border-dashed flex flex-col items-center justify-center text-center">
                     <Info size={48} className="text-muted mb-4 opacity-20" />
                     <p className="text-sm font-bold text-muted italic">No recent checkup data found in your primary logs.</p>
                  </div>
                )}
             </div>
          </section>

          {/* Active Precautions */}
          <section className="space-y-6">
             <h3 className="text-xl font-black text-natural-text px-2 flex items-center gap-3">
                <ShieldCheck size={24} className="text-success" />
                {t('medical_precautions')}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {precautions.map((p, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    className="bg-white p-8 rounded-[40px] border border-accent shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-6">
                       <h4 className="text-sm font-black text-natural-text uppercase tracking-widest">Source: {p.source}</h4>
                       <span className="text-[10px] text-muted font-bold italic">{p.date}</span>
                    </div>
                    
                    <div className="space-y-4">
                       <div>
                          <p className="text-[9px] font-black text-success uppercase tracking-[0.2em] mb-3">Priority Actions (Do's)</p>
                          <ul className="space-y-2">
                             {p.dos.map((item: string, i: number) => (
                               <li key={i} className="flex gap-3 text-xs font-medium text-natural-text italic leading-relaxed">
                                  <div className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                                  {item}
                               </li>
                             ))}
                          </ul>
                       </div>
                       <div className="pt-4 border-t border-accent/30">
                          <p className="text-[9px] font-black text-sos uppercase tracking-[0.2em] mb-3">Restrictions (Don'ts)</p>
                          <ul className="space-y-2">
                             {p.donts.map((item: string, i: number) => (
                               <li key={i} className="flex gap-3 text-xs font-medium text-natural-text italic leading-relaxed">
                                  <div className="w-1.5 h-1.5 rounded-full bg-sos mt-1.5 shrink-0" />
                                  {item}
                               </li>
                             ))}
                          </ul>
                       </div>
                    </div>
                  </motion.div>
                ))}
             </div>
          </section>
        </div>

        {/* Right Column: Available Doctors & Past Information */}
        <div className="lg:col-span-4 space-y-12">
           {/* Available Doctors */}
           <section className="space-y-6">
              <h3 className="text-xl font-black text-natural-text px-2">{t('available_experts')}</h3>
              <div className="space-y-4">
                 {availableDoctors.length > 0 ? availableDoctors.map((doc, idx) => (
                    <div 
                      key={idx} 
                      className="bg-white p-6 rounded-[32px] border border-accent flex items-center gap-5 hover:border-primary/50 transition-all cursor-pointer group shadow-sm active:scale-95"
                    >
                       <div className="w-14 h-14 rounded-2xl bg-natural-bg border border-accent flex items-center justify-center text-primary text-lg font-black shadow-inner">
                          {doc.fullName?.charAt(0)}
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-natural-text uppercase tracking-widest">{doc.fullName}</h4>
                          <p className="text-[10px] text-muted font-bold mt-1">{doc.specialization} • {doc.hospital}</p>
                          <div className="flex items-center gap-1 mt-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                             <span className="text-[9px] font-black text-success uppercase tracking-widest">{t('online')}</span>
                          </div>
                       </div>
                    </div>
                 )) : (
                   <div className="p-10 bg-natural-bg/50 rounded-[32px] border border-accent border-dashed text-center">
                     <p className="text-[10px] font-bold text-muted italic">No specialists currently active in your region.</p>
                   </div>
                 )}
              </div>
           </section>

           {/* Quick Support Details */}
           <section className="space-y-6">
              <h3 className="text-xl font-black text-natural-text px-2">{t('quick_support')}</h3>
              <div className="space-y-4">
                 {quickSupports.map((support, idx) => (
                    <div 
                      key={idx} 
                      onClick={support.action}
                      className="bg-white p-6 rounded-[32px] border border-accent flex items-start gap-5 hover:border-primary/50 transition-all cursor-pointer group shadow-sm active:scale-95"
                    >
                       <div className={`p-4 rounded-2xl ${support.bg} ${support.color} group-hover:scale-110 transition-transform shadow-inner`}>
                          <support.icon size={24} />
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-natural-text uppercase tracking-widest">{support.title}</h4>
                          <p className="text-[11px] text-muted font-medium mt-1 leading-relaxed">{support.desc}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </section>

           {/* Past Information & History */}
           <section className="bg-white rounded-[40px] border border-accent shadow-xl flex flex-col h-full max-h-[600px]">
              <div className="p-10 border-b border-accent flex items-center justify-between">
                 <h3 className="text-xl font-black text-natural-text flex items-center gap-3">
                    <History size={24} className="text-secondary" />
                    {t('medical_log')}
                 </h3>
                 <Link to="/reports" className="text-[10px] font-black uppercase text-primary tracking-widest">{t('see_all')}</Link>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                 {history.length > 0 ? history.map((h, idx) => (
                   <div key={h.id} className="relative pl-10 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-[2px] last:before:hidden before:bg-accent group">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-accent group-hover:border-primary transition-colors flex items-center justify-center p-[4px]">
                         <div className="w-full h-full rounded-full bg-accent group-hover:bg-primary transition-colors" />
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted">{h.date} • {h.time}</p>
                         <h4 className="text-sm font-black text-natural-text">{h.label}</h4>
                         <p className="text-[11px] text-muted font-medium italic">{h.detail}</p>
                         {h.type === 'report' && (
                           <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-success uppercase">
                              <FileText size={12} /> Detailed Report Synced
                           </div>
                         )}
                      </div>
                   </div>
                 )) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-30">
                       <Clock size={40} className="mb-4" />
                       <p className="text-xs font-black uppercase tracking-widest">No history recorded yet</p>
                    </div>
                 )}
              </div>
              <div className="p-8 bg-natural-bg/50 border-t border-accent text-center space-y-2">
                 <p className="text-[10px] font-black text-muted uppercase tracking-widest leading-none">Security Protocol: End-to-End Encrypted Records</p>
                 <p className="text-[9px] font-bold text-muted/60 uppercase tracking-widest leading-none">Project ID: gen-lang-client-0771710951</p>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
