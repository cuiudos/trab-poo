# Setup Supabase — PowerShell (recomendado no Windows se node der "fetch failed")
# Uso: .\scripts\setup-supabase.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $root ".env"

if (-not (Test-Path $envFile)) { throw "Arquivo .env não encontrado" }

$vars = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $i = $line.IndexOf("=")
    $vars[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim()
  }
}

$url = $vars["SUPABASE_URL"]
$key = $vars["SUPABASE_SERVICE_ROLE_KEY"]
if (-not $url -or -not $key) { throw "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env" }

Write-Host "Conectando ao Supabase: $url"

$headers = @{
  apikey         = $key
  Authorization  = "Bearer $key"
  "Content-Type" = "application/json"
}

function Invoke-SbPut([string]$Path, $Body) {
  Invoke-RestMethod -Uri "$url$Path" -Method PUT -Headers $headers -Body ($Body | ConvertTo-Json)
}

function Invoke-SbPatch([string]$Path, $Body) {
  Invoke-RestMethod -Uri "$url$Path" -Method PATCH -Headers $headers -Body ($Body | ConvertTo-Json)
}

function Invoke-SbGet([string]$Path) {
  Invoke-RestMethod -Uri "$url$Path" -Method GET -Headers $headers
}

function Invoke-SbPost([string]$Path, $Body, [string]$Prefer = "return=representation") {
  $h = $headers.Clone()
  $h["Prefer"] = $Prefer
  Invoke-RestMethod -Uri "$url$Path" -Method POST -Headers $h -Body ($Body | ConvertTo-Json -Depth 5)
}

function Get-First($obj) {
  if ($null -eq $obj) { return $null }
  if ($obj -is [array]) { return $obj[0] }
  return $obj
}

function Get-UserId($authResponse) {
  $r = Get-First $authResponse
  if ($r.id) { return $r.id }
  if ($r.user.id) { return $r.user.id }
  throw "Resposta auth sem id: $($r | ConvertTo-Json -Compress)"
}

# Escola
$escolas = @(Invoke-SbGet "/rest/v1/escolas?slug=eq.jardim-das-acacias&select=id,nome")
if ($escolas.Count -eq 0) {
  $escola = Get-First (Invoke-SbPost "/rest/v1/escolas" @{ nome = "Colégio Jardim das Acácias"; slug = "jardim-das-acacias" })
} else {
  $escola = $escolas[0]
}
Write-Host "Escola OK: $($escola.nome)"

# Turma
$turmas = @(Invoke-SbGet "/rest/v1/turmas?escola_id=eq.$($escola.id)&select=id,nome")
$turma = $null
foreach ($t in $turmas) {
  if ($t.nome -like "*Ano A*") { $turma = $t; break }
}
if (-not $turma) {
  try {
    $turma = Get-First (Invoke-SbPost "/rest/v1/turmas" @{ escola_id = $escola.id; nome = "3º Ano A" })
  } catch {
    $turmas = @(Invoke-SbGet "/rest/v1/turmas?escola_id=eq.$($escola.id)&select=id,nome")
    $turma = $turmas | Select-Object -First 1
  }
}
if (-not $turma -or -not $turma.id) { throw "Turma nao encontrada" }
Write-Host "Turma OK: $($turma.nome)"

$usuarios = @(
  @{ login = "diretor1";  password = "diretor123"; nome = "Álvaro Gonçalves de Carvalho";       cpf = "11111111111"; role = "diretor";   disciplina = $null;         nota = 0;  faltas = 0 },
  @{ login = "profesor2"; password = "profesor23"; nome = "Danton Rodrigues Diniz";             cpf = "22222222222"; role = "professor"; disciplina = "Matemática"; nota = 0;  faltas = 0 },
  @{ login = "alunos123"; password = "alunos123"; nome = "Pedro Henrique Alves Emerick";       cpf = "66666666666"; role = "aluno";     disciplina = $null;         nota = 10; faltas = 1 }
)

$profVinculado = $false

foreach ($u in $usuarios) {
  $email = "$($u.login)@acacias.edu.br"
  $userId = $null

  try {
    $created = Invoke-SbPost "/auth/v1/admin/users" @{
      email = $email; password = $u.password; email_confirm = $true
    } "return=representation"
    $userId = Get-UserId $created
    Write-Host "Criado: $($u.login)"
  } catch {
    $list = Invoke-SbGet "/auth/v1/admin/users?per_page=1000"
    $users = if ($list.users) { $list.users } else { $list }
    $found = $users | Where-Object { $_.email -eq $email } | Select-Object -First 1
    if (-not $found) { throw $_ }
    $userId = $found.id
    Write-Host "Ja existe: $($u.login)"
  }

  Invoke-SbPost "/rest/v1/perfis" @{
    id = $userId; escola_id = $escola.id; nome = $u.nome; cpf = $u.cpf; role = $u.role; disciplina = $u.disciplina
  } "return=minimal,resolution=merge-duplicates" | Out-Null

  if ($u.role -eq "professor" -and -not $profVinculado) {
    Invoke-SbPatch "/rest/v1/turmas?id=eq.$($turma.id)" @{ professor_id = $userId } | Out-Null
    $profVinculado = $true
  }

  if ($u.role -eq "aluno") {
    Invoke-SbPost "/rest/v1/registros_alunos" @{
      perfil_id = $userId; turma_id = $turma.id; nota = $u.nota; faltas = $u.faltas
    } "return=minimal,resolution=merge-duplicates" | Out-Null
  }
}

Write-Host ""
Write-Host "Setup concluido!"
Write-Host "  Diretor   -> diretor1   / diretor123"
Write-Host "  Professor -> profesor2  / profesor23"
Write-Host "  Aluno     -> alunos123  / alunos123"
