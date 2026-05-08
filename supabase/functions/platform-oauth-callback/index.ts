import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const YOUTUBE_CLIENT_ID = Deno.env.get('YOUTUBE_CLIENT_ID')!;
const YOUTUBE_SECRET    = Deno.env.get('YOUTUBE_CLIENT_SECRET')!;
const TWITCH_CLIENT_ID  = Deno.env.get('TWITCH_CLIENT_ID')!;
const TWITCH_SECRET     = Deno.env.get('TWITCH_CLIENT_SECRET')!;
const FB_APP_ID         = Deno.env.get('FACEBOOK_APP_ID')!;
const FB_APP_SECRET     = Deno.env.get('FACEBOOK_APP_SECRET')!;
const RESTREAM_CLIENT_ID= Deno.env.get('RESTREAM_CLIENT_ID')!;
const RESTREAM_SECRET   = Deno.env.get('RESTREAM_CLIENT_SECRET')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

interface ExchangeResult {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  stream_key?: string;
  username?: string;
  platform_uid?: string;
  restream_channels?: { platform: string; username: string; active: boolean }[];
}

// ─── YouTube ──────────────────────────────────────────────────────────────────

async function exchangeYouTube(code: string, redirectUri: string): Promise<ExchangeResult> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_SECRET,
    }),
  });
  if (!tokenRes.ok) throw new Error(`YouTube token exchange failed: ${await tokenRes.text()}`);
  const { access_token, refresh_token, expires_in } = await tokenRes.json();

  // Fetch channel info for username
  let username: string | undefined;
  let platform_uid: string | undefined;
  const chanRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&maxResults=1',
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  if (chanRes.ok) {
    const chanData = await chanRes.json();
    username = chanData.items?.[0]?.snippet?.title;
    platform_uid = chanData.items?.[0]?.id;
  }

  // Fetch stream key
  let stream_key: string | undefined;
  const keyRes = await fetch(
    'https://www.googleapis.com/youtube/v3/liveStreams?part=cdn&mine=true&maxResults=1',
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  if (keyRes.ok) {
    const keyData = await keyRes.json();
    stream_key = keyData.items?.[0]?.cdn?.ingestionInfo?.streamName;
  }

  const expires_at = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : undefined;

  return { access_token, refresh_token, expires_at, stream_key, username, platform_uid };
}

// ─── Twitch ───────────────────────────────────────────────────────────────────

async function exchangeTwitch(code: string, redirectUri: string): Promise<ExchangeResult> {
  const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_SECRET,
    }),
  });
  if (!tokenRes.ok) throw new Error(`Twitch token exchange failed: ${await tokenRes.text()}`);
  const { access_token, refresh_token, expires_in } = await tokenRes.json();

  const userRes = await fetch('https://api.twitch.tv/helix/users', {
    headers: { Authorization: `Bearer ${access_token}`, 'Client-Id': TWITCH_CLIENT_ID },
  });
  if (!userRes.ok) throw new Error('Could not fetch Twitch user');
  const userData = await userRes.json();
  const platform_uid = userData.data?.[0]?.id;
  const username = userData.data?.[0]?.login;

  let stream_key: string | undefined;
  if (platform_uid) {
    const keyRes = await fetch(
      `https://api.twitch.tv/helix/streams/key?broadcaster_id=${platform_uid}`,
      { headers: { Authorization: `Bearer ${access_token}`, 'Client-Id': TWITCH_CLIENT_ID } }
    );
    if (keyRes.ok) {
      const keyData = await keyRes.json();
      stream_key = keyData.data?.[0]?.stream_key;
    }
  }

  const expires_at = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : undefined;

  return { access_token, refresh_token, expires_at, stream_key, username, platform_uid };
}

// ─── Facebook ─────────────────────────────────────────────────────────────────

