import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})

// Helper para obtener el tenant_id del usuario actual
export const getTenantId = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await supabase
    .from('tenant_usuarios')
    .select('tenant_id')
    .eq('user_id', session.user.id)
    .single()
  return data?.tenant_id || null
}

// En tu archivo supabase.js
console.log("Todo el objeto env:", import.meta.env);
