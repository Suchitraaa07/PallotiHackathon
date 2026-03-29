import type { User } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabaseClient";

export type AppRole = "user" | "hospital";

export type ProfileRecord = {
  id: string;
  name: string;
  role: AppRole;
  verification_status: "pending" | "approved";
};

export type SignUpPayload = {
  name: string;
  email: string;
  password: string;
  role: AppRole;
};

export const AUTH_RATE_LIMIT_COOLDOWN_SECONDS = 60;

function normalizeAuthErrorMessage(rawMessage: string) {
  const message = rawMessage.toLowerCase();

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return `Too many attempts. Please wait ${AUTH_RATE_LIMIT_COOLDOWN_SECONDS} seconds and try again.`;
  }

  if (message.includes("invalid login credentials")) {
    return "Invalid email or password. If you signed up recently, verify your email first.";
  }

  if (message.includes("email not confirmed")) {
    return "Please verify your email before logging in.";
  }

  if (message.includes("already registered") || message.includes("already been registered")) {
    return "This email is already registered. Please login or verify email if not confirmed yet.";
  }

  return rawMessage;
}

export function isRateLimitAuthError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const msg = error.message.toLowerCase();
  return msg.includes("rate limit") || msg.includes("too many requests");
}

export async function resendSignupVerificationEmail(email: string, redirectTo?: string) {
  const client = ensureSupabaseClient();

  const { error } = await client.auth.resend({
    type: "signup",
    email,
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
  });

  if (error) {
    throw new Error(normalizeAuthErrorMessage(error.message));
  }
}

function ensureSupabaseClient() {
  if (!supabase) {
    throw new Error(
      "Supabase client is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend env."
    );
  }
  return supabase;
}

export async function signUpWithRole(payload: SignUpPayload) {
  const client = ensureSupabaseClient();

  const { data, error } = await client.auth.signUp({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    throw new Error(normalizeAuthErrorMessage(error.message));
  }

  const user = data.user;
  if (!user) {
    throw new Error("Signup returned no user. Please try again.");
  }

  const verification_status =
    payload.role === "hospital" ? "pending" : "approved";

  const { error: profileInsertError } = await client.from("profiles").insert({
    id: user.id,
    name: payload.name,
    role: payload.role,
    verification_status,
  });

  if (profileInsertError) {
    throw new Error(normalizeAuthErrorMessage(profileInsertError.message));
  }

  return user;
}

export async function loginWithPassword(email: string, password: string) {
  const client = ensureSupabaseClient();

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(normalizeAuthErrorMessage(error.message));
  }

  return data;
}

export async function signOutUser() {
  const client = ensureSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(normalizeAuthErrorMessage(error.message));
  }
}

export async function getCurrentUser() {
  const client = ensureSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw new Error(normalizeAuthErrorMessage(error.message));
  }

  return data.user;
}

export async function getProfileByUserId(userId: string) {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from("profiles")
    .select("id,name,role,verification_status")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(normalizeAuthErrorMessage(error.message));
  }

  return data as ProfileRecord;
}

export async function getCurrentUserWithProfile(): Promise<{
  user: User | null;
  profile: ProfileRecord | null;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, profile: null };
  }

  const profile = await getProfileByUserId(user.id);
  return { user, profile };
}
