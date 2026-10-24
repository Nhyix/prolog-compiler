# TriFunc Studio IDE PowerShell Launcher
# Autor: Nhyix | Core: #7620859-NHYIX
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  TriFunc Studio IDE (Haskell, Scheme, Hope) by Nhyix" -ForegroundColor Green
Write-Host "  Core ID: #7620859-NHYIX-CORE" -ForegroundColor Magenta
Write-Host "=======================================================" -ForegroundColor Cyan

Set-Location -Path $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando paquetes requeridos..." -ForegroundColor Yellow
    npm install
}

Start-Process "http://localhost:3333"
Write-Host "Abriendo IDE en http://localhost:3333..." -ForegroundColor Green
node server.js
