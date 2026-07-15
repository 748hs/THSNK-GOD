export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: "admin" | "student";
  blocked: boolean;
  createdAt: string;
}

export interface Question {
  id: string; // unique ID
  questionText: string;
  options: string[]; // exactly 4 options
  correctOption: string; // "A", "B", "C", "D"
  imageUrl?: string; // base64 string or URL
}

export interface Examination {
  id: string;
  title: string;
  subject: string;
  grade: string;
  term: string;
  duration: number; // in minutes
  numQuestions: number;
  published: boolean;
  createdAt: any; // Timestamp or ISO string
  questions: Question[];
}

export interface Attempt {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  examSubject: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeTaken: number; // in seconds
  date: string; // ISO string
  answers: Record<number, string>; // questionIndex -> selectedOption ("A", "B", "C", "D")
  questionsSnapshot: Question[]; // exact state of questions at the time of attempt
}
