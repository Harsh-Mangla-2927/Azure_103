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
  
  auth: {
    /**
     * Step 1+2 combined — validates password + sends OTP to educational email.
     * Login:    { email, password, purpose: 'login' }
     * Register: { email, fullName, password, purpose: 'register' }
     * Returns: { message, email (masked), purpose }
     * OTP is NEVER in the response.
     */
    sendOtp: (payload: { email: string; password: string; fullName?: string; purpose: 'login' | 'register' }) =>
      request<{ message: string; email: string; purpose: string }>('POST', '/auth/send-otp', payload),

    /**
     * Resend OTP to the same email without re-checking password.
     * Used by the "Resend OTP" button on the OTP step.
     */
    resendOtp: (payload: { email: string; purpose: 'login' | 'register' }) =>
      request<{ message: string; email: string; purpose: string }>('POST', '/auth/resend-otp', payload),

    /** Step 3 — verify OTP and receive JWT */
    verifyOtp: (payload: { email: string; otp: string }) =>
      request<{ token: string; user: { id: number; email: string; fullName: string }; onboardingCompleted: boolean; isNewUser?: boolean }>('POST', '/auth/verify-otp', payload),

    /** Add optional personal recovery email (authenticated) */
    addRecoveryEmail: (personalEmail: string) =>
      request<{ message: string }>('POST', '/auth/add-recovery-email', { personalEmail }),

    /** Verify the recovery email OTP (authenticated) */
    verifyRecoveryEmail: (otp: string) =>
      request<{ message: string; verified: boolean }>('POST', '/auth/verify-recovery-email', { otp }),

    /** Forgot password step 1 — send OTP without requiring password */
    forgotPassword: (email: string) =>
      request<{ message: string; email: string }>('POST', '/auth/forgot-password', { email }),
    /** Forgot password step 2 — verify OTP + set new password. Returns JWT (auto-login). */
    resetPassword: (payload: { email: string; otp: string; newPassword: string }) =>
      request<{ message: string; token: string; user: { id: number; email: string; fullName: string }; onboardingCompleted: boolean }>('POST', '/auth/reset-password', payload),
    /** Send OTP to mobile phone for SMS verification (authenticated) */
    sendPhoneOtp: (phoneNumber: string) =>
      request<{ message: string; maskedPhone: string }>('POST', '/auth/send-phone-otp', { phoneNumber }),

    /** Verify phone OTP code (authenticated) */
    verifyPhoneOtp: (otp: string) =>
      request<{ message: string; phoneVerified: boolean }>('POST', '/auth/verify-phone-otp', { otp }),

    /** Resend phone OTP (authenticated) */
    resendPhoneOtp: () =>
      request<{ message: string; maskedPhone: string }>('POST', '/auth/resend-phone-otp'),

    logout: () => request<{ message: string }>('POST', '/auth/logout'),
    me: () => request<{ user: { id: number; email: string; fullName: string; personalEmail?: string; personalEmailVerified?: boolean; phoneNumber?: string; phoneVerified?: boolean }; onboardingCompleted: boolean }>('GET', '/auth/me'),
    approvedDomains: () => request<{ domains: string[] }>('GET', '/auth/approved-domains'),
  },


  profile: {
    get: () => request<any>('GET', '/profile'),
    update: (payload: any) => request<{ message: string }>('PUT', '/profile', payload),
    completeOnboarding: () => request<{ message: string }>('POST', '/profile/complete-onboarding'),
  },

  resume: {
    upload: (formData: FormData) => request<any>('POST', '/resume/upload', formData, true),
    list: () => request<{ resumes: any[] }>('GET', '/resume'),
    delete: (id: number) => request<{ message: string }>('DELETE', `/resume/${id}`),
  },

  analysis: {
    eligibility: (payload: { targetCompany: string; targetRole: string }) =>
      request<any>('POST', '/analysis/eligibility', payload),
    skillGap: (payload: { targetCompany: string; targetRole: string }) =>
      request<any>('POST', '/analysis/skill-gap', payload),
    preparation: (payload: { targetCompany: string; targetRole: string }) =>
      request<any>('POST', '/analysis/preparation', payload),
    resumeIntelligence: (payload: { targetCompany: string; targetRole: string }) =>
      request<{ analysis: string; targetCompany: string; targetRole: string; resumeName: string; timestamp: string }>(
        'POST', '/analysis/resume-intelligence', payload
      ),
    history: () => request<{ history: any[] }>('GET', '/analysis/history'),
  },

  chat: {
    send: (message: string, preferredLang?: string) => request<{ response: string; timestamp: string }>('POST', '/chat', { message, preferredLang }),
    history: () => request<{ messages: any[] }>('GET', '/chat/history'),
    clearHistory: () => request<{ message: string }>('DELETE', '/chat/history'),
  },

  dashboard: {
    get: () => request<any>('GET', '/dashboard'),
  },

  audio: {
    languages: () => request<{ languages: Array<{ code: string; bcp47: string; label: string; flag: string }> }>('GET', '/audio/languages'),
    generateScript: (payload: { language: string; languageCode: string }) =>
      request<{ script: string; language: string; languageCode: string; bcp47: string; generatedAt: string }>('POST', '/audio/generate-script', payload),
  },
};
