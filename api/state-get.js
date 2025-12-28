const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(process.cwd(), "api", "data", "site.json");

module.exports = (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).end();
    }

    if (!fs.existsSync(DATA_PATH)) {
      return res.status(200).json({});
    }

    const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    return res.status(200).json(data);
  } catch (err) {
    console.error("state-get error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
};
