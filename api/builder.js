import fs from "fs";
import path from "path";

function unauthorized() {
  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Builder"' },
  });
}

export default function handler(req) {
  const username = process.env.BUILDER_USER || "";
  const password = process.env.BUILDER_PASS || "";

  if (!username || !password) {
    return new Response("Builder auth not configured", { status: 500 });
  }

  const auth = req.headers.authorization || "";
  const [scheme, encoded] = auth.split(" ");
  if (scheme !== "Basic" || !encoded) return unauthorized();

  let decoded = "";
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return unauthorized();
  }

  const idx = decoded.indexOf(":");
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);

  if (user !== username || pass !== password) return unauthorized();

  const filePath = path.join(process.cwd(), "public", "builder.html");
  const html = fs.readFileSync(filePath, "utf8");

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
