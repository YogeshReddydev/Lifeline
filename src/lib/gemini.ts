import { GoogleGenAI } from "@google/genai";

// Check for various ways the API key might be provided in different environments
const getApiKey = () => process.env.GEMINI_API_KEY || (import.meta.env?.VITE_GEMINI_API_KEY as string) || '';

let genAIInstance: any = null;

const getGenAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please add it to "App Settings" menu (Gear icon).');
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
};

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, backoff = INITIAL_BACKOFF): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.status === 429 || 
                        error?.message?.toLowerCase().includes('429') || 
                        error?.message?.toLowerCase().includes('resource_exhausted') ||
                        error?.code === 429;
    
    if (isRateLimit && retries > 0) {
      console.warn(`Gemini rate limit hit. Retrying in ${backoff}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return withRetry(fn, retries - 1, backoff * 2);
    }
    throw error;
  }
}

export const generateHealthInsights = async (prompt: string, model: string = "gemini-3-flash-preview") => {
  return withRetry(async () => {
    try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      return response.text || '';
    } catch (error) {
      console.error('Gemini Error:', error);
      throw error;
    }
  });
};

export const generateStructuredHealthData = async (prompt: string, schema: any, model: string = "gemini-3-flash-preview") => {
  return withRetry(async () => {
    try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (error: any) {
      console.error('Gemini Structured Error:', error);
      try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt + " (Respond in JSON format only)" }] }],
        });
        const text = response.text || '{}';
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      } catch (innerError) {
        throw error;
      }
    }
  });
};

export const generateImageAnalysis = async (prompt: string, base64Image: string, mimeType: string = "image/jpeg", model: string = "gemini-3-flash-preview") => {
  return withRetry(async () => {
    try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ]
      });
      return response.text || '';
    } catch (error) {
      console.error('Gemini Image Analysis Error:', error);
      throw error;
    }
  });
};


export const isGeminiConfigured = () => !!getApiKey();


export const formatGeminiError = (error: any): string => {
  if (!error) return 'An unknown error occurred.';
  
  // Handle rate limit specifically
  const isRateLimit = error?.status === 429 || 
                      error?.message?.includes('429') || 
                      error?.message?.includes('RESOURCE_EXHAUSTED') ||
                      error?.code === 429;
                      
  if (isRateLimit) {
    return 'The AI is currently experiencing high demand (Rate Limit). Please wait a moment and try again. Our system will automatically retry a few times.';
  }

  // Handle auth errors
  const isAuthError = error?.status === 401 || 
                      error?.message?.toLowerCase().includes('401') || 
                      error?.message?.toLowerCase().includes('authentication') ||
                      error?.message?.toLowerCase().includes('invalid') ||
                      error?.message?.toLowerCase().includes('api_key_invalid') ||
                      error?.message?.toLowerCase().includes('unauthorized') ||
                      error?.message?.toLowerCase().includes('api key') ||
                      error?.message?.toLowerCase().includes('api-key') ||
                      error?.message?.toLowerCase().includes('your api key') ||
                      error?.code === 401;

  if (isAuthError) {
    return 'Gemini Authentication Error (401): The provided API key is invalid or has expired. This often happens if the key was copied incorrectly or disabled. Please go to "App Settings" (Gear icon in top right) and ensure your GEMINI_API_KEY is correctly configured and active.';
  }

  // Handle specific quota message from JSON if present
  try {
    const parsed = typeof error.message === 'string' ? JSON.parse(error.message) : error;
    if (parsed?.error?.message) {
      if (parsed.error.message.includes('quota')) {
        return 'API Quota exceeded. Please try again later or check your Gemini API billing/limits.';
      }
      return parsed.error.message;
    }
  } catch (e) {
    // If not JSON, use standard message
  }

  return error.message || 'System timeout or internal protocol error.';
};
