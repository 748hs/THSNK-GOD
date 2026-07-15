import React from "react";
import { 
  CheckCircle, 
  XCircle, 
  Award, 
  Clock, 
  FileCheck, 
  ArrowLeft, 
  RotateCcw,
  BookOpen,
  HelpCircle,
  Check,
  X
} from "lucide-react";
import { Attempt } from "../types";

interface ExamReviewProps {
  attempt: Attempt;
  onBack: () => void;
  onRetake?: () => void;
}

export default function ExamReview({ attempt, onBack, onRetake }: ExamReviewProps) {
  const mins = Math.floor(attempt.timeTaken / 60);
  const secs = attempt.timeTaken % 60;
  
  const incorrectCount = attempt.maxScore - attempt.score;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fadeIn">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Main result badge card */}
      <div className="relative overflow-hidden rounded border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm text-center">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-geom-gold" />
        
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded bg-geom-blue shadow-sm">
          <Award className="h-8 w-8 text-geom-gold" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-geom-blue dark:text-blue-100 font-display">
          Examination Results
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {attempt.examTitle}
        </p>

        {/* Big percentage score */}
        <div className="my-6">
          <span className={`text-5xl font-black tracking-tight ${
            attempt.percentage >= 80 
              ? "text-green-600 dark:text-green-400" 
              : attempt.percentage >= 50 
                ? "text-amber-600 dark:text-amber-400" 
                : "text-red-600 dark:text-red-400"
          }`}>
            {attempt.percentage}%
          </span>
          <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">
            Passing Score: {attempt.score} / {attempt.maxScore} Correct Answers
          </p>
        </div>

        {/* Metadata grid */}
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-3.5 border-t border-b border-slate-100 py-5 dark:border-slate-800/60 text-xs">
          <div>
            <p className="font-semibold text-slate-500">Correct</p>
            <span className="flex items-center justify-center space-x-1 font-bold text-green-600 mt-0.5 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>{attempt.score}</span>
            </span>
          </div>

          <div>
            <p className="font-semibold text-slate-500">Incorrect</p>
            <span className="flex items-center justify-center space-x-1 font-bold text-red-600 mt-0.5 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              <span>{incorrectCount}</span>
            </span>
          </div>

          <div>
            <p className="font-semibold text-slate-500">Time Taken</p>
            <span className="flex items-center justify-center space-x-1 font-bold text-slate-700 mt-0.5 dark:text-slate-300">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>{mins}m {secs}s</span>
            </span>
          </div>
        </div>

        {/* Retake & Done buttons */}
        {onRetake && (
          <div className="mt-6 flex items-center justify-center space-x-3">
            <button
              onClick={onRetake}
              className="flex items-center space-x-1.5 rounded border border-slate-250 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retake Examination</span>
            </button>
            <button
              onClick={onBack}
              className="rounded bg-geom-blue hover:bg-geom-blue-hover px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Question-by-question list */}
      <div>
        <h2 className="text-lg font-extrabold text-blue-950 dark:text-blue-100 mb-5 flex items-center space-x-2">
          <BookOpen className="h-5 w-5 text-blue-700" />
          <span>Review Questions & Correct Solutions</span>
        </h2>

        <div className="space-y-6">
          {attempt.questionsSnapshot && attempt.questionsSnapshot.map((q, idx) => {
            const selected = attempt.answers[idx];
            const correct = q.correctOption;
            const isCorrect = selected === correct;

            return (
              <div 
                key={q.id}
                className={`rounded border bg-white p-5 dark:bg-slate-900 shadow-sm relative ${
                  isCorrect 
                    ? "border-green-150 dark:border-green-950/40" 
                    : "border-red-150 dark:border-red-950/40"
                }`}
              >
                {/* Correct/Incorrect floating icon */}
                <span className="absolute top-4 right-4">
                  {isCorrect ? (
                    <span className="flex items-center space-x-1 text-3xs font-bold text-green-600 bg-green-50 dark:bg-green-950/25 dark:text-green-400 px-2.5 py-1 rounded">
                      <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span>Correct</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-3xs font-bold text-red-600 bg-red-50 dark:bg-red-950/25 dark:text-red-400 px-2.5 py-1 rounded">
                      <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <span>Incorrect</span>
                    </span>
                  )}
                </span>

                <div className="flex items-start space-x-3.5">
                  {/* Number indicator */}
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    isCorrect 
                      ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400" 
                      : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                  }`}>
                    {idx + 1}
                  </span>

                  <div className="w-full space-y-3">
                    {/* Question text */}
                    <div className="space-y-1">
                      {q.questionText
                        .trim()
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0)
                        .map((line, lIdx) => (
                          <p key={lIdx} className="text-sm font-extrabold text-blue-950 dark:text-blue-100 leading-relaxed pr-16">
                            {line}
                          </p>
                        ))}
                    </div>

                    {/* Diagram (Conditional) */}
                    {q.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-w-sm bg-slate-50 dark:bg-slate-950 p-1.5 shadow-inner">
                        <img
                          src={q.imageUrl}
                          alt={`Diagram for Question ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="max-h-48 object-contain rounded-lg"
                        />
                      </div>
                    )}

                    {/* Options list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {q.options.map((option, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        const isStudentSelected = selected === letter;
                        const isCorrectOption = correct === letter;

                        const cleanOption = option
                          .trim()
                          .split("\n")
                          .map((l) => l.trim())
                          .filter((l) => l.length > 0)
                          .join(" ");

                        let styleClass = "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";
                        if (isCorrectOption) {
                          // Correct option is highlighted green
                          styleClass = "border-green-500 bg-green-50/40 text-green-950 dark:border-green-900/60 dark:bg-green-950/15 dark:text-green-300 font-bold";
                        } else if (isStudentSelected && !isCorrectOption) {
                          // Incorrect student choice is highlighted red
                          styleClass = "border-red-500 bg-red-50/40 text-red-950 dark:border-red-900/60 dark:bg-red-950/15 dark:text-red-300 font-bold";
                        }

                        return (
                          <div 
                            key={oIdx}
                            className={`flex items-center space-x-3 rounded border p-3.5 text-xs transition-colors relative ${styleClass}`}
                          >
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-3xs font-black ${
                              isCorrectOption 
                                ? "bg-green-500 text-white" 
                                : isStudentSelected 
                                  ? "bg-red-500 text-white" 
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-850 dark:text-slate-400"
                            }`}>
                              {letter}
                            </div>
                            <span className="leading-relaxed">{cleanOption}</span>

                            {/* Floating check or cross mark */}
                            {isCorrectOption && (
                              <Check className="h-4.5 w-4.5 text-green-600 dark:text-green-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            )}
                            {isStudentSelected && !isCorrectOption && (
                              <X className="h-4.5 w-4.5 text-red-600 dark:text-red-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanatory footer */}
                    <div className="flex items-center space-x-2 text-3xs font-bold uppercase tracking-wider text-slate-400">
                      <span>Your Answer: <strong className={isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{selected || "None"}</strong></span>
                      <span>•</span>
                      <span>Correct Answer: <strong className="text-green-600 dark:text-green-400">{correct}</strong></span>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
