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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface LogTimeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workItemId: string;
}

export function LogTimeModal({
    open,
    onOpenChange,
    workItemId,
}: LogTimeModalProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const createMutation = useMutation(
        trpc.timeLog.create.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.timeLog.getByWorkItem.queryFilter({ workItemId }));
                toast.success("Time logged successfully");
                onOpenChange(false);
                form.reset();
            },
            onError: (error: any) => {
                toast.error(error.message || "Failed to log time");
            },
        })
    );

    const form = useForm({
        defaultValues: {
            duration: 0,
            description: "",
            billable: true,
            logDate: new Date().toISOString().split('T')[0],
        },
        onSubmit: async ({ value }) => {
            await createMutation.mutateAsync({
                ...value,
                duration: value.duration * 3600, // Convert hours to seconds
                logDate: new Date(value.logDate),
                workItemId,
            });
        },
        validators: {
            onSubmit: z.object({
                duration: z.number().positive("Duration must be positive"),
                description: z.string(),
                billable: z.boolean(),
                logDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
            }),
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Time</DialogTitle>
                    <DialogDescription>
                        Record the time spent on this work item.
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
                    <form.Field name="duration">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Duration (Hours)</Label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type="number"
                                    step="0.1"
                                    placeholder="1.5"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(parseFloat(e.target.value))}
                                />
                                {field.state.meta.errors.length > 0 && (
                                    <p className="text-red-500 text-xs">
                                        {field.state.meta.errors.join(", ")}
                                    </p>
                                )}
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="logDate">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Date</Label>
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
                                    placeholder="What did you work on?"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="billable">
                        {(field) => (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={field.name}
                                    checked={field.state.value}
                                    onCheckedChange={(checked) => field.handleChange(!!checked)}
                                />
                                <Label htmlFor={field.name}>Billable</Label>
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
                                    {state.isSubmitting ? "Logging..." : "Log Time"}
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
