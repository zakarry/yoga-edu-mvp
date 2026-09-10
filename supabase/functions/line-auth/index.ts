import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LINE_AUTH_BASE = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/oauth2/v2.1/userinfo";
const STATE_TTL_MINUTES = 10;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redirectResponse(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: url },
  });
}

function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const arr: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    arr.push(bytes[i].toString(16).padStart(2, "0"));
  }
  return arr.join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  // In Supabase Edge Functions, the pathname includes /functions/v1/<slug>/...
  // Strip everything up to and including the function slug.
  const path = url.pathname.replace(/^.*\/line-auth\/?/, "");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const channelId = (Deno.env.get("LINE_CHANNEL_ID") || "").trim();
  const channelSecret = (Deno.env.get("LINE_CHANNEL_SECRET") || "").trim();

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !channelId || !channelSecret) {
    console.error("line-auth: missing required env vars", {
      hasChannelId: channelId.length > 0,
      channelIdType: typeof channelId,
      channelIdLength: channelId.length,
      hasChannelSecret: channelSecret.length > 0,
    });
    return jsonResponse({ error: "configuration_error" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // ── START ──────────────────────────────────────────────
    if (path === "start" || path === "" || path === "/") {
      const redirectTo = url.searchParams.get("redirect_to") || url.origin;
      const state = generateState();

      const { error: insertError } = await adminClient
        .from("line_auth_states")
        .insert({ state, redirect_to: redirectTo, consumed: false });

      if (insertError) {
        console.error("line-auth: failed to insert state");
        return jsonResponse({ error: "server_error" }, 500);
      }

      const callbackUrl = `${supabaseUrl}/functions/v1/line-auth/callback`;
      const params = new URLSearchParams({
        response_type: "code",
        client_id: channelId,
        redirect_uri: callbackUrl,
        state,
        scope: "openid profile",
      });
      const authUrl = `${LINE_AUTH_BASE}?${params.toString()}`;

      return redirectResponse(authUrl);
    }

    // ── CALLBACK ──────────────────────────────────────────
    if (path === "callback" || path === "callback/") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const lineError = url.searchParams.get("error");

      if (lineError) {
        return redirectToAppWithError(url.origin, "line_auth_failed");
      }

      if (!code || !state) {
        return redirectToAppWithError(url.origin, "line_auth_failed");
      }

      // Verify state
      const { data: stateRow, error: stateError } = await adminClient
        .from("line_auth_states")
        .select("id, redirect_to, consumed, created_at")
        .eq("state", state)
        .maybeSingle();

      if (stateError || !stateRow) {
        return redirectToAppWithError(url.origin, "line_auth_failed");
      }

      if (stateRow.consumed) {
        return redirectToAppWithError(url.origin, "line_auth_failed");
      }

      const ageMs = Date.now() - new Date(stateRow.created_at).getTime();
      if (ageMs > STATE_TTL_MINUTES * 60 * 1000) {
        return redirectToAppWithError(url.origin, "line_auth_failed");
      }

      // Consume state (one-time use)
      await adminClient
        .from("line_auth_states")
        .update({ consumed: true })
        .eq("id", stateRow.id);

      // Exchange code with LINE token endpoint
      const callbackUrl = `${supabaseUrl}/functions/v1/line-auth/callback`;
      const tokenRes = await fetch(LINE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: callbackUrl,
          client_id: channelId,
          client_secret: channelSecret,
        }),
      });

      if (!tokenRes.ok) {
        console.error("line-auth: LINE token exchange failed", tokenRes.status);
        return redirectToAppWithError(stateRow.redirect_to, "line_auth_failed");
      }

      const tokenBody = await tokenRes.json();
      const accessToken: string | undefined = tokenBody.access_token;

      if (!accessToken) {
        return redirectToAppWithError(stateRow.redirect_to, "line_auth_failed");
      }

      // Get LINE user profile
      const profileRes = await fetch(LINE_PROFILE_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!profileRes.ok) {
        console.error("line-auth: LINE profile fetch failed", profileRes.status);
        return redirectToAppWithError(stateRow.redirect_to, "line_auth_failed");
      }

      const lineProfile = await profileRes.json();
      const lineSub: string | undefined = lineProfile.sub;

      if (!lineSub) {
        return redirectToAppWithError(stateRow.redirect_to, "line_auth_failed");
      }

      // Check if this LINE user already has a Supabase account
      const { data: existingIdentity } = await adminClient
        .from("line_identities")
        .select("user_id")
        .eq("line_sub", lineSub)
        .maybeSingle();

      let userId: string;

      if (existingIdentity?.user_id) {
        userId = existingIdentity.user_id;
      } else {
        // Create a new Supabase user. We use admin.createUser so the service
        // role key never reaches the browser. The email is a non-deliverable
        // placeholder — LINE users don't need email.
        const fakeEmail = `line-${lineSub}@lineauth.local`;
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: fakeEmail,
          email_confirm: true,
          user_metadata: {
            provider: "line",
            line_sub: lineSub,
            display_name: lineProfile.name || null,
          },
        });

        if (createError || !newUser?.user) {
          console.error("line-auth: user creation failed");
          return redirectToAppWithError(stateRow.redirect_to, "line_auth_failed");
        }

        userId = newUser.user.id;

        await adminClient.from("line_identities").insert({
          line_sub: lineSub,
          user_id: userId,
          display_name: lineProfile.name || null,
        });
      }

      // Generate a magic link for this user, then verify the OTP server-side
      // using the anon-key client to obtain a proper user session (not an admin
      // session). The resulting tokens are passed to the browser via URL hash
      // in the implicit-flow format that supabase-js detectSessionInUrl parses.
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: `line-${lineSub}@lineauth.local`,
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        console.error("line-auth: magic link generation failed");
        return redirectToAppWithError(stateRow.redirect_to, "line_auth_failed");
      }

      // Verify the OTP using the anon client to get a real user session
      const anonClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      });

      if (verifyError || !verifyData?.session) {
        console.error("line-auth: OTP verification failed");
        return redirectToAppWithError(stateRow.redirect_to, "line_auth_failed");
      }

      const session = verifyData.session;

      // Redirect to the app with session tokens in the URL hash.
      // The supabase-js client with detectSessionInUrl (default true) will
      // parse these and establish the session in the browser.
      const finalRedirect = new URL(stateRow.redirect_to);
      finalRedirect.hash =
        `access_token=${encodeURIComponent(session.access_token)}` +
        `&refresh_token=${encodeURIComponent(session.refresh_token)}` +
        `&expires_in=${session.expires_in}` +
        `&token_type=${encodeURIComponent(session.token_type)}` +
        `&type=magiclink`;

      return redirectResponse(finalRedirect.toString());
    }

    // Unknown path
    return jsonResponse({ error: "not_found" }, 404);
  } catch (err) {
    console.error("line-auth: unhandled error", err);
    return jsonResponse({ error: "server_error" }, 500);
  }
});

function redirectToAppWithError(redirectBase: string, errorCode: string): Response {
  const url = new URL(redirectBase);
  url.searchParams.set("line_auth_error", errorCode);
  return redirectResponse(url.toString());
}
