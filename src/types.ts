export interface Profile {
  userId: string;
  name: string;
  role: string;
  experience: number; // in years
  budgetExpectation: number; // daily rate (₹)
  availability: string; // e.g. "Available", "Busy", "Part-Time"
  bio: string; // Represented as "About" in forms and listings
  languages: string[];
  ratings: number; // 1 to 5 stars
  previousProjects: {
    title: string;
    year: number;
  }[];
  email: string;
  phone: string;
  socialLinks: string[]; // Custom URLs of their choice, generic
  createdAt: string;
  updatedAt: string;
  city?: string;
  state?: string;
  avatarUrl?: string;
}

export interface CrewMember {
  userId: string;
  name: string;
  role: string;
  email: string;
  status: "invited" | "confirmed" | "declined";
  rate: number; // rate amount (₹ / $)
}

export interface Expense {
  id: string;
  title: string;
  department: string;
  amount: number; // expense amount (₹ / $)
  date: string;
}

export interface Project {
  projectId: string;
  title: string;
  description: string;
  producerId: string;
  producerName: string;
  status: "Pre-Production" | "Production" | "Post-Production" | "Completed";
  totalBudget: number; // total budget amount (₹ / $)
  departmentBudgets: Record<string, number>; // allocated amount
  expenses: Expense[];
  crewMembers: CrewMember[];
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  scheduleId: string;
  projectId: string;
  projectTitle: string;
  date: string; // YYYY-MM-DD
  location: string;
  callTime: string; // HH:MM
  callSheetUrl?: string; // pdf or text notes
  productionNotes?: string;
  crewList: string[]; // List of crew userIds allocated to this shoot
  googleEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIRecommendation {
  userId: string;
  name: string;
  role: string;
  matchScore: number; // 0 to 100
  reasoning: string;
  experienceYears: number;
  expectedRate: number; // expected rate (₹ / $)
  skillsMatched?: string[]; // compatibility placeholder
}

export interface Message {
  messageId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string; // 'general' or specific userId
  text: string;
  createdAt: string;
}
