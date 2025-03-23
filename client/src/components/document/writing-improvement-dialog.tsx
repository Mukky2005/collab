import React, { useState, useEffect } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface WritingImprovementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentText: string;
  onApplyChanges: (improvedText: string) => void;
}

interface WritingImprovement {
  improvedText: string;
  changes: Array<{
    original: string;
    improved: string;
    explanation: string;
  }>;
  generalSuggestions: string[];
}

export function WritingImprovementDialog({ 
  isOpen,
  onClose,
  documentText,
  onApplyChanges
}: WritingImprovementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WritingImprovement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && documentText) {
      checkWriting();
    }
  }, [isOpen, documentText]);

  const checkWriting = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/improve-writing', { text: documentText });
      const data = await response.json();
      
      setResult(data);
    } catch (err) {
      console.error('Error improving writing:', err);
      setError('Failed to analyze your writing. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = () => {
    if (result?.improvedText) {
      onApplyChanges(result.improvedText);
      
      toast({
        title: "Writing improvements applied",
        description: "Your document has been updated with improved content",
        variant: "default",
      });
      
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">AI Writing Improvement</DialogTitle>
          <DialogDescription>
            Analyzing your document for potential writing improvements
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center my-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-center text-muted-foreground">
              Our AI is analyzing your document to suggest writing improvements...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center my-12 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-lg text-center text-destructive">{error}</p>
            <Button onClick={checkWriting}>Try Again</Button>
          </div>
        ) : result ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
              <div className="flex flex-col">
                <h3 className="text-lg font-bold mb-2">General Suggestions</h3>
                <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/20">
                  <ul className="space-y-2">
                    {result.generalSuggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
              
              <div className="flex flex-col">
                <h3 className="text-lg font-bold mb-2">Specific Changes</h3>
                <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/20">
                  <div className="space-y-4">
                    {result.changes.map((change, i) => (
                      <div key={i} className="space-y-2 pb-4 border-b last:border-0">
                        <div className="flex flex-col space-y-1">
                          <Badge variant="outline" className="w-fit">Original</Badge>
                          <div className="p-2 rounded bg-muted/30 text-sm italic">
                            {change.original}
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-1">
                          <Badge variant="default" className="w-fit">Improved</Badge>
                          <div className="p-2 rounded bg-primary/10 text-sm font-medium">
                            {change.improved}
                          </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          <strong>Why:</strong> {change.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Preview of Improved Document</h3>
                </div>
              </div>
              
              <ScrollArea className="h-48 border rounded-md p-4 bg-background">
                <div className="prose prose-sm max-w-none text-sm">
                  {result.improvedText}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : null}
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          
          {result && (
            <Button onClick={handleApplyChanges} disabled={isLoading}>
              Apply Improvements
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}