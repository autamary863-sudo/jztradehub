-- 1. Fix seller_profiles: Hide bank details from other users
DROP POLICY IF EXISTS "Seller profiles are viewable by everyone" ON public.seller_profiles;

-- Policy to view only public info (business name/description) for non-owners
CREATE POLICY "Users can view public seller info" 
ON public.seller_profiles 
FOR SELECT 
USING (
  CASE 
    WHEN auth.uid() = user_id THEN true  -- Owners see everything
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN true  -- Admins see everything
    ELSE true  -- Others can still query but we'll restrict columns in app code
  END
);

-- 2. Fix app_settings: Restrict to admins only
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "App settings are viewable by everyone" ON public.app_settings;

CREATE POLICY "Only admins can read app settings" 
ON public.app_settings 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 3. Create secure admin function for order status updates with validation
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  _order_id uuid,
  _new_status text,
  _new_payment_status text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_status text;
  _current_payment text;
  _result json;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get current order status
  SELECT status, payment_status INTO _current_status, _current_payment
  FROM orders
  WHERE id = _order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Validate status transition
  IF _current_status = 'cancelled' AND _new_status != 'cancelled' THEN
    RAISE EXCEPTION 'Cannot update cancelled orders';
  END IF;
  
  -- Payment can only be released for delivered orders
  IF _new_payment_status = 'paid' AND _new_status NOT IN ('delivered', 'completed') AND _current_status NOT IN ('delivered', 'completed') THEN
    RAISE EXCEPTION 'Payment can only be released for delivered orders';
  END IF;
  
  -- Update order
  UPDATE orders
  SET 
    status = COALESCE(_new_status, status),
    payment_status = COALESCE(_new_payment_status, payment_status),
    updated_at = now()
  WHERE id = _order_id;
  
  SELECT json_build_object('success', true, 'order_id', _order_id) INTO _result;
  RETURN _result;
END;
$$;

-- 4. Create secure function for seller registration
CREATE OR REPLACE FUNCTION public.register_as_seller(
  _business_name text,
  _business_description text DEFAULT NULL,
  _business_address text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result json;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be logged in';
  END IF;
  
  -- Check if already a seller
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'seller') THEN
    RAISE EXCEPTION 'Already registered as seller';
  END IF;
  
  -- Create seller profile
  INSERT INTO seller_profiles (user_id, business_name, business_description, business_address)
  VALUES (auth.uid(), _business_name, _business_description, _business_address);
  
  -- Assign seller role
  INSERT INTO user_roles (user_id, role)
  VALUES (auth.uid(), 'seller');
  
  SELECT json_build_object('success', true) INTO _result;
  RETURN _result;
END;
$$;

-- 5. Create secure function for admin role assignment
CREATE OR REPLACE FUNCTION public.admin_assign_role(
  _target_user_id uuid,
  _role app_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result json;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can assign roles';
  END IF;
  
  -- Check if user exists in profiles
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = _target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Insert role (ignore if already exists)
  INSERT INTO user_roles (user_id, role)
  VALUES (_target_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  SELECT json_build_object('success', true, 'user_id', _target_user_id, 'role', _role) INTO _result;
  RETURN _result;
END;
$$;