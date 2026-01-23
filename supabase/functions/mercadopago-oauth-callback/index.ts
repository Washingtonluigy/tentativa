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

    const appUrl = req.headers.get("origin") || req.headers.get("referer")?.split("/functions/")[0] || Deno.env.get("APP_URL") || "https://testesplit.netlify.app";

    return new Response(
      `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="1;url=${appUrl}">
  <title>Conta Conectada!</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .container {
      background: white;
      padding: 50px 30px;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 450px;
      width: 100%;
      animation: slideUp 0.4s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .success-icon {
      width: 100px;
      height: 100px;
      margin: 0 auto 25px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 60px;
      color: white;
      box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
      animation: checkmark 0.6s ease-in-out;
    }
    @keyframes checkmark {
      0% { transform: scale(0); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    h1 {
      color: #1f2937;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 15px;
    }
    p {
      color: #6b7280;
      font-size: 17px;
      line-height: 1.6;
      margin: 0 0 35px;
    }
    .loading {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
    }
    .dot {
      width: 12px;
      height: 12px;
      background: #667eea;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
    }
    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .redirect-text {
      font-size: 14px;
      color: #9ca3af;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✓</div>
    <h1>Conta Conectada!</h1>
    <p>Sua conta do Mercado Pago foi conectada com sucesso. Agora você pode receber pagamentos através da plataforma.</p>
    <div class="loading">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
    <p class="redirect-text">Redirecionando automaticamente...</p>
  </div>
  <script>
    // Múltiplos métodos de redirecionamento para garantir compatibilidade
    function redirectToApp() {
      const appUrl = "${appUrl}";

      // Tentar fechar a janela se foi aberta como popup
      if (window.opener) {
        window.opener.postMessage({ type: 'MERCADOPAGO_CONNECTED' }, '*');
        window.close();
      }

      // Redirecionar após um breve delay
      setTimeout(() => {
        window.location.replace(appUrl);
      }, 1000);
    }

    // Executar ao carregar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', redirectToApp);
    } else {
      redirectToApp();
    }
  </script>
</body>
</html>`,
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
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
