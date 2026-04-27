import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
      }
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signupRedirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;

  return {
    user,
    loading,
    passwordRecovery,
    signIn: (email: string, password: string) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email: string, password: string) =>
      supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: signupRedirectTo,
        },
      }),
    resetPasswordForEmail: (email: string) =>
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: signupRedirectTo,
      }),
    updatePassword: (password: string) => supabase.auth.updateUser({ password }),
    signOut: () => supabase.auth.signOut(),
  };
}
