
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gnvgfrudfdeslxmvxjxm.supabase.co';
const supabaseKey = 'sb_publishable_wdfQor7-mUD05yt7wOgF9A_CgU7xLzc';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const TABLES = {
  KPOP: 'k_registrations',
  COSPOBRE: 'cospobre_registrations',
  COSPLAYER: 'cosplayer_registrations',
  ARENA: 'arena_registrations'
};
