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

interface CreateProjectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
}

export function CreateProjectModal({
    open,
    onOpenChange,
    organizationId,
}: CreateProjectModalProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.project.create.mutate(data);
        },
        onMutate: async (newProject) => {
            const queryKey = trpc.project.getAll.queryOptions({ organizationId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousProjects = queryClient.getQueryData(queryKey);
            
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old || !Array.isArray(old)) return old;
                
                const tempId = `temp-${Date.now()}`;
                const optimisticProject = {
                    id: tempId,
                    ...newProject,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                
                console.log("[CreateProject] Optimistic create:", optimisticProject);
                return [...old, optimisticProject];
            });
            
            return { previousProjects };
        },
        onError: (error: any, _data, context: any) => {
            const queryKey = trpc.project.getAll.queryOptions({ organizationId }).queryKey;
            
            if (context?.previousProjects) {
                queryClient.setQueryData(queryKey, context.previousProjects);
            }
            
            console.error("[CreateProject] error:", error);
            toast.error(error.message || "Failed to create project");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: trpc.project.getAll.queryOptions({ organizationId }).queryKey 
            });
            toast.success("Project created successfully");
            onOpenChange(false);
            form.reset();
        },
    });

    const form = useForm({
        defaultValues: {
            name: "",
            key: "",
            description: "",
        },
        onSubmit: async ({ value }) => {
            await createMutation.mutateAsync({
                ...value,
                organizationId,
            });
        },
        validators: {
            onSubmit: z.object({
                name: z.string().min(2, "Name must be at least 2 characters"),
                key: z.string().min(2, "Key must be at least 2 characters")
                    .max(10, "Key must be at most 10 characters")
                    .regex(/^[A-Z0-9]+$/, "Key can only contain uppercase letters and numbers"),
                description: z.string(),
            }),
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Project</DialogTitle>
                    <DialogDescription>
                        Create a new project within your organization.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(e) => {
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
                                    placeholder="My Awesome Project"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => {
                                        field.handleChange(e.target.value);
                                        // Auto-generate key if it's empty
                                        if (e.target.value.length >= 2) {
                                            const newKey = e.target.value
                                                .split(/\s+/)
                                                .map(word => word[0])
                                                .join("")
                                                .toUpperCase()
                                                .replace(/[^A-Z0-9]/g, "")
                                                .slice(0, 5);
                                            if (newKey) {
                                                form.setFieldValue("key", newKey);
                                            }
                                        }
                                    }}
                                />
                                {field.state.meta.errors.length > 0 && (
                                    <p className="text-red-500 text-xs">
                                        {field.state.meta.errors.join(", ")}
                                    </p>
                                )}
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="key">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Key</Label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    placeholder="PROJ"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Short identifier for your project (e.g., PROJ, NEXUS).
                                </p>
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
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    placeholder="A brief description of the project"
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
                                    {state.isSubmitting ? "Creating..." : "Create Project"}
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
