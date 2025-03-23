import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Sun, Moon, Monitor, BellRing, Laptop, File, Keyboard, Palette } from "lucide-react";

// Editor settings schema
const editorSettingsSchema = z.object({
  fontFamily: z.string(),
  fontSize: z.string(),
  lineSpacing: z.string(),
  autosaveInterval: z.string(),
  spellCheck: z.boolean(),
  showLineNumbers: z.boolean(),
});

// Notification settings schema
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  documentShared: z.boolean(),
  commentAdded: z.boolean(),
  documentEdited: z.boolean(),
});

// Theme settings schema
const themeSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  primaryColor: z.string(),
});

type EditorSettings = z.infer<typeof editorSettingsSchema>;
type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
type ThemeSettings = z.infer<typeof themeSettingsSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("editor");

  // Get settings from localStorage or use defaults
  const getStoredSettings = <T,>(key: string, defaults: T): T => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaults;
  };

  // Default editor settings
  const defaultEditorSettings: EditorSettings = {
    fontFamily: "Arial",
    fontSize: "16",
    lineSpacing: "1.5",
    autosaveInterval: "30",
    spellCheck: true,
    showLineNumbers: true,
  };

  // Default notification settings
  const defaultNotificationSettings: NotificationSettings = {
    emailNotifications: true,
    documentShared: true,
    commentAdded: true,
    documentEdited: false,
  };

  // Default theme settings
  const defaultThemeSettings: ThemeSettings = {
    theme: "system",
    primaryColor: "blue",
  };

  // Forms for different settings categories
  const editorForm = useForm<EditorSettings>({
    resolver: zodResolver(editorSettingsSchema),
    defaultValues: getStoredSettings("editorSettings", defaultEditorSettings),
  });

  const notificationForm = useForm<NotificationSettings>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: getStoredSettings("notificationSettings", defaultNotificationSettings),
  });

  const themeForm = useForm<ThemeSettings>({
    resolver: zodResolver(themeSettingsSchema),
    defaultValues: getStoredSettings("themeSettings", defaultThemeSettings),
  });

  // Save editor settings
  const onEditorSubmit = (data: EditorSettings) => {
    localStorage.setItem("editorSettings", JSON.stringify(data));
    toast({
      title: "Editor settings saved",
      description: "Your editor preferences have been updated.",
    });
  };

  // Save notification settings
  const onNotificationSubmit = (data: NotificationSettings) => {
    localStorage.setItem("notificationSettings", JSON.stringify(data));
    toast({
      title: "Notification settings saved",
      description: "Your notification preferences have been updated.",
    });
  };

  // Save theme settings
  const onThemeSubmit = (data: ThemeSettings) => {
    localStorage.setItem("themeSettings", JSON.stringify(data));
    document.documentElement.classList.remove("light", "dark");
    
    if (data.theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.classList.add(systemTheme);
    } else {
      document.documentElement.classList.add(data.theme);
    }
    
    // Apply primary color (in a real app, this would update CSS variables)
    toast({
      title: "Theme settings saved",
      description: "Your theme preferences have been updated.",
    });
  };

  // Apply theme on load
  useEffect(() => {
    const storedTheme = localStorage.getItem("themeSettings");
    if (storedTheme) {
      const { theme } = JSON.parse(storedTheme) as ThemeSettings;
      document.documentElement.classList.remove("light", "dark");
      
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        document.documentElement.classList.add(systemTheme);
      } else {
        document.documentElement.classList.add(theme);
      }
    }
  }, []);

  if (!user) {
    return (
      <div className="container max-w-4xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Loading settings...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Settings</CardTitle>
          <CardDescription>
            Customize the application to match your preferences
          </CardDescription>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <Keyboard className="h-4 w-4" /> Editor
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <BellRing className="h-4 w-4" /> Notifications
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" /> Appearance
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="pt-6">
            <TabsContent value="editor" className="mt-0">
              <Form {...editorForm}>
                <form onSubmit={editorForm.handleSubmit(onEditorSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={editorForm.control}
                      name="fontFamily"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Font Family</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select font" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Arial">Arial</SelectItem>
                              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                              <SelectItem value="Courier New">Courier New</SelectItem>
                              <SelectItem value="Georgia">Georgia</SelectItem>
                              <SelectItem value="Verdana">Verdana</SelectItem>
                              <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editorForm.control}
                      name="fontSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Font Size (px)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="12">12</SelectItem>
                              <SelectItem value="14">14</SelectItem>
                              <SelectItem value="16">16</SelectItem>
                              <SelectItem value="18">18</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="24">24</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editorForm.control}
                      name="lineSpacing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Line Spacing</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select spacing" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">Single</SelectItem>
                              <SelectItem value="1.15">1.15</SelectItem>
                              <SelectItem value="1.5">1.5</SelectItem>
                              <SelectItem value="2">Double</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editorForm.control}
                      name="autosaveInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Autosave Interval (seconds)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select interval" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="30">30</SelectItem>
                              <SelectItem value="60">60</SelectItem>
                              <SelectItem value="300">300 (5 minutes)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={editorForm.control}
                      name="spellCheck"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="font-bold">Spell Check</FormLabel>
                            <FormDescription>
                              Highlight misspelled words in the editor
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editorForm.control}
                      name="showLineNumbers"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="font-bold">Show Line Numbers</FormLabel>
                            <FormDescription>
                              Display line numbers in the margin
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit">Save Editor Settings</Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="notifications" className="mt-0">
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                  <FormField
                    control={notificationForm.control}
                    name="emailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-bold">Email Notifications</FormLabel>
                          <FormDescription>
                            Receive notifications via email
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h3 className="font-bold">Notification Events</h3>
                    
                    <FormField
                      control={notificationForm.control}
                      name="documentShared"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Document Shared</FormLabel>
                            <FormDescription>
                              When someone shares a document with you
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="commentAdded"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Comment Added</FormLabel>
                            <FormDescription>
                              When someone comments on your document
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="documentEdited"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Document Edited</FormLabel>
                            <FormDescription>
                              When someone edits a document you own
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit">Save Notification Settings</Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="appearance" className="mt-0">
              <Form {...themeForm}>
                <form onSubmit={themeForm.handleSubmit(onThemeSubmit)} className="space-y-6">
                  <FormField
                    control={themeForm.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Theme Mode</FormLabel>
                        <div className="grid grid-cols-3 gap-4 pt-2">
                          <Label
                            htmlFor="theme-light"
                            className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground ${
                              field.value === "light" ? "border-primary" : ""
                            }`}
                          >
                            <Sun className="mb-3 h-6 w-6" />
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">Light</h4>
                              <p className="text-xs text-muted-foreground">
                                Use light theme
                              </p>
                            </div>
                            <FormControl>
                              <input
                                type="radio"
                                id="theme-light"
                                className="sr-only"
                                name={field.name}
                                checked={field.value === "light"}
                                onChange={() => field.onChange("light")}
                              />
                            </FormControl>
                          </Label>
                          
                          <Label
                            htmlFor="theme-dark"
                            className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground ${
                              field.value === "dark" ? "border-primary" : ""
                            }`}
                          >
                            <Moon className="mb-3 h-6 w-6" />
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">Dark</h4>
                              <p className="text-xs text-muted-foreground">
                                Use dark theme
                              </p>
                            </div>
                            <FormControl>
                              <input
                                type="radio"
                                id="theme-dark"
                                className="sr-only"
                                name={field.name}
                                checked={field.value === "dark"}
                                onChange={() => field.onChange("dark")}
                              />
                            </FormControl>
                          </Label>
                          
                          <Label
                            htmlFor="theme-system"
                            className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground ${
                              field.value === "system" ? "border-primary" : ""
                            }`}
                          >
                            <Monitor className="mb-3 h-6 w-6" />
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">System</h4>
                              <p className="text-xs text-muted-foreground">
                                Match system theme
                              </p>
                            </div>
                            <FormControl>
                              <input
                                type="radio"
                                id="theme-system"
                                className="sr-only"
                                name={field.name}
                                checked={field.value === "system"}
                                onChange={() => field.onChange("system")}
                              />
                            </FormControl>
                          </Label>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={themeForm.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Primary Color</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select color" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="blue">Blue</SelectItem>
                            <SelectItem value="green">Green</SelectItem>
                            <SelectItem value="purple">Purple</SelectItem>
                            <SelectItem value="orange">Orange</SelectItem>
                            <SelectItem value="pink">Pink</SelectItem>
                            <SelectItem value="red">Red</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the primary color for buttons and accents
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button type="submit">Save Appearance Settings</Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </CardContent>
        </Tabs>
        
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            Settings are saved locally and only apply to this device
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}