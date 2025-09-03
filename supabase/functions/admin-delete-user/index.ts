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
    if (!userId || !profileId) {
      return new Response(JSON.stringify({ error: 'Parâmetros inválidos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch target profile
    const { data: targetProfile, error: targetErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', profileId)
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

    // Delete from auth first
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      return new Response(JSON.stringify({ error: 'Erro ao eliminar do Auth: ' + authDeleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Then delete profile (ignore if already removed via cascade or triggers)
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', profileId);

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
