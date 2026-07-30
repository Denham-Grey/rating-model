import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { UserRole, UserStatus } from '../types/domain';

interface CreateUserResult {
  username: string;
  email: string;
  temporary_password: string;
}
interface ResetPasswordResult {
  username: string;
  email: string;
  temporary_password: string;
}

// supabase.functions.invoke() automatically attaches the caller's own
// session JWT as Authorization and the anon key as apikey — never the
// service_role key, which lives only in each Edge Function's own
// server-side environment.
export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; email: string; role: UserRole }) => {
      const { data, error } = await supabase.functions.invoke<CreateUserResult>('create-user', { body });
      if (error) throw new Error(await extractFunctionError(error));
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', 'list'] });
    },
  });
}

export function useSetStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { userId: string; status: UserStatus }) => {
      const { data, error } = await supabase.functions.invoke('set-status', { body });
      if (error) throw new Error(await extractFunctionError(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', 'list'] });
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (body: { userId: string }) => {
      const { data, error } = await supabase.functions.invoke<ResetPasswordResult>('admin-reset-password', { body });
      if (error) throw new Error(await extractFunctionError(error));
      return data!;
    },
  });
}

// supabase-js's FunctionsHttpError wraps the raw Response; the Edge
// Function's { error: "..." } JSON body isn't parsed automatically.
async function extractFunctionError(error: unknown): Promise<string> {
  const withContext = error as { context?: Response; message?: string };
  if (withContext.context && typeof withContext.context.json === 'function') {
    try {
      const body = await withContext.context.json();
      if (body?.error) return body.error;
    } catch {
      // fall through to generic message
    }
  }
  return withContext.message || 'Request failed.';
}
