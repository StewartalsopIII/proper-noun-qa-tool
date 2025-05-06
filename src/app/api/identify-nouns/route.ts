import { NextResponse } from 'next/server';
import axios from 'axios'; // Import axios

// Define the expected structure for items in the response array
export interface NounCorrection {
  original_word: string;
  timestamp: string | null; // Allow null if timestamp isn't available/parseable
  context_snippet: string;
  suggestions: string[];
}

// --- Configuration ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-sonnet-20240229'; // Default model (Changed to Sonnet)
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// It's good practice to set a site name for OpenRouter attribution
const YOUR_SITE_URL = 'http://localhost:3000'; // Replace with your deployed URL later
const YOUR_SITE_NAME = 'Proper Noun QA Tool';

// --- Prompt Engineering ---
function createPrompt(transcript: string): string {
  return `Analyze this transcript in two phases:

PHASE 1: Extract ALL proper nouns (people, places, organizations, brands).
PHASE 2: For each proper noun, determine if it might have spelling variations or corrections.

For each proper noun, provide:
1.  \`original_word\`: The proper noun as written.
2.  \`timestamp\`: Nearby timestamp if available.
3.  \`context_snippet\`: Surrounding context.
4.  \`suggestions\`: Probable alternative spellings, capitalizations, or [original] if it appears correct.

Format as a JSON array.

Transcript:
---
${transcript}
---
`;
}

