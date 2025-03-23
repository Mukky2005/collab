import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { insertUserSchema } from "@shared/schema";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// Registration form schema
const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);
  
  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // Register form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      name: "",
    },
  });
  
  // Handle login form submission
  const onLoginSubmit = (values: LoginValues) => {
    loginMutation.mutate(values);
  };
  
  // Handle register form submission
  const onRegisterSubmit = (values: RegisterValues) => {
    registerMutation.mutate(values);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="grid gap-6 w-full max-w-6xl p-4 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col justify-center">
          <div className="space-y-2 mb-8">
            <div className="flex items-center gap-2">
              <svg 
                className="h-10 w-10 text-primary" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M19.7 3.3c-.4-.4-1-.4-1.4 0l-4.3 4.3-8.7-3.5c-.5-.2-1.1 0-1.4.5-.3.5-.1 1.1.3 1.4L8 10 4 14c-1.1 1.2-1.8 2.8-1.8 4.5 0 3.6 2.9 6.5 6.5 6.5 1.7 0 3.3-.7 4.5-1.8l4-4 3.9 3.8c.2.2.5.3.7.3.2 0 .5-.1.7-.3.4-.4.4-1 0-1.4L19 18l4-4c1.1-1.2 1.8-2.8 1.8-4.5 0-3.6-2.9-6.5-6.5-6.5-1.7 0-3.3.7-4.5 1.8l-4 4-3.9-3.8c-.4-.4-1-.4-1.4 0-.4.4-.4 1 0 1.4L8 10z" />
              </svg>
              <h1 className="text-3xl font-bold">CollabEdit</h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              A collaborative document editor for teams
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Seamless Real-Time Collaboration
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Edit documents simultaneously with your team members. See changes as they happen and work together efficiently.
              </p>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Rich Text Formatting
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Format your documents with a comprehensive set of tools. Add headings, lists, links, and more.
              </p>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Secure Document Sharing
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Control who can view, edit, or comment on your documents with flexible permission settings.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col justify-center">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Welcome to CollabEdit</CardTitle>
              <CardDescription>
                Sign in to your account or create a new one to get started
              </CardDescription>
            </CardHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                    <CardContent className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    
                    <CardFooter className="flex flex-col space-y-4">
                      <Button 
                        type="submit" 
                        className="w-full font-bold" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Logging in..." : "Login"}
                      </Button>
                      
                      <div className="flex items-center">
                        <Separator className="flex-1" />
                        <span className="mx-4 text-sm text-muted-foreground">OR</span>
                        <Separator className="flex-1" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <a 
                          href="/api/auth/google" 
                          className="inline-flex"
                        >
                          <Button 
                            variant="outline" 
                            className="w-full"
                          >
                            <FaGoogle className="mr-2" />
                            <span className="font-bold">Google</span>
                          </Button>
                        </a>
                        <a 
                          href="/api/auth/github" 
                          className="inline-flex"
                        >
                          <Button 
                            variant="outline" 
                            className="w-full"
                          >
                            <FaGithub className="mr-2" />
                            <span className="font-bold">GitHub</span>
                          </Button>
                        </a>
                      </div>
                    </CardFooter>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                    <CardContent className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Choose a username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Create a password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    
                    <CardFooter className="flex flex-col space-y-4">
                      <Button 
                        type="submit" 
                        className="w-full font-bold" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating account..." : "Create Account"}
                      </Button>
                      
                      <div className="flex items-center">
                        <Separator className="flex-1" />
                        <span className="mx-4 text-sm text-muted-foreground">OR</span>
                        <Separator className="flex-1" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <a 
                          href="/api/auth/google" 
                          className="inline-flex"
                        >
                          <Button 
                            variant="outline" 
                            className="w-full"
                          >
                            <FaGoogle className="mr-2" />
                            <span className="font-bold">Google</span>
                          </Button>
                        </a>
                        <a 
                          href="/api/auth/github" 
                          className="inline-flex"
                        >
                          <Button 
                            variant="outline" 
                            className="w-full"
                          >
                            <FaGithub className="mr-2" />
                            <span className="font-bold">GitHub</span>
                          </Button>
                        </a>
                      </div>
                    </CardFooter>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
