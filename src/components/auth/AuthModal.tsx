import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  UtensilsCrossed,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChefHat,
  ArrowRight,
} from 'lucide-react';
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  googleProvider,
} from '../../firebase/config';
import { restaurantService } from '../../services/restaurantService';
import { Restaurant } from '../../types';

interface AuthModalProps {
  onSuccess: (restaurant: Restaurant) => void;
  onExploreAsCustomer?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, onExploreAsCustomer }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [ownerName, setOwnerName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCred.user;

      let rest = await restaurantService.getRestaurantByOwnerId(user.uid);
      if (!rest) {
        rest = await restaurantService.createRestaurantForOwner({
          ownerId: user.uid,
          ownerName: user.displayName || 'Restaurant Owner',
          restaurantName: 'My Restaurant',
        });
      }
      onSuccess(rest);
    } catch (err: unknown) {
      console.error('Sign-in error:', err);
      const code = (err as { code?: string }).code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setErrorMessage('Invalid email or password. Please verify credentials or switch to Sign Up.');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMessage('Too many failed login attempts. Please try again in a few minutes.');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Login failed. Please check network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!ownerName.trim()) {
      setErrorMessage("Please enter the owner's full name.");
      return;
    }
    if (!restaurantName.trim()) {
      setErrorMessage('Please enter your restaurant name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCred.user;

      await updateProfile(user, { displayName: ownerName.trim() });

      const newRest = await restaurantService.createRestaurantForOwner({
        ownerId: user.uid,
        ownerName: ownerName.trim(),
        restaurantName: restaurantName.trim(),
      });

      onSuccess(newRest);
    } catch (err: unknown) {
      console.error('Sign-up error:', err);
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        setErrorMessage('An account with this email already exists. Please log in instead.');
      } else if (code === 'auth/weak-password') {
        setErrorMessage('The password is too weak. Please choose a stronger password.');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('The email address is improperly formatted.');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Evaluation Login
  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const rest = await restaurantService.getRestaurant('rest-the-spice-pavilion');
      if (rest) {
        onSuccess(rest);
      } else {
        const demoRest = await restaurantService.createRestaurantForOwner({
          ownerId: 'demo-owner-123',
          ownerName: 'Chef Sanjay',
          restaurantName: 'The Spice Pavilion',
        });
        onSuccess(demoRest);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient lighting glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-amber-500/10 to-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0F172A] border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 glass-card">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 p-[1px] shadow-lg shadow-amber-500/25 mx-auto mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
              <UtensilsCrossed className="w-7 h-7 text-amber-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SmartServe</h1>
          <p className="text-xs text-amber-400 font-bold tracking-wide mt-0.5">
            Scan. Order. Serve.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {isSignUp ? 'Create your restaurant owner terminal' : 'Log in to manage orders, catalog, and QR tables'}
          </p>
        </div>

        {/* Tab switcher: Log In vs Sign Up */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/[0.08] mb-5">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              !isSignUp
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              isSignUp
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-3.5">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Owner Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanjay Dhumal"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.1] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Restaurant Name</label>
                <div className="relative">
                  <UtensilsCrossed className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Spice Pavilion"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.1] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                placeholder="owner@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-white/[0.1] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/[0.1] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.1] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all mt-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <LogIn className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>{isSignUp ? 'Create Restaurant Account' : 'Sign In to Dashboard'}</span>
          </button>
        </form>

        {/* Evaluator 1-Click Login & Customer Explore */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-2">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <ChefHat className="w-4 h-4 text-amber-400" />
            <span>1-Click Evaluator Demo Sign In</span>
          </button>

          {onExploreAsCustomer && (
            <button
              type="button"
              onClick={onExploreAsCustomer}
              className="w-full py-2 px-3 rounded-xl text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Or explore as Guest Diner at Table 2</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
