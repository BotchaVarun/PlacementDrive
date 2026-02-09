import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  Briefcase, 
  Video, 
  LogOut,
  Sparkles
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/enhance", label: "Resume Enhancer", icon: Sparkles },
    { href: "/jobs", label: "Job Tracker", icon: Briefcase },
    { href: "/mock", label: "Mock Interviews", icon: Video },
  ];

  return (
    <div className="h-screen w-64 bg-card border-r border-border flex flex-col hidden md:flex sticky top-0">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold font-display text-primary flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          Placement Prime
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200
                  ${isActive 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-medium" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
          onClick={() => auth.signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
