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
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    if (body.type !== "payment") {
      return new Response(
        JSON.stringify({ message: "Not a payment notification" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "No payment ID in notification" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingTransaction } = await supabase
      .from("mercadopago_transactions")
      .select("*, professional_id")
      .eq("payment_id", paymentId)
      .maybeSingle();

    let transaction = existingTransaction;
    let professionalId = existingTransaction?.professional_id;

    if (!transaction) {
      const tempPaymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (tempPaymentResponse.ok) {
        const tempPayment = await tempPaymentResponse.json();
        const externalReference = tempPayment.external_reference;

        if (externalReference) {
          const serviceRequestId = externalReference.replace("service-", "");
          const { data: txn } = await supabase
            .from("mercadopago_transactions")
            .select("*, professional_id")
            .eq("service_request_id", serviceRequestId)
            .maybeSingle();

          transaction = txn;
          professionalId = txn?.professional_id;
        }
      }
    }

    if (!transaction || !professionalId) {
      console.log("Transaction not found for payment:", paymentId);
      return new Response(JSON.stringify({ message: "Transaction not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tokenData } = await supabase
      .from("mercadopago_oauth_tokens")
      .select("*")
      .eq("professional_id", professionalId)
      .eq("is_active", true)
      .maybeSingle();

    if (!tokenData) {
      console.log("No OAuth token found for professional:", professionalId);
      return new Response(JSON.stringify({ message: "No OAuth token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!paymentResponse.ok) {
      throw new Error("Failed to fetch payment details");
    }

    const payment = await paymentResponse.json();
    console.log("Payment details:", JSON.stringify(payment));

    const externalReference = payment.external_reference;
    if (!externalReference) {
      console.log("No external reference in payment");
      return new Response(JSON.stringify({ message: "OK" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRequestId = externalReference.replace("service-", "");

    if (transaction) {
      await supabase
        .from("mercadopago_transactions")
        .update({
          payment_id: paymentId,
          status: payment.status,
          payment_type: payment.payment_type_id,
          payment_method: payment.payment_method_id,
          transaction_amount: payment.transaction_amount,
          updated_at: new Date().toISOString(),
        })
        .eq("service_request_id", serviceRequestId);
    }

    if (payment.status === "approved") {
      await supabase
        .from("service_requests")
        .update({
          payment_status: "paid",
          payment_completed: true,
        })
        .eq("id", serviceRequestId);

      console.log(`Payment approved for service request: ${serviceRequestId}`);
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      await supabase
        .from("service_requests")
        .update({
          payment_status: "pending",
          payment_completed: false,
        })
        .eq("id", serviceRequestId);

      console.log(`Payment ${payment.status} for service request: ${serviceRequestId}`);
    }

    return new Response(
      JSON.stringify({ message: "Webhook processed successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in mercadopago-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
