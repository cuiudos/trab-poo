const COOKIE = "escolar_sess";

function parseCookies(req) {
  const h = req.headers.cookie || "";
  return Object.fromEntries(
    h.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    })
  );
}

function getSession(req) {
  const cookies = parseCookies(req);
  if (!cookies[COOKIE]) return null;
  try {
    return JSON.parse(Buffer.from(cookies[COOKIE], "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function setSession(res, data) {
  const val = Buffer.from(JSON.stringify(data)).toString("base64");
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${encodeURIComponent(val)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7200`
  );
}

function clearSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
}

function requirePerfil(req, res, perfis) {
  const sess = getSession(req);
  if (!sess) {
    res.status(401).json({ ok: false, mensagem: "Acesso negado." });
    return null;
  }
  if (!perfis.includes(sess.perfil)) {
    res.status(403).json({ ok: false, mensagem: "Perfil sem permissão." });
    return null;
  }
  return sess;
}

module.exports = { getSession, setSession, clearSession, requirePerfil };
