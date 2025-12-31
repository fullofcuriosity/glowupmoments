import fs from "node:fs";
import path from "node:path";

function unauthorized(res) {
  res.statusCode = 401;
  res.setHeader("WWW-Authenticate", 'Basic realm="Builder"');
  res.end("Authentication required");
}

export default async function handler(req, res) {
  const username = process.env.BUILDER_USER || "";
  const password = process.env.BUILDER_PASS || "";
  if (!username || !password) return unauthorized(res);

  const auth = req.headers.authorization || "";
  const [scheme, encoded] = auth.split(" ");
  if (scheme !== "Basic" || !encoded) return unauthorized(res);

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const i = decoded.indexOf(":");
  const user = decoded.slice(0, i);
  const pass = decoded.slice(i + 1);
  if (user !== username || pass !== password) return unauthorized(res);

  const filePath = path.join(process.cwd(), "public", "builder.html");
  const html = fs.readFileSync(filePath, "utf8");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.statusCode = 200;
  res.end(html);
}
