import React, { useState, useEffect, useRef } from "react";
import { 
  Clock, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  AlertTriangle,
  Play
} from "lucide-react";
import { Examination, Attempt, UserProfile, Question } from "../types";
import { saveAttempt } from "../services/db";

interface ExamRoomProps {
  user: UserProfile;
  exam: Examination;
  onFinishExam: (attempt: Attempt) => void;
  onCancel: () => void;
}

export default function ExamRoom({ user, exam, onFinishExam, onCancel }: ExamRoomProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  // Timer states
  const totalDurationSeconds = exam.duration * 60;
  const [timeLeft, setTimeLeft] = useState(totalDurationSeconds);
  const [timeTaken, setTimeTaken] = useState(0);
  
  // Modal for double checking submit
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef<any>(null);

  // Initialize and run the timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto-submit when hits 0
          handleAutoSubmit();
          return 0;
        }
        setTimeTaken((t) => t + 1);
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleOptionSelect = (optionChar: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentIdx]: optionChar
    }));
  };

  const handleNext = () => {
    if (currentIdx < exam.questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  // Auto-submit when time is up
  const handleAutoSubmit = async () => {
    setSubmitting(true);
    await processAndSaveExamAttempt(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    await processAndSaveExamAttempt(false);
  };

  // Score calculation and database saving
  const processAndSaveExamAttempt = async (isTimeUp = false) => {
    let correctCount = 0;
    
    exam.questions.forEach((q, idx) => {
      const selected = answers[idx];
      if (selected === q.correctOption) {
        correctCount++;
      }
    });

    const score = correctCount;
    const maxScore = exam.questions.length;
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    const newAttempt: Attempt = {
      id: `attempt-${Date.now()}`,
      studentId: user.uid,
      studentName: user.fullName,
      examId: exam.id,
      examTitle: exam.title,
      examSubject: exam.subject,
      score: score,
      maxScore: maxScore,
      percentage: percentage,
      timeTaken: isTimeUp ? totalDurationSeconds : timeTaken,
      date: new Date().toISOString(),
      answers: answers,
      questionsSnapshot: exam.questions // preserve exam structure in case of admin deletion/edit
    };

    try {
      await saveAttempt(newAttempt);
      onFinishExam(newAttempt);
    } catch (err) {
      console.error("Failed to save attempt in database:", err);
      // Fallback: still navigate to result
      onFinishExam(newAttempt);
    } finally {
      setSubmitting(false);
    }
  };

  // Convert seconds left to MM:SS string
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = exam.questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const isTimeLow = timeLeft < 300; // less than 5 minutes

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-fadeIn">
      
      {/* Upper floating status bar */}
      <div className="sticky top-16 z-40 flex items-center justify-between rounded border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <div>
          <h2 className="text-sm font-black text-geom-blue dark:text-blue-100 line-clamp-1 font-display">{exam.title}</h2>
          <p className="text-3xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">{exam.subject} • {exam.grade}</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Progress Indicator */}
          <div className="hidden items-center space-x-2 md:flex">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-500">Progress:</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{answeredCount}/{exam.questions.length}</span>
            <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-850 overflow-hidden">
              <div 
                className="h-full bg-geom-blue rounded-full" 
                style={{ width: `${(answeredCount / exam.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Timer Clock */}
          <div className={`flex items-center space-x-1.5 rounded px-3.5 py-1.5 transition-all border ${
            isTimeLow 
              ? "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border-red-200 animate-pulse" 
              : "bg-geom-gold-light text-geom-gold-dark border-geom-gold/20 dark:bg-geom-gold/10 dark:text-geom-gold"
          }`}>
            <Clock className="h-4.5 w-4.5 text-geom-gold-dark" />
            <span className="font-mono text-sm font-bold tracking-tight">{formatTime(timeLeft)}</span>
          </div>

          {/* Submit Action */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="rounded bg-geom-blue hover:bg-geom-blue-hover px-4.5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors"
          >
            Submit Exam
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        
        {/* Main Question Body Area */}
        <div className="lg:col-span-3 space-y-6">
          {currentQuestion ? (
            <div className="rounded-2xl border border-slate-150 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-3xs">
              
              {/* Question Index header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-5">
                <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-800 dark:text-blue-400">
                  <HelpCircle className="h-4.5 w-4.5 text-amber-500" />
                  <span>Question {currentIdx + 1} of {exam.questions.length}</span>
                </span>
                <span className="text-4xs font-bold uppercase tracking-wider text-slate-400">
                  Select 1 correct option
                </span>
              </div>

              {/* Question Text */}
              <div className="space-y-3">
                <div className="space-y-1">
                  {currentQuestion.questionText
                    .trim()
                    .split("\n")
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0)
                    .map((line, lIdx) => (
                      <p key={lIdx} className="text-base font-extrabold text-blue-950 dark:text-blue-100 leading-relaxed">
                        {line}
                      </p>
                    ))}
                </div>

                {/* Question Diagram (Conditional) */}
                {currentQuestion.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-w-lg bg-slate-50 dark:bg-slate-950 p-2 shadow-inner">
                    <img
                      src={currentQuestion.imageUrl}
                      alt={`Diagram for Question ${currentIdx + 1}`}
                      referrerPolicy="no-referrer"
                      className="max-h-64 object-contain rounded-lg"
                    />
                  </div>
                )}

                {/* Multiple Choice Options List */}
                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  {currentQuestion.options.map((option, oIdx) => {
                    const charPrefix = String.fromCharCode(65 + oIdx);
                    const isSelected = answers[currentIdx] === charPrefix;

                    const cleanOption = option
                      .trim()
                      .split("\n")
                      .map((l) => l.trim())
                      .filter((l) => l.length > 0)
                      .join(" ");

                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleOptionSelect(charPrefix)}
                        className={`flex w-full items-center space-x-4 rounded border p-4 text-left transition-all relative ${
                          isSelected
                            ? "border-geom-blue bg-geom-blue-light/30 text-geom-blue ring-1 ring-geom-blue/20 dark:border-blue-500 dark:bg-slate-800/50 dark:text-blue-300"
                            : "border-slate-200 bg-white hover:border-geom-gold/40 hover:bg-slate-50/30 dark:border-slate-800 dark:bg-slate-950"
                        }`}
                      >
                        {/* Selector bubble */}
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-black transition-all ${
                          isSelected
                            ? "bg-geom-blue text-white"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-850 dark:text-slate-400"
                        }`}>
                          {charPrefix}
                        </div>
                        <span className="text-xs font-bold leading-relaxed">{cleanOption}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div className="rounded-2xl bg-white p-10 text-center dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-500">No questions loaded for this examination.</p>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous Question</span>
            </button>

            <button
              onClick={handleNext}
              disabled={currentIdx === exam.questions.length - 1}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <span>Next Question</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Question Quick Jump Sidebar Grid */}
        <div className="space-y-4">
          <div className="rounded border border-slate-200 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <h4 className="text-3xs font-bold uppercase tracking-wider text-slate-500 mb-3.5">
              Questions Navigation
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {exam.questions.map((_, idx) => {
                const isAnswered = answers[idx] !== undefined;
                const isActive = idx === currentIdx;

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIdx(idx)}
                    className={`flex h-8 w-full items-center justify-center rounded text-xs font-bold transition-all ${
                      isActive
                        ? "bg-geom-blue text-white ring-1 ring-geom-blue/20 shadow-sm"
                        : isAnswered
                          ? "bg-geom-gold-light text-geom-gold-dark dark:bg-geom-gold/10 dark:text-geom-gold border border-geom-gold/10"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800/60 space-y-2">
              <div className="flex items-center space-x-2 text-3xs font-bold uppercase tracking-wider text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 block" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center space-x-2 text-3xs font-bold uppercase tracking-wider text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700 block" />
                <span>Unanswered ({exam.questions.length - answeredCount})</span>
              </div>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="flex w-full items-center justify-center rounded border border-red-200 py-2.5 text-xs font-bold uppercase tracking-wider text-red-650 hover:bg-red-50/20 transition-colors"
          >
            Quit Examination
          </button>
        </div>

      </div>

      {/* Confirmation Submit modal dialog overlay */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-blue-50 dark:border-slate-800 transition-all text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-400">
              <CheckSquare className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-blue-950 dark:text-blue-100">Submit Your Examination?</h3>
            
            {answeredCount < exam.questions.length ? (
              <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 border border-amber-200/60 dark:bg-amber-950/25 dark:text-amber-400 flex items-start space-x-2 text-left">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>You have unanswered questions! You answered only {answeredCount} out of {exam.questions.length} questions.</span>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Are you ready to submit your exam? You will receive automatic marking immediately.
              </p>
            )}

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="rounded border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 transition-colors"
              >
                Go Back
              </button>
              <button
                disabled={submitting}
                onClick={handleConfirmSubmit}
                className="rounded bg-geom-blue hover:bg-geom-blue-hover px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors"
              >
                {submitting ? "Submitting..." : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
