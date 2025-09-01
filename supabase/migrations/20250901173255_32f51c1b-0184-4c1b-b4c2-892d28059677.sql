-- Adicionar campos para suportar cotações na tabela sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS valid_until date,
ADD COLUMN IF NOT EXISTS notes text;

-- Criar comentários para documentar os novos campos
COMMENT ON COLUMN public.sales.status IS 'Status da venda/cotação: completed, quotation, pending, approved, rejected, converted';
COMMENT ON COLUMN public.sales.valid_until IS 'Data de validade para cotações';
COMMENT ON COLUMN public.sales.notes IS 'Observações adicionais';