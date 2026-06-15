-- Add foreign key constraint from flash_sales to products
ALTER TABLE public.flash_sales 
ADD CONSTRAINT flash_sales_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES public.products(id) 
ON DELETE CASCADE;