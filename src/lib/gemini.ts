import { GoogleGenAI } from "@google/genai";

// Check for various ways the API key might be provided in different environments
const apiKey = process.env.GEMINI_API_KEY || (import.meta.env?.VITE_GEMINI_API_KEY as string) || '';
const genAI = new GoogleGenAI({ apiKey });

export const generateHealthInsights = async (prompt: string, model: string = "gemini-3-flash-preview") => {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please add it to your environment variables.');
  }

  try {
    const response = await genAI.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    
    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('Gemini Error:', error);
    throw error;
  }
};

export const generateStructuredHealthData = async (prompt: string, schema: any, model: string = "gemini-3-flash-preview") => {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please add it to your environment variables.');
  }

  try {
    const response = await genAI.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini Structured Error:', error);
    // Fallback if schema-based JSON fails or if it's a 404/other error
    try {
      const response = await genAI.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt + " (Respond in JSON format only)" }] }],
      });
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (innerError) {
      throw error;
    }
  }
};

export const isGeminiConfigured = () => !!apiKey;
export { genAI as ai };
