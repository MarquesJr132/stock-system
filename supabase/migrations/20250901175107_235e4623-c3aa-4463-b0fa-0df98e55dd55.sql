-- Update existing "Encomenda Especial" products to have the correct category
UPDATE public.products 
SET category = 'encomenda_especial' 
WHERE name = 'Encomenda Especial' AND category = 'especial';