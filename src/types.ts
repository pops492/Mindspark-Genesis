export type Role = 'teacher' | 'student';

export interface User {
  id: string | number;       // ← updated: Supabase uses string UUIDs
  name: string;
  email: string;
  pass: string;
  role: Role;
  progress: Record<string, boolean>;
  subject?: string;
  code?: string;
  students?: number[];
  form?: string;
  teacherId?: string | number; // ← updated: also accepts string UUID
}

export interface Feature {
  id: number;
  name: string;
  desc: string;
}

export interface Assignment {
  id: string;
  teacherId: number;
  teacherName: string;
  title: string;
  content: string;
  date: string;
  isExam?: boolean;
  questions?: string[];
  answers?: Record<number, {
    score: number;
    misconceptions: string[];
    advice: string;
  }>;
}
