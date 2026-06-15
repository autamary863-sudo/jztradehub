// src/lib/auth.ts
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters").max(100),
  phoneNumber: z.string().optional(),
  referralCode: z.string().optional(),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(1, "Password is required"),
});

export const signUp = async (email: string, password: string, displayName: string, phoneNumber?: string) => {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        display_name: displayName,
        phone_number: phoneNumber || null,
      },
    },
  });

  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getUserRoles = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) return { roles: [], error };
  return { roles: data?.map((r) => r.role) || [], error: null };
};

export const hasRole = (roles: string[], role: string) => {
  return roles.includes(role);
};

// Function to apply referral code after signup
export const applyReferralCode = async (userId: string, code: string) => {
  try {
    // Find the referrer by their referral code
    const { data: referrer, error: referrerError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("referral_code", code.toUpperCase())
      .single();

    if (referrerError) {
      console.error("Referrer not found:", referrerError);
      return { success: false, error: "Invalid referral code" };
    }

    // Update the new user's profile with referred_by
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      return { success: false, error: updateError.message };
    }

    // Create referral record
    const { error: referralError } = await supabase
      .from("referrals")
      .insert({
        referrer_id: referrer.id,
        referee_id: userId,
        referral_code: code.toUpperCase(),
        status: "pending"
      });

    if (referralError) {
      console.error("Failed to create referral record:", referralError);
      return { success: false, error: referralError.message };
    }

    console.log("Referral record created successfully!");
    return { success: true, referrer };

  } catch (error) {
    console.error("Error applying referral code:", error);
    return { success: false, error: "Failed to apply referral code" };
  }
};

// Generate unique referral code for new user
export const generateReferralCode = (userId: string, displayName: string) => {
  const prefix = displayName?.slice(0, 4).toUpperCase().replace(/\s/g, '') || userId.slice(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

// Ensure user has a referral code
export const ensureReferralCode = async (userId: string, displayName: string) => {
  try {
    // Check if user already has a referral code
    const { data: existing } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", userId)
      .single();

    if (existing?.referral_code) {
      return existing.referral_code;
    }

    const newCode = generateReferralCode(userId, displayName);
    
    const { error } = await supabase
      .from("profiles")
      .update({ referral_code: newCode })
      .eq("id", userId);

    if (error) {
      console.error("Failed to set referral code:", error);
      return null;
    }

    return newCode;
  } catch (error) {
    console.error("Error generating referral code:", error);
    return null;
  }
};