import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const YOUTUBE_CLIENT_ID = Deno.env.get('YOUTUBE_CLIENT_ID')!;
const YOUTUBE_SECRET    = Deno.env.get('YOUTUBE_CLIENT_SECRET')!;
const TWITCH_CLIENT_ID  = Deno.env.get('TWITCH_CLIENT_ID')!;
const TWITCH_SECRET     = Deno.env.get('TWITCH_CLIENT_SECRET')!;
const RESTREAM_CLIENT_ID = Deno.env.get('RESTREAM_CLIENT_ID')!;
const RESTREAM_SECRET    = Deno.env.get('RESTREAM_CLIENT_SECRET')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

interface Connection {
  id: string;
  user_id: string;
  platform: string;
  refresh_token: string;
}

async function refreshYouTube(conn: Connection, db: ReturnType<typeof createClient>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`YouTube refresh failed: ${await res.text()}`);
  const { access_token, expires_in } = await res.json();
  const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();
  await db.from('platform_connections').update({
    access_token,
    expires_at,
    status: 'active',
    last_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', conn.id);
}

async function refreshTwitch(conn: Connection, db: ReturnType<typeof createClient>) {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Twitch refresh failed: ${await res.text()}`);
  const { access_token, refresh_token, expires_in } = await res.json();
  const expires_at = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : undefined;
  await db.from('platform_connections').update({
    access_token,
    refresh_token,
    ...(expires_at && { expires_at }),
    status: 'active',
    last_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', conn.id);
}

async function refreshRestream(conn: Connection, db: ReturnType<typeof createClient>) {
  const res = await fetch('https://api.restream.io/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
      client_id: RESTREAM_CLIENT_ID,
      client_secret: RESTREAM_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Restream refresh failed: ${await res.text()}`);
  const { access_token, refresh_token, expires_in } = await res.json();
  const expires_at = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : undefined;
  await db.from('platform_connections').update({
    access_token,
    refresh_token,
    ...(expires_at && { expires_at }),
    status: 'active',
    last_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', conn.id);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
// Called by pg_cron every hour:
// select cron.schedule('refresh-platform-tokens', '0 * * * *',
//   $$select net.http_post(
//     url := current_setting('app.supabase_url') || '/functions/v1/refresh-platform-tokens',
//     headers := '{"Authorization":"Bearer ' || current_setting('app.service_key') || '"}'
//   )$$);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  // Find tokens expiring within the next 2 hours that have a refresh token
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const { data: expiring } = await db
    .from('platform_connections')
    .select('id, user_id, platform, refresh_token')
    .lt('expires_at', twoHoursFromNow)
    .not('refresh_token', 'is', null)
    .in('platform', ['youtube', 'twitch', 'restream'])
    .in('status', ['active', 'expired']);

  if (!expiring || expiring.length === 0) {
    return new Response(JSON.stringify({ refreshed: 0 }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const results = await Promise.allSettled(
    expiring.map(async (conn) => {
      try {
        if (conn.platform === 'youtube')    await refreshYouTube(conn as Connection, db);
        else if (conn.platform === 'twitch')    await refreshTwitch(conn as Connection, db);
        else if (conn.platform === 'restream')  await refreshRestream(conn as Connection, db);
        return { id: conn.id, platform: conn.platform, success: true };
      } catch (err: any) {
        // Mark as expired and notify user via a DB flag
        await db.from('platform_connections').update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        }).eq('id', conn.id);
        return { id: conn.id, platform: conn.platform, success: false, error: err.message };
      }
    })
  );

  const summary = results.map((r) => r.status === 'fulfilled' ? r.value : { error: String(r.reason) });

  return new Response(JSON.stringify({ refreshed: expiring.length, results: summary }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
});
