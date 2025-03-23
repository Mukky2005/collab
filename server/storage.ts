import { users, type User, type InsertUser, documents, type Document, type InsertDocument, collaborators, type Collaborator, type InsertCollaborator, comments, type Comment, type InsertComment } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import connectPg from "connect-pg-simple";
import { eq, and, inArray } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Initialize the database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize drizzle with the pool
const db = drizzle(pool);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByGithubId(githubId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByUser(userId: number): Promise<Document[]>;
  getSharedDocuments(userId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Collaborator operations
  getCollaborators(documentId: number): Promise<(Collaborator & { user: User })[]>;
  addCollaborator(collaborator: InsertCollaborator): Promise<Collaborator>;
  updateCollaboratorRole(id: number, role: string): Promise<Collaborator | undefined>;
  removeCollaborator(id: number): Promise<boolean>;
  
  // Comment operations
  getComments(documentId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: any; // Using 'any' to avoid type issues with different session stores
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private collaborators: Map<number, Collaborator>;
  private comments: Map<number, Comment>;
  sessionStore: any; // Using 'any' to avoid type issues with session store
  
  private userIdCounter: number;
  private documentIdCounter: number;
  private collaboratorIdCounter: number;
  private commentIdCounter: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.collaborators = new Map();
    this.comments = new Map();
    
    this.userIdCounter = 1;
    this.documentIdCounter = 1;
    this.collaboratorIdCounter = 1;
    this.commentIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired sessions every 24h
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId
    );
  }
  
  async getUserByGithubId(githubId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.githubId === githubId
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...insertUser,
      id,
      password: insertUser.password || null,
      googleId: insertUser.googleId || null,
      githubId: insertUser.githubId || null,
      avatarUrl: insertUser.avatarUrl || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByUser(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.ownerId === userId
    );
  }

  async getSharedDocuments(userId: number): Promise<Document[]> {
    const userCollaborations = Array.from(this.collaborators.values()).filter(
      (collab) => collab.userId === userId
    );
    
    return userCollaborations.map(
      (collab) => this.documents.get(collab.documentId)
    ).filter((doc): doc is Document => doc !== undefined);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const now = new Date();
    const document: Document = { 
      ...insertDocument, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, documentUpdate: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument = { 
      ...document, 
      ...documentUpdate,
      updatedAt: new Date() 
    };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Collaborator operations
  async getCollaborators(documentId: number): Promise<(Collaborator & { user: User })[]> {
    return Array.from(this.collaborators.values())
      .filter((collab) => collab.documentId === documentId)
      .map((collab) => {
        const user = this.users.get(collab.userId);
        if (!user) throw new Error(`User with id ${collab.userId} not found`);
        return { ...collab, user };
      });
  }

  async addCollaborator(insertCollaborator: InsertCollaborator): Promise<Collaborator> {
    const id = this.collaboratorIdCounter++;
    const collaborator: Collaborator = { ...insertCollaborator, id };
    this.collaborators.set(id, collaborator);
    return collaborator;
  }

  async updateCollaboratorRole(id: number, role: string): Promise<Collaborator | undefined> {
    const collaborator = this.collaborators.get(id);
    if (!collaborator) return undefined;
    
    const updatedCollaborator = { ...collaborator, role };
    this.collaborators.set(id, updatedCollaborator);
    return updatedCollaborator;
  }

  async removeCollaborator(id: number): Promise<boolean> {
    return this.collaborators.delete(id);
  }

  // Comment operations
  async getComments(documentId: number): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.documentId === documentId
    );
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.commentIdCounter++;
    const now = new Date();
    const comment: Comment = { 
      ...insertComment, 
      id, 
      createdAt: now 
    };
    this.comments.set(id, comment);
    return comment;
  }

  async deleteComment(id: number): Promise<boolean> {
    return this.comments.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0];
  }
  
  async getUserByGithubId(githubId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.githubId, githubId)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...insertUser,
      password: insertUser.password || null,
      googleId: insertUser.googleId || null,
      githubId: insertUser.githubId || null,
      avatarUrl: insertUser.avatarUrl || null
    }).returning();
    return result[0];
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    return result[0];
  }

  async getDocumentsByUser(userId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.ownerId, userId));
  }

  async getSharedDocuments(userId: number): Promise<Document[]> {
    const collabs = await db.select()
      .from(collaborators)
      .where(eq(collaborators.userId, userId));
    
    if (collabs.length === 0) return [];
    
    const documentIds = collabs.map(c => c.documentId);
    return await db.select()
      .from(documents)
      .where(inArray(documents.id, documentIds));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const result = await db.insert(documents).values({
      ...insertDocument,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateDocument(id: number, documentUpdate: Partial<Document>): Promise<Document | undefined> {
    const result = await db.update(documents)
      .set({
        ...documentUpdate,
        updatedAt: new Date()
      })
      .where(eq(documents.id, id))
      .returning();
    return result[0];
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id)).returning();
    return result.length > 0;
  }

  // Collaborator operations
  async getCollaborators(documentId: number): Promise<(Collaborator & { user: User })[]> {
    const collabs = await db.select()
      .from(collaborators)
      .where(eq(collaborators.documentId, documentId));
    
    if (collabs.length === 0) return [];
    
    const collaboratorsWithUsers = [];
    for (const collab of collabs) {
      const userResult = await db.select().from(users).where(eq(users.id, collab.userId)).limit(1);
      if (userResult.length > 0) {
        collaboratorsWithUsers.push({
          ...collab,
          user: userResult[0]
        });
      }
    }
    
    return collaboratorsWithUsers;
  }

  async addCollaborator(insertCollaborator: InsertCollaborator): Promise<Collaborator> {
    const result = await db.insert(collaborators).values(insertCollaborator).returning();
    return result[0];
  }

  async updateCollaboratorRole(id: number, role: string): Promise<Collaborator | undefined> {
    const result = await db.update(collaborators)
      .set({ role })
      .where(eq(collaborators.id, id))
      .returning();
    return result[0];
  }

  async removeCollaborator(id: number): Promise<boolean> {
    const result = await db.delete(collaborators).where(eq(collaborators.id, id)).returning();
    return result.length > 0;
  }

  // Comment operations
  async getComments(documentId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.documentId, documentId));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const result = await db.insert(comments).values({
      ...insertComment,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id)).returning();
    return result.length > 0;
  }
}

// Initialize proper storage based on environment
// For production or when we want to use PostgreSQL
export const storage = new DatabaseStorage();

// For development or testing with in-memory storage
// export const storage = new MemStorage();
