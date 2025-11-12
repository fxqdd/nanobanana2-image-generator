import supabase from '../lib/supabaseClient';

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user || null;
}

export async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error) return null;
  return data;
}

export async function getMySubscription() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getMyGenerationsCountThisMonth() {
  const user = await getCurrentUser();
  if (!user) return 0;
  const from = new Date();
  from.setDate(1);
  from.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', from.toISOString());
  if (error) return 0;
  return count || 0;
}

export async function createGenerationAndCharge({ model, prompt, resultUrl, durationMs, cost }) {
  const { data, error } = await supabase.rpc('create_generation_with_charge', {
    p_model: model,
    p_prompt: prompt,
    p_result_url: resultUrl,
    p_duration_ms: durationMs || 0,
    p_cost: cost || 0
  });
  if (error) throw error;
  return data; // uuid
}


