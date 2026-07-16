param(
  [int]$Port = 55432,
  [string]$ContainerName = "salgados-r-management-hml"
)

$ErrorActionPreference = "Stop"

Write-Host "Subindo PostgreSQL descartavel em localhost:$Port..."
docker rm -f $ContainerName 2>$null | Out-Null
docker run --name $ContainerName `
  -e POSTGRES_USER=salgadosr `
  -e POSTGRES_PASSWORD=salgadosr `
  -e POSTGRES_DB=salgadosr_hml `
  -p "${Port}:5432" `
  -d postgres:16-alpine | Out-Null

try {
  for ($i = 0; $i -lt 30; $i++) {
    docker exec $ContainerName pg_isready -U salgadosr -d salgadosr_hml | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
  }

  Write-Host "Inicializando schema base atual pelo servidor local..."
  $env:PGHOST = "127.0.0.1"
  $env:PGPORT = "$Port"
  $env:PGDATABASE = "salgadosr_hml"
  $env:PGUSER = "salgadosr"
  $env:PGPASSWORD = "salgadosr"
  $env:PORT = "3999"
  $api = Start-Process node -ArgumentList "server/index.js" -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 5
  if (!$api.HasExited) { Stop-Process -Id $api.Id -Force }

  Write-Host "Aplicando migration formal do modulo de gestao duas vezes para testar idempotencia..."
  Get-Content .\scripts\migrations\20260716_management_module.sql | docker exec -i $ContainerName psql -U salgadosr -d salgadosr_hml
  Get-Content .\scripts\migrations\20260716_management_module.sql | docker exec -i $ContainerName psql -U salgadosr -d salgadosr_hml

  Write-Host "Validando constraints basicas..."
  docker exec $ContainerName psql -U salgadosr -d salgadosr_hml -v ON_ERROR_STOP=1 -c "SELECT conname FROM pg_constraint WHERE conname LIKE 'chk_%' ORDER BY conname;"
  docker exec $ContainerName psql -U salgadosr -d salgadosr_hml -v ON_ERROR_STOP=1 -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY indexname;"

  Write-Host "Homologacao estrutural concluida. Container descartavel mantido para inspecao: $ContainerName"
}
catch {
  Write-Error $_
  throw
}
