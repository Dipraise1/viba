import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const YOUTUBE_CLIENT_ID = Deno.env.get('YOUTUBE_CLIENT_ID')!;
const YOUTUBE_CLIENT_SECRET = Deno.env.get('YOUTUBE_CLIENT_SECRET')!;
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
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: YOUTUBE_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) throw new Error(`YouTube token exchange failed: ${await tokenRes.text()}`);
    const { access_token, refresh_token, expires_in } = await tokenRes.json();

    // Fetch the user's default live stream key from YouTube
    const streamsRes = await fetch(
      'https://www.googleapis.com/youtube/v3/liveStreams?part=cdn&mine=true&maxResults=1',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    let streamKey = '';
    if (streamsRes.ok) {
      const data = await streamsRes.json();
      streamKey = data.items?.[0]?.cdn?.ingestionInfo?.streamName ?? '';
    }

    const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();

    // Store tokens
    await supabase.from('platform_tokens').upsert({
      user_id: user.id,
      platform: 'youtube',
      access_token,
      refresh_token: refresh_token ?? null,
      expires_at: expiresAt,
    });

    // Store stream key in profiles.stream_keys
    if (streamKey) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stream_keys')
        .eq('id', user.id)
        .single();
      const keys = (profile?.stream_keys as Record<string, string>) ?? {};
      keys['youtube'] = streamKey;
      await supabase.from('profiles').update({ stream_keys: keys }).eq('id', user.id);
    }

    return new Response(
      JSON.stringify({ access_token, stream_key: streamKey }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
});
