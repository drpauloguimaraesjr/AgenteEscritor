# ðŸ§  Content Studio â€” AgenteEscritor

**Plataforma de geraÃ§Ã£o de conteÃºdo mÃ©dico com IA local.**

Cria scripts profissionais para **YouTube**, **Instagram Reels** e **CarrossÃ©is**, usando sua base de consultas como referÃªncia para conteÃºdo autÃªntico e cientificamente embasado.

## ðŸ—ï¸ Arquitetura

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Digital Ocean (Static Site)                â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚   Login   â”‚ â”‚Workspace â”‚ â”‚  Settings  â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                     â”‚                        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                      â”‚ HTTPS (tunnel)
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Seu Computador     â”‚                        â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚  IPagent (Flask + Llama 3.2)           â”‚  â”‚
â”‚  â”‚  â”œâ”€â”€ RAG (SQLite FTS5)                 â”‚  â”‚
â”‚  â”‚  â”œâ”€â”€ 2574 consultas indexadas          â”‚  â”‚
â”‚  â”‚  â””â”€â”€ API de geraÃ§Ã£o de conteÃºdo        â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                â”‚
â”‚  â”‚  cloudflared / Cloudflare      â”‚                â”‚
â”‚  â”‚  ExpÃµe API via HTTPS     â”‚                â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## âœ¨ Funcionalidades

- ðŸ” **Login** â€” AutenticaÃ§Ã£o multi-usuÃ¡rio
- âœï¸ **Editor de texto** â€” Estilo lousa (contenteditable), com formataÃ§Ã£o
- ðŸ¤– **Painel IA** â€” Gera scripts com streaming em tempo real
- ðŸ“‚ **Projetos** â€” Salvar, organizar e buscar documentos gerados
- ðŸ“¥ðŸ“¤ **Import/Export** â€” Backup de projetos em JSON
- ðŸ’¾ **Auto-save** â€” Salva automaticamente enquanto vocÃª escreve
- ðŸ“Š **RAG** â€” Usa suas consultas reais para embasar o conteÃºdo
- âŒ¨ï¸ **Atalhos** â€” Ctrl+S (salvar), Ctrl+N (novo), Ctrl+Enter (gerar)

## ðŸŽ¨ Design

- Cores: Amber/Gold (`hsl(45, 80%, 55%)`) + dark warm
- Fontes: **Playfair Display** (tÃ­tulos) + **Inter** (corpo) + **JetBrains Mono** (cÃ³digo)
- Baseado no [DiretorioSystemDesign](https://github.com/drpauloguimaraesjr/DiretorioSystemDesign)

## ðŸš€ Deploy no Digital Ocean

1. Conectar este repo ao Digital Ocean App Platform
2. Escolher: **Static Site**
3. Build Command: *vazio* (Ã© estÃ¡tico)
4. Output Directory: `/`

## ðŸ”§ ConfiguraÃ§Ã£o do Agente Local

### 1. Instalar cloudflared
```bash
# Windows
winget install cloudflared
```

### 2. Iniciar o IPagent
```bash
cd ipagent
.\venv\Scripts\activate
python main.py
```

### 3. Iniciar o tunnel
```bash
cloudflared tunnel --url http://127.0.0.1:5000
```

### 4. Configurar no Content Studio
- Acesse `Settings` â†’ Cole a URL do cloudflared â†’ Testar conexÃ£o

## ðŸ“ Estrutura

```
AgenteEscritor/
â”œâ”€â”€ index.html          # PÃ¡gina de login
â”œâ”€â”€ app.html            # Workspace principal
â”œâ”€â”€ settings.html       # ConfiguraÃ§Ãµes
â”œâ”€â”€ css/
â”‚   â””â”€â”€ style.css       # Design system completo
â”œâ”€â”€ js/
â”‚   â”œâ”€â”€ auth.js         # AutenticaÃ§Ã£o client-side
â”‚   â””â”€â”€ app.js          # LÃ³gica do workspace
â””â”€â”€ README.md
```

## ðŸ”‘ Primeiro Acesso

- **UsuÃ¡rio:** `admin`
- **Senha:** `admin123`
- âš ï¸ Altere a senha em **ConfiguraÃ§Ãµes** apÃ³s o primeiro login!

---
*Content Studio â€” Dr. Paulo GuimarÃ£es Jr.*


