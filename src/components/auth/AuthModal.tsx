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

      // Find or create restaurant profile for this owner
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
        setErrorMessage('Invalid email or password. Please verify your credentials or create a new account.');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMessage('Too many failed login attempts. Please try again in a few minutes.');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Login failed. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
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

      // Update auth profile displayName
      await updateProfile(user, { displayName: ownerName.trim() });

      // Create restaurant profile in Firestore linked to owner UID
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
        setErrorMessage('An account with this email address already exists. Please log in instead.');
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

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      const user = userCred.user;
      let rest = await restaurantService.getRestaurantByOwnerId(user.uid);
      if (!rest) {
        rest = await restaurantService.createRestaurantForOwner({
          ownerId: user.uid,
          ownerName: user.displayName || 'Restaurant Owner',
          restaurantName: `${user.displayName || 'Owner'}'s Bistro`,
        });
      }
      onSuccess(rest);
    } catch (err: unknown) {
      console.warn('Google sign-in popup issue:', err);
      setErrorMessage('Google Sign-In popup could not complete. You can sign up using Email & Password below.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Demo Login for Hackathon Evaluators
  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      // Use demo restaurant
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 mx-auto mb-3">
            <UtensilsCrossed className="w-7 h-7 text-slate-950" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SmartServe</h1>
          <p className="text-xs text-amber-400 font-semibold tracking-wide mt-0.5">
            Scan. Order. Serve.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {isSignUp ? 'Create your restaurant owner account' : 'Log in to manage orders, menus, and tables'}
          </p>
        </div>

        {/* Tab switcher: Sign In vs Sign Up */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              !isSignUp ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
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
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isSignUp ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-3.5">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Owner Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
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
                    placeholder="e.g. Royal Punjab Dhaba"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
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
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-98"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Restaurant Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In to Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-slate-900 px-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Or Quick Options
          </span>
        </div>

        {/* Google & Demo Options */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold py-2.5 rounded-xl border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click Hackathon Evaluator Login (The Spice Pavilion)</span>
          </button>
        </div>

        {/* Explore customer menu without login */}
        {onExploreAsCustomer && (
          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onExploreAsCustomer}
              className="text-xs text-slate-400 hover:text-white underline font-semibold"
            >
              Testing as a customer? View Table QR Menu ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
