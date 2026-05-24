// src/lib/supabase.ts
// This file creates ONE Supabase connection that the whole app uses.
// Every other file imports { supabase } from here.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
