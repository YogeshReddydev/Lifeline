import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { User, Mail, Lock, Loader2, Hospital, Shield, UserCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { UserRole } from '../types';
import Logo from '../components/Logo';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [hospital, setHospital] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [isGoogleLinking, setIsGoogleLinking] = useState(false);

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!profileDoc.exists()) {
        setIsGoogleLinking(true);
        return;
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Google Signup Error:', err);
      const errorCode = err.code || '';
      const errorMessage = err.message || '';
      
      if (errorCode === 'auth/popup-closed-by-user' || errorMessage.includes('popup-closed-by-user')) {
        setError('Registration window was closed before completion. Please try again or check your popup blocker settings.');
      } else if (errorCode === 'auth/email-already-in-use' || errorMessage.includes('email-already-in-use')) {
        setError('Medical ID already registered. Please proceed to the login portal.');
      } else if (errorCode === 'auth/operation-not-allowed' || errorMessage.includes('operation-not-allowed')) {
        setError('Google SSO is currently misconfigured. Contact system administrator.');
      } else {
        setError('Identity synchronization failed. ' + (errorMessage.replace('Firebase:', '').trim() || 'Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const completeGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      const user = auth.currentUser;
      const isAdmin = user.email === 'yampaatiyogeshpavan@gmail.com';

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: user.displayName || 'User',
        email: user.email,
        role: isAdmin ? 'admin' : role,
        specialization: role === 'doctor' ? specialization : undefined,
        qualification: role === 'doctor' ? qualification : undefined,
        hospital: role === 'doctor' ? hospital : undefined,
        isAvailable: role === 'doctor' ? true : undefined,
        guardianCode: role === 'patient' ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined,
        linkedPatients: [],
        linkedGuardians: [],
        createdAt: new Date().toISOString()
      });

      navigate('/dashboard');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      const isAdmin = email === 'yampaatiyogeshpavan@gmail.com';
      const profileData = {
        uid: user.uid,
        name,
        email,
        role: isAdmin ? 'admin' : role,
        specialization: role === 'doctor' ? specialization : undefined,
        qualification: role === 'doctor' ? qualification : undefined,
        hospital: role === 'doctor' ? hospital : undefined,
        isAvailable: role === 'doctor' ? true : undefined,
        guardianCode: role === 'patient' ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined,
        linkedPatients: [],
        linkedGuardians: [],
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), profileData);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Signup Error:', err);
      const errorCode = err.code || '';
      if (errorCode === 'auth/operation-not-allowed' || err.message.includes('operation-not-allowed')) {
        setError('Email/Password registration is currently disabled by the administrator. Please use the Google SSO option below or enable "Email/Password" in the Firebase Console (Authentication > Sign-in method).');
      } else if (errorCode === 'auth/email-already-in-use' || (err.message && err.message.includes('email-already-in-use'))) {
        setError('Medical ID already registered. Please proceed to the login portal.');
      } else {
        setError(err.message ? err.message.replace('Firebase:', '').trim() : 'System synchronization failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-accent border border-accent">
        {isGoogleLinking ? (
          <div className="space-y-8">
            <div className="text-center">
              <Shield className="mx-auto text-primary mb-4" size={48} />
              <h2 className="text-3xl font-black text-natural-text uppercase tracking-tight">Finalize Identity</h2>
              <p className="text-muted font-medium mt-2">Specify your clinical role to access optimized features.</p>
            </div>

            <form onSubmit={completeGoogleProfile} className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-2 bg-natural-bg rounded-2xl border border-accent">
                <button
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    role === 'patient' ? 'bg-white text-primary shadow-sm' : 'text-muted opacity-60'
                  }`}
                >
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setRole('doctor')}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    role === 'doctor' ? 'bg-white text-primary shadow-sm' : 'text-muted opacity-60'
                  }`}
                >
                  Doctor
                </button>
              </div>

              {role === 'doctor' && (
                <div className="space-y-4 pt-4 border-t border-accent">
                  <input
                    type="text"
                    required
                    placeholder="Specialization (e.g. Cardiologist)"
                    className="w-full px-4 py-3 bg-natural-bg border border-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Qualifications (e.g. MBBS, MD)"
                    className="w-full px-4 py-3 bg-natural-bg border border-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Current Hospital/Clinic"
                    className="w-full px-4 py-3 bg-natural-bg border border-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Proceed to Console'}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-8 mb-10">
              <Logo hideText className="scale-110" iconSize={28} />
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-black text-natural-text tracking-tight italic">Medical Identity</h1>
                <p className="text-muted font-medium">Join Lifeline AI and start your smarter health journey</p>
              </div>
            </div>

            {error && (
              <div className="p-4 mb-6 bg-sos/10 text-sos rounded-2xl text-xs font-black border border-sos/20 uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="text"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-natural-bg border border-accent rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-natural-bg border border-accent rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full pl-12 pr-4 py-4 bg-natural-bg border border-accent rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-black text-muted uppercase tracking-widest ml-1 text-center block">I am joining as a...</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'patient', label: 'Patient', icon: <UserCircle /> },
                  { id: 'guardian', label: 'Guardian', icon: <Shield /> },
                  { id: 'doctor', label: 'Medical Doctor', icon: <Hospital /> },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id as UserRole)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      role === r.id 
                        ? 'bg-accent/30 border-primary text-primary shadow-sm' 
                        : 'bg-natural-bg border-accent text-muted hover:border-muted/50'
                    }`}
                  >
                    <div className={`${role === r.id ? 'text-primary' : 'text-muted'}`}>
                      {r.icon}
                    </div>
                    <span className="font-bold uppercase tracking-widest text-xs">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {role === 'doctor' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-2 border-t border-accent"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Specialization</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-natural-bg border border-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm"
                    placeholder="e.g. Cardiologist"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Qualification</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-natural-bg border border-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm"
                    placeholder="e.g. MBBS, MD"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Current Hospital/Clinic</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-natural-bg border border-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm"
                    placeholder="e.g. Apollo Hospital"
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                  />
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-accent"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black">
                <span className="bg-white px-4 text-muted">Or sign up with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full py-4 border-2 border-accent rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-natural-bg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              Continue with Google
            </button>
          </div>
        </form>
        <div className="mt-10 text-center text-xs font-bold text-muted uppercase tracking-widest">
          Already have an account? <Link to="/login" className="text-primary font-black hover:underline ml-1">Sign In</Link>
        </div>
      </>
    )}
  </div>
</div>
  );
}
