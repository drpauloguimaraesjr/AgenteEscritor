# 🧠 Content Studio — AgenteEscritor

**Plataforma de geração de conteúdo médico com IA local.**

Cria scripts profissionais para **YouTube**, **Instagram Reels** e **Carrosséis**, usando sua base de consultas como referência para conteúdo autêntico e cientificamente embasado.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────┐
│  Digital Ocean (Static Site)                │
│  ┌───────────┐ ┌──────────┐ ┌───────────┐  │
│  │   Login   │ │Workspace │ │  Settings  │  │
│  └───────────┘ └────┬─────┘ └───────────┘  │
│                     │                        │
└─────────────────────┼────────────────────────┘
                      │ HTTPS (tunnel)
┌─────────────────────┼────────────────────────┐
│  Seu Computador     │                        │
│  ┌──────────────────▼─────────────────────┐  │
│  │  IPagent (Flask + Llama 3.2)           │  │
│  │  ├── RAG (SQLite FTS5)                 │  │
│  │  ├── 2574 consultas indexadas          │  │
│  │  └── API de geração de conteúdo        │  │
│  └────────────────────────────────────────┘  │
│  ┌──────────────────────────┐                │
│  │  ngrok / Cloudflare      │                │
│  │  Expõe API via HTTPS     │                │
│  └──────────────────────────┘                │
└──────────────────────────────────────────────┘
```

## ✨ Funcionalidades

- 🔐 **Login** — Autenticação multi-usuário
- ✍️ **Editor de texto** — Estilo lousa (contenteditable), com formatação
- 🤖 **Painel IA** — Gera scripts com streaming em tempo real
- 📂 **Projetos** — Salvar, organizar e buscar documentos gerados
- 📥📤 **Import/Export** — Backup de projetos em JSON
- 💾 **Auto-save** — Salva automaticamente enquanto você escreve
- 📊 **RAG** — Usa suas consultas reais para embasar o conteúdo
- ⌨️ **Atalhos** — Ctrl+S (salvar), Ctrl+N (novo), Ctrl+Enter (gerar)

## 🎨 Design

- Cores: Amber/Gold (`hsl(45, 80%, 55%)`) + dark warm
- Fontes: **Playfair Display** (títulos) + **Inter** (corpo) + **JetBrains Mono** (código)
- Baseado no [DiretorioSystemDesign](https://github.com/drpauloguimaraesjr/DiretorioSystemDesign)

## 🚀 Deploy no Digital Ocean

1. Conectar este repo ao Digital Ocean App Platform
2. Escolher: **Static Site**
3. Build Command: *vazio* (é estático)
4. Output Directory: `/`

## 🔧 Configuração do Agente Local

### 1. Instalar ngrok
```bash
# Windows
winget install ngrok
```

### 2. Iniciar o IPagent
```bash
cd ipagent
.\venv\Scripts\activate
python main.py
```

### 3. Iniciar o tunnel
```bash
ngrok http 5000
```

### 4. Configurar no Content Studio
- Acesse `Settings` → Cole a URL do ngrok → Testar conexão

## 📁 Estrutura

```
AgenteEscritor/
├── index.html          # Página de login
├── app.html            # Workspace principal
├── settings.html       # Configurações
├── css/
│   └── style.css       # Design system completo
├── js/
│   ├── auth.js         # Autenticação client-side
│   └── app.js          # Lógica do workspace
└── README.md
```

## 🔑 Primeiro Acesso

- **Usuário:** `admin`
- **Senha:** `admin123`
- ⚠️ Altere a senha em **Configurações** após o primeiro login!

---
*Content Studio — Dr. Paulo Guimarães Jr.*
