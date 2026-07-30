import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Assessment, AssessmentState } from '../types/domain';
import type { Json } from '../types/supabase';

function toJson<T>(value: T): Json {
  return value as unknown as Json;
}

interface AssessmentRow {
  id: string;
  owner_id: string;
  state: AssessmentState & { __computed?: Record<string, unknown> };
  doc_key: string | null;
  created_at: string;
  updated_at: string;
}

// assessments.owner_id and profiles.id both reference auth.users(id)
// independently — there's no direct FK between assessments and profiles for
// PostgREST to embed across (confirmed via PGRST200 "no relationship
// found"). Resolve owner names with a separate lookup instead.
async function fetchOwnerNames(ownerIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ownerIds)];
  if (!unique.length) return {};
  const { data, error } = await supabase.from('profiles').select('id, full_name, username').in('id', unique);
  if (error) throw error;
  const map: Record<string, string> = {};
  (data ?? []).forEach((p) => { map[p.id] = p.full_name || p.username || ''; });
  return map;
}

function mapRow(row: AssessmentRow, ownerName: string): Assessment {
  const st = row.state || ({} as AssessmentState);
  const c = (st as { __computed?: Record<string, unknown> }).__computed || {};
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName,
    docKey: row.doc_key,
    state: {
      step: (st.step as number) ?? 0,
      maxVisited: (st.maxVisited as number) ?? 0,
      inst: st.inst,
      camels: st.camels ?? {},
      overlay: st.overlay,
      cert: st.cert ?? null,
    },
    name: (c.name as string) || '',
    category: (c.category as Assessment['category']) || 'microfinance',
    filled: (c.filled as number) ?? null,
    total: (c.total as number) ?? null,
    score: (c.score as number) ?? null,
    rating: (c.rating as string) ?? null,
    outlook: (c.outlook as string) || 'Stable',
    certNo: (c.certNo as string) ?? null,
    createdAt: row.created_at ? +new Date(row.created_at) : Date.now(),
    updatedAt: row.updated_at ? +new Date(row.updated_at) : Date.now(),
  };
}

// Same query for analyst and admin — RLS (`owner_id = auth.uid() or is_admin()`)
// alone determines row count, so there's no client-side role branching here.
export function useAssessments(userId: string | undefined) {
  return useQuery({
    queryKey: ['assessments', 'list', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, owner_id, state, doc_key, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data as unknown as AssessmentRow[];
      const names = await fetchOwnerNames(rows.map((r) => r.owner_id));
      return rows.map((r) => mapRow(r, names[r.owner_id] || ''));
    },
    enabled: !!userId,
  });
}

export function useAssessment(id: string | undefined) {
  return useQuery({
    queryKey: ['assessments', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, owner_id, state, doc_key, created_at, updated_at')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as AssessmentRow;
      const names = await fetchOwnerNames([row.owner_id]);
      return mapRow(row, names[row.owner_id] || '');
    },
    enabled: !!id,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ownerId, state }: { ownerId: string; state: AssessmentState }) => {
      const id = crypto.randomUUID();
      const { data, error } = await supabase
        .from('assessments')
        .insert({ id, owner_id: ownerId, state: toJson(state), updated_at: new Date().toISOString() })
        .select('id, owner_id, state, doc_key, created_at, updated_at')
        .single();
      if (error) throw error;
      return mapRow(data as unknown as AssessmentRow, '');
    },
    onSuccess: (row, vars) => {
      queryClient.setQueryData(['assessments', 'detail', row.id], row);
      queryClient.invalidateQueries({ queryKey: ['assessments', 'list', vars.ownerId] });
    },
  });
}

export function useUpdateAssessment(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { state: AssessmentState; ownerId: string; docKey?: string | null }) => {
      if (!id) throw new Error('No assessment id');
      const { error } = await supabase
        .from('assessments')
        .update({ state: toJson(patch.state), doc_key: patch.docKey, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      if (!id) return;
      await queryClient.cancelQueries({ queryKey: ['assessments', 'detail', id] });
      const previous = queryClient.getQueryData<Assessment>(['assessments', 'detail', id]);
      if (previous) {
        queryClient.setQueryData(['assessments', 'detail', id], { ...previous, state: patch.state, updatedAt: Date.now() });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (id && context?.previous) queryClient.setQueryData(['assessments', 'detail', id], context.previous);
    },
    onSettled: (_data, _err, patch) => {
      if (id) queryClient.invalidateQueries({ queryKey: ['assessments', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['assessments', 'list', patch.ownerId] });
    },
  });
}
