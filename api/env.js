module.exports = (req, res) => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return res.status(500).json({
      ok: false,
      mensagem: "Configure SUPABASE_URL e SUPABASE_ANON_KEY na Vercel (Settings → Environment Variables).",
    });
  }

  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, url, anonKey });
};
