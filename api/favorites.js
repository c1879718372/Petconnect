import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // GET: list favorites
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ favorites: data });
    }

    // POST: save favorite
    if (req.method === "POST") {
      const body = req.body || {};
      const type = body.type;
      const value = body.value;

      if (!type || !value) {
        return res.status(400).json({ error: "type and value required" });
      }

      const { data, error } = await supabase
        .from("favorites")
        .insert([{ type, value }])
        .select("*")
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ saved: data });
    }

    // DELETE: remove by id -> /api/favorites?id=123
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
