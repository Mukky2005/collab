import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Document } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type DocumentHookReturn = {
  document: Document | null;
  isLoading: boolean;
  error: Error | null;
  updateContent: (content: string) => void;
  updateTitle: (title: string) => void;
  deleteDocument: () => void;
  isAutosaving: boolean;
};

export function useDocument(documentId: number): DocumentHookReturn {
  const { toast } = useToast();
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [content, setContent] = useState<string>("");
  
  // Fetch document
  const { data, isLoading, error } = useQuery<{ document: Document; collaborators: any[] }>({
    queryKey: [`/api/documents/${documentId}`],
  });

  // Initialize content from document
  useEffect(() => {
    if (data?.document) {
      setContent(data.document.content);
    }
  }, [data?.document?.id]);

  // Content update mutation with debouncing
  const updateContentMutation = useMutation({
    mutationFn: async (newContent: string) => {
      await apiRequest("PATCH", `/api/documents/${documentId}`, { content: newContent });
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
    },
  });

  // Update content with debounce
  const updateContent = (newContent: string) => {
    setContent(newContent);
    setIsAutosaving(true);
    
    // Debounce updates
    if (window.contentUpdateTimeout) {
      clearTimeout(window.contentUpdateTimeout);
    }

    window.contentUpdateTimeout = setTimeout(() => {
      updateContentMutation.mutate(newContent);
    }, 1000);
  };

  // Title update mutation
  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      await apiRequest("PATCH", `/api/documents/${documentId}`, { title: newTitle });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Title updated",
        description: "Document title has been updated."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating title",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/documents/${documentId}`);
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

  return {
    document: data?.document || null,
    isLoading,
    error: error as Error | null,
    updateContent,
    updateTitle: (title: string) => updateTitleMutation.mutate(title),
    deleteDocument: () => {
      if (window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
        deleteDocumentMutation.mutate();
      }
    },
    isAutosaving,
  };
}
