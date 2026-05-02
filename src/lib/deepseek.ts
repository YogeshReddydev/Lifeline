import OpenAI from 'openai';

const deepseek = new OpenAI({
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
  baseURL: "https://api.deepseek.com",
  dangerouslyAllowBrowser: true // Essential for client-side usage in this context
});

export const generateDeepSeekHealthInsights = async (prompt: string, model: string = "deepseek-reasoner") => {
  if (!import.meta.env.VITE_DEEPSEEK_API_KEY) {
    throw new Error('VITE_DEEPSEEK_API_KEY is not configured. Please add it to your environment variables.');
  }

  try {
    const response = await deepseek.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a clinical diagnostic analyzer. Review health data and output structured analysis." },
        { role: "user", content: prompt }
      ],
    });

    return response.choices[0].message.content || '';
  } catch (error: any) {
    if (error?.status === 402 || error?.message?.includes('402')) {
      throw new Error('DEEPSEEK_INSUFFICIENT_BALANCE');
    }
    throw error;
  }
};

export const generateDeepSeekStructuredData = async (prompt: string, schema: any, model: string = "deepseek-reasoner") => {
  if (!import.meta.env.VITE_DEEPSEEK_API_KEY) {
    throw new Error('VITE_DEEPSEEK_API_KEY is not configured. Please add it to your environment variables.');
  }

  try {
    const response = await deepseek.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a clinical diagnostic analyzer. Review health data and output structured analysis JSON strictly." },
        { role: "user", content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  } catch (error: any) {
    if (error?.status === 402 || error?.message?.includes('402')) {
      throw new Error('DEEPSEEK_INSUFFICIENT_BALANCE');
    }
    throw error;
  }
};

export const isDeepSeekConfigured = () => !!import.meta.env.VITE_DEEPSEEK_API_KEY;
export { deepseek };
