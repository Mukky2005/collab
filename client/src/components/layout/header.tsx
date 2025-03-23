import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Menu, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  toggleSidebar?: () => void;
}

export function Header(_props?: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="bg-white border-b border-gray-200 flex items-center justify-between px-4 py-2 h-14">
      <div className="flex items-center space-x-4">
        <Link href="/" className="flex items-center">
          <svg
            className="h-8 w-8 text-primary"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M19.7 3.3c-.4-.4-1-.4-1.4 0l-4.3 4.3-8.7-3.5c-.5-.2-1.1 0-1.4.5-.3.5-.1 1.1.3 1.4L8 10 4 14c-1.1 1.2-1.8 2.8-1.8 4.5 0 3.6 2.9 6.5 6.5 6.5 1.7 0 3.3-.7 4.5-1.8l4-4 3.9 3.8c.2.2.5.3.7.3.2 0 .5-.1.7-.3.4-.4.4-1 0-1.4L19 18l4-4c1.1-1.2 1.8-2.8 1.8-4.5 0-3.6-2.9-6.5-6.5-6.5-1.7 0-3.3.7-4.5 1.8l-4 4-3.9-3.8c-.4-.4-1-.4-1.4 0-.4.4-.4 1 0 1.4L8 10z" />
          </svg>
          <span className="ml-2 text-xl font-semibold text-gray-800">
            CollabEdit
          </span>
        </Link>
      </div>

      <div className="flex items-center space-x-2">
        <DropdownMenu modal={true}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 bg-destructive text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                0
              </span>
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex justify-between">
              <span>Notifications</span>
              <Button variant="link" size="sm" className="h-auto p-0">
                Mark all as read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="py-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal={true}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 flex items-center gap-1 pr-1">
              <Avatar className="h-8 w-8 bg-primary">
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium">
                {user?.name}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/profile">
              <DropdownMenuItem>Your Profile</DropdownMenuItem>
            </Link>
            <Link href="/settings">
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
