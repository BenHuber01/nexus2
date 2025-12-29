import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
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

interface CreateOrganizationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationModal({
    open,
    onOpenChange,
}: CreateOrganizationModalProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const createMutation = useMutation(
        trpc.organization.create.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.organization.getAll.queryFilter());
                toast.success("Organization created successfully");
                onOpenChange(false);
                form.reset();
            },
            onError: (error: any) => {
                toast.error(error.message || "Failed to create organization");
            },
        })
    );

    const form = useForm({
        defaultValues: {
            name: "",
            slug: "",
            description: "",
        },
        onSubmit: async ({ value }) => {
            await createMutation.mutateAsync(value);
        },
        validators: {
            onSubmit: z.object({
                name: z.string().min(2, "Name must be at least 2 characters"),
                slug: z.string().min(2, "Slug must be at least 2 characters")
                    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
                description: z.string(),
            }),
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Organization</DialogTitle>
                    <DialogDescription>
                        Create a new organization to manage your projects and teams.
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
                                    placeholder="Acme Corp"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => {
                                        field.handleChange(e.target.value);
                                        // Auto-generate slug if it's empty or matches the previous auto-generated slug
                                        const newSlug = e.target.value
                                            .toLowerCase()
                                            .replace(/[^a-z0-9]+/g, "-")
                                            .replace(/^-+|-+$/g, "");
                                        form.setFieldValue("slug", newSlug);
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

                    <form.Field name="slug">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Slug</Label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    placeholder="acme-corp"
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
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    placeholder="Our main organization for all projects"
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
                                    {state.isSubmitting ? "Creating..." : "Create Organization"}
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
