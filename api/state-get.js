import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_KEY = process.env.SITE_KEY || "glowupmoments"; // frei wählbar

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).end();

    const { data, error } = await supabase
      .from("site_state")
      .select("state, updated_at")
      .eq("key", SITE_KEY)
      .maybeSingle();

    if (error) throw error;

    const state = data?.state || {};
    // Wir geben updated_at mit, damit die Website ohne Reload pollen kann.
    return res.status(200).json({ ...state, updated_at: data?.updated_at || null });
  } catch (err) {
    console.error("state-get error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
