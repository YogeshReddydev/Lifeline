import { generateStructuredHealthData, generateHealthInsights } from './gemini';
import { generateDeepSeekStructuredData, generateDeepSeekHealthInsights } from './deepseek';

export enum AIProvider {
  GEMINI = 'gemini',
  DEEPSEEK = 'deepseek'
}

export const getHealthInsights = async (prompt: string, provider: AIProvider = AIProvider.GEMINI) => {
  if (provider === AIProvider.DEEPSEEK) {
    try {
      return await generateDeepSeekHealthInsights(prompt);
    } catch (error: any) {
      if (error.message === 'DEEPSEEK_INSUFFICIENT_BALANCE') {
        console.warn('DeepSeek balance empty, falling back to Gemini...');
        return generateHealthInsights(prompt);
      }
      throw error;
    }
  }
  return generateHealthInsights(prompt);
};

export const getStructuredHealthData = async (prompt: string, schema: any, provider: AIProvider = AIProvider.GEMINI) => {
  if (provider === AIProvider.DEEPSEEK) {
    try {
      return await generateDeepSeekStructuredData(prompt, schema);
    } catch (error: any) {
      if (error.message === 'DEEPSEEK_INSUFFICIENT_BALANCE') {
        console.warn('DeepSeek balance empty, falling back to Gemini...');
        return generateStructuredHealthData(prompt, schema);
      }
      throw error;
    }
  }
  return generateStructuredHealthData(prompt, schema);
};
