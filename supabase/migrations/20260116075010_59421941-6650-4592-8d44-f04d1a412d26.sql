-- Drop and recreate the generate_referral_code function to use username + 6 digits
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
BEGIN
  -- Get user's display name from profiles
  SELECT COALESCE(
    UPPER(REPLACE(SUBSTRING(display_name FROM 1 FOR 6), ' ', '')),
    'USER'
  ) INTO user_name
  FROM profiles
  WHERE id = auth.uid();
  
  -- If no display name, use 'USER'
  IF user_name IS NULL OR user_name = '' THEN
    user_name := 'USER';
  END IF;
  
  LOOP
    -- Generate 6 random digits
    random_digits := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    new_code := user_name || random_digits;
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;