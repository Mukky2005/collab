import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  avatarUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Document schema
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").default(""),
  ownerId: integer("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  title: true,
  content: true,
  ownerId: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Document collaborator schema
export const collaborators = pgTable("collaborators", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(), // 'editor', 'viewer', 'commenter'
});

export const insertCollaboratorSchema = createInsertSchema(collaborators).pick({
  documentId: true,
  userId: true,
  role: true,
});

export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;
export type Collaborator = typeof collaborators.$inferSelect;

// Comment schema
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  parentId: integer("parent_id"),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  documentId: true,
  userId: true,
  content: true,
  parentId: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Composite types for API responses
export type DocumentWithCollaborators = Document & {
  owner: User;
  collaborators: (Collaborator & { user: User })[];
};

export type CommentWithUser = Comment & {
  user: User;
  replies?: (Comment & { user: User })[];
};
