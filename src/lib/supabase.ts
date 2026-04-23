import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://ludcvdnpipjuegtqzuqm.supabase.co';
const fallbackAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1ZGN2ZG5waXBqdWVndHF6dXFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDEwNDIsImV4cCI6MjA5MjUxNzA0Mn0.tavu9dMcdnZuBo5sDJQ4INIewJ0VkMku47fH8Ga7Ckk';

const url = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackAnonKey;

if (!url || !anonKey) {
  throw new Error('No se pudo inicializar Supabase. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(url, anonKey);
