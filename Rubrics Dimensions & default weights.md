Now, I want to add a functionality where when user search something in natural language on find partners page like "I want to commission a power plant in Bavaria", one API call should be sent to gemini flash 2.0 model where this query along with every partners profile's 'id' (for reference), 'region_tags',`tech_tags', 'certifications` and 'experience'. Then, the query and partner's profile should matched by gemini flash 2.0 strictly based on the synergy rubrics mentioned below, and Gemini should return the synergy score and 1-2 sentence rationale text explaining the score for profiles. Gemini should send only the top 20 profiles. Then the profile on the partner page should arranged in descending order of synergy score.

However for this first step search button should only trigger the gemini api and give the response to store in supabase and log the Gemini request and response in the console to verify if it works. After this message develop a step by step plan to implement the functionality. We will implement  the changes to the frontend (@search) to display these scores in next step.

## Rubrics Dimensions & default weights

| Code  | Dimension (schema field)                                                           | Default weight | When **query** omits this field                    |
| ----- | ---------------------------------------------------------------------------------- | -------------- | -------------------------------------------------- |
| **E** | **Experience** – semantic match between seeker’s need and candidate’s `experience` | **35 %**       | Omit → redistribute weight to remaining dimensions |
| **T** | **Technical expertise** – overlap of `tech_tags`                                   | **35 %**       | Same rule                                          |
| **C** | **Certifications** – seeker’s required certs with `certifications`                 | 15 %           | If seeker gave no cert requirement → redistribute  |
| **R** | **Region fit** – seeker's need with `region_tags` (country / state)                | 15 %           | If seeker gave no region → redistribute            |

### Automatic weight rebalance

effective_weight = default_weight / Σ(default_weights of dimensions present in query)

Example: seeker's natural language query includes only tech_tags + region → T=70 %, R=30 %.

## 2 Raw 0–5 scoring anchors

### E – Experience (experience)

| Raw | Guideline                                                             |
| --- | --------------------------------------------------------------------- |
| 0   | No relevant project keywords found                                    |
| 1   | Vague relevance (mentions domain once)                                |
| 2   | One similar past project, small scale                                 |
| 3   | Multiple similar projects **or** one large-scale (>5 MW, >€1 M, etc.) |
| 4   | Directly analogous project (size + stage)                             |
| 5   | Multiple directly analogous projects **and** leadership role stated   |

### T – Tech-tag match (tech_tag)

match_ratio = |intersection between query and tech_tag| / |required_tech expertise|
raw =   0 if match_ratio = 0
        1 if 0 < match_ratio ≤ 0.25
        2 if 0.25 < … ≤ 0.5
        3 if 0.5  < … < 1
        4 if match_ratio = 1
        5 if match_ratio = 1 and candidate has ≥1 extra relevant tag

### C – Certification (certification)

| Raw | Guideline                            |
| --- | ------------------------------------ |
| 0   | No cert overlap                      |
| 2   | Some optional certs match            |
| 4   | All mandatory certs present          |
| 5   | All mandatory + extra relevant certs |

### R – Region (region_tag)

| Raw | Guideline                              |
| --- | -------------------------------------- |
| 0   | No overlap                             |
| 2   | Same continent / market bloc (e.g. EU) |
| 4   | Same country                           |
| 5   | Same state / grid-code zone            |

*(If the query lists multiple `region_tags`, use the highest applicable raw value.)*

## 3 Converting to 0-100 Synergy Score

For each dimension **d** that exists in the query:

weighted_d = (raw_d / 5) * effective_weight_d
Synergy = Σ weighted_d * 100

*(Multiply by 100 at the end to convert fraction → percentage.)*

## 4 Output JSON schema (one element per candidate)

example:

{
"candidate_id": "uuid",
  "score": 87,
  "dimension": { "E":4, "T":5, "R":4, "C":2 },
  "explanation": "Led 50 MW solar+BESS EPC in Bavaria; holds TÜV-PV; local compliance experience"
}

## 5 Single-call prompt template (pseudo-code)



SYSTEM
You are **EnergyLink-Scorer v2**, an impartial evaluation engine.
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
T  Technical expertise – semantic technical expertise overlap between `tech_tags` lists.  • weight 35 %
C  Certifications      – whether candidate satisfies any certification needs   • weight 15 %
                        named in the query.
R  Region fit          – overlap of region mention in query and `region_tags`.               • weight 15 %

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
– `explanation` ≤ 120 characters.  
– Keep dimension keys ONLY for dimensions that were present in the query.  
– Sort array by `score` descending.

###############################################################################

# INPUT – DO NOT MODIFY PLACEHOLDERS

###############################################################################
QUERY:
{{QUERY_JSON}}

CANDIDATES:
[
 { "candidate_id":"...", "experience":"<text>", "tech_tags":[…], "certifications":[…], "region_tags":[…] },
 … up to N profiles
]

# ──────────────────────────────

## 6 Edge-function flow

1. **SQL**: fetch the top-K preliminary matches (tag overlap) and build the candidate list.

2. **Compose** the prompt above (rubric is < 1 000 tokens, plus query + K candidates).

3. **Call** Gemini Flash 2.0 with `temperature:0`).

4. **Parse** JSON → insert *one* row in `query_matches` (`matches` array + `top_scores`).

5. **Frontend** show all the top 20 partners in desceding order of synergy score.
