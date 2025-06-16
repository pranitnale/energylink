import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY!);

// Rubric prompt template (shortened for brevity, use full from markdown in production)
const RUBRIC_PROMPT = `SYSTEM\nYou are EnergyLink-Scorer v2, an impartial evaluation engine. ... (full rubric here) ...\nQUERY:\n{{QUERY_JSON}}\nCANDIDATES:\n{{CANDIDATES_JSON}}`;

export async function scoreSynergy({ queryId, queryText, structuredPayload, userId }: {
  queryId: string;
  queryText: string;
  structuredPayload: any;
  userId: string;
}) {
  // 1. Fetch candidate profiles
  const { data: candidates, error: profilesError } = await supabase
    .from('profiles')
    .select('id, region_tags, tech_tags, certifications, experience');
  if (profilesError) throw profilesError;

  // 2. Build prompt
  const prompt = RUBRIC_PROMPT
    .replace('{{QUERY_JSON}}', JSON.stringify(structuredPayload || { query: queryText }))
    .replace('{{CANDIDATES_JSON}}', JSON.stringify(
      candidates.map((c: any) => ({
        candidate_id: c.id,
        region_tags: c.region_tags,
        tech_tags: c.tech_tags,
        certifications: c.certifications,
        experience: c.experience,
      }))
    ));

  // 3. Call Gemini
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const responseText = response.text();
  console.log('Gemini request:', prompt);
  console.log('Gemini response:', responseText);

  // 4. Parse Gemini response
  let matches;
  try {
    matches = JSON.parse(responseText.replace(/```json\n?|```/g, '').trim());
  } catch (e) {
    throw new Error('Failed to parse Gemini response: ' + responseText);
  }

  // 5. Store in query_matches
  const topScores = matches.slice(0, 20).map((m: any) => m.score);
  const { error: insertError } = await supabase
    .from('query_matches')
    .insert({
      query_id: queryId,
      matches: matches,
      top_scores: topScores,
    });
  if (insertError) throw insertError;

  return { matches, topScores };
} 