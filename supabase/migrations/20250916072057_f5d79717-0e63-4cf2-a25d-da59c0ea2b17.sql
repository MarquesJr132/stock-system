-- Clean up remaining duplicate policies for customers table
DROP POLICY IF EXISTS "Users can insert own tenant customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update own tenant customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view own tenant customers" ON public.customers;

-- Verify only secure policies remain
-- The remaining policies should be:
-- 1. "Service role full access - customers" (for system operations)
-- 2. "Authenticated users can view own tenant customers" 
-- 3. "Authenticated users can create own tenant customers"
-- 4. "Authenticated users can update own tenant customers"
-- 5. "Admin users can delete own tenant customers"