import type { NextApiRequest, NextApiResponse } from 'next';

const VT_UPSTREAM = 'https://transfer.layerzero-api.com/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const segments = Array.isArray(path) ? path.join('/') : path ?? '';
  const queryString = new URL(req.url!, `http://${req.headers.host}`).search;
  const upstreamUrl = `${VT_UPSTREAM}/${segments}${queryString}`;

  const apiKey = process.env.VT_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'VT_API_KEY not configured' });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });

  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  res.setHeader('Content-Type', contentType);
  res.status(upstream.status);

  const body = await upstream.text();
  res.send(body);
}
