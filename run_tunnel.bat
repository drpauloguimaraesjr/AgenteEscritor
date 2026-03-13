@echo off
echo =======================================
echo    INICIANDO TUNNEL CLOUDFLARE
echo =======================================
echo Conectando agente local (porta 5000) a rede global...
echo.

set "CF_EXE=%~dp0cloudflared.exe"

if not exist "%CF_EXE%" (
    echo [ERRO] cloudflared.exe nao encontrado em %~dp0
    echo Baixe em: https://github.com/cloudflare/cloudflared/releases
    pause
    exit /b 1
)

"%CF_EXE%" tunnel --url http://127.0.0.1:5000

pause
