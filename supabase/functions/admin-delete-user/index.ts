import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch caller profile
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (callerProfileError || !callerProfile) {
      console.error('Caller profile error:', callerProfileError);
      return new Response(JSON.stringify({ error: 'Perfil do utilizador não encontrado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['administrator', 'superuser'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Sem permissão para eliminar utilizadores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    const { userId, profileId } = requestBody;

    console.log('Delete request params:', { userId, profileId });

    // Normalize params and allow fallback lookup
    let targetUserId = userId as string | null;
    let targetProfileId = profileId as string | null;

    if (!targetUserId && !targetProfileId) {
      return new Response(JSON.stringify({ error: 'Parâmetros inválidos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If only profileId provided, fetch user_id
    if (!targetUserId && targetProfileId) {
      const { data: pById } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('id', targetProfileId)
        .maybeSingle();
      targetUserId = pById?.user_id ?? null;
      console.log('Fetched userId from profileId:', targetUserId);
    }

    // If only userId provided, fetch profile id
    if (!targetProfileId && targetUserId) {
      const { data: pByUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', targetUserId)
        .maybeSingle();
      targetProfileId = pByUser?.id ?? null;
      console.log('Fetched profileId from userId:', targetProfileId);
    }

    if (!targetProfileId) {
      return new Response(JSON.stringify({ error: 'Perfil alvo não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch target profile
    const { data: targetProfile, error: targetErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', targetProfileId as string)
      .single();

    if (targetErr || !targetProfile) {
      console.error('Target profile error:', targetErr);
      return new Response(JSON.stringify({ error: 'Utilizador alvo não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Target profile:', { id: targetProfile.id, role: targetProfile.role, user_id: targetProfile.user_id });

    if (targetProfile.user_id === user.id) {
      return new Response(JSON.stringify({ error: 'Não pode eliminar a sua própria conta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (targetProfile.role === 'superuser') {
      return new Response(JSON.stringify({ error: 'Não é possível eliminar superutilizadores' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (targetProfile.role === 'administrator' && callerProfile.role !== 'superuser') {
      return new Response(JSON.stringify({ error: 'Apenas superusers podem eliminar administradores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If administrator (not superuser), enforce same-tenant deletion
    if (callerProfile.role === 'administrator' && targetProfile.tenant_id !== callerProfile.tenant_id) {
      return new Response(JSON.stringify({ error: 'Não pode eliminar utilizadores de outro tenant' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('All validations passed, proceeding with deletion');

    // First delete profile (this will handle cascades)
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetProfileId as string);

    if (profileDeleteError) {
      console.error('Profile delete error:', profileDeleteError);
      return new Response(JSON.stringify({ error: 'Erro ao eliminar perfil: ' + profileDeleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Profile deleted successfully');

    // Then delete from auth (if exists, ignore errors for non-existent users)
    if (targetUserId) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (authDeleteError) {
        console.warn('Auth delete warning (ignored):', authDeleteError.message);
        // Continue - this is not critical since profile is already deleted
      } else {
        console.log('Auth user deleted successfully');
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('admin-delete-user error:', e);
    return new Response(JSON.stringify({ error: 'Erro interno', details: e?.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});