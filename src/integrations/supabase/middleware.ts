import { supabase } from './client';

export const supabaseMiddleware = {
  // Helper to get current user
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Helper to check if user is authenticated
  isAuthenticated: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  // Helper to get session
  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },
};

