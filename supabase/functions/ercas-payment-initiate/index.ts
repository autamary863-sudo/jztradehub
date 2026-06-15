import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Use sandbox for testing, production for live
const API_BASE_URL = 'https://api.ercaspay.com/api/v1'

interface PaymentRequest {
  orderId: string
  amount: number
  email: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { orderId, amount, email }: PaymentRequest = await req.json()

    if (!orderId || !amount || !email) {
      console.error('Missing required fields:', { orderId, amount, email })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: orderId, amount, email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Initiating Ercaspay payment:', { orderId, amount, email, userId: user.id })

    const secretKey = Deno.env.get('ERCAS_SECRET_KEY')
    if (!secretKey) {
      console.error('ERCAS_SECRET_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate a unique payment reference
    const paymentReference = `JZ-${orderId.slice(0, 8)}-${Date.now()}`
    
    // Get the frontend URL for redirect
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://jztradehub.lovable.app'

    const ercasPayload = {
      amount: amount,
      paymentReference: paymentReference,
      paymentMethods: 'card,bank-transfer,ussd',
      customerName: user.user_metadata?.display_name || email.split('@')[0],
      customerEmail: email,
      redirectUrl: `${frontendUrl}/buyer?payment=success&orderId=${orderId}`,
      description: `JZTradeHub Order Payment - ${orderId}`,
      currency: 'NGN',
      feeBearer: 'customer',
      metadata: {
        customer_id: user.id,
        order_id: orderId
      }
    }

    console.log('Sending to Ercaspay:', JSON.stringify(ercasPayload, null, 2))

    const response = await fetch(`${API_BASE_URL}/payment/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ercasPayload)
    })

    const responseText = await response.text()
    console.log('Ercaspay raw response:', responseText)

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse Ercaspay response:', e)
      return new Response(
        JSON.stringify({
          error: 'Invalid response from payment gateway',
          details: responseText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Ercaspay parsed response:', JSON.stringify(data, null, 2))

    if (data.requestSuccessful && data.responseBody?.checkoutUrl) {
      console.log('Payment initialized successfully, checkout URL:', data.responseBody.checkoutUrl)
      
      // Update order with payment reference
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'processing'
        })
        .eq('id', orderId)

      if (updateError) {
        console.error('Failed to update order:', updateError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          authorizationUrl: data.responseBody.checkoutUrl,
          reference: paymentReference,
          transactionReference: data.responseBody.transactionReference
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.error('Ercaspay API error:', data)
      return new Response(
        JSON.stringify({
          error: data.errorMessage || data.responseMessage || 'Failed to initialize payment',
          details: data
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})