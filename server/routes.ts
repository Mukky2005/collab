import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import { setupWebSocketServer } from "./websocket";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertDocumentSchema, insertCollaboratorSchema, insertCommentSchema } from "@shared/schema";
import { generateAIResponse, checkPlagiarism, improveWriting } from "./ai-assistant";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  setupWebSocketServer(wss, storage);

  // Document routes
  app.get("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const userId = req.user!.id;
    
    try {
      const myDocuments = await storage.getDocumentsByUser(userId);
      const sharedDocuments = await storage.getSharedDocuments(userId);
      
      res.json({
        myDocuments,
        sharedDocuments
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Error fetching documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ message: "Invalid document ID" });
    
    try {
      const document = await storage.getDocument(documentId);
      if (!document) return res.status(404).json({ message: "Document not found" });
      
      // Check if user is owner or collaborator
      const userId = req.user!.id;
      const isOwner = document.ownerId === userId;
      
      if (!isOwner) {
        const collaborators = await storage.getCollaborators(documentId);
        const isCollaborator = collaborators.some(collab => collab.userId === userId);
        
        if (!isCollaborator) {
          return res.status(403).json({ message: "No permission to access this document" });
        }
      }
      
      // Get collaborators
      const collaborators = await storage.getCollaborators(documentId);
      
      res.json({
        document,
        collaborators
      });
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Error fetching document" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const documentData = {
        ...req.body,
        ownerId: req.user!.id
      };
      
      const validatedData = insertDocumentSchema.parse(documentData);
      const document = await storage.createDocument(validatedData);
      
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Error creating document" });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ message: "Invalid document ID" });
    
    try {
      const document = await storage.getDocument(documentId);
      if (!document) return res.status(404).json({ message: "Document not found" });
      
      // Check if user is owner or editor collaborator
      const userId = req.user!.id;
      const isOwner = document.ownerId === userId;
      
      if (!isOwner) {
        const collaborators = await storage.getCollaborators(documentId);
        const userCollaborator = collaborators.find(collab => collab.userId === userId);
        
        if (!userCollaborator || userCollaborator.role === 'viewer') {
          return res.status(403).json({ message: "No permission to edit this document" });
        }
      }
      
      // Update document
      const updatedDocument = await storage.updateDocument(documentId, req.body);
      res.json(updatedDocument);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Error updating document" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ message: "Invalid document ID" });
    
    try {
      const document = await storage.getDocument(documentId);
      if (!document) return res.status(404).json({ message: "Document not found" });
      
      // Only owner can delete document
      if (document.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Only the owner can delete this document" });
      }
      
      await storage.deleteDocument(documentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Error deleting document" });
    }
  });
  
  // Make a copy of a document
  app.post("/api/documents/:id/copy", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ message: "Invalid document ID" });
    
    try {
      const originalDocument = await storage.getDocument(documentId);
      if (!originalDocument) return res.status(404).json({ message: "Document not found" });
      
      // Check if user has permission to view the document
      const userId = req.user!.id;
      const isOwner = originalDocument.ownerId === userId;
      
      if (!isOwner) {
        const collaborators = await storage.getCollaborators(documentId);
        const isCollaborator = collaborators.some(collab => collab.userId === userId);
        
        if (!isCollaborator) {
          return res.status(403).json({ message: "No permission to access this document" });
        }
      }
      
      // Create a copy of the document
      const documentData = {
        title: `Copy of ${originalDocument.title}`,
        content: originalDocument.content,
        ownerId: userId
      };
      
      const validatedData = insertDocumentSchema.parse(documentData);
      const newDocument = await storage.createDocument(validatedData);
      
      res.status(201).json(newDocument);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      
      console.error("Error copying document:", error);
      res.status(500).json({ message: "Error copying document" });
    }
  });

  // Collaborator routes
  app.post("/api/documents/:id/collaborators", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ message: "Invalid document ID" });
    
    try {
      const document = await storage.getDocument(documentId);
      if (!document) return res.status(404).json({ message: "Document not found" });
      
      // Only owner can add collaborators
      if (document.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Only the owner can add collaborators" });
      }
      
      const { username, role } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Validate role
      if (!['editor', 'viewer', 'commenter'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Check if already a collaborator
      const collaborators = await storage.getCollaborators(documentId);
      const existingCollaborator = collaborators.find(collab => collab.userId === user.id);
      
      if (existingCollaborator) {
        return res.status(400).json({ message: "User is already a collaborator" });
      }
      
      const collaboratorData = {
        documentId,
        userId: user.id,
        role
      };
      
      const validatedData = insertCollaboratorSchema.parse(collaboratorData);
      const collaborator = await storage.addCollaborator(validatedData);
      
      res.status(201).json({
        ...collaborator,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collaborator data", errors: error.errors });
      }
      
      console.error("Error adding collaborator:", error);
      res.status(500).json({ message: "Error adding collaborator" });
    }
  });

  app.patch("/api/collaborators/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const collaboratorId = parseInt(req.params.id);
    if (isNaN(collaboratorId)) return res.status(400).json({ message: "Invalid collaborator ID" });
    
    try {
      // Fetch collaborator
      // Note: In-memory storage doesn't provide direct methods for this
      // This is a simplification for the implementation
      const allCollaborators = Array.from(
        (storage as any).collaborators.values()
      );
      
      const collaborator = allCollaborators.find(c => c.id === collaboratorId);
      if (!collaborator) return res.status(404).json({ message: "Collaborator not found" });
      
      // Fetch document to check ownership
      const document = await storage.getDocument(collaborator.documentId);
      if (!document) return res.status(404).json({ message: "Document not found" });
      
      // Only owner can update collaborator roles
      if (document.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Only the owner can update collaborator roles" });
      }
      
      // Validate role
      const { role } = req.body;
      if (!['editor', 'viewer', 'commenter'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedCollaborator = await storage.updateCollaboratorRole(collaboratorId, role);
      res.json(updatedCollaborator);
    } catch (error) {
      console.error("Error updating collaborator:", error);
      res.status(500).json({ message: "Error updating collaborator" });
    }
  });

  app.delete("/api/collaborators/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const collaboratorId = parseInt(req.params.id);
    if (isNaN(collaboratorId)) return res.status(400).json({ message: "Invalid collaborator ID" });
    
    try {
      // Fetch collaborator (simplified implementation for in-memory storage)
      const allCollaborators = Array.from(
        (storage as any).collaborators.values()
      );
      
      const collaborator = allCollaborators.find(c => c.id === collaboratorId);
      if (!collaborator) return res.status(404).json({ message: "Collaborator not found" });
      
      // Fetch document to check ownership
      const document = await storage.getDocument(collaborator.documentId);
      if (!document) return res.status(404).json({ message: "Document not found" });
      
      // Only owner can remove collaborators
      if (document.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Only the owner can remove collaborators" });
      }
      
      await storage.removeCollaborator(collaboratorId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing collaborator:", error);
      res.status(500).json({ message: "Error removing collaborator" });
    }
  });

  // Comment routes
  app.get("/api/documents/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ message: "Invalid document ID" });
    
    try {
      const document = await storage.getDocument(documentId);
      if (!document) return res.status(404).json({ message: "Document not found" });
      
      // Check if user is owner or collaborator
      const userId = req.user!.id;
      const isOwner = document.ownerId === userId;
      
      if (!isOwner) {
        const collaborators = await storage.getCollaborators(documentId);
        const isCollaborator = collaborators.some(collab => collab.userId === userId);
        
        if (!isCollaborator) {
          return res.status(403).json({ message: "No permission to access this document" });
        }
      }
      
      const comments = await storage.getComments(documentId);
      
      // Format comments with user info (simplified implementation)
      const commentsWithUser = await Promise.all(
        comments.map(async (comment) => {
          const user = await storage.getUser(comment.userId);
          return {
            ...comment,
            user: user ? {
              id: user.id,
              username: user.username,
              name: user.name,
              email: user.email
            } : undefined
          };
        })
      );
      
      // Organize comments (top-level and replies)
      const parentComments = commentsWithUser.filter(c => !c.parentId);
      const childComments = commentsWithUser.filter(c => c.parentId);
      
      const commentsWithReplies = parentComments.map(parent => {
        const replies = childComments.filter(child => child.parentId === parent.id);
        return { ...parent, replies };
      });
      
      res.json(commentsWithReplies);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Error fetching comments" });
    }
  });

  app.post("/api/documents/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ message: "Invalid document ID" });
    
    try {
      const document = await storage.getDocument(documentId);
      if (!document) return res.status(404).json({ message: "Document not found" });
      
      // Check if user is owner or collaborator with appropriate permissions
      const userId = req.user!.id;
      const isOwner = document.ownerId === userId;
      
      if (!isOwner) {
        const collaborators = await storage.getCollaborators(documentId);
        const userCollaborator = collaborators.find(collab => collab.userId === userId);
        
        if (!userCollaborator || userCollaborator.role === 'viewer') {
          return res.status(403).json({ message: "No permission to comment on this document" });
        }
      }
      
      const commentData = {
        documentId,
        userId,
        content: req.body.content,
        parentId: req.body.parentId || null
      };
      
      const validatedData = insertCommentSchema.parse(commentData);
      const comment = await storage.createComment(validatedData);
      
      // Get user data for response
      const user = await storage.getUser(userId);
      
      res.status(201).json({
        ...comment,
        user: user ? {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email
        } : undefined
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Error creating comment" });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const commentId = parseInt(req.params.id);
    if (isNaN(commentId)) return res.status(400).json({ message: "Invalid comment ID" });
    
    try {
      // Fetch comment (simplified implementation for in-memory storage)
      const allComments = Array.from(
        (storage as any).comments.values()
      );
      
      const comment = allComments.find(c => c.id === commentId);
      if (!comment) return res.status(404).json({ message: "Comment not found" });
      
      // Only comment author or document owner can delete comments
      const userId = req.user!.id;
      const isCommentAuthor = comment.userId === userId;
      
      if (!isCommentAuthor) {
        const document = await storage.getDocument(comment.documentId);
        if (!document) return res.status(404).json({ message: "Document not found" });
        
        const isDocumentOwner = document.ownerId === userId;
        
        if (!isDocumentOwner) {
          return res.status(403).json({ message: "No permission to delete this comment" });
        }
      }
      
      await storage.deleteComment(commentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Error deleting comment" });
    }
  });

  // AI Assistant route
  app.post("/api/ai-assistant", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ message: "Invalid prompt" });
      }
      
      const response = await generateAIResponse(prompt);
      res.json({ response });
    } catch (error) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ message: "Error generating AI response", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Plagiarism check endpoint
  app.post("/api/plagiarism-check", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Invalid text for plagiarism check" });
      }
      
      const result = await checkPlagiarism(text);
      res.json(result);
    } catch (error) {
      console.error("Error checking plagiarism:", error);
      res.status(500).json({ 
        message: "Error checking plagiarism", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Writing improvement endpoint
  app.post("/api/improve-writing", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Invalid text for writing improvement" });
      }
      
      const result = await improveWriting(text);
      res.json(result);
    } catch (error) {
      console.error("Error improving writing:", error);
      res.status(500).json({ 
        message: "Error improving writing", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  return httpServer;
}
