import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface PlagiarismSection {
  text: string;
  probability: number;
  explanation: string;
}

interface PlagiarismResult {
  isPlagiarized: boolean;
  score: number;
  analysis: string;
  sections?: PlagiarismSection[];
}

interface PlagiarismDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentText: string;
}

export function PlagiarismDialog({ isOpen, onClose, documentText }: PlagiarismDialogProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for plagiarism when the dialog opens
  React.useEffect(() => {
    if (isOpen && documentText && !result && !isChecking) {
      checkPlagiarism();
    }
  }, [isOpen, documentText]);

  const checkPlagiarism = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const response = await fetch('/api/plagiarism-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: documentText }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check plagiarism: ${response.statusText}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Error checking plagiarism:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsChecking(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state when dialog closes
    setTimeout(() => {
      setResult(null);
      setError(null);
    }, 300);
  };

  const getScoreBadge = (score: number) => {
    if (score < 0.3) {
      return <Badge className="bg-green-500">Low Plagiarism Risk</Badge>;
    } else if (score < 0.7) {
      return <Badge className="bg-yellow-500">Medium Plagiarism Risk</Badge>;
    } else {
      return <Badge className="bg-red-500">High Plagiarism Risk</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Plagiarism Check Results</DialogTitle>
          <DialogDescription>
            AI-powered analysis of your research document
          </DialogDescription>
        </DialogHeader>

        {isChecking && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Analyzing document for potential plagiarism...</p>
            <p className="text-sm text-muted-foreground">This may take a moment for longer documents</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 p-4 rounded-md flex items-start gap-3 my-4">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Error checking plagiarism</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <Button 
                variant="outline" 
                className="mt-3" 
                onClick={checkPlagiarism}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {result && !isChecking && !error && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-5 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Overall Assessment</h3>
                {getScoreBadge(result.score)}
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between mb-1 text-sm">
                  <span>Plagiarism Score</span>
                  <span className="font-medium">{Math.round(result.score * 100)}%</span>
                </div>
                <Progress value={result.score * 100} className="h-2" />
              </div>
              
              <div className="flex items-start gap-3">
                {result.isPlagiarized ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                )}
                <p className="text-gray-700">{result.analysis}</p>
              </div>
            </div>

            {result.sections && result.sections.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Flagged Sections</h3>
                
                {result.sections.map((section, index) => (
                  <div key={index} className="border rounded-md p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="font-medium">Section {index + 1}</span>
                      <Badge variant={section.probability > 0.5 ? "destructive" : "outline"}>
                        {Math.round(section.probability * 100)}% match
                      </Badge>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md text-gray-800 text-sm font-mono whitespace-pre-wrap">
                      {section.text}
                    </div>
                    
                    <p className="text-sm">
                      <span className="font-medium">Analysis:</span> {section.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            <div className="border-t pt-4 text-sm text-gray-500">
              <p>Note: This plagiarism check uses AI-based analysis and may not catch all instances of plagiarism. 
              Always conduct additional checks and follow proper citation practices.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Close
          </Button>
          {result && (
            <Button type="button" onClick={checkPlagiarism} disabled={isChecking}>
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking
                </>
              ) : "Check Again"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}