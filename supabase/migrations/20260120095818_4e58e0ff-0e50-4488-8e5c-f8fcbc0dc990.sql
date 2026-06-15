-- Drop all referral-related triggers first
DROP TRIGGER IF EXISTS ensure_referral_code_trigger ON profiles;
DROP TRIGGER IF EXISTS ensure_profile_referral_code ON profiles;

-- Drop referral-related functions with CASCADE
DROP FUNCTION IF EXISTS public.ensure_referral_code() CASCADE;
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;
DROP FUNCTION IF EXISTS public.apply_referral_code(text) CASCADE;
DROP FUNCTION IF EXISTS public.credit_referral_earning(uuid) CASCADE;

-- Drop referral_earnings table
DROP TABLE IF EXISTS public.referral_earnings CASCADE;

-- Drop referrals table
DROP TABLE IF EXISTS public.referrals CASCADE;

-- Remove referral-related columns from profiles table
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS referral_code,
  DROP COLUMN IF EXISTS total_referral_earnings,
  DROP COLUMN IF EXISTS pending_referral_earnings;