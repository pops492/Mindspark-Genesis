import React, { useState, useEffect, useMemo } from 'react';
import { 
  createAssignment, 
  getTeacherAssignments, 
  getStudentAssignments,
  getMyStudents,
  markTopicComplete,
  getStudentProgress,
  logAIUsage,
  getClassProgress
} from './lib/db';
import { 
  Brain, 
  Users, 
  Layers, 
  FileText, 
  PenTool, 
  Sparkles, 
  BookOpen, 
  FlaskConical, 
  LayoutGrid, 
  Power, 
  ChevronRight, 
  ChevronLeft, 
  CloudUpload,
  Search,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  UserCheck,
  Activity,
  Target,
  ClipboardList,
  Calendar,
  Clock,
  Trash2,
  ScanText,
  Image as ImageIcon,
  FilePlus,
  FileUp,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
 

} from 'recharts';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';
import { Role, User, Feature, Assignment } from './types';
import { MASTER_SYLLABUS, FEATURE_MATRIX } from './constants';

// --- Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const INITIAL_DUMMY_DATA: User[] = [
  {
    id: 1,
    name: "Ms B Ncube",
    email: "ncue@gmail.com",
    pass: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
    role: 'teacher',
    subject: "Mathematics",
    code: "ZIM-2026",
    progress: {},
    students: [101, 102, 103, 201, 202, 303, 304, 305, 306]
  },
  // Form 3
  { id: 101, name: "Tinashe Chigumba", email: "tinashe@student.zw", pass: "d74ff62edc223a41b528a49c97b8304917415494d4d8a55425265495c6c06a88", role: 'student', form: "Form 3", teacherId: 1, subject: "Mathematics", progress: { "Quadratic Equations": true, "Trigonometry": true } },
  { id: 102, name: "Ruvimbo Mashaire", email: "ruvimbo@student.zw", pass: "d74ff62edc223a41b528a49c97b8304917415494d4d8a55425265495c6c06a88", role: 'student', form: "Form 3", teacherId: 1, subject: "Mathematics", progress: { "Circle Geometry": true } },
  { id: 103, name: "Kudzai Zvobgo", email: "kudzai@student.zw", pass: "d74ff62edc223a41b528a49c97b8304917415494d4d8a55425265495c6c06a88", role: 'student', form: "Form 3", teacherId: 1, subject: "Mathematics", progress: { "Quadratic Equations": true, "Circle Geometry": true, "Trigonometry": true, "Variation": true } },
  // Form 4
  { id: 201, name: "Nyasha Mutasa", email: "nyasha@student.zw", pass: "d74ff62edc223a41b528a49c97b8304917415494d4d8a55425265495c6c06a88", role: 'student', form: "Form 4", teacherId: 1, subject: "Mathematics", progress: { "Matrices": true } },
  { id: 202, name: "Farai Gumbo", email: "farai@student.zw", pass: "d74ff62edc223a41b528a49c97b8304917415494d4d8a55425265495c6c06a88", role: 'student', form: "Form 4", teacherId: 1, subject: "Mathematics", progress: { "Matrices": true, "Vectors": true, "Calculus Basics": true } },
  // Form 6
  { id: 303, name: "Asaph Shiri", email: "asaph@student.zw", pass: "d74ff62edc223a41b528a49c97b8304917415494d4d8a55425265495c6c06a88", role: 'student', form: "Form 6", teacherId: 1, subject: "Mathematics", progress: { "Differential Equations": true, "Probability Distributions": true } },
  { id: 304, name: "Vuyiso Ncube", email: "vuyiso@student.zw", pass: "d74ff62edc223a41b528a49c97b8304917415494d4d8a55425265495c6c06a88", role: 'student', form: "Form 6", teacherId: 1, subject: "Mathematics", progress: { "Numerical Methods": true, "Mechanics 2": true } },
  { id: 305, name: "Strive", email: "strive@student.zw", pass: "d74ff62edc223a41b528a49c97b8304917415494d4d8a55425265495c6c06a88", role: 'student', form: "Form 6", teacherId: 1, subject: "Mathematics", progress: { "Vectors in 3D": true, "Hypothesis Testing": true, "Probability Distributions": true } },
  { id: 306, name: "Mazvitaishe Moyo", email: "mazvitaishe@student.zw", pass: "d74ff62edc223a41b528a49c97b8304917415494d4d8a55425265495c6c06a88", role: 'student', form: "Form 6", teacherId: 1, subject: "Mathematics", progress: { "Differential Equations": true, "Numerical Methods": true, "Mechanics 2": true } },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'home' | 'login' | 'register' | 'dashboard'>('home');
  const [role, setRole] = useState<Role>('teacher');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [db, setDb] = useState<User[]>(() => {
    const saved = localStorage.getItem('mindspark_ultra_db');
    let currentDb: User[] = saved ? JSON.parse(saved) : [];
    
    // Cleanup: Remove old Form 6 students if they exist
    const unwantedIds = [301, 302];
    currentDb = currentDb.filter(u => !unwantedIds.includes(Number(u.id)));

    // Ensure all dummy data is present in the DB
    INITIAL_DUMMY_DATA.forEach(dummy => {
      if (!currentDb.find(u => u.email === dummy.email)) {
        currentDb.push(dummy);
      }
    });

    return currentDb;
  });

  useEffect(() => {
    localStorage.setItem('mindspark_ultra_db', JSON.stringify(db));
  }, [db]);

  // ── NEW: Restore Supabase session when page refreshes ──────────────
  // Without this, the user gets logged out every time they refresh the page.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentUser({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            subject: profile.subject,
            form: profile.form,
            code: profile.class_code,
            teacherId: profile.teacher_id,
            progress: profile.progress || {},
            students: profile.students || [],
            pass: '', // never store plain passwords
          });
          setView('dashboard');
        }
      }
    });
  }, []); // ← empty array means this runs ONCE when the page first loads
  // ───────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await supabase.auth.signOut(); // ← NEW: properly sign out from Supabase
    setCurrentUser(null);
    setView('home');
    setActiveTab('overview');
  };

  return (
    <div className="min-h-screen bg-bg-deep text-text-main font-sans selection:bg-accent-cyan/30">
      <Header currentUser={currentUser} setView={setView} onLogout={handleLogout} />
      
      <main className="pt-20">
        <AnimatePresence mode="wait">
          {view === 'home' && <HomeView key="home" setView={setView} />}
          {view === 'register' && (
            <RegisterView 
              key="register" 
              role={role} 
              setRole={setRole} 
              db={db} 
              setDb={setDb} 
              setView={setView} 
            />
          )}
          {view === 'login' && (
            <LoginView 
              key="login" 
              db={db} 
              setCurrentUser={setCurrentUser} 
              setView={setView} 
              setActiveTab={setActiveTab}
            />
          )}
          {view === 'dashboard' && currentUser && (
            <DashboardView 
              key="dashboard" 
              user={currentUser} 
              db={db}
              setDb={setDb}
              setCurrentUser={setCurrentUser}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onLogout={handleLogout}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Components ---

function Header({ currentUser, setView, onLogout }: { currentUser: User | null, setView: (v: any) => void, onLogout: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-bg-card/80 backdrop-blur-md border-b border-accent-cyan/10 z-50 flex items-center justify-between px-8">
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('home')}>
        <div className="p-2 bg-accent-cyan/10 rounded-lg group-hover:bg-accent-cyan/20 transition-colors">
          <Brain className="w-8 h-8 text-accent-cyan" />
        </div>
        <h1 className="text-xl font-bold tracking-tighter">
          MINDSPARK<span className="text-accent-cyan">.ULTIMATE</span>
        </h1>
      </div>

      <nav className="flex items-center gap-4">
        {currentUser ? (
          <>
            <span className="text-sm font-medium text-accent-cyan hidden sm:inline">
              {currentUser.name}
            </span>
            <button 
              onClick={() => setView('dashboard')}
              className="px-4 py-2 bg-accent-cyan text-bg-deep text-xs font-bold uppercase tracking-widest rounded hover:bg-accent-cyan/80 transition-all"
            >
              Dashboard
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => setView('login')}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest hover:text-accent-cyan transition-colors"
            >
              Login
            </button>
            <button 
              onClick={() => setView('register')}
              className="px-4 py-2 bg-accent-cyan text-bg-deep text-xs font-bold uppercase tracking-widest rounded hover:bg-accent-cyan/80 transition-all"
            >
              Join
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

function HomeView({ setView }: { setView: (v: any) => void }) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-6xl mx-auto px-8 py-20 text-center"
    >
      <div className="inline-block px-4 py-1.5 mb-8 rounded-full border border-accent-cyan/20 bg-accent-cyan/5">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-cyan">
          The Ultimate Learning Platform
        </span>
      </div>
      
      <h2 className="text-5xl md:text-7xl font-extrabold mb-8 leading-[1.1]">
        One Core. <span className="text-accent-cyan">Six Forms.</span><br />
        Infinite Potential.
      </h2>
      
      <p className="text-text-slate text-lg max-w-2xl mx-auto mb-12">
        The ultimate AI Learning tool comprehensively built to suit all your educational needs each day.
        Engineered for the ZIMSEC curriculum from Form 1 to Form 6.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button 
          onClick={() => setView('register')}
          className="w-full sm:w-auto px-8 py-4 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest rounded-lg hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]"
        >
          Sign Up
        </button>
        <button 
          onClick={() => setView('login')}
          className="w-full sm:w-auto px-8 py-4 border border-accent-cyan text-accent-cyan font-bold uppercase tracking-widest rounded-lg hover:bg-accent-cyan/5 transition-all"
        >
          Login
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-24">
        {[
          { label: 'Topics', val: 'F1 - F6' },
          { label: 'AI Features', val: '100+' },
          { label: 'Real-time Sync', val: 'Real-time' },
          { label: 'Uptime', val: '100%' },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-bg-card border border-accent-cyan/10 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-slate mb-2">{stat.label}</div>
            <div className="text-3xl font-bold text-white">{stat.val}</div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function RegisterView({ role, setRole, db, setDb, setView }: { 
  role: Role, 
  setRole: (r: Role) => void, 
  db: User[], 
  setDb: (d: User[]) => void, 
  setView: (v: any) => void 
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    pass: '',
    subject: 'Mathematics',
    code: '',
    form: 'Form 1'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // STEP 1: Create the account in Supabase Auth (handles passwords securely)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.pass,
    });

    if (authError) {
      alert('Registration failed: ' + authError.message);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) return;

    // STEP 2: Save the extra profile info (name, role, form, etc.) to our database
    const profileData: any = {
      id: userId,
      name: formData.name,
      email: formData.email,
      role: role,
    };

    if (role === 'teacher') {
      const classCode = 'ZIM-' + Math.floor(1000 + Math.random() * 8999);
      profileData.subject = formData.subject;
      profileData.class_code = classCode;
      alert('Teacher account created! Your class code: ' + classCode);
    } else {
      profileData.form = formData.form;

      // Find the teacher by their class code
      const { data: teacher } = await supabase
        .from('profiles')
        .select('id, subject')
        .eq('class_code', formData.code.toUpperCase())
        .single();

      if (teacher) {
        profileData.teacher_id = teacher.id;
        profileData.subject = teacher.subject;
      } else {
        profileData.subject = 'Mathematics';
        alert('Teacher code not found. Using default subject.');
      }
    }

    await supabase.from('profiles').insert(profileData);
    setView('login');
  };

  return (
    <motion.section 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto px-8 py-12"
    >
      <div className="bg-bg-card border border-accent-cyan/20 p-8 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-2">Create Account</h2>
        <p className="text-text-slate text-center text-sm mb-8">Select your role to get started.</p>
        
        <div className="flex bg-bg-deep p-1 rounded-lg mb-8 border border-accent-cyan/10">
          <button 
            onClick={() => setRole('teacher')}
            className={cn(
              "flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all",
              role === 'teacher' ? "bg-accent-cyan text-bg-deep" : "text-text-slate hover:text-white"
            )}
          >
            Teacher
          </button>
          <button 
            onClick={() => setRole('student')}
            className={cn(
              "flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all",
              role === 'student' ? "bg-accent-cyan text-bg-deep" : "text-text-slate hover:text-white"
            )}
          >
            Student
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-accent-cyan mb-1.5">Full Name</label>
            <input 
              type="text" 
              required
              className="w-full bg-bg-light border border-accent-cyan/10 rounded-lg p-3 text-white focus:border-accent-cyan outline-none transition-all"
              placeholder="Enter full name"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-accent-cyan mb-1.5">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-bg-light border border-accent-cyan/10 rounded-lg p-3 text-white focus:border-accent-cyan outline-none transition-all"
              placeholder="email@address.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-accent-cyan mb-1.5">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-bg-light border border-accent-cyan/10 rounded-lg p-3 text-white focus:border-accent-cyan outline-none transition-all"
              placeholder="••••••••"
              value={formData.pass}
              onChange={e => setFormData({...formData, pass: e.target.value})}
            />
          </div>

          {role === 'teacher' ? (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-accent-cyan mb-1.5">Subject</label>
              <select 
                className="w-full bg-bg-light border border-accent-cyan/10 rounded-lg p-3 text-white focus:border-accent-cyan outline-none transition-all appearance-none"
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
              >
                {Object.keys(MASTER_SYLLABUS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-accent-cyan mb-1.5">Class Code</label>
                <input 
                  type="text" 
                  className="w-full bg-bg-light border border-accent-cyan/10 rounded-lg p-3 text-white focus:border-accent-cyan outline-none transition-all"
                  placeholder="ZIM-XXXX"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-accent-cyan mb-1.5">Current Form</label>
                <select 
                  className="w-full bg-bg-light border border-accent-cyan/10 rounded-lg p-3 text-white focus:border-accent-cyan outline-none transition-all appearance-none"
                  value={formData.form}
                  onChange={e => setFormData({...formData, form: e.target.value})}
                >
                  {["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </>
          )}

          <button 
            type="submit"
            className="w-full py-4 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest rounded-lg hover:bg-accent-cyan/80 transition-all mt-4"
          >
            Initialize Profile
          </button>
        </form>
      </div>
    </motion.section>
  );
}

function LoginView({ db, setCurrentUser, setView, setActiveTab }: { 
  db: User[], 
  setCurrentUser: (u: User) => void, 
  setView: (v: any) => void,
  setActiveTab: (t: string) => void
}) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // STEP 1: Sign in using Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      alert('Login failed: ' + error.message);
      return;
    }

    // STEP 2: Fetch the user's full profile from our database
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profile) {
      // Convert the database profile into the User shape the app uses
      const appUser: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        subject: profile.subject,
        form: profile.form,
        code: profile.class_code,
        teacherId: profile.teacher_id,
        progress: profile.progress || {},
        students: profile.students || [],
        pass: '', // never store plain passwords
      };
      setCurrentUser(appUser);
      setActiveTab(profile.role === 'teacher' ? 'students' : 'overview');
      setView('dashboard');
    }
  };

  return (
    <motion.section 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto px-8 py-20"
    >
      <div className="bg-bg-card border border-accent-cyan/20 p-8 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-8">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-accent-cyan mb-1.5">Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-bg-light border border-accent-cyan/10 rounded-lg p-3 text-white focus:border-accent-cyan outline-none transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-accent-cyan mb-1.5">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-bg-light border border-accent-cyan/10 rounded-lg p-3 text-white focus:border-accent-cyan outline-none transition-all"
              value={pass}
              onChange={e => setPass(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest rounded-lg hover:bg-accent-cyan/80 transition-all mt-4"
          >
            Sign In
          </button>
        </form>
      </div>
    </motion.section>
  );
}

function DashboardView({ user, db, setDb, setCurrentUser, activeTab, setActiveTab, onLogout }: { 
  user: User, 
  db: User[], 
  setDb: (d: User[]) => void,
  setCurrentUser: (u: User) => void,
  activeTab: string,
  setActiveTab: (t: string) => void,
  onLogout: () => void
}) {
  const [isClassNodesOpen, setIsClassNodesOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  type SidebarItem = {
    id?: string;
    label: string;
    icon?: React.ElementType;
    type?: string;
    subItems?: string[];
    onClick?: () => void;
  };

  const sidebarItems: SidebarItem[] = useMemo(() => {
    if (user.role === 'teacher') {
      return [
        { id: 'students', label: 'My Classes', icon: Users, subItems: ['Form 3', 'Form 4', 'Form 6'] },
        { id: 'syllabus', label: 'Learning Mastery', icon: Layers },
        { id: 'assignments', label: 'Assignments/Tests', icon: ClipboardList },
        { id: 'textbook', label: 'Textbook AI', icon: FileText },
        { id: 'ocr', label: 'Handwriting OCR', icon: PenTool },
        { id: 'spark', label: 'Spark AI', icon: Sparkles },
        { id: 'features', label: 'Settings/Features', icon: LayoutGrid },
      ];
    } else {
      const subjects = [
        { name: "Pure Mathematics", icon: Brain, color: "text-accent-cyan" },
        { name: "Chemistry", icon: FlaskConical, color: "text-accent-purple" },
        { name: "Physics", icon: Activity, color: "text-accent-yellow" },
        { name: "Biology", icon: Target, color: "text-accent-green" },
      ];

      const items = [
        { id: 'overview', label: 'The Academic Aura Leaderboard', icon: LayoutGrid },
        { type: 'category', label: 'My Subjects' },
      ];

      subjects.forEach(sub => {
        items.push({ 
          id: `sub-${sub.name}`, 
          label: sub.name, 
          icon: sub.icon,
          onClick: () => {
             setSelectedSubject(sub.name);
             setActiveTab('syllabus');
          }
        } as any);
      });

      if (selectedSubject) {
        items.push({ type: 'category', label: `Study (${selectedSubject})` });
        items.push({ id: 'syllabus', label: 'Learning Mastery', icon: Layers });
        items.push({ id: 'library', label: 'Study Library', icon: BookOpen });
        items.push({ id: 'quiz', label: 'AI Quizzes', icon: FlaskConical });
        items.push({ type: 'category', label: 'Tools' });
        items.push({ id: 'textbook', label: 'Textbook AI', icon: FileText });
        items.push({ id: 'ocr', label: 'Handwriting OCR', icon: PenTool });
        items.push({ type: 'category', label: 'Class Work' });
        items.push({ id: 'assignments', label: 'Assignments/Tests', icon: ClipboardList });
        items.push({ type: 'category', label: 'MindSpark' });
        items.push({ id: 'spark', label: 'Spark AI', icon: Sparkles });
        items.push({ id: 'features', label: 'Settings/Features', icon: LayoutGrid });
      }

      return items;
    }
  }, [user.role, selectedSubject]);

  return (
    <div className="max-w-7xl mx-auto px-8 pb-20">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <motion.aside 
          animate={{ width: isCollapsed ? 80 : 280 }}
          className="bg-bg-card border border-accent-cyan/10 rounded-2xl p-4 h-fit sticky top-28 transition-all overflow-hidden"
        >
          <div className="flex justify-end mb-4">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg bg-white/5 text-text-slate hover:text-accent-cyan transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <div className={cn("text-center mb-8 pb-8 border-b border-accent-cyan/10", isCollapsed && "pb-4")}>
            <div className={cn(
              "bg-bg-bright border-2 border-accent-cyan rounded-full mx-auto flex items-center justify-center text-accent-cyan transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]",
              isCollapsed ? "w-10 h-10" : "w-16 h-16 mb-4"
            )}>
              {user.role === 'teacher' ? <UserCheck className={isCollapsed ? "w-5 h-5" : "w-8 h-8"} /> : <Users className={isCollapsed ? "w-5 h-5" : "w-8 h-8"} />}
            </div>
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h4 className="font-bold text-white truncate px-2">{user.name}</h4>
                <div className="text-[10px] font-bold uppercase tracking-widest text-accent-cyan mt-1">
                  {user.role === 'teacher' ? '⚡ Teacher' : '🎓 Student'}
                </div>
              </motion.div>
            )}
          </div>

          {!isCollapsed && (
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-slate mb-4 ml-2">Menu</div>
          )}
          
          <nav className="space-y-1">
            {sidebarItems.map((item, idx) => {
              if (item.type === 'category') {
                if (isCollapsed) return <div key={idx} className="h-px bg-accent-cyan/10 my-4" />;
                return (
                  <div key={idx} className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent-cyan/50 mt-6 mb-2 ml-4">
                    {item.label}
                  </div>
                );
              }
              
              const isSelected = activeTab === item.id || (item.id === `sub-${selectedSubject}`);
              const ItemIcon = item.icon;
              
              return (
              <div key={item.id ?? item.label}>
                <button 
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                      return;
                    }
                    if (item.id === 'students' && user.role === 'teacher') {
                      setIsClassNodesOpen(!isClassNodesOpen);
                    }
                    if (item.id === 'overview' && user.role === 'student') {
                      setSelectedSubject(null);
                    }
                    if (item.id) setActiveTab(item.id);
                  }}
                  title={isCollapsed ? item.label : ""}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all",
                    isSelected ? "bg-accent-cyan/10 text-accent-cyan" : "text-text-slate hover:text-white hover:bg-white/5",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  {ItemIcon && <ItemIcon className="w-4 h-4 shrink-0" />}
                  {!isCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
                      {item.label}
                    </motion.span>
                  )}
                  {item.subItems && !isCollapsed && (
                    <motion.div 
                      animate={{ rotate: isClassNodesOpen ? 90 : 0 }}
                      className="ml-auto"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </motion.div>
                  )}
                </button>
                
                {item.subItems && isClassNodesOpen && !isCollapsed && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="ml-9 mt-1 space-y-1 overflow-hidden"
                  >
                    {item.subItems.map((sub: string) => (
                      <button 
                        key={sub}
                        onClick={() => setActiveTab(`class-${sub.toLowerCase().replace(' ', '')}`)}
                        className={cn(
                          "w-full text-left px-4 py-2 text-xs font-medium rounded-md transition-all",
                          activeTab === `class-${sub.toLowerCase().replace(' ', '')}` ? "text-accent-cyan bg-accent-cyan/5" : "text-text-slate hover:text-white"
                        )}
                      >
                        {sub}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            );
            })}
            
            <button 
              onClick={onLogout}
              title={isCollapsed ? "Logout" : ""}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-accent-red hover:bg-accent-red/5 transition-all mt-8",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Power className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Logout
                </motion.span>
              )}
            </button>
          </nav>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 bg-bg-card border border-accent-cyan/10 rounded-2xl p-8 min-h-[600px] overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (user.role === 'student' ? <NeuralArena key="neural-arena" user={user} db={db} /> : <OverviewTab key="overview" user={user} db={db} />)}
            {activeTab === 'students' && <ClassNodesOverviewTab key="students" setActiveTab={setActiveTab} />}
            {activeTab.startsWith('class-') && <ClassNodeTab key={activeTab} form={activeTab.split('-')[1]} user={user} db={db} />}
            {activeTab === 'syllabus' && <SyllabusTab key="syllabus" user={user} db={db} setCurrentUser={setCurrentUser} />}
            {activeTab === 'library' && <LibraryTab key="library" currentUserId={user.id as string} />}
            {activeTab === 'assignments' && <AssignmentsTab key="assignments" user={user} />}
            {activeTab === 'quiz' && <QuizTab key="quiz" />}
            {activeTab === 'textbook' && <TextbookTab key="textbook" />}
            {activeTab === 'ocr' && <OCRTab key="ocr" />}
            {activeTab === 'spark' && <SparkAITab key="spark" currentUserId={user.id as string} />}
            {activeTab === 'features' && <FeaturesTab key="features" />}
            {/* Other tabs would be implemented similarly */}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function NeuralArena({ user, db }: { user: User; db: User[] }) {
  const [velocity, setVelocity] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0;
      const target = 15840;
      const interval = setInterval(() => {
        current += Math.floor(target / 40);
        if (current >= target) {
          setVelocity(target);
          clearInterval(interval);
        } else {
          setVelocity(current);
        }
      }, 30);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const leaderboard = [
    { rank: 1, name: "Kudzai Zvobgo", score: 15840, avatar: "KZ", color: "from-yellow-400 to-orange-500" },
    { rank: 2, name: "Ruvimbo Mashaire", score: 14220, avatar: "RM", color: "from-slate-300 to-slate-500" },
    { rank: 3, name: "Tinashe Chigumba", score: 13950, avatar: "TC", color: "from-amber-600 to-amber-800" },
    { rank: 4, name: "Nyasha Mutasa", score: 12800, avatar: "NM", color: "from-blue-400 to-blue-600" },
    { rank: 5, name: "Farai Gumbo", score: 12100, avatar: "FG", color: "from-blue-400 to-blue-600" },
    { rank: 6, name: "Asaph Shiri", score: 11500, avatar: "AS", color: "from-blue-400 to-blue-600" },
    { rank: 7, name: "Vuyiso Ncube", score: 10900, avatar: "VN", color: "from-blue-400 to-blue-600" },
    { rank: 8, name: "Strive", score: 10200, avatar: "S", color: "from-blue-400 to-blue-600" },
    { rank: 9, name: "Mazvitaishe Moyo", score: 9800, avatar: "MM", color: "from-blue-400 to-blue-600" },
    { rank: 10, name: "Your Shadow", score: 8500, avatar: "YU", color: "from-slate-600 to-slate-800" },
  ];

  const bounties = [
    { title: "Chemistry Speedrun", task: "Finish the quiz in 2 minutes", reward: "+500 Points", icon: FlaskConical },
    { title: "Neural Sync", task: "Complete 3 topics without AI help", reward: "x2 Multiplier", icon: Brain },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8 bg-[#010611] -m-8 p-8 min-h-screen text-[#00f0ff]"
    >
      <div className="flex flex-col xl:flex-row gap-8">
        {/* Left Column: Leaderboard */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic">The Academic Aura <span className="text-white opacity-50">/ Leaderboard</span></h2>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] bg-[#00f0ff]/10 px-3 py-1 rounded-full border border-[#00f0ff]/20">
              <Activity className="w-3 h-3 animate-pulse" />
              Calibrating Intelligence...
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-[#00f0ff]/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.05)]">
            <div className="p-6 space-y-3">
              {leaderboard.map((student, i) => (
                <motion.div
                  key={student.rank}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "group relative flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-crosshair",
                    student.rank === 1 
                      ? "bg-gradient-to-r from-yellow-400/20 to-orange-500/0 border-yellow-400/30 shadow-[0_0_30px_rgba(250,204,21,0.1)]" 
                      : "bg-white/5 border-white/5 hover:border-[#00f0ff]/40 hover:bg-[#00f0ff]/5"
                  )}
                >
                  <div className="w-8 text-lg font-black italic opacity-30 group-hover:opacity-100 transition-opacity">
                    #{student.rank}
                  </div>
                  
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg",
                    student.rank === 1 ? "bg-gradient-to-br from-yellow-400 to-orange-600 scale-110" : "bg-white/10"
                  )}>
                    {student.avatar}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white group-hover:text-[#00f0ff] transition-colors">{student.name}</h4>
                      {student.rank === 1 && <span className="text-yellow-400">👑</span>}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest opacity-40">Cognitive Load: {82 + i * 2}%</div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black font-mono tracking-tighter">
                      {student.rank === 1 ? velocity.toLocaleString() : student.score.toLocaleString()}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Velocity Score</div>
                  </div>

                  {student.rank === 1 && (
                    <div className="absolute inset-0 bg-yellow-400/5 animate-pulse rounded-2xl pointer-events-none" />
                  )}
                </motion.div>
              ))}
            </div>
            <div className="p-4 bg-white/5 border-t border-white/5 text-center">
              <button className="text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors">Expand Full Roster</button>
            </div>
          </div>
        </div>

        {/* Right Column: Status & Bounties */}
        <div className="w-full xl:w-96 space-y-6">
          {/* Streak Zone */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-[#00f0ff]/20 to-purple-600/20 backdrop-blur-xl border border-[#00f0ff]/30 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,240,255,0.1)] relative overflow-hidden group"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-[#00f0ff]/20 rounded-2xl shadow-[0_0_20px_rgba(0,240,255,0.3)]">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="bg-yellow-400 text-bg-deep text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  1.5x Multiplier
                </div>
              </div>
              <h3 className="text-3xl font-black italic tracking-tighter text-white mb-1">7 DAY STREAK</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-6">Don't let the flame die, or the AI will be disappointed.</p>
              
              <div className="flex gap-2 mb-8">
                {[1,1,1,1,1,1,0].map((d, i) => (
                  <div key={i} className={cn("flex-1 h-1.5 rounded-full", d ? "bg-[#00f0ff] shadow-[0_0_10px_#00f0ff]" : "bg-white/10")} />
                ))}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-[#00f0ff] border-t-transparent animate-spin" />
                <div className="text-[10px] font-bold uppercase tracking-widest">Neural Link: Stable</div>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#00f0ff]/10 rounded-full blur-3xl group-hover:bg-[#00f0ff]/20 transition-all" />
          </motion.div>

          {/* Rank Status */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 mb-6 flex items-center gap-2">
              <Target className="w-3 h-3" />
              Cognitive Rank Status
            </h4>
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Current Title</div>
                <h3 className="text-2xl font-black tracking-tighter text-white uppercase italic">Newtonian Legend</h3>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#00f0ff]">Level 42</div>
              </div>
            </div>
            <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '72%' }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-[#00f0ff] shadow-[0_0_15px_#00f0ff]" 
              />
            </div>
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest opacity-40">
              <span>Scholar</span>
              <span>Grandmaster</span>
            </div>
          </div>

          {/* Bounty Board */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 flex items-center gap-2">
              <Layers className="w-3 h-3" />
              Active Bounties (Neural Missions)
            </h4>
            <div className="grid grid-cols-1 gap-4">
              {bounties.map(b => (
                <div key={b.title} className="bg-white/5 border border-[#00f0ff]/10 p-5 rounded-2xl group hover:border-[#00f0ff]/40 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#00f0ff]/5 rounded-xl group-hover:scale-110 transition-transform">
                      <b.icon className="w-5 h-5 text-[#00f0ff]" />
                    </div>
                    <div className="flex-1">
                      <h5 className="text-xs font-bold text-white mb-0.5">{b.title}</h5>
                      <p className="text-[10px] opacity-50 truncate">{b.task}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-[#00f0ff] tracking-widest uppercase">{b.reward}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function OverviewTab({ user, db, onEnterSubject }: { user: User, db: User[], onEnterSubject?: (s: string) => void }) {
  const sub = user.subject || "Mathematics";
  const form = user.form || "Form 1";
  const topics = MASTER_SYLLABUS[sub]?.[form] || [];
  const done = Object.keys(user.progress).length;
  const progressPerc = topics.length > 0 ? Math.round((done / topics.length) * 100) : 0;
  // For the student count stat card — uses local db as fallback
  const myStudentsCount = db.filter(u => (u.teacherId === user.id || u.teacherId === 1) && u.role === 'student').length;

  // ── ANALYTICS: Load class progress data AND live student count for teachers ───
  const [classProgressData, setClassProgressData] = useState<any[]>([]);
  const [liveStudentCount, setLiveStudentCount] = useState<number | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      if (user.role === 'teacher' && user.id) {
        const data = await getClassProgress(user.id as string);
        setClassProgressData(data);
        // Count unique students from the live data
        const uniqueStudents = new Set(data.map((row: any) => row.student_id));
        setLiveStudentCount(uniqueStudents.size);
      }
    }
    loadAnalytics();
  }, [user.id, user.role]);
  // ──────────────────────────────────────────────────────────────────────────────

  const data = [
    { name: 'Mon', val: 12 },
    { name: 'Tue', val: 19 },
    { name: 'Wed', val: 15 },
    { name: 'Thu', val: 25 },
    { name: 'Fri', val: 22 },
    { name: 'Sat', val: 30 },
    { name: 'Sun', val: 45 },
  ];

  if (user.role === 'student') {
    const combinations = [
      { name: "Pure Mathematics", icon: Brain, color: "text-accent-cyan", desc: "Advanced calculus and algebraic structures." },
      { name: "Chemistry", icon: FlaskConical, color: "text-accent-purple", desc: "Organic, inorganic and physical chemistry nodes." },
      { name: "Physics", icon: Activity, color: "text-accent-yellow", desc: "Quantum mechanics and classical dynamics." },
      { name: "Biology", icon: Target, color: "text-accent-green", desc: "Molecular biology and ecosystem analytics." },
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold mb-2">Subject Combination</h2>
        <p className="text-text-slate text-sm mb-8">Your subjects for the current academic cycle.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {combinations.map((c) => (
            <div 
              key={c.name} 
              onClick={() => onEnterSubject?.(c.name)}
              className="p-6 bg-bg-light border border-accent-cyan/10 rounded-2xl hover:border-accent-cyan/40 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={cn("p-3 rounded-xl bg-white/5 group-hover:scale-110 transition-transform", c.color)}>
                  <c.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{c.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-slate">Core Subject</p>
                </div>
              </div>
              <p className="text-xs text-text-slate leading-relaxed mb-6">{c.desc}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1 bg-bg-bright rounded-full overflow-hidden">
                    <div className={cn("h-full", c.color.replace('text-', 'bg-'))} style={{ width: '45%' }} />
                  </div>
                  <span className="text-[10px] font-bold text-text-slate">45%</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-accent-cyan group-hover:underline">
                  Access Subject
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold mb-2">Dashboard Overview</h2>
      <p className="text-text-slate text-sm">System Status: <span className="text-accent-green font-bold">ACTIVE</span></p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <StatCard label="Course Mastery" val={`${progressPerc}%`} />
        <StatCard label="Students" val={user.role === 'teacher' ? (liveStudentCount !== null ? liveStudentCount.toString() : myStudentsCount.toString()) : 'Linked'} />
        <StatCard label="Form Level" val={form.split(' ')[1]} />
        <StatCard label="AI Speed" val="Fast" />
      </div>

      <div className="mt-12 p-6 bg-bg-light rounded-xl border border-accent-cyan/10">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-accent-cyan" />
          <h3 className="font-bold">Learning Progress</h3>
        </div>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1d2e4a" vertical={false} />
              <XAxis dataKey="name" stroke="#7a8a9e" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#7a8a9e" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#081222', border: '1px solid rgba(0,240,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#00f0ff' }}
              />
              <Line type="monotone" dataKey="val" stroke="#00f0ff" strokeWidth={2} dot={{ fill: '#00f0ff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

function ClassNodesOverviewTab({ setActiveTab }: { setActiveTab: (t: string) => void }) {
  const forms = [
    { id: 'form3', label: 'Form 3', students: 12, performance: '72%', color: 'text-accent-cyan' },
    { id: 'form4', label: 'Form 4', students: 8, performance: '68%', color: 'text-accent-yellow' },
    { id: 'form6', label: 'Form 6', students: 4, performance: '84%', color: 'text-accent-green' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold mb-2">My Classes</h2>
      <p className="text-text-slate text-sm mb-8">Select a class to see student progress and reports.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {forms.map(form => (
          <button
            key={form.id}
            onClick={() => setActiveTab(`class-${form.id}`)}
            className="group bg-bg-light border border-accent-cyan/10 p-6 rounded-2xl hover:border-accent-cyan/40 hover:bg-accent-cyan/5 transition-all text-left"
          >
            <div className={`text-3xl font-bold mb-4 ${form.color}`}>{form.label}</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-text-slate uppercase tracking-widest">Students</span>
                <span className="text-white font-bold">{form.students}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-slate uppercase tracking-widest">Avg Score</span>
                <span className="text-white font-bold">{form.performance}</span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-accent-cyan opacity-0 group-hover:opacity-100 transition-opacity">
              View Class <ChevronRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function StudentDiagnosticView({ student, onBack }: { student: any, onBack: () => void }) {
  const [activeDiagTab, setActiveDiagTab] = useState<'performance' | 'diagnostic' | 'expert'>('performance');

  const performanceData = [
    { name: 'Week 1', score: 55 },
    { name: 'Week 2', score: 62 },
    { name: 'Week 3', score: 74 },
    { name: 'Week 4 (Mock)', score: 78 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-accent-cyan hover:text-accent-cyan/80 transition-all text-sm font-bold uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Class
        </button>
        <div className="flex gap-2">
          {['performance', 'diagnostic', 'expert'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveDiagTab(t as any)}
              className={cn(
                "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all border",
                activeDiagTab === t 
                  ? "bg-accent-cyan/10 border-accent-cyan text-accent-cyan" 
                  : "border-accent-cyan/10 text-text-slate hover:text-white"
              )}
            >
              {t === 'performance' ? 'Performance' : t === 'diagnostic' ? 'AI Report' : 'Expert Advice'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeDiagTab === 'performance' && (
          <motion.div 
            key="perf"
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 bg-bg-light p-6 rounded-xl border border-accent-cyan/10">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-accent-cyan" />
                <h3 className="font-bold uppercase tracking-widest text-xs">Learning Progress</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1d2e4a" vertical={false} />
                    <XAxis dataKey="name" stroke="#7a8a9e" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#7a8a9e" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#081222', border: '1px solid rgba(0,240,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#00f0ff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#00f0ff" 
                      strokeWidth={3} 
                      dot={{ fill: '#bc13fe', r: 6, strokeWidth: 0 }} 
                      activeDot={{ r: 8, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-bg-light p-8 rounded-xl border border-accent-cyan/20 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent-cyan mb-4">Exam Readiness Score</span>
              <h1 className="text-7xl font-bold text-accent-cyan mb-6">{student.avgMark + 5}%</h1>
              <button 
                onClick={() => alert('Full PDF Report Generated')}
                className="w-full py-3 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(0,255,242,0.4)] transition-all"
              >
                Export to Headmaster
              </button>
            </div>
          </motion.div>
        )}

        {activeDiagTab === 'diagnostic' && (
          <motion.div 
            key="diag"
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-bold">Paper 9701/21 Diagnostic</h2>
            <div className="bg-bg-light p-6 rounded-xl border border-accent-cyan/10">
              <h4 className="text-accent-purple font-bold uppercase tracking-widest text-xs mb-4">Critical Concept Failures</h4>
              <div className="space-y-6">
                <div>
                  <p className="font-bold text-white mb-2">Q1(b): Electronic Configuration of Tellurium</p>
                  <p className="text-sm text-text-slate leading-relaxed">
                    {student.name} correctly identified the Group (16), but failed to explain why the atomic radius increases. He confused shielding with nuclear charge dominance.
                  </p>
                </div>
                <div className="h-px bg-accent-cyan/5" />
                <div>
                  <p className="font-bold text-white mb-2">Q2(a): Enthalpy of Formation (ΔHf)</p>
                  <p className="text-sm text-text-slate leading-relaxed">
                    Calculation error in Hess's Cycle. Misinterpreted the direction of the arrow for the combustion of Sulfur.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeDiagTab === 'expert' && (
          <motion.div 
            key="expert"
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-bold text-accent-cyan">Teacher Strategy Panel</h2>
            <p className="text-text-slate text-sm">Pedagogical interventions suggested by senior examiners.</p>

            <div className="bg-accent-yellow/5 border-l-4 border-accent-yellow p-6 rounded-r-xl">
              <div className="flex items-center gap-2 text-accent-yellow font-bold uppercase tracking-widest text-[10px] mb-4">
                <Brain className="w-4 h-4" />
                Senior Examiner Advice
              </div>
              <p className="font-bold text-white mb-2">The Issue: Sign confusion in Energetics (Q2)</p>
              <p className="text-sm text-text-slate italic leading-relaxed mb-4">
                "{student.name} is treating Hess's Law as a formula rather than a path. Experts suggest moving away from ΔH = ΣProd - ΣReact and instead using the 'Energy Cycle Diagram' approach. If he visualizes the energy level, he won't get the signs reversed."
              </p>
              <button 
                className="px-4 py-2 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest text-[10px] rounded hover:shadow-[0_0_15px_rgba(0,255,242,0.3)] transition-all"
                onClick={(e) => {
                  const btn = e.currentTarget;
                  btn.innerText = 'SENT TO STUDENT';
                  btn.style.opacity = '0.5';
                }}
              >
                Send Visual Aid to {student.name.split(' ')[0]}
              </button>
            </div>

            <div className="bg-accent-purple/5 border-l-4 border-accent-purple p-6 rounded-r-xl">
              <div className="flex items-center gap-2 text-accent-purple font-bold uppercase tracking-widest text-[10px] mb-4">
                <Target className="w-4 h-4" />
                Subject Specialist Tip
              </div>
              <p className="font-bold text-white mb-2">The Issue: Periodicity Trends (Q1)</p>
              <p className="text-sm text-text-slate italic leading-relaxed mb-4">
                "The student understands the concept but lacks the specific 'Cambridge Keywords'. He must mention 'Effective Nuclear Charge' and 'Shielding Effect' in the same sentence to secure the mark. Use the 'Keyword Scaffolding' worksheet."
              </p>
              <button 
                className="px-4 py-2 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest text-[10px] rounded hover:shadow-[0_0_15px_rgba(0,255,242,0.3)] transition-all"
                onClick={() => alert('Worksheet Shared')}
              >
                Assign Keyword Drill
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ClassNodeTab({ form, user, db }: { form: string, user: User, db: User[] }) {
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [myStudents, setMyStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const formLabel = form === 'form3' ? 'Form 3' : form === 'form4' ? 'Form 4' : form === 'form6' ? 'Form 6' : form.charAt(0).toUpperCase() + form.slice(1);

  // This maps the URL slug (e.g. "form3") to how it's stored in the database ("Form 3")
  const formDbLabel = form === 'form3' ? 'Form 3' : form === 'form4' ? 'Form 4' : 'Form 6';

  // Load students from Supabase when the tab opens
  useEffect(() => {
    async function loadStudents() {
      setLoading(true);
      const students = await getMyStudents(user.id as string);
      // Filter to only show students in this form
      const filtered = students.filter((s: any) => s.form === formDbLabel);
      setMyStudents(filtered);
      setLoading(false);
    }
    loadStudents();
  }, [user.id, formDbLabel]);

  // Build the display data (add mock marks based on progress)
  const studentData = myStudents.map(s => {
    const progressCount = Object.keys(s.progress || {}).length;
    const avgMark = Math.min(100, Math.max(30, (progressCount * 8) + Math.floor(Math.random() * 20)));
    const potentialMark = Math.min(100, avgMark + Math.floor(Math.random() * 15) + 5);
    return { ...s, avgMark, potentialMark };
  });

  if (selectedStudent) {
    return <StudentDiagnosticView student={selectedStudent} onBack={() => setSelectedStudent(null)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-accent-cyan w-8 h-8 mr-3" />
        <span className="text-text-slate">Loading students from database...</span>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold mb-2">{formLabel} Classes</h2>
      <p className="text-text-slate text-sm mb-8">Dedicated analytics for your {formLabel} class.</p>

      {/* Student Marks Table */}
      <div className="bg-bg-light rounded-xl border border-accent-cyan/10 overflow-hidden mb-8">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-bg-bright/50 border-b border-accent-cyan/10">
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-accent-cyan">Student Name</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-accent-cyan">Average Mark</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-accent-cyan">Potential Mark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-accent-cyan/5">
            {studentData.length > 0 ? studentData.map(s => (
              <tr 
                key={s.id} 
                className="hover:bg-white/5 transition-colors cursor-pointer group"
                onClick={() => setSelectedStudent(s)}
              >
                <td className="p-4 font-medium text-white group-hover:text-accent-cyan transition-colors">{s.name}</td>
                <td className="p-4">
                  <span className={cn(
                    "font-bold",
                    s.avgMark >= 75 ? "text-accent-green" : s.avgMark >= 50 ? "text-accent-yellow" : "text-accent-red"
                  )}>
                    {s.avgMark}%
                  </span>
                </td>
                <td className="p-4 text-accent-cyan font-bold">{s.potentialMark}%</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="p-8 text-center text-text-slate italic">
                  No students found in this node.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Average Mark Bar Graph */}
      <div className="bg-bg-light p-6 rounded-xl border border-accent-cyan/10">
        <h3 className="font-bold mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent-cyan" />
          Average Mark Distribution
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={studentData.map(s => ({ name: s.name, mark: s.avgMark }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1d2e4a" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#7a8a9e" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                interval={0}
              />
              <YAxis 
                stroke="#7a8a9e" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#081222', border: '1px solid rgba(0,240,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#00f0ff' }}
                cursor={{ fill: 'rgba(0, 240, 255, 0.05)' }}
              />
              <Bar dataKey="mark" fill="#00f0ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

function SyllabusTab({ user, db, setCurrentUser }: { user: any; db: User[]; setCurrentUser: any }) {
  const [selectedForm, setSelectedForm] = useState(user.form || "Form 1");

  // ── STUDENT VIEW ──────────────────────────────────────────────
  if (user.role === 'student') {
    const currentSubject = user.subject || 'Mathematics';
    const topics = MASTER_SYLLABUS[currentSubject]?.[user.form || 'Form 1'] || [];

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Syllabus Progress Tracker</h2>
          <span className="text-xs bg-accent-cyan/10 text-accent-cyan px-3 py-1 rounded-full font-mono uppercase tracking-wider">
            {currentSubject} — {user.form || 'Form 1'}
          </span>
        </div>

        {/* Topic Checklist */}
        <div className="bg-bg-card border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden">
          {topics.length === 0 ? (
            <p className="p-4 text-text-slate text-sm italic">No topics found for this subject and form.</p>
          ) : (
            topics.map((t: string) => {
              const isCompleted = !!user.progress?.[t];
              return (
                <div key={t} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <span className={`text-sm ${isCompleted ? 'line-through text-text-slate' : 'text-text-main'}`}>
                    {t}
                  </span>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-accent-cyan/20 bg-bg-deep text-accent-cyan focus:ring-0 cursor-pointer"
                    checked={isCompleted}
                    onChange={async (e) => {
                      const shouldMark = e.target.checked;
                      // 1. Save to cloud database
                      await markTopicComplete({
                        student_id: user.id as string,
                        subject: currentSubject,
                        form: user.form || 'Form 1',
                        topic: t,
                      });
                      // 2. Update UI instantly — no page refresh needed
                      setCurrentUser({
                        ...user,
                        progress: { ...(user.progress || {}), [t]: shouldMark },
                      });
                    }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Progress summary */}
        <div className="p-5 bg-bg-light rounded-xl border border-accent-cyan/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-slate">Overall Progress</span>
            <span className="text-accent-cyan font-bold">
              {topics.filter((t: string) => user.progress?.[t]).length} / {topics.length} Topics
            </span>
          </div>
          <div className="w-full h-2 bg-bg-bright rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-cyan transition-all duration-700"
              style={{ width: topics.length > 0 ? `${Math.round((topics.filter((t: string) => user.progress?.[t]).length / topics.length) * 100)}%` : '0%' }}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  // ── TEACHER VIEW ──────────────────────────────────────────────
  const sub = user.subject || "Mathematics";
  const topics = MASTER_SYLLABUS[sub]?.[selectedForm] || ["Topic Data Missing"];

  // Use the local db array to calculate class-wide mastery stats
  const myStudents = db.filter(u => (u.teacherId === user.id || u.teacherId === 1) && u.role === 'student' && u.form === selectedForm);

  const topicStats = topics.map(t => {
    const masteredCount = myStudents.filter(s => s.progress[t]).length;
    const masteryRate = myStudents.length > 0 ? (masteredCount / myStudents.length) * 100 : 0;

    let aiAdvice = "";
    if (masteryRate < 40) {
      aiAdvice = "CRITICAL: Fundamental misconceptions detected. Suggest immediate visual re-teaching using the 'Energy Cycle' method.";
    } else if (masteryRate < 70) {
      aiAdvice = "MODERATE: Students understand the core but fail on application. Assign structured exam-style drills.";
    } else {
      aiAdvice = "OPTIMAL: Mastery achieved. Proceed to advanced synoptic links.";
    }

    return { name: t, rate: masteryRate, advice: aiAdvice };
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold mb-2">{sub} Learning Mastery</h2>

      {/* Form Selector */}
      <div className="flex bg-bg-light p-1 rounded-lg border border-accent-cyan/10 mb-8 w-fit overflow-x-auto">
        {["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"].map(f => (
          <button
            key={f}
            onClick={() => setSelectedForm(f)}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap",
              selectedForm === f ? "bg-accent-cyan text-bg-deep" : "text-text-slate hover:text-white"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <p className="text-text-slate text-sm mb-8">
        Class Analytics: Tracking {myStudents.length} Students across {selectedForm} Curriculum
      </p>

      <div className="space-y-4">
        {topicStats.map(stat => (
          <div key={stat.name} className="bg-bg-light rounded-xl border border-accent-cyan/10 overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-accent-cyan/5">
              <div>
                <h4 className="font-bold text-white">{stat.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-32 h-1.5 bg-bg-bright rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-1000",
                        stat.rate >= 70 ? "bg-accent-green" : stat.rate >= 40 ? "bg-accent-yellow" : "bg-accent-red"
                      )}
                      style={{ width: `${stat.rate}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold",
                    stat.rate >= 70 ? "text-accent-green" : stat.rate >= 40 ? "text-accent-yellow" : "text-accent-red"
                  )}>
                    {Math.round(stat.rate)}% Mastery
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-slate block mb-1">Status</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
                  stat.rate >= 70 ? "bg-accent-green/10 text-accent-green" : stat.rate >= 40 ? "bg-accent-yellow/10 text-accent-yellow" : "bg-accent-red/10 text-accent-red"
                )}>
                  {stat.rate >= 70 ? "Mastered" : stat.rate >= 40 ? "Developing" : "Needs Review"}
                </span>
              </div>
            </div>
            <div className="p-4 bg-accent-cyan/5 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-accent-cyan mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-accent-cyan mb-1">AI Strategy</p>
                <p className="text-xs text-text-slate italic leading-relaxed">"{stat.advice}"</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function LibraryTab({ currentUserId }: { currentUserId?: string }) {
  const [mode, setMode] = useState<'study' | 'practice' | 'notes'>('study');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedStudyTopic, setSelectedStudyTopic] = useState<string | null>(null);
  const [selectedTeacherNote, setSelectedTeacherNote] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<{
    question: string;
    answer: string;
    userAnswer: string;
    feedback: string;
    loading: boolean;
  } | null>(null);

  const spec9701 = [
    { id: 'physical', label: 'Physical Chemistry', topics: ['Atomic Structure', 'Chemical Bonding', 'States of Matter', 'Chemical Energetics', 'Electrochemistry', 'Equilibria', 'Reaction Kinetics'] },
    { id: 'inorganic', label: 'Inorganic Chemistry', topics: ['The Periodic Table', 'Group 2', 'Group 17', 'Nitrogen & Sulfur'] },
    { id: 'organic', label: 'Organic Chemistry', topics: ['Intro to Organic', 'Hydrocarbons', 'Halogen Derivatives', 'Hydroxy Compounds', 'Carbonyl Compounds', 'Carboxylic Acids', 'Nitrogen Compounds', 'Polymerisation', 'Analytical Techniques'] },
  ];

  const teacherNotes = [
    { id: 'tn1', title: 'ZIMSEC Exam Tips: Organic Mechanisms', date: '2026-03-25', content: "Focus on curly arrow precision. Ensure arrows start exactly from a lone pair or a bond. Common errors include starting arrows from atoms instead of electron sources." },
    { id: 'tn2', title: 'Practical Guide: Titration Precision', date: '2026-03-20', content: "Always read the bottom of the meniscus. Ensure the burette is vertical. Record all readings to 2 decimal places (e.g., 25.00 or 25.05)." },
    { id: 'tn3', title: 'Mastering the Mole Concept', date: '2026-03-15', content: "Remember: n = m/M for solids and n = cV for solutions. For gases at RTP, use V/24. Always check your units—convert cm³ to dm³ by dividing by 1000." },
  ];

  const dummyNotes: Record<string, string[]> = {
    'Atomic Structure': [
      "The atom consists of a dense nucleus containing protons and neutrons, surrounded by electrons in orbitals.",
      "Protons have a +1 charge, neutrons are neutral, and electrons have a -1 charge.",
      "Atomic number (Z) is the number of protons; Mass number (A) is protons + neutrons.",
      "Isotopes are atoms of the same element with different numbers of neutrons.",
      "Electronic configuration follows the Aufbau principle, Pauli exclusion principle, and Hund's rule."
    ],
    'Chemical Bonding': [
      "Ionic bonding involves the transfer of electrons from a metal to a non-metal.",
      "Covalent bonding involves the sharing of electron pairs between non-metals.",
      "Metallic bonding is the attraction between positive metal ions and a sea of delocalized electrons.",
      "VSEPR theory predicts molecular shapes based on electron pair repulsion.",
      "Intermolecular forces include hydrogen bonding, pd-pd interactions, and id-id (London) forces."
    ],
    'Reaction Kinetics': [
      "The rate of reaction is the change in concentration of reactants or products per unit time.",
      "Collision theory states that particles must collide with sufficient energy (activation energy) and correct orientation.",
      "Factors affecting rate: concentration, temperature, surface area, and catalysts.",
      "The rate equation relates rate to concentrations: Rate = k[A]^m[B]^n.",
      "Order of reaction is the power to which a concentration is raised in the rate equation."
    ]
  };

  const handleStartQuiz = async (topic: string) => {
    setMode('practice');
    setSelectedTopic(topic);
    setQuizState({ question: '', answer: '', userAnswer: '', feedback: '', loading: true });

    // LOG this quiz AI call
    if (currentUserId) {
      await logAIUsage({
        user_id: currentUserId,
        feature: 'quiz',
        prompt: topic,
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Generate a challenging A-Level Chemistry (9701 Spec) question about ${topic}. Provide the question and the correct answer separately. Format: Question: [question] Answer: [answer]`,
      });
      const text = response.text || "";
      const qMatch = text.match(/Question:\s*(.*)\s*Answer:/s);
      const aMatch = text.match(/Answer:\s*(.*)/s);
      
      setQuizState({
        question: qMatch ? qMatch[1].trim() : "Failed to generate question.",
        answer: aMatch ? aMatch[1].trim() : "Failed to generate answer.",
        userAnswer: '',
        feedback: '',
        loading: false
      });
    } catch (err) {
      setQuizState(prev => prev ? { ...prev, loading: false, question: "AI generation error." } : null);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizState || quizState.loading) return;
    setQuizState(prev => prev ? { ...prev, loading: true } : null);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `The student answered "${quizState.userAnswer}" to the question "${quizState.question}". The correct answer is "${quizState.answer}". Provide a concise AI comment on any errors made and how to improve. Be encouraging but rigorous.`,
      });
      setQuizState(prev => prev ? { ...prev, feedback: response.text || "Feedback unavailable.", loading: false } : null);
    } catch (err) {
      setQuizState(prev => prev ? { ...prev, feedback: "Error generating feedback.", loading: false } : null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">Study Library</h2>
          <p className="text-text-slate text-sm">Access the 9701 Chemistry Specification and adaptive practice nodes.</p>
        </div>
        <div className="flex bg-bg-light p-1 rounded-lg border border-accent-cyan/10">
          <button 
            onClick={() => setMode('study')}
            className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all", mode === 'study' ? "bg-accent-cyan text-bg-deep" : "text-text-slate hover:text-white")}
          >
            Study (9701)
          </button>
          <button 
            onClick={() => setMode('notes')}
            className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all", mode === 'notes' ? "bg-accent-cyan text-bg-deep" : "text-text-slate hover:text-white")}
          >
            Teacher's Notes
          </button>
          <button 
            onClick={() => setMode('practice')}
            className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all", mode === 'practice' ? "bg-accent-cyan text-bg-deep" : "text-text-slate hover:text-white")}
          >
            Practice
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'study' ? (
          selectedStudyTopic ? (
            <motion.div key="study-notes" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-bg-light border border-accent-cyan/10 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <button 
                  onClick={() => setSelectedStudyTopic(null)}
                  className="flex items-center gap-2 text-text-slate hover:text-accent-cyan transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Topics
                </button>
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-cyan px-3 py-1 bg-accent-cyan/10 rounded-full">9701 Specification</span>
              </div>

              <h3 className="text-3xl font-bold mb-6 text-white">{selectedStudyTopic}</h3>
              
              <div className="space-y-6 mb-10">
                {(dummyNotes[selectedStudyTopic] || [
                  "Detailed notes for this topic are currently being indexed.",
                  "Please refer to the primary 9701 textbook for foundational concepts.",
                  "Key focus areas: Definitions, standard conditions, and calculation precision."
                ]).map((note, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan mt-2 shrink-0" />
                    <p className="text-text-slate leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => handleStartQuiz(selectedStudyTopic)}
                  className="flex-1 py-4 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest rounded-xl hover:bg-accent-cyan/80 transition-all flex items-center justify-center gap-2"
                >
                  <Brain className="w-5 h-5" />
                  Practice this Topic
                </button>
                <button className="px-6 py-4 border border-accent-cyan/20 text-accent-cyan font-bold uppercase tracking-widest rounded-xl hover:bg-accent-cyan/5 transition-all">
                  Download PDF
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="study-list" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {spec9701.map(section => (
                <div key={section.id} className="bg-bg-light border border-accent-cyan/10 rounded-2xl p-6">
                  <h3 className="text-accent-cyan font-bold uppercase tracking-widest text-xs mb-4">{section.label}</h3>
                  <div className="space-y-2">
                    {section.topics.map(t => (
                      <button 
                        key={t}
                        onClick={() => setSelectedStudyTopic(t)}
                        className="w-full text-left p-3 rounded-lg bg-bg-deep border border-accent-cyan/5 hover:border-accent-cyan/30 text-xs text-text-slate hover:text-white transition-all flex items-center justify-between group"
                      >
                        <span>{t}</span>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )
        ) : mode === 'notes' ? (
          <motion.div key="teacher-notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {selectedTeacherNote ? (
              <div className="bg-bg-light border border-accent-cyan/10 rounded-2xl p-8">
                <button 
                  onClick={() => setSelectedTeacherNote(null)}
                  className="flex items-center gap-2 text-text-slate hover:text-accent-cyan transition-colors text-xs font-bold uppercase tracking-widest mb-6"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Notes
                </button>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white">{teacherNotes.find(n => n.id === selectedTeacherNote)?.title}</h3>
                  <span className="text-[10px] font-bold text-text-slate">{teacherNotes.find(n => n.id === selectedTeacherNote)?.date}</span>
                </div>
                <div className="p-6 bg-bg-deep rounded-xl border border-accent-cyan/5 text-text-slate leading-relaxed whitespace-pre-wrap">
                  {teacherNotes.find(n => n.id === selectedTeacherNote)?.content}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {teacherNotes.map(note => (
                  <div 
                    key={note.id} 
                    onClick={() => setSelectedTeacherNote(note.id)}
                    className="bg-bg-light border border-accent-cyan/10 p-6 rounded-2xl hover:border-accent-cyan/40 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-accent-cyan/5 rounded-xl text-accent-cyan group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{note.title}</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-slate">Uploaded: {note.date}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-text-slate group-hover:text-accent-cyan transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="practice" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="max-w-2xl mx-auto">
            {!selectedTopic ? (
              <div className="text-center py-12">
                <Brain className="w-12 h-12 text-accent-cyan mx-auto mb-4 opacity-20" />
                <p className="text-text-slate italic">Select a topic from the Study tab to begin a practice node.</p>
              </div>
            ) : (
              <div className="bg-bg-light border border-accent-cyan/10 rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent-cyan">Practice Node: {selectedTopic}</span>
                  <button onClick={() => setSelectedTopic(null)} className="text-[10px] font-bold uppercase tracking-widest text-text-slate hover:text-white">Reset</button>
                </div>

                {quizState?.loading ? (
                  <div className="py-12 text-center text-accent-cyan animate-pulse font-mono text-xs">
                    {">"} GENERATING QUESTIONS...
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-6 bg-bg-deep rounded-xl border border-accent-cyan/5 font-medium leading-relaxed">
                      {quizState?.question}
                    </div>

                    {!quizState?.feedback ? (
                      <div className="space-y-4">
                        <textarea 
                          className="w-full bg-bg-deep border border-accent-cyan/10 rounded-xl p-4 text-sm focus:border-accent-cyan outline-none min-h-[120px]"
                          placeholder="Type your answer here..."
                          value={quizState?.userAnswer}
                          onChange={e => setQuizState(prev => prev ? { ...prev, userAnswer: e.target.value } : null)}
                        />
                        <button 
                          onClick={handleSubmitQuiz}
                          className="w-full py-4 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest rounded-xl hover:bg-accent-cyan/80 transition-all"
                        >
                          Submit for AI Feedback
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="p-6 bg-accent-cyan/5 border-l-4 border-accent-cyan rounded-r-xl">
                          <div className="flex items-center gap-2 text-accent-cyan font-bold uppercase tracking-widest text-[10px] mb-2">
                            <Sparkles className="w-4 h-4" />
                            AI Feedback
                          </div>
                          <p className="text-sm text-text-slate italic leading-relaxed">
                            {quizState.feedback}
                          </p>
                        </div>
                        <div className="p-4 bg-bg-deep rounded-xl border border-white/5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-text-slate mb-2">Correct Solution</p>
                          <p className="text-xs text-white leading-relaxed">{quizState.answer}</p>
                        </div>
                        <button 
                          onClick={() => handleStartQuiz(selectedTopic)}
                          className="w-full py-4 border border-accent-cyan/20 text-accent-cyan font-bold uppercase tracking-widest rounded-xl hover:bg-accent-cyan/5 transition-all"
                        >
                          Next Question
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AssignmentsTab({ user }: { user: User }) {
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssignments() {
      setLoading(true);

      if (user.role === 'teacher') {
        // Fetch only assignments created by this teacher
        const data = await getTeacherAssignments(user.id as string);
        setAssignments(data);
      } else if (user.role === 'student') {
        // Fetch assignments assigned by their teacher
        const data = await getStudentAssignments(user.teacherId as string);
        setAssignments(data);
      }

      setLoading(false);
    }
    loadAssignments();
  }, [user.id, user.role, user.teacherId]);

  // Both teacher and student now read from the live database array
  const teacherAssignments = assignments;
  const studentAssignments = assignments;

  const upcomingTests = [
    { id: 't1', title: 'Mid-Term Assessment: Organic Chemistry', date: '2026-04-15', time: '09:00 AM', duration: '2 Hours', weight: '30%' },
    { id: 't2', title: 'Practical Skills Test: Titration', date: '2026-04-22', time: '11:00 AM', duration: '1.5 Hours', weight: '15%' },
  ];

  const pastAssignments = [
    { 
      id: 'a1', 
      title: 'Atomic Structure Problem Set', 
      dueDate: '2026-03-20', 
      status: 'Completed', 
      grade: '85%',
      avgScore: 78.2,
      mastery: 84,
      trend: 'up',
      teacherComment: "Solid understanding of orbital shapes, but review the exceptions in Chromium's configuration.",
      misconception: {
        topic: "Electronic Configuration",
        mistake: "You marked the configuration of Cr as [Ar] 3d4 4s2.",
        reason: "You followed the general Aufbau principle without considering the stability of half-filled d-subshells.",
        rule: "A half-filled (d5) or fully-filled (d10) d-subshell is more stable. Thus, Cr is [Ar] 3d5 4s1.",
        tip: "Always check for Cr and Cu in Paper 1; they are the most common 'trap' questions for configuration."
      },
      classStats: [
        { name: 'Asaph', score: 78, mastery: 84, trend: 'up' },
        { name: 'Strive', score: 75, mastery: 76, trend: 'up' },
        { name: 'Vuyiso', score: 71, mastery: 71, trend: 'stable' },
        { name: 'Mazvitaishe', score: 62, mastery: 59, trend: 'down' },
      ],
      gaps: [
        { problem: "Hess's Law Signage", detail: "3 out of 4 students reversed the Enthalpy signs for combustion questions.", solution: "Visual Energy Cycle Drill (Assigned)." },
        { problem: "Significant Figures", detail: "Mazvitaishe and Vuyiso lost 4 marks each due to rounding errors.", solution: "Auto-fail quiz on rounding until 100% pass." },
      ],
      focusTopics: ["Tellurium Isotopes", "Gibbs Free Energy", "Carbon-13 NMR", "Ligand Exchange"]
    },
    { 
      id: 'a2', 
      title: 'Chemical Bonding Lab Report', 
      dueDate: '2026-03-25', 
      status: 'Pending', 
      grade: null 
    },
    { 
      id: 'a3', 
      title: 'Stoichiometry Quiz', 
      dueDate: '2026-03-28', 
      status: 'Pending', 
      grade: null 
    },
    { 
      id: 'a4', 
      title: 'Reaction Kinetics Worksheet', 
      dueDate: '2026-03-10', 
      status: 'Completed', 
      grade: '92%',
      avgScore: 88.5,
      mastery: 90,
      trend: 'up',
      teacherComment: "Excellent work on the rate equations. Your graph for the second-order reaction was perfectly plotted.",
      misconception: {
        topic: "Activation Energy",
        mistake: "You stated that a catalyst increases the kinetic energy of particles.",
        reason: "You confused the effect of temperature with the effect of a catalyst.",
        rule: "A catalyst provides an alternative pathway with a lower activation energy; it does not change particle energy.",
        tip: "In Paper 4, always draw two curves on the Maxwell-Boltzmann distribution to show the Ea shift."
      },
      classStats: [
        { name: 'Asaph', score: 92, mastery: 95, trend: 'up' },
        { name: 'Strive', score: 88, mastery: 90, trend: 'up' },
        { name: 'Vuyiso', score: 85, mastery: 88, trend: 'up' },
        { name: 'Mazvitaishe', score: 78, mastery: 75, trend: 'up' },
      ],
      gaps: [
        { problem: "Rate Constant Units", detail: "2 students struggled with deriving units for k in 3rd order reactions.", solution: "Dimensional Analysis Workshop." },
      ],
      focusTopics: ["Arrhenius Equation", "Reaction Mechanisms", "Rate-Determining Step"]
    },
  ];

  if (showCreator && user.role === 'teacher') {
    return <TestAssignmentCreator onBack={() => setShowCreator(false)} user={user} />;
  }

  if (selectedAssignment && user.role === 'teacher') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
        <button 
          onClick={() => setSelectedAssignment(null)}
          className="flex items-center gap-2 text-text-slate hover:text-accent-cyan transition-colors text-xs font-bold uppercase tracking-widest mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-bg-light border border-accent-cyan/10 rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent-cyan mb-1">Class Performance Report</p>
              <h3 className="text-2xl font-bold text-white uppercase tracking-widest">{selectedAssignment.title}</h3>
              <p className="text-text-slate text-xs mt-1">Bulawayo North Center | {selectedAssignment.classStats.length} Students Enrolled</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-slate mb-1">Class Average</p>
              <h2 className="text-3xl font-bold text-accent-cyan font-mono">{selectedAssignment.avgScore}%</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
            {/* Student Comparison */}
            <div className="bg-bg-deep/50 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-accent-cyan" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">Student Comparison</h4>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-4 font-bold uppercase tracking-widest text-text-slate">Student Name</th>
                      <th className="pb-4 font-bold uppercase tracking-widest text-text-slate">Syllabus Mastery</th>
                      <th className="pb-4 font-bold uppercase tracking-widest text-text-slate">Avg Score</th>
                      <th className="pb-4 font-bold uppercase tracking-widest text-text-slate">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedAssignment.classStats.map((s: any) => (
                      <tr key={s.name} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 font-bold text-white">{s.name}</td>
                        <td className="py-4 text-text-slate">{s.mastery}%</td>
                        <td className="py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-lg font-bold",
                            s.score >= 75 ? "bg-accent-green/10 text-accent-green" : s.score >= 60 ? "bg-accent-yellow/10 text-accent-yellow" : "bg-accent-red/10 text-accent-red"
                          )}>
                            {s.score}%
                          </span>
                        </td>
                        <td className="py-4">
                          {s.trend === 'up' ? <ChevronRight className="w-4 h-4 text-accent-green -rotate-45" /> : 
                           s.trend === 'down' ? <ChevronRight className="w-4 h-4 text-accent-red rotate-45" /> : 
                           <div className="w-4 h-0.5 bg-accent-yellow rounded-full" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedAssignment.classStats}>
                    <XAxis dataKey="name" stroke="#7a8a9e" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#7a8a9e" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#081222', border: '1px solid rgba(0,240,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#00f0ff' }}
                    />
                    <Bar dataKey="score" fill="rgba(0, 240, 255, 0.4)" stroke="#00f0ff" strokeWidth={2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Learning Gaps & Focus */}
            <div className="space-y-6">
              <div className="bg-bg-deep/50 border border-accent-red/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <AlertTriangle className="w-5 h-5 text-accent-red" />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-red">Areas to Improve</h4>
                </div>
                
                <div className="space-y-4">
                  {selectedAssignment.gaps.map((gap: any, i: number) => (
                    <div key={i} className="p-4 bg-accent-red/5 border-l-4 border-accent-red rounded-r-xl">
                      <p className="text-xs font-bold text-white mb-1">Problem: {gap.problem}</p>
                      <p className="text-[11px] text-text-slate mb-3">{gap.detail}</p>
                      <div className="flex items-center gap-2 text-[10px] text-accent-cyan font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Solution: {gap.solution}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-bg-deep/50 border border-accent-cyan/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-5 h-5 text-accent-cyan" />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">Focus Topics</h4>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-slate mb-4">Unmastered Units:</p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {selectedAssignment.focusTopics.map((topic: string) => (
                    <span key={topic} className="px-3 py-1 bg-accent-purple/10 border border-accent-purple/30 rounded-lg text-[10px] font-bold text-accent-purple">
                      {topic}
                    </span>
                  ))}
                </div>
                <button 
                  onClick={() => alert('Revision Materials Sent to Class Group')}
                  className="w-full py-3 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-accent-cyan/80 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Sync Study Materials
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (selectedAssignment && user.role === 'student') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
        <button 
          onClick={() => setSelectedAssignment(null)}
          className="flex items-center gap-2 text-text-slate hover:text-accent-cyan transition-colors text-xs font-bold uppercase tracking-widest mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Assignments
        </button>

        <div className="bg-bg-light border border-accent-cyan/10 rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-slate mb-1">Assignment Node</p>
              <h3 className="text-2xl font-bold text-white">{selectedAssignment.title}</h3>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-slate mb-1">Result</p>
                <p className="text-2xl font-bold text-accent-cyan font-mono">{selectedAssignment.grade}</p>
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-accent-cyan flex items-center justify-center font-bold text-accent-cyan">
                {selectedAssignment.grade ? selectedAssignment.grade.charAt(0) : '?'}
              </div>
            </div>
          </div>

          {selectedAssignment.teacherComment && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="w-4 h-4 text-accent-green" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-green">Teacher's Feedback</h4>
              </div>
              <div className="p-6 bg-accent-green/5 border border-accent-green/10 rounded-xl text-sm text-text-slate leading-relaxed italic">
                "{selectedAssignment.teacherComment}"
              </div>
            </div>
          )}

          {selectedAssignment.misconception && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-accent-purple" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-purple">AI Study Tips</h4>
              </div>
              
              <div className="bg-accent-purple/5 border border-accent-purple/20 rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm font-bold text-white">
                    <span className="text-accent-purple">Topic:</span> {selectedAssignment.misconception.topic}
                  </p>
                  <div className="w-8 h-8 rounded-full bg-accent-red/20 border border-accent-red flex items-center justify-center text-accent-red font-bold">!</div>
                </div>

                <p className="text-sm text-text-slate mb-8 leading-relaxed">
                  {selectedAssignment.misconception.mistake}
                </p>

                <div className="p-6 bg-bg-deep rounded-xl border-l-4 border-accent-green space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-accent-green mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      Why you made this mistake
                    </p>
                    <p className="text-sm text-text-slate leading-relaxed">
                      {selectedAssignment.misconception.reason}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <p className="text-sm font-bold text-white mb-2">The Rule:</p>
                    <p className="text-sm text-text-slate leading-relaxed">
                      {selectedAssignment.misconception.rule}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-accent-yellow mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Exam Tip
                    </p>
                    <p className="text-xs text-text-slate italic leading-relaxed">
                      {selectedAssignment.misconception.tip}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-light border border-accent-cyan/10 p-6 rounded-2xl group hover:border-accent-cyan/40 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-accent-cyan" />
              <h4 className="font-bold text-white">Speed Drill</h4>
            </div>
            <p className="text-xs text-text-slate mb-4">Practice 5 questions on "{selectedAssignment.misconception?.topic || 'this topic'}" focus.</p>
            <button className="w-full py-2 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest text-[10px] rounded-lg">Start Drill</button>
          </div>
          <div className="bg-bg-light border border-accent-purple/10 p-6 rounded-2xl group hover:border-accent-purple/40 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-5 h-5 text-accent-purple" />
              <h4 className="font-bold text-white">Recommended Clip</h4>
            </div>
            <p className="text-xs text-text-slate mb-4">Watch a 2-minute neural node on "{selectedAssignment.misconception?.topic || 'this topic'}".</p>
            <button className="w-full py-2 border border-accent-purple/30 text-accent-purple font-bold uppercase tracking-widest text-[10px] rounded-lg group-hover:bg-accent-purple/5 transition-all">Watch Now</button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold mb-2">Assignments & Assessments</h2>
      <p className="text-text-slate text-sm mb-8">Track your upcoming tests and manage your academic deliverables.</p>

      {/* Upcoming Tests */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-accent-yellow" />
          <h3 className="font-bold text-white uppercase tracking-widest text-xs">Upcoming Assessments</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingTests.map(test => (
            <div key={test.id} className="bg-bg-light border border-accent-yellow/20 p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 bg-accent-yellow/10 text-accent-yellow text-[10px] font-bold uppercase tracking-widest rounded-bl-xl">
                Upcoming
              </div>
              <h4 className="font-bold text-white mb-4 pr-12">{test.title}</h4>
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-text-slate">
                  <Clock className="w-3 h-3" />
                  <span>{test.date} at {test.time}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-slate">
                  <Target className="w-3 h-3" />
                  <span>Duration: {test.duration} | Weight: {test.weight}</span>
                </div>
              </div>
              <button 
                onClick={() => user.role === 'teacher' ? setShowCreator(true) : null}
                className="w-full py-2 bg-accent-yellow text-bg-deep font-bold uppercase tracking-widest text-[10px] rounded-lg hover:bg-accent-yellow/80 transition-all">
                {user.role === 'teacher' ? 'Set Test' : 'View Syllabus Nodes'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Past Assignments */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <ClipboardList className="w-5 h-5 text-accent-cyan" />
          <h3 className="font-bold text-white uppercase tracking-widest text-xs">Assignment Tracker</h3>
        </div>
        <div className="bg-bg-light border border-accent-cyan/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-bg-deep border-b border-accent-cyan/10">
                <th className="p-4 font-bold uppercase tracking-widest text-text-slate">Assignment Name</th>
                <th className="p-4 font-bold uppercase tracking-widest text-text-slate">Due Date</th>
                <th className="p-4 font-bold uppercase tracking-widest text-text-slate">Status</th>
                <th className="p-4 font-bold uppercase tracking-widest text-text-slate">Result</th>
              </tr>
            </thead>
            <tbody>
              {pastAssignments.map(a => (
                <tr 
                  key={a.id} 
                  className={cn(
                    "border-b border-accent-cyan/5 transition-colors",
                    a.status === 'Completed' ? "hover:bg-white/5 cursor-pointer" : "opacity-60"
                  )}
                  onClick={() => a.status === 'Completed' && setSelectedAssignment(a)}
                >
                  <td className="p-4 font-bold text-white">{a.title}</td>
                  <td className="p-4 text-text-slate">{a.dueDate}</td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                      a.status === 'Completed' ? "bg-accent-green/10 text-accent-green" : "bg-accent-red/10 text-accent-red"
                    )}>
                      {a.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-accent-cyan">{a.grade || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function TestAssignmentCreator({ onBack, user }: { onBack: () => void, user: User }) {
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    dueDate: '',
    isFormal: false,
    difficulty: 'Medium'
  });
  
  const [prompt, setPrompt] = useState('');
  const [finalQuestions, setFinalQuestions] = useState<{ id: string, text: string }[]>([]);
  const [draftQuestions, setDraftQuestions] = useState<{ id: string, text: string, source: string }[]>([]);
  const [manualQuestion, setManualQuestion] = useState('');
  
  const handleSaveAssignmentToCloud = async () => {
    // 1. Pack up the form states and final questions array into an object
    const assignmentPayload = {
      teacher_id: user.id as string,
      title: formData.title || 'Untitled Assignment',
      content: formData.topic || '',
      due_date: formData.dueDate || '',
      is_exam: formData.isFormal,
      questions: finalQuestions // This saves the full layout array we found!
    };

    // 2. Insert into the Supabase database
    await createAssignment(assignmentPayload);

    // 3. Close the creator panel and head back to the list layout
    onBack();
  };

  const [isScanning, setIsScanning] = useState(false);
  const [scannedExtras, setScannedExtras] = useState<{ id: string, text: string, selected: boolean }[]>([]);
  const [showScannerResults, setShowScannerResults] = useState(false);

  // Get topics from syllabus
  const sub = user.subject || "Mathematics";
  const allTopics = useMemo(() => {
    const subjects = MASTER_SYLLABUS[sub] || {};
    return Object.values(subjects).flat();
  }, [sub]);

  const handleGenerateAI = () => {
    const mockAI = [
      { id: 'ai-1-' + Date.now(), text: "1. Explain the relationship between force and acceleration according to Newton's Second Law. [4]", source: 'AI Generator' },
      { id: 'ai-2-' + Date.now(), text: "2. Calculate the net force acting on a 10kg mass accelerating at 5m/s². [3]", source: 'AI Generator' }
    ];
    setDraftQuestions(prev => [...prev, ...mockAI]);
  };

  const handleAddManualDraft = () => {
    if (manualQuestion.trim()) {
      setDraftQuestions(prev => [...prev, { id: 'm-' + Date.now(), text: manualQuestion, source: 'Manual Entry' }]);
      setManualQuestion('');
    }
  };

  const confirmToFinal = (q: { id: string, text: string }) => {
    setFinalQuestions(prev => [...prev, { ...q, id: 'final-' + Date.now() + Math.random() }]);
    setDraftQuestions(prev => prev.filter(item => item.id !== q.id));
  };

  const removeFromDraft = (id: string) => {
    setDraftQuestions(prev => prev.filter(q => q.id !== id));
  };

  const removeFromFinal = (id: string) => {
    setFinalQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleFileUpload = () => {
    setIsScanning(true);
    setTimeout(() => {
      const extracted = [
        { id: 'ex-1', text: "Explain the concept of 'Nuclear Binding Energy' and its relation to stability of the nucleus. [5]", selected: false },
        { id: 'ex-2', text: "State the law of radioactive decay. [2]", selected: false }
      ];
      setScannedExtras(extracted);
      setIsScanning(false);
      setShowScannerResults(true);
    }, 1500);
  };

  const addSelectedFromScanner = () => {
    const selected = scannedExtras.filter(q => q.selected).map(q => ({ 
      id: 'sq-' + Date.now() + Math.random(), 
      text: q.text,
      source: 'Scanner'
    }));
    setDraftQuestions(prev => [...prev, ...selected]);
    setShowScannerResults(false);
    setScannedExtras([]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 font-mono"
    >
      {/* Top Header - Navigation & Settings */}
      <div className="flex items-center justify-between mb-2">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-text-slate hover:text-accent-cyan transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex gap-4">
          <button 
            onClick={() => alert("Test Saved to Drafts")}
            className="px-4 py-2 border border-white/10 text-white text-[10px] uppercase font-bold tracking-widest rounded-lg hover:bg-white/5"
          >
            Save Draft
          </button>
<button
            onClick={handleSaveAssignmentToCloud}
            className="px-6 py-2 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest"
          >
            Send to Class
          </button>
        </div>
      </div>

      {/* Top Details Panel */}
      <div className="bg-bg-card border border-accent-cyan/10 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-text-slate mb-2">Test Title</label>
          <input 
            type="text" 
            className="w-full bg-bg-deep border border-accent-cyan/20 rounded-xl p-3 text-sm text-white focus:border-accent-cyan outline-none transition-all"
            placeholder="e.g. Physics Mid-Term Assessment"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-text-slate mb-2">Topic</label>
          <select 
            className="w-full bg-bg-deep border border-accent-cyan/20 rounded-xl p-3 text-sm text-white focus:border-accent-cyan outline-none transition-all appearance-none"
            value={formData.topic}
            onChange={e => setFormData({...formData, topic: e.target.value})}
          >
            <option value="">Select Topic...</option>
            {allTopics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-text-slate mb-2">Due Date</label>
          <input 
            type="date" 
            className="w-full bg-bg-deep border border-accent-cyan/20 rounded-xl p-3 text-sm text-white focus:border-accent-cyan outline-none transition-all"
            value={formData.dueDate}
            onChange={e => setFormData({...formData, dueDate: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
        
        {/* LEFT COLUMN: THE ACTUAL TEST PREVIEW */}
        <div className="bg-bg-card border border-accent-cyan/10 rounded-2xl flex flex-col h-fit min-h-[600px]">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutGrid className="w-5 h-5 text-accent-cyan" />
              <h3 className="font-bold uppercase tracking-wider text-sm">Final Test Preview</h3>
            </div>
            <span className="text-[10px] font-bold text-text-slate uppercase tracking-widest">
              {finalQuestions.length} Questions Added
            </span>
          </div>
          
          <div className="p-8 space-y-6 flex-1 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            {finalQuestions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4 opacity-30">
                <FilePlus className="w-12 h-12" />
                <p className="text-xs uppercase tracking-widest leading-relaxed">No questions confirmed yet.<br/>Use the tools on the right to start building.</p>
              </div>
            ) : (
              finalQuestions.map((q, index) => (
                <motion.div 
                  key={q.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group relative bg-bg-deep/50 border border-white/5 p-6 rounded-xl hover:border-accent-cyan/30 transition-all"
                >
                  <div className="flex gap-4">
                    <span className="text-accent-cyan font-bold text-lg leading-none shrink-0">{index + 1}.</span>
                    <p className="text-sm text-white leading-relaxed">{q.text}</p>
                  </div>
                  <button 
                    onClick={() => removeFromFinal(q.id)}
                    className="absolute top-4 right-4 p-2 text-text-slate hover:text-accent-red opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DRAFTING & GENERATION TOOLS */}
        <div className="space-y-6 h-fit">
          
          {/* Section: Drafted Questions (Staging) */}
          <div className="bg-bg-card border border-accent-purple/20 p-6 rounded-2xl space-y-4 min-h-[200px]">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-accent-purple" />
              <h3 className="font-bold uppercase tracking-wider text-xs">Question Drafts / Suggestions</h3>
            </div>
            
            <AnimatePresence>
              {draftQuestions.length === 0 ? (
                <p className="text-[10px] text-text-slate italic text-center py-8">Generate or type questions to see them here...</p>
              ) : (
                <div className="space-y-3">
                  {draftQuestions.map((q) => (
                    <motion.div 
                      key={q.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-bg-deep border border-accent-purple/10 p-4 rounded-xl space-y-3"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-xs text-text-slate leading-relaxed">{q.text}</p>
                        <button 
                          onClick={() => removeFromDraft(q.id)}
                          className="text-text-slate hover:text-accent-red"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-[8px] font-bold uppercase text-accent-purple tracking-widest">{q.source}</span>
                        <button 
                          onClick={() => confirmToFinal(q)}
                          className="flex items-center gap-1 px-3 py-1 bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 rounded text-[9px] font-bold uppercase hover:bg-accent-cyan/20 transition-all"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Add to Final Test
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Tool: AI Generator */}
          <div className="bg-bg-card border border-accent-purple/10 p-6 rounded-2xl space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-purple">AI Generator</h4>
            <div className="flex gap-3">
              <input 
                type="text" 
                className="flex-1 bg-bg-deep border border-accent-purple/20 rounded-xl p-3 text-xs text-white focus:border-accent-purple outline-none transition-all"
                placeholder="e.g. Generate 3 questions about Force..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
              <button 
                onClick={handleGenerateAI}
                className="p-3 bg-accent-purple/10 text-accent-purple border border-accent-purple/20 rounded-xl hover:bg-accent-purple/20 transition-all"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tool: Manual Entry */}
          <div className="bg-bg-card border border-accent-cyan/10 p-6 rounded-2xl space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-cyan text-bold">Manual Entry</h4>
            <div className="flex gap-3">
              <textarea 
                className="flex-1 bg-bg-deep border border-accent-cyan/20 rounded-xl p-3 text-xs text-white focus:border-accent-cyan outline-none transition-all min-h-[60px] resize-none"
                placeholder="Type your own question here..."
                value={manualQuestion}
                onChange={e => setManualQuestion(e.target.value)}
              />
              <button 
                onClick={handleAddManualDraft}
                className="p-3 bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 rounded-xl hover:bg-accent-cyan/20 transition-all flex items-center justify-center"
              >
                <FilePlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tool: Scanner */}
          <div 
            onClick={() => handleFileUpload()}
            className="bg-bg-card border-2 border-dashed border-accent-cyan/20 p-6 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-all group"
          >
            <div className="p-3 bg-accent-cyan/5 rounded-xl text-accent-cyan group-hover:scale-110 transition-transform">
              {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanText className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-0.5">Document Scanner</p>
              <p className="text-[9px] text-text-slate">Upload PDF or Images to extract questions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Modal remains identical in function but styled as a dialog */}
      <AnimatePresence>
        {showScannerResults && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-bg-deep/95 backdrop-blur-sm font-mono"
          >
            <div className="w-full max-w-2xl bg-bg-card border border-accent-cyan/30 rounded-3xl p-8 max-h-[80vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,240,255,0.15)]">
              <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2 flex items-center gap-3">
                <ScanText className="text-accent-cyan" />
                Found Questions
              </h3>
              <p className="text-[10px] text-text-slate mb-6 italic">Select questions to add to your drafts.</p>
              
              <div className="flex-1 overflow-y-auto space-y-3 p-1 custom-scrollbar">
                {scannedExtras.map((q) => (
                  <div 
                    key={q.id}
                    onClick={() => setScannedExtras(prev => prev.map(item => item.id === q.id ? { ...item, selected: !item.selected } : item))}
                    className={cn(
                      "p-4 rounded-xl border cursor-pointer transition-all flex justify-between gap-4 items-center",
                      q.selected ? "bg-accent-cyan/10 border-accent-cyan/40" : "bg-bg-deep border-white/5 hover:border-white/10"
                    )}
                  >
                    <p className="text-xs text-text-slate leading-relaxed">{q.text}</p>
                    <div className={cn(
                      "w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center",
                      q.selected ? "bg-accent-cyan border-accent-cyan" : "border-white/20"
                    )}>
                      {q.selected && <CheckCircle2 className="w-3 h-3 text-bg-deep" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex justify-end gap-3">
                <button onClick={() => setShowScannerResults(false)} className="px-6 py-2 text-[10px] font-bold uppercase text-text-slate hover:text-white">Cancel</button>
                <button 
                  onClick={addSelectedFromScanner}
                  className="px-8 py-3 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest text-[10px] rounded-xl"
                >
                  Confirm Selection ({scannedExtras.filter(q => q.selected).length})
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


function QuizTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold mb-2">AI Quizzes</h2>
      <p className="text-text-slate text-sm mb-8">Adaptive difficulty assessments across all ZIMSEC subjects.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['Mathematics', 'Chemistry', 'Physics', 'Biology'].map(sub => (
          <div key={sub} className="bg-bg-light border border-accent-cyan/10 p-8 rounded-2xl flex flex-col items-center text-center group hover:border-accent-cyan/40 transition-all">
            <FlaskConical className="w-10 h-10 text-accent-cyan mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xl font-bold mb-2">{sub}</h3>
            <p className="text-xs text-text-slate mb-6">30 Questions | 45 Minutes | Adaptive Difficulty</p>
            <button className="w-full py-3 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(0,255,242,0.3)] transition-all">
              Initiate Quiz
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function TextbookTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold mb-2">Textbook AI Parser</h2>
      <p className="text-text-slate text-sm mb-8">Upload ZIMSEC textbooks (PDF). The AI will index content and generate revision summaries.</p>
      
      <div className="border-2 border-dashed border-accent-cyan/20 rounded-2xl p-12 bg-bg-light flex flex-col items-center justify-center text-center group hover:border-accent-cyan/40 transition-all cursor-pointer">
        <div className="w-16 h-16 bg-accent-cyan/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <CloudUpload className="w-8 h-8 text-accent-cyan" />
        </div>
        <h4 className="font-bold mb-1">Drag & Drop Textbook PDF</h4>
        <p className="text-text-slate text-xs">Max size 50MB</p>
        <input type="file" className="hidden" accept="application/pdf" />
      </div>
    </motion.div>
  );
}

function OCRTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold mb-2">Handwriting Recognition (OCR)</h2>
      <p className="text-text-slate text-sm mb-8">Upload a photo of your handwritten ZIMSEC notes. Our AI will digitize and correct them.</p>
      
      <div className="relative w-full h-64 bg-bg-deep border-2 border-accent-purple/30 rounded-2xl overflow-hidden flex items-center justify-center group">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent-purple shadow-[0_0_15px_rgba(181,51,255,0.8)] scanline" />
        <div className="text-center opacity-30 group-hover:opacity-50 transition-opacity">
          <PenTool className="w-12 h-12 text-accent-purple mx-auto mb-2" />
          <p className="text-xs font-bold uppercase tracking-widest">Capture or Upload Image</p>
        </div>
      </div>

      <div className="mt-6">
        <input type="file" className="w-full bg-bg-light border border-accent-purple/20 rounded-lg p-3 text-xs" accept="image/*" />
      </div>
    </motion.div>
  );
}

function SparkAITab({ currentUserId }: { currentUserId?: string }) {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!query.trim()) return;
    const newHistory = [...history, { role: 'user' as const, text: query }];
    setHistory(newHistory);
    const savedQuery = query; // save before clearing
    setQuery('');
    setLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: savedQuery,
      });
      setHistory([...newHistory, { role: 'ai' as const, text: response.text || "AI response error." }]);

      // LOG the AI call to Supabase so teachers can see usage stats
      if (currentUserId) {
        await logAIUsage({
          user_id: currentUserId,
          feature: 'spark_ai',
          prompt: savedQuery.slice(0, 200), // only save first 200 chars
        });
      }
    } catch (err) {
      setHistory([...newHistory, { role: 'ai' as const, text: "Error: AI system is currently unavailable." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-[550px]">
      <h2 className="text-2xl font-bold mb-2">SPARK AI</h2>
      <p className="text-text-slate text-sm mb-6">Chat with our advanced AI assistant.</p>
      
      <div className="flex-1 bg-bg-deep border border-accent-cyan/10 rounded-xl p-6 font-mono text-xs overflow-y-auto space-y-4 mb-4">
        <div className="text-accent-cyan">{">"} AI System Online...</div>
        {history.map((msg, i) => (
          <div key={i} className={cn(msg.role === 'user' ? "text-accent-yellow" : "text-text-main")}>
            <span className="uppercase font-bold">{msg.role}:</span> {msg.text}
          </div>
        ))}
        {loading && <div className="text-accent-cyan animate-pulse">{">"} Thinking...</div>}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          className="flex-1 bg-bg-light border border-accent-cyan/10 rounded-lg p-3 text-sm focus:border-accent-cyan outline-none"
          placeholder="Ask about Calculus, History, or generate a Quiz..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend}
          className="px-6 py-3 bg-accent-cyan text-bg-deep font-bold uppercase tracking-widest rounded-lg hover:bg-accent-cyan/80 transition-all"
        >
          Send
        </button>
      </div>
    </motion.div>
  );
}

function FeaturesTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold mb-2">All Features</h2>
      <p className="text-text-slate text-sm mb-8">A list of all features available on the Mindspark platform.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURE_MATRIX.map(f => (
          <div key={f.id} className="p-5 bg-bg-light border border-accent-cyan/10 rounded-xl hover:border-accent-cyan/30 transition-all group cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-accent-cyan/5 rounded-lg text-accent-cyan group-hover:bg-accent-cyan/10 transition-colors">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">{f.name}</h4>
                <p className="text-[10px] text-text-slate leading-relaxed">{f.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function StatCard({ label, val }: { label: string, val: string }) {
  return (
    <div className="p-5 bg-bg-light rounded-xl border-l-4 border-accent-cyan">
      <div className="text-[9px] font-bold uppercase tracking-widest text-text-slate mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{val}</div>
    </div>
  );
}
