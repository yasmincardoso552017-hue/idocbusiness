@echo off
title Instalar Conector IDOC
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0IDOC-Connector.ps1" -Install
if errorlevel 1 (
  echo.
  echo Nao foi possivel instalar. Clique com o botao direito e escolha Executar como administrador.
  pause
)