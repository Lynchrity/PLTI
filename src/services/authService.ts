import { supabase } from './supabase';

export async function signUp(
  email: string,
  password: string,
  name: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        user_id: data.user.id,
        name,
        email: data.user.email,
        wallet_balance: 0,
      });

    if (profileError) {
      throw profileError;
    }
  }

  return data;
}

export async function login(
  email: string,
  password: string
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}