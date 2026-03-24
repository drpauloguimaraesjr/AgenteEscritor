import { useRef } from 'react';
import { useStore } from '../store/index.js';
import { searchKnowledge } from './useIPAgent.js';
import { storage } from '../utils/storage.js';
import { searchPubMed, formatCitation } from '../utils/pubmed.js';

// ─── Dr. Paulo system prompt ───
const SYSTEM_PROMPT = `Você é o Assistente IA do Creative Studio do Dr. Paulo Guimarães. Você opera com DUAS bases de conhecimento:

📘 BASE CLÍNICA (RAG): Artigos científicos, estudos clínicos, guidelines, dados de consultas
🎤 BASE DE VOZ (DNA de Estilo): Tom, vocabulário, estrutura textual, ganchos virais

═══ REGRA 1: BRIEFING ANTES DE GERAR ═══
Na PRIMEIRA mensagem sobre um tema novo, NÃO gere texto. Faça perguntas:
1. Estrutura: roteiro narrado, lista, storytelling, caso clínico, mito vs verdade?
2. Gancho viral: provocativo, educativo, emocional ou curiosidade?
3. Duração do vídeo: 30s, 1min, 3min, 5min, 10min+?
4. Público: pacientes leigos, profissionais de saúde, ou ambos?
5. Tom: formal, acessível, provocativo, motivacional?
6. CTA: agendar consulta, seguir perfil, compartilhar?

Só gere após respostas OU se pedir "gere agora" / "faça direto".

═══ REGRA 2: SEMPRE USE O CONTEXTO RAG ═══
Se contexto RAG for fornecido, SEMPRE o utilize. Cite estudos com:
- Nome do estudo/revista + ano
- Número de participantes quando disponível
- Conclusão específica (não genérica)

═══ REGRA 3: DNA DE ESTILO — COMO O DR. PAULO ESCREVE ═══

ESTRUTURA OBRIGATÓRIA DO TEXTO:
1. GANCHO VIRAL: Abertura provocativa que desafia o senso comum
2. CONFRONTO: Desmistifica crenças com tom assertivo
3. EVIDÊNCIAS como ARMAS: Cada estudo é uma seção com ### header
4. INSIGHT-CHAVE: Bloco destacado com 💡
5. CONTRAPONTO: Mostra falhas nos estudos/posições antigas
6. FECHAMENTO: Dados numéricos específicos
7. CTA FORTE com 🎯

CARACTERÍSTICAS DO TOM:
- Provocativo mas embasado em evidências
- Frases curtas intercaladas com parágrafos densos
- Perguntas retóricas para engajar
- Dados numéricos específicos
- Linguagem coloquial misturada com termos técnicos

PROIBIDO:
- Texto genérico tipo Wikipedia
- Saudações genéricas
- Tom neutro ou corporativo
- Conclusões vagas sem dados

═══ REGRA 4: SAÍDA ═══
Quando gerar, formate como:
## 📜 SCRIPT COMPLETO
[gancho + seções com ### + insights 💡 + CTA 🎯]`;

async function callOpenRouter(apiKey, model, systemPrompt, messages, signal, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Creative Studio',
        },
        body: JSON.stringify({
          model,
          messages: fullMessages,
          max_tokens: 4096,
          provider: { order: ['Anthropic', 'OpenAI'] },
        }),
        signal,
      });

      if (resp.status === 401) throw new Error('🔑 Chave inválida ou sem saldo no OpenRouter');
      if (resp.status === 429) throw new Error('❌ Rate limit — tente novamente em alguns segundos');
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`❌ Erro de request: HTTP ${resp.status} ${errText.slice(0, 100)}`);
      }

      const d = await resp.json();
      return d.choices?.[0]?.message?.content || '';
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      lastError = e;
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
    }
  }
  throw lastError;
}

