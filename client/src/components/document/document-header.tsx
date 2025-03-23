import { useState, useEffect } from "react";
import { Share2, MoreVertical, Clock, Download, Copy, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Document } from "@shared/schema";
import { ShareDialog } from "./share-dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import html2pdf from "html2pdf.js";

interface CollaboratorUser {
  id: number;
  name: string;
  username: string;
}

interface DocumentHeaderProps {
  document: Document;
  collaborators: CollaboratorUser[];
  onTitleChange: (title: string) => void;
  isAutosaving: boolean;
  editorContent?: string;
}

export function DocumentHeader({ document, collaborators, onTitleChange, isAutosaving, editorContent }: DocumentHeaderProps) {
  const [title, setTitle] = useState(document.title);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isOwner = user?.id === document.ownerId;
  
  useEffect(() => {
    setTitle(document.title);
  }, [document.title]);
  
  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      await apiRequest("PATCH", `/api/documents/${document.id}`, { title: newTitle });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${document.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating title",
        description: error.message,
        variant: "destructive",
      });
      // Reset to original title on error
      setTitle(document.title);
    },
  });
  
  const deleteDocumentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/documents/${document.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      window.location.href = "/";
      toast({
        title: "Document deleted",
        description: "Your document has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Make a copy mutation
  const copyDocumentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/documents/${document.id}/copy`);
      return response.json();
    },
    onSuccess: (newDocument) => {
      window.location.href = `/document/${newDocument.id}`;
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document copied",
        description: "A copy of the document has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error copying document",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };
  
  const handleTitleBlur = () => {
    if (title !== document.title) {
      onTitleChange(title);
      updateTitleMutation.mutate(title);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };
  
  const handleDeleteDocument = () => {
    if (window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      deleteDocumentMutation.mutate();
    }
  };
  
  const formatLastEdited = () => {
    const date = new Date(document.updatedAt);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins} ${diffInMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffInDays < 7) return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    
    return date.toLocaleDateString();
  };
  
  const exportToPdf = () => {
    try {
      // Get the document content
      const contentToPrint = document.content || editorContent || '';
      
      // Create a temporary container with the content
      const tempContainer = window.document.createElement('div');
      tempContainer.innerHTML = contentToPrint;
      
      // Apply styles for better PDF output
      tempContainer.style.width = '8.5in';
      tempContainer.style.padding = '1in';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.color = 'black';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      
      // Add document title at the top
      const titleElement = window.document.createElement('h1');
      titleElement.textContent = title;
      titleElement.style.marginBottom = '20px';
      titleElement.style.borderBottom = '1px solid #ddd';
      titleElement.style.paddingBottom = '10px';
      tempContainer.prepend(titleElement);
      
      // Create the PDF with html2pdf
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'in', 
          format: 'letter', 
          orientation: 'portrait' as 'portrait'
        }
      };
      
      // Generate the PDF
      html2pdf().from(tempContainer).set(opt).save();
      
      toast({
        title: "PDF Export",
        description: "Your document has been exported as PDF.",
      });
    } catch (error) {
      toast({
        title: "PDF Export Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  return (
    <>
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center mb-3 sm:mb-0">
            <div className="mr-3">
              <Input 
                type="text" 
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleKeyDown}
                className="font-bold text-lg text-black border-0 focus:border-b-2 focus:border-primary p-0 focus:ring-0 bg-transparent"
              />
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              <span>Last edited {formatLastEdited()}</span>
              <span className="mx-1.5">•</span>
              <span className="text-green-600">{isAutosaving ? "Saving..." : "Saved"}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2 mr-2">
              {collaborators.slice(0, 3).map((collab) => (
                <Avatar key={collab.id} className="h-8 w-8 border-2 border-white">
                  <AvatarFallback className="bg-primary text-white">
                    {collab.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {collaborators.length > 3 && (
                <div className="h-8 w-8 rounded-full border-2 border-white bg-gray-100 text-gray-600 flex items-center justify-center text-xs">
                  +{collaborators.length - 3}
                </div>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareDialog(true)}
              className="h-9"
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            
            <DropdownMenu modal={true}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-5 w-5 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={exportToPdf}>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Export as PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyDocumentMutation.mutate()}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Make a copy</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <History className="mr-2 h-4 w-4" />
                    <span>Version history</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDeleteDocument}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete document</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      <ShareDialog 
        document={document}
        collaborators={collaborators}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
      />
    </>
  );
}
