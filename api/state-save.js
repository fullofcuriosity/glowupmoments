const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(process.cwd(), "api", "data", "site.json");

module.exports = (req, res) => {
  try {
    // Ordner sicherstellen
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });

    if (req.method !== "POST") {
      return res.status(405).end();
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      fs.writeFileSync(DATA_PATH, body, "utf8");
      return res.status(200).json({ ok: true });
    });
  } catch (err) {
    console.error("state-save error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
};
