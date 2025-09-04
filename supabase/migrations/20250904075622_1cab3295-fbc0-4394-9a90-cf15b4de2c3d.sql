-- Add banking details fields to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN bank_name TEXT,
ADD COLUMN account_holder TEXT,
ADD COLUMN account_number TEXT,
ADD COLUMN iban TEXT;