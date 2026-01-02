import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { toast } from "sonner";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateMilestoneModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
}

export function CreateMilestoneModal({
    open,
    onOpenChange,
    projectId,
}: CreateMilestoneModalProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.milestone.create.mutate(data);
        },
        onMutate: async (newMilestone) => {
            const queryKey = trpc.milestone.getAll.queryOptions({ projectId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousMilestones = queryClient.getQueryData(queryKey);
            
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old || !Array.isArray(old)) return old;
                
                const tempId = `temp-${Date.now()}`;
                const optimisticMilestone = {
                    id: tempId,
                    ...newMilestone,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                
                console.log("[CreateMilestone] Optimistic create:", optimisticMilestone);
                return [...old, optimisticMilestone];
            });
            
            return { previousMilestones };
        },
        onError: (error: any, _data, context: any) => {
            const queryKey = trpc.milestone.getAll.queryOptions({ projectId }).queryKey;
            
            if (context?.previousMilestones) {
                queryClient.setQueryData(queryKey, context.previousMilestones);
            }
            
            console.error("[CreateMilestone] error:", error);
            toast.error(error.message || "Failed to create milestone");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: trpc.milestone.getAll.queryOptions({ projectId }).queryKey 
            });
            toast.success("Milestone created successfully");
            onOpenChange(false);
            form.reset();
        },
    });

    const form = useForm({
        defaultValues: {
            name: "",
            description: "",
            dueDate: new Date().toISOString().split('T')[0],
        },
        onSubmit: async ({ value }) => {
            await createMutation.mutateAsync({
                ...value,
                dueDate: new Date(value.dueDate),
                projectId,
            });
        },
        validators: {
            onSubmit: z.object({
                name: z.string().min(2, "Name must be at least 2 characters"),
                description: z.string(),
                dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
            }),
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Milestone</DialogTitle>
                    <DialogDescription>
                        Set a significant point or event in your project.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(e: React.FormEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                    }}
                    className="space-y-4 py-4"
                >
                    <form.Field name="name">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Name</Label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    placeholder="Beta Release"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                {field.state.meta.errors.length > 0 && (
                                    <p className="text-red-500 text-xs">
                                        {field.state.meta.errors.join(", ")}
                                    </p>
                                )}
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="dueDate">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Due Date</Label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type="date"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                {field.state.meta.errors.length > 0 && (
                                    <p className="text-red-500 text-xs">
                                        {field.state.meta.errors.join(", ")}
                                    </p>
                                )}
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="description">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Description (Optional)</Label>
                                <Textarea
                                    id={field.name}
                                    name={field.name}
                                    placeholder="Key features included in this release"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                            </div>
                        )}
                    </form.Field>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <form.Subscribe>
                            {(state) => (
                                <Button
                                    type="submit"
                                    disabled={!state.canSubmit || state.isSubmitting}
                                >
                                    {state.isSubmitting ? "Creating..." : "Create Milestone"}
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
