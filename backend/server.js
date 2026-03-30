require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL = process.env.ESCRITOR_MODEL_ID || 'anthropic/claude-sonnet-4-20250514';

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model, system } = req.body;

        const fullMessages = [
            { role: "system", content: system },
            ...messages
        ];
        
        // Usamos fetch nativo (Node 18+)
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://docwriter-c55d1.firebaseapp.com', // Firebase Domain
                'X-Title': 'Creative Studio'
            },
            body: JSON.stringify({
                model: model || DEFAULT_MODEL,
                max_tokens: 4096,
                messages: fullMessages
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error("Erro na integração:", error);
        res.status(500).json({ error: 'Erro interno no servidor de IA' });
    }
});

app.get('/', (req, res) => res.json({
    service: 'Agente Escritor',
    status: 'online',
    model: DEFAULT_MODEL,
    provider: 'openrouter'
}));

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
