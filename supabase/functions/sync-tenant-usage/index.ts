import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting automatic tenant usage sync...')

    // Buscar todos os administradores únicos (tenants)
    const { data: administrators, error: adminError } = await supabaseClient
      .from('profiles')
      .select('id, tenant_id, email')
      .eq('role', 'administrator')

    if (adminError) {
      console.error('Error fetching administrators:', adminError)
      throw adminError
    }

    console.log(`Found ${administrators?.length || 0} administrators`)

    let syncedCount = 0
    let errorCount = 0

    // Sincronizar cada tenant
    for (const admin of administrators || []) {
      const tenantId = admin.tenant_id || admin.id
      
      try {
        console.log(`Syncing tenant: ${tenantId} (${admin.email})`)
        
        const { error: syncError } = await supabaseClient
          .rpc('sync_tenant_data_usage', {
            tenant_uuid: tenantId
          })

        if (syncError) {
          console.error(`Error syncing tenant ${tenantId}:`, syncError)
          errorCount++
        } else {
          console.log(`Successfully synced tenant ${tenantId}`)
          syncedCount++
        }
      } catch (error) {
        console.error(`Exception syncing tenant ${tenantId}:`, error)
        errorCount++
      }
    }

    // Resultado final
    const result = {
      success: true,
      synced_tenants: syncedCount,
      errors: errorCount,
      total_tenants: administrators?.length || 0,
      timestamp: new Date().toISOString()
    }

    console.log('Sync completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in sync function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})