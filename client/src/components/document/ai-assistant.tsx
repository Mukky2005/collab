import React, { useState, useRef, useEffect } from 'react';
import { Loader2, X, Send, BookText, FileText, BrainCircuit, LayoutList, Lightbulb, BookOpen, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AIAssistantProps {
  onClose: () => void;
  onInsertText: (text: string) => void;
}

interface PromptTemplate {
  id: string;
  title: string;
  icon: React.ReactNode;
  prompt: string;
}

export function AIAssistant({ onClose, onInsertText }: AIAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('custom');
  const [hasScrollOverflow, setHasScrollOverflow] = useState(false);
  const responseContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const promptTemplates: PromptTemplate[] = [
    {
      id: 'abstract',
      title: 'Generate Abstract',
      icon: <BookText className="h-4 w-4" />,
      prompt: 'Generate a concise and comprehensive abstract for my research paper on the following topic: [TOPIC]. Include the purpose, methodology, key findings, and implications.'
    },
    {
      id: 'literature',
      title: 'Literature Review',
      icon: <BookOpen className="h-4 w-4" />,
      prompt: 'Help me organize a literature review section that summarizes existing research on: [TOPIC]. Focus on identifying gaps in the literature and contextualizing my research.'
    },
    {
      id: 'methods',
      title: 'Methodology',
      icon: <LayoutList className="h-4 w-4" />,
      prompt: 'Draft a methodological approach for studying: [TOPIC]. Include data collection methods, analytical frameworks, and potential limitations.'
    },
    {
      id: 'discuss',
      title: 'Discussion Points',
      icon: <BrainCircuit className="h-4 w-4" />,
      prompt: 'Generate key discussion points for my research findings on: [TOPIC]. Include implications, comparison with existing literature, and theoretical contributions.'
    },
    {
      id: 'conclusion',
      title: 'Conclusion',
      icon: <FileText className="h-4 w-4" />,
      prompt: 'Write a strong conclusion for my research paper on: [TOPIC]. Summarize key findings, reiterate significance, and suggest future research directions.'
    },
    {
      id: 'improve',
      title: 'Improve Writing',
      icon: <Lightbulb className="h-4 w-4" />,
      prompt: 'Improve the academic writing quality, clarity, and structure of the following text while maintaining the core meaning: [TEXT]'
    }
  ];

  const handleTemplateSelect = (templateId: string) => {
    const template = promptTemplates.find(t => t.id === templateId);
    if (template) {
      setPrompt(template.prompt);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast({
        title: 'Empty prompt',
        description: 'Please enter a prompt for the AI assistant.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const res = await apiRequest('POST', '/api/ai-assistant', { prompt });
      const data = await res.json();
      
      setResponse(data.response);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get AI assistance',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsert = () => {
    if (response) {
      onInsertText(response);
      onClose();
    }
  };
  
  // Check if response content overflows the container
  useEffect(() => {
    if (response && responseContainerRef.current) {
      const container = responseContainerRef.current;
      const hasOverflow = container.scrollHeight > container.clientHeight;
      setHasScrollOverflow(hasOverflow);
    }
  }, [response]);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-bold">AI Writing Assistant</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 flex flex-col space-y-4 flex-1">
        <Tabs defaultValue="custom" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-2">
            <TabsTrigger value="custom">Custom Prompt</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="custom" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
                  What can I help you with?
                </label>
                <Textarea
                  id="prompt"
                  placeholder="E.g., Suggest a conclusion for my research on climate change..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {promptTemplates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => {
                    handleTemplateSelect(template.id);
                    setActiveTab('custom');
                  }}
                >
                  <div className="flex items-center">
                    <div className="mr-3">{template.icon}</div>
                    <div>{template.title}</div>
                  </div>
                </Button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
              <div className="flex items-start">
                <ChevronDown className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-700">How to use templates:</p>
                  <p className="text-xs text-blue-600 mt-1">
                    1. Click on any template above to load it into the editor
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    2. Replace placeholders like [TOPIC] with your specific content
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    3. Click "Generate" to create customized research content
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {activeTab === 'custom' && response && (
          <div className="flex-1 flex flex-col mt-4">
            <div className="text-sm font-medium text-gray-700 mb-1 flex justify-between items-center">
              <span>Response:</span>
              {hasScrollOverflow && (
                <span className="text-xs text-primary flex items-center animate-pulse">
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Scroll for more
                </span>
              )}
            </div>
            <div className="relative">
              <ScrollArea 
                className="flex-1 border border-gray-200 rounded-md p-3 bg-gray-50" 
                style={{ height: "300px", maxHeight: "40vh" }}
              >
                <div ref={responseContainerRef} className="whitespace-pre-wrap">{response}</div>
              </ScrollArea>
              {hasScrollOverflow && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
              )}
            </div>
            
            <div className="flex flex-col gap-2 mt-4">
              <div className="text-xs text-gray-500 italic flex items-center">
                {hasScrollOverflow ? (
                  <ChevronDown className="h-3 w-3 mr-1 text-primary" />
                ) : null}
                {hasScrollOverflow ? "Scroll down to see the complete response" : "Full response shown above"}
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={handleInsert}
                >
                  Insert into Document
                </Button>
                <Button 
                  variant="outline"
                  className="flex-shrink-0"
                  onClick={() => setResponse('')}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}