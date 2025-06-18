// Setup type definitions for built-in Supabase Runtime APIs OG
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
serve(async (req)=>{
  try {
    const { queryId, queryText, structuredPayload, userId } = await req.json();
    // 1. Connect to Supabase
    const supabase = createClient(Deno.env.get('SDB_URL'), Deno.env.get('SDB_SERVICE_ROLE_KEY'));
    // 2. Fetch all candidate profiles
    const { data: candidates, error: profilesError } = await supabase.from('profiles').select('id, region_tags, tech_tags, certifications, experience');
    if (profilesError) throw profilesError;
    // 3. Build Gemini prompt (full rubric)
    const RUBRIC_PROMPT = `SYSTEM
You are EnergyLink-Scorer v2, an impartial evaluation engine.
Your sole task is to score how well each *candidate* fits the *seeker’s query*
using ONLY the four dimensions defined below.  
Return STRICT JSON – **an array of objects**, one per candidate, NO extra keys,
NO commentary outside the JSON, and do not pretty-print (minified).

For each candidate in the list, compute raw 0-5 per dimension, then Synergy 0-100 as per rubric. 
Return an array of JSON objects exactly matching the schema. Do NOT add prose.

###############################################################################

# DIMENSIONS & DEFAULT WEIGHTS

###############################################################################
E  Experience         – semantic similarity between query need and the
                        candidate’s project *experience* text.   • weight 35 %
T  Technical expertise – semantic technical expertise overlap between \`tech_tags\` lists.  • weight 35 %
C  Certifications      – whether candidate satisfies any certification needs   • weight 15 %
                        named in the query.
R  Region fit          – overlap of region mention in query and \`region_tags\`.               • weight 15 %

### Automatic weight rebalance

If the seeker omits a dimension (e.g. no certifications requested),
redistribute its weight *pro-rata* to the remaining dimensions so the summed
weight stays 100 %.

###############################################################################

# RAW 0-TO-5 SCORE ANCHORS

###############################################################################
*E – Experience*  
0 NONE relevant keywords   1 vague   2 one small similar project    
3 ≥1 medium project OR 1 large   4 direct analogue   5 multiple direct analogues & leadership  

*T – Tech-tags*  
match_ratio = |intersection| / |required|  
0→5 scale: 0 (none) · 1 (≤25 %) · 2 (≤50 %) · 3 (<100 %) · 4 (all) · 5 (all + extra)

*C – Certifications*  
0 none   2 some optional   4 all mandatory   5 mandatory + extras  

*R – Region*  
0 none   2 same continent/market bloc   4 same country   5 same state/zone  

###############################################################################

# SCORE → PERCENT

###############################################################################
For every present dimension d  
  weighted_d = (raw_d / 5) × ( effective_weight_d / 100 )  
Synergy = Σ weighted_d × 100  (round to nearest integer).

###############################################################################

# OUTPUT JSON SCHEMA  (array, minified)

###############################################################################
[
  {
    "candidate_id":"uuid",
    "score":87,
    "dimension":{"E":4,"T":5,"C":2,"R":4},
    "explanation":"Led 50 MW solar+BESS EPC in Bavaria; holds TÜV-PV"
  },
  …
]

*Rules*  
– \`explanation\` ≤ 120 characters.  
– Keep dimension keys ONLY for dimensions that were present in the query.  
– Sort array by \`score\` descending.

###############################################################################

# INPUT – DO NOT MODIFY PLACEHOLDERS

###############################################################################
QUERY:
{{QUERY_JSON}}

CANDIDATES:
{{CANDIDATES_JSON}}
`;
    const prompt = RUBRIC_PROMPT.replace('{{QUERY_JSON}}', JSON.stringify(structuredPayload || {
      query: queryText
    })).replace('{{CANDIDATES_JSON}}', JSON.stringify(candidates.map((c)=>({
        candidate_id: c.id,
        region_tags: c.region_tags,
        tech_tags: c.tech_tags,
        certifications: c.certifications,
        experience: c.experience
      }))));
    // 4. Call Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY'));
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash'
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    // Clean and parse JSON
    let matches;
    try {
      matches = JSON.parse(responseText.replace(/```json\n?|```/g, '').trim());
    } catch (e) {
      throw new Error('Failed to parse Gemini response: ' + responseText);
    }
    // 5. Store in query_matches
    const topScores = matches.slice(0, 20).map((m)=>m.score);
    const { error: insertError } = await supabase.from('query_matches').insert({
      query_id: queryId,
      matches: matches,
      top_scores: topScores
    });
    if (insertError) throw insertError;
    // 6. Return result
    return new Response(JSON.stringify({
      matches,
      topScores
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
