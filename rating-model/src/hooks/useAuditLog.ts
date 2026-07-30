import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { AuditLogEntry } from '../types/domain';

export function useAuditLog(enabled: boolean) {
  return useQuery({
    queryKey: ['auditLog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(600);
      if (error) throw error;
      return (data ?? []).map((r): AuditLogEntry => ({
        ts: +new Date(r.created_at),
        userId: r.actor_id,
        userName: r.actor_name || '—',
        action: r.action,
        detail: r.detail || '',
        aid: r.assessment_id,
      }));
    },
    enabled,
  });
}

interface LogParams {
  actorId: string;
  actorName: string;
  action: string;
  detail?: string;
  assessmentId?: string | null;
}

export function useLogAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ actorId, actorName, action, detail, assessmentId }: LogParams) => {
      const { error } = await supabase.from('audit_log').insert({
        actor_id: actorId, actor_name: actorName, action, detail: detail || '', assessment_id: assessmentId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLog'] });
    },
  });
}
