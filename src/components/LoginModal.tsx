import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../firebase";
import { saveUserProfile, getUserProfile } from "../services/db";
import { UserProfile } from "../types";
import { GraduationCap, Shield, Mail, Lock, User, Eye, EyeOff, Sparkles } from "lucide-react";

interface LoginModalProps {
  onAuthSuccess: (profile: UserProfile) => void;
  darkMode: boolean;
}

export default function LoginModal({ onAuthSuccess, darkMode }: LoginModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "admin">("student");
  const [adminSecret, setAdminSecret] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // Loading and feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isRegister) {
      // Input Validation
      if (!fullName.trim()) {
        setError("Please enter your full name.");
        setLoading(false);
        return;
      }
      if (fullName.trim().split(" ").length < 2) {
        setError("Please enter both first name and last name.");
        setLoading(false);
        return;
      }
      const isDesignatedAdmin = email.trim().toLowerCase() === "manyatseamogelang3@gmail.com";
      if (role === "admin" && adminSecret !== "1968" && !isDesignatedAdmin) {
        setError("Invalid Admin Secret Key. You cannot register as an administrator without valid credentials.");
        setLoading(false);
        return;
      }

      try {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCred.user;

        const profile: UserProfile = {
          uid: user.uid,
          fullName: fullName.trim(),
          email: email.trim(),
          role: isDesignatedAdmin ? "admin" : role,
          blocked: false,
          createdAt: new Date().toISOString()
        };

        await saveUserProfile(profile);
        setSuccess("Registration successful! Logging you in...");
        
        setTimeout(() => {
          onAuthSuccess(profile);
        }, 1200);

      } catch (err: any) {
        console.log("Registration info:", err);
        if (err.code === "auth/email-already-in-use") {
          try {
            // Attempt auto-login if the user is already registered with this exact password
            const loginCred = await signInWithEmailAndPassword(auth, email.trim(), password);
            const user = loginCred.user;
            let profile = await getUserProfile(user.uid);
            if (!profile) {
              profile = {
                uid: user.uid,
                fullName: fullName.trim(),
                email: email.trim().toLowerCase(),
                role: (email.trim().toLowerCase() === "manyatseamogelang3@gmail.com") ? "admin" : role,
                blocked: false,
                createdAt: new Date().toISOString()
              };
              await saveUserProfile(profile);
            }
            if (email.trim().toLowerCase() === "manyatseamogelang3@gmail.com") {
              localStorage.setItem("admin_session", JSON.stringify(profile));
            }
            setSuccess("Account already exists. Logging you in automatically...");
            setTimeout(() => {
              onAuthSuccess(profile!);
            }, 1200);
            return;
          } catch (loginErr) {
            // If sign-in fails, then it is indeed an email-already-in-use error
          }
          setError("This email address is already registered.");
        } else if (err.code === "auth/weak-password") {
          setError("The password is too weak. Must be at least 6 characters.");
        } else if (err.code === "auth/invalid-email") {
          setError("Invalid email address format.");
        } else {
          setError(err.message || "An error occurred during registration. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Login flow
      const isAdminCredentials = 
        email.trim().toLowerCase() === "manyatseamogelang3@gmail.com" && 
        password === "Amza71554644";

      try {
        let userCred;
        let isMockSession = false;
        try {
          userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (loginErr: any) {
          // If the designated admin doesn't exist yet, register them automatically
          if (isAdminCredentials && (
            loginErr.code === "auth/user-not-found" || 
            loginErr.code === "auth/invalid-credential" || 
            loginErr.code === "auth/invalid-login-credentials"
          )) {
            try {
              userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
            } catch (createErr) {
              console.log("Using backup local session for designated admin due to password or user discrepancy");
              isMockSession = true;
            }
          } else {
            throw loginErr;
          }
        }

        let profile: UserProfile | null = null;
        if (isMockSession) {
          profile = {
            uid: "admin_manyatse_mock",
            fullName: "Amogelang Manyatse",
            email: email.trim().toLowerCase(),
            role: "admin",
            blocked: false,
            createdAt: new Date().toISOString()
          };
          localStorage.setItem("admin_session", JSON.stringify(profile));
        } else {
          const user = userCred!.user;
          // Fetch user profile from firestore
          profile = await getUserProfile(user.uid);
          
          // Auto-create profile for designated admin if missing
          if (!profile && isAdminCredentials) {
            profile = {
              uid: user.uid,
              fullName: "Amogelang Manyatse",
              email: email.trim().toLowerCase(),
              role: "admin",
              blocked: false,
              createdAt: new Date().toISOString()
            };
            await saveUserProfile(profile);
          } else if (profile && isAdminCredentials && profile.role !== "admin") {
            // Force designated admin's role to be admin in case it was registered differently
            profile.role = "admin";
            await saveUserProfile(profile);
          }
        }

        if (isAdminCredentials && profile) {
          localStorage.setItem("admin_session", JSON.stringify(profile));
        }

        if (!profile) {
          setError("User profile not found in database.");
          setLoading(false);
          return;
        }

        if (profile.blocked) {
          setError("Your account has been blocked by the administrator. Please contact Maranatha administration.");
          setLoading(false);
          return;
        }

        setSuccess(`Welcome back, ${profile.fullName}! Loading your workspace...`);
        
        setTimeout(() => {
          onAuthSuccess(profile!);
        }, 1000);

      } catch (err: any) {
        console.log("Login error info:", err);
        if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
          setError("Incorrect email address or password. Please verify and try again.");
        } else if (err.code === "auth/invalid-email") {
          setError("Invalid email address format.");
        } else {
          setError(err.message || "An error occurred during login. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email.trim()) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess("A password reset link has been sent to your email address!");
    } catch (err: any) {
      console.log("Password reset error info:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setError("No account found with this email address.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address format.");
      } else {
        setError(err.message || "An error occurred during password reset. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-blue-50 dark:border-slate-800 transition-all">
        
        {/* Academic crest header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded bg-geom-blue shadow-sm">
            <GraduationCap className="h-8 w-8 text-geom-gold" />
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-geom-gold animate-bounce" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-geom-blue dark:text-blue-100 font-display">
            Maranatha Academy
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isForgotPassword
              ? "Recover your account password securely"
              : isRegister 
                ? "Create your student or teacher examination account" 
                : "Access your examinations and track learning progress"
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={isForgotPassword ? handleResetPassword : handleSubmit} className="mt-6 space-y-4">
          
          {/* Error and Success alerts */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-950/40 animate-shake">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-xs font-semibold text-green-600 dark:bg-green-950/20 dark:text-green-400 border border-green-100 dark:border-green-950/40">
              {success}
            </div>
          )}

          {!isForgotPassword && isRegister && (
            <>
              {/* Full Name input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name (First and Last Name)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    disabled={loading}
                    className="block w-full rounded border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-geom-gold dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    id="full-name-input"
                  />
                </div>
              </div>

              {/* Role Selection Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Register as
                </label>
                <div className="grid grid-cols-2 gap-2 rounded bg-slate-100 p-1 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`flex items-center justify-center space-x-1.5 rounded py-1.5 text-xs font-semibold transition-all ${
                      role === "student"
                        ? "bg-white text-geom-blue shadow-sm dark:bg-slate-900 dark:text-blue-400"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`flex items-center justify-center space-x-1.5 rounded py-1.5 text-xs font-semibold transition-all ${
                      role === "admin"
                        ? "bg-white text-geom-blue shadow-sm dark:bg-slate-900 dark:text-blue-400"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Administrator</span>
                  </button>
                </div>
              </div>

              {/* Admin Secret Key (Conditional) */}
              {role === "admin" && (
                <div className="animate-slideDown">
                  <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                    Administrator Secret Key
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-500">
                      <Shield className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={adminSecret}
                      onChange={(e) => setAdminSecret(e.target.value)}
                      placeholder="Enter Admin secret key"
                      disabled={loading}
                      className="block w-full rounded border border-amber-300 bg-amber-50/10 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-amber-600/50 outline-none transition-all focus:border-geom-gold dark:border-amber-900/40 dark:bg-slate-950 dark:text-amber-100"
                      id="admin-secret-input"
                    />
                  </div>
                  <p className="mt-1 text-3xs font-medium text-amber-600 dark:text-amber-400">
                    * This secret key authenticates your administrative privileges.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Email input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                disabled={loading}
                className="block w-full rounded border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-geom-gold dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                id="email-input"
              />
            </div>
          </div>

          {/* Password input */}
          {!isForgotPassword && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError("");
                      setSuccess("");
                    }}
                    className="text-3xs font-bold text-geom-blue hover:text-geom-gold dark:text-blue-400 dark:hover:text-blue-300 transition-colors uppercase tracking-wider"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "Minimum 6 characters" : "••••••••"}
                  disabled={loading}
                  className="block w-full rounded border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-geom-gold dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  id="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded bg-geom-blue hover:bg-geom-blue-hover py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50"
            id="auth-submit-btn"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Processing...</span>
              </div>
            ) : (
              <span>{isForgotPassword ? "Send Password Reset Link" : isRegister ? "Create Free Account" : "Secure Log In"}</span>
            )}
          </button>
        </form>

        {/* Footer / Toggle Login/Register */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setError("");
                setSuccess("");
              }}
              disabled={loading}
              className="text-xs font-semibold text-geom-blue hover:text-geom-gold dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Back to Sign In
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
                setSuccess("");
              }}
              disabled={loading}
              className="text-xs font-semibold text-geom-blue hover:text-geom-gold dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              {isRegister 
                ? "Already have an account? Sign In" 
                : "New to Maranatha? Register here"
              }
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