async function fallbackToIPAgent(agentUrl, agentApiKey, userMsg, systemPrompt, onToken, signal) {
  const headers = { 'Content-Type': 'application/json' };
  if (agentApiKey) headers['Authorization'] = `Bearer ${agentApiKey}`;
  const payload = {
    topic: systemPrompt + '\n\n' + userMsg,
    query: userMsg, platform: 'youtube', tone: 'educativo', duration: 300, use_rag: true,
  };

  // Try streaming
  try {
    const resp = await fetch(`${agentUrl}/api/content/generate`, {
      method: 'POST', headers, body: JSON.stringify(payload), signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) throw new Error('Not streamable');

    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let full = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value, { stream: true }).split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const d = JSON.parse(line.slice(6));
            if (d.token) { full += d.token; onToken(full); }
          } catch {}
        }
      }
    }
    return { response: full, ragContext: '' };
  } catch (streamErr) {
    if (streamErr.name === 'AbortError') throw streamErr;
  }

  // Sync fallback
  const resp2 = await fetch(`${agentUrl}/api/content/generate-sync`, {
    method: 'POST', headers, body: JSON.stringify(payload),
  });
  const d = await resp2.json();
  return { response: d.content || '❌ ' + (d.error || 'Erro'), ragContext: d.rag_context || '' };
}

