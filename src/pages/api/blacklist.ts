import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface BlacklistEntry {
  address: string;
  blocked: boolean;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const address = req.query.address as string | undefined;
  if (!address) {
    return res.status(400).json({ error: 'Missing address query param' });
  }

  const dbPath = path.join(process.cwd(), 'data', 'blacklist.json');
  const db: BlacklistEntry[] = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const entry = db.find((e) => e.address.toLowerCase() === address.toLowerCase());

  return res.status(200).json({ blocked: entry?.blocked ?? false });
}
