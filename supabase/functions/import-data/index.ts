import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  table: string;
  data: any[];
  options?: {
    upsert?: boolean;
    batchSize?: number;
  };
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

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user.user) {
      throw new Error('Invalid authorization');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('user_id', user.user.id)
      .single();

    if (!profile || !['administrator', 'superuser'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    const { table, data, options = {} }: ImportRequest = await req.json();
    const { upsert = false, batchSize = 100 } = options;
    const tenantId = profile.tenant_id || profile.id;

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid or empty data array');
    }

    // Add tenant_id to all records
    const dataWithTenant = data.map(record => ({
      ...record,
      tenant_id: tenantId,
      created_by: user.user.id
    }));

    const results = [];
    const errors = [];

    // Process in batches
    for (let i = 0; i < dataWithTenant.length; i += batchSize) {
      const batch = dataWithTenant.slice(i, i + batchSize);
      
      try {
        let query = supabase.from(table);
        
        if (upsert) {
          const { data: result, error } = await query
            .upsert(batch)
            .select();
          
          if (error) throw error;
          results.push(...(result || []));
        } else {
          const { data: result, error } = await query
            .insert(batch)
            .select();
          
          if (error) throw error;
          results.push(...(result || []));
        }
        
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
        
      } catch (error: any) {
        console.error(`Error in batch ${Math.floor(i / batchSize) + 1}:`, error);
        errors.push({
          batch: Math.floor(i / batchSize) + 1,
          error: error.message,
          records: batch.length
        });
      }
    }

    const successCount = results.length;
    const errorCount = errors.length;

    console.log(`Import completed: ${successCount} successful, ${errorCount} failed batches`);

    return new Response(JSON.stringify({
      success: errorCount === 0,
      imported: successCount,
      errors: errorCount,
      errorDetails: errors,
      results: upsert ? 'Upserted' : 'Inserted'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Import error:', error);
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