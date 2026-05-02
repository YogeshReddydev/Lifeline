import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in database
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        // If profile doesn't exist, we should redirect to signup to choose role
        navigate('/signup');
        return;
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Google Login Error:', err);
      const errorCode = err.code || '';
      const errorMessage = err.message || '';
      
      if (errorCode === 'auth/popup-closed-by-user' || errorMessage.includes('popup-closed-by-user')) {
        setError('Sign-in window was closed before completion. Please try again or check your popup blocker settings.');
      } else {
        setError('Google Sign-In failed. ' + (errorMessage.replace('Firebase:', '').trim() || 'Please ensure you have a registered account.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login Error:', err);
      const errorCode = err.code || '';
      const errorMessage = err.message || '';

      if (errorCode === 'auth/operation-not-allowed' || errorMessage.includes('operation-not-allowed')) {
        setError('Email/Password access is currently disabled by the administrator. Please enable "Email/Password" in the Firebase Console (Authentication > Sign-in method) or use the Google SSO option below.');
      } else if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential' || errorMessage.includes('invalid-credential')) {
        setError('Authorization failed. Invalid Medical ID or security credentials.');
      } else if (errorCode === 'auth/too-many-requests') {
        setError('System overload detected. Access temporarily throttled. Retry in 180s.');
      } else {
        setError('Portal synchronization failed. Check connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-accent border border-accent">
        <div className="flex flex-col items-center gap-8 mb-10">
          <Logo hideText className="scale-125" iconSize={32} />
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-black text-natural-text">Welcome Back</h1>
            <p className="text-muted font-medium">Enter your credentials to access your portal</p>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-sos/10 text-sos rounded-2xl text-xs font-black border border-sos/20 uppercase tracking-widest text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-muted uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-4 bg-natural-bg border border-accent rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-black text-muted uppercase tracking-widest font-bold">Password</label>
              <a href="#" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Forgot?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-4 bg-natural-bg border border-accent rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 shadow-lg shadow-primary/20"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                Sign In
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-accent"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black">
              <span className="bg-white px-4 text-muted">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 border-2 border-accent rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-natural-bg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Continue with Google
          </button>
        </div>

        <div className="mt-10 text-center text-xs font-bold text-muted uppercase tracking-widest">
          Don't have an account? <Link to="/signup" className="text-primary font-black hover:underline ml-1">Sign up free</Link>
        </div>
      </div>
    </div>
  );
}
