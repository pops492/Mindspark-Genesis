import { Feature } from "./types";

export const MASTER_SYLLABUS: Record<string, Record<string, string[]>> = {
  "Mathematics": {
    "Form 1": ["Number Systems", "Directed Numbers", "Basic Algebra", "Angles & Shapes", "Fractions & Decimals", "Basic Statistics"],
    "Form 2": ["Linear Equations", "Area & Volume", "Transformations", "Pythagoras Theorem", "Simultaneous Equations", "Probability Basics"],
    "Form 3": ["Quadratic Equations", "Circle Geometry", "Trigonometry", "Variation", "Similarity & Congruency", "Sets"],
    "Form 4": ["Matrices", "Vectors", "Calculus Basics", "Probability", "Statistics Project", "Coordinate Geometry"],
    "Form 5": ["Functions & Graphs", "Complex Numbers", "Series & Sequences", "Differentiation", "Integration", "Mechanics 1"],
    "Form 6": ["Differential Equations", "Numerical Methods", "Vectors in 3D", "Hypothesis Testing", "Probability Distributions", "Mechanics 2"]
  },
  "Computer Science": {
    "Form 1": ["Introduction to ICT", "Hardware Components", "Input/Output Devices", "History of Computers", "Basic File Management"],
    "Form 2": ["Logic Gates", "Number Bases (Binary)", "Introduction to Programming", "Algorithms", "The Internet"],
    "Form 3": ["Systems Life Cycle", "Database Design", "Flowcharts", "Data Representation", "Social Impacts of AI"],
    "Form 4": ["Programming in Python", "Low Level Languages", "Networking Prototypes", "Project Documentation", "Security & Ethics"],
    "Form 5": ["Processor Architecture", "Data Structures (Linked Lists)", "Operating Systems", "Expert Systems", "Assembly Language"],
    "Form 6": ["Recursion", "Software Engineering", "Artificial Neural Networks", "Big Data", "System Security Architecture"]
  },
  "History": {
    "Form 1": ["Pre-history", "The San and Khoi Khoi", "Iron Age Cultures", "Great Zimbabwe (Origins)", "Mutapa State"],
    "Form 2": ["Rozvi State", "Ndebele State", "Missionary Activity", "Scramble for Africa", "BSAC & Colonization"],
    "Form 3": ["World War I (Causes)", "Rise of Dictators", "Nationalism in Zimbabwe", "Liberation Struggle Part 1", "International Relations"],
    "Form 4": ["World War II", "Cold War", "United Nations", "Independent Zimbabwe", "Economic Policies (ESAP/ZIMASSET)"],
    "Form 5": ["European History (1789-1914)", "The French Revolution", "Unification of Italy", "Unification of Germany", "World War I Context"],
    "Form 6": ["Advanced African History", "Pan-Africanism", "Post-Colonial Governance", "Conflicts in the Middle East", "Global Modernization"]
  },
  "Chemistry": {
    "Form 1": ["Introduction to Chemistry", "Matter & Its States", "Separation Techniques", "Acids, Bases & Salts", "The Periodic Table Basics"],
    "Form 2": ["Atomic Structure", "Chemical Bonding", "Chemical Equations", "Metals & Non-metals", "Air & Water"],
    "Form 3": ["The Mole Concept", "Stoichiometry", "Electrochemistry Basics", "Energy Changes", "Rates of Reaction"],
    "Form 4": ["Organic Chemistry 1", "Qualitative Analysis", "Industrial Processes", "Environmental Chemistry", "Redox Reactions"],
    "Form 5": ["Atomic Orbitals", "Chemical Energetics", "Equilibria", "Group 2 & 17 Elements", "Nitrogen & Sulfur"],
    "Form 6": ["Transition Elements", "Organic Chemistry 2", "Reaction Kinetics", "Entropy & Gibbs Free Energy", "Analytical Chemistry"]
  }
};

export const FEATURE_MATRIX: Feature[] = [
  { id: 1, name: "Syllabus Progress Tracker", desc: "Automated progress bar for Form 1-6 ZIMSEC curriculum." },
  { id: 2, name: "AI Textbook Reader", desc: "Extracts key concepts and exam questions from uploaded PDFs." },
  { id: 3, name: "Handwriting Scanner", desc: "Scan handwritten notes and convert them to digital text using AI." },
  { id: 4, name: "Spark AI", desc: "Generate ZIMSEC-style questions using AI." },
  { id: 5, name: "Real-time Sync", desc: "Live synchronization between teachers and student dashboards." },
  { id: 6, name: "Multi-Form Progress", desc: "One account handles progression from Form 1 through Form 6." },
  { id: 7, name: "Smart Quizzes", desc: "Adjusts difficulty based on your previous performance." },
  { id: 8, name: "Math Equation Renderer", desc: "Clearly shows complex math formulas and equations." },
  { id: 9, name: "Global Leaderboard", desc: "See how you rank against students across Zimbabwe." },
  { id: 10, name: "Dark Mode", desc: "Comfortable dark theme for late-night study." },
  { id: 11, name: "Offline Mode", desc: "Keep studying even when you don't have internet." },
  { id: 12, name: "Study Timer", desc: "Clock to help you focus and manage your study time." },
  { id: 13, name: "Topic Map", desc: "Visual guide of how different subjects and topics are connected." },
  { id: 14, name: "Digital Whiteboard", desc: "Draw diagrams and share them with your class in real-time." },
  { id: 15, name: "Voice Notes", desc: "Record your voice and convert it into study notes." },
  { id: 16, name: "PDF Export", desc: "Save AI-generated notes as printable PDF files." },
  { id: 17, name: "Achievement Badges", desc: "Earn rewards for completing your study goals." },
  { id: 18, name: "Teacher Analytics", desc: "Detailed reports on student progress and areas for improvement." },
  { id: 19, name: "Answer Key Generator", desc: "AI automatically provides answers for test questions." },
  { id: 20, name: "Programming Sandbox", desc: "Learn and run Python code directly in your browser." },
  { id: 100, name: "Secure Messaging", desc: "Encrypted chat between teachers and students." }
];

for(let i=21; i<100; i++) {
  FEATURE_MATRIX.push({ id: i, name: `Advanced Feature ${i}`, desc: "Useful feature to help with your studies." });
}
