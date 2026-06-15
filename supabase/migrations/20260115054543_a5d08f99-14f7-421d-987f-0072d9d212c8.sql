-- Create referrals table to track referrer-referee relationships
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referee_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_referrer FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_referee FOREIGN KEY (referee_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create referral_earnings table to track earnings
CREATE TABLE public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL,
  order_id UUID NOT NULL,
  order_amount NUMERIC NOT NULL,
  earning_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  credited_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_referral FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE CASCADE,
  CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

-- Add referral_code column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN referral_code TEXT UNIQUE,
ADD COLUMN total_referral_earnings NUMERIC DEFAULT 0,
ADD COLUMN pending_referral_earnings NUMERIC DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referee ON public.referrals(referee_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_referral_earnings_referral ON public.referral_earnings(referral_id);
CREATE INDEX idx_referral_earnings_status ON public.referral_earnings(status);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals table
CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "System can insert referrals"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referee_id);

CREATE POLICY "Admins can view all referrals"
ON public.referrals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for referral_earnings table
CREATE POLICY "Users can view their referral earnings"
ON public.referral_earnings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.referrals r
    WHERE r.id = referral_earnings.referral_id
    AND r.referrer_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage referral earnings"
ON public.referral_earnings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character code
    code := upper(substr(md5(random()::text), 1, 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

-- Function to ensure user has a referral code
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate referral code on profile insert/update
CREATE TRIGGER ensure_profile_referral_code
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION ensure_referral_code();

-- Function to credit referral earnings (called by admin when confirming payment)
CREATE OR REPLACE FUNCTION public.credit_referral_earning(
  p_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id UUID;
  v_order_amount NUMERIC;
  v_referral_id UUID;
  v_referrer_id UUID;
  v_earning_amount NUMERIC;
  v_earning_id UUID;
BEGIN
  -- Get order details
  SELECT buyer_id, total_amount INTO v_buyer_id, v_order_amount
  FROM orders
  WHERE id = p_order_id;
  
  IF v_buyer_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if buyer was referred
  SELECT id, referrer_id INTO v_referral_id, v_referrer_id
  FROM referrals
  WHERE referee_id = v_buyer_id;
  
  IF v_referral_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if earning already exists for this order
  SELECT id INTO v_earning_id
  FROM referral_earnings
  WHERE order_id = p_order_id;
  
  IF v_earning_id IS NOT NULL THEN
    -- Already credited, update status if pending
    UPDATE referral_earnings
    SET status = 'credited', credited_at = now()
    WHERE id = v_earning_id AND status = 'pending';
    
    -- Update referrer's earnings
    IF FOUND THEN
      UPDATE profiles
      SET 
        total_referral_earnings = COALESCE(total_referral_earnings, 0) + (SELECT earning_amount FROM referral_earnings WHERE id = v_earning_id),
        pending_referral_earnings = GREATEST(0, COALESCE(pending_referral_earnings, 0) - (SELECT earning_amount FROM referral_earnings WHERE id = v_earning_id))
      WHERE id = v_referrer_id;
    END IF;
    RETURN;
  END IF;
  
  -- Calculate 1% earning
  v_earning_amount := v_order_amount * 0.01;
  
  -- Create earning record and mark as credited immediately
  INSERT INTO referral_earnings (referral_id, order_id, order_amount, earning_amount, status, credited_at)
  VALUES (v_referral_id, p_order_id, v_order_amount, v_earning_amount, 'credited', now());
  
  -- Update referrer's total earnings
  UPDATE profiles
  SET total_referral_earnings = COALESCE(total_referral_earnings, 0) + v_earning_amount
  WHERE id = v_referrer_id;
END;
$$;

-- Function to register with referral code
CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_referral_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is already referred
  IF EXISTS (SELECT 1 FROM referrals WHERE referee_id = v_user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Find the referrer by code
  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE referral_code = upper(p_referral_code);
  
  IF v_referrer_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Cannot refer yourself
  IF v_referrer_id = v_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Create referral record
  INSERT INTO referrals (referrer_id, referee_id, referral_code)
  VALUES (v_referrer_id, v_user_id, upper(p_referral_code));
  
  RETURN TRUE;
END;
$$;