import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase";
import { Menu, User, Sparkles, Briefcase, Video, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useLocation } from "wouter";

export function Header() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const initials = user?.displayName
    ? user.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.substring(0, 2).toUpperCase() || "U";
  const { data: profile } = useQuery<any>({ queryKey: ["/api/profile"] });
  const displayPhoto = profile?.personalInfo?.photoBase64 || user?.photoURL || undefined;

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>
        <h2 className="text-lg font-semibold md:hidden font-display text-primary">Placement Prime</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Name + email display */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium leading-none">{user?.displayName || "User"}</p>
          <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
        </div>

        {/* Account dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer border-2 border-border hover:ring-2 hover:ring-primary/30 hover:border-primary/40 transition-all">
              <AvatarImage src={displayPhoto} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-bold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64 p-2">
            {/* User info header */}
            <div className="flex items-center gap-3 p-2 border-b border-border/50">
              <Avatar className="h-10 w-10">
                <AvatarImage src={displayPhoto} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground truncate">{user?.displayName || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield className="h-3 w-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-600 font-medium">Verified</span>
                </div>
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Navigation items */}
            <DropdownMenuItem
              className="cursor-pointer gap-2.5 py-2.5 rounded-lg"
              onClick={() => setLocation("/account")}
            >
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Edit Profile</p>
                <p className="text-[11px] text-muted-foreground">Manage personal info</p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2.5 py-2.5 rounded-lg"
              onClick={() => setLocation("/enhance")}
            >
              <div className="h-7 w-7 rounded-md bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Resume Enhancer</p>
                <p className="text-[11px] text-muted-foreground">Boost with AI</p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2.5 py-2.5 rounded-lg"
              onClick={() => setLocation("/jobs")}
            >
              <div className="h-7 w-7 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Job Tracker</p>
                <p className="text-[11px] text-muted-foreground">Track applications</p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2.5 py-2.5 rounded-lg"
              onClick={() => setLocation("/mock")}
            >
              <div className="h-7 w-7 rounded-md bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Video className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Mock Interviews</p>
                <p className="text-[11px] text-muted-foreground">Practice sessions</p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Sign out */}
            <DropdownMenuItem
              className="cursor-pointer gap-2.5 py-2.5 rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={() => auth.signOut()}
            >
              <div className="h-7 w-7 rounded-md bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <LogOut className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium">Sign Out</p>
                <p className="text-[11px] text-destructive/60">End your session</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
