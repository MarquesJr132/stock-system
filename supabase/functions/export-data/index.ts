import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  table: string;
  format: 'csv' | 'json' | 'excel';
  filters?: Record<string, any>;
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

    if (!profile) {
      throw new Error('Profile not found');
    }

    const { table, format, filters = {} }: ExportRequest = await req.json();
    const tenantId = profile.tenant_id || profile.id;

    // Build query
    let query = supabase
      .from(table)
      .select('*')
      .eq('tenant_id', tenantId);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No data found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    let responseData: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        responseData = convertToCSV(data);
        contentType = 'text/csv';
        filename = `${table}_export_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      case 'json':
        responseData = JSON.stringify(data, null, 2);
        contentType = 'application/json';
        filename = `${table}_export_${new Date().toISOString().split('T')[0]}.json`;
        break;
      
      default:
        throw new Error('Unsupported format');
    }

    console.log(`Exported ${data.length} records from ${table} as ${format}`);

    return new Response(responseData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Export error:', error);
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

function convertToCSV(data: any[]): string {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
}

serve(handler);