import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is an admin
    const callerId = userData.user.id;
    const { data: callerRow } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();
    const caller = callerRow as { role: string } | null;
    if (!caller || caller.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, role, assigned_set } = await req.json();
    if (!query || !role) {
      return new Response(JSON.stringify({ error: "query and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const q = String(query).trim();
    const lower = q.toLowerCase();

    // Look up the user by email or display_name (fuzzy fallback)
    let profile: { user_id: string; email: string | null; display_name: string | null } | null = null;

    const { data: byEmail } = await supabase
      .from("profiles")
      .select("user_id, email, display_name")
      .ilike("email", lower)
      .maybeSingle();
    if (byEmail) profile = byEmail as typeof profile;

    if (!profile) {
      const { data: byName } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .ilike("display_name", q)
        .maybeSingle();
      if (byName) profile = byName as typeof profile;
    }

    if (!profile) {
      const { data: fuzzy } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .ilike("display_name", `%${q}%`)
        .limit(1)
        .maybeSingle();
      if (fuzzy) profile = fuzzy as typeof profile;
    }

    if (!profile) {
      return new Response(JSON.stringify({ error: `No user found matching "${q}"` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normEmail = profile.email ? profile.email.trim().toLowerCase() : null;

    // Upsert the team_members row with the service role key (bypasses RLS)
    const { data: existing } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    let dbError: string | null = null;
    if (existing) {
      const { error } = await supabase
        .from("team_members")
        .update({
          role,
          assigned_set: assigned_set ?? null,
          email: normEmail,
          full_name: profile.display_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", (existing as { id: string }).id);
      dbError = error ? error.message : null;
    } else {
      const { error } = await supabase
        .from("team_members")
        .insert({
          user_id: profile.user_id,
          email: normEmail,
          full_name: profile.display_name,
          role,
          assigned_set: assigned_set ?? null,
          invited_by: callerId,
        });
      dbError = error ? error.message : null;
    }

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: profile.user_id,
      email: profile.email,
      display_name: profile.display_name,
      role,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Internal server error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
