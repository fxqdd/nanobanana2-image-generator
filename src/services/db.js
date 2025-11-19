import supabase from '../lib/supabaseClient';

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase().auth.getUser();
  if (error) throw error;
  return user || null;
}

export async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase()
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
  const { data, error } = await supabase()
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getMyInvoices(limit = 10) {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase()
    .from('invoices')
    .select('id, amount_cents, currency, provider, external_id, description, issued_at')
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })
    .limit(limit);

    if (error) {
      console.warn('Failed to load invoices (table may not exist):', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('Error loading invoices:', err);
    return [];
  }
}

export async function getMyGenerationsCountThisMonth() {
  const user = await getCurrentUser();
  if (!user) return 0;
  const from = new Date();
  from.setDate(1);
  from.setHours(0, 0, 0, 0);
  const { count, error } = await supabase()
    .from('generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', from.toISOString());
  if (error) return 0;
  return count || 0;
}

// 获取当前用户的生成历史，按时间倒序，限制条数
export async function getMyGenerationHistory(limit = 30) {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase()
    .from('generations')
    .select('id, model, prompt, result_url, duration_ms, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load generation history:', error);
    return [];
  }

  return data || [];
}

// 限制每个用户最多保留 limit 条生成记录，超出部分从最旧开始删除
export async function enforceGenerationHistoryLimit(limit = 30) {
  const user = await getCurrentUser();
  if (!user) return;

  const { data, error } = await supabase()
    .from('generations')
    .select('id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data || data.length <= limit) return;

  const idsToDelete = data.slice(limit).map((row) => row.id);
  if (!idsToDelete.length) return;

  const { error: deleteError } = await supabase()
    .from('generations')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('Failed to cleanup old generations:', deleteError);
  }
}

export async function createGenerationAndCharge({ model, prompt, resultUrl, durationMs, cost }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  try {
    const { data, error } = await supabase().rpc('create_generation_with_charge', {
      p_model: model,
      p_prompt: prompt,
      p_result_url: resultUrl,
      p_duration_ms: durationMs || 0,
      p_cost: cost || 0
    });
    if (error) throw error;
    return data; // uuid
  } catch (rpcError) {
    console.warn('RPC create_generation_with_charge failed, applying fallback logic:', rpcError?.message || rpcError);

    // 1. 创建生成记录
    const { data: generation, error: insertError } = await supabase()
      .from('generations')
      .insert({
        user_id: user.id,
        model,
        prompt,
        result_url: resultUrl,
        duration_ms: durationMs || 0
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Fallback generation insert failed:', insertError);
      throw insertError;
    }

    // 2. 扣除点数
    if (cost && cost > 0) {
      const { data: profile, error: profileError } = await supabase()
        .from('profiles')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.warn('Failed to load credits for fallback deduction:', profileError);
      } else {
        const updatedCredits = Math.max(0, (profile?.credits_remaining ?? 0) - cost);
        const { error: updateError } = await supabase()
          .from('profiles')
          .update({ credits_remaining: updatedCredits })
          .eq('user_id', user.id);

        if (updateError) {
          console.warn('Failed to update credits during fallback deduction:', updateError);
        }
      }
    }

    return generation?.id;
  }
}

// 获取当前用户的点数
export async function getMyCredits() {
  const user = await getCurrentUser();
  if (!user) return 0;
  const { data: profile, error } = await supabase()
    .from('profiles')
    .select('credits_remaining')
    .eq('user_id', user.id)
    .single();
  return error ? 0 : profile?.credits_remaining ?? 0;
}

// 检查点数是否足够
export async function checkCreditsSufficient(requiredCredits) {
  const credits = await getMyCredits();
  return credits >= requiredCredits;
}

// 管理员：获取所有用户列表
export async function getAllUsers(limit = 100, offset = 0) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // 检查是否为管理员（需要在 profiles 表中添加 is_admin 字段）
  const profile = await getMyProfile();
  if (!profile?.is_admin) {
    throw new Error('Access denied: Admin only');
  }
  
  // 注意：Supabase 不允许直接查询 auth.users
  // 如果需要在 profiles 表中显示邮箱，需要在创建 profile 时存储 email
  const { data, error } = await supabase()
    .from('profiles')
    .select('*')
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// 管理员：更新用户点数
export async function updateUserCredits(userId, credits) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // 检查是否为管理员
  const profile = await getMyProfile();
  if (!profile?.is_admin) {
    throw new Error('Access denied: Admin only');
  }
  
  const { data, error } = await supabase()
    .from('profiles')
    .update({ credits_remaining: credits })
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// 管理员：更新用户计划
export async function updateUserPlan(userId, plan) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // 检查是否为管理员
  const profile = await getMyProfile();
  if (!profile?.is_admin) {
    throw new Error('Access denied: Admin only');
  }
  
  const { data, error } = await supabase()
    .from('profiles')
    .update({ plan: plan })
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// 管理员：获取用户详细信息（包括邮箱）
export async function getUserDetails(userId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // 检查是否为管理员
  const profile = await getMyProfile();
  if (!profile?.is_admin) {
    throw new Error('Access denied: Admin only');
  }
  
  // 获取 profile
  const { data: profileData, error: profileError } = await supabase()
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (profileError) throw profileError;
  
  // 获取 auth.users 中的邮箱（需要 RPC 或直接查询）
  // 注意：Supabase 默认不允许直接查询 auth.users，可能需要创建 RPC 函数
  // 这里先返回 profile 数据，邮箱可以通过其他方式获取
  
  return profileData;
}


