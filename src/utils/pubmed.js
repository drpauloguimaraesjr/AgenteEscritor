// ─── NCBI E-utilities (PubMed) ───
const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export async function searchPubMed(query, { maxResults = 8, apiKey = '' } = {}) {
  const key = apiKey ? `&api_key=${apiKey}` : '';
  const searchRes = await fetch(
    `${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance${key}`
  );
  if (!searchRes.ok) throw new Error('PubMed: busca falhou');
  const { esearchresult } = await searchRes.json();
  const ids = esearchresult?.idlist || [];
  if (!ids.length) return [];

  const summaryRes = await fetch(
    `${BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json${key}`
  );
  if (!summaryRes.ok) throw new Error('PubMed: sumário falhou');
  const { result } = await summaryRes.json();

  return ids.map(id => {
    const a = result?.[id];
    if (!a || a.error) return null;
    const allAuthors = a.authors || [];
    const shown = allAuthors.slice(0, 3).map(x => x.name).join(', ');
    const authors = shown + (allAuthors.length > 3 ? ' et al.' : '');
    return {
      pmid: id,
      title: (a.title || '').replace(/\.$/, ''),
      authors,
      journal: a.source || '',
      year: (a.pubdate || '').substring(0, 4),
      volume: a.volume || '',
      issue: a.issue || '',
      pages: a.pages || '',
      doi: (a.elocationid || '').replace('doi: ', '').trim(),
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    };
  }).filter(Boolean);
}

export function formatCitation(ref) {
  let c = '';
  if (ref.authors) c += ref.authors + '. ';
  c += ref.title + '. ';
  c += ref.journal;
  if (ref.year) c += '. ' + ref.year;
  if (ref.volume) {
    c += ';' + ref.volume;
    if (ref.issue) c += '(' + ref.issue + ')';
  }
  if (ref.pages) c += ':' + ref.pages;
  c += '. PMID: ' + ref.pmid;
  if (ref.doi) c += '. DOI: ' + ref.doi;
  return c;
}
