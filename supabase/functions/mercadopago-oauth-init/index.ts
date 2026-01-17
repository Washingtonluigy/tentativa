import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const appId = Deno.env.get("MERCADO_PAGO_APP_ID");
    const redirectUri = Deno.env.get("MERCADO_PAGO_REDIRECT_URI");

    if (!appId || !redirectUri) {
      throw new Error("Missing Mercado Pago configuration");
    }

    // Get professional_id from request
    const url = new URL(req.url);
    const professionalId = url.searchParams.get("professional_id");

    if (!professionalId) {
      return new Response(
        JSON.stringify({ error: "professional_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build OAuth authorization URL
    const authUrl = new URL("https://auth.mercadopago.com/authorization");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("platform_id", "mp");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", professionalId);

    return new Response(
      JSON.stringify({
        authorizationUrl: authUrl.toString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in mercadopago-oauth-init:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