export function useAI() {
  const abortRef = useRef(null);
  const store = useStore();

  async function buildRagContext(query) {
    let ctx = '';
    let docCount = 0;
    let source = null; // 'rag' | 'pubmed' | null

    // ── Step A: IPAgent RAG ──
    if (store.useRag && store.agentUrl) {
      try {
        const data = await searchKnowledge(store.agentUrl, store.agentApiKey, query);
        const items = [...(data.consultations || []), ...(data.literature || [])];
        if (items.length) {
          ctx = '## 📚 Base de Conhecimento Clínica (IPAgent)\n\n';
          items.forEach((item, i) => {
            ctx += `### [${i + 1}] ${item.title || 'Documento'}\n`;
            ctx += `${item.snippet || item}\n`;
            if (item.source) ctx += `*Fonte: ${item.source}*\n`;
            ctx += '\n';
          });
          docCount = items.length;
          source = 'rag';
        }
      } catch {
        // IPAgent unreachable — will try PubMed below
      }
    }

    // ── Step B: PubMed fallback — fires when RAG returns nothing ──
    if (!docCount && store.useRag) {
      try {
        const refs = await searchPubMed(query, {
          maxResults: 5,
          apiKey: store.pubmedApiKey || '',
        });
        if (refs.length) {
          ctx = '## 🔬 Referências PubMed (base local sem resultado)\n\n';
          refs.forEach((r, i) => {
            ctx += `### [${i + 1}] ${r.title}\n`;
            ctx += `**Autores:** ${r.authors}\n`;
            ctx += `**Publicação:** ${r.journal}${r.year ? ' · ' + r.year : ''}`;
            if (r.volume) ctx += ` · ${r.volume}${r.issue ? `(${r.issue})` : ''}${r.pages ? `:${r.pages}` : ''}`;
            ctx += '\n';
            ctx += `**PMID:** ${r.pmid} — ${r.url}\n`;
            if (r.doi) ctx += `**DOI:** ${r.doi}\n`;
            ctx += '\n';
          });
          docCount = refs.length;
          source = 'pubmed';
        }
      } catch {
        // PubMed also unavailable — proceed without context
      }
    }

    return { text: ctx, docCount, source };
  }

  async function sendMessage(userMsg, tone, duration, editorContent) {
    if (store.isStreaming) return;

    store.setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    // Add user message
    store.addUserMessage(userMsg);

    // Add placeholder assistant message
    const placeholderId = store.addAssistantMessage('').id;

    try {
      // Step 1: RAG / PubMed context
      const { text: ragText, docCount, source: ragSource } = await buildRagContext(userMsg);

      // Step 2: Build full prompt
      let fullUserMsg = '';
      if (editorContent?.trim()) fullUserMsg += `[TEXTO JÁ EXISTENTE NO EDITOR]\n${editorContent.slice(0, 2000)}\n\n`;
      if (ragText) fullUserMsg += ragText + '\n';

      // Inject Notion style references if the user added any
      const notionStyles = store.notionStyleContext || [];
      if (notionStyles.length > 0) {
        fullUserMsg += '\n\n[DNA DE ESTILO — TEXTOS DE REFERÊNCIA DO AUTOR (NOTION)]\n';
        fullUserMsg += 'Analise o tom, vocabulário, estrutura e estilo destes textos e IMITE na sua geração:\n\n';
        notionStyles.forEach((page, i) => {
          fullUserMsg += `--- Texto ${i + 1}: "${page.title}" ---\n${page.content}\n\n`;
        });
      }

      // Inject PubMed references if the user added any
      const pubmedRefs = store.pubmedContext || [];
      if (pubmedRefs.length > 0) {
        const refBlock = pubmedRefs.map((r, i) =>
          `[${i + 1}] ${formatCitation(r)}\n    URL: ${r.url}`
        ).join('\n');
        fullUserMsg += `\n\n[REFERÊNCIAS PUBMED SELECIONADAS PELO USUÁRIO — use estas citações no roteiro]\n${refBlock}\n`;
      }

      fullUserMsg += `[PEDIDO DO USUÁRIO]\n${userMsg}`;

      const history = store.chatHistory
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      let fullResponse = '';
      let ragContextForPopup = ragText;

      if (store.openrouterKey) {
        // OpenRouter / Claude
        const model = store.openrouterModel;
        try {
          fullResponse = await callOpenRouter(
            store.openrouterKey, model, SYSTEM_PROMPT,
            [...history, { role: 'user', content: fullUserMsg }],
            controller.signal,
          );
          store.updateLastAssistantMessage(fullResponse);
        } catch (e) {
          if (e.name === 'AbortError') {
            fullResponse = '⏹ Geração cancelada.';
          } else if (e.message.includes('🔑') || e.message.includes('❌')) {
            fullResponse = `⚠️ **Conexão com OpenRouter falhou!**\n\n${e.message}\n\nVerifique as Configurações e confirme se sua conta tem saldo.`;
          } else {
            // Fallback to IPAgent
            if (store.agentUrl) {
              const result = await fallbackToIPAgent(
                store.agentUrl, store.agentApiKey, fullUserMsg, SYSTEM_PROMPT,
                (partial) => store.updateLastAssistantMessage(partial),
                controller.signal,
              );
              fullResponse = result.response;
              ragContextForPopup = ragContextForPopup || result.ragContext;
            } else {
              fullResponse = '⚠️ Configure o OpenRouter ou o IPagent local em Configurações.';
            }
          }
          store.updateLastAssistantMessage(fullResponse);
        }
      } else if (store.agentUrl) {
        // IPAgent only
        const result = await fallbackToIPAgent(
          store.agentUrl, store.agentApiKey, fullUserMsg, SYSTEM_PROMPT,
          (partial) => store.updateLastAssistantMessage(partial),
          controller.signal,
        );
        fullResponse = result.response;
        ragContextForPopup = ragContextForPopup || result.ragContext;
        store.updateLastAssistantMessage(fullResponse);
      } else {
        fullResponse = '⚠️ Configure o OpenRouter em ⚙️ Configurações para usar o agente IA.';
        store.updateLastAssistantMessage(fullResponse);
      }

      // Save ragContext on the message
      const finalHistory = store.chatHistory.map(m =>
        m.id === placeholderId
          ? { ...m, content: fullResponse, ragContext: ragContextForPopup, ragUsed: !!ragText, ragDocCount: docCount, ragSource }
          : m
      );
      const pid = store.currentProjectId;
      if (pid) storage.saveChatHistory(pid, finalHistory);
      useStore.setState({ chatHistory: finalHistory });

      // Save training pair
      if (store.openrouterKey && fullResponse && !fullResponse.startsWith('⏹') && !fullResponse.startsWith('⚠️')) {
        storage.appendTraining({ instruction: userMsg, input: ragText, output: fullResponse });
      }

    } catch (e) {
      if (e.name !== 'AbortError') {
        store.updateLastAssistantMessage('❌ Erro inesperado: ' + e.message);
      }
    } finally {
      store.setStreaming(false);
      abortRef.current = null;
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
    store.setStreaming(false);
  }

  return { sendMessage, stopGeneration };
}
