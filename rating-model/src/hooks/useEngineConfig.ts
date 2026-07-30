import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { EngineConfigDraft, EngineConfigPublished, EngineConfigRow } from '../types/domain';
import type { Json } from '../types/supabase';

interface ConfigsRow {
  user_id: string;
  data: EngineConfigRow | null;
}

function toJson<T>(value: T): Json {
  return value as unknown as Json;
}

// The published engine config, readable by every signed-in user (RLS grants
// read access to any row owned by an admin). `configs` is keyed per-admin,
// so with more than one admin "the" published config is ambiguous — this
// takes the highest-versioned published config across all admin-owned rows,
// which is unambiguous today (a single admin account exists) but should be
// revisited if a second admin account starts publishing configs.
export function usePublishedEngineConfig() {
  return useQuery({
    queryKey: ['engineConfig', 'published'],
    queryFn: async () => {
      const { data, error } = await supabase.from('configs').select('user_id, data');
      if (error) throw error;
      let best: EngineConfigPublished | null = null;
      for (const row of (data as ConfigsRow[]) || []) {
        const pub = row.data?.published;
        if (pub && (!best || pub.version > best.version)) best = pub;
      }
      return best;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

// The current user's own configs row (draft + whatever they've published).
export function useOwnEngineConfig(userId: string | undefined) {
  return useQuery({
    queryKey: ['engineConfig', 'own', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configs')
        .select('data')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.data as EngineConfigRow | null) ?? { draft: null, published: null };
    },
    enabled: !!userId,
  });
}

async function readModifyWriteConfig(userId: string, patch: (current: EngineConfigRow) => EngineConfigRow) {
  const { data: existing, error: readErr } = await supabase
    .from('configs')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (readErr) throw readErr;
  const current: EngineConfigRow = (existing?.data as EngineConfigRow | null) ?? { draft: null, published: null };
  const next = patch(current);
  const { error: writeErr } = await supabase.from('configs').upsert({ user_id: userId, data: toJson(next) }, { onConflict: 'user_id' });
  if (writeErr) throw writeErr;
  return next;
}

export function useSaveEngineDraft(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: EngineConfigDraft | null) => {
      if (!userId) throw new Error('Not signed in');
      return readModifyWriteConfig(userId, (current) => ({ ...current, draft }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineConfig', 'own', userId] });
    },
  });
}

export function useApproveEngineConfig(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (published: EngineConfigPublished) => {
      if (!userId) throw new Error('Not signed in');
      return readModifyWriteConfig(userId, (current) => ({ ...current, published }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineConfig', 'own', userId] });
      queryClient.invalidateQueries({ queryKey: ['engineConfig', 'published'] });
    },
  });
}
