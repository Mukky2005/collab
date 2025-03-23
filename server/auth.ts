import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, InsertUser } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "collabeditor-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for persistent login
      secure: process.env.NODE_ENV === "production", // use secure cookies in production
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local authentication strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !user.password || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  // Google authentication strategy
  const googleCallbackURL = process.env.NODE_ENV === "production" 
    ? "https://yourdomain.com/api/auth/google/callback" 
    : "http://localhost:5000/api/auth/google/callback";

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: googleCallbackURL,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Look for existing user with this Google ID
          let user = await storage.getUserByGoogleId(profile.id);
          
          if (!user) {
            // No user found with this Google ID, check if email already exists
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : "";
            if (email) {
              user = await storage.getUserByEmail(email);
            }
            
            if (user) {
              // Update existing user with Google ID and other details
              user = await storage.updateUser(user.id, {
                googleId: profile.id,
                avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : user.avatarUrl,
              });
            } else {
              // Create a new user
              const username = `google_${profile.id}`;
              const name = profile.displayName || "Google User";
              const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
              
              user = await storage.createUser({
                username,
                name,
                email,
                googleId: profile.id,
                avatarUrl,
              });
            }
          }
          
          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

  // GitHub authentication strategy
  const githubCallbackURL = process.env.NODE_ENV === "production" 
    ? "https://yourdomain.com/api/auth/github/callback" 
    : "http://localhost:5000/api/auth/github/callback";

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: githubCallbackURL,
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Look for existing user with this GitHub ID
          let user = await storage.getUserByGithubId(profile.id);
          
          if (!user) {
            // No user found with this GitHub ID, check if email already exists
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : "";
            if (email) {
              user = await storage.getUserByEmail(email);
            }
            
            if (user) {
              // Update existing user with GitHub ID and other details
              user = await storage.updateUser(user.id, {
                githubId: profile.id,
                avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : user.avatarUrl,
              });
            } else {
              // Create a new user
              const username = `github_${profile.id}`;
              const name = profile.displayName || "GitHub User";
              const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
              
              user = await storage.createUser({
                username,
                name,
                email,
                githubId: profile.id,
                avatarUrl,
              });
            }
          }
          
          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate request body
      const registerSchema = insertUserSchema.extend({
        password: z.string().min(6, "Password must be at least 6 characters"),
        email: z.string().email("Invalid email format"),
      });
      
      const userData = registerSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password and create user
      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      // Login the new user
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Return user data without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      
      console.error("Error during registration:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid username or password" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Return user data without password
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    // Return user data without password
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });

  // Update user profile endpoint
  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const userId = req.user!.id;
      const { name, email, username, password, ...otherUpdates } = req.body;
      
      // Create update object
      const updates: Partial<User> = {};
      
      // Validate and add fields to updates
      if (name) updates.name = name;
      if (email) updates.email = email;
      
      // Check if username is changed and if it already exists
      if (username && username !== req.user!.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already taken" });
        }
        updates.username = username;
      }
      
      // Hash new password if provided
      if (password) {
        updates.password = await hashPassword(password);
      }
      
      // Add any other valid updates
      Object.assign(updates, otherUpdates);
      
      // Update user in database
      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return updated user data without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  // Google OAuth routes
  app.get(
    "/api/auth/google",
    passport.authenticate("google")
  );
  
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/auth" }),
    (req, res) => {
      res.redirect("/");
    }
  );
  
  // GitHub OAuth routes
  app.get(
    "/api/auth/github",
    passport.authenticate("github")
  );
  
  app.get(
    "/api/auth/github/callback",
    passport.authenticate("github", { failureRedirect: "/auth" }),
    (req, res) => {
      res.redirect("/");
    }
  );
}
