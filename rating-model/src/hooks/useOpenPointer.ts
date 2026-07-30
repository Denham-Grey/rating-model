import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export function useOpenPointer(userId: string | undefined) {
  return useQuery({
    queryKey: ['openPointer', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('open_pointers')
        .select('assessment_id')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data?.assessment_id ?? null;
    },
    enabled: !!userId,
  });
}

export function useSetOpenPointer(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assessmentId: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from('open_pointers')
        .upsert({ user_id: userId, assessment_id: assessmentId }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openPointer', userId] });
    },
  });
}
