@echo off
echo =======================================
echo ?? INICIANDO TUNNEL CLOUDFLARE 
echo =======================================
echo Conectando agente local (porta 5000) a rede global...
cloudflared.exe tunnel --url http://127.0.0.1:5000
pause

