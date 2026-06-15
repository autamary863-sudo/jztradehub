import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateOrderRequest {
  orderId?: string
  orderStatus?: string
  paymentStatus?: string
  // Role management
  action?: 'add_role'
  userId?: string
  role?: 'admin' | 'seller' | 'buyer'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header present:', !!authHeader)

    if (!authHeader) {
      console.error('No authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted, length:', token.length)

    // Use service role client for all operations - bypasses RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify authentication using the token directly
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Authentication failed:', authError?.message || 'No user')
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message || 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id, user.email)

    // Verify admin role by directly querying user_roles table
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError) {
      console.error('Role check error:', roleError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!adminRole) {
      console.log('User is not an admin:', user.id)
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Admin role verified for user:', user.id)

    // Parse request body
    const body: UpdateOrderRequest = await req.json()
    const { orderId, orderStatus, paymentStatus, action, userId, role } = body

    // Handle role assignment action
    if (action === 'add_role') {
      if (!userId || !role) {
        return new Response(
          JSON.stringify({ error: 'User ID and role are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Adding role:', role, 'to user:', userId)

      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role })

      if (insertError) {
        console.error('Role insert error:', insertError)
        if (insertError.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'User already has this role' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({ error: 'Failed to assign role', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('AUDIT LOG:', {
        admin_user_id: user.id,
        admin_email: user.email,
        action: 'add_role',
        target_user_id: userId,
        role: role,
        timestamp: new Date().toISOString(),
      })

      return new Response(
        JSON.stringify({ success: true, message: `Role ${role} assigned successfully` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle order update
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Updating order:', orderId, { orderStatus, paymentStatus })

    // Build update object
    const updateData: any = {}
    if (orderStatus) updateData.status = orderStatus
    if (paymentStatus) updateData.payment_status = paymentStatus

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No update data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Perform update (supabaseAdmin already created above)

    const { data: order, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update order', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }


    // Log the admin action for audit trail
    console.log('AUDIT LOG:', {
      admin_user_id: user.id,
      admin_email: user.email,
      action: 'update_order',
      order_id: orderId,
      changes: updateData,
      timestamp: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({ success: true, order }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
