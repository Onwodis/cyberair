import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { retrieveRagContext } from '@/lib/ragSearch';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-change-this'
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // 1. Verify Admin Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('sec_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { urlA, urlB, auditData } = await req.json();

    // 2. Retrieve RAG Context using Jina AI Embeddings
    const ragContext = await retrieveRagContext(
      'Evaluate UI/UX visual aesthetics, design modernity, layout responsiveness, and security posture'
    );

    // 3. Prompt OpenAI with retrieved RAG context
    const systemPrompt = `
You are a strict, elite UX Design Director and Principal Security Architect. 
Evaluate the target web applications based on their actual visual aesthetics, modern design standards, layout professionalism, and security posture. 
Do not give inflated scores if a site looks outdated, cluttered, or poorly designed, even if its underlying HTML tags are valid.

Use the following retrieved RAG guidelines:
${ragContext}

Respond strictly in valid JSON format matching this exact schema:
{
  "aestheticsScore": number (1 to 100, penalize severely for outdated design),
  "responsivenessScore": number (1 to 100),
  "securityScore": number (1 to 100),
  "summary": "Detailed executive critique comparing visual design, UX flaws, and security posture.",
  "recommendations": ["Actionable design/security recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3"]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Target A: ${urlA}\nTarget B: ${
            urlB || 'N/A'
          }\nAudit Data & Metadata: ${JSON.stringify(auditData)}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');
    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'AI RAG evaluation failed.' },
      { status: 500 }
    );
  }
}
