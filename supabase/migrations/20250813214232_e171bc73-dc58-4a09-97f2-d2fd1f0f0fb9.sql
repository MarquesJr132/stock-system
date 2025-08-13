-- Remover a venda duplicada mais antiga e seus itens
-- Primeiro remover os itens da venda
DELETE FROM sale_items 
WHERE sale_id = '4df335a0-9a96-4cb8-8b4e-90c77c5544a0';

-- Depois remover a venda
DELETE FROM sales 
WHERE id = '4df335a0-9a96-4cb8-8b4e-90c77c5544a0';