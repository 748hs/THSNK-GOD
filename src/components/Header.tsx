import React from "react";
import { LogOut, Sun, Moon, BookOpen, Shield, GraduationCap, User } from "lucide-react";
import { UserProfile } from "../types";

interface HeaderProps {
  user: UserProfile | null;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activeView: string;
  onNavigate: (view: string) => void;
}

export default function Header({
  user,
  onLogout,
  darkMode,
  onToggleDarkMode,
  activeView,
  onNavigate,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md transition-all dark:border-slate-800 dark:bg-slate-900/95 shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand / Logo */}
        <div 
          onClick={() => user ? onNavigate(user.role === "admin" ? "admin-dashboard" : "student-dashboard") : null}
          className="flex cursor-pointer items-center space-x-3 transition-transform active:scale-95"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded bg-geom-gold font-bold text-white text-2xl shadow-sm">
            M
          </div>
          <div>
            <span className="block text-xl font-bold tracking-tight text-geom-blue dark:text-blue-100">
              MARANATHA
            </span>
            <span className="block text-4xs font-bold uppercase tracking-widest text-geom-gold dark:text-geom-gold -mt-1">
              Academic Portal
            </span>
          </div>
        </div>

        {/* Navigation & Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {user && (
            <nav className="mr-2 hidden items-center space-x-1.5 md:flex">
              {user.role === "admin" ? (
                <>
                  <button
                    onClick={() => onNavigate("admin-dashboard")}
                    className={`flex items-center space-x-1.5 rounded px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                      activeView === "admin-dashboard"
                        ? "bg-geom-gold text-white shadow-sm"
                        : "text-slate-600 hover:bg-geom-blue/10 hover:text-geom-blue dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Shield className="h-4 w-4 shrink-0" />
                    <span>Admin Panel</span>
                  </button>
                  <button
                    onClick={() => onNavigate("upload-exam")}
                    className={`flex items-center space-x-1.5 rounded px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                      activeView === "upload-exam" || activeView === "preview-exam"
                        ? "bg-geom-gold text-white shadow-sm"
                        : "text-slate-600 hover:bg-geom-blue/10 hover:text-geom-blue dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>Create Exam</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onNavigate("student-dashboard")}
                    className={`flex items-center space-x-1.5 rounded px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                      activeView === "student-dashboard"
                        ? "bg-geom-gold text-white shadow-sm"
                        : "text-slate-600 hover:bg-geom-blue/10 hover:text-geom-blue dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>Examinations</span>
                  </button>
                  <button
                    onClick={() => onNavigate("student-progress")}
                    className={`flex items-center space-x-1.5 rounded px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                      activeView === "student-progress"
                        ? "bg-geom-gold text-white shadow-sm"
                        : "text-slate-600 hover:bg-geom-blue/10 hover:text-geom-blue dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    <span>My Progress</span>
                  </button>
                </>
              )}
            </nav>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            id="theme-toggle-btn"
          >
            {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          {user ? (
            <div className="flex items-center space-x-2">
              {/* Profile Card Summary */}
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {user.fullName}
                </span>
                <span className="flex items-center space-x-1 text-3xs font-semibold uppercase tracking-wider text-blue-700 dark:text-amber-400">
                  {user.role === "admin" ? (
                    <>
                      <Shield className="h-2.5 w-2.5" />
                      <span>Administrator</span>
                    </>
                  ) : (
                    <>
                      <GraduationCap className="h-2.5 w-2.5" />
                      <span>Student</span>
                    </>
                  )}
                </span>
              </div>

              {/* Avatar Icon / Dropdown Indicator */}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-800 dark:bg-slate-800 dark:text-blue-400 ring-2 ring-amber-500/20">
                <User className="h-4 w-4" />
              </div>

              {/* Log Out */}
              <button
                onClick={onLogout}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition-colors hover:bg-red-50 dark:border-red-950/40 dark:text-red-400 dark:hover:bg-red-950/20"
                title="Log Out"
                id="logout-btn"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="text-xs font-semibold text-blue-700 dark:text-amber-400 uppercase tracking-widest animate-pulse">
              Educational Excellence
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
