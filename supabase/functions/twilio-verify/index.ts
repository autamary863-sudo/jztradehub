<<<<<<< HEAD
// supabase/functions/twilio-otp/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, type, amount, otpCode } = await req.json();

    // Get user's phone number
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("phone_number, display_name")
      .eq("id", user.id)
      .single();

    if (!profile?.phone_number) {
      return new Response(
        JSON.stringify({ error: "Phone number not found. Please add a phone number first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number for Nigeria
    const formatPhoneNumber = (phone: string) => {
      let formatted = phone.replace(/\s/g, '');
      if (formatted.startsWith('0')) {
        formatted = '+234' + formatted.slice(1);
      } else if (formatted.startsWith('234')) {
        formatted = '+' + formatted;
      } else if (!formatted.startsWith('+')) {
        formatted = '+234' + formatted;
      }
      return formatted;
    };

    const formattedPhone = formatPhoneNumber(profile.phone_number);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store OTP in database
    const { error: storeError } = await supabaseClient
      .from("phone_verifications")
      .upsert({
        user_id: user.id,
        phone_number: formattedPhone,
        verification_code: otp,
        expires_at: expiresAt,
        type: type,
        amount: amount,
        created_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    if (storeError) {
      console.error("Store error:", storeError);
    }

    // Twilio Configuration
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

    let messageSent = false;

    if (accountSid && authToken) {
      try {
        // Dynamic import for Twilio
        const twilio = await import("https://esm.sh/twilio@4.19.0");
        const client = twilio.default(accountSid, authToken);
        
        let messageBody = `🔐 JZTradeHub Verification Code\n\n`;
        messageBody += `Your OTP code is: ${otp}\n\n`;
        messageBody += `Type: ${type === "withdrawal" ? "Withdrawal" : "Transfer"}\n`;
        messageBody += `Amount: ₦${amount?.toLocaleString() || "N/A"}\n\n`;
        messageBody += `Valid for 10 minutes. Never share this code with anyone.\n\n`;
        messageBody += `JZTradeHub - Secure Escrow Marketplace`;
        
        await client.messages.create({
          body: messageBody,
          to: formattedPhone,
          messagingServiceSid: messagingServiceSid,
        });
        
        messageSent = true;
        console.log(`✅ OTP sent to ${formattedPhone}`);
      } catch (twilioError) {
        console.error("Twilio error:", twilioError);
      }
    }

    // Send OTP
    if (action === "send") {
      return new Response(
        JSON.stringify({
          success: true,
          message: messageSent ? "OTP sent via SMS!" : "OTP generated (SMS not configured)",
          testOtp: !messageSent ? otp : undefined,
          expiresAt: expiresAt
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify OTP
    if (action === "verify") {
      // Get stored OTP
      const { data: verification, error: fetchError } = await supabaseClient
        .from("phone_verifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", type)
        .single();

      if (fetchError || !verification) {
        return new Response(
          JSON.stringify({ error: "No OTP found. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check expiry
      if (new Date(verification.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "OTP expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify code
      if (verification.verification_code !== otpCode) {
        return new Response(
          JSON.stringify({ error: "Invalid OTP. Please try again." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Clear OTP after successful verification
      await supabaseClient
        .from("phone_verifications")
        .delete()
        .eq("user_id", user.id)
        .eq("type", type);

      return new Response(
        JSON.stringify({ success: true, message: "OTP verified successfully!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
=======
// supabase/functions/twilio-otp/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, type, amount, otpCode } = await req.json();

    // Get user's phone number
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("phone_number, display_name")
      .eq("id", user.id)
      .single();

    if (!profile?.phone_number) {
      return new Response(
        JSON.stringify({ error: "Phone number not found. Please add a phone number first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number for Nigeria
    const formatPhoneNumber = (phone: string) => {
      let formatted = phone.replace(/\s/g, '');
      if (formatted.startsWith('0')) {
        formatted = '+234' + formatted.slice(1);
      } else if (formatted.startsWith('234')) {
        formatted = '+' + formatted;
      } else if (!formatted.startsWith('+')) {
        formatted = '+234' + formatted;
      }
      return formatted;
    };

    const formattedPhone = formatPhoneNumber(profile.phone_number);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store OTP in database
    const { error: storeError } = await supabaseClient
      .from("phone_verifications")
      .upsert({
        user_id: user.id,
        phone_number: formattedPhone,
        verification_code: otp,
        expires_at: expiresAt,
        type: type,
        amount: amount,
        created_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    if (storeError) {
      console.error("Store error:", storeError);
    }

    // Twilio Configuration
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

    let messageSent = false;

    if (accountSid && authToken) {
      try {
        // Dynamic import for Twilio
        const twilio = await import("https://esm.sh/twilio@4.19.0");
        const client = twilio.default(accountSid, authToken);
        
        let messageBody = `🔐 JZTradeHub Verification Code\n\n`;
        messageBody += `Your OTP code is: ${otp}\n\n`;
        messageBody += `Type: ${type === "withdrawal" ? "Withdrawal" : "Transfer"}\n`;
        messageBody += `Amount: ₦${amount?.toLocaleString() || "N/A"}\n\n`;
        messageBody += `Valid for 10 minutes. Never share this code with anyone.\n\n`;
        messageBody += `JZTradeHub - Secure Escrow Marketplace`;
        
        await client.messages.create({
          body: messageBody,
          to: formattedPhone,
          messagingServiceSid: messagingServiceSid,
        });
        
        messageSent = true;
        console.log(`✅ OTP sent to ${formattedPhone}`);
      } catch (twilioError) {
        console.error("Twilio error:", twilioError);
      }
    }

    // Send OTP
    if (action === "send") {
      return new Response(
        JSON.stringify({
          success: true,
          message: messageSent ? "OTP sent via SMS!" : "OTP generated (SMS not configured)",
          testOtp: !messageSent ? otp : undefined,
          expiresAt: expiresAt
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify OTP
    if (action === "verify") {
      // Get stored OTP
      const { data: verification, error: fetchError } = await supabaseClient
        .from("phone_verifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", type)
        .single();

      if (fetchError || !verification) {
        return new Response(
          JSON.stringify({ error: "No OTP found. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check expiry
      if (new Date(verification.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "OTP expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify code
      if (verification.verification_code !== otpCode) {
        return new Response(
          JSON.stringify({ error: "Invalid OTP. Please try again." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Clear OTP after successful verification
      await supabaseClient
        .from("phone_verifications")
        .delete()
        .eq("user_id", user.id)
        .eq("type", type);

      return new Response(
        JSON.stringify({ success: true, message: "OTP verified successfully!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
>>>>>>> a114dcbce2976d5fa2df1449a65be436e3b40d57
});