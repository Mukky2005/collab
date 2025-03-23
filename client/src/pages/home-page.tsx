import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { FilePenLine, Loader2, FileText, GraduationCap, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ResearchTemplates } from "@/components/document/research-templates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function HomePage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
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
  
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document deleted",
        description: "The document has been permanently deleted.",
      });
      setDocumentToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleCreateDocument = () => {
    newDocumentMutation.mutate();
  };
  
  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDocumentToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (documentToDelete) {
      deleteDocumentMutation.mutate(documentToDelete);
    }
    setDeleteDialogOpen(false);
  };
  
  return (
    <>
      <div className="h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-black">Research Paper Editor</h1>
                  <p className="text-gray-600 mt-1">Collaborate on research papers in real-time with colleagues</p>
                </div>
                <Button onClick={handleCreateDocument} disabled={newDocumentMutation.isPending} className="mt-3 sm:mt-0">
                  <FilePenLine className="h-5 w-5 mr-1" />
                  New Blank Document
                </Button>
              </div>
              
              <Tabs defaultValue="templates" className="mb-8">
                <TabsList>
                  <TabsTrigger value="templates" className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Research Templates
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex items-center">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    My Documents
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="templates" className="mt-6">
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <ResearchTemplates onSelectTemplate={(templateId) => {
                      // The template component handles creating documents
                    }} />
                  </div>
                </TabsContent>
                
                <TabsContent value="documents" className="mt-6">
                  {data?.myDocuments.length === 0 && data?.sharedDocuments.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <FilePenLine className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h2 className="text-xl font-semibold mb-2 text-black">No documents yet</h2>
                      <p className="text-gray-500 mb-6">Create your first document to get started</p>
                      <Button onClick={handleCreateDocument} disabled={newDocumentMutation.isPending}>
                        <FilePenLine className="h-5 w-5 mr-1" />
                        Create Document
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-black mb-4">My Research Papers</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data?.myDocuments.map((doc) => (
                          <div key={doc.id} className="relative group">
                            <Link href={`/documents/${doc.id}`}>
                              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer">
                                <div className="flex items-start justify-between">
                                  <div className="flex">
                                    <FilePenLine className="h-5 w-5 text-primary mt-1 mr-2" />
                                    <div>
                                      <h3 className="font-medium text-black">{doc.title}</h3>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Updated {new Date(doc.updatedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div onClick={(e) => e.stopPropagation()} className="absolute top-3 right-3">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <MoreVertical className="h-4 w-4" />
                                          <span className="sr-only">Open menu</span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                          className="text-destructive focus:text-destructive flex items-center cursor-pointer" 
                                          onClick={(e) => handleDeleteClick(e, doc.id)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </div>
                        ))}
                      </div>
                      
                      {data?.sharedDocuments && data.sharedDocuments.length > 0 && (
                        <div className="mt-8">
                          <h2 className="text-xl font-bold text-black mb-4">Shared with me</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.sharedDocuments.map((doc) => (
                              <Link href={`/documents/${doc.id}`} key={doc.id}>
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer">
                                  <div className="flex items-start">
                                    <FilePenLine className="h-5 w-5 text-secondary mt-1 mr-2" />
                                    <div>
                                      <h3 className="font-medium text-black">{doc.title}</h3>
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
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </main>
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this research paper and remove all collaborator access.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDocumentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
