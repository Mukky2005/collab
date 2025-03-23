import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Editor } from "@/components/document/editor";
import { DocumentHeader } from "@/components/document/document-header";
import { FormattingToolbar } from "@/components/document/formatting-toolbar";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";

export default function DocumentPage() {
  const { id } = useParams();
  const documentId = parseInt(id);
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState<Array<{ userId: number; username: string; name: string }>>([]);
  const [selectionFormat, setSelectionFormat] = useState({
    bold: false,
    italic: false,
    underline: false,
    list: false,
    orderedList: false,
    heading: 'p',
    fontFamily: 'default'
  });
  
  // Get document data
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
  });
  
  // Get all documents for sidebar
  const { data: documentsData } = useQuery<{ myDocuments: any[], sharedDocuments: any[] }>({
    queryKey: ["/api/documents"],
  });
  
  // Set up WebSocket hooks for active users
  const { isConnected, sendMessage } = useWebSocket({
    documentId,
    onActiveUsers: (data) => {
      setActiveUsers(data.users);
    },
    onUserJoined: (userData) => {
      setActiveUsers(prev => {
        if (!prev.some(u => u.userId === userData.userId)) {
          return [...prev, userData];
        }
        return prev;
      });
      
      toast({
        title: "User joined",
        description: `${userData.name} joined the document`,
      });
    },
    onUserLeft: (userData) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== userData.userId));
      
      toast({
        title: "User left",
        description: `${userData.name} left the document`,
      });
    }
  });
  
  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("PATCH", `/api/documents/${documentId}`, { content });
    },
    onSuccess: () => {
      setIsAutosaving(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving document",
        description: error.message,
        variant: "destructive",
      });
      setIsAutosaving(false);
    }
  });
  
  // Debounced update function for autosave
  const debouncedUpdate = useCallback((content: string) => {
    setIsAutosaving(true);
    const timer = setTimeout(() => {
      updateDocumentMutation.mutate(content);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [updateDocumentMutation]);
  
  // Update title mutation
  const updateTitleMutation = useMutation({
    mutationFn: async (title: string) => {
      await apiRequest("PATCH", `/api/documents/${documentId}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating title",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle content changes from editor
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    debouncedUpdate(newContent);
  };
  
  // Handle title changes from document header
  const handleTitleChange = (newTitle: string) => {
    updateTitleMutation.mutate(newTitle);
  };
  
  // Handle formatting commands
  const handleFormat = (command: string, value?: string) => {
    // This is handled by the Editor component
    // Just update the format state for the toolbar
    switch (command) {
      case 'bold':
        setSelectionFormat(prev => ({ ...prev, bold: !prev.bold }));
        break;
      case 'italic':
        setSelectionFormat(prev => ({ ...prev, italic: !prev.italic }));
        break;
      case 'underline':
        setSelectionFormat(prev => ({ ...prev, underline: !prev.underline }));
        break;
      case 'bulletList':
        setSelectionFormat(prev => ({ ...prev, list: !prev.list, orderedList: false }));
        break;
      case 'orderedList':
        setSelectionFormat(prev => ({ ...prev, orderedList: !prev.orderedList, list: false }));
        break;
      case 'heading':
        if (value) {
          setSelectionFormat(prev => ({ ...prev, heading: value }));
        }
        break;
      case 'fontFamily':
        if (value) {
          setSelectionFormat(prev => ({ ...prev, fontFamily: value }));
        }
        break;
    }
  };
  
  // Handle comment addition
  const handleAddComment = () => {
    // This is handled by the Editor component
  };
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Error Loading Document</h1>
          <p className="text-gray-600">{(error as Error)?.message || "Document not found or you don't have access"}</p>
        </div>
      </div>
    );
  }
  
  const { document, collaborators = [] } = data;
  
  return (
    <div className="h-screen flex flex-col">
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          myDocuments={documentsData?.myDocuments || []}
          sharedDocuments={documentsData?.sharedDocuments || []}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          <DocumentHeader 
            document={document}
            collaborators={collaborators.map((c: any) => c.user)}
            onTitleChange={handleTitleChange}
            isAutosaving={isAutosaving}
          />
          
          <FormattingToolbar 
            onFormat={handleFormat}
            selectionFormat={selectionFormat}
            onAddComment={handleAddComment}
            userCount={activeUsers.length}
          />
          
          <Editor 
            document={document}
            onContentChange={handleContentChange}
            activeUsers={activeUsers}
          />
        </main>
      </div>
    </div>
  );
}
