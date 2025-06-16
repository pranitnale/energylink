import { GoogleGenerativeAI, Part } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

interface ResumeAnalysisResult {
  full_name: string;
  region_tags: string[];
  tech_tags: string[];
  languages: string[];
  experience: string;
}

function cleanJsonResponse(text: string): string {
  // Remove markdown code block syntax if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Remove any leading/trailing whitespace
  text = text.trim();
  
  // If the text starts with a newline or any other whitespace before the opening brace, remove it
  text = text.replace(/^\s*/, '');
  
  return text;
}

export async function analyzeResume(pdfData: ArrayBuffer): Promise<ResumeAnalysisResult> {
  let responseText = '';
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Convert ArrayBuffer to Base64 using browser APIs
    const uint8Array = new Uint8Array(pdfData);
    const base64Data = btoa(
      uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Create parts array with PDF data
    const parts: Part[] = [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Data
        }
      } as Part,
      {
        text: `Analyze this resume and extract ONLY the following information. Return it as a clean JSON object with no additional text or formatting:
        {
          "full_name": "extracted name","
          "region_tags": ["strictly", "array", "of", "regions", "countries", "places", "cities", etc],
          "tech_tags": ["strictly", "array", "of", "technical", "skills"],
          "languages": ["strictly", "array", "of", "languages"],
          "experience": "3-5 sentence summary of resume, focusing on impressive acheiivements, past projects!!! and professional experience for example:Quality control engineer with 6 years of experience ensuring compliance and performance standards in energy projects. Developed quality assurance protocols for major wind and solar installations across Eastern Europe. Expert in field testing and equipment certification. Background in mechanical engineering with focus on renewable energy systems."
        }`
      } as Part
    ];

    const result = await model.generateContent(parts);
    const response = await result.response;
    responseText = response.text();
    
    // Clean and parse the JSON response
    const cleanedText = cleanJsonResponse(responseText);
    console.log('Cleaned response:', cleanedText); // For debugging
    const parsedResult = JSON.parse(cleanedText);

    // Validate and ensure all required fields are present
    return {
      full_name: parsedResult.full_name || "",
      region_tags: Array.isArray(parsedResult.region_tags) ? parsedResult.region_tags : [],
      tech_tags: Array.isArray(parsedResult.tech_tags) ? parsedResult.tech_tags : [],
      languages: Array.isArray(parsedResult.languages) ? parsedResult.languages : [],
      experience: parsedResult.experience || ""
    };
  } catch (error) {
    console.error("Error analyzing resume:", error);
    if (error instanceof SyntaxError) {
      console.error("JSON parsing error. Response was:", responseText);
    }
    throw new Error("Failed to analyze resume");
  }
} 