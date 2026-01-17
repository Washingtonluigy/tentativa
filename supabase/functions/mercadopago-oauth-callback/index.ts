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
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: "Missing code or state parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const professionalId = state;
    const appId = Deno.env.get("MERCADO_PAGO_APP_ID");
    const clientSecret = Deno.env.get("MERCADO_PAGO_CLIENT_SECRET");
    const redirectUri = Deno.env.get("MERCADO_PAGO_REDIRECT_URI");

    if (!appId || !clientSecret || !redirectUri) {
      throw new Error("Missing Mercado Pago configuration");
    }

    const tokenUrl = "https://api.mercadopago.com/oauth/token";
    const tokenBody = {
      client_id: appId,
      client_secret: clientSecret,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    };

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(tokenBody),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Mercado Pago token error:", errorData);
      throw new Error(`Failed to exchange code for token: ${errorData}`);
    }

    const tokenData = await tokenResponse.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const { error: upsertError } = await supabase
      .from("mercadopago_oauth_tokens")
      .upsert({
        professional_id: professionalId,
        user_id: tokenData.user_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || "Bearer",
        expires_in: tokenData.expires_in,
        expires_at: expiresAt.toISOString(),
        scope: tokenData.scope,
        public_key: tokenData.public_key,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "professional_id",
      });

    if (upsertError) {
      console.error("Database error:", upsertError);
      throw new Error("Failed to save tokens");
    }

    await supabase
      .from("professionals")
      .update({ mercadopago_connected: true })
      .eq("id", professionalId);

    const redirectUrl = `${Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'supabase.co')}?mp_connected=success`;

    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Conectado com sucesso!</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
          }
          .success-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 50px;
            color: white;
          }
          h1 {
            color: #1f2937;
            margin: 0 0 10px;
          }
          p {
            color: #6b7280;
            margin: 0 0 30px;
          }
          .button {
            background: #10b981;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>Conectado com sucesso!</h1>
          <p>Sua conta Mercado Pago foi conectada. Agora você pode receber pagamentos.</p>
          <p style="font-size: 14px; margin-bottom: 20px;">Esta janela pode ser fechada.</p>
        </div>
        <script>
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>
      `,
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    console.error("Error in mercadopago-oauth-callback:", error);
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Erro na conexão</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
          }
          .error-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 50px;
            color: white;
          }
          h1 {
            color: #1f2937;
            margin: 0 0 10px;
          }
          p {
            color: #6b7280;
            margin: 0 0 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">✕</div>
          <h1>Erro na conexão</h1>
          <p>Não foi possível conectar sua conta. Tente novamente.</p>
          <p style="font-size: 14px;">${error.message}</p>
        </div>
      </body>
      </html>
      `,
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      }
    );
  }
});
