const { createClient } = require("@supabase/supabase-js");
const { parseBody } = require("../_lib/body");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!token) return res.status(401).json({ ok: false });

  const userClient = createClient(url, anonKey);
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData } = await userClient.auth.getUser(token);
  if (!userData?.user) return res.status(401).json({ ok: false });

  const { data: diretor } = await admin
    .from("perfis")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (diretor?.role !== "diretor") return res.status(403).json({ ok: false });

  const body = await parseBody(req);
  const email = (body.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ ok: false, mensagem: "E-mail obrigatório." });

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = list?.users?.find((u) => u.email?.toLowerCase() === email);

  if (!user) return res.json({ ok: false, mensagem: "Usuário não encontrado." });

  res.json({ ok: true, id: user.id, email: user.email });
};
