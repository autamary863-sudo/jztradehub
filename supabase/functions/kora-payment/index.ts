import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://csianbopsmufkrdrsasn.supabase.co'
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaWFuYm9wc211ZmtyZHJzYXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2Mjk5NzAsImV4cCI6MjA5MDIwNTk3MH0.1oZ1Ok1PI_hP-lV7-qa1BhGcEItI59gOuseQkPkrrgI'
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { orderId, amount, email, name, phone } = await req.json()
    
    if (!orderId || !amount || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const KORA_SECRET_KEY = Deno.env.get('KORA_SECRET_KEY') || 'sk_test_gt4ANWUwg1UqKRK7j4RyJYtFVSNin46JpCmWU814'
    
    const reference = `JZ-${orderId.slice(0, 8)}-${Date.now()}`
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:8083'
    const amountInKobo = Math.round(amount * 100)
    
    let formattedPhone = phone || '08012345678'
    formattedPhone = formattedPhone.replace(/\s/g, '')
    if (!formattedPhone.startsWith('0')) {
      formattedPhone = '0' + formattedPhone
    }

    const payload = {
      amount: amountInKobo,
      reference: reference,
      currency: 'NGN',
      customer: {
        email: email,
        name: name || email.split('@')[0],
        phone: formattedPhone,
      },
      redirect_url: `${frontendUrl}/payment-success?reference=${reference}&orderId=${orderId}`,
    }

    console.log('Sending to Kora:', JSON.stringify(payload, null, 2))

    const response = await fetch('https://api.korahq.com/payment/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KORA_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log('Kora Response:', response.status, responseText)

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      data = { status: false }
    }

    if (response.status === 200 && data.status === true && data.data?.checkout_url) {
      const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')
      await supabaseAdmin
        .from('orders')
        .update({ payment_reference: reference })
        .eq('id', orderId)
      
      return new Response(
        JSON.stringify({
          success: true,
          authorizationUrl: data.data.checkout_url,
          reference: reference,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.message || 'Payment initialization failed',
          status: response.status
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})