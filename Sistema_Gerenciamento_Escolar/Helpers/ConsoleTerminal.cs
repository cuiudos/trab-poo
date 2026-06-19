using System.Runtime.InteropServices;

namespace Sistema_Gerenciamento_Escolar.Helpers;

public static class ConsoleTerminal
{
    private const int StdOutputHandle = -11;
    private const uint EnableVirtualTerminalProcessing = 0x0004;

    [DllImport("kernel32.dll")]
    private static extern IntPtr GetStdHandle(int nStdHandle);

    [DllImport("kernel32.dll")]
    private static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);

    [DllImport("kernel32.dll")]
    private static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);

    private static bool _ansiConfigurado;

    public static void Inicializar()
    {
        HabilitarAnsiSeWindows();
    }

    public static void LimparTela()
    {
        if (Console.IsOutputRedirected)
            return;

        HabilitarAnsiSeWindows();

        // 3J = apaga buffer de rolagem; 2J + H = limpa a tela visível (Cursor/VS Code/Windows Terminal)
        Console.Write("\x1b[3J\x1b[2J\x1b[H");
        Console.Out.Flush();

        try
        {
            Console.Clear();
        }
        catch (IOException)
        {
            // Alguns terminais não suportam Clear nativo.
        }
    }

    private static void HabilitarAnsiSeWindows()
    {
        if (_ansiConfigurado || !OperatingSystem.IsWindows())
            return;

        _ansiConfigurado = true;

        try
        {
            IntPtr handle = GetStdHandle(StdOutputHandle);
            if (handle == IntPtr.Zero || handle == new IntPtr(-1))
                return;

            if (!GetConsoleMode(handle, out uint mode))
                return;

            if ((mode & EnableVirtualTerminalProcessing) == 0)
                SetConsoleMode(handle, mode | EnableVirtualTerminalProcessing);
        }
        catch
        {
            // Terminal integrado ou ambiente sem API de console clássico.
        }
    }
}
