-- Add bank account fields to seller_profiles table for payment disbursement
ALTER TABLE public.seller_profiles
ADD COLUMN bank_name TEXT,
ADD COLUMN account_number TEXT,
ADD COLUMN account_name TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.seller_profiles.bank_name IS 'Name of the bank where seller wants to receive payments';
COMMENT ON COLUMN public.seller_profiles.account_number IS 'Bank account number for payment disbursement';
COMMENT ON COLUMN public.seller_profiles.account_name IS 'Account holder name for verification';