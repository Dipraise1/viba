import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID')!;
const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

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
    // Verify caller is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) return new Response('Unauthorized', { status: 401 });

    const { title, platform_ids, session_id } = await req.json();

    // Create a Mux live stream
    const muxRes = await fetch('https://api.mux.com/video/v1/live-streams', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${muxAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playback_policy: ['public'],
        new_asset_settings: { playback_policy: ['public'] },
        latency_mode: 'low',
        reconnect_window: 60,
      }),
    });

    if (!muxRes.ok) {
      const err = await muxRes.text();
      throw new Error(`Mux error: ${err}`);
    }

    const { data: muxData } = await muxRes.json();
    const streamKey = muxData.stream_key;
    const muxStreamId = muxData.id;
    const playbackId = muxData.playback_ids?.[0]?.id ?? null;

    // Store mux IDs on the stream session
    if (session_id) {
      await supabase
        .from('stream_sessions')
        .update({ mux_stream_id: muxStreamId, playback_id: playbackId })
        .eq('id', session_id);
    }

    return new Response(
      JSON.stringify({
        rtmp_url: 'rtmps://global-live.mux.com:443/app',
        stream_key: streamKey,
        mux_stream_id: muxStreamId,
        playback_id: playbackId,
      }),
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
