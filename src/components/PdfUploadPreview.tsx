import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  Trash2, 
  Plus, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  ArrowLeft,
  X,
  FileUp,
  Image as ImageIcon,
  BookOpen,
  GraduationCap,
  Calendar,
  Clock,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Question, Examination } from "../types";

interface PdfUploadPreviewProps {
  onBack: () => void;
  onPublishSuccess: () => void;
  initialExam?: Examination | null;
}

export default function PdfUploadPreview({ onBack, onPublishSuccess, initialExam }: PdfUploadPreviewProps) {
  // Navigation & step control
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Exam Details / Metadata
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [duration, setDuration] = useState<number>(35); // Duration in minutes

  // Questions State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<"manual" | "pdf">("manual");

  // File Upload refs & state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load initial exam if editing
  useEffect(() => {
    if (initialExam) {
      setTitle(initialExam.title || "");
      setSubject(initialExam.subject || "");
      setGrade(initialExam.grade || "");
      setTerm(initialExam.term || "Term 1");
      setDuration(initialExam.duration || 35);
      setQuestions(initialExam.questions || []);
    }
  }, [initialExam]);

  // Dynamic PDF.js script loader
  const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          resolve(pdfjsLib);
        } else {
          reject(new Error("PDF.js loaded but pdfjsLib is not defined on window."));
        }
      };
      script.onerror = () => reject(new Error("Failed to load PDF.js from CDN."));
      document.head.appendChild(script);
    });
  };

  // Dynamic Tesseract.js script loader
  const loadTesseract = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Tesseract) {
        resolve((window as any).Tesseract);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.onload = () => {
        const Tesseract = (window as any).Tesseract;
        if (Tesseract) {
          resolve(Tesseract);
        } else {
          reject(new Error("Tesseract loaded but is not defined on window."));
        }
      };
      script.onerror = () => reject(new Error("Failed to load Tesseract.js from CDN."));
      document.head.appendChild(script);
    });
  };

  // Client-side PDF OCR function
  const ocrScannedPdfClientSide = async (file: File, onProgress: (msg: string) => void): Promise<string> => {
    const pdfjsLib = await loadPdfJs();
    const Tesseract = await loadTesseract();
    
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    const totalPages = pdfDoc.numPages;
    for (let i = 1; i <= totalPages; i++) {
      onProgress(`Scanning document for text (Page ${i} of ${totalPages})...`);
      
      const page = await pdfDoc.getPage(i);
      // Scale 2.0 to make it clean for OCR
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) continue;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport }).promise;
      
      // Run OCR on the rendered page canvas
      const result = await Tesseract.recognize(canvas, "eng");
      fullText += (result.data?.text || "") + "\n";
    }

    return fullText;
  };

  

  // Handle Document (PDF, Word DOC/DOCX, RTF, Text TXT) text-extraction and backend parsing
