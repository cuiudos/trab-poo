namespace Sistema_Gerenciamento_Escolar.Models;

public class Nota
{
    public double Valor { get; set; }

    public Nota(double valor = 0)
    {
        Valor = valor;
    }
}
