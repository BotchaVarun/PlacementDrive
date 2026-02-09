import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Video, Clock, Mic } from "lucide-react";

export default function MockInterviews() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-2xl mx-auto space-y-6">
        <div className="bg-primary/10 p-8 rounded-full">
           <Video className="h-16 w-16 text-primary" />
        </div>
        
        <div>
           <h1 className="text-4xl font-bold font-display mb-4">Mock Interviews Coming Soon</h1>
           <p className="text-lg text-muted-foreground leading-relaxed">
             We are building an AI-powered interviewer that will conduct realistic voice interviews tailored to your target job descriptions.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8">
           <FeatureBox 
             icon={Mic} 
             title="Voice AI" 
             desc="Real-time speech-to-text and response generation." 
           />
           <FeatureBox 
             icon={Clock} 
             title="Timed Sessions" 
             desc="Practice under real time constraints." 
           />
           <FeatureBox 
             icon={Video} 
             title="Behavioral & Tech" 
             desc="Specialized question banks for every role." 
           />
        </div>

        <Button size="lg" disabled className="mt-8">
          Join Waitlist
        </Button>
      </div>
    </DashboardLayout>
  );
}

function FeatureBox({ icon: Icon, title, desc }: any) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
      <Icon className="h-8 w-8 text-primary mx-auto mb-4" />
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
