#!/bin/bash
# Script para crear la base de datos de BetChat

echo "🗄️  Creando base de datos BetChat..."

# Crear BD en desarrollo
mysql -u root -e "CREATE DATABASE IF NOT EXISTS betchat_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Ejecutar schema
mysql -u root betchat_dev < "../database/schema.sql"

echo "✓ Base de datos creada exitosamente"
echo "📊 Para ver las tablas: mysql -u root betchat_dev -e 'SHOW TABLES;'"