async function exchangeFacebook(code: string, redirectUri: string): Promise<ExchangeResult> {
  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', FB_APP_ID);
  tokenUrl.searchParams.set('client_secret', FB_APP_SECRET);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);

  const tokenRes = await fetch(tokenUrl.toString());
  if (!tokenRes.ok) throw new Error(`Facebook token exchange failed: ${await tokenRes.text()}`);
  const { access_token, expires_in } = await tokenRes.json();

  const meRes = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${access_token}`
  );
  const meData = meRes.ok ? await meRes.json() : {};

  const expires_at = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : undefined;

  // Facebook stream key is created per-broadcast; store user ID for later use
  return {
    access_token,
    expires_at,
    username: meData.name,
    platform_uid: meData.id,
    stream_key: undefined, // fetched at stream start via Facebook Live Video API
  };
}

// ─── Restream ─────────────────────────────────────────────────────────────────

const RESTREAM_CHANNEL_TYPE_MAP: Record<number, string> = {
  1: 'twitch', 2: 'youtube', 3: 'facebook', 6: 'instagram', 7: 'tiktok',
};

async function exchangeRestream(code: string, redirectUri: string): Promise<ExchangeResult> {
  const tokenRes = await fetch('https://api.restream.io/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: RESTREAM_CLIENT_ID,
      client_secret: RESTREAM_SECRET,
    }),
  });
  if (!tokenRes.ok) throw new Error(`Restream token exchange failed: ${await tokenRes.text()}`);
  const { access_token, refresh_token, expires_in } = await tokenRes.json();

  // Fetch channels to sync TikTok / Instagram
  const chRes = await fetch('https://api.restream.io/v2/user/channel-list', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const channels = chRes.ok ? (await chRes.json() as any[]) : [];
  const restream_channels = channels
    .filter((ch) => RESTREAM_CHANNEL_TYPE_MAP[ch.channelTypeId])
    .map((ch) => ({
      platform: RESTREAM_CHANNEL_TYPE_MAP[ch.channelTypeId],
      username: ch.displayName ?? '',
      active: ch.active ?? false,
    }));

  const expires_at = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : undefined;

  return { access_token, refresh_token, expires_at, restream_channels };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: { user }, error: authErr } = await db.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !user) return new Response('Unauthorized', { status: 401 });

    const { platform, code, redirect_uri, state } = await req.json();

    // Validate CSRF state
    const { data: stateRow } = await db
      .from('oauth_states')
      .select('user_id')
      .eq('state', state)
      .eq('user_id', user.id)
      .eq('platform', platform)
      .maybeSingle();

    if (!stateRow) {
      return new Response(JSON.stringify({ error: 'Invalid or expired state' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // Consume the state (one-time use)
    await db.from('oauth_states').delete().eq('state', state);

    // Exchange tokens per platform
    let result: ExchangeResult;
    if (platform === 'youtube')   result = await exchangeYouTube(code, redirect_uri);
    else if (platform === 'twitch')   result = await exchangeTwitch(code, redirect_uri);
    else if (platform === 'facebook') result = await exchangeFacebook(code, redirect_uri);
    else if (platform === 'restream') result = await exchangeRestream(code, redirect_uri);
    else throw new Error(`Unknown platform: ${platform}`);

    const now = new Date().toISOString();

    // Upsert main connection
    await db.from('platform_connections').upsert({
      user_id:         user.id,
      platform,
      platform_uid:    result.platform_uid ?? null,
      username:        result.username ?? null,
      access_token:    result.access_token,
      refresh_token:   result.refresh_token ?? null,
      stream_key:      result.stream_key ?? null,
      expires_at:      result.expires_at ?? null,
      status:          'active',
      via_restream:    false,
      last_verified_at: now,
      updated_at:      now,
    }, { onConflict: 'user_id,platform' });

    // For Restream: sync TikTok / Instagram as child connections
    if (result.restream_channels && result.restream_channels.length > 0) {
      for (const ch of result.restream_channels) {
        await db.from('platform_connections').upsert({
          user_id:      user.id,
          platform:     ch.platform,
          username:     ch.username || null,
          status:       ch.active ? 'active' : 'revoked',
          via_restream: true,
          updated_at:   now,
          connected_at: now,
        }, { onConflict: 'user_id,platform' });
      }
    }

    return new Response(
      JSON.stringify({
        platform,
        username: result.username,
        stream_key: result.stream_key,
        restream_channels: result.restream_channels,
      }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
});
