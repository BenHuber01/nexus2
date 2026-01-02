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

interface CreatePortfolioModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
}

export function CreatePortfolioModal({
    open,
    onOpenChange,
    organizationId,
}: CreatePortfolioModalProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.portfolio.create.mutate(data);
        },
        onMutate: async (newPortfolio) => {
            const queryKey = trpc.portfolio.getAll.queryOptions({ organizationId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousPortfolios = queryClient.getQueryData(queryKey);
            
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old || !Array.isArray(old)) return old;
                
                const tempId = `temp-${Date.now()}`;
                const optimisticPortfolio = {
                    id: tempId,
                    ...newPortfolio,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                
                console.log("[CreatePortfolio] Optimistic create:", optimisticPortfolio);
                return [...old, optimisticPortfolio];
            });
            
            return { previousPortfolios };
        },
        onError: (error: any, _data, context: any) => {
            const queryKey = trpc.portfolio.getAll.queryOptions({ organizationId }).queryKey;
            
            if (context?.previousPortfolios) {
                queryClient.setQueryData(queryKey, context.previousPortfolios);
            }
            
            console.error("[CreatePortfolio] error:", error);
            toast.error(error.message || "Failed to create portfolio");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: trpc.portfolio.getAll.queryOptions({ organizationId }).queryKey 
            });
            toast.success("Portfolio created successfully");
            onOpenChange(false);
            form.reset();
        },
    });

    const form = useForm({
        defaultValues: {
            name: "",
            description: "",
            strategicGoal: "",
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
                description: z.string(),
                strategicGoal: z.string(),
            }),
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Portfolio</DialogTitle>
                    <DialogDescription>
                        Group related projects into a portfolio to track strategic goals.
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
                                    placeholder="Strategic Initiatives 2026"
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

                    <form.Field name="strategicGoal">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Strategic Goal (Optional)</Label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    placeholder="Increase market share by 20%"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
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
                                    placeholder="A brief description of the portfolio"
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
                                    {state.isSubmitting ? "Creating..." : "Create Portfolio"}
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
