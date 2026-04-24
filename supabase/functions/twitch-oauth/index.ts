import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TWITCH_CLIENT_ID = Deno.env.get('TWITCH_CLIENT_ID')!;
const TWITCH_CLIENT_SECRET = Deno.env.get('TWITCH_CLIENT_SECRET')!;
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

    // Exchange code for tokens
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) throw new Error(`Twitch token exchange failed: ${await tokenRes.text()}`);
    const { access_token, refresh_token, expires_in } = await tokenRes.json();

    // Get the user's Twitch user ID
    const userRes = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Client-Id': TWITCH_CLIENT_ID,
      },
    });
    if (!userRes.ok) throw new Error('Could not fetch Twitch user');
    const userData = await userRes.json();
    const twitchUserId = userData.data?.[0]?.id;
    const twitchLogin = userData.data?.[0]?.login ?? '';

    // Fetch the stream key
    let streamKey = '';
    if (twitchUserId) {
      const keyRes = await fetch(
        `https://api.twitch.tv/helix/streams/key?broadcaster_id=${twitchUserId}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Client-Id': TWITCH_CLIENT_ID,
          },
        }
      );
      if (keyRes.ok) {
        const keyData = await keyRes.json();
        streamKey = keyData.data?.[0]?.stream_key ?? '';
      }
    }

    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null;

    // Store tokens
    await supabase.from('platform_tokens').upsert({
      user_id: user.id,
      platform: 'twitch',
      access_token,
      refresh_token: refresh_token ?? null,
      expires_at: expiresAt,
    });

    // Store stream key and username
    if (streamKey) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stream_keys')
        .eq('id', user.id)
        .single();
      const keys = (profile?.stream_keys as Record<string, string>) ?? {};
      keys['twitch'] = streamKey;
      await supabase.from('profiles').update({ stream_keys: keys }).eq('id', user.id);
    }

    return new Response(
      JSON.stringify({ access_token, stream_key: streamKey, username: twitchLogin }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
});
