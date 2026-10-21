import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';
import { connectToDatabase } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { validateAndSanitizeUrl } from '@/lib/validateUrl';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-change-this'
);

// Configure high-capacity agents to prevent socket exhaustion during load testing
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 500 });
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 500 });

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sec_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();
    const {
      targetUrl,
      requestsCount = 150,
      concurrency = 50,
    } = await req.json();

    const sanitizedUrl = validateAndSanitizeUrl(targetUrl);
    if (!sanitizedUrl) {
      return NextResponse.json(
        { error: 'Invalid or restricted target URL.' },
        { status: 400 }
      );
    }

    const totalRequests = Math.min(
      Math.max(Number(requestsCount) || 150, 20),
      500
    );
    const concurrentBatchSize = Math.min(
      Math.max(Number(concurrency) || 50, 10),
      100
    );

    let completed = 0;
    let successful = 0;
    let rateLimited = 0;
    let failed = 0;
    let timeouts = 0;
    let totalLatency = 0;

    const fireRequest = () => {
      return new Promise<void>((resolve) => {
        const start = Date.now();
        const isHttps = sanitizedUrl.startsWith('https');
        const client = isHttps ? https : http;
        const agent = isHttps ? httpsAgent : httpAgent;

        const request = client.request(
          sanitizedUrl,
          {
            method: 'GET',
            timeout: 4000,
            agent,
            headers: {
              'User-Agent': 'CyberSentinel-HeavyLoadTester/3.0',
              'Cache-Control': 'no-cache, no-store',
              Pragma: 'no-cache',
              Connection: 'keep-alive',
            },
          },
          (res) => {
            const duration = Date.now() - start;
            totalLatency += duration;
            completed++;

            if (res.statusCode === 429) {
              rateLimited++;
            } else if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 400
            ) {
              successful++;
            } else {
              failed++;
            }
            res.resume(); // Consume response data to free up memory
            resolve();
          }
        );

        request.on('error', () => {
          completed++;
          failed++;
          resolve();
        });

        request.on('timeout', () => {
          request.destroy();
          completed++;
          timeouts++;
          failed++;
          resolve();
        });

        request.end();
      });
    };

    // Fire requests in high-speed parallel batches
    for (let i = 0; i < totalRequests; i += concurrentBatchSize) {
      const batch: Promise<void>[] = [];
      const currentBatchCount = Math.min(
        concurrentBatchSize,
        totalRequests - i
      );

      for (let j = 0; j < currentBatchCount; j++) {
        batch.push(fireRequest());
      }

      await Promise.all(batch);
    }

    const avgLatency = completed > 0 ? Math.round(totalLatency / completed) : 0;
    const siteCrashedOrInaccessible =
      timeouts > totalRequests * 0.25 || failed > totalRequests * 0.4;

    return NextResponse.json({
      success: true,
      stats: {
        totalRequests,
        successful,
        rateLimited,
        failed,
        timeouts,
        avgLatencyMs: avgLatency,
        siteInaccessible: siteCrashedOrInaccessible,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Stress test failed.' },
      { status: 500 }
    );
  }
}
