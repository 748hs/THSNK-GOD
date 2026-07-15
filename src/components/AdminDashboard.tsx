import React, { useState, useEffect } from "react";
import { 
  Users, 
  BookOpen, 
  History, 
  UserCheck, 
  TrendingUp, 
  Search, 
  ShieldAlert, 
  Trash2, 
  FileSpreadsheet, 
  RotateCcw, 
  Check, 
  X,
  FileText,
  Calendar,
  Clock,
  ExternalLink,
  Plus,
  Edit,
  Power,
  BarChart2
} from "lucide-react";
import { Examination, Attempt, UserProfile } from "../types";
import { 
  getAllExaminations, 
  getAllUsers, 
  getAllAttempts, 
  updateUserBlockedStatus, 
  deleteUserProfile, 
  deleteExamination, 
  saveExamination,
  resetStudentAttemptsForExam
} from "../services/db";

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
  onEditExam: (exam: Examination) => void;
}

export default function AdminDashboard({ onNavigate, onEditExam }: AdminDashboardProps) {
  // Tabs: 'stats' | 'exams' | 'students' | 'results'
  const [activeTab, setActiveTab] = useState<"exams" | "students" | "results">("exams");
  
  // Data State
  const [exams, setExams] = useState<Examination[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Search Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [examSearch, setExamSearch] = useState("");
  const [resultsSearch, setResultsSearch] = useState("");

  // Quick edit exam state
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDuration, setEditDuration] = useState(35);

  // Detailed selected student results modal/panel
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [studentAttempts, setStudentAttempts] = useState<Attempt[]>([]);

  // Refetch helper
  const loadData = async () => {
    try {
      const fetchedExams = await getAllExaminations(false); // get all drafts too
      const fetchedUsers = await getAllUsers();
      const fetchedAttempts = await getAllAttempts();
      setExams(fetchedExams);
      setUsers(fetchedUsers);
      setAttempts(fetchedAttempts);
    } catch (err) {
      console.error("Failed to load admin panel data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter students (only role === 'student')
  const studentsList = users.filter(u => u.role === "student" && (
    u.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(studentSearch.toLowerCase())
  ));

  // Filter exams
  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(examSearch.toLowerCase()) ||
    e.subject.toLowerCase().includes(examSearch.toLowerCase()) ||
    e.grade.toLowerCase().includes(examSearch.toLowerCase())
  );

  // Filter all results
  const filteredResults = attempts.filter(a => 
    a.studentName.toLowerCase().includes(resultsSearch.toLowerCase()) ||
    a.examTitle.toLowerCase().includes(resultsSearch.toLowerCase()) ||
    a.examSubject.toLowerCase().includes(resultsSearch.toLowerCase())
  );

  // Block/unblock student
  const handleToggleBlock = async (student: UserProfile) => {
    const nextStatus = !student.blocked;
    const confirmMsg = nextStatus 
      ? `Are you sure you want to BLOCK student ${student.fullName}? They will not be able to log in.`
      : `Are you sure you want to UNBLOCK student ${student.fullName}?`;
      
    if (window.confirm(confirmMsg)) {
      await updateUserBlockedStatus(student.uid, nextStatus);
      // update state locally
      setUsers(users.map(u => u.uid === student.uid ? { ...u, blocked: nextStatus } : u));
    }
  };

  // Delete student
  const handleDeleteStudent = async (student: UserProfile) => {
    if (window.confirm(`Are you sure you want to permanently DELETE student ${student.fullName}? This cannot be undone.`)) {
      await deleteUserProfile(student.uid);
      setUsers(users.filter(u => u.uid !== student.uid));
      if (selectedStudent?.uid === student.uid) setSelectedStudent(null);
    }
  };

  // Delete examination
  const handleDeleteExam = async (examId: string, title: string) => {
    if (window.confirm(`Are you sure you want to permanently DELETE the examination "${title}"? This will delete all student attempts recorded for this exam.`)) {
      await deleteExamination(examId);
      setExams(exams.filter(e => e.id !== examId));
      setAttempts(attempts.filter(a => a.examId !== examId));
    }
  };

  // Quick edit exam save
  const handleQuickSaveExam = async (exam: Examination) => {
    if (!editTitle.trim()) return;
    const updatedExam = {
      ...exam,
      title: editTitle.trim(),
      duration: Number(editDuration) || 35
    };
    await saveExamination(updatedExam);
    setExams(exams.map(e => e.id === exam.id ? updatedExam : e));
    setEditingExamId(null);
  };

  // Quick toggle published status
  const handleTogglePublish = async (exam: Examination) => {
    const updatedExam = { ...exam, published: !exam.published };
    await saveExamination(updatedExam);
    setExams(exams.map(e => e.id === exam.id ? updatedExam : e));
  };

  // Reset student examination attempt
  const handleResetAttempts = async (studentId: string, examId: string, studentName: string, examTitle: string) => {
    if (window.confirm(`Are you sure you want to RESET attempts for "${studentName}" on examination "${examTitle}"? This will delete all their attempts for this exam so they can start fresh.`)) {
      await resetStudentAttemptsForExam(studentId, examId);
      // reload attempts
      const updatedAttempts = attempts.filter(a => !(a.studentId === studentId && a.examId === examId));
      setAttempts(updatedAttempts);
      if (selectedStudent) {
        setStudentAttempts(studentAttempts.filter(a => !(a.studentId === studentId && a.examId === examId)));
      }
    }
  };

  // View specific student's detail panel
  const handleViewStudentDetails = (student: UserProfile) => {
    const studentScorings = attempts.filter(a => a.studentId === student.uid);
    setSelectedStudent(student);
    setStudentAttempts(studentScorings);
  };

  // Export Results to CSV File
  const handleExportCSV = (listToExport: Attempt[]) => {
    const headers = ["Student Name", "Examination Title", "Subject", "Score", "Percentage", "Time Taken", "Date Completed"];
    const rows = listToExport.map(a => [
      a.studentName,
      a.examTitle,
      a.examSubject,
      `${a.score}/${a.maxScore}`,
      `${a.percentage}%`,
      `${Math.floor(a.timeTaken / 60)}m ${a.timeTaken % 60}s`,
      new Date(a.date).toLocaleString()
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `maranatha_exam_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate high-level admin metrics
  const totalStudents = users.filter(u => u.role === "student").length;
  const totalExams = exams.length;
  const totalAttemptsCount = attempts.length;
  const activeStudentsCount = users.filter(u => u.role === "student" && !u.blocked).length;
  const avgExamScore = totalAttemptsCount > 0 
    ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttemptsCount) 
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-800 dark:border-slate-800 dark:border-t-blue-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading administrator workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fadeIn">
      
      {/* Header bar and button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-geom-blue dark:text-blue-100 font-display">
            Workspace Controller
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor educational metrics, manage examinations, curate school curriculums, and view student progress confidentially.
          </p>
        </div>

        <button
          onClick={() => onNavigate("upload-exam")}
          className="flex items-center justify-center space-x-1.5 rounded bg-geom-blue hover:bg-geom-blue-hover px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors"
        >
          <Plus className="h-4.5 w-4.5 text-geom-gold" />
          <span>Create New Examination</span>
        </button>
      </div>

      {/* Metrics counters grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded bg-geom-blue-light text-geom-blue dark:bg-geom-blue/20 dark:text-blue-400">
            <Users className="h-4.5 w-4.5" />
          </div>
          <p className="text-4xs font-bold uppercase tracking-wider text-slate-500">Registered Students</p>
          <h3 className="text-2xl font-black text-geom-blue dark:text-blue-100 mt-1 font-display">{totalStudents}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded bg-geom-gold-light text-geom-gold dark:bg-geom-gold/25 dark:text-geom-gold">
            <BookOpen className="h-4.5 w-4.5" />
          </div>
          <p className="text-4xs font-bold uppercase tracking-wider text-slate-500">Total Examinations</p>
          <h3 className="text-2xl font-black text-geom-blue dark:text-blue-100 mt-1 font-display">{totalExams}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
            <History className="h-4.5 w-4.5" />
          </div>
          <p className="text-4xs font-bold uppercase tracking-wider text-slate-500">Exam Attempts</p>
          <h3 className="text-2xl font-black text-geom-blue dark:text-blue-100 mt-1 font-display">{totalAttemptsCount}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
            <UserCheck className="h-4.5 w-4.5" />
          </div>
          <p className="text-4xs font-bold uppercase tracking-wider text-slate-500">Active (Unblocked)</p>
          <h3 className="text-2xl font-black text-geom-blue dark:text-blue-100 mt-1 font-display">{activeStudentsCount}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded bg-geom-gold-light text-geom-gold dark:bg-geom-gold/25 dark:text-geom-gold">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
          <p className="text-4xs font-bold uppercase tracking-wider text-slate-500">Avg Exam Score</p>
          <h3 className="text-2xl font-black text-geom-blue dark:text-blue-100 mt-1 font-display">{avgExamScore}%</h3>
        </div>
      </div>

      {/* Main navigation tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex space-x-6 text-xs">
          <button
            onClick={() => { setActiveTab("exams"); setSelectedStudent(null); }}
            className={`pb-4 font-bold uppercase tracking-wider transition-colors relative ${
              activeTab === "exams" 
                ? "text-geom-blue dark:text-blue-300" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>Examinations ({exams.length})</span>
            {activeTab === "exams" && <span className="absolute bottom-0 left-0 right-0 h-1 bg-geom-gold rounded-full" />}
          </button>
          <button
            onClick={() => { setActiveTab("students"); setSelectedStudent(null); }}
            className={`pb-4 font-bold uppercase tracking-wider transition-colors relative ${
              activeTab === "students" 
                ? "text-geom-blue dark:text-blue-300" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>Students ({totalStudents})</span>
            {activeTab === "students" && <span className="absolute bottom-0 left-0 right-0 h-1 bg-geom-gold rounded-full" />}
          </button>
          <button
            onClick={() => { setActiveTab("results"); setSelectedStudent(null); }}
            className={`pb-4 font-bold uppercase tracking-wider transition-colors relative ${
              activeTab === "results" 
                ? "text-geom-blue dark:text-blue-300" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>All Results Logs</span>
            {activeTab === "results" && <span className="absolute bottom-0 left-0 right-0 h-1 bg-geom-gold rounded-full" />}
          </button>
        </div>
      </div>

      {/* VIEW: EXAMINATIONS TABLE */}
      {activeTab === "exams" && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search examinations..."
              value={examSearch}
              onChange={(e) => setExamSearch(e.target.value)}
              className="block w-full rounded border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs text-slate-900 outline-none focus:border-geom-gold dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-150 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-3xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 text-3xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150 dark:bg-slate-900/50 dark:border-slate-800">
                    <th className="px-6 py-4">Examination Title</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Grade / Class</th>
                    <th className="px-6 py-4">Term</th>
                    <th className="px-6 py-4">Questions</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredExams.map((exam) => {
                    const isEditing = editingExamId === exam.id;

                    return (
                      <tr key={exam.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            />
                          ) : (
                            <span className="font-bold text-blue-950 dark:text-blue-100">{exam.title}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-4xs font-bold uppercase tracking-wider text-blue-800 dark:bg-slate-800 dark:text-blue-400">
                            {exam.subject}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          {exam.grade}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {exam.term}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          {exam.questions.length} Questions
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editDuration}
                              onChange={(e) => setEditDuration(Number(e.target.value))}
                              className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            />
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">{exam.duration} mins</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleTogglePublish(exam)}
                            className={`inline-flex items-center space-x-1.5 rounded px-2.5 py-1 text-4xs font-bold uppercase tracking-wider transition-colors ${
                              exam.published
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : "bg-geom-gold-light text-geom-gold-dark hover:bg-geom-gold/20 dark:bg-geom-gold/10 dark:text-geom-gold"
                            }`}
                          >
                            <Power className="h-3 w-3" />
                            <span>{exam.published ? "Published" : "Draft"}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleQuickSaveExam(exam)}
                                  className="rounded bg-geom-blue hover:bg-geom-blue-hover px-2.5 py-1 text-4xs font-bold uppercase tracking-wider text-white transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingExamId(null)}
                                  className="rounded border border-slate-250 bg-white px-2.5 py-1 text-4xs font-bold uppercase tracking-wider text-slate-650 hover:bg-slate-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingExamId(exam.id);
                                    setEditTitle(exam.title);
                                    setEditDuration(exam.duration);
                                  }}
                                  className="text-slate-400 hover:text-blue-800 transition-colors"
                                  title="Edit examination metadata"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => onEditExam(exam)}
                                  className="text-slate-400 hover:text-blue-800 transition-colors"
                                  title="Edit individual questions"
                                >
                                  <FileText className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExam(exam.id, exam.title)}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                  title="Delete examination"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: STUDENTS LIST & RESULTS DETAILS */}
      {activeTab === "students" && (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          
          {/* Left panel: student table list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search students by name/email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="block w-full rounded border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs text-slate-900 outline-none focus:border-geom-gold dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-150 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-3xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 text-3xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150 dark:bg-slate-900/50 dark:border-slate-800">
                      <th className="px-6 py-4">Student Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Attempts Count</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {studentsList.map((student) => {
                      const studentScoringsCount = attempts.filter(a => a.studentId === student.uid).length;

                      return (
                        <tr 
                          key={student.uid} 
                          onClick={() => handleViewStudentDetails(student)}
                          className={`cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/10 ${
                            selectedStudent?.uid === student.uid 
                              ? "bg-blue-50/30 dark:bg-slate-800/20" 
                              : ""
                          }`}
                        >
                          <td className="px-6 py-4 font-bold text-blue-950 dark:text-blue-100">
                            {student.fullName}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                            {student.email}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                            {studentScoringsCount} Exams Completed
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-lg px-2.5 py-1 text-4xs font-bold uppercase tracking-wider ${
                              student.blocked
                                ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                                : "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                            }`}>
                              {student.blocked ? "Blocked" : "Active"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleToggleBlock(student)}
                                className={`text-xs font-bold px-2 py-1 rounded border transition-colors ${
                                  student.blocked
                                    ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-950 dark:bg-green-950/10"
                                    : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-950 dark:bg-red-950/10"
                                }`}
                                title={student.blocked ? "Unblock student" : "Block student"}
                              >
                                {student.blocked ? "Unblock" : "Block"}
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student)}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete student profile permanently"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right panel: student private scorings logs */}
          <div className="rounded-2xl border border-slate-150 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-3xs">
            {selectedStudent ? (
              <div className="space-y-5 animate-fadeIn">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-md font-extrabold text-blue-950 dark:text-blue-100">{selectedStudent.fullName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedStudent.email}</p>
                  </div>
                  <button
                    onClick={() => handleExportCSV(studentAttempts)}
                    className="flex items-center space-x-1 rounded-lg border border-slate-200 px-2.5 py-1 text-4xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                    title="Export student results to Excel"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Export</span>
                  </button>
                </div>

                <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-850">
                  <h4 className="text-3xs font-bold uppercase tracking-wider text-slate-400">Attempt Records ({studentAttempts.length})</h4>
                  
                  {studentAttempts.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No examinations attempted yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {studentAttempts.map((attempt) => (
                        <div key={attempt.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-bold text-blue-950 dark:text-blue-100 line-clamp-1">{attempt.examTitle}</p>
                              <p className="text-4xs text-slate-500 mt-0.5">{attempt.examSubject} • {new Date(attempt.date).toLocaleDateString()}</p>
                            </div>
                            <span className="text-sm font-black text-blue-800 dark:text-blue-400 shrink-0">{attempt.score}/{attempt.maxScore}</span>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-slate-100/60 pt-2 dark:border-slate-800/40">
                            <span className="text-3xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/25 px-2 py-0.5 rounded">
                              {attempt.percentage}% Correct
                            </span>
                            
                            <button
                              onClick={() => handleResetAttempts(selectedStudent.uid, attempt.examId, selectedStudent.fullName, attempt.examTitle)}
                              className="flex items-center space-x-1 text-4xs font-bold text-slate-500 hover:text-red-500"
                              title="Reset attempts for this specific examination"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Reset Attempt</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <Users className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                <h4 className="text-xs font-bold text-slate-500">Student Profile Summary</h4>
                <p className="text-3xs text-slate-400 mt-1 max-w-2xs mx-auto">Select any student row on the table to view their private attempts history and reset scores.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW: ALL RESULTS LOGS & CONFIDENTIAL PROGRESS SEARCH */}
      {activeTab === "results" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative max-w-sm w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search results by student, exam title..."
                value={resultsSearch}
                onChange={(e) => setResultsSearch(e.target.value)}
                className="block w-full rounded border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs text-slate-900 outline-none focus:border-geom-gold dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              onClick={() => handleExportCSV(filteredResults)}
              className="flex items-center space-x-1.5 rounded bg-geom-blue hover:bg-geom-blue-hover px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Entire Results (CSV)</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-150 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-3xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 text-3xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150 dark:bg-slate-900/50 dark:border-slate-800">
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Examination Title</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Date Completed</th>
                    <th className="px-6 py-4">Time Taken</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Percentage</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredResults.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                      <td className="px-6 py-4 font-bold text-blue-950 dark:text-blue-100">
                        {attempt.studentName}
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {attempt.examTitle}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-4xs font-bold uppercase tracking-wider text-blue-800 dark:bg-slate-800 dark:text-blue-400">
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
                          <span>{Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                        {attempt.score} / {attempt.maxScore}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${
                          attempt.percentage >= 80 
                            ? "text-green-600 dark:text-green-400" 
                            : attempt.percentage >= 50 
                              ? "text-amber-600 dark:text-amber-400" 
                              : "text-red-600 dark:text-red-400"
                        }`}>
                          {attempt.percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleResetAttempts(attempt.studentId, attempt.examId, attempt.studentName, attempt.examTitle)}
                          className="inline-flex items-center space-x-1 rounded-lg border border-red-200 px-2.5 py-1 text-4xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 dark:border-red-950 dark:text-red-400 dark:hover:bg-red-950/20"
                          title="Reset student scoring for this examination"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reset Score</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
