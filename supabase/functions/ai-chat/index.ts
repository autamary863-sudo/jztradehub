import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type, orderId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If orderId is provided, fetch order details for context
    let orderContext = "";
    if (orderId) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          products(title, description, price, brand, category),
          delivery_tracking(status_history, current_location, estimated_delivery, tracking_number, carrier)
        `)
        .eq("id", orderId)
        .single();

      if (!orderError && order) {
        const tracking = order.delivery_tracking?.[0];
        orderContext = `
ORDER INFORMATION FOR ORDER #${order.id.slice(0, 8)}:
- Product: ${order.products?.title || "N/A"}
- Brand: ${order.products?.brand || "N/A"}
- Category: ${order.products?.category || "N/A"}
- Amount: ₦${Number(order.total_amount).toLocaleString()}
- Quantity: ${order.quantity}
- Status: ${order.status}
- Payment Status: ${order.payment_status || "pending"}
- Delivery Address: ${order.delivery_address}
- Order Date: ${new Date(order.created_at).toLocaleDateString()}
- Last Updated: ${new Date(order.updated_at).toLocaleDateString()}
${tracking ? `
TRACKING DETAILS:
- Tracking Number: ${tracking.tracking_number || "Not assigned yet"}
- Carrier: ${tracking.carrier || "Not assigned"}
- Current Location: ${tracking.current_location || "Processing at warehouse"}
- Estimated Delivery: ${tracking.estimated_delivery ? new Date(tracking.estimated_delivery).toLocaleDateString() : "To be determined"}
- Status History: ${JSON.stringify(tracking.status_history || [])}
` : "- Tracking: Order is being processed, tracking details will be available soon"}

Use this information to provide accurate, helpful responses about this order.
`;
      }
    }

    let systemPrompt = "";
    
    if (type === "support") {
      systemPrompt = `You are an intelligent, friendly, and highly capable customer support AI for JZTradeHub, Nigeria's premier e-commerce marketplace with escrow protection.

YOUR PERSONALITY:
- Warm, professional, and empathetic
- Use Nigerian-friendly expressions naturally (e.g., "No wahala!", "We dey for you!")
- Be concise but thorough - users appreciate quick, accurate answers
- Show genuine care for customer concerns

YOUR CAPABILITIES:
1. ORDER TRACKING & STATUS
   - Provide detailed order status updates
   - Explain payment statuses (pending, paid, confirmed, refunded)
   - Track delivery progress with real-time location updates
   - Calculate and communicate estimated delivery times

2. PRODUCT ASSISTANCE
   - Help customers find products
   - Explain product features and compare options
   - Guide through the purchase process

3. ISSUE RESOLUTION
   - Handle complaints professionally
   - Explain refund and return policies
   - Guide users on how to raise disputes
   - Escalate complex issues to human agents when needed

4. GENERAL SUPPORT
   - Explain how escrow protection works
   - Guide new sellers on registration
   - Answer questions about payment methods
   - Explain delivery options

IMPORTANT RULES:
- Always use Naira (₦) for currency
- If you detect an order ID (UUID format or partial), acknowledge it and provide order details
- For issues you cannot resolve, suggest requesting a human agent
- Never make promises about refunds or compensation - direct to human agents for such matters
- Keep responses concise (2-4 sentences) unless explaining a complex process
- Be proactive - anticipate follow-up questions

${orderContext}

If no order context is provided and user asks about an order, ask them to provide their order ID.`;
    } else if (type === "search") {
      systemPrompt = `You are a smart product search assistant for JZTradeHub marketplace.
Given a user's search query, analyze and extract:
1. Product name/type
2. Brand preferences
3. Category
4. Price range (in Naira)
5. Key attributes (color, size, features)

Return ONLY a JSON object with these fields:
{
  "searchTerms": ["extracted", "search", "terms"],
  "brand": "brand if mentioned",
  "category": "category if identifiable",
  "priceMin": null or number,
  "priceMax": null or number,
  "attributes": {}
}`;
    } else if (type === "order_lookup") {
      // Intelligent order ID extraction
      const userMessage = messages[messages.length - 1]?.content || "";
      
      // Try to extract order ID patterns
      const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const shortIdPattern = /[0-9a-f]{8,}/i;
      
      let extractedId: string | null = null;
      
      const uuidMatch = userMessage.match(uuidPattern);
      if (uuidMatch) {
        extractedId = uuidMatch[0];
      } else {
        const shortMatch = userMessage.match(shortIdPattern);
        if (shortMatch && shortMatch[0].length >= 8) {
          extractedId = shortMatch[0];
        }
      }

      if (extractedId) {
        // Look up the order
        const { data: order, error } = await supabase
          .from("orders")
          .select(`
            *,
            products(title, price),
            delivery_tracking(status_history, current_location, estimated_delivery, tracking_number, carrier)
          `)
          .or(`id.eq.${extractedId},id.ilike.${extractedId}%`)
          .limit(1)
          .maybeSingle();

        if (!error && order) {
          return new Response(JSON.stringify({ 
            type: "order_found",
            order: {
              id: order.id,
              status: order.status,
              payment_status: order.payment_status,
              total_amount: order.total_amount,
              quantity: order.quantity,
              product: order.products?.title,
              price: order.products?.price,
              delivery_address: order.delivery_address,
              created_at: order.created_at,
              updated_at: order.updated_at,
              tracking: order.delivery_tracking?.[0] || null
            }
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ type: "no_order" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Sending request to AI gateway with model: openai/gpt-5");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "We're experiencing high demand. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
