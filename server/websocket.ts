import { WebSocketServer, WebSocket } from 'ws';
import { IStorage } from './storage';

interface Client {
  userId: number;
  documentId: number;
  ws: WebSocket;
}

interface CursorPosition {
  userId: number;
  username: string;
  name: string;
  position: number;
}

interface DocumentEdit {
  documentId: number;
  content: string;
  cursorPosition?: CursorPosition;
}

export function setupWebSocketServer(wss: WebSocketServer, storage: IStorage) {
  const clients: Client[] = [];

  wss.on('connection', (ws) => {
    let clientInfo: Client | null = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle authentication and document subscription
        if (data.type === 'auth') {
          const { userId, documentId } = data;
          
          // Check if user exists
          const user = await storage.getUser(userId);
          if (!user) {
            ws.send(JSON.stringify({ type: 'error', message: 'User not found' }));
            return;
          }
          
          // Check if document exists
          const document = await storage.getDocument(documentId);
          if (!document) {
            ws.send(JSON.stringify({ type: 'error', message: 'Document not found' }));
            return;
          }
          
          // Check if user has access to document
          const isOwner = document.ownerId === userId;
          if (!isOwner) {
            const collaborators = await storage.getCollaborators(documentId);
            const isCollaborator = collaborators.some(collab => collab.userId === userId);
            
            if (!isCollaborator) {
              ws.send(JSON.stringify({ type: 'error', message: 'No access to document' }));
              return;
            }
          }
          
          // Register client
          clientInfo = { userId, documentId, ws };
          clients.push(clientInfo);
          
          // Notify other clients about new user
          broadcastToDocument(documentId, {
            type: 'user_joined',
            userId,
            username: user.username,
            name: user.name
          }, ws);
          
          // Send current document state
          ws.send(JSON.stringify({
            type: 'document_data',
            documentId,
            content: document.content
          }));
          
          // Send list of active users
          const activeUsers = clients
            .filter(client => client.documentId === documentId)
            .map(async client => {
              const user = await storage.getUser(client.userId);
              return user ? {
                userId: user.id,
                username: user.username,
                name: user.name
              } : null;
            });
            
          const resolvedUsers = await Promise.all(activeUsers);
          ws.send(JSON.stringify({
            type: 'active_users',
            users: resolvedUsers.filter(Boolean)
          }));
        }
        
        // Handle document edits
        else if (data.type === 'document_edit') {
          if (!clientInfo) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
            return;
          }
          
          const { documentId, content, cursorPosition } = data as DocumentEdit;
          
          // Validate document ID
          if (documentId !== clientInfo.documentId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid document ID' }));
            return;
          }
          
          // Update document in storage
          await storage.updateDocument(documentId, { content });
          
          // Broadcast to all clients
          broadcastToDocument(documentId, {
            type: 'document_update',
            documentId,
            content,
            updatedBy: clientInfo.userId,
            cursorPosition
          }, ws);
        }
        
        // Handle cursor position updates
        else if (data.type === 'cursor_position') {
          if (!clientInfo) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
            return;
          }
          
          const { position } = data;
          const user = await storage.getUser(clientInfo.userId);
          
          if (!user) {
            ws.send(JSON.stringify({ type: 'error', message: 'User not found' }));
            return;
          }
          
          broadcastToDocument(clientInfo.documentId, {
            type: 'cursor_update',
            userId: user.id,
            username: user.username,
            name: user.name,
            position
          }, ws);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      if (clientInfo) {
        // Remove client from the list
        const index = clients.findIndex(c => 
          c.userId === clientInfo!.userId && 
          c.documentId === clientInfo!.documentId
        );
        
        if (index !== -1) {
          clients.splice(index, 1);
          
          // Notify others that user has left
          broadcastToDocument(clientInfo.documentId, {
            type: 'user_left',
            userId: clientInfo.userId
          });
        }
      }
    });
  });

  // Helper function to broadcast to all clients viewing a specific document
  function broadcastToDocument(documentId: number, data: any, excludeWs?: WebSocket) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.documentId === documentId && client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }
}
