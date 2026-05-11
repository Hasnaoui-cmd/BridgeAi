import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gzrtmwpopdhfjrpugzmy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cnRtd3BvcGRoZmpycHVnem15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NDM2MzQsImV4cCI6MjA5MzIxOTYzNH0.-b-UCI9MNO8_zGhkE1BpTSZu2k9hSt_6SDjU0vGfJdA';

export const supabase = createClient(supabaseUrl, supabaseKey);
