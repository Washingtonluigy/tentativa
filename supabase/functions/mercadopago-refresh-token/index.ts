import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { professionalId } = await req.json();

    if (!professionalId) {
      return new Response(
        JSON.stringify({ error: "professionalId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tokenData, error: tokenError } = await supabase
      .from("mercadopago_oauth_tokens")
      .select("*")
      .eq("professional_id", professionalId)
      .eq("is_active", true)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: "No token found for this professional" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const appId = Deno.env.get("MERCADO_PAGO_APP_ID");
    const clientSecret = Deno.env.get("MERCADO_PAGO_CLIENT_SECRET");

    if (!appId || !clientSecret) {
      throw new Error("Missing Mercado Pago configuration");
    }

    const refreshUrl = "https://api.mercadopago.com/oauth/token";
    const refreshBody = {
      client_id: appId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokenData.refresh_token,
    };

    const refreshResponse = await fetch(refreshUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(refreshBody),
    });

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.text();
      console.error("Mercado Pago refresh error:", errorData);

      await supabase
        .from("mercadopago_oauth_tokens")
        .update({ is_active: false })
        .eq("professional_id", professionalId);

      await supabase
        .from("professionals")
        .update({ mercadopago_connected: false })
        .eq("id", professionalId);

      throw new Error(`Failed to refresh token: ${errorData}`);
    }

    const newTokenData = await refreshResponse.json();
    const expiresAt = new Date(Date.now() + newTokenData.expires_in * 1000);

    const { error: updateError } = await supabase
      .from("mercadopago_oauth_tokens")
      .update({
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token || tokenData.refresh_token,
        expires_in: newTokenData.expires_in,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("professional_id", professionalId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error("Failed to update token");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Token refreshed successfully",
        expiresAt: expiresAt.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in mercadopago-refresh-token:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
