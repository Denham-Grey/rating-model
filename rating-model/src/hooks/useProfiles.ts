import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types/domain';

export function useProfiles(enabled: boolean) {
  return useQuery({
    queryKey: ['profiles', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
    enabled,
  });
}
