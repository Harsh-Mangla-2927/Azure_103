export interface User {
  id: number;
  email: string;
  fullName: string;
}

export interface Profile {
  university?: string;
  degree?: string;
  branch?: string;
  graduation_year?: number;
  cgpa?: number;
  backlogs?: number;
  preferred_role?: string;
  target_company?: string;
  onboarding_completed?: number;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  technologies?: string;
}

export interface Certification {
  id: number;
  name: string;
  issuer?: string;
  year?: number;
}

export interface Resume {
  id: number;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  extractedText?: string;
}

export interface DashboardData {
  user: { fullName: string; email: string };
  profile: Profile;
  metrics: {
    profileCompletion: number;
    skillsCount: number;
    projectsCount: number;
    certificationsCount: number;
    hasResume: boolean;
    placementReadiness: string;
  };
  resume: { originalName: string; uploadDate: string } | null;
  recentActivity: Array<{
    type: string;
    targetCompany: string;
    targetRole: string;
    timestamp: string;
  }>;
}

export interface AnalysisResult {
  analysis: string;
  targetCompany: string;
  targetRole: string;
  timestamp: string;
}

export interface PreparationResult {
  plan: string;
  targetCompany: string;
  targetRole: string;
  timestamp: string;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
}
