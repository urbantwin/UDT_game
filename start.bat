@echo off
title EPFL Guessr — Launcher
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════╗
echo  ║      EPFL Guessr - Launcher      ║
echo  ╚══════════════════════════════════╝
echo.

:: ── 1. Libérer les ports ──────────────────────────────────────────────────────
echo [1/4] Liberation des ports...
call npx kill-port 3001 5173 8000 >nul 2>&1
timeout /t 1 /nobreak >nul

:: ── 2. Détecter l'IP LAN et mettre à jour .env + cert si besoin ──────────────
echo [2/4] Detection IP et certificat...
for /f "tokens=*" %%i in ('node -e "const os=require('os');const ip=Object.values(os.networkInterfaces()).flat().find(x=>x.family==='IPv4'&&!x.internal)?.address||'localhost';console.log(ip)"') do set CURRENT_IP=%%i

:: Vérifier si l'IP du cert correspond à l'IP actuelle
for /f "tokens=*" %%i in ('openssl x509 -in certs\dev-cert.pem -noout -text 2^>nul ^| findstr "%CURRENT_IP%"') do set CERT_OK=%%i

if "%CERT_OK%"=="" (
    echo    IP changee ^(%CURRENT_IP%^) - Regeneration du certificat...
    call npm run https:setup >nul 2>&1
    echo    Certificat regenere.
) else (
    echo    Certificat OK pour %CURRENT_IP%
)

:: Mettre à jour CORS dans .env
node -e "const fs=require('fs');let e=fs.readFileSync('.env','utf8');e=e.replace(/CORS_ORIGINS=.*/,'CORS_ORIGINS=https://%CURRENT_IP%:5173,https://localhost:5173,http://localhost:5173');fs.writeFileSync('.env',e);console.log('   .env mis a jour');"

:: ── 3. Démarrer les serveurs ──────────────────────────────────────────────────
echo [3/4] Demarrage des serveurs...

:: Serveur Node.js HTTPS
start "EPFL Guessr - Serveur" cmd /k "cd /d %~dp0 && node --env-file=.env src/server/index.js"
timeout /t 2 /nobreak >nul

:: Frontend Vite HTTPS
start "EPFL Guessr - Frontend" cmd /k "cd /d %~dp0 && npx vite"
timeout /t 3 /nobreak >nul

:: Validateur Python CLIP (optionnel)
if exist "photo_validator\.venv\Scripts\python.exe" (
    echo [4/4] Demarrage validateur Python CLIP...
    start "EPFL Guessr - Validateur IA" cmd /k "cd /d %~dp0\photo_validator && .venv\Scripts\python api.py"
    timeout /t 2 /nobreak >nul
    echo    Validateur IA demarre ^(port 8000^)
) else (
    echo [4/4] Validateur Python absent - validation locale Sharp active
)

:: ── 4. Ouvrir le navigateur ───────────────────────────────────────────────────
echo.
echo  ════════════════════════════════════
echo   PC  :  http://localhost:5173
echo   Tel :  https://%CURRENT_IP%:5173
echo  ════════════════════════════════════
echo.
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo  3 fenetres ouvertes ^(Serveur / Frontend / IA^)
echo  Ferme cette fenetre quand tu veux arreter.
echo.
pause
