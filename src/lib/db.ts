// src/lib/db.ts
// All database helper functions live here.
// App.tsx imports from this file to talk to Supabase.

import { supabase } from './supabase';

// ─────────────────────────────────────────────
// PROFILES
// ─────────────────────────────────────────────

/** Get a single user's profile by their Supabase auth ID */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) console.error('getProfile error:', error.message);
  return data;
}

/** Get all students belonging to a specific teacher */
export async function getMyStudents(teacherId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('role', 'student');

  if (error) console.error('getMyStudents error:', error.message);
  return data ?? [];
}

/** Update a user's progress object in the profiles table */
export async function updateProgress(userId: string, progress: Record<string, boolean>) {
  const { error } = await supabase
    .from('profiles')
    .update({ progress })
    .eq('id', userId);

  if (error) console.error('updateProgress error:', error.message);
}


// ─────────────────────────────────────────────
// ASSIGNMENTS  (Day 4)
// ─────────────────────────────────────────────

/** Create a new assignment (teacher only) */
export async function createAssignment(data: {
  teacher_id: string;
  title: string;
  content?: string;
  due_date?: string;
  is_exam?: boolean;
  questions?: any[];
}) {
  const { data: result, error } = await supabase
    .from('assignments')
    .insert(data)
    .select()
    .single();

  if (error) console.error('createAssignment error:', error.message);
  return result;
}

/** Get all assignments created by a teacher */
export async function getTeacherAssignments(teacherId: string) {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) console.error('getTeacherAssignments error:', error.message);
  return data ?? [];
}

/** Get assignments a student can see (from their teacher) */
export async function getStudentAssignments(teacherId: string) {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) console.error('getStudentAssignments error:', error.message);
  return data ?? [];
}

/** Delete an assignment by its ID */
export async function deleteAssignment(id: string) {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id);

  if (error) console.error('deleteAssignment error:', error.message);
}


// ─────────────────────────────────────────────
// PROGRESS TRACKING  (Day 4)
// ─────────────────────────────────────────────

/** Mark a single topic as completed for a student */
export async function markTopicComplete(data: {
  student_id: string;
  subject: string;
  form: string;
  topic: string;
}) {
  const { error } = await supabase
    .from('progress')
    .upsert({ ...data, completed: true }, { onConflict: 'student_id,subject,topic' });

  if (error) console.error('markTopicComplete error:', error.message);
}

/** Get all completed topics for a student as { topicName: true } */
export async function getStudentProgress(studentId: string) {
  const { data, error } = await supabase
    .from('progress')
    .select('topic, subject, form, completed')
    .eq('student_id', studentId);

  if (error) console.error('getStudentProgress error:', error.message);

  const progressMap: Record<string, boolean> = {};
  (data ?? []).forEach((row: any) => {
    progressMap[row.topic] = row.completed;
  });
  return progressMap;
}

/** Fetch completion stats for all students under a specific teacher.
 *  FIXED: now properly filters by teacher's students only. */
export async function getClassProgress(teacherId: string) {
  // Step 1: get all student IDs for this teacher
  const { data: students, error: studentError } = await supabase
    .from('profiles')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('role', 'student');

  if (studentError) {
    console.error('getClassProgress (students) error:', studentError.message);
    return [];
  }

  const studentIds = (students ?? []).map((s: any) => s.id);
  if (studentIds.length === 0) return [];

  // Step 2: get progress rows only for those students
  const { data, error } = await supabase
    .from('progress')
    .select('topic, subject, form, completed, student_id')
    .in('student_id', studentIds);

  if (error) {
    console.error('getClassProgress error:', error.message);
    return [];
  }
  return data ?? [];
}


// ─────────────────────────────────────────────
// AI USAGE LOGGING  (Day 5)
// ─────────────────────────────────────────────

/** Log a Gemini AI call — call this every time your app uses the AI */
export async function logAIUsage(data: {
  user_id: string;
  feature: 'spark_ai' | 'quiz' | 'textbook' | 'ocr' | 'library';
  prompt?: string;
  tokens_used?: number;
}) {
  const { error } = await supabase
    .from('ai_logs')
    .insert(data);

  // We don't crash the app if logging fails — it's non-critical
  if (error) console.warn('AI log failed (non-critical):', error.message);
}

/** Get AI usage history for a user */
export async function getAIStats(userId: string) {
  const { data, error } = await supabase
    .from('ai_logs')
    .select('feature, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) console.error('getAIStats error:', error.message);
  return data ?? [];
}
