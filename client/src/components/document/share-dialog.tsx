import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Copy, Check } from "lucide-react";
import { Document } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface CollaboratorUser {
  id: number;
  name: string;
  username: string;
  email?: string;
}

interface ShareDialogProps {
  document: Document;
  collaborators: CollaboratorUser[];
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDialog({ document, collaborators, isOpen, onClose }: ShareDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("editor");
  const [linkCopied, setLinkCopied] = useState(false);
  
  const isOwner = user?.id === document.ownerId;
  
  // Add collaborator mutation
  const addCollaboratorMutation = useMutation({
    mutationFn: async ({ username, role }: { username: string; role: string }) => {
      const res = await apiRequest("POST", `/api/documents/${document.id}/collaborators`, { username, role });
      return await res.json();
    },
    onSuccess: () => {
      setUsername("");
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${document.id}`] });
      toast({
        title: "Collaborator added",
        description: "User has been added as a collaborator.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding collaborator",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update collaborator role mutation
  const updateCollaboratorRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/collaborators/${id}`, { role });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${document.id}`] });
      toast({
        title: "Role updated",
        description: "Collaborator role has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle inviting a collaborator
  const handleInvite = () => {
    if (!username) return;
    addCollaboratorMutation.mutate({ username, role });
  };
  
  // Handle changing a collaborator's role
  const handleRoleChange = (collaboratorId: number, newRole: string) => {
    updateCollaboratorRoleMutation.mutate({ id: collaboratorId, role: newRole });
  };
  
  // Handle copying share link
  const handleCopyLink = () => {
    const link = `${window.location.origin}/documents/${document.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(err => {
      toast({
        title: "Failed to copy",
        description: "Could not copy the link to clipboard.",
        variant: "destructive",
      });
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{document.title}"</DialogTitle>
          <DialogDescription>
            Invite people to collaborate on this document
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1"
              disabled={!isOwner}
            />
            <Select
              value={role}
              onValueChange={setRole}
              disabled={!isOwner}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="commenter">Commenter</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={!username || addCollaboratorMutation.isPending || !isOwner}>
              Invite
            </Button>
          </div>
          
          <div className="mt-2">
            <h4 className="text-sm font-medium text-gray-700 mb-2">People with access</h4>
            
            <div className="space-y-3">
              {/* Owner */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarFallback className="bg-primary text-white">
                      {user?.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{user?.name} (you)</div>
                    <div className="text-xs text-gray-500">{user?.email || user?.username}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-700">Owner</div>
              </div>
              
              {/* Collaborators */}
              {collaborators.map((collab) => (
                <div key={collab.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback className="bg-secondary text-white">
                        {collab.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{collab.name}</div>
                      <div className="text-xs text-gray-500">{collab.email || collab.username}</div>
                    </div>
                  </div>
                  <Select
                    defaultValue="editor"
                    onValueChange={(value) => handleRoleChange(collab.id, value)}
                    disabled={!isOwner}
                  >
                    <SelectTrigger className="w-[110px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="commenter">Commenter</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-700">General access</div>
              <Select defaultValue="restricted" disabled={!isOwner}>
                <SelectTrigger className="w-[150px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restricted">Restricted</SelectItem>
                  <SelectItem value="anyone">Anyone with the link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Link sharing</div>
                <div className="text-xs text-gray-500">Specific people only</div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={handleCopyLink}
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy link</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
