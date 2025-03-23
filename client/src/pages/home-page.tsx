import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { FilePenLine, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  
  const { data, isLoading } = useQuery<{ myDocuments: Document[], sharedDocuments: Document[] }>({
    queryKey: ["/api/documents"],
  });
  
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
  
  return (
    <div className="h-screen flex flex-col">
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          myDocuments={data?.myDocuments || []}
          sharedDocuments={data?.sharedDocuments || []}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">My Documents</h1>
                <Button onClick={handleCreateDocument} disabled={newDocumentMutation.isPending}>
                  <FilePenLine className="h-5 w-5 mr-1" />
                  New Document
                </Button>
              </div>
              
              {data?.myDocuments.length === 0 && data?.sharedDocuments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <FilePenLine className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No documents yet</h2>
                  <p className="text-gray-500 mb-6">Create your first document to get started</p>
                  <Button onClick={handleCreateDocument} disabled={newDocumentMutation.isPending}>
                    <FilePenLine className="h-5 w-5 mr-1" />
                    Create Document
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data?.myDocuments.map((doc) => (
                    <Link href={`/documents/${doc.id}`} key={doc.id}>
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start">
                          <FilePenLine className="h-5 w-5 text-primary mt-1 mr-2" />
                          <div>
                            <h3 className="font-medium">{doc.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">
                              Updated {new Date(doc.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {data?.sharedDocuments && data.sharedDocuments.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">Shared with me</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.sharedDocuments.map((doc) => (
                      <Link href={`/documents/${doc.id}`} key={doc.id}>
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex items-start">
                            <FilePenLine className="h-5 w-5 text-secondary mt-1 mr-2" />
                            <div>
                              <h3 className="font-medium">{doc.title}</h3>
                              <p className="text-xs text-gray-500 mt-1">
                                Updated {new Date(doc.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
