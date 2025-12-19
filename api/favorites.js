import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    /* ========= GET ========= */
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json({ favorites: data });
    }

    /* ========= POST ========= */
    if (req.method === "POST") {
      // 🔥 关键修复：兼容 string / object
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      const { type, value } = body || {};

      if (!type || !value) {
        return res.status(400).json({
          error: "type and value required",
          received: body
        });
      }

      const { data, error } = await supabase
        .from("favorites")
        .insert([{ type, value }])
        .select();

      if (error) throw error;

      return res.status(201).json({ saved: data[0] });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
