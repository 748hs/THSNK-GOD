import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { getUserProfile } from "./services/db";
import { UserProfile, Examination, Attempt } from "./types";

// Components
import Header from "./components/Header";
import LoginModal from "./components/LoginModal";
import PdfUploadPreview from "./components/PdfUploadPreview";
import StudentDashboard from "./components/StudentDashboard";
import ExamRoom from "./components/ExamRoom";
import ExamReview from "./components/ExamReview";
import AdminDashboard from "./components/AdminDashboard";

import { AlertTriangle, ShieldAlert, GraduationCap, Sparkles, CheckCircle2 } from "lucide-react";

export default function App() {
  // Authentication & Profile states
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem("admin_session");
    if (cached) {
      try {
        return JSON.parse(cached) as UserProfile;
      } catch (_) {}
    }
    return null;
  });
  const [authLoading, setAuthLoading] = useState(() => {
    return !localStorage.getItem("admin_session");
  });

  // Active view router:
  // For students: "student-dashboard" | "student-progress" | "exam-room" | "exam-review"
  // For admins: "admin-dashboard" | "upload-exam"
  const [activeView, setActiveView] = useState<string>(() => {
    const cached = localStorage.getItem("admin_session");
    if (cached) {
      try {
        const profile = JSON.parse(cached) as UserProfile;
        if (profile.role === "admin") {
          return "admin-dashboard";
        }
      } catch (_) {}
    }
    return "student-dashboard";
  });

  // Selection states for exams & reviews
  const [selectedExam, setSelectedExam] = useState<Examination | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);

  // Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // Track if user is blocked (checked dynamically too)
  const [blockedNotice, setBlockedNotice] = useState(false);

  useEffect(() => {
    // Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            if (profile.blocked) {
              setBlockedNotice(true);
              setUser(null);
              localStorage.removeItem("admin_session");
              await signOut(auth);
            } else {
              setUser(profile);
              setBlockedNotice(false);
              // Set default dashboard based on role
              setActiveView(profile.role === "admin" ? "admin-dashboard" : "student-dashboard");
            }
          } else {
            // Check for backup mock session
            const cached = localStorage.getItem("admin_session");
            if (cached) {
              try {
                const mockProfile = JSON.parse(cached) as UserProfile;
                setUser(mockProfile);
                setActiveView("admin-dashboard");
              } catch (_) {
                setUser(null);
              }
            } else {
              setUser(null);
            }
          }
        } else {
          // Check for backup mock session
          const cached = localStorage.getItem("admin_session");
          if (cached) {
            try {
              const mockProfile = JSON.parse(cached) as UserProfile;
              setUser(mockProfile);
              setActiveView("admin-dashboard");
            } catch (_) {
              setUser(null);
              setBlockedNotice(false);
            }
          } else {
            setUser(null);
            setBlockedNotice(false);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Update theme class on root
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("admin_session");
      await signOut(auth);
      setUser(null);
      setActiveView("login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    setActiveView(profile.role === "admin" ? "admin-dashboard" : "student-dashboard");
  };

  const handleStartExam = (exam: Examination) => {
    setSelectedExam(exam);
    setActiveView("exam-room");
  };

  const handleFinishExam = (attempt: Attempt) => {
    setSelectedAttempt(attempt);
    setActiveView("exam-review");
  };

  const handleReviewAttempt = (attempt: Attempt) => {
    setSelectedAttempt(attempt);
    setActiveView("exam-review");
  };

  const handleEditExamQuestions = (exam: Examination) => {
    setSelectedExam(exam);
    setActiveView("upload-exam");
  };

  const handleNavigate = (view: string) => {
    // Clear selections when navigating between dashboard tabs
    if (view === "student-dashboard" || view === "admin-dashboard" || view === "student-progress") {
      setSelectedExam(null);
      setSelectedAttempt(null);
    }
    setActiveView(view);
  };

  const handleRetakeExam = async (examId: string) => {
    try {
      const { getDocs, query, collection, where } = await import("firebase/firestore");
      const { db } = await import("./firebase");
      const examsCol = collection(db, "examinations");
      const q = query(examsCol, where("id", "==", examId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const examData = snap.docs[0].data() as Examination;
        setSelectedExam(examData);
        setActiveView("exam-room");
      } else {
        alert("This examination was deleted or is no longer published.");
      }
    } catch (err) {
      console.error("Retake error:", err);
    }
  };

  // Rendering Loader
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="relative mb-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-geom-blue dark:border-slate-800 dark:border-t-blue-400" />
          <GraduationCap className="absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-geom-gold" />
        </div>
        <h2 className="text-lg font-black tracking-tight text-geom-blue dark:text-blue-100 font-display">
          Maranatha Academy
        </h2>
        <p className="mt-1 text-3xs font-semibold uppercase tracking-widest text-geom-gold">
          Loading secure examination portal...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      darkMode ? "bg-slate-950 text-slate-100 dark" : "bg-slate-50 text-slate-800"
    }`}>
      
      {/* Dynamic Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        activeView={activeView}
        onNavigate={handleNavigate}
      />

      {/* Main Content Area */}
      <main className="flex-grow">
        {/* Blocked Student Notice */}
        {blockedNotice && (
          <div className="mx-auto max-w-md px-4 py-16 text-center animate-fadeIn">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200">
              <ShieldAlert className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Account Blocked</h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your academic account has been suspended or blocked by Maranatha Administrators. You cannot access examinations, attempt reviews, or view progress at this time.
            </p>
            <button
              onClick={() => setBlockedNotice(false)}
              className="mt-6 rounded bg-geom-blue hover:bg-geom-blue-hover px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors"
            >
              Okay, I understand
            </button>
          </div>
        )}

        {/* Auth / Login Modal if not logged in */}
        {!user && !blockedNotice && (
          <LoginModal onAuthSuccess={handleAuthSuccess} darkMode={darkMode} />
        )}

        {/* Authenticated Screens */}
        {user && !blockedNotice && (
          <>
            {/* Student Views */}
            {user.role === "student" && (
              <>
                {(activeView === "student-dashboard" || activeView === "student-progress") && (
                  <StudentDashboard
                    user={user}
                    onStartExam={handleStartExam}
                    onReviewAttempt={handleReviewAttempt}
                    onNavigate={handleNavigate}
                    activeView={activeView}
                  />
                )}

                {activeView === "exam-room" && selectedExam && (
                  <ExamRoom
                    user={user}
                    exam={selectedExam}
                    onFinishExam={handleFinishExam}
                    onCancel={() => handleNavigate("student-dashboard")}
                  />
                )}

                {activeView === "exam-review" && selectedAttempt && (
                  <ExamReview
                    attempt={selectedAttempt}
                    onBack={() => handleNavigate("student-progress")}
                    onRetake={() => handleRetakeExam(selectedAttempt.examId)}
                  />
                )}
              </>
            )}

            {/* Administrator Views */}
            {user.role === "admin" && (
              <>
                {activeView === "admin-dashboard" && (
                  <AdminDashboard
                    onNavigate={handleNavigate}
                    onEditExam={handleEditExamQuestions}
                  />
                )}

                {activeView === "upload-exam" && (
                  <PdfUploadPreview
                    onBack={() => handleNavigate("admin-dashboard")}
                    onPublishSuccess={() => handleNavigate("admin-dashboard")}
                    initialExam={selectedExam}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-800/40 dark:bg-slate-900 transition-colors">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <span className="block text-xs font-bold tracking-tight text-geom-blue dark:text-blue-200 font-display">
                Maranatha School Examination Website
              </span>
              <span className="block text-4xs font-semibold uppercase tracking-widest text-geom-gold mt-0.5">
                Faithful • Secure • Professional
              </span>
            </div>
            <p className="text-4xs font-medium text-slate-400">
              &copy; 2026 Maranatha Academy. All examination papers, student results, and analytics snapshots are permanently archived and secured under administrative privacy logs.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
