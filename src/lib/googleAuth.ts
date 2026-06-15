import { supabase } from "@/integrations/supabase/client";

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

export const parseJwt = (token: string) => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    window.atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join('')
  );
  return JSON.parse(jsonPayload);
};

export const handleGoogleCredentialResponse = async (response: GoogleCredentialResponse) => {
  try {
    const idToken = response.credential;
    const decodedToken = parseJwt(idToken);

    console.log('Google Sign-In successful');
    console.log('User Email:', decodedToken.email);
    console.log('User Name:', decodedToken.name);

    // Use Supabase to sign in with Google ID token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      console.error('Google auth error:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Failed to handle Google credential:', error);
    return { data: null, error };
  }
};

export const initializeGoogleSignIn = (clientId: string, callback: (response: GoogleCredentialResponse) => void) => {
  if (typeof window !== 'undefined' && window.google) {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: callback,
      auto_select: true,
      context: 'signup',
      ux_mode: 'popup',
      itp_support: true,
    });
  }
};

declare global {
  interface Window {
    google: any;
  }
}
