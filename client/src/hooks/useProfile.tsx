import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Profile, Skill, Project, Certification } from '../types';

interface ProfileState {
  user: { fullName: string; email: string } | null;
  profile: Profile;
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  loading: boolean;
  error: string | null;
}

export function useProfile() {
  const [state, setState] = useState<ProfileState>({
    user: null,
    profile: {},
    skills: [],
    projects: [],
    certifications: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await api.profile.get();
      setState({
        user: { fullName: data.user.fullName, email: data.user.email },
        profile: data.profile || {},
        skills: data.skills || [],
        projects: data.projects || [],
        certifications: data.certifications || [],
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (err as Error).message,
      }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (payload: any) => {
    await api.profile.update(payload);
    await load();
  }, [load]);

  return { ...state, reload: load, save };
}
