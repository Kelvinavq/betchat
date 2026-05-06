# Script para crear la base de datos de BetChat (Windows PowerShell)

Write-Host "🗄️  Creando base de datos BetChat..." -ForegroundColor Cyan

# Crear BD en desarrollo
Write-Host "📝 Creando base de datos betchat_dev..." -ForegroundColor Yellow
mysql -u root -e "CREATE DATABASE IF NOT EXISTS betchat_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>$null

# Ejecutar schema
Write-Host "🔨 Ejecutando schema..." -ForegroundColor Yellow
$schemaPath = Resolve-Path "..\database\schema.sql"
mysql -u root betchat_dev < $schemaPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Base de datos creada exitosamente" -ForegroundColor Green
    Write-Host "📊 Para ver las tablas: mysql -u root betchat_dev -e 'SHOW TABLES;'" -ForegroundColor Cyan
} else {
    Write-Host "✗ Error al crear la base de datos" -ForegroundColor Red
    Write-Host "  Verifica que MySQL esté corriendo y las credenciales sean correctas" -ForegroundColor Gray
}
