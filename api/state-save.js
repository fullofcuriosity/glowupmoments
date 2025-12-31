import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_KEY = process.env.SITE_KEY || "glowupmoments"; // muss identisch zu state-get sein

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    // Optional: zusätzliche Basic-Auth hier absichern (falls Middleware nicht greift)
    const u = process.env.BUILDER_USER || "";
    const p = process.env.BUILDER_PASS || "";
    if (u && p) {
      const auth = req.headers.authorization || "";
      const [scheme, encoded] = auth.split(" ");
      if (scheme !== "Basic" || !encoded) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Builder"');
        return res.status(401).send("Authentication required");
      }
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const i = decoded.indexOf(":");
      const user = decoded.slice(0, i);
      const pass = decoded.slice(i + 1);
      if (user !== u || pass !== p) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Builder"');
        return res.status(401).send("Authentication required");
      }
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};

    const { error } = await supabase
      .from("site_state")
      .upsert(
        { key: SITE_KEY, state: body, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("state-save error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
