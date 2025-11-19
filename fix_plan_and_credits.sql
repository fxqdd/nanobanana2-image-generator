-- ==============================================================================
-- 1. Fix Default Plan to 'free'
-- ==============================================================================

-- Change default value for future rows
ALTER TABLE public.profiles 
ALTER COLUMN plan SET DEFAULT 'free';

-- Update existing users who have 'basic' plan but NO subscription to 'free'
-- This fixes users who were incorrectly labeled as 'basic' by default
UPDATE public.profiles
SET plan = 'free'
WHERE plan = 'basic'
AND user_id NOT IN (
    SELECT user_id FROM public.subscriptions WHERE status = 'active'
);

-- ==============================================================================
-- 2. Ensure Generations Table Exists
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  result_url TEXT NOT NULL,
  duration_ms INTEGER DEFAULT 0,
  cost INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at);

-- Enable RLS for generations
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own generations
DROP POLICY IF EXISTS "Users can view their own generations" ON public.generations;
CREATE POLICY "Users can view their own generations"
  ON public.generations FOR SELECT
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 3. Install/Update Credit Deduction RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_generation_with_charge(
  p_model TEXT,
  p_prompt TEXT,
  p_result_url TEXT,
  p_duration_ms INTEGER DEFAULT 0,
  p_cost INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_generation_id UUID;
  v_current_credits INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check sufficient credits
  SELECT credits_remaining INTO v_current_credits
  FROM public.profiles
  WHERE user_id = v_user_id;
  
  IF v_current_credits IS NULL OR v_current_credits < p_cost THEN
    RAISE EXCEPTION 'Insufficient credits: required %, current %', p_cost, COALESCE(v_current_credits, 0);
  END IF;
  
  -- Create generation record
  INSERT INTO public.generations (user_id, model, prompt, result_url, duration_ms, cost)
  VALUES (v_user_id, p_model, p_prompt, p_result_url, p_duration_ms, p_cost)
  RETURNING id INTO v_generation_id;
  
  -- Deduct credits
  UPDATE public.profiles
  SET credits_remaining = credits_remaining - p_cost
  WHERE user_id = v_user_id;
  
  RETURN v_generation_id;
END;
$$;
