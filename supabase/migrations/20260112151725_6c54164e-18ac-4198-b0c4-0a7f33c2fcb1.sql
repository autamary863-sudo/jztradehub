-- Add admin SELECT policy for orders table
CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin SELECT policy for delivery_tracking table
CREATE POLICY "Admins can view all tracking" 
ON public.delivery_tracking 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin UPDATE policy for delivery_tracking table
CREATE POLICY "Admins can update tracking" 
ON public.delivery_tracking 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin INSERT policy for delivery_tracking table
CREATE POLICY "Admins can create tracking" 
ON public.delivery_tracking 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add admin SELECT policy for disputes table
CREATE POLICY "Admins can view all disputes" 
ON public.disputes 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin SELECT policy for return_requests table
CREATE POLICY "Admins can view all returns" 
ON public.return_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));