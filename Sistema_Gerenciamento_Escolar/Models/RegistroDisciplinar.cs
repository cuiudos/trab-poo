namespace Sistema_Gerenciamento_Escolar.Models;

public class RegistroDisciplinar
{
    public Disciplina Disciplina { get; set; }
    public Nota Nota { get; set; }
    public Falta Falta { get; set; }

    public RegistroDisciplinar(Disciplina disciplina)
    {
        Disciplina = disciplina;
        Nota = new Nota();
        Falta = new Falta();
    }
}
