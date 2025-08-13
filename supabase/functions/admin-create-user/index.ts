import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Create a client with the user's token to verify permissions
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader,
          }
        }
      }
    )

    // Verify the user is authenticated and is an administrator
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the user's profile to check permissions
    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Perfil não encontrado' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user is administrator or superuser
    if (!['administrator', 'superuser'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar usuários' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse the request body
    const { email, password, fullName, role } = await req.json()

    if (!email || !password || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    
    if (existingUser.user) {
      return new Response(
        JSON.stringify({ error: 'Usuário já existe com este email' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create the user using admin client (this won't affect current session)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName,
        role: role
      },
      email_confirm: true // Auto-confirm email for admin-created users
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'Falha ao criar usuário' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Aguardar um pouco para o trigger completar
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Buscar o perfil criado pelo trigger
    const { data: createdProfile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', newUser.user.id)
      .maybeSingle()

    if (profileFetchError) {
      console.error('Error fetching profile:', profileFetchError)
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar perfil do usuário' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!createdProfile) {
      console.error('Profile not created by trigger')
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      
      return new Response(
        JSON.stringify({ error: 'Perfil não foi criado automaticamente' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Atualizar o perfil com os valores corretos
    const adminTenant = profile.tenant_id || profile.id
    const correctTenantId = role === 'administrator' ? createdProfile.id : adminTenant
    
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        role: role,
        tenant_id: correctTenantId,
        created_by: profile.id
      })
      .eq('id', createdProfile.id)

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError)
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar perfil do usuário' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário criado com sucesso',
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name: fullName,
          role: role
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})