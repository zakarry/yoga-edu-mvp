import { allowedLineRedirect } from '../supabase/functions/_shared/lineRedirect.ts';

const origin = 'https://teacher-staging.example';
function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Expected ${expected}, received ${actual}`);
}

Deno.test('LINE redirect: exact HTTPS origin, missing policy and deceptive URLs', () => {
  equal(allowedLineRedirect(origin, origin)?.origin, origin);
  equal(allowedLineRedirect(`${origin}/`, origin)?.origin, origin);
  for (const value of [null, '', 'https://evil.example', `${origin}.evil.example`,
    `https://teacher-staging.example@evil.example`, `${origin}/path`, `${origin}/?next=x`,
    `${origin}/#token`, 'http://teacher-staging.example', '//teacher-staging.example',
    'javascript:alert(1)', 'data:text/html,test', `${origin}\\@evil.example`, ` ${origin}`]) {
    equal(allowedLineRedirect(value, origin), null);
  }
  for (const policy of [undefined, '', '*', 'https://*.example', `${origin}/path`, `${origin},`,
    'http://teacher-staging.example', `${origin}/`, `${origin},https://bad.example/path`]) {
    equal(allowedLineRedirect(origin, policy), null);
  }
  equal(allowedLineRedirect('https://other.example', `${origin}, https://other.example`)?.origin, 'https://other.example');
});

// Import the real handler; every HTTP call is intercepted and unrecognized traffic fails.
Deno.test('LINE handler: rejects forbidden redirects before issuing any session; valid callback and replay', async () => {
  const env = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY',
    'LINE_CHANNEL_ID', 'LINE_CHANNEL_SECRET', 'LINE_AUTH_REDIRECT_ORIGINS'];
  const originals = env.map(name => Deno.env.get(name));
  const originalServe = Deno.serve;
  const originalFetch = globalThis.fetch;
  let handler: (request: Request) => Response | Promise<Response> = () => { throw new Error('Handler not captured'); };
  const calls: string[] = [];
  let storedRedirect = origin;
  let canConsume = true;
  let consumeError = false;
  let expired = false;
  try {
    const values = ['https://line-test.invalid', 'fixture-service-key', 'fixture-anon-key',
      'fixture-channel', 'fixture-channel-secret', origin];
    env.forEach((name, index) => Deno.env.set(name, values[index]));
    Deno.serve = ((fn: typeof handler) => { handler = fn; return {}; }) as unknown as typeof Deno.serve;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input instanceof Request ? input.url : input));
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      calls.push(`${method} ${url.host}${url.pathname}`);
      if (url.host === 'line-test.invalid' && url.pathname === '/rest/v1/line_auth_states') {
        if (method === 'GET') return Response.json([{ id: 'state-id', redirect_to: storedRedirect,
          consumed: false, created_at: new Date(Date.now() - (expired ? 700_000 : 0)).toISOString() }]);
        if (method === 'POST') return new Response(null, { status: 201 });
        if (method === 'PATCH') {
          equal(url.searchParams.get('consumed'), 'eq.false');
          if (consumeError) return Response.json({ message: 'fixture failure' }, { status: 500 });
          return Response.json(canConsume ? [{ id: 'state-id' }] : []);
        }
      }
      if (url.host === 'api.line.me' && url.pathname === '/oauth2/v2.1/token') return Response.json({ access_token: 'fixture-line-token' });
      if (url.host === 'api.line.me' && url.pathname === '/oauth2/v2.1/userinfo') return Response.json({ sub: 'fixture-sub' });
      if (url.host === 'line-test.invalid' && url.pathname === '/rest/v1/line_identities') return Response.json([{ user_id: 'fixture-user' }]);
      if (url.host === 'line-test.invalid' && url.pathname === '/auth/v1/admin/generate_link') return Response.json({ hashed_token: 'fixture-hash' });
      if (url.host === 'line-test.invalid' && url.pathname === '/auth/v1/verify') return Response.json({
        access_token: 'fixture-session', refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600,
        user: { id: 'fixture-user' },
      });
      throw new Error(`Unexpected HTTP: ${method} ${url.host}${url.pathname}`);
    };
    await import('../supabase/functions/line-auth/index.ts');
    const request = (path: string) => new Request(`https://line-test.invalid/functions/v1/line-auth/${path}`);
    for (const target of ['https://evil.example', `${origin}.evil.example`, `${origin}/?next=evil`]) {
      calls.length = 0;
      const response = await handler(request(`start?redirect_to=${encodeURIComponent(target)}`));
      equal(response.status, 400); equal(response.headers.get('location'), null); equal(calls.length, 0);
    }
    Deno.env.delete('LINE_AUTH_REDIRECT_ORIGINS');
    equal((await handler(request(`start?redirect_to=${encodeURIComponent(origin)}`))).status, 400);
    Deno.env.set('LINE_AUTH_REDIRECT_ORIGINS', origin);
    equal((await handler(request(`start?redirect_to=${encodeURIComponent(origin)}`))).status, 302);

    for (const target of ['https://evil.example', `${origin}.evil.example`, `${origin}/#stolen`]) {
      storedRedirect = target; calls.length = 0;
      const response = await handler(request('callback?code=fixture-code&state=fixture-state'));
      equal(response.status, 400); equal(response.headers.get('location'), null);
      equal(calls.length, 1); // state read only; no LINE token exchange or session generation
    }
    storedRedirect = origin;
    // A policy removed after authorization also rejects an old stored state.
    Deno.env.set('LINE_AUTH_REDIRECT_ORIGINS', 'https://new-staging.example'); calls.length = 0;
    equal((await handler(request('callback?code=fixture-code&state=fixture-state'))).status, 400);
    equal(calls.length, 1);
    Deno.env.set('LINE_AUTH_REDIRECT_ORIGINS', origin);
    const valid = await handler(request('callback?code=fixture-code&state=fixture-state'));
    equal(valid.status, 302);
    const location = new URL(valid.headers.get('location')!);
    equal(location.origin, origin);
    equal(new URLSearchParams(location.hash.slice(1)).get('access_token'), 'fixture-session');

    canConsume = false; calls.length = 0;
    const replay = await handler(request('callback?code=fixture-code&state=fixture-state'));
    equal(replay.status, 400); equal(replay.headers.get('location'), null); equal(calls.length, 2);
    canConsume = true; consumeError = true; calls.length = 0;
    equal((await handler(request('callback?code=fixture-code&state=fixture-state'))).status, 400);
    equal(calls.length, 2);
    consumeError = false; expired = true; calls.length = 0;
    equal((await handler(request('callback?code=fixture-code&state=fixture-state'))).status, 302);
    equal(calls.length, 1); // failure to app only, without tokens
  } finally {
    Deno.serve = originalServe;
    globalThis.fetch = originalFetch;
    env.forEach((name, index) => originals[index] === undefined ? Deno.env.delete(name) : Deno.env.set(name, originals[index]!));
  }
});
