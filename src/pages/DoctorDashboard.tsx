import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  MessageSquare, 
  Video, 
  Activity, 
  Clock, 
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
  Shield,
  ToggleLeft as Toggle,
  Power
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { useLanguage } from '../lib/LanguageContext';

export default function DoctorDashboard() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  useEffect(() => {
    // Initial fetch of doctor's availability
    const fetchDocProfile = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setIsAvailable(docSnap.data().isAvailable !== false);
        }
      }
    };
    fetchDocProfile();

    // Real-time listener for patients ready for treatment
    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'patient'), 
      where('readyForTreatment', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPatients(patientList);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users');
    });

    return () => unsubscribe();
  }, []);

  const handleConnect = async (patientId: string) => {
    // In a real app, this would initiate a call or consultation
    alert('Connecting to patient for instant consultation...');
  };

  const handleToggleAvailability = async () => {
    if (!auth.currentUser || updatingAvailability) return;
    
    setUpdatingAvailability(true);
    const newStatus = !isAvailable;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isAvailable: newStatus
      });
      setIsAvailable(newStatus);
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update status. Synchronize connection and try again.');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.lastCheckupCondition?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">Awaiting Patient Signals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-accent pb-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="text-primary" size={24} />
            </div>
            <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em]">Institutional Access</h2>
          </div>
          <h2 className="text-5xl font-black text-natural-text tracking-tight">Clinical Monitoring Console</h2>
          <p className="text-muted font-medium mt-4 italic text-lg leading-relaxed">
            Welcome to the professional synchronization interface. This high-security console is designed for 
            certified medical professionals to monitor live patient signals, review AI-generated triage 
            pre-assessments, and provide immediate clinical intervention for high-priority medical cases 
            through encrypted instant video synchronization.
          </p>
        </div>

        <button
          onClick={handleToggleAvailability}
          disabled={updatingAvailability}
          className={`flex items-center gap-4 px-8 py-5 rounded-[32px] border-2 transition-all group relative overflow-hidden ${
            isAvailable 
              ? 'bg-success/5 border-success/20 text-success' 
              : 'bg-muted/5 border-muted/20 text-muted grayscale'
          }`}
        >
          <div className="relative z-10 flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isAvailable ? 'bg-success/10' : 'bg-muted/10'}`}>
              <Power size={20} className={updatingAvailability ? 'animate-spin' : ''} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Status Override</p>
              <p className="text-sm font-black uppercase tracking-widest">{isAvailable ? 'Live & Connected' : 'Offline Mode'}</p>
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ml-4 shadow-sm ${isAvailable ? 'bg-success animate-pulse' : 'bg-muted'}`} />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-10">
          {/* Active Queue Status */}
          <div className="flex flex-wrap gap-4">
             <div className="px-6 py-4 bg-white border border-accent rounded-3xl shadow-sm flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-success animate-pulse' : 'bg-muted'}`} />
                <span className="text-xs font-black uppercase tracking-widest text-natural-text">
                  Live System Status: {isAvailable ? 'Secured' : 'Dormant'}
                </span>
             </div>
             <div className="px-6 py-4 bg-white border border-accent rounded-3xl shadow-sm flex items-center gap-4">
                <Users size={18} className="text-primary" />
                <span className="text-xs font-black uppercase tracking-widest text-natural-text">
                  {isAvailable ? filteredPatients.length : 0} Patients in Queue
                </span>
             </div>
          </div>
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-black text-natural-text flex items-center gap-3">
                <Users size={24} className="text-primary" />
                Waiting Patients
                {isAvailable && (
                  <span className="ml-2 px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
                    {filteredPatients.length} ACTIVE
                  </span>
                )}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {isAvailable && filteredPatients.length > 0 ? filteredPatients.map((patient, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={patient.id}
                  className="bg-white p-8 rounded-[40px] border border-accent shadow-sm hover:border-primary/30 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-8"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[24px] bg-natural-bg border border-accent flex items-center justify-center text-primary text-xl font-black shadow-inner">
                      {patient.name?.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-natural-text">{patient.name}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1">
                          <Clock size={12} /> Waiting for 5m
                        </span>
                        <span className="px-3 py-1 bg-sos/10 text-sos text-[10px] font-black rounded-full uppercase tracking-widest">
                          Critical Priority
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 md:max-w-xs">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">Detected Condition</p>
                    <p className="text-sm font-bold text-natural-text bg-natural-bg px-4 py-2 rounded-xl border border-accent">
                      {patient.lastCheckupCondition || 'General Inquiry'}
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleConnect(patient.id)}
                      className="px-6 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-primary/20"
                    >
                      <Video size={16} /> Instant Meet
                    </button>
                    <button className="p-4 bg-white border border-accent rounded-2xl text-muted hover:text-primary transition-all">
                      <MessageSquare size={20} />
                    </button>
                  </div>
                </motion.div>
              )) : (
                <div className="p-20 bg-white rounded-[40px] border border-accent border-dashed flex flex-col items-center justify-center text-center">
                  <Activity size={48} className="text-muted mb-4 opacity-20" />
                  <p className="text-sm font-bold text-muted italic">
                    {!isAvailable 
                      ? 'System is currently set to Offline mode. Re-establish connection to sync patient queue.' 
                      : 'The queue is currently clear. No patients awaiting treatment.'}
                  </p>
                </div>
              )}
            </div>
          </div>

        {/* Sidebar Stats */}
        <div className="space-y-8">
          <section className="bg-white p-8 rounded-[40px] border border-accent shadow-sm">
            <h3 className="text-sm font-black text-natural-text uppercase tracking-widest mb-6">Clinic Dynamics</h3>
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-natural-bg border border-accent">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Queue Saturation</p>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-natural-text">
                    {!isAvailable ? 'Dormant' : (patients.length > 5 ? 'High' : 'Optimal')}
                  </span>
                  <Activity size={20} className={!isAvailable ? 'text-muted' : (patients.length > 5 ? 'text-sos' : 'text-success')} />
                </div>
              </div>
              <div className="p-6 rounded-3xl bg-natural-bg border border-accent">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Critical Response Time</p>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-natural-text">45s</span>
                  <Zap size={20} className="text-primary" />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-natural-text p-8 rounded-[40px] border border-accent/10 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-white">
              <Shield className="text-primary" size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest">Medical Protocol v4.0</h3>
            </div>
            <p className="text-xs font-medium text-white/70 italic leading-relaxed">
              Always authenticate patient identification via neural signatures and cross-reference AI diagnostic reports 
              with verified hospital records before issuing critical prescriptions. Secure meeting links are valid for 
              30 minutes post-generation.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
