const { clearSession } = require("../_lib/session");

module.exports = (req, res) => {
  clearSession(res);
  res.json({ ok: true });
};
