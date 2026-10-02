param([switch]$Install)

$ErrorActionPreference = "Stop"
$appDir = Join-Path $env:LOCALAPPDATA "IDOC BUSINESS\Connector"
$scriptPath = Join-Path $appDir "IDOC-Connector.ps1"
$configPath = Join-Path $appDir "connector.json"

if ($Install) {
  New-Item -ItemType Directory -Force -Path $appDir | Out-Null
  Copy-Item -Force $PSCommandPath $scriptPath
  $startup = [Environment]::GetFolderPath("Startup")
  $shortcutPath = Join-Path $startup "IDOC Connector.lnk"
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = "powershell.exe"
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
  $shortcut.WorkingDirectory = $appDir
  $shortcut.Save()
  Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("Conector IDOC instalado. Volte ao IDOC BUSINESS e clique em Verificar conexão.", "IDOC BUSINESS") | Out-Null
  exit
}

New-Item -ItemType Directory -Force -Path $appDir | Out-Null
if (Test-Path $configPath) {
  $config = Get-Content $configPath -Raw | ConvertFrom-Json
} else {
  $config = [pscustomobject]@{ code = (Get-Random -Minimum 100000 -Maximum 999999).ToString(); token = "" }
  $config | ConvertTo-Json | Set-Content -Encoding UTF8 $configPath
}

function Save-Config { $script:config | ConvertTo-Json | Set-Content -Encoding UTF8 $configPath }
function Send-Json($context, $status, $value) {
  $json = $value | ConvertTo-Json -Depth 8 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $context.Response.StatusCode = $status
  $context.Response.ContentType = "application/json; charset=utf-8"
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
}
function Send-Error($context, $status, $message) { Send-Json $context $status @{ error = $message } }
function Read-Body($request) { $reader = New-Object IO.StreamReader($request.InputStream, $request.ContentEncoding); try { return ($reader.ReadToEnd() | ConvertFrom-Json) } finally { $reader.Dispose() } }
function Is-Allowed-Origin($origin) { return !$origin -or $origin -match '^https://(www\.)?idoc\.business$' -or $origin -match '^https://[^/]+\.lovable\.app$' -or $origin -match '^http://localhost(:\d+)?$' }

$listener = New-Object Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:17654/")
$listener.Start()

Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show("Código de pareamento: $($config.code)`n`nDigite este código no IDOC BUSINESS. Mantenha-o privado.", "Conector IDOC") | Out-Null

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $origin = $ctx.Request.Headers["Origin"]
    if (!(Is-Allowed-Origin $origin)) { Send-Error $ctx 403 "Origem não autorizada."; continue }
    if ($origin) { $ctx.Response.Headers.Add("Access-Control-Allow-Origin", $origin); $ctx.Response.Headers.Add("Vary", "Origin") }
    $ctx.Response.Headers.Add("Access-Control-Allow-Headers", "authorization, content-type")
    $ctx.Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $ctx.Response.Headers.Add("Access-Control-Allow-Private-Network", "true")
    if ($ctx.Request.HttpMethod -eq "OPTIONS") { $ctx.Response.StatusCode = 204; $ctx.Response.Close(); continue }

    $path = $ctx.Request.Url.AbsolutePath
    if ($path -eq "/status") { Send-Json $ctx 200 @{ ready = $true; version = "1.0.0"; paired = [bool]$config.token; computer = $env:COMPUTERNAME }; continue }
    if ($path -eq "/pair" -and $ctx.Request.HttpMethod -eq "POST") {
      $body = Read-Body $ctx.Request
      if ([string]$body.code -ne [string]$config.code) { Send-Error $ctx 401 "Código de pareamento inválido."; continue }
      if (!$config.token) { $bytes = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); $config.token = [Convert]::ToBase64String($bytes); Save-Config }
      Send-Json $ctx 200 @{ token = $config.token }; continue
    }
    $auth = $ctx.Request.Headers["Authorization"]
    if (!$config.token -or $auth -ne "Bearer $($config.token)") { Send-Error $ctx 401 "Computador não pareado."; continue }

    if ($path -eq "/printers") {
      $defaultName = (Get-CimInstance Win32_Printer | Where-Object Default | Select-Object -First 1 -ExpandProperty Name)
      $items = @(Get-CimInstance Win32_Printer | Sort-Object Name | ForEach-Object { @{ name = $_.Name; default = ($_.Name -eq $defaultName); status = [string]$_.PrinterStatus } })
      Send-Json $ctx 200 @{ printers = $items }; continue
    }
    if ($path -eq "/print" -and $ctx.Request.HttpMethod -eq "POST") {
      $body = Read-Body $ctx.Request
      if (!$body.data -or !$body.printer) { Send-Error $ctx 400 "Arquivo ou impressora ausente."; continue }
      $safeName = [IO.Path]::GetFileName([string]$body.name)
      $tempFile = Join-Path $env:TEMP ("idoc-" + [guid]::NewGuid().ToString("N") + "-" + $safeName)
      [IO.File]::WriteAllBytes($tempFile, [Convert]::FromBase64String([string]$body.data))
      $count = [Math]::Max(1, [Math]::Min(20, [int]$body.copies))
      for ($i = 0; $i -lt $count; $i++) { Start-Process -FilePath $tempFile -Verb PrintTo -ArgumentList ('"' + [string]$body.printer + '"') -WindowStyle Hidden }
      Send-Json $ctx 200 @{ queued = $true; copies = $count }; continue
    }
    if ($path -eq "/scan" -and $ctx.Request.HttpMethod -eq "POST") {
      $dialog = New-Object -ComObject WIA.CommonDialog
      $jpegFormat = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}"
      $image = $dialog.ShowAcquireImage(1, 2, 0, $jpegFormat, $true, $true, $false)
      if (!$image) { Send-Error $ctx 409 "Digitalização cancelada."; continue }
      $extension = ".jpg"; $mime = "image/jpeg"
      $tempFile = Join-Path $env:TEMP ("digitalizacao-idoc-" + (Get-Date -Format "yyyyMMdd-HHmmss") + $extension)
      $image.SaveFile($tempFile)
      $data = [Convert]::ToBase64String([IO.File]::ReadAllBytes($tempFile))
      Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
      Send-Json $ctx 200 @{ name = [IO.Path]::GetFileName($tempFile); mime = $mime; data = $data }; continue
    }
    Send-Error $ctx 404 "Ação não encontrada."
  } catch {
    try { Send-Error $ctx 500 $_.Exception.Message } catch { }
  }
}