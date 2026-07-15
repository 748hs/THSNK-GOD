import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile, Examination, Attempt } from "../types";

// User Profile management
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const userRef = doc(db, "users", profile.uid);
  await setDoc(userRef, profile, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const usersCol = collection(db, "users");
  const snap = await getDocs(usersCol);
  const users: UserProfile[] = [];
  snap.forEach((doc) => {
    users.push(doc.data() as UserProfile);
  });
  return users;
}

export async function updateUserBlockedStatus(uid: string, blocked: boolean): Promise<void> {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { blocked });
}

export async function deleteUserProfile(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  await deleteDoc(userRef);
}

// Examination management
export async function saveExamination(exam: Examination): Promise<void> {
  const examRef = doc(db, "examinations", exam.id);
  await setDoc(examRef, exam);
}

export async function deleteExamination(examId: string): Promise<void> {
  const examRef = doc(db, "examinations", examId);
  await deleteDoc(examRef);
  
  // Also clean up attempts for this exam
  const attemptsCol = collection(db, "attempts");
  const q = query(attemptsCol, where("examId", "==", examId));
  const snap = await getDocs(q);
  for (const doc of snap.docs) {
    await deleteDoc(doc.ref);
  }
}

export async function getAllExaminations(onlyPublished = false): Promise<Examination[]> {
  const examsCol = collection(db, "examinations");
  let snap;
  if (onlyPublished) {
    const q = query(examsCol, where("published", "==", true));
    snap = await getDocs(q);
  } else {
    snap = await getDocs(examsCol);
  }
  
  const exams: Examination[] = [];
  snap.forEach((doc) => {
    exams.push(doc.data() as Examination);
  });
  
  // Sort by createdAt descending
  return exams.sort((a, b) => {
    const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt?.seconds * 1000 || 0;
    const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt?.seconds * 1000 || 0;
    return timeB - timeA;
  });
}

// Attempts management
export async function saveAttempt(attempt: Attempt): Promise<void> {
  const attemptRef = doc(db, "attempts", attempt.id);
  await setDoc(attemptRef, attempt);
}

export async function getStudentAttempts(studentId: string): Promise<Attempt[]> {
  const attemptsCol = collection(db, "attempts");
  const q = query(attemptsCol, where("studentId", "==", studentId));
  const snap = await getDocs(q);
  const attempts: Attempt[] = [];
  snap.forEach((doc) => {
    attempts.push(doc.data() as Attempt);
  });
  return attempts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getExamAttempts(examId: string): Promise<Attempt[]> {
  const attemptsCol = collection(db, "attempts");
  const q = query(attemptsCol, where("examId", "==", examId));
  const snap = await getDocs(q);
  const attempts: Attempt[] = [];
  snap.forEach((doc) => {
    attempts.push(doc.data() as Attempt);
  });
  return attempts;
}

export async function getAllAttempts(): Promise<Attempt[]> {
  const attemptsCol = collection(db, "attempts");
  const snap = await getDocs(attemptsCol);
  const attempts: Attempt[] = [];
  snap.forEach((doc) => {
    attempts.push(doc.data() as Attempt);
  });
  return attempts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function resetStudentAttemptsForExam(studentId: string, examId: string): Promise<void> {
  const attemptsCol = collection(db, "attempts");
  const q = query(attemptsCol, where("studentId", "==", studentId), where("examId", "==", examId));
  const snap = await getDocs(q);
  for (const doc of snap.docs) {
    await deleteDoc(doc.ref);
  }
}
