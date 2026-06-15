-- Generate referral codes for all existing users who don't have one
UPDATE profiles
SET referral_code = UPPER(
  COALESCE(
    REPLACE(SUBSTRING(display_name FROM 1 FOR 6), ' ', ''),
    'USER'
  )
) || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE referral_code IS NULL;

-- Update the trigger function to work on INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  user_name TEXT;
  random_digits TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Only generate if referral_code is null
  IF NEW.referral_code IS NULL THEN
    -- Get username from display_name
    user_name := UPPER(COALESCE(REPLACE(SUBSTRING(NEW.display_name FROM 1 FOR 6), ' ', ''), 'USER'));
    
    IF user_name = '' THEN
      user_name := 'USER';
    END IF;
    
    LOOP
      -- Generate 6 random digits
      random_digits := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
      new_code := user_name || random_digits;
      
      -- Check if code exists
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code AND id != NEW.id) INTO code_exists;
      
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    NEW.referral_code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
DROP TRIGGER IF EXISTS ensure_referral_code_trigger ON profiles;
CREATE TRIGGER ensure_referral_code_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION ensure_referral_code();