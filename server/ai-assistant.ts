import { OpenAI } from 'openai';

export async function generateAIResponse(prompt: string): Promise<string> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      throw new Error('Groq API key is not set');
    }
    
    // Initialize OpenAI with Groq's base URL
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    
    // Using Groq's latest model for academic/research writing assistance
    const model = "llama3-70b-8192";
    
    const systemPrompt = `You are a research paper writing assistant. Your goal is to help academics write 
    clear, concise, and well-structured research content. You excel at improving academic prose, 
    suggesting proper citations, fixing grammar issues, and providing context-appropriate 
    recommendations for research papers.`;
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 2000, // Increased for longer, more detailed responses
      top_p: 0.95,
    });
    
    const generatedText = completion.choices[0]?.message?.content || '';
    
    return generatedText || 'No text was generated. Please try a different prompt.';
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return `Error generating text: ${error instanceof Error ? error.message : String(error)}`;
  }
}