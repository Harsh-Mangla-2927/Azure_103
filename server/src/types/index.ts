export interface User {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: number;
  user_id: number;
  university: string | null;
  degree: string | null;
  branch: string | null;
  graduation_year: number | null;
  cgpa: number | null;
  backlogs: number | null;
  preferred_role: string | null;
  target_company: string | null;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: number;
  user_id: number;
  name: string;
  category: string;
  created_at: string;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  technologies: string | null;
  created_at: string;
}

export interface Certification {
  id: number;
  user_id: number;
  name: string;
  issuer: string | null;
  year: number | null;
  created_at: string;
}

export interface Resume {
  id: number;
  user_id: number;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  extracted_text: string | null;
  upload_date: string;
}

export interface Analysis {
  id: number;
  user_id: number;
  type: 'eligibility' | 'skill-gap' | 'preparation';
  target_company: string | null;
  target_role: string | null;
  result: string;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  user_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AuthRequest extends Express.Request {
  userId?: number;
}
