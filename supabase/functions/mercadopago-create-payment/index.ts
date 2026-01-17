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
    const { serviceRequestId, amount, commissionPercentage = 10 } = await req.json();

    if (!serviceRequestId || !amount) {
      return new Response(
        JSON.stringify({ error: "serviceRequestId and amount are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: serviceRequest, error: requestError } = await supabase
      .from("service_requests")
      .select("*, professional_id, client_id")
      .eq("id", serviceRequestId)
      .single();

    if (requestError || !serviceRequest) {
      throw new Error("Service request not found");
    }

    const { data: professional, error: profError } = await supabase
      .from("professionals")
      .select("id, user_id")
      .eq("user_id", serviceRequest.professional_id)
      .single();

    if (profError || !professional) {
      throw new Error("Professional not found");
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from("mercadopago_oauth_tokens")
      .select("*")
      .eq("professional_id", professional.id)
      .eq("is_active", true)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({
          error: "Professional has not connected Mercado Pago account",
          needsConnection: true
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          error: "Token expired, needs refresh",
          needsRefresh: true
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", serviceRequest.client_id)
      .single();

    const { data: professionalProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", serviceRequest.professional_id)
      .single();

    const applicationFee = Math.round(amount * (commissionPercentage / 100) * 100) / 100;
    const externalReference = `service-${serviceRequestId}`;
    const sponsorId = Deno.env.get("MERCADO_PAGO_APP_ID");

    const preferenceData = {
      items: [
        {
          title: `Atendimento - ${professionalProfile?.full_name || 'Profissional'}`,
          quantity: 1,
          unit_price: amount,
          currency_id: "BRL",
        },
      ],
      payer: {
        name: clientProfile?.full_name || "Cliente",
        email: clientProfile?.email || `cliente-${serviceRequest.client_id}@example.com`,
      },
      back_urls: {
        success: `${supabaseUrl}?payment=success`,
        failure: `${supabaseUrl}?payment=failure`,
        pending: `${supabaseUrl}?payment=pending`,
      },
      auto_return: "approved",
      external_reference: externalReference,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      marketplace_fee: applicationFee,
      marketplace: sponsorId,
    };

    const preferenceResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify(preferenceData),
      }
    );

    if (!preferenceResponse.ok) {
      const errorData = await preferenceResponse.text();
      console.error("Mercado Pago preference error:", errorData);
      throw new Error(`Failed to create payment preference: ${errorData}`);
    }

    const preferenceResult = await preferenceResponse.json();

    await supabase
      .from("mercadopago_transactions")
      .insert({
        service_request_id: serviceRequestId,
        professional_id: professional.id,
        client_id: serviceRequest.client_id,
        preference_id: preferenceResult.id,
        status: "pending",
        transaction_amount: amount,
        application_fee: applicationFee,
        net_amount: amount - applicationFee,
        external_reference: externalReference,
        mercadopago_user_id: tokenData.user_id,
      });

    await supabase
      .from("service_requests")
      .update({
        payment_link: preferenceResult.init_point,
        payment_status: "pending"
      })
      .eq("id", serviceRequestId);

    return new Response(
      JSON.stringify({
        success: true,
        preferenceId: preferenceResult.id,
        initPoint: preferenceResult.init_point,
        sandboxInitPoint: preferenceResult.sandbox_init_point,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in mercadopago-create-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
