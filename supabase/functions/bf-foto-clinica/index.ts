// Implantação candidata: função Supabase bf-foto-clinica; não publicada neste ensaio.
import {photoHandler} from './handler.mjs';
Deno.serve(photoHandler({
  base:Deno.env.get('SUPABASE_URL'),
  anon:Deno.env.get('SUPABASE_ANON_KEY'),
  secret:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  origin:Deno.env.get('BF_FOTO_ORIGEM')||'https://blackflow.app.br'
}));
