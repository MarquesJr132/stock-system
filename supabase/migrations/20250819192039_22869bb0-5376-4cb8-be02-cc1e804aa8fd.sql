-- Add profit_amount field to special_order_items table
ALTER TABLE public.special_order_items 
ADD COLUMN profit_amount numeric NOT NULL DEFAULT 0;