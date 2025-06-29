import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== SYNERGY SCORING REQUEST ===');
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const { queryId, queryText, structuredPayload, userId } = requestBody;
    
    if (!queryId || !queryText || !userId) {
      throw new Error('Missing required fields: queryId, queryText, or userId');
    }

    // 1. Connect to Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    console.log('Connected to Supabase');

    // 2. Fetch all candidate profiles
    const { data: candidates, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, region_tags, tech_tags, certifications, experience')
      .not('experience', 'is', null)
      .not('tech_tags', 'is', null);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }
    
    console.log(`Fetched ${candidates?.length || 0} candidate profiles`);

    // 3. Build Gemini prompt with full rubric
    const RUBRIC_PROMPT = `SYSTEM
You are EnergyLink-Scorer v2, an impartial evaluation engine.
Your sole task is to score how well each *candidate* fits the *seeker's query*
using ONLY the four dimensions defined below.  
Return STRICT JSON – **an array of objects**, one per candidate, NO extra keys,
NO commentary outside the JSON, and do not pretty-print (minified).

For each candidate in the list, compute raw 0-5 per dimension, then Synergy 0-100 as per rubric. 
Return an array of JSON objects exactly matching the schema. Do NOT add prose.

###############################################################################

# DIMENSIONS & DEFAULT WEIGHTS

###############################################################################
E  Experience         – semantic similarity between query need and the
                        candidate's project *experience* text.   • weight 35 %
T  Technical expertise – semantic technical expertise overlap between tech_tags lists.  • weight 35 %
C  Certifications      – whether candidate satisfies any certification needs   • weight 15 %
                        named in the query.
R  Region fit          – overlap of region mention in query and region_tags.               • weight 15 %

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
– explanation ≤ 120 characters.  
– Keep dimension keys ONLY for dimensions that were present in the query.  
– Sort array by score descending.
– Return only top 20 candidates.

###############################################################################

# INPUT – DO NOT MODIFY PLACEHOLDERS

###############################################################################
QUERY:
{{QUERY_JSON}}

CANDIDATES:
{{CANDIDATES_JSON}}
`;

    const candidatesForPrompt = candidates?.map((c) => ({
      candidate_id: c.id,
      region_tags: c.region_tags || [],
      tech_tags: c.tech_tags || [],
      certifications: c.certifications || [],
      experience: c.experience || ''
    })) || [];

    const prompt = RUBRIC_PROMPT
      .replace('{{QUERY_JSON}}', JSON.stringify(structuredPayload || { query: queryText }))
      .replace('{{CANDIDATES_JSON}}', JSON.stringify(candidatesForPrompt));
    
    console.log('Built prompt for Gemini');

    // 4. Call Gemini Flash 2.0
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '');
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
      }
    });
    
    console.log('Calling Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    console.log('Gemini response received');
    console.log('Raw Gemini response:', responseText);

    // 5. Clean and parse JSON response
    let matches;
    try {
      const cleanedResponse = responseText
        .replace(/```json\n?|```/g, '')
        .trim();
      matches = JSON.parse(cleanedResponse);
      
      if (!Array.isArray(matches)) {
        throw new Error('Response is not an array');
      }
      
      console.log(`Parsed ${matches.length} matches from Gemini`);
    } catch (e) {
      console.error('Failed to parse Gemini response:', e);
      console.error('Raw response was:', responseText);
      throw new Error('Failed to parse Gemini response: ' + responseText.substring(0, 500));
    }

    // 6. Take only top 20 and ensure they're sorted by score
    const topMatches = matches
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 20);
    
    const topScores = topMatches.map((m) => m.score || 0);
    
    console.log(`Storing top ${topMatches.length} matches in database`);

    // 7. Store in query_matches table
    const { error: insertError } = await supabaseClient
      .from('query_matches')
      .insert({
        query_id: queryId,
        matches: topMatches,
        top_scores: topScores
      });
    
    if (insertError) {
      console.error('Error inserting query matches:', insertError);
      throw insertError;
    }
    
    console.log('Successfully stored query matches');
    console.log('=== SYNERGY SCORING COMPLETE ===');

    // 8. Return result with CORS headers
    return new Response(JSON.stringify({
      success: true,
      matches: topMatches,
      topScores: topScores,
      totalCandidates: candidates?.length || 0,
      queryId: queryId
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('=== SYNERGY SCORING ERROR ===');
    console.error('Error details:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});