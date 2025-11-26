import { createClient } from '@supabase/supabase-js';

// Configuration provided in the prompt
const SUPABASE_URL = "https://stgzdrnlrlnmkfvefjwl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0Z3pkcm5scmxubWtmdmVmandsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5Mzc2MjYsImV4cCI6MjA3OTUxMzYyNn0.hNmuixWZu9rPt0fRu5hK2FX_C6vXYmUwh4XDk7A04kU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
