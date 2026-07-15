import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Clock, 
  FileQuestion, 
  Calendar, 
  Award, 
  History, 
  TrendingUp, 
  ChevronRight, 
  Trophy,
  GraduationCap
} from "lucide-react";
import { Examination, Attempt, UserProfile } from "../types";
import { getAllExaminations, getStudentAttempts } from "../services/db";

interface StudentDashboardProps {
  user: UserProfile;
  onStartExam: (exam: Examination) => void;
  onReviewAttempt: (attempt: Attempt) => void;
  onNavigate: (view: string) => void;
  activeView: string;
}

export default function StudentDashboard({
  user,
  onStartExam,
  onReviewAttempt,
  onNavigate,
  activeView
}: StudentDashboardProps) {
  const [exams, setExams] = useState<Examination[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const fetchedExams = await getAllExaminations(true); // only published
        const fetchedAttempts = await getStudentAttempts(user.uid);
        setExams(fetchedExams);
        setAttempts(fetchedAttempts);
      } catch (err) {
        console.error("Failed to fetch student dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user.uid, activeView]);

  // Calculated statistics
  const totalCompleted = attempts.length;
  const bestScorePercentage = totalCompleted > 0 
    ? Math.max(...attempts.map(a => a.percentage)) 
    : 0;
  const averagePercentage = totalCompleted > 0 
    ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / totalCompleted) 
    : 0;

  // Render loading state
  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-800 dark:border-slate-800 dark:border-t-blue-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading student dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fadeIn">
      
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-geom-blue p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-1.5 rounded-full bg-geom-gold/20 px-3 py-1 text-4xs font-bold uppercase tracking-wider text-geom-gold ring-1 ring-geom-gold/30">
            <Trophy className="h-3.5 w-3.5 text-geom-gold" />
            <span>Maranatha Academic Excellence</span>
          </div>
          <h1 className="mt-3.5 text-2xl font-black tracking-tight sm:text-3xl text-white font-display">
            Hello, {user.fullName}! 👋
          </h1>
          <p className="mt-2 text-sm text-blue-100 max-w-md">
            Welcome to your examination classroom. Choose any available assessment below, answer carefully, and learn from your past results!
          </p>
          
          <div className="flex gap-3 mt-5">
            <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/25 text-xs">
              <span className="font-bold">{averagePercentage}%</span> Avg Score
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/25 text-xs">
              <span className="font-bold">{totalCompleted}</span> Completed Exams
            </div>
          </div>
        </div>
        
        {/* Geometric nested concentric circles */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-geom-gold/30 to-transparent flex items-center justify-center">
          <div className="w-32 h-32 border-8 border-white/10 rounded-full flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-white/20 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Quick metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center space-x-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-850 dark:bg-slate-900 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-geom-blue-light text-geom-blue dark:bg-geom-blue/20 dark:text-blue-400">
            <BookOpen className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-4xs font-bold uppercase tracking-wider text-slate-500">Exams Completed</p>
            <h3 className="text-xl font-extrabold text-geom-blue dark:text-blue-100 mt-0.5 font-display">{totalCompleted}</h3>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-850 dark:bg-slate-900 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-geom-gold-light text-geom-gold dark:bg-geom-gold/20 dark:text-geom-gold">
            <Award className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-4xs font-bold uppercase tracking-wider text-slate-500">Best Score</p>
            <h3 className="text-xl font-extrabold text-geom-blue dark:text-blue-100 mt-0.5 font-display">
              {totalCompleted > 0 ? `${bestScorePercentage}%` : "—"}
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-850 dark:bg-slate-900 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
            <TrendingUp className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-4xs font-bold uppercase tracking-wider text-slate-500">Average Percentage</p>
            <h3 className="text-xl font-extrabold text-geom-blue dark:text-blue-100 mt-0.5 font-display">
              {totalCompleted > 0 ? `${averagePercentage}%` : "—"}
            </h3>
          </div>
        </div>
      </div>

      {activeView === "student-dashboard" ? (
        /* AVAILABLE EXAMINATIONS VIEW */
        <div>
          <h2 className="text-xl font-extrabold text-geom-blue dark:text-blue-100 mb-5 flex items-center space-x-3">
            <span className="w-1.5 h-6 bg-geom-gold rounded-full shrink-0" />
            <span>Available Examinations</span>
          </h2>

          {exams.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <BookOpen className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-md font-bold text-slate-800 dark:text-slate-200">No Examinations Available</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                The administrator has not published any examinations yet. Please check back later.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {exams.map((exam) => (
                <div 
                  key={exam.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 hover:border-geom-gold hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 dark:hover:border-geom-gold"
                >
                  <div className="space-y-4">
                    {/* Subject badge & Class details */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center rounded bg-geom-blue-light px-2.5 py-1 text-3xs font-bold uppercase tracking-wider text-geom-blue dark:bg-geom-blue/20 dark:text-blue-300">
                        {exam.subject}
                      </span>
                      <span className="text-3xs font-bold uppercase tracking-wider text-geom-gold bg-geom-gold-light/40 dark:bg-geom-gold/10 px-2.5 py-1 rounded">
                        {exam.grade} • {exam.term}
                      </span>
                    </div>

                    {/* Examination Title */}
                    <div>
                      <h4 className="text-md font-extrabold text-geom-blue dark:text-blue-100 leading-tight group-hover:text-geom-gold transition-colors font-display">
                        {exam.title}
                      </h4>
                    </div>

                    {/* Metadata attributes */}
                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/60">
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{exam.duration} Minutes</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <FileQuestion className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{exam.numQuestions} Questions</span>
                      </div>
                    </div>
                  </div>

                  {/* Start Button */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                    <button
                      onClick={() => onStartExam(exam)}
                      className="flex w-full items-center justify-center space-x-1.5 rounded bg-geom-blue py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-geom-blue-hover active:scale-98"
                    >
                      <span>Start Examination</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* MY LEARNING PROGRESS VIEW (ATTEMPTS HISTORY) */
        <div>
          <h2 className="text-xl font-extrabold text-geom-blue dark:text-blue-100 mb-5 flex items-center space-x-3">
            <span className="w-1.5 h-6 bg-geom-gold rounded-full shrink-0" />
            <span>My Previous Examination Results</span>
          </h2>

          {attempts.length === 0 ? (
            <div className="rounded-2xl border border-slate-250 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <History className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-md font-bold text-slate-800 dark:text-slate-200">No Attempts Recorded</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                You have not attempted any examinations yet. Complete an examination to see your scoring history and progress metrics.
              </p>
              <button
                onClick={() => onNavigate("student-dashboard")}
                className="mt-4 inline-flex items-center space-x-1.5 rounded bg-geom-blue hover:bg-geom-blue-hover px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors"
              >
                Browse Examinations
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 text-3xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
                      <th className="px-6 py-4">Examination</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4">Time Taken</th>
                      <th className="px-6 py-4">Score</th>
                      <th className="px-6 py-4">Percentage</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-geom-blue dark:text-blue-100 font-display">
                          {attempt.examTitle}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded bg-geom-blue-light px-2.5 py-1 text-3xs font-bold uppercase tracking-wider text-geom-blue dark:bg-geom-blue/20 dark:text-blue-300">
                            {attempt.examSubject}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          <span className="flex items-center space-x-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{new Date(attempt.date).toLocaleString()}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          <span className="flex items-center space-x-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-200 font-mono">
                          {attempt.score} / {attempt.maxScore}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  attempt.percentage >= 80 
                                    ? "bg-emerald-500" 
                                    : attempt.percentage >= 50 
                                      ? "bg-geom-gold" 
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${attempt.percentage}%` }}
                              />
                            </div>
                            <span className={`font-bold font-mono ${
                              attempt.percentage >= 80 
                                ? "text-emerald-600 dark:text-emerald-400" 
                                : attempt.percentage >= 50 
                                  ? "text-geom-gold dark:text-geom-gold" 
                                  : "text-red-600 dark:text-red-400"
                            }`}>
                              {attempt.percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => onReviewAttempt(attempt)}
                            className="inline-flex items-center space-x-1 rounded border border-geom-blue px-3 py-1.5 text-4xs font-bold uppercase tracking-wider text-geom-blue hover:bg-geom-blue-light transition-colors dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-800"
                          >
                            <span>Review Mistake</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
