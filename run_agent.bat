@echo off
echo =======================================
echo    INICIANDO SEU AGENTE IA (IPagent)
echo =======================================
echo.
echo Procurando a pasta do IPagent...

set "AGENT_DIR=%~dp0ipagent"

if not exist "%AGENT_DIR%\main.py" (
    echo [ERRO] Arquivo main.py nao encontrado em %AGENT_DIR%
    pause
    exit /b 1
)

cd /d "%AGENT_DIR%"
echo Pasta encontrada: %AGENT_DIR%
echo.

echo Verificando dependencias...
pip install -q flask flask-cors PyPDF2

echo.
echo Iniciando Servidor IPagent Local na Porta 5050...
echo.
python main.py

pause
