function isValidSupabaseUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.includes("SEU_PROJETO") || trimmed.includes("sua_chave")) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "https:" && u.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

module.exports = (req, res) => {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return res.status(500).json({
      ok: false,
      mensagem:
        "Configure SUPABASE_URL e SUPABASE_ANON_KEY na Vercel: Settings → Environment Variables → Redeploy.",
    });
  }

  if (!isValidSupabaseUrl(url)) {
    return res.status(500).json({
      ok: false,
      mensagem:
        "SUPABASE_URL inválida. Use a URL real do projeto (ex: https://abcdefgh.supabase.co) em Environment Variables.",
    });
  }

  if (anonKey.length < 20) {
    return res.status(500).json({
      ok: false,
      mensagem: "SUPABASE_ANON_KEY inválida. Cole a chave anon public completa do painel Supabase.",
    });
  }

  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, url, anonKey });
};
