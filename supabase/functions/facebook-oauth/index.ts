import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FB_APP_ID = Deno.env.get('FACEBOOK_APP_ID')!;
const FB_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (error || !user) return new Response('Unauthorized', { status: 401 });

    const { code, redirect_uri } = await req.json();

    // Exchange code for long-lived token
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', FB_APP_ID);
    tokenUrl.searchParams.set('client_secret', FB_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', redirect_uri);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    if (!tokenRes.ok) throw new Error(`Facebook token exchange failed: ${await tokenRes.text()}`);
    const { access_token, expires_in } = await tokenRes.json();

    // Get Facebook user info
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${access_token}`
    );
    const meData = meRes.ok ? await meRes.json() : {};
    const fbUserId = meData.id ?? '';
    const fbName = meData.name ?? '';

    // Facebook live streams use a persistent stream key from the live_encoder field
    // We don't have a stream key yet — it's created per broadcast via the API.
    // Store the access token; the stream key is fetched at go-live time.
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null;

    await supabase.from('platform_tokens').upsert({
      user_id: user.id,
      platform: 'facebook',
      access_token,
      refresh_token: null,
      expires_at: expiresAt,
    });

    // Save the Facebook user ID in stream_keys so we can create broadcasts later
    if (fbUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stream_keys')
        .eq('id', user.id)
        .single();
      const keys = (profile?.stream_keys as Record<string, string>) ?? {};
      // Store user ID under a special key — used when creating live broadcasts
      keys['facebook_user_id'] = fbUserId;
      await supabase.from('profiles').update({ stream_keys: keys }).eq('id', user.id);
    }

    return new Response(
      JSON.stringify({ access_token, username: fbName }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
});
