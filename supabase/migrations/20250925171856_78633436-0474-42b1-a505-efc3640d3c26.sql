-- Add 'staff' role to the user_role enum
ALTER TYPE user_role ADD VALUE 'staff';

-- Update is_administrator function to include staff for most permissions
CREATE OR REPLACE FUNCTION public.is_administrator()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT role IN ('administrator', 'superuser', 'gerente', 'staff') FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$function$;

-- Create specific function to check if user is staff
CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT role = 'staff' FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$function$;

-- Create function to check if user has reports access (only admin and gerente)
CREATE OR REPLACE FUNCTION public.has_reports_access()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT role IN ('administrator', 'superuser', 'gerente') FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$function$;