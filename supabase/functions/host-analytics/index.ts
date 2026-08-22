import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const token = authHeader.replace("Bearer ", "");

    // Verify the caller's identity via the auth API
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, Apikey: anonKey },
    });
    const userData = await userRes.json();

    if (!userData || userData.error || !userData.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if the caller has permission to view analytics.
    // Query team_members with the service role key (bypasses RLS).
    const membershipRes = await fetch(
      `${supabaseUrl}/rest/v1/team_members?select=role&user_id=eq.${userData.id}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseServiceKey,
          "Content-Type": "application/json",
        },
      }
    );
    const membershipData = await membershipRes.json();
    const role = membershipData?.[0]?.role;

    // Admin and marketing roles have analytics.view permission.
    // Also allow the legacy host email as a fallback.
    const isHostEmail =
      userData.email?.toLowerCase() === "miadayshaar2@gmail.com" ||
      userData.email?.toLowerCase() === "audiaadya@gmail.com";

    if (role !== "admin" && role !== "marketing" && !isHostEmail) {
      return new Response(JSON.stringify({ error: "Forbidden - host only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all auth users via the admin API
    const usersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        Apikey: supabaseServiceKey,
      },
    });

    const usersData = await usersRes.json();
    const users = (usersData.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at,
      user_metadata: u.user_metadata,
    }));

    const verified = users.filter((u: any) => u.email_confirmed_at).length;
    const unverified = users.length - verified;

    return new Response(
      JSON.stringify({
        users,
        totalAuthUsers: users.length,
        verifiedUsers: verified,
        unverifiedUsers: unverified,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
