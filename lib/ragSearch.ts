import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const KNOWLEDGE_BASE = [
  {
    topic: 'Modern UI/UX & Visual Aesthetics',
    content:
      'Professional web design requires clean visual hierarchy, modern CSS layouts (Flexbox/Grid), legible typography, balanced whitespace, and high-contrast color palettes. Outdated 2000s skeuomorphic styling, raw unstyled HTML tables, and cluttered layouts severely degrade user trust.',
  },
  {
    topic: 'Responsive Layout Principles',
    content:
      'A professional application must be fully responsive across mobile, tablet, and desktop viewports without horizontal scrolling or broken DOM elements.',
  },
  {
    topic: 'Content Security Policy (CSP) & Headers',
    content:
      'Enterprise security standards mandate strict Content Security Policies, HSTS with long max-age durations, and robust clickjacking protections.',
  },
  {
    topic: 'Rate Limiting & Abuse Defense',
    content:
      'Production systems must protect endpoints against high-concurrency request floods and automated credential stuffing.',
  },
];

async function getJinaEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'jina-embeddings-v3',
        task: 'retrieval.passage',
        dimensions: 1024,
        embedding_type: 'float',
        input: [text],
      }),
    });

    const data = await response.json();
    return data.data?.[0]?.embedding || new Array(1024).fill(0);
  } catch (error) {
    return new Array(1024).fill(0);
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return normA && normB
    ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
    : 0;
}

export async function retrieveRagContext(query: string): Promise<string> {
  try {
    const queryEmbedding = await getJinaEmbedding(query);

    const scoredDocs = await Promise.all(
      KNOWLEDGE_BASE.map(async (doc) => {
        const docEmbedding = await getJinaEmbedding(doc.content);
        const score = cosineSimilarity(queryEmbedding, docEmbedding);
        return { content: doc.content, score };
      })
    );

    scoredDocs.sort((a, b) => b.score - a.score);
    return scoredDocs
      .slice(0, 2)
      .map((d) => d.content)
      .join('\n\n');
  } catch (error) {
    return KNOWLEDGE_BASE.map((d) => d.content).join('\n\n');
  }
}
