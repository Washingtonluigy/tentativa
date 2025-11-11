import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://skhmvmpfaiomvuryuadj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNraG12bXBmYWlvbXZ1cnl1YWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTI4OTIsImV4cCI6MjA3ODM4ODg5Mn0.vceSjSMyyRwvdPznMEYDhYl7g0e87HGRKBU_31Aq9bI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
