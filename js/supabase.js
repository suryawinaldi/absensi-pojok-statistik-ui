// 1. SUPABASE INITIALIZATION
    // ==========================================
    const SUPABASE_URL = 'https://jlzbdggbklnhrfixggym.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsemJkZ2dia2xuaHJmaXhnZ3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyODY4NjYsImV4cCI6MjEwNTg2Mjg2Nn0.plbwqXtv5GvvOphl1jqNuJUR31QFtySOMIaBlFurVGY';
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);