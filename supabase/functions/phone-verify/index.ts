<<<<<<< HEAD
// supabase/functions/phone-verify/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Store OTPs temporarily (in production use Redis or database)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, phoneNumber, code } = await req.json();

    // Format phone number for Nigeria
    const formatPhoneNumber = (phone: string) => {
      let formatted = phone.replace(/\s/g, '');
      if (formatted.startsWith('0')) {
        formatted = '+234' + formatted.slice(1);
      } else if (!formatted.startsWith('+')) {
        formatted = '+234' + formatted;
      }
      return formatted;
    };

    // Send OTP
    if (action === "send") {
      if (!phoneNumber) {
        return new Response(
          JSON.stringify({ error: "Phone number required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store OTP
      otpStore.set(formattedPhone, { code: otpCode, expiresAt });

      // Try to send via Twilio (if configured)
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

      if (accountSid && authToken) {
        try {
          const twilio = await import("https://esm.sh/twilio@4.19.0");
          const client = twilio.default(accountSid, authToken);
          
          await client.messages.create({
            body: `Your JZTradeHub verification code is: ${otpCode}. Valid for 10 minutes.`,
            to: formattedPhone,
            messagingServiceSid: messagingServiceSid,
          });
          
          return new Response(
            JSON.stringify({ success: true, message: "OTP sent via SMS!" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (twilioError) {
          console.error("Twilio error:", twilioError);
        }
      }

      // Fallback - return OTP for testing
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "OTP sent! (Test Mode)",
          testOtp: otpCode,
          isTestMode: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify OTP
    if (action === "verify") {
      if (!phoneNumber || !code) {
        return new Response(
          JSON.stringify({ error: "Phone number and code required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);
      const stored = otpStore.get(formattedPhone);

      if (!stored) {
        return new Response(
          JSON.stringify({ error: "No OTP found. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(formattedPhone);
        return new Response(
          JSON.stringify({ error: "OTP expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (stored.code !== code) {
        return new Response(
          JSON.stringify({ error: "Invalid OTP. Please try again." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // OTP verified - delete it
      otpStore.delete(formattedPhone);

      return new Response(
        JSON.stringify({ success: true, message: "Phone verified successfully!" }),
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
// supabase/functions/phone-verify/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Store OTPs temporarily (in production use Redis or database)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, phoneNumber, code } = await req.json();

    // Format phone number for Nigeria
    const formatPhoneNumber = (phone: string) => {
      let formatted = phone.replace(/\s/g, '');
      if (formatted.startsWith('0')) {
        formatted = '+234' + formatted.slice(1);
      } else if (!formatted.startsWith('+')) {
        formatted = '+234' + formatted;
      }
      return formatted;
    };

    // Send OTP
    if (action === "send") {
      if (!phoneNumber) {
        return new Response(
          JSON.stringify({ error: "Phone number required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store OTP
      otpStore.set(formattedPhone, { code: otpCode, expiresAt });

      // Try to send via Twilio (if configured)
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

      if (accountSid && authToken) {
        try {
          const twilio = await import("https://esm.sh/twilio@4.19.0");
          const client = twilio.default(accountSid, authToken);
          
          await client.messages.create({
            body: `Your JZTradeHub verification code is: ${otpCode}. Valid for 10 minutes.`,
            to: formattedPhone,
            messagingServiceSid: messagingServiceSid,
          });
          
          return new Response(
            JSON.stringify({ success: true, message: "OTP sent via SMS!" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (twilioError) {
          console.error("Twilio error:", twilioError);
        }
      }

      // Fallback - return OTP for testing
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "OTP sent! (Test Mode)",
          testOtp: otpCode,
          isTestMode: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify OTP
    if (action === "verify") {
      if (!phoneNumber || !code) {
        return new Response(
          JSON.stringify({ error: "Phone number and code required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);
      const stored = otpStore.get(formattedPhone);

      if (!stored) {
        return new Response(
          JSON.stringify({ error: "No OTP found. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(formattedPhone);
        return new Response(
          JSON.stringify({ error: "OTP expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (stored.code !== code) {
        return new Response(
          JSON.stringify({ error: "Invalid OTP. Please try again." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // OTP verified - delete it
      otpStore.delete(formattedPhone);

      return new Response(
        JSON.stringify({ success: true, message: "Phone verified successfully!" }),
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