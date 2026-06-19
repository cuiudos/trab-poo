async function gerarMatriculaUnica(admin, escolaId) {
  for (let tentativa = 0; tentativa < 50; tentativa++) {
    const codigo = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");

    const { data: existente } = await admin
      .from("registros_alunos")
      .select("id, perfil:perfis!inner(escola_id)")
      .eq("matricula", codigo)
      .eq("perfil.escola_id", escolaId)
      .maybeSingle();

    if (!existente) return codigo;
  }

  throw new Error("Não foi possível gerar matrícula única. Tente novamente.");
}

module.exports = { gerarMatriculaUnica };
