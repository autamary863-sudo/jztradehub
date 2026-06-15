-- Enable realtime for orders table so buyers can receive instant payment confirmation
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;