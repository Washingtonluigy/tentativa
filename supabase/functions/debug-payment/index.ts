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
    const { serviceRequestId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: serviceRequest, error: requestError } = await supabase
      .from("service_requests")
      .select("*, professional_id, client_id")
      .eq("id", serviceRequestId)
      .maybeSingle();

    console.log('Service Request:', JSON.stringify({ data: serviceRequest, error: requestError }));

    if (!serviceRequest) {
      return new Response(
        JSON.stringify({ error: "Service request not found", details: requestError }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: clientProfile, error: clientProfileError } = await supabase
      .from("profiles")
      .select("full_name, email, cpf")
      .eq("user_id", serviceRequest.client_id)
      .maybeSingle();

    console.log('Client Profile:', JSON.stringify({ data: clientProfile, error: clientProfileError }));

    const { data: clientUser, error: clientUserError } = await supabase
      .from("users")
      .select("email")
      .eq("id", serviceRequest.client_id)
      .maybeSingle();

    console.log('Client User:', JSON.stringify({ data: clientUser, error: clientUserError }));

    const clientEmail = clientProfile?.email || clientUser?.email;
    const clientCpfRaw = clientProfile?.cpf;
    const clientCpfClean = clientCpfRaw ? String(clientCpfRaw).replace(/\D/g, '') : '';
    const hasValidCpf = clientCpfClean.length === 11;

    return new Response(
      JSON.stringify({
        debug: true,
        serviceRequest: {
          id: serviceRequest.id,
          client_id: serviceRequest.client_id,
          professional_id: serviceRequest.professional_id,
        },
        clientProfile: clientProfile,
        clientProfileError: clientProfileError,
        clientUser: clientUser,
        clientUserError: clientUserError,
        validation: {
          clientEmail,
          clientCpfRaw,
          clientCpfClean,
          clientCpfCleanLength: clientCpfClean.length,
          hasValidCpf,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in debug-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
