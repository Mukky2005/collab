import { OpenAI } from 'openai';

interface PlagiarismResult {
  isPlagiarized: boolean;
  score: number;
  analysis: string;
  sections?: Array<{
    text: string;
    probability: number;
    explanation: string;
  }>;
}

interface WritingImprovementResult {
  improvedText: string;
  changes: Array<{
    original: string;
    improved: string;
    explanation: string;
  }>;
  generalSuggestions: string[];
}

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

export async function improveWriting(text: string): Promise<WritingImprovementResult> {
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
    
    // Using Groq's latest model for writing improvement
    const model = "llama3-70b-8192";
    
    // Truncate text if it's too long (keeping it under token limits)
    const maxLength = 8000;
    let inputText = text;
    let isTruncated = false;
    
    if (text.length > maxLength) {
      inputText = text.substring(0, maxLength);
      isTruncated = true;
    }
    
    const systemPrompt = `You are an expert academic writing coach specializing in improving research papers. 
    Your task is to analyze and enhance academic writing while maintaining the author's voice and intent.
    
    For the provided text:
    1. Improve clarity, conciseness, and overall quality while preserving technical accuracy
    2. Fix grammatical errors, awkward phrasing, and inconsistencies
    3. Enhance academic tone and formality where appropriate
    4. Suggest better word choices for improved precision
    5. Improve sentence structure and flow between ideas
    
    Respond with a structured JSON output that includes:
    1. The fully improved text
    2. A list of specific changes made with explanations
    3. General suggestions for further improvement
    
    Be careful to maintain any technical terms, equations, and specialized vocabulary.`;
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Please improve this academic text:\n\n${inputText}${isTruncated ? "\n\n[Note: Original text was truncated due to length limitations]" : ""}`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      top_p: 0.95,
      response_format: { type: "json_object" }
    });
    
    const responseText = completion.choices[0]?.message?.content || '';
    
    try {
      // Parse the JSON response
      const result = JSON.parse(responseText);
      
      // Format the response to our expected structure
      return {
        improvedText: result.improvedText || text,
        changes: result.changes || [],
        generalSuggestions: result.generalSuggestions || []
      };
    } catch (parseError) {
      console.error('Error parsing writing improvement result:', parseError);
      return {
        improvedText: text,
        changes: [],
        generalSuggestions: ['Error analyzing the text. The system encountered a problem processing the results.']
      };
    }
  } catch (error) {
    console.error('Error improving writing:', error);
    return {
      improvedText: text,
      changes: [],
      generalSuggestions: [`Error analyzing text: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

export async function checkPlagiarism(text: string): Promise<PlagiarismResult> {
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
    
    // Using Groq's latest model for plagiarism detection
    const model = "llama3-70b-8192";
    
    const systemPrompt = `You are an expert plagiarism detection system trained to analyze academic content. 
    Your task is to evaluate the provided text for potential plagiarism by examining:
    1. Unusual phrasings or writing style inconsistencies that suggest copied content
    2. Text that appears to be directly copied from common sources
    3. Content that seems too polished, advanced, or unusual for typical student writing
    4. Signs of AI-generated text
    
    Respond with a structured JSON output that includes:
    1. An overall assessment of whether the text appears plagiarized (true/false)
    2. A plagiarism probability score (0.0-1.0)
    3. Detailed analysis explaining your reasoning
    4. If plagiarism is suspected, specific sections of concern with explanations
    
    Be careful to avoid false positives - only flag genuine concerns.`;
    
    // Truncate text if it's too long (keeping it under token limits)
    const maxLength = 8000;
    let analyzedText = text;
    if (text.length > maxLength) {
      analyzedText = text.substring(0, maxLength) + 
        "\n\n[Note: Text was truncated for analysis. The full document is longer.]";
    }
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Please analyze this academic text for potential plagiarism:\n\n${analyzedText}`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      top_p: 0.95,
      response_format: { type: "json_object" }
    });
    
    const responseText = completion.choices[0]?.message?.content || '';
    
    try {
      // Parse the JSON response
      const result = JSON.parse(responseText);
      
      // Ensure the result has the expected format
      return {
        isPlagiarized: result.isPlagiarized || false,
        score: result.plagiarismScore || 0,
        analysis: result.analysis || "Unable to analyze document for plagiarism.",
        sections: result.suspectedSections || []
      };
    } catch (parseError) {
      console.error('Error parsing plagiarism result:', parseError);
      return {
        isPlagiarized: false,
        score: 0,
        analysis: "Error analyzing document. The plagiarism detection system encountered a problem processing the results."
      };
    }
  } catch (error) {
    console.error('Error checking plagiarism:', error);
    return {
      isPlagiarized: false,
      score: 0,
      analysis: `Error analyzing document: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}