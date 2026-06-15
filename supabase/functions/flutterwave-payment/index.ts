// supabase/functions/flutterwave-payment/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Your Flutterwave V4 Live Keys
const FLW_SECRET_KEY = "FLWSECK-f31a3cb0e562ff8dbcc03346a088e658-19ec742752evt-X";
const FLW_PUBLIC_KEY = "FLWPUBK-e18bc012ca5ff6921c7c55dc87476de9-X";
const FLW_ENCRYPTION_KEY = "f31a3cb0e562d86f52baaedf";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify auth token for all routes except webhook
    const authHeader = req.headers.get('Authorization');
    if (!authHeader && path !== 'webhook') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let user = null;
    if (authHeader && path !== 'webhook') {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: userData }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !userData) {
        return new Response(
          JSON.stringify({ error: 'Invalid token', details: authError?.message }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      user = userData;
    }
    
    // ============ INITIATE DEPOSIT ============
    if (path === 'initiate') {
      const { amount, email, name } = await req.json();
      
      if (!amount || amount < 100) {
        return new Response(
          JSON.stringify({ error: 'Minimum deposit is ₦100', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const reference = `DEP-${Date.now()}-${user.id.slice(0, 8)}`;
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:8083';
      
      const payload = {
        tx_ref: reference,
        amount: parseFloat(amount),
        currency: "NGN",
        redirect_url: `${frontendUrl}/wallet?reference=${reference}&status=successful`,
        payment_options: "card,banktransfer,ussd",
        customer: {
          email: email || user.email,
          name: name || user.email.split('@')[0],
          phonenumber: "08012345678"
        },
        customizations: {
          title: "JZTradeHub Wallet Deposit",
          description: `Wallet funding of ₦${parseFloat(amount).toLocaleString()}`
        },
        meta: {
          user_id: user.id,
          type: "wallet_deposit"
        }
      };
      
      console.log("💰 Initiating deposit:", { amount, reference });
      
      const response = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FLW_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      console.log("📥 Flutterwave response:", data.status, data.message);
      
      if (response.ok && data.status === "success" && data.data?.link) {
        // Store pending deposit with status 'pending'
        await supabase.from("pending_deposits").insert({
          user_id: user.id,
          reference: reference,
          amount: parseFloat(amount),
          status: "pending"
        });
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            checkout_url: data.data.link, 
            reference,
            message: "Redirecting to payment page"
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            error: data.message || "Failed to initiate deposit", 
            success: false,
            flutterwave_response: data
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // ============ VERIFY DEPOSIT (Called from frontend after redirect) ============
    if (path === 'verify') {
      const reference = url.searchParams.get('reference');
      const status = url.searchParams.get('status');
      
      console.log("🔍 Verifying reference:", reference, "Status:", status);
      
      if (!reference) {
        return new Response(
          JSON.stringify({ error: 'No reference provided', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if payment was cancelled
      if (status === 'cancelled') {
        // Update pending deposit to cancelled
        await supabase
          .from("pending_deposits")
          .update({ status: "cancelled", completed_at: new Date().toISOString() })
          .eq("reference", reference);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            cancelled: true,
            message: "Payment was cancelled by user" 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Verify with Flutterwave API
      const response = await fetch(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${FLW_SECRET_KEY}` }
      });
      
      const data = await response.json();
      console.log("📥 Verification Response:", data.status, data.data?.status);
      
      // Check if payment was successful
      if (data.status === "success" && data.data?.status === "successful") {
        const amount = data.data.amount;
        let userId = data.data.meta?.user_id;
        
        if (!userId && reference.includes('-')) {
          const parts = reference.split('-');
          if (parts.length >= 3) {
            userId = parts[2];
          }
        }
        
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User not found', success: false }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`💰 Processing successful deposit: ₦${amount} for user ${userId}`);
        
        // Check if already processed (prevent double credit)
        const { data: existingTx } = await supabase
          .from("wallet_transactions")
          .select("id")
          .eq("reference", reference)
          .maybeSingle();
        
        if (existingTx) {
          console.log("⚠️ Transaction already processed");
          return new Response(
            JSON.stringify({ 
              success: true, 
              already_processed: true,
              message: "Deposit already credited" 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get or create wallet
        let { data: wallet } = await supabase
          .from("wallets")
          .select("*")
          .eq("profile_id", userId)
          .maybeSingle();
        
        if (!wallet) {
          const { data: newWallet } = await supabase
            .from("wallets")
            .insert({ profile_id: userId, balance: 0, total_deposited: 0, total_withdrawn: 0 })
            .select()
            .single();
          wallet = newWallet;
        }
        
        const oldBalance = wallet.balance;
        const newBalance = oldBalance + amount;
        const newTotalDeposited = (wallet.total_deposited || 0) + amount;
        
        // Update wallet balance
        const { error: updateError } = await supabase
          .from("wallets")
          .update({ 
            balance: newBalance, 
            total_deposited: newTotalDeposited,
            updated_at: new Date().toISOString() 
          })
          .eq("profile_id", userId);
        
        if (updateError) {
          console.error("Failed to update wallet:", updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update wallet', success: false }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Record transaction
        await supabase
          .from("wallet_transactions")
          .insert({
            user_id: userId,
            type: "deposit",
            amount: amount,
            balance_before: oldBalance,
            balance_after: newBalance,
            status: "completed",
            reference: reference,
            description: `Wallet deposit of ₦${amount.toLocaleString()}`
          });
        
        // Update pending deposit
        await supabase
          .from("pending_deposits")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("reference", reference);
        
        console.log(`✅ Deposit complete! New balance: ₦${newBalance}`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            amount: amount, 
            new_balance: newBalance,
            message: `₦${amount.toLocaleString()} added to your wallet`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } 
      // Check if payment failed
      else if (data.data?.status === "failed" || data.status === "error") {
        // Update pending deposit to failed
        await supabase
          .from("pending_deposits")
          .update({ 
            status: "failed", 
            completed_at: new Date().toISOString(),
            metadata: { error: data.message }
          })
          .eq("reference", reference);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            failed: true,
            message: data.message || "Payment failed. Please try again." 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Payment pending or other status
      else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            pending: true,
            message: data.message || "Payment verification pending. Please check back later." 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // ============ FLUTTERWAVE WEBHOOK (For automatic verification) ============
    if (path === 'webhook') {
      const payload = await req.json();
      console.log("📨 Webhook received:", payload.event);
      
      const { event, data } = payload;
      
      if (event === 'charge.completed' || event === 'payment.successful') {
        const reference = data.tx_ref;
        const amount = data.amount;
        const status = data.status;
        
        if (status === 'successful') {
          let userId = data.meta?.user_id;
          if (!userId && reference.includes('-')) {
            const parts = reference.split('-');
            if (parts.length >= 3) {
              userId = parts[2];
            }
          }
          
          if (userId) {
            // Process the deposit (same as verify logic above)
            const { data: existingTx } = await supabase
              .from("wallet_transactions")
              .select("id")
              .eq("reference", reference)
              .maybeSingle();
            
            if (!existingTx) {
              let { data: wallet } = await supabase
                .from("wallets")
                .select("*")
                .eq("profile_id", userId)
                .maybeSingle();
              
              if (!wallet) {
                const { data: newWallet } = await supabase
                  .from("wallets")
                  .insert({ profile_id: userId, balance: 0, total_deposited: 0, total_withdrawn: 0 })
                  .select()
                  .single();
                wallet = newWallet;
              }
              
              const oldBalance = wallet.balance;
              const newBalance = oldBalance + amount;
              
              await supabase
                .from("wallets")
                .update({ balance: newBalance, total_deposited: (wallet.total_deposited || 0) + amount })
                .eq("profile_id", userId);
              
              await supabase
                .from("wallet_transactions")
                .insert({
                  user_id: userId,
                  type: "deposit",
                  amount: amount,
                  balance_before: oldBalance,
                  balance_after: newBalance,
                  status: "completed",
                  reference: reference,
                  description: `Wallet deposit of ₦${amount.toLocaleString()} (webhook)`
                });
              
              await supabase
                .from("pending_deposits")
                .update({ status: "completed", completed_at: new Date().toISOString() })
                .eq("reference", reference);
            }
          }
        }
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ============ GET BALANCE ============
    if (path === 'balance') {
      let { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("profile_id", user.id)
        .maybeSingle();
      
      if (!wallet) {
        const { data: newWallet } = await supabase
          .from("wallets")
          .insert({ profile_id: user.id, balance: 0, total_deposited: 0, total_withdrawn: 0 })
          .select()
          .single();
        wallet = newWallet;
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          balance: wallet?.balance || 0,
          total_deposited: wallet?.total_deposited || 0,
          total_withdrawn: wallet?.total_withdrawn || 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ============ GET TRANSACTIONS ============
    if (path === 'transactions') {
      const { data: transactions } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      
      return new Response(
        JSON.stringify({ success: true, transactions: transactions || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ============ TRANSFER ============
    if (path === 'transfer') {
      const { to_user_id, amount } = await req.json();
      
      if (!to_user_id || !amount || amount < 100) {
        return new Response(
          JSON.stringify({ error: 'Invalid transfer details', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      let { data: senderWallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("profile_id", user.id)
        .single();
      
      if (!senderWallet || senderWallet.balance < amount) {
        return new Response(
          JSON.stringify({ error: 'Insufficient balance', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      let { data: receiverWallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("profile_id", to_user_id)
        .single();
      
      if (!receiverWallet) {
        const { data: newWallet } = await supabase
          .from("wallets")
          .insert({ profile_id: to_user_id, balance: 0 })
          .select()
          .single();
        receiverWallet = newWallet;
      }
      
      const reference = `TRF-${Date.now()}-${user.id.slice(0, 8)}`;
      
      await supabase
        .from("wallets")
        .update({ balance: senderWallet.balance - amount })
        .eq("profile_id", user.id);
      
      await supabase
        .from("wallets")
        .update({ balance: receiverWallet.balance + amount })
        .eq("profile_id", to_user_id);
      
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          type: "transfer_sent",
          amount: amount,
          status: "completed",
          reference: reference,
          description: `Transfer of ₦${amount.toLocaleString()}`
        });
      
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: to_user_id,
          type: "transfer_received",
          amount: amount,
          status: "completed",
          reference: reference,
          description: `Transfer of ₦${amount.toLocaleString()} received`
        });
      
      return new Response(
        JSON.stringify({ success: true, message: `₦${amount.toLocaleString()} sent successfully!` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});