-- Add logo_url column to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN logo_url TEXT;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true);

-- Create RLS policies for company logos bucket
CREATE POLICY "Administrators can upload company logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role IN ('administrator', 'superuser')
  )
);

CREATE POLICY "Administrators can update company logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-logos' 
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role IN ('administrator', 'superuser')
  )
);

CREATE POLICY "Administrators can delete company logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-logos' 
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role IN ('administrator', 'superuser')
  )
);

CREATE POLICY "Public can view company logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-logos');