import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function formatContent(text) {
  if (!text) return '';
  try { return marked.parse(text); }
  catch { return text.replace(/\n/g, '<br>'); }
}
