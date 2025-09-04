-- Create function to generate quotation number in format AB<year><4digits>
CREATE OR REPLACE FUNCTION public.generate_quotation_number(tenant_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  company_initials TEXT;
  current_year TEXT;
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  -- Get company initials from company settings
  SELECT 
    UPPER(LEFT(company_name, 1) || LEFT(SPLIT_PART(company_name, ' ', 2), 1))
  INTO company_initials
  FROM public.company_settings 
  WHERE tenant_id = tenant_uuid
  LIMIT 1;
  
  -- Default to 'AB' if no company settings found
  IF company_initials IS NULL OR LENGTH(company_initials) < 2 THEN
    company_initials := 'AB';
  END IF;
  
  -- Get current year
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get next sequential number for this year and tenant
  SELECT COALESCE(MAX(
    CASE 
      WHEN quotation_number ~ (company_initials || current_year || '[0-9]{4}')
      THEN CAST(RIGHT(quotation_number, 4) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.quotations 
  WHERE tenant_id = tenant_uuid
    AND quotation_number IS NOT NULL;
  
  -- Format as 4-digit number
  formatted_number := company_initials || current_year || LPAD(next_number::TEXT, 4, '0');
  
  RETURN formatted_number;
END;
$$;