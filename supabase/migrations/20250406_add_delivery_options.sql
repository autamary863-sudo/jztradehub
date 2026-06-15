-- Migration: Add delivery_options to seller_profiles
-- Run this migration to add delivery options functionality

-- Add the column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seller_profiles' 
    AND column_name = 'delivery_options'
  ) THEN
    ALTER TABLE public.seller_profiles 
    ADD COLUMN delivery_options JSONB DEFAULT '[
      {
        "id": "standard",
        "name": "Standard Delivery",
        "fee": 1500,
        "estimated_days": "3-5 business days",
        "is_active": true,
        "description": "Regular delivery via our logistics partners"
      },
      {
        "id": "express", 
        "name": "Express Delivery",
        "fee": 3000,
        "estimated_days": "1-2 business days",
        "is_active": true,
        "description": "Fast delivery for urgent orders"
      }
    ]'::jsonb;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_seller_profiles_delivery_options 
ON public.seller_profiles USING gin (delivery_options);

-- Add comment to document the column
COMMENT ON COLUMN public.seller_profiles.delivery_options IS 
'JSON array of delivery options that sellers offer. Each option has: id, name, fee, estimated_days, is_active, description';