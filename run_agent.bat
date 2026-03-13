@echo off
echo =======================================
echo 🧠 INICIANDO SEU AGENTE IA (LLAMA)
echo =======================================
echo.
echo Procurando a pasta do IPagent...

if exist "ipagent\main.py" (
    cd ipagent
) else if exist "..\ipagent\main.py" (
    cd ..\ipagent
) else if exist "C:\Users\Cairo\.gemini\antigravity\scratch\ipagent\main.py" (
    cd /d "C:\Users\Cairo\.gemini\antigravity\scratch\ipagent"
) else (
    echo [ERRO] Pasta do ipagent nao encontrada na raiz!
    pause
    exit
)

echo Ativando ambiente virtual do Python...
if exist "venv\Scripts\activate.bat" (
    call "venv\Scripts\activate.bat"
) else (
    echo Aviso: Ambiente virtual (venv) nao encontrado!
)

echo.
echo Iniciando Servidor IPagent Local na Porta 5000...
python main.py

pause
