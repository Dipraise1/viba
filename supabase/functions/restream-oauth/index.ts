import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESTREAM_CLIENT_ID = Deno.env.get('RESTREAM_CLIENT_ID')!;
const RESTREAM_CLIENT_SECRET = Deno.env.get('RESTREAM_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) return new Response('Unauthorized', { status: 401 });

    const { code, redirect_uri } = await req.json();

    // Exchange code for tokens
    const tokenRes = await fetch('https://api.restream.io/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id: RESTREAM_CLIENT_ID,
        client_secret: RESTREAM_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Restream token exchange failed: ${err}`);
    }

    const { access_token, refresh_token, expires_in } = await tokenRes.json();

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens in platform_tokens
    await supabase.from('platform_tokens').upsert({
      user_id: user.id,
      platform: 'restream',
      access_token,
      refresh_token: refresh_token ?? null,
      expires_at: expiresAt,
    });

    return new Response(
      JSON.stringify({ access_token }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
