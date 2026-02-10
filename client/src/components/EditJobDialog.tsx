import { useState, useEffect } from "react";
import { useUpdateJob } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Job } from "@shared/schema";

interface EditJobDialogProps {
    job: Job | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditJobDialog({ job, open, onOpenChange }: EditJobDialogProps) {
    const updateJob = useUpdateJob();
    const [formData, setFormData] = useState({
        title: "",
        company: "",
        description: "",
        source: "",
        url: "",
        status: "new",
    });

    useEffect(() => {
        if (job) {
            setFormData({
                title: job.title,
                company: job.company,
                description: job.description,
                source: job.source || "Manual",
                url: job.url || "",
                status: job.status,
            });
        }
    }, [job]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!job) return;

        await updateJob.mutateAsync({ id: job.id, data: formData });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Job Details</DialogTitle>
                    <DialogDescription>
                        Update the details for your application at {formData.company}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-title">Job Title</Label>
                        <Input
                            id="edit-title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Senior Frontend Engineer"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-company">Company</Label>
                        <Input
                            id="edit-company"
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            placeholder="e.g. Acme Corp"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-status">Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">To Apply</SelectItem>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="interview">Interviewing</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="offer">Offer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-url">URL (Optional)</Label>
                        <Input
                            id="edit-url"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            placeholder="https://..."
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-description">Description / Notes</Label>
                        <Textarea
                            id="edit-description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Paste job description or add notes..."
                            required
                        />
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={updateJob.isPending}>
                            {updateJob.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
