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
    throw new Error(error.message);
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
    throw new Error(profileInsertError.message);
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
    throw new Error(error.message);
  }

  return data;
}

export async function signOutUser() {
  const client = ensureSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUser() {
  const client = ensureSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw new Error(error.message);
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
    throw new Error(error.message);
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
