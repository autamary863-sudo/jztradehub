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

    const { action, type, amount, toUserId, withdrawalId } = await req.json();

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

    // Format phone number
    const formatPhone = (phone: string) => {
      let formatted = phone.replace(/\s/g, '');
      if (formatted.startsWith('0')) {
        formatted = '+234' + formatted.slice(1);
      } else if (!formatted.startsWith('+')) {
        formatted = '+234' + formatted;
      }
      return formatted;
    };

    const formattedPhone = formatPhone(profile.phone_number);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Send OTP
    if (action === "send") {
      // Store OTP in database
      if (type === "withdrawal") {
        await supabaseClient
          .from("wallets")
          .update({
            withdrawal_otp: otpCode,
            withdrawal_otp_expires_at: expiresAt
          })
          .eq("profile_id", user.id);
      } else if (type === "transfer") {
        await supabaseClient
          .from("wallets")
          .update({
            transfer_otp: otpCode,
            transfer_otp_expires_at: expiresAt
          })
          .eq("profile_id", user.id);
      }

      // Try to send via Twilio
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

      let messageSent = false;
      if (accountSid && authToken) {
        try {
          const twilio = await import("https://esm.sh/twilio@4.19.0");
          const client = twilio.default(accountSid, authToken);
          
          let message = `Your JZTradeHub verification code is: ${otpCode}\n`;
          if (type === "withdrawal") {
            message += `Amount: ₦${amount?.toLocaleString() || "N/A"}\n`;
          } else if (type === "transfer") {
            message += `Transfer amount: ₦${amount?.toLocaleString() || "N/A"}\n`;
          }
          message += `Valid for 10 minutes. Never share this code with anyone.`;
          
          await client.messages.create({
            body: message,
            to: formattedPhone,
            messagingServiceSid: messagingServiceSid,
          });
          messageSent = true;
        } catch (twilioError) {
          console.error("Twilio error:", twilioError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: messageSent ? "OTP sent via SMS!" : "OTP generated (Test Mode)",
          testOtp: !messageSent ? otpCode : undefined,
          expiresAt: expiresAt
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify OTP
    if (action === "verify") {
      const { otpCode: userOtp } = await req.json();
      
      let storedOtp: string | null = null;
      let storedExpiry: string | null = null;

      if (type === "withdrawal") {
        const { data: wallet } = await supabaseClient
          .from("wallets")
          .select("withdrawal_otp, withdrawal_otp_expires_at")
          .eq("profile_id", user.id)
          .single();
        storedOtp = wallet?.withdrawal_otp;
        storedExpiry = wallet?.withdrawal_otp_expires_at;
      } else if (type === "transfer") {
        const { data: wallet } = await supabaseClient
          .from("wallets")
          .select("transfer_otp, transfer_otp_expires_at")
          .eq("profile_id", user.id)
          .single();
        storedOtp = wallet?.transfer_otp;
        storedExpiry = wallet?.transfer_otp_expires_at;
      }

      if (!storedOtp) {
        return new Response(
          JSON.stringify({ error: "No OTP found. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(storedExpiry!) < new Date()) {
        return new Response(
          JSON.stringify({ error: "OTP expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (storedOtp !== userOtp) {
        return new Response(
          JSON.stringify({ error: "Invalid OTP. Please try again." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Clear OTP after successful verification
      if (type === "withdrawal") {
        await supabaseClient
          .from("wallets")
          .update({ withdrawal_otp: null, withdrawal_otp_expires_at: null })
          .eq("profile_id", user.id);
      } else if (type === "transfer") {
        await supabaseClient
          .from("wallets")
          .update({ transfer_otp: null, transfer_otp_expires_at: null })
          .eq("profile_id", user.id);
      }

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
});