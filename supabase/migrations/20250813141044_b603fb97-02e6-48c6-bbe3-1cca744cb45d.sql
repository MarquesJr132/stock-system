-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar um cron job para executar a sincronização diariamente às 02:00
SELECT cron.schedule(
  'daily-tenant-usage-sync',
  '0 2 * * *', -- Diariamente às 02:00
  $$
  SELECT
    net.http_post(
        url:='https://fkthdlbljhhjutuywepc.supabase.co/functions/v1/sync-tenant-usage',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrdGhkbGJsamhoanV0dXl3ZXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MTIwMDgsImV4cCI6MjA3MDA4ODAwOH0.nOAh8oTgWmg5GLT15QmYhPfIM80w5WmX6fpwD3XyR7Y"}'::jsonb,
        body:='{"auto_sync": true}'::jsonb
    ) as request_id;
  $$
);

-- Adicionar um cron job adicional para executar logo no início do mês (dia 1 às 03:00)
SELECT cron.schedule(
  'monthly-tenant-usage-reset-sync',
  '0 3 1 * *', -- Dia 1 de cada mês às 03:00
  $$
  SELECT
    net.http_post(
        url:='https://fkthdlbljhhjutuywepc.supabase.co/functions/v1/sync-tenant-usage',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrdGhkbGJsamhoanV0dXl3ZXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MTIwMDgsImV4cCI6MjA3MDA4ODAwOH0.nOAh8oTgWmg5GLT15QmYhPfIM80w5WmX6fpwD3XyR7Y"}'::jsonb,
        body:='{"monthly_reset": true}'::jsonb
    ) as request_id;
  $$
);