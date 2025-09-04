import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupRequest {
  tables?: string[];
  includeFiles?: boolean;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user.user) {
      throw new Error('Invalid authorization');
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('user_id', user.user.id)
      .single();

    if (!profile || !['administrator', 'superuser'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    const { tables = [], includeFiles = false }: BackupRequest = await req.json();

    const tenantId = profile.tenant_id || profile.id;
    const backupData: any = {
      timestamp: new Date().toISOString(),
      tenant_id: tenantId,
      data: {}
    };

    // Default tables to backup
    const tablesToBackup = tables.length > 0 ? tables : [
      'products', 'customers', 'sales', 'sale_items', 
      'stock_movements', 'suppliers', 'company_settings'
    ];

    // Backup each table
    for (const table of tablesToBackup) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('tenant_id', tenantId);

        if (error) {
          console.error(`Error backing up ${table}:`, error);
          continue;
        }

        backupData.data[table] = data;
        console.log(`Backed up ${data?.length || 0} records from ${table}`);
      } catch (err) {
        console.error(`Error backing up ${table}:`, err);
      }
    }

    // If including files, backup storage metadata
    if (includeFiles) {
      try {
        const { data: files } = await supabase
          .storage
          .from('company-logos')
          .list('', { limit: 1000 });
        
        backupData.data.files = files || [];
      } catch (err) {
        console.error('Error backing up files:', err);
      }
    }

    console.log('Backup completed successfully');

    return new Response(JSON.stringify({
      success: true,
      backup: backupData,
      size: JSON.stringify(backupData).length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Backup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
};

serve(handler);