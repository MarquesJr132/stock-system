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
    console.log('Starting admin-create-user function...')
    console.log('Environment check - SUPABASE_URL:', !!Deno.env.get('SUPABASE_URL'))
    console.log('Environment check - SUPABASE_SERVICE_ROLE_KEY:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    console.log('Environment check - SUPABASE_ANON_KEY:', !!Deno.env.get('SUPABASE_ANON_KEY'))
    
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
      console.error('Authentication failed:', userError)
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não autenticado' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('User authenticated:', user.email)

    // Get the user's profile to check permissions
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch failed:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'Perfil não encontrado' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Profile found:', profile.email, 'Role:', profile.role)

    // Check if user is administrator, superuser, or manager
    // Staff CANNOT create users
    if (!['administrator', 'superuser', 'gerente'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Apenas administradores, gerentes e superusers podem criar usuários' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Explicitly block staff role from creating users
    if (profile.role === 'staff') {
      return new Response(
        JSON.stringify({ success: false, error: 'Staff não tem permissão para criar usuários' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse the request body
    const { email, password, fullName, role } = await req.json()
    console.log('Creating user:', email, 'with role:', role)

    if (!email || !password || !fullName || !role) {
      return new Response(
        JSON.stringify({ success: false, error: 'Todos os campos são obrigatórios' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate role - only staff and gerente are allowed for regular users
    if (!['staff', 'gerente', 'administrator'].includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Função inválida. Apenas "staff" e "gerente" são permitidos.' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if email already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      console.log('Email already exists in profiles:', email)
      return new Response(
        JSON.stringify({ success: false, error: 'Este email já está registrado no sistema' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Creating new user in auth...')
    
    // Validate that we have the service role key
    if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração do servidor incorreta' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Create the user using admin API (proper method for admin user creation)
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
      
      // Provide more specific error messages and return 200 with success: false for business errors
      let errorMessage = createError.message;
      if (createError.message?.includes('already registered')) {
        errorMessage = 'Este email já está registrado no sistema';
        // Return 200 with success: false for business logic errors
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else if (createError.message?.includes('invalid email')) {
        errorMessage = 'Email inválido fornecido';
      } else if (createError.message?.includes('password')) {
        errorMessage = 'Senha não atende aos critérios mínimos';
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: createError.code || 'user_creation_failed',
          error: errorMessage 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!newUser.user) {
      console.error('User creation returned no user data')
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao criar usuário' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('User created successfully:', newUser.user.id)
    
    // Create role entry in user_roles table for proper security
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
        tenant_id: role === 'administrator' ? null : (profile.tenant_id || profile.id),
        created_by: user.id
      })

    if (roleError) {
      console.error('Error creating user role:', roleError)
      // Continue anyway as the profile will have the role
    }
    
    // Wait a bit longer for trigger to complete
    console.log('Waiting for trigger to complete...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Try to get the profile created by trigger
    const { data: createdProfile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', newUser.user.id)
      .maybeSingle()

    console.log('Profile fetch result:', { createdProfile, profileFetchError })

    if (!createdProfile) {
      console.log('Profile not created by trigger, creating manually...')
      
      // Create profile manually if trigger didn't work
      const adminTenant = profile.tenant_id || profile.id
      const correctTenantId = role === 'administrator' ? null : adminTenant // Will be set later
      
      const { data: manualProfile, error: manualProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: newUser.user.id,
          email: email,
          full_name: fullName,
          role: role,
          tenant_id: correctTenantId,
          created_by: profile.id
        })
        .select()
        .single()

      if (manualProfileError) {
        console.error('Error creating profile manually:', manualProfileError)
        
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar perfil do usuário' }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      console.log('Profile created manually:', manualProfile.id)
      
      // For administrators, set tenant_id to profile id
      if (role === 'administrator') {
        await supabaseAdmin
          .from('profiles')
          .update({ tenant_id: manualProfile.id })
          .eq('id', manualProfile.id)
        
        console.log('Updated admin tenant_id to profile id')
      }
    } else {
      console.log('Profile found from trigger, updating...')
      
      // Update the existing profile
      const adminTenant = profile.tenant_id || profile.id
      const correctTenantId = role === 'administrator' ? createdProfile.id : adminTenant
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: fullName,
          role: role,
          tenant_id: correctTenantId,
          created_by: profile.id
        })
        .eq('id', createdProfile.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao atualizar perfil do usuário' }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      console.log('Profile updated successfully')
    }

    console.log('User creation completed successfully')

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
    console.error('Unexpected error in admin-create-user:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor', details: (error as any).message }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})