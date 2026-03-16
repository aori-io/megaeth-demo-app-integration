import type { NextApiRequest, NextApiResponse } from 'next';

const RPC_URLS: Record<string, string | undefined> = {
  '1': process.env.ETHEREUM_RPC_URL,
  '10': process.env.OPTIMISM_RPC_URL,
  '8453': process.env.BASE_RPC_URL,
  '42161': process.env.ARBITRUM_RPC_URL,
  '143': process.env.MONAD_RPC_URL,
  '4326': process.env.MEGAETH_RPC_URL,
  '9745': process.env.PLASMA_RPC_URL,
  '56': process.env.BSC_RPC_URL,
};

const ENV_VAR_NAMES: Record<string, string> = {
  '1': 'ETHEREUM_RPC_URL',
  '10': 'OPTIMISM_RPC_URL',
  '8453': 'BASE_RPC_URL',
  '42161': 'ARBITRUM_RPC_URL',
  '143': 'MONAD_RPC_URL',
  '4326': 'MEGAETH_RPC_URL',
  '9745': 'PLASMA_RPC_URL',
  '56': 'BSC_RPC_URL',
};

async function fetchWithRetry(url: string, body: unknown, retries = 3): Promise<unknown> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5_000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
    }
  }
  throw new Error('Max retries exceeded');
}

function jsonRpcError(res: NextApiResponse, id: unknown, code: number, message: string) {
  return res.status(200).json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const chainId = req.query.chainId as string;
  const rpcUrl = RPC_URLS[chainId];

  if (!rpcUrl) {
    const envVar = ENV_VAR_NAMES[chainId] ?? 'UNKNOWN';
    console.error(`RPC not configured for chain ${chainId} — set ${envVar}`);
    return jsonRpcError(res, null, -32603, `RPC not configured for chain ${chainId}. Set ${envVar} in environment variables.`);
  }

  try {
    const data = await fetchWithRetry(rpcUrl, req.body, 3);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (error) {
    console.error(`RPC proxy error for chain ${chainId}:`, error);
    return jsonRpcError(res, null, -32603, error instanceof Error ? error.message : 'RPC request failed');
  }
}
