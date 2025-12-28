export const config = {
  matcher: [
    '/builder',
    '/builder.html',
    '/builder/:path*',
    '/api/state-save'
  ],
};

export default function middleware(req) {
  const username = process.env.BUILDER_USER || '';
  const password = process.env.BUILDER_PASS || '';

  // Wenn ENV fehlt: immer sperren (damit es nie “offen” ist)
  if (!username || !password) {
    return new Response('Builder auth not configured', { status: 401 });
  }

  const auth = req.headers.get('authorization') || '';
  const [scheme, encoded] = auth.split(' ');

  if (scheme === 'Basic' && encoded) {
    try {
      const decoded = atob(encoded);
      const i = decoded.indexOf(':');
      const user = decoded.slice(0, i);
      const pass = decoded.slice(i + 1);
      if (user === username && pass === password) return; // allow
    } catch {}
  }

  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Builder"' },
  });
}
