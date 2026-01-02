import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_KEY = process.env.SITE_KEY || "glowupmoments";

export default async function handler(req, res) {
  // niemals cachen (wichtig bei Vercel/CDN/Browser)
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    if (req.method !== "POST") return res.status(405).end();

    const body = req.body || {};
    const ls = (body && body.ls && typeof body.ls === "object") ? body.ls : {};

    // Merge: bestehenden State holen
    const { data: existing, error: getErr } = await supabase
      .from("site_state")
      .select("state")
      .eq("key", SITE_KEY)
      .maybeSingle();

    if (getErr) throw getErr;

    const current = (existing && existing.state && typeof existing.state === "object")
      ? existing.state
      : {};

    const next = { ...current, ls: { ...(current.ls || {}), ...ls } };

    // Upsert in Supabase
    const { error: upErr } = await supabase
      .from("site_state")
      .upsert({ key: SITE_KEY, state: next }, { onConflict: "key" });

    if (upErr) throw upErr;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("state-save error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
