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
    // GET /api/favorites  -> list
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ favorites: data });
    }

    // POST /api/favorites -> create {type,value}
    if (req.method === "POST") {
      const { type, value } = req.body || {};
      if (!type || !value) return res.status(400).json({ error: "type and value required" });

      const { data, error } = await supabase
        .from("favorites")
        .insert([{ type, value }])
        .select("*")
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ saved: data });
    }

    // DELETE /api/favorites?id=123 -> delete one
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
