import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // ---------- GET: list favorites ----------
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ favorites: data });
    }

    // ---------- POST: save favorite ----------
    if (req.method === "POST") {
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : (req.body || {});

      const { type, value, label } = body;
      if (!type || !value) {
        return res.status(400).json({ error: "type and value required" });
      }

      // 如果你的表没有 label 列，也没关系：我们只插 type/value
      const payload = [{ type, value }];
      // 如果你 Supabase 表里确实有 label 列，可以改成：[{ type, value, label: label || null }]

      const { data, error } = await supabase.from("favorites").insert(payload).select("*");

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ saved: data[0] });
    }

    // ---------- DELETE: remove by id ----------
    if (req.method === "DELETE") {
      const id = req.query?.id;
      if (!id) return res.status(400).json({ error: "Missing id" });

      const { error } = await supabase.from("favorites").delete().eq("id", id);
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

