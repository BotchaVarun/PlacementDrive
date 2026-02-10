# Download and setup PostgreSQL portable
$pgVersion = "17.2-1"
$downloadUrl = "https://get.enterprisedb.com/postgresql/postgresql-$pgVersion-windows-x64-binaries.zip"
$downloadPath = "$env:TEMP\postgresql.zip"
$extractPath = "C:\Users\saich\Downloads\Placement-Prime\Placement-Prime\.local\pgsql"

Write-Host "Downloading PostgreSQL..."
Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath

Write-Host "Extracting PostgreSQL..."
Expand-Archive -Path $downloadPath -DestinationPath $extractPath -Force

Write-Host "Initializing database..."
$pgBin = "$extractPath\pgsql\bin"
& "$pgBin\initdb.exe" -D "$extractPath\data" -U postgres -W -E UTF8 --locale=C

Write-Host "Starting PostgreSQL..."
& "$pgBin\pg_ctl.exe" -D "$extractPath\data" -l "$extractPath\logfile" start

Start-Sleep -Seconds 5

Write-Host "Creating database..."
& "$pgBin\createdb.exe" -U postgres placement_prime

Write-Host "PostgreSQL setup complete!"
Write-Host "Connection string: postgresql://postgres:postgres@localhost:5432/placement_prime"
