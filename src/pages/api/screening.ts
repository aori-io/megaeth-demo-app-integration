import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const address = req.query.address as string | undefined;
  if (!address) {
    return res.status(400).json({ error: 'Missing address query param' });
  }

  const apiKey = process.env.CHAINALYSIS_API_KEY;
  if (!apiKey) {
    console.error('CHAINALYSIS_API_KEY not set');
    return res.status(200).json({ allowed: true });
  }

  try {
    const response = await fetch(
      `https://public.chainalysis.com/api/v1/address/${address}`,
      { headers: { 'X-API-Key': apiKey, Accept: 'application/json' } },
    );

    if (!response.ok) {
      console.error(`Chainalysis API error: ${response.status}`);
      return res.status(200).json({ allowed: true });
    }

    const data: { identifications: unknown[] } = await response.json();
    const allowed = data.identifications.length === 0;

    return res.status(200).json({ allowed });
  } catch (error) {
    console.error('Chainalysis API request failed:', error);
    return res.status(200).json({ allowed: true });
  }
}
