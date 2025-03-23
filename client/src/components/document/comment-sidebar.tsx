import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Bold, Paperclip } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  user: {
    id: number;
    name: string;
    username: string;
  };
  replies?: Comment[];
}

interface CommentSidebarProps {
  documentId: number;
  onClose: () => void;
}

export function CommentSidebar({ documentId, onClose }: CommentSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newCommentText, setNewCommentText] = useState("");
  
  // Fetch comments
  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: [`/api/documents/${documentId}/comments`],
  });
  
  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/documents/${documentId}/comments`, { content });
      return await res.json();
    },
    onSuccess: () => {
      setNewCommentText("");
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/comments`] });
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSubmitComment = () => {
    if (!newCommentText.trim()) return;
    createCommentMutation.mutate(newCommentText);
  };
  
  const formatCommentTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-20 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium">Comments</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>No comments yet</p>
            <p className="text-sm mt-1">Be the first to add a comment</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="mb-6">
              <div className="flex items-start mb-2">
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarFallback className="bg-primary text-white">
                    {comment.user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center">
                    <span className="font-medium text-sm">{comment.user.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{formatCommentTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-800 mt-1">{comment.content}</p>
                </div>
              </div>
              
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-11 pl-3 border-l-2 border-gray-200">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start mb-2">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarFallback className="bg-primary text-white text-xs">
                          {reply.user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium text-sm">{reply.user.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{formatCommentTime(reply.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-800 mt-1">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-start">
          <Avatar className="h-8 w-8 mr-3">
            <AvatarFallback className="bg-primary text-white">
              {user?.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 rounded-lg border border-gray-300 overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <Textarea
              placeholder="Add a comment..."
              rows={3}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="block w-full border-0 resize-none focus:ring-0 text-sm p-2"
            />
            <div className="flex items-center justify-between bg-gray-50 px-2 py-1 border-t border-gray-200">
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                  <Bold className="h-4 w-4" />
                  <span className="sr-only">Format text</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                  <Paperclip className="h-4 w-4" />
                  <span className="sr-only">Add attachment</span>
                </Button>
              </div>
              <div>
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={createCommentMutation.isPending || !newCommentText.trim()}
                >
                  {createCommentMutation.isPending ? "Posting..." : "Comment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
