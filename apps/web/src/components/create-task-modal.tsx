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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

    const { data: sprints } = useQuery<any>(
        trpc.sprint.getAll.queryOptions({ projectId }) as any,
    );

    const { data: epics } = useQuery<any>(
        trpc.workItem.getEpics.queryOptions({ projectId }) as any,
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
            sprintId: "",
            epicId: "",
            storyPoints: null as number | null,
            estimatedHours: null as number | null,
            remainingHours: null as number | null,
            dueDate: "",
            acceptanceCriteria: "",
            technicalNotes: "",
            reproSteps: "",
            businessValue: "",
            userPersona: "",
        },
        onSubmit: async ({ value }) => {
            await createMutation.mutateAsync({
                ...value,
                projectId,
                stateId: value.stateId || project?.workItemStates?.[0]?.id,
                assigneeId: value.assigneeId || undefined,
                sprintId: value.sprintId || undefined,
                epicId: value.epicId || undefined,
                storyPoints: value.storyPoints || undefined,
                estimatedHours: value.estimatedHours || undefined,
                remainingHours: value.remainingHours || undefined,
                dueDate: value.dueDate ? new Date(value.dueDate) : undefined,
                details: {
                    acceptanceCriteria: value.acceptanceCriteria,
                    technicalNotes: value.technicalNotes,
                    reproSteps: value.reproSteps,
                    businessValue: value.businessValue,
                    userPersona: value.userPersona,
                },
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
                sprintId: z.string().optional(),
                epicId: z.string().optional(),
                storyPoints: z.number().optional().nullable(),
                estimatedHours: z.number().optional().nullable(),
                remainingHours: z.number().optional().nullable(),
                dueDate: z.string().optional(),
                acceptanceCriteria: z.string().optional(),
                technicalNotes: z.string().optional(),
                reproSteps: z.string().optional(),
                businessValue: z.string().optional(),
                userPersona: z.string().optional(),
            }) as any,
        },
    });

    const members = project?.organization?.users?.map((u: any) => u.user) || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    className="space-y-4"
                >
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="planning">Planning</TabsTrigger>
                            <TabsTrigger value="details">Details</TabsTrigger>
                        </TabsList>

                        {/* General Tab */}
                        <TabsContent value="general" className="space-y-4 py-4">
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
                                        <Textarea
                                            id={field.name}
                                            name={field.name}
                                            placeholder="Describe the task in detail"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            rows={3}
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
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
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
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
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

                            <div className="grid grid-cols-3 gap-4">
                                <form.Field name="stateId">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name}>Initial State</Label>
                                            <select
                                                id={field.name}
                                                name={field.name}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
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
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                            >
                                                <option value="">Unassigned</option>
                                                {members.map((member: any) => (
                                                    <option key={member.id} value={member.id}>
                                                        {member.firstName} {member.lastName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </form.Field>

                                <form.Field name="sprintId">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name}>Sprint</Label>
                                            <select
                                                id={field.name}
                                                name={field.name}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                            >
                                                <option value="">No Sprint</option>
                                                {sprints?.map((sprint: any) => (
                                                    <option key={sprint.id} value={sprint.id}>
                                                        {sprint.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </form.Field>
                            </div>

                            <form.Field name="epicId">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor={field.name}>Epic (Optional)</Label>
                                        <select
                                            id={field.name}
                                            name={field.name}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                            value={field.state.value}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                        >
                                            <option value="">No Epic</option>
                                            {epics?.map((epic: any) => (
                                                <option key={epic.id} value={epic.id}>
                                                    {epic.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </form.Field>
                        </TabsContent>

                        {/* Planning Tab */}
                        <TabsContent value="planning" className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <form.Field name="storyPoints">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name}>Story Points</Label>
                                            <Input
                                                id={field.name}
                                                type="number"
                                                placeholder="e.g. 5"
                                                value={field.state.value ?? ""}
                                                onChange={(e) => field.handleChange(e.target.value ? Number(e.target.value) : null)}
                                            />
                                        </div>
                                    )}
                                </form.Field>

                                <form.Field name="dueDate">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name}>Due Date</Label>
                                            <Input
                                                id={field.name}
                                                type="date"
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </form.Field>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <form.Field name="estimatedHours">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name}>Estimated Hours</Label>
                                            <Input
                                                id={field.name}
                                                type="number"
                                                placeholder="e.g. 8"
                                                value={field.state.value ?? ""}
                                                onChange={(e) => field.handleChange(e.target.value ? Number(e.target.value) : null)}
                                            />
                                        </div>
                                    )}
                                </form.Field>

                                <form.Field name="remainingHours">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name}>Remaining Hours</Label>
                                            <Input
                                                id={field.name}
                                                type="number"
                                                placeholder="e.g. 4"
                                                value={field.state.value ?? ""}
                                                onChange={(e) => field.handleChange(e.target.value ? Number(e.target.value) : null)}
                                            />
                                        </div>
                                    )}
                                </form.Field>
                            </div>
                        </TabsContent>

                        {/* Details Tab */}
                        <TabsContent value="details" className="space-y-4 py-4">
                            <form.Field name="acceptanceCriteria">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor={field.name}>Acceptance Criteria</Label>
                                        <Textarea
                                            id={field.name}
                                            placeholder="What needs to be true for this task to be done?"
                                            value={field.state.value}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                )}
                            </form.Field>

                            <form.Field name="technicalNotes">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor={field.name}>Technical Notes</Label>
                                        <Textarea
                                            id={field.name}
                                            placeholder="Technical implementation details..."
                                            value={field.state.value}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                )}
                            </form.Field>

                            <form.Field name="reproSteps">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor={field.name}>Reproduction Steps (for bugs)</Label>
                                        <Textarea
                                            id={field.name}
                                            placeholder="Steps to reproduce the issue..."
                                            value={field.state.value}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                )}
                            </form.Field>

                            <div className="grid grid-cols-2 gap-4">
                                <form.Field name="businessValue">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name}>Business Value</Label>
                                            <Input
                                                id={field.name}
                                                placeholder="Why is this important?"
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </form.Field>

                                <form.Field name="userPersona">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor={field.name}>User Persona</Label>
                                            <Input
                                                id={field.name}
                                                placeholder="Admin, End User, etc."
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </form.Field>
                            </div>
                        </TabsContent>
                    </Tabs>

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
