import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const SUPABASE_URL = "https://csianbopsmufkrdrsasn.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaWFuYm9wc211ZmtyZHJzYXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyOTk3MCwiZXhwIjoyMDkwMjA1OTcwfQ.3YkZnN4MkLhE1GjKJx5VvQn7p2LxR9yWbN8aUcXdFfE"

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    const body = await req.json()
    console.log('📨 Webhook received:', JSON.stringify(body, null, 2))

    const { event, data } = body

    if (event === 'payment.success' || event === 'charge.success') {
      const reference = data.reference
      console.log(`💰 Payment successful for reference: ${reference}`)

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      const { data: order, error: findError } = await supabaseAdmin
        .from('orders')
        .select('id, payment_status')
        .eq('payment_reference', reference)
        .single()

      if (findError) {
        console.error('Order not found:', findError)
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (order.payment_status !== 'paid') {
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ 
            payment_status: 'paid',
            status: 'confirmed'
          })
          .eq('id', order.id)

        if (updateError) {
          console.error('Failed to update order:', updateError)
        } else {
          console.log(`✅ Order ${order.id} marked as paid`)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})