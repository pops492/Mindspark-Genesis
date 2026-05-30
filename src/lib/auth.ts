import {supabase} from './supabaseClient';

export async function register(email: string,password:string) {
  const {data,errror} = await supabase.auth.signUp({
    email,
    password,
    options:{data: meta },
  });
  if (error) throw error;
  return data.user;
}

export async function login(email: string, password: string) {
  const {data, error } = await supabase.auth.signInWithPassword({email,password});
  if (error) throw error;
  return data.user;
}
