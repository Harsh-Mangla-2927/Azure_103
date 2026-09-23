const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('cp_token');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error || data.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    register: (payload: { email: string; password: string; confirmPassword: string; fullName: string; university?: string }) =>
      request<{ token: string; user: { id: number; email: string; fullName: string }; isNewUser: boolean }>('POST', '/auth/register', payload),
    login: (payload: { email: string; password: string }) =>
      request<{ token: string; user: { id: number; email: string; fullName: string }; onboardingCompleted: boolean }>('POST', '/auth/login', payload),
    logout: () => request<{ message: string }>('POST', '/auth/logout'),
    me: () => request<{ user: { id: number; email: string; fullName: string }; onboardingCompleted: boolean }>('GET', '/auth/me'),
  },

  // Profile
  profile: {
    get: () => request<any>('GET', '/profile'),
    update: (payload: any) => request<{ message: string }>('PUT', '/profile', payload),
    completeOnboarding: () => request<{ message: string }>('POST', '/profile/complete-onboarding'),
  },

  // Resume
  resume: {
    upload: (formData: FormData) => request<any>('POST', '/resume/upload', formData, true),
    list: () => request<{ resumes: any[] }>('GET', '/resume'),
    delete: (id: number) => request<{ message: string }>('DELETE', `/resume/${id}`),
  },

  // Analysis
  analysis: {
    eligibility: (payload: { targetCompany: string; targetRole: string }) =>
      request<any>('POST', '/analysis/eligibility', payload),
    skillGap: (payload: { targetCompany: string; targetRole: string }) =>
      request<any>('POST', '/analysis/skill-gap', payload),
    preparation: (payload: { targetCompany: string; targetRole: string }) =>
      request<any>('POST', '/analysis/preparation', payload),
    history: () => request<{ history: any[] }>('GET', '/analysis/history'),
  },

  // Chat
  chat: {
    send: (message: string) => request<{ response: string; timestamp: string }>('POST', '/chat', { message }),
    history: () => request<{ messages: any[] }>('GET', '/chat/history'),
    clearHistory: () => request<{ message: string }>('DELETE', '/chat/history'),
  },

  // Dashboard
  dashboard: {
    get: () => request<any>('GET', '/dashboard'),
  },
};
