-- Add NUIT field to customers table
ALTER TABLE public.customers 
ADD COLUMN nuit TEXT;