const handleDocumentUpload = async (file: File) => {
  if (!file) return;
  setError("");
  setSuccess("");
  setLoading(true);

  const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
  
  if (!isPdf) {
    setError("Only PDF files supported right now");
    setLoading(false);
    return;
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/ocr", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "OCR failed");

    console.log("Extracted text:", data.text);
    setSuccess("PDF read successfully! Generating exam...");
    
    // TODO: Send data.text to your exam generator
    // await generateExamFromText(data.text);
    
  } catch (err: any) {
    console.error(err);
    setError(err.message || "Failed to process PDF");
  } finally {
    setLoading(false);
  }
};  
  
    
    }

    const fileTypeName = isPdf ? "PDF" : isRtf ? "RTF document" : isTxt ? "Text document" : "Word document";
    setLoadingMessage(`Maranatha AI is reading and extracting text from your exam ${fileTypeName}...`);

    try {
      let extractedText = "";

      if (isPdf) {
        // Try standard text extraction
        try {
          console.log("Attempting client-side standard PDF text extraction...");
          extractedText = await extractTextFromPdfClientSide(file);
        } catch (err) {
          console.warn("Client-side standard PDF text extraction failed:", err);
        }

        // If standard text extraction yields no useful text, run OCR
        if (!extractedText || extractedText.trim().length < 150) {
          console.log("PDF text layer missing or too short. Running OCR fallback using Tesseract.js...");
          try {
            extractedText = await ocrScannedPdfClientSide(file, (msg) => {
              setLoadingMessage(msg);
            });
          } catch (ocrError) {
            console.error("Client-side Tesseract OCR failed:", ocrError);
          }
        }

        // If client-side failed or returned very little text, try server-side PDF text extraction
        if (!extractedText || extractedText.trim().length < 150) {
          console.log("Client-side OCR / text extraction yielded insufficient text. Trying server-side extraction...");
          setLoadingMessage("Extracting text using robust server-side document reader...");
          
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/extract-document", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            let errMsg = "Could not read document. Try a text-based PDF or Word file.";
            try {
              const contentType = res.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                const errData = await res.json();
                errMsg = errData.error || errMsg;
              }
            } catch (_) {}
            throw new Error(errMsg);
          }

          const data = await res.json();
          if (data.success && Array.isArray(data.questions)) {
            const formatted: Question[] = data.questions.map((q: any, idx: number) => {
              const parsedOptions = Array.isArray(q.options) && q.options.length >= 2 
                ? q.options 
                : ["Option A", "Option B", "Option C", "Option D"];
              const parsedCorrect = typeof q.correctOption === "string" ? q.correctOption.trim().toUpperCase() : "A";
              return {
                id: `q-${Date.now()}-${idx}`,
                questionText: q.questionText || "",
                options: parsedOptions,
                correctOption: parsedCorrect,
                imageUrl: ""
              };
            });

            if (!title) {
              const baseName = file.name.replace(/\.[^/.]+$/, "");
              setTitle(baseName);
              const subjects = ["Math", "English", "Science", "History", "Geography", "Biology", "Chemistry", "Physics"];
              const detectedSub = subjects.find(s => baseName.toLowerCase().includes(s.toLowerCase()));
              if (detectedSub) setSubject(detectedSub);
            }

            setQuestions(formatted);
            setSuccess(`Successfully extracted ${data.questions.length} questions from exam PDF!`);
            return;
          } else {
            throw new Error(data.error || "Could not read document. Try a text-based PDF or Word file.");
          }
        }

        // We have the extracted text! Now parse it on the server
        setLoadingMessage("Maranatha AI is analyzing text patterns and generating interactive draft questions...");
        const res = await fetch("/api/parse-exam-text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ text: extractedText })
        });

        if (!res.ok) {
          let errMsg = "Could not read document. Try a text-based PDF or Word file.";
          try {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const errData = await res.json();
              errMsg = errData.error || errMsg;
            }
          } catch (_) {}
          throw new Error(errMsg);
        }

        const data = await res.json();
        if (data.success && Array.isArray(data.questions)) {
          const formatted: Question[] = data.questions.map((q: any, idx: number) => {
            const parsedOptions = Array.isArray(q.options) && q.options.length >= 2 
              ? q.options 
              : ["Option A", "Option B", "Option C", "Option D"];
            const parsedCorrect = typeof q.correctOption === "string" ? q.correctOption.trim().toUpperCase() : "A";
            return {
              id: `q-${Date.now()}-${idx}`,
              questionText: q.questionText || "",
              options: parsedOptions,
              correctOption: parsedCorrect,
              imageUrl: ""
            };
          });

          if (!title) {
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            setTitle(baseName);
            const subjects = ["Math", "English", "Science", "History", "Geography", "Biology", "Chemistry", "Physics"];
            const detectedSub = subjects.find(s => baseName.toLowerCase().includes(s.toLowerCase()));
            if (detectedSub) setSubject(detectedSub);
          }

          setQuestions(formatted);
          setSuccess(`Successfully extracted ${data.questions.length} questions from PDF!`);
        } else {
          throw new Error(data.error || "Could not read document. Try a text-based PDF or Word file.");
        }

      } else {
        // Non-PDF (Word DOCX/DOC, RTF, TXT) files are extracted and structured directly on the server
        setLoadingMessage(`Maranatha AI is reading and extracting text from your ${fileTypeName}...`);
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/extract-document", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          let errMsg = `The uploaded ${fileTypeName} is corrupted or cannot be read.`;
          try {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const errData = await res.json();
              errMsg = errData.error || errMsg;
            }
          } catch (_) {}
          throw new Error(errMsg);
        }

        const data = await res.json();
        if (data.success && Array.isArray(data.questions)) {
          const formatted: Question[] = data.questions.map((q: any, idx: number) => {
            const parsedOptions = Array.isArray(q.options) && q.options.length >= 2 
              ? q.options 
              : ["Option A", "Option B", "Option C", "Option D"];
            const parsedCorrect = typeof q.correctOption === "string" ? q.correctOption.trim().toUpperCase() : "A";
            return {
              id: `q-${Date.now()}-${idx}`,
              questionText: q.questionText || "",
              options: parsedOptions,
              correctOption: parsedCorrect,
              imageUrl: ""
            };
          });

          if (!title) {
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            setTitle(baseName);
            const subjects = ["Math", "English", "Science", "History", "Geography", "Biology", "Chemistry", "Physics"];
            const detectedSub = subjects.find(s => baseName.toLowerCase().includes(s.toLowerCase()));
            if (detectedSub) setSubject(detectedSub);
          }

          setQuestions(formatted);
          setSuccess(`Successfully extracted ${data.questions.length} questions from ${fileTypeName}!`);
        } else {
          throw new Error(data.error || `Could not parse questions from ${fileTypeName}. Make sure it contains questions and options.`);
        }
      }

    } catch (err: any) {
      console.error("Document upload flow failed:", err);
      setError(err.message || "Could not read document. Try a text-based PDF or Word file.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase();
      const isAllowed = ext.endsWith(".pdf") || ext.endsWith(".docx") || ext.endsWith(".doc") || ext.endsWith(".rtf") || ext.endsWith(".txt");
      if (!isAllowed) {
        setError("Unsupported file format. Please upload a PDF (.pdf), Microsoft Word document (.docx/.doc), RTF (.rtf), or Text (.txt) file.");
        return;
      }
      handleDocumentUpload(file);
    }
  };

  // Manual Question Management
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q-${Date.now()}-${questions.length}`,
        questionText: "",
        options: ["", "", "", ""],
        correctOption: "A",
        imageUrl: ""
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const updateQuestionText = (index: number, val: string) => {
    const updated = [...questions];
    updated[index].questionText = val;
    setQuestions(updated);
  };

  const updateQuestionOption = (qIndex: number, oIndex: number, val: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = val;
    setQuestions(updated);
  };

  const updateQuestionCorrect = (qIndex: number, val: string) => {
    const updated = [...questions];
    updated[qIndex].correctOption = val;
    setQuestions(updated);
  };

  const addQuestionOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push("");
    setQuestions(updated);
  };

  const removeQuestionOption = (qIndex: number, oIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length > 2) {
      updated[qIndex].options.splice(oIndex, 1);
      const maxLetter = String.fromCharCode(65 + updated[qIndex].options.length - 1);
      if (updated[qIndex].correctOption > maxLetter) {
        updated[qIndex].correctOption = "A";
      }
      setQuestions(updated);
    }
  };

  // Image Upload handler for each question
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image files (PNG/JPG/GIF) are supported for diagrams.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const updated = [...questions];
        updated[index].imageUrl = event.target.result as string;
        setQuestions(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    const updated = [...questions];
    updated[index].imageUrl = "";
    setQuestions(updated);
  };

  // Save/Publish exam handler
  const handlePublishExam = async () => {
    if (!title.trim() || !subject.trim() || !grade.trim()) {
      setError("Please complete all examination metadata (Title, Subject, and Grade) before publishing.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (questions.length === 0) {
      setError("Please add or extract at least 1 question to publish an examination.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Validate that questions are fully filled out
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setError(`Question ${i + 1} text is empty. Please complete or remove it.`);
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!q.options[j]?.trim()) {
          setError(`Option ${["A", "B", "C", "D"][j]} of Question ${i + 1} is empty.`);
          return;
        }
      }
    }

    setLoading(true);
    setLoadingMessage("Publishing and storing school examination securely...");

    try {
      const { saveExamination } = await import("../services/db");
      
      const examObj: Examination = {
        id: initialExam ? initialExam.id : `exam-${Date.now()}`,
        title: title.trim(),
        subject: subject.trim(),
        grade: grade.trim(),
        term: term,
        duration: Number(duration) || 35,
        numQuestions: questions.length,
        published: true,
        createdAt: initialExam ? (initialExam.createdAt || new Date().toISOString()) : new Date().toISOString(),
        questions: questions
      };

      await saveExamination(examObj);
      onPublishSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to publish examination. Please verify Firestore connectivity.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  // Start manual mode with 1 empty question
  const handleStartManual = () => {
    setActiveTab("manual");
    if (questions.length === 0) {
      setQuestions([
        {
          id: `q-${Date.now()}-0`,
          questionText: "",
          options: ["", "", "", ""],
          correctOption: "A",
          imageUrl: ""
        }
      ]);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="space-y-1">
          <button
            onClick={onBack}
            className="group flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-geom-gold group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Controller</span>
          </button>
          <h1 className="text-2xl font-black text-geom-blue dark:text-blue-100 font-display mt-2">
            {initialExam ? "Edit Examination" : "Configure Examination Workspace"}
          </h1>
        </div>

        <button
          onClick={handlePublishExam}
          disabled={loading || questions.length === 0}
          className="rounded bg-geom-blue hover:bg-geom-blue-hover disabled:bg-slate-300 disabled:dark:bg-slate-800 disabled:text-slate-400 text-white font-black uppercase tracking-wider px-6 py-3 text-xs shadow-sm transition-colors cursor-pointer"
        >
          {initialExam ? "Update & Publish" : "Confirm & Publish"}
        </button>
      </div>

      {/* Dynamic Alerts */}
      {error && (
        <div className="flex items-start space-x-3 rounded-lg border border-rose-200 bg-rose-50/50 p-4 text-rose-800 dark:border-rose-950/40 dark:bg-rose-950/10 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
          <div className="text-xs font-medium leading-relaxed">{error}</div>
        </div>
      )}

      {success && (
        <div className="flex items-start space-x-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-emerald-800 dark:border-emerald-950/40 dark:bg-emerald-950/10 dark:text-emerald-300">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
          <div className="text-xs font-medium leading-relaxed">{success}</div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="rounded-xl border border-blue-150 bg-blue-50/20 p-6 dark:border-blue-950/40 dark:bg-slate-900/40 flex items-center space-x-4 animate-pulse">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-800 border-t-transparent" />
          <p className="text-xs font-bold text-blue-900 dark:text-blue-300">{loadingMessage}</p>
        </div>
      )}

      {/* PART 1: METADATA FORM CARD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-3xs space-y-5">
        <h3 className="text-sm font-black uppercase tracking-widest text-geom-blue dark:text-blue-200 flex items-center space-x-2">
          <BookOpen className="h-4.5 w-4.5 text-geom-gold" />
          <span>Examination Curriculum Parameters</span>
        </h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
          {/* Title */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-4xs font-bold uppercase tracking-wider text-slate-500">Examination Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mid-Term General Mathematics"
              className="block w-full rounded border border-slate-200 bg-slate-50/40 py-2.5 px-3.5 text-xs text-slate-900 focus:border-geom-gold outline-none transition-all dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label className="text-4xs font-bold uppercase tracking-wider text-slate-500">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              className="block w-full rounded border border-slate-200 bg-slate-50/40 py-2.5 px-3.5 text-xs text-slate-900 focus:border-geom-gold outline-none transition-all dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {/* Grade */}
          <div className="space-y-1">
            <label className="text-4xs font-bold uppercase tracking-wider text-slate-500">Grade / Class</label>
            <input
              type="text"
              required
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="e.g. Grade 10"
              className="block w-full rounded border border-slate-200 bg-slate-50/40 py-2.5 px-3.5 text-xs text-slate-900 focus:border-geom-gold outline-none transition-all dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {/* Term & Duration */}
          <div className="grid grid-cols-2 gap-2 md:col-span-1">
            <div className="space-y-1">
              <label className="text-4xs font-bold uppercase tracking-wider text-slate-500 font-sans">Term</label>
              <div className="relative">
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="appearance-none block w-full rounded border border-slate-200 bg-slate-50/40 py-2.5 pl-3 pr-8 text-xs text-slate-900 focus:border-geom-gold outline-none transition-all dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                  <option value="Final">Final</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-3.5 h-3 w-3 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-4xs font-bold uppercase tracking-wider text-slate-500">Minutes</label>
              <input
                type="number"
                min={5}
                max={300}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="block w-full rounded border border-slate-200 bg-slate-50/40 py-2.5 px-3.5 text-xs text-slate-900 focus:border-geom-gold outline-none transition-all dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* PART 2: OPTION SELECTION (Only show if questions are empty) */}
      {questions.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OPTION 1 CARD */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-3xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded bg-blue-50 dark:bg-blue-950/20 text-geom-blue dark:text-blue-400 flex items-center justify-center">
                <Plus className="h-5 w-5 text-geom-gold" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Option 1: Manual Builder
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Type questions one-by-one. Fill options, pick the correct answer, and upload custom diagram illustrations dynamically.
                </p>
              </div>
            </div>
            <button
              onClick={handleStartManual}
              className="mt-6 w-full text-center rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Start Manual Question Entry
            </button>
          </div>

          {/* OPTION 2 CARD */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-2xl border bg-white p-6 dark:bg-slate-900 shadow-3xs flex flex-col justify-between transition-all ${
              isDragging 
                ? "border-geom-gold border-dashed bg-amber-50/10 scale-[1.02]" 
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="space-y-4">
              <div className="h-10 w-10 rounded bg-amber-50 dark:bg-amber-950/20 text-geom-gold flex items-center justify-center">
                <FileUp className="h-5 w-5 text-geom-gold" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Option 2: Document & PDF Auto-Extractor
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Upload a school exam in PDF (.pdf), Word (.docx/.doc), Rich Text (.rtf), or Plain Text (.txt) format. Our system will read the file contents, perform OCR scans on scanned images if needed, preserve mathematical symbols, and extract the multiple choice questions automatically.
                </p>
              </div>
            </div>
            
            <div className="mt-6 space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDocumentUpload(file);
                }}
                accept="application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, .docx, .doc, application/msword, application/rtf, text/rtf, .rtf, text/plain, .txt"
                className="hidden"
                id="main-document-input"
              />
              <label
                htmlFor="main-document-input"
                className="block text-center rounded bg-geom-blue hover:bg-geom-blue-hover text-white py-3 text-xs font-bold uppercase tracking-wider shadow-xs cursor-pointer transition-colors"
              >
                Upload Exam Document
              </label>
              <p className="text-4xs text-slate-400 text-center font-bold uppercase tracking-wider">
                Supports PDF, Word, RTF & TXT • Drag & drop file anywhere on this card
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PART 3: QUESTIONS WORKSPACE / ADMIN PREVIEW */}
      {questions.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-geom-blue dark:text-blue-300 block">
                Exam Question Draft List
              </span>
              <span className="text-4xs font-bold text-slate-400 uppercase tracking-wider mt-0.5 block">
                {questions.length} questions loaded • You can fully review and modify all details
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={addQuestion}
                className="flex items-center space-x-1 rounded bg-amber-500 hover:bg-amber-600 px-3 py-2 text-xs font-bold text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Question</span>
              </button>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear all questions in this draft?")) {
                    setQuestions([]);
                    setSuccess("");
                    setError("");
                  }
                }}
                className="flex items-center space-x-1 rounded border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 px-3 py-2 text-xs font-bold transition-colors dark:border-rose-900/40 dark:bg-slate-900 dark:hover:bg-rose-950/20"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {questions.map((q, idx) => (
              <div 
                key={q.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-3xs relative group transition-all"
              >
                {/* Remove question index */}
                <button
                  type="button"
                  onClick={() => removeQuestion(idx)}
                  className="absolute top-4 right-4 h-7 w-7 rounded-full bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center transition-colors border border-slate-100 dark:border-slate-850"
                  title="Remove Question"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <div className="space-y-4">
                  {/* Header Question Label */}
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex h-5.5 w-5.5 items-center justify-center rounded bg-geom-blue text-white text-3xs font-black">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-extrabold text-geom-blue dark:text-blue-300 uppercase tracking-wider font-sans">
                      Question Entry
                    </span>
                  </div>

                  {/* Question Main Inputs (Text and optional Image layout side-by-side) */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Text field */}
                    <div className="lg:col-span-3 space-y-1">
                      <label className="text-4xs font-semibold uppercase tracking-wider text-slate-400">Question Text</label>
                      <textarea
                        rows={2}
                        required
                        value={q.questionText}
                        onChange={(e) => updateQuestionText(idx, e.target.value)}
                        placeholder="Type question content exactly as it should appear..."
                        className="block w-full rounded border border-slate-200 bg-slate-50/20 p-3 text-xs text-slate-900 focus:border-geom-gold outline-none transition-all dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 resize-none font-medium leading-relaxed"
                      />
                    </div>

                    {/* Image / Diagram upload */}
                    <div className="lg:col-span-1 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/20 dark:bg-slate-950/10 flex flex-col justify-center items-center">
                      <label className="text-4xs font-semibold uppercase tracking-wider text-slate-400 self-start mb-2">Question Diagram</label>
                      
                      {q.imageUrl ? (
                        <div className="relative w-full h-24 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950 flex items-center justify-center">
                          <img
                            src={q.imageUrl}
                            alt="Question illustration thumbnail"
                            className="max-h-full max-w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs hover:bg-rose-600 transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full flex flex-col items-center justify-center py-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, idx)}
                            className="hidden"
                            id={`diagram-upload-${q.id}`}
                          />
                          <label
                            htmlFor={`diagram-upload-${q.id}`}
                            className="flex flex-col items-center justify-center px-4 py-2 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer text-4xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 shadow-2xs border-dashed transition"
                          >
                            <ImageIcon className="h-4.5 w-4.5 text-slate-400 mb-1" />
                            <span>Upload Diagram</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multiple Choice Options Grid (Tight 2x2 layout, no extra blank line spaces) */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {q.options.map((optionText, oIdx) => {
                        const prefix = String.fromCharCode(65 + oIdx);
                        return (
                          <div key={oIdx} className="flex items-center space-x-2 relative group/option">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                              {prefix}
                            </span>
                            <input
                              type="text"
                              required
                              value={optionText}
                              onChange={(e) => updateQuestionOption(idx, oIdx, e.target.value)}
                              placeholder={`Type content for Option ${prefix}...`}
                              className="block w-full rounded border border-slate-200 bg-slate-50/20 py-2 px-3 pr-8 text-xs text-slate-900 focus:border-geom-gold outline-none transition-all dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeQuestionOption(idx, oIdx)}
                                className="absolute right-2 text-slate-400 hover:text-rose-500 transition-colors"
                                title={`Delete Option ${prefix}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex justify-start">
                      <button
                        type="button"
                        onClick={() => addQuestionOption(idx)}
                        className="flex items-center space-x-1 rounded border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 px-2.5 py-1 text-4xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Option</span>
                      </button>
                    </div>
                  </div>

                  {/* Correct Option Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/50 gap-2">
                    <span className="text-4xs font-semibold uppercase tracking-wider text-slate-400">
                      Determine Correct Examination Option
                    </span>
                    
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-850">
                      {q.options.map((_, oIdx) => {
                        const opt = String.fromCharCode(65 + oIdx);
                        const isCorrect = q.correctOption === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateQuestionCorrect(idx, opt)}
                            className={`px-3 py-1 text-2xs font-extrabold rounded-md transition-all ${
                              isCorrect 
                                ? "bg-geom-blue text-white shadow-2xs" 
                                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          >
                            Option {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>

          {/* Action Footer panel */}
          <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4.5 rounded-xl">
            <button
              onClick={addQuestion}
              className="flex items-center space-x-1.5 rounded bg-geom-gold hover:bg-geom-gold/90 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-900 transition-colors cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Add Another Question</span>
            </button>
            
            <button
              onClick={handlePublishExam}
              disabled={loading || questions.length === 0}
              className="rounded bg-geom-blue hover:bg-geom-blue-hover disabled:bg-slate-300 disabled:dark:bg-slate-800 disabled:text-slate-400 text-white font-black uppercase tracking-wider px-6 py-3 text-xs shadow-sm transition-colors cursor-pointer"
            >
              {initialExam ? "Update & Save Examination" : "Confirm & Publish Examination"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
