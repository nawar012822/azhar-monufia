import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dbsklaimaaytqnzolsbw.supabase.co';
const supabaseKey = 'sb_publishable_Czdm3uPIoyv4DhfN3Kch9A_Jswl6DK0'; 

export const supabase = createClient(supabaseUrl, supabaseKey);