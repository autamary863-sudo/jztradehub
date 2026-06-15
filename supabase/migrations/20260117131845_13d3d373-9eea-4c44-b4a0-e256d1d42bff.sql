-- Update the generate_referral_code function to accept an optional user_id parameter
-- and also update the profile directly
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  user_name TEXT;
  random_digits TEXT;
  code_exists BOOLEAN;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if user already has a referral code
  SELECT referral_code INTO new_code FROM profiles WHERE id = v_user_id;
  IF new_code IS NOT NULL THEN
    RETURN new_code;
  END IF;

  -- Get user's display name from profiles
  SELECT COALESCE(
    UPPER(REPLACE(SUBSTRING(display_name FROM 1 FOR 6), ' ', '')),
    'USER'
  ) INTO user_name
  FROM profiles
  WHERE id = v_user_id;
  
  IF user_name IS NULL OR user_name = '' THEN
    user_name := 'USER';
  END IF;
  
  LOOP
    -- Generate 6 random digits
    random_digits := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    new_code := user_name || random_digits;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Update the user's profile with the new code
  UPDATE profiles SET referral_code = new_code WHERE id = v_user_id;
  
  RETURN new_code;
END;
$$;

-- Regenerate referral codes for users who don't have one
DO $$
DECLARE
  profile_record RECORD;
  new_code TEXT;
  random_digits TEXT;
BEGIN
  FOR profile_record IN SELECT id, display_name FROM profiles WHERE referral_code IS NULL LOOP
    LOOP
      random_digits := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
      new_code := UPPER(COALESCE(REPLACE(SUBSTRING(profile_record.display_name FROM 1 FOR 6), ' ', ''), 'USER')) || random_digits;
      
      EXIT WHEN NOT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code);
    END LOOP;
    
    UPDATE profiles SET referral_code = new_code WHERE id = profile_record.id;
  END LOOP;
END;
$$;