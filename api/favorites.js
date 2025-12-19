import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 兼容：有时 req.body 是 string，需要自己 JSON.parse
async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (req.body && typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }

  // 再兜底：手动读 raw body（防止某些环境 req.body 为空）
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // ✅ GET: list favorites
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ favorites: data });
    }

    // ✅ POST: insert favorite
    if (req.method === "POST") {
      const body = await readBody(req);
      const { type, value } = body || {};

      if (!type || !value) {
        return res.status(400).json({ error: "type and value required" });
      }

      const { data, error } = await supabase
        .from("favorites")
        .insert([{ type, value }])
        .select("*");

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ saved: data?.[0] });
    }

    // ✅ DELETE: remove by id
    if (req.method === "DELETE") {
      // 支持两种：/api/favorites?id=123  或 body: { id: 123 }
      const idFromQuery = req.query?.id;
      const body = await readBody(req);
      const id = idFromQuery || body?.id;

      if (!id) return res.status(400).json({ error: "Missing id" });

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", id);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
