import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { WorkItemType, Priority } from "@my-better-t-app/db";

interface CreateTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
}

export function CreateTaskModal({
    open,
    onOpenChange,
    projectId,
}: CreateTaskModalProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const { data: project } = useQuery<any>(
        trpc.project.getById.queryOptions({ id: projectId }) as any,
    );

    const createMutation = useMutation(
        trpc.workItem.create.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.workItem.getAll.queryFilter({ projectId }));
                toast.success("Task created successfully");
                onOpenChange(false);
                form.reset();
            },
            onError: (error: any) => {
                toast.error(error.message || "Failed to create task");
            },
        }) as any
    );

    const form = useForm({
        defaultValues: {
            title: "",
            description: "",
            type: WorkItemType.TASK,
            priority: Priority.MEDIUM,
            stateId: "",
            assigneeId: "",
        },
        onSubmit: async ({ value }) => {
            await createMutation.mutateAsync({
                ...value,
                projectId,
                stateId: value.stateId || project?.workItemStates?.[0]?.id,
                assigneeId: value.assigneeId || undefined,
            } as any);
        },
        validators: {
            onSubmit: z.object({
                title: z.string().min(2, "Title must be at least 2 characters"),
                description: z.string().optional().nullable(),
                type: z.nativeEnum(WorkItemType),
                priority: z.nativeEnum(Priority),
                stateId: z.string().optional(),
                assigneeId: z.string().optional(),
            }) as any,
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Task</DialogTitle>
                    <DialogDescription>
                        Add a new work item to your project.
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
                    <form.Field name="title">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Title</Label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    placeholder="Fix the login bug"
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
                                    placeholder="Describe the task in detail"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                            </div>
                        )}
                    </form.Field>

                    <div className="grid grid-cols-2 gap-4">
                        <form.Field name="type">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>Type</Label>
                                    <select
                                        id={field.name}
                                        name={field.name}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={field.state.value}
                                        onChange={(e) => field.handleChange(e.target.value as any)}
                                    >
                                        {Object.values(WorkItemType).map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </form.Field>

                        <form.Field name="priority">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>Priority</Label>
                                    <select
                                        id={field.name}
                                        name={field.name}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={field.state.value}
                                        onChange={(e) => field.handleChange(e.target.value as any)}
                                    >
                                        {Object.values(Priority).map((priority) => (
                                            <option key={priority} value={priority}>
                                                {priority}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </form.Field>
                    </div>

                    <form.Field name="stateId">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Initial State</Label>
                                <select
                                    id={field.name}
                                    name={field.name}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                >
                                    <option value="">Select a state</option>
                                    {project?.workItemStates?.map((state: any) => (
                                        <option key={state.id} value={state.id}>
                                            {state.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="assigneeId">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Assignee</Label>
                                <select
                                    id={field.name}
                                    name={field.name}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                >
                                    <option value="">Unassigned</option>
                                    {project?.organization?.users?.map((membership: any) => (
                                        <option key={membership.user.id} value={membership.user.id}>
                                            {membership.user.firstName} {membership.user.lastName}
                                        </option>
                                    ))}
                                </select>
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
                                    {state.isSubmitting ? "Creating..." : "Create Task"}
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
