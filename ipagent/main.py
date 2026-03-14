# coding=utf-8
"""
IPagent - Local AI Content Agent for Creative Studio
Flask server with SQLite FTS5 RAG on port 5000
"""
import os, json, sqlite3, re, sys
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), "knowledge.db")
DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "dataset_finetunning", "dataset_completo.jsonl")
STYLE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "style-references.json")
PDF_DIR = os.path.join(os.path.expanduser("~"), "Desktop", "artigos cientificos")

agent_ready = False
knowledge_count = 0

# ─── DATABASE ───────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    global agent_ready, knowledge_count
    print("[IPagent] Inicializando banco de dados...")
    conn = get_db()
    c = conn.cursor()

    # Create FTS5 table
    c.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS knowledge USING fts5(
            title, content, source, doc_type, tokenize='unicode61'
        )
    """)

    # Check if already indexed
    count = c.execute("SELECT COUNT(*) FROM knowledge").fetchone()[0]
    if count > 0:
        knowledge_count = count
        agent_ready = True
        print(f"[IPagent] Base ja indexada: {count} documentos")
        conn.close()
        return

    print("[IPagent] Indexando base de conhecimento...")
    indexed = 0

    # 1. Index dataset_completo.jsonl (2152 consultas)
    if os.path.exists(DATASET_PATH):
        print(f"[IPagent] Lendo dataset: {DATASET_PATH}")
        with open(DATASET_PATH, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    obj = json.loads(line.strip())
                    title = obj.get("arquivo_origem", "consulta")
                    tipo = obj.get("tipo", "")
                    instruction = obj.get("instruction", "")
                    output = obj.get("output", "")
                    content = f"{instruction}\n\n{output}"
                    c.execute("INSERT INTO knowledge(title, content, source, doc_type) VALUES (?, ?, ?, ?)",
                              (title, content, "dataset", tipo))
                    indexed += 1
                except:
                    pass
        print(f"[IPagent] Dataset: {indexed} registros indexados")

    # 2. Index style references
    if os.path.exists(STYLE_PATH):
        with open(STYLE_PATH, "r", encoding="utf-8") as f:
            style = json.load(f)
        refs = style.get("references", [])
        for ref in refs:
            title = ref.get("title", "referencia")
            content = ref.get("content", "")
            if content:
                c.execute("INSERT INTO knowledge(title, content, source, doc_type) VALUES (?, ?, ?, ?)",
                          (title, content, "style_reference", "roteiro"))
                indexed += 1
        # Also index style analysis
        analysis = style.get("styleAnalysis", {})
        if analysis:
            style_text = json.dumps(analysis, ensure_ascii=False, indent=2)
            c.execute("INSERT INTO knowledge(title, content, source, doc_type) VALUES (?, ?, ?, ?)",
                      ("DNA de Estilo - Dr Paulo Guimaraes", style_text, "style_reference", "estilo"))
            indexed += 1
        print(f"[IPagent] Estilo: {len(refs)+1} registros indexados")

    # 3. Try to index PDFs (basic text extraction)
    pdf_count = 0
    if os.path.exists(PDF_DIR):
        try:
            from PyPDF2 import PdfReader
            pdf_files = [f for f in os.listdir(PDF_DIR) if f.lower().endswith(".pdf")]
            print(f"[IPagent] Processando {len(pdf_files)} PDFs...")
            for fname in pdf_files:
                try:
                    fpath = os.path.join(PDF_DIR, fname)
                    reader = PdfReader(fpath)
                    text = ""
                    for page in reader.pages[:20]:  # Max 20 pages per PDF
                        t = page.extract_text()
                        if t:
                            text += t + "\n"
                    if len(text.strip()) > 100:
                        # Chunk long texts (max ~2000 chars per chunk)
                        chunks = [text[i:i+2000] for i in range(0, len(text), 1800)]
                        for ci, chunk in enumerate(chunks[:10]):  # Max 10 chunks per PDF
                            c.execute("INSERT INTO knowledge(title, content, source, doc_type) VALUES (?, ?, ?, ?)",
                                      (f"{fname} (parte {ci+1})", chunk, "artigo_pdf", "artigo_cientifico"))
                            indexed += 1
                        pdf_count += 1
                except Exception as e:
                    pass  # Skip problematic PDFs silently
            print(f"[IPagent] PDFs: {pdf_count} artigos processados")
        except ImportError:
            print("[IPagent] PyPDF2 nao instalado, pulando PDFs")

    conn.commit()
    conn.close()
    knowledge_count = indexed
    agent_ready = True
    print(f"[IPagent] ✅ Base pronta! {indexed} documentos indexados.")

# ─── RAG SEARCH ─────────────────────────────────────────
def search_knowledge(query, limit=10):
    """Search knowledge base using FTS5"""
    conn = get_db()
    # Clean query for FTS5
    clean = re.sub(r'[^\w\sáàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]', ' ', query)
    tokens = clean.split()
    if not tokens:
        return []
    
    # Build FTS5 query with OR for flexibility
    fts_query = " OR ".join(tokens[:15])  # Max 15 tokens
    
    try:
        rows = conn.execute("""
            SELECT title, snippet(knowledge, 1, '>>>', '<<<', '...', 80) as snippet, 
                   source, doc_type, rank
            FROM knowledge
            WHERE knowledge MATCH ?
            ORDER BY rank
            LIMIT ?
        """, (fts_query, limit)).fetchall()
        results = [dict(r) for r in rows]
    except:
        results = []
    conn.close()
    return results

# ─── STYLE DNA ──────────────────────────────────────────
def get_style_dna():
    if os.path.exists(STYLE_PATH):
        with open(STYLE_PATH, "r", encoding="utf-8") as f:
            style = json.load(f)
        return style.get("styleAnalysis", {})
    return {}

# ─── API ROUTES ─────────────────────────────────────────
@app.route("/api/content/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "agent_ready": agent_ready,
        "knowledge_count": knowledge_count,
        "version": "1.0.0"
    })

@app.route("/api/content/search", methods=["POST"])
def api_search():
    data = request.get_json(force=True)
    query = data.get("query", "")
    limit = data.get("limit", 10)
    results = search_knowledge(query, limit)
    return jsonify({"results": results, "count": len(results)})

@app.route("/api/content/generate", methods=["POST"])
def api_generate():
    """Generate content using RAG context. 
    Returns context + style for the frontend to send to OpenRouter."""
    data = request.get_json(force=True)
    prompt = data.get("prompt", "")
    platform = data.get("platform", "youtube")
    tone = data.get("tone", "educativo")
    use_rag = data.get("use_rag", True)
    
    # Search for relevant context
    context_docs = []
    if use_rag and prompt:
        context_docs = search_knowledge(prompt, limit=8)
    
    # Build RAG context
    rag_context = ""
    if context_docs:
        rag_context = "CONTEXTO DA BASE DE CONHECIMENTO:\n\n"
        for i, doc in enumerate(context_docs, 1):
            rag_context += f"[{i}] {doc['title']}\n{doc['snippet']}\n\n"
    
    # Get style DNA
    style = get_style_dna()
    style_prompt = ""
    if style:
        style_prompt = f"""
