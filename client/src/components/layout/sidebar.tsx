import { useState } from "react";
import { Link, useLocation } from "wouter";
import { FilePenLine, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Document } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface SidebarProps {
  myDocuments: Document[];
  sharedDocuments: Document[];
  isOpen: boolean;
  onClose: () => void;
}

interface DocumentItemProps {
  document: Document;
  isActive: boolean;
  collaborators?: { id: number; name: string }[];
}

const DocumentItem = ({ document, isActive, collaborators = [] }: DocumentItemProps) => {
  const [location] = useLocation();
  
  return (
    <Link href={`/documents/${document.id}`}>
      <div 
        className={cn(
          "flex items-center px-2 py-2 rounded-md cursor-pointer mt-1",
          isActive 
            ? "bg-blue-50 border-l-4 border-primary" 
            : "hover:bg-gray-50 border-l-4 border-transparent"
        )}
      >
        <div className={cn("mr-2", isActive ? "text-primary" : "text-gray-400")}>
          <FilePenLine className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{document.title}</p>
          <div className="flex items-center text-xs text-gray-500">
            <span>
              {new Date(document.updatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            {collaborators.length > 0 && (
              <>
                <span className="mx-1">•</span>
                <div className="flex -space-x-1">
                  {collaborators.slice(0, 3).map((collab, i) => (
                    <div 
                      key={collab.id}
                      className="h-4 w-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px]"
                    >
                      {collab.name.charAt(0)}
                    </div>
                  ))}
                  {collaborators.length > 3 && (
                    <div className="h-4 w-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px]">
                      +{collaborators.length - 3}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export function Sidebar({ myDocuments, sharedDocuments, isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  
  const newDocumentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/documents", {
        title: "Untitled Document",
        content: ""
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      window.location.href = `/documents/${data.id}`;
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating document",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleCreateDocument = () => {
    newDocumentMutation.mutate();
  };
  
  // Extract current document ID from URL
  const currentDocumentId = location.startsWith('/documents/')
    ? parseInt(location.split('/')[2])
    : null;
  
  return (
    <aside className={cn(
      "sidebar bg-white w-64 border-r border-gray-200 h-full flex flex-col z-10 fixed md:static top-0 bottom-0 left-0 transition-transform duration-200 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      <div className="px-4 py-3 border-b border-gray-200">
        <Button
          className="w-full justify-center"
          onClick={handleCreateDocument}
          disabled={newDocumentMutation.isPending}
        >
          {newDocumentMutation.isPending ? "Creating..." : (
            <>
              <FilePenLine className="h-5 w-5 mr-1" />
              New Document
            </>
          )}
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="py-2">
          <div className="px-3 flex items-center justify-between text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>My Documents</span>
          </div>
          
          <div className="mt-1 px-2">
            {myDocuments.length === 0 ? (
              <p className="text-sm text-center text-gray-500 py-4">No documents yet</p>
            ) : (
              myDocuments.map(doc => (
                <DocumentItem 
                  key={doc.id} 
                  document={doc} 
                  isActive={doc.id === currentDocumentId}
                />
              ))
            )}
          </div>
        </div>
        
        {sharedDocuments.length > 0 && (
          <div className="py-2 mt-2">
            <div className="px-3 flex items-center justify-between text-xs font-medium text-gray-500 uppercase tracking-wider">
              <span>Shared with me</span>
            </div>
            
            <div className="mt-1 px-2">
              {sharedDocuments.map(doc => (
                <DocumentItem 
                  key={doc.id} 
                  document={doc} 
                  isActive={doc.id === currentDocumentId}
                />
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
      
      <div className="border-t border-gray-200 p-4">
        <div className="text-xs text-gray-500 mb-1">Storage</div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-primary h-1.5 rounded-full" style={{ width: "5%" }}></div>
        </div>
      </div>
    </aside>
  );
}
