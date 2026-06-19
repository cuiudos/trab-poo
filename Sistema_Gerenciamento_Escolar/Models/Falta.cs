namespace Sistema_Gerenciamento_Escolar.Models;

public class Falta
{
    public int Quantidade { get; set; }

    public Falta(int quantidade = 0)
    {
        Quantidade = quantidade;
    }
}
