@echo off
title TriFunc Studio - Haskell, Scheme & Hope IDE by Nhyix
echo =======================================================
echo   TriFunc Studio IDE (Haskell, Scheme, Hope)
echo   Autor: Nhyix ^| Core: #7620859-NHYIX
echo =======================================================
echo.
cd /d "%~dp0"

echo Verificando dependencias...
if not exist node_modules (
  echo Instalando dependencias de Node...
  call npm install
)

echo Abriendo navegador en http://localhost:3333...
start http://localhost:3333

echo Iniciando servidor en segundo plano...
node server.js
pause