ESTILO DE ESCRITA DO DR. PAULO:
- Tom: {style.get('tone', '')}
- Estrutura: {'; '.join(style.get('structure', [])[:4])}
- Caracteristicas: {'; '.join(style.get('characteristics', [])[:5])}
- Evitar: {'; '.join(style.get('avoidPatterns', [])[:3])}
"""

    # Platform instructions
    platform_map = {
        "youtube": "Script completo para video YouTube com gancho, desenvolvimento e CTA.",
        "instagram": "Script curto e impactante para Reels/Stories (max 60s de fala).",
        "carousel": "Texto para carrossel Instagram: 1 frase impactante por slide, 8-10 slides."
    }
    platform_inst = platform_map.get(platform, platform_map["youtube"])
    
    # Build the enhanced system prompt
    system_prompt = f"""Voce e o ghostwriter do Dr. Paulo Guimaraes Jr, medico especialista em hormonios, metabolismo e longevidade.

{style_prompt}

PLATAFORMA: {platform} — {platform_inst}
TOM: {tone}

{rag_context}

INSTRUCOES:
1. Use EXCLUSIVAMENTE o contexto fornecido como base cientifica
2. Cite estudos pelo nome quando possivel (revista, ano, N de participantes)
3. Mantenha o tom {tone} do Dr. Paulo
4. Inclua gancho viral no inicio e CTA no final
5. Use dados numericos especificos sempre que disponiveis
6. Frases curtas e impactantes intercaladas com paragrafos densos
"""

    return jsonify({
        "system_prompt": system_prompt,
        "rag_context": rag_context,
        "context_count": len(context_docs),
        "style": style,
        "platform": platform
    })

@app.route("/api/content/stats", methods=["GET"])
def api_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM knowledge").fetchone()[0]
    by_type = conn.execute("""
        SELECT doc_type, COUNT(*) as cnt FROM knowledge 
        GROUP BY doc_type ORDER BY cnt DESC
    """).fetchall()
    conn.close()
    return jsonify({
        "total": total,
        "by_type": {r[0]: r[1] for r in by_type}
    })



# ─── COMPATIBILITY ROUTES (match chat.js frontend) ───────
@app.route("/api/knowledge/search", methods=["POST"])
def api_knowledge_search():
    """Endpoint called by chat.js for RAG context"""
    data = request.get_json(force=True)
    query = data.get("query", "")
    n = data.get("n_results", 5)
    results = search_knowledge(query, n)
    
    # Format into consultations + literature as chat.js expects
    consultations = []
    literature = []
    for r in results:
        text = f"{r['title']}\n{r['snippet']}"
        if r.get('doc_type') in ('artigo_cientifico', 'roteiro'):
            literature.append(text)
        else:
            consultations.append(text)
    
    return jsonify({
        "consultations": consultations,
        "literature": literature,
        "total": len(results)
    })

@app.route("/api/content/generate-sync", methods=["POST"])
def api_generate_sync():
    """Sync generation endpoint - returns RAG context as formatted text"""
    data = request.get_json(force=True)
    topic = data.get("topic", "")
    platform = data.get("platform", "youtube")
    tone = data.get("tone", "educativo")
    
    # Extract user query from topic
    query = topic.split("[PEDIDO DO USUÁRIO]")[-1].strip() if "[PEDIDO DO USUÁRIO]" in topic else topic[-500:]
    
    results = search_knowledge(query, 8)
    style = get_style_dna()
    
    if not results:
        return jsonify({"content": "Não encontrei informações relevantes na base de conhecimento para este tema. Tente reformular a busca ou configure o OpenRouter para geração com IA."})
    
    # Build a formatted response from RAG results
    response = "## 📚 Contexto encontrado na base de conhecimento\n\n"
    response += f"Encontrei **{len(results)} documentos** relevantes:\n\n"
    
    for i, r in enumerate(results, 1):
        response += f"### [{i}] {r['title']}\n"
        response += f"{r['snippet']}\n"
        response += f"*Fonte: {r.get('source', 'N/A')} | Tipo: {r.get('doc_type', 'N/A')}*\n\n"
    
    response += "---\n\n"
    response += "💡 **Para gerar o script completo**, configure a chave do OpenRouter em ⚙️ Configurações.\n"
    response += "O sistema usará este contexto RAG + o DNA de estilo do Dr. Paulo para criar o conteúdo."
    
    return jsonify({"content": response})

# ─── STARTUP ────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  IPagent - Content Studio Local Agent")
    print("=" * 50)
    init_db()
    print(f"\n🚀 Servidor rodando em http://127.0.0.1:5050")
    print(f"   Ctrl+C para parar\n")
    app.run(host="0.0.0.0", port=5050, debug=False)
