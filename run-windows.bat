@echo off
title Pipes Sovereign Desktop Node
echo ========================================================
echo   ||| PIPES SOVEREIGN DESKTOP NODE (WINDOWS PREVIEW)
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is required to run the desktop preview.
  echo Please install Node.js 18+ from https://nodejs.org
  pause
  exit /b 1
)

where ollama >nul 2>nul
if %errorlevel% neq 0 (
  echo [Notice] Ollama is not currently detected in your system PATH.
  echo For zero-cost, private local AI: install Ollama from https://ollama.com
  echo and run: ollama run qwen2.5
  echo Pipes will use the sovereign web pipeline until Ollama is running.
  echo.
) else (
  echo [OK] Local Ollama runtime detected.
  echo.
)

echo Installing dependencies...
call npm install
echo.
echo Starting Pipes Native Desktop...
call npm run dev
