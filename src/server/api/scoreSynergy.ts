import { scoreSynergy } from '../../lib/services/synergyScoring';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { queryId, queryText, structuredPayload, userId } = req.body;
  if (!queryId || !queryText || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await scoreSynergy({ queryId, queryText, structuredPayload, userId });
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Synergy scoring error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 