// --- API Route Handler ---
export async function POST(request: Request) {
  if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is not set in environment variables.');
      return NextResponse.json({ error: 'Server configuration error: Missing API key.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const transcript = body.transcript;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json({ error: 'Transcript text is required and cannot be empty' }, { status: 400 });
    }

    console.log("Received transcript snippet:", transcript.substring(0, 100) + "..."); // Log start of transcript
    console.log(`Calling OpenRouter model: ${OPENROUTER_MODEL}`);

    const prompt = createPrompt(transcript);

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }, // Request JSON output if model supports it
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          // Recommended headers for OpenRouter attribution
          'HTTP-Referer': YOUR_SITE_URL,
          'X-Title': YOUR_SITE_NAME,
        },
        timeout: 60000, // 60 second timeout
      }
    );

    let corrections: NounCorrection[] = [];
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const messageContent = response.data.choices[0].message?.content;
      if (messageContent) {
        // --- New Diagnostic Logs ---
        console.log('[identify-nouns] Response content type:', response.headers?.['content-type']);
        console.log('[identify-nouns] First 200 chars of content:', messageContent.substring(0, 200));
        console.log('[identify-nouns] Content length:', messageContent.length);
        let jsonString = ''; // Declare jsonString here to ensure it's available in catch block
        try {
          // --- Extract JSON from potential markdown code block --- START
          const rawContent = messageContent.trim();
          console.log('[identify-nouns] Trimmed content length:', rawContent.length);
          console.log('[identify-nouns] Contains ```json:', rawContent.includes('```json'));
          console.log('[identify-nouns] Contains brackets:', rawContent.includes('[') || rawContent.includes('{'));
          let successfullyExtracted = false;

          // 1. Try regex for ```json or ```
          const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
          const match = rawContent.match(jsonRegex);

          if (match && match[1]) {
            // If markdown code block found, use its content
            jsonString = match[1];
            successfullyExtracted = true;
            // console.log('Successfully extracted JSON using regex.'); // removed verbose log
          } else {
            // 2. If regex fails, find first '[' or '{'
            console.warn('AI response did not contain ```json code block. Attempting to find JSON start...');
            const firstBracket = rawContent.indexOf('[');
            const firstBrace = rawContent.indexOf('{');

            let startIndex = -1;
            if (firstBracket !== -1 && firstBrace !== -1) {
              startIndex = Math.min(firstBracket, firstBrace);
            } else if (firstBracket !== -1) {
              startIndex = firstBracket;
            } else {
              startIndex = firstBrace; // Could be -1 if neither is found
            }

            if (startIndex !== -1) {
              jsonString = rawContent.substring(startIndex);
              successfullyExtracted = true;
              // console.log('Attempting to parse starting from first bracket/brace.'); // removed verbose log
            } else {
                 console.error('Could not find start of JSON ([ or {) in the AI response.');
                 jsonString = rawContent; // Assign raw content so catch block logs it
            }
          }
          // --- Extract JSON from potential markdown code block --- END

          if (!successfullyExtracted) {
             // Throw an error if we couldn't confidently extract JSON
             throw new Error("Failed to find JSON block in AI response content.");
          }

          // ---------- EXTRA DIAGNOSTICS BEGIN ----------
          console.log('[diagnostic] rawContent starts with:', rawContent.slice(0, 120));
          console.log('[diagnostic] rawContent ends with:', rawContent.slice(-120));

          console.log('[diagnostic] jsonString first 120 chars:', jsonString.slice(0, 120));
          console.log('[diagnostic] jsonString last 120 chars:', jsonString.slice(-120));

          const openBraces  = (jsonString.match(/{/g) || []).length;
          const closeBraces = (jsonString.match(/}/g) || []).length;
          const openBrack   = (jsonString.match(/\[/g) || []).length;
          const closeBrack  = (jsonString.match(/]/g) || []).length;
          console.log(`[diagnostic] brace balance { } => ${openBraces} / ${closeBraces}`);
          console.log(`[diagnostic] bracket balance [ ] => ${openBrack} / ${closeBrack}`);

          console.log('[diagnostic] contains single quotes?:', jsonString.includes("': '"));
          console.log('[diagnostic] contains trailing commas?:', /,\s*[}\]]/.test(jsonString));
          // ---------- EXTRA DIAGNOSTICS END ----------

          // Attempt to parse the extracted JSON string
          console.log('[identify-nouns] Attempting to parse first 200 chars of jsonString:', jsonString.substring(0, 200));
          const parsedJson = JSON.parse(jsonString);

          if (Array.isArray(parsedJson)) {
            corrections = parsedJson;
            console.log(`[identify-nouns] Parsed ${corrections.length} corrections from top-level array.`);
          } else {
            // Look for the first property that is an array of objects with original_word
            const candidateKey = Object.keys(parsedJson).find(k => {
              const v = parsedJson[k];
              return Array.isArray(v) &&
                     v.length > 0 &&
                     typeof v[0] === 'object' &&
                     'original_word' in v[0];
            });

            if (candidateKey) {
              corrections = parsedJson[candidateKey];
              console.log(`[identify-nouns] Parsed ${corrections.length} corrections from key "${candidateKey}".`);
            } else {
              console.error('AI response JSON did not contain an array of corrections:', parsedJson);
              throw new Error('AI response was not in the expected array format.');
            }
          }
        } catch (parseError) {
          console.error('Failed to parse JSON from AI response content:', parseError);
          console.error('Content starts with:', messageContent.substring(0, 100));
          console.error('Content ends with:', messageContent.substring(Math.max(messageContent.length - 100, 0)));
          console.error('Unescaped quote count:', (messageContent.match(/[^\\]"/g) || []).length);
          console.error('Attempted to parse JSON string (first 200 chars):', jsonString.substring(0, 200));
          // Don't return the raw response to the client for security/privacy.
          return NextResponse.json({ error: 'Failed to process AI response (invalid JSON)' }, { status: 500 });
        }
      } else {
         console.error('No content found in AI response choice message:', response.data.choices[0]);
         return NextResponse.json({ error: 'Failed to process AI response (empty message)' }, { status: 500 });
      }
    } else {
      console.warn('No choices returned from OpenRouter API:', response.data);
      // Return empty array if no corrections found or API response structure is unexpected
    }

    return NextResponse.json(corrections);

  } catch (error) {
     console.error('Error in identify-nouns API route:', error);
     let errorMessage = 'Internal Server Error';
     let statusCode = 500;

     if (axios.isAxiosError(error)) {
        console.error('Axios error details:', error.response?.data || error.message);
        errorMessage = error.response?.data?.error?.message || error.message || 'Error calling AI service';
        statusCode = error.response?.status || 500;
     } else if (error instanceof Error) {
        errorMessage = error.message;
     }
     // Ensure generic message for unexpected errors
     if (statusCode === 500 && errorMessage === 'Internal Server Error') {
         errorMessage = 'An unexpected error occurred while processing the transcript.'
     }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
} 