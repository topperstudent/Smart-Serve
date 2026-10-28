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
  ChefHat,
  ArrowRight,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  Copy,
  Globe,
  ExternalLink,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from '../../firebase/config';
import { restaurantService } from '../../services/restaurantService';
import { Restaurant } from '../../types';

interface AuthModalProps {
  onSuccess: (restaurant: Restaurant) => void;
  onExploreAsCustomer?: () => void;
}

interface DetailedAuthError {
  code?: string;
  title: string;
  message: string;
  suggestion?: string;
  actionLabel?: string;
  actionFn?: () => void;
  rawError?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, onExploreAsCustomer }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailedError, setDetailedError] = useState<DetailedAuthError | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form states
  const [ownerName, setOwnerName] = useState('Sanjay Dhumal');
  const [restaurantName, setRestaurantName] = useState('The Spice Pavilion');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Reset/Clean confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [domainCopied, setDomainCopied] = useState(false);

  // Parse exact Firebase errors into friendly, transparent explanations
  const parseAuthError = (err: unknown, context: 'login' | 'signup' | 'google' | 'reset'): DetailedAuthError => {
    console.error(`Auth Error [${context}]:`, err);
    const code = (err as { code?: string }).code || '';
    const rawMessage = err instanceof Error ? err.message : String(err);

    // 1. Email/Password provider disabled in Firebase console
    if (code === 'auth/operation-not-allowed') {
      return {
        code,
        title: 'Email/Password Provider Disabled in Firebase',
        message:
          'Email and password sign-in has not been turned on in your Firebase Project Console.',
        suggestion:
          "Use 'Continue with Google' or '1-Click Instant Owner Access' below — both allow you to log in immediately without configuration.",
        actionLabel: 'Sign in with Google',
        actionFn: () => handleGoogleSignIn(),
        rawError: rawMessage,
      };
    }

    // 2. Email already in use
    if (code === 'auth/email-already-in-use') {
      return {
        code,
        title: 'Account Already Exists',
        message: `An account registered with "${email.trim()}" already exists in the system.`,
        suggestion: 'Please switch to Log In to enter your password, or use Google Sign-In.',
        actionLabel: 'Switch to Log In with this Email',
        actionFn: () => {
          setIsSignUp(false);
          setDetailedError(null);
        },
        rawError: rawMessage,
      };
    }

    // 3. Incorrect credentials (Firebase v10+ unified error)
    if (code === 'auth/invalid-credential') {
      return {
        code,
        title: 'Invalid Email or Password',
        message: 'The email address or password you entered does not match our records.',
        suggestion:
          'Please verify your password spelling. If you have not created an account yet, switch to Sign Up.',
        actionLabel: 'Create New Account (Sign Up)',
        actionFn: () => {
          setIsSignUp(true);
          setDetailedError(null);
        },
        rawError: rawMessage,
      };
    }

    // 4. Wrong password
    if (code === 'auth/wrong-password') {
      return {
        code,
        title: 'Incorrect Password',
        message: 'The password you entered is incorrect for this email account.',
        suggestion: 'Check if Caps Lock is active, or click "Forgot Password" to receive a reset link.',
        actionLabel: 'Send Password Reset Link',
        actionFn: () => handleForgotPassword(),
        rawError: rawMessage,
      };
    }

    // 5. User not found
    if (code === 'auth/user-not-found') {
      return {
        code,
        title: 'No Account Found',
        message: `No user account was found with the email "${email.trim()}".`,
        suggestion: 'Please check for typos in the email address, or create a new account in the Sign Up tab.',
        actionLabel: 'Switch to Sign Up',
        actionFn: () => {
          setIsSignUp(true);
          setDetailedError(null);
        },
        rawError: rawMessage,
      };
    }

    // 6. Weak password
    if (code === 'auth/weak-password') {
      return {
        code,
        title: 'Password Is Too Weak',
        message: 'Firebase Authentication requires passwords to be at least 6 characters long.',
        suggestion: 'Please use at least 6 characters with a combination of letters and numbers.',
        rawError: rawMessage,
      };
    }

    // 7. Invalid email format
    if (code === 'auth/invalid-email') {
      return {
        code,
        title: 'Invalid Email Format',
        message: `"${email}" does not appear to be a valid email address.`,
        suggestion: 'Please enter a valid format such as name@example.com.',
        rawError: rawMessage,
      };
    }

    // 8. Too many failed attempts
    if (code === 'auth/too-many-requests') {
      return {
        code,
        title: 'Too Many Failed Attempts (Temporarily Locked)',
        message: 'Access to this account has been temporarily disabled due to multiple failed login attempts.',
        suggestion: 'Please wait 2 to 3 minutes before trying again, or use "Continue with Google".',
        actionLabel: 'Sign in with Google',
        actionFn: () => handleGoogleSignIn(),
        rawError: rawMessage,
      };
    }

    // 9. Popup closed or blocked
    if (code === 'auth/popup-closed-by-user') {
      return {
        code,
        title: 'Google Sign-In Cancelled',
        message: 'The Google authentication popup window was closed before finishing.',
        suggestion: 'Click "Continue with Google" again and select your Google account in the popup.',
        rawError: rawMessage,
      };
    }

    if (code === 'auth/popup-blocked') {
      return {
        code,
        title: 'Browser Popup Blocked',
        message: 'Your browser blocked the Google authentication popup window.',
        suggestion: 'Please allow popups for this site, or use the 1-Click Instant Owner Access below.',
        rawError: rawMessage,
      };
    }

    // 10. Network error
    if (code === 'auth/network-request-failed') {
      return {
        code,
        title: 'Network Connection Issue',
        message: 'Unable to reach Firebase authentication servers.',
        suggestion: 'Please verify your internet connection and retry.',
        rawError: rawMessage,
      };
    }

    // 11. Domain not whitelisted in Firebase Console
    if (code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'preview-domain';
      return {
        code,
        title: 'Preview Domain Not Whitelisted in Firebase Console',
        message: `Firebase blocks Google popup sign-in on domains that haven't been added to your Firebase project's Authorized Domains whitelist. This is NOT because you need to buy a custom domain!`,
        suggestion: `You can either copy your preview domain (${currentHost}) and add it to Firebase Console (under Authentication > Settings > Authorized domains), OR use the 1-Click Instant Owner Access below to enter your workspace immediately without any setup.`,
        actionLabel: 'Enter Instantly with 1-Click Owner Access',
        actionFn: () => handleInstantOwnerLogin(),
        rawError: rawMessage,
      };
    }

    // Default fallback
    return {
      code: code || 'auth/unknown',
      title: 'Authentication Notice',
      message: rawMessage || 'An unexpected error occurred during authentication.',
      suggestion: 'You can use the 1-Click Instant Owner Access below to enter your restaurant workspace immediately.',
      rawError: rawMessage,
    };
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setDetailedError(null);
    setSuccessNotice(null);
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      let rest = await restaurantService.getRestaurantByOwnerId(user.uid);
      if (!rest) {
        rest = await restaurantService.createRestaurantForOwner({
          ownerId: user.uid,
          ownerName: user.displayName || ownerName || 'Restaurant Owner',
          restaurantName: restaurantName || (user.displayName ? `${user.displayName}'s Restaurant` : 'SmartServe Restaurant'),
        });
      }
      onSuccess(rest);
    } catch (err: unknown) {
      setDetailedError(parseAuthError(err, 'google'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Email/Password Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailedError(null);
    setSuccessNotice(null);

    if (!email.trim()) {
      setDetailedError({
        title: 'Email Required',
        message: 'Please enter your email address to sign in.',
        rawError: 'Missing email',
      });
      return;
    }

    if (!password) {
      setDetailedError({
        title: 'Password Required',
        message: 'Please enter your password to sign in.',
        rawError: 'Missing password',
      });
      return;
    }

    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCred.user;

      let rest = await restaurantService.getRestaurantByOwnerId(user.uid);
      if (!rest) {
        rest = await restaurantService.createRestaurantForOwner({
          ownerId: user.uid,
          ownerName: user.displayName || 'Restaurant Owner',
          restaurantName: restaurantName || 'The Spice Pavilion',
        });
      }
      onSuccess(rest);
    } catch (err: unknown) {
      setDetailedError(parseAuthError(err, 'login'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Email/Password Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailedError(null);
    setSuccessNotice(null);

    if (!ownerName.trim()) {
      setDetailedError({
        title: 'Owner Name Required',
        message: 'Please enter the owner full name.',
        rawError: 'Missing ownerName',
      });
      return;
    }
    if (!restaurantName.trim()) {
      setDetailedError({
        title: 'Restaurant Name Required',
        message: 'Please enter the restaurant name.',
        rawError: 'Missing restaurantName',
      });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setDetailedError({
        title: 'Valid Email Required',
        message: 'Please enter a valid email address (e.g. name@restaurant.com).',
        rawError: 'Invalid email',
      });
      return;
    }
    if (password.length < 6) {
      setDetailedError({
        title: 'Password Too Short',
        message: 'Password must be at least 6 characters long.',
        suggestion: 'Please enter at least 6 characters.',
        rawError: 'Password length < 6',
      });
      return;
    }
    if (password !== confirmPassword) {
      setDetailedError({
        title: 'Passwords Do Not Match',
        message: 'The password and confirmation password do not match.',
        suggestion: 'Please re-enter both passwords identically.',
        rawError: 'Password mismatch',
      });
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
      setDetailedError(parseAuthError(err, 'signup'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setDetailedError({
        title: 'Email Address Needed',
        message: 'Please enter your email address into the Email field first.',
        suggestion: 'Type your registered email and click "Forgot Password" again.',
        rawError: 'Email field was empty for password reset',
      });
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setDetailedError(null);
      setSuccessNotice(`Password reset instructions have been sent to ${email.trim()}. Please check your email inbox.`);
    } catch (err: unknown) {
      setDetailedError(parseAuthError(err, 'reset'));
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Instant Owner Access (Guaranteed to work in all environments)
  const handleInstantOwnerLogin = async () => {
    setDetailedError(null);
    setSuccessNotice(null);
    setLoading(true);

    try {
      const ownerId = 'owner-sanjay-spice-pavilion';
      let rest = await restaurantService.getRestaurantByOwnerId(ownerId);
      if (!rest) {
        rest = await restaurantService.createRestaurantForOwner({
          ownerId,
          ownerName: ownerName.trim() || 'Sanjay Dhumal',
          restaurantName: restaurantName.trim() || 'The Spice Pavilion',
        });
      }
      onSuccess(rest);
    } catch (err: unknown) {
      console.error('Instant owner login error:', err);
      const fallbackRest = await restaurantService.getRestaurant('rest-the-spice-pavilion');
      if (fallbackRest) {
        onSuccess(fallbackRest);
      }
    } finally {
      setLoading(false);
    }
  };

  // Complete Local Storage & Cached Data Reset (Fresh Slate)
  const handleWipeAndReset = () => {
    restaurantService.clearAllLocalSessionsAndData();
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDetailedError(null);
    setShowResetConfirm(false);
    setSuccessNotice('All local session caches and previous test records have been wiped clean! You are starting with a pristine fresh state.');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center p-4 relative font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background ambient subtle warmth */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-gradient-to-tr from-amber-200/30 via-orange-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 relative z-10">
        {/* Brand header */}
        <div className="text-center mb-5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-md shadow-amber-500/20 mx-auto mb-3 flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SmartServe</h1>
          <p className="text-xs text-amber-600 font-bold tracking-wider uppercase mt-1">
            Scan • Order • Serve
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {isSignUp ? 'Register restaurant owner account' : 'Log in to manage live orders, catalog & QR floor plans'}
          </p>
        </div>

        {/* Tab switcher: Log In vs Sign Up */}
        <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200 mb-4">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setDetailedError(null);
              setSuccessNotice(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              !isSignUp
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setDetailedError(null);
              setSuccessNotice(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              isSignUp
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Success Notice */}
        {successNotice && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
            <div className="leading-relaxed font-medium">{successNotice}</div>
          </div>
        )}

        {/* Comprehensive Transparent Error Alert */}
        {detailedError && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold text-rose-950 text-xs">{detailedError.title}</p>
                <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">{detailedError.message}</p>
              </div>
            </div>

            {detailedError.suggestion && (
              <div className="pl-6 text-[11px] text-rose-700 bg-rose-100/50 p-2 rounded-xl border border-rose-200/60">
                <span className="font-bold">Suggestion: </span>
                {detailedError.suggestion}
              </div>
            )}

            {/* Domain Whitelist Helper Box for auth/unauthorized-domain */}
            {detailedError.code === 'auth/unauthorized-domain' && typeof window !== 'undefined' && (
              <div className="pl-6 pt-1 space-y-2">
                <div className="bg-white border border-rose-200 rounded-xl p-3 text-[11px] text-slate-800 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-rose-950 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-rose-600" />
                      <span>Current Preview Hostname:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.hostname);
                        setDomainCopied(true);
                        setTimeout(() => setDomainCopied(false), 3000);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] border border-rose-200 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{domainCopied ? 'Copied to Clipboard!' : 'Copy Hostname'}</span>
                    </button>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg font-mono text-[10px] text-slate-700 break-all select-all border border-slate-200">
                    {window.location.hostname}
                  </div>
                  <div className="text-[10px] text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">How to whitelist in Firebase Console (30 seconds):</p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>Go to Firebase Console &rarr; <b>Authentication</b> &rarr; <b>Settings</b> tab.</li>
                      <li>Scroll down to <b>Authorized domains</b> and click <b>Add domain</b>.</li>
                      <li>Paste the hostname above and click <b>Save</b>.</li>
                    </ol>
                    <p className="text-slate-500 italic pt-1">
                      Note: You do NOT need to buy a domain! Firebase allows any preview or cloud hostname for free.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {detailedError.actionLabel && detailedError.actionFn && (
              <div className="pl-6 pt-1">
                <button
                  type="button"
                  onClick={detailedError.actionFn}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <span>{detailedError.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Exact Firebase Error Code Tag for complete transparency */}
            {detailedError.code && (
              <div className="pl-6 pt-1 flex items-center gap-1.5 text-[10px] text-rose-600 font-mono">
                <span className="bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                  Firebase Code: {detailedError.code}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Primary Google Sign-In Option */}
        <div className="space-y-3 mb-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-xs hover:border-slate-300 transition-all cursor-pointer active:scale-[0.99]"
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

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider relative">
              Or with email
            </span>
          </div>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-3">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Owner Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanjay Dhumal"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Restaurant Name</label>
                <div className="relative">
                  <UtensilsCrossed className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Spice Pavilion"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="sanjaydhumal7567@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Password</label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold cursor-pointer"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Re-type your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer mt-1"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : isSignUp ? (
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <LogIn className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>{isSignUp ? 'Create Restaurant Account' : 'Sign In with Email'}</span>
          </button>
        </form>

        {/* 1-Click Instant Owner Login & Fresh Clean Slate */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={handleInstantOwnerLogin}
            disabled={loading}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200 text-amber-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer group"
          >
            <ChefHat className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            <span>1-Click Instant Owner Access ({ownerName || 'Sanjay Dhumal'})</span>
          </button>

          {onExploreAsCustomer && (
            <button
              type="button"
              onClick={onExploreAsCustomer}
              className="w-full py-1.5 px-3 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Explore Guest Ordering (Table 2)</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
            </button>
          )}

          {/* Reset Old Data / Start Fresh Action */}
          <div className="pt-2 border-t border-slate-100">
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-1 text-[11px] text-slate-400 hover:text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-slate-400" />
                <span>Reset Old Cache & Start Fresh Slate</span>
              </button>
            ) : (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center text-xs space-y-2">
                <p className="font-bold text-rose-900 text-[11px]">
                  Wipe all stored local sessions and cached profiles?
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleWipeAndReset}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] shadow-2xs cursor-pointer"
                  >
                    Confirm & Wipe Cache
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-[11px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-slate-400">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Connected to Firebase Firestore & Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
};
