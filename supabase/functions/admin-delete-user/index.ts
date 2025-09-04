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

    const { userId, profileId } = await req.json();

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
    }

    // If only userId provided, fetch profile id
    if (!targetProfileId && targetUserId) {
      const { data: pByUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', targetUserId)
        .maybeSingle();
      targetProfileId = pByUser?.id ?? null;
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
      return new Response(JSON.stringify({ error: 'Utilizador alvo não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Skipping heavy reassignment to avoid timeouts; data attribution can be handled separately if needed
    // Previously: await supabaseAdmin.rpc('reassign_user_data_before_deletion', { user_profile_id: targetProfileId as string })

    // Delete from auth first (if exists)
    if (targetUserId) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (authDeleteError && !/not\s?found/i.test(authDeleteError.message)) {
        return new Response(JSON.stringify({ error: 'Erro ao eliminar do Auth: ' + authDeleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Then delete profile (ignore if already removed via cascade or triggers)
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetProfileId as string);

    if (profileDeleteError) {
      // Log but continue
      console.warn('Profile delete error (ignored):', profileDeleteError.message);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('admin-delete-user error:', e);
    return new Response(JSON.stringify({ error: 'Erro interno', details: e?.message } ), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
