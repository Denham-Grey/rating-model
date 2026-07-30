import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Profile } from '../types/domain';

interface CurrentUserReady {
  status: 'ready';
  userId: string;
  email: string;
  profile: Profile;
}
interface CurrentUserLoading {
  status: 'loading';
}
interface CurrentUserSignedOut {
  status: 'signed-out';
}

export type CurrentUser = CurrentUserReady | CurrentUserLoading | CurrentUserSignedOut;

export function useCurrentUser(): CurrentUser {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id;

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });

  if (authLoading) return { status: 'loading' };
  if (!session || !userId) return { status: 'signed-out' };
  if (!profileQuery.data) return { status: 'loading' };

  return { status: 'ready', userId, email: session.user.email ?? '', profile: profileQuery.data };
}
