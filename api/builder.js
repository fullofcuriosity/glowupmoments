import fs from "fs";
import path from "path";

function unauthorized() {
  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Builder"' },
  });
}

function parseBasicAuth(req) {
  const auth = req.headers.authorization || "";
  const [scheme, encoded] = auth.split(" ");
  if (scheme !== "Basic" || !encoded) return null;

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const i = decoded.indexOf(":");
  if (i < 0) return null;

  return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
}

export default function handler(req) {
  try {
    const username = process.env.BUILDER_USER || "";
    const password = process.env.BUILDER_PASS || "";
    if (!username || !password) {
      return new Response("Builder auth not configured", { status: 500 });
    }

    const creds = parseBasicAuth(req);
    if (!creds) return unauthorized();
    if (creds.user !== username || creds.pass !== password) return unauthorized();

    const filePath = path.join(process.cwd(), "public", "builder.html");
    const html = fs.readFileSync(filePath, "utf8");

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response("Builder error: " + (err?.message || String(err)), {
      status: 500,
    });
  }
}
