import { useState, useEffect } from "react";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Priority, WorkItemType } from "@my-better-t-app/db";
import { DependencyManager } from "./dependency-manager";

interface TaskFormModalProps {
    mode: "create" | "edit";
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    task?: any; // Optional for create mode, required for edit mode
}

export function TaskFormModal({
    mode,
    open,
    onOpenChange,
    projectId,
    task,
}: TaskFormModalProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
    const [type, setType] = useState<WorkItemType>(WorkItemType.TASK);
    const [assigneeId, setAssigneeId] = useState<string | null>(null);
    const [sprintId, setSprintId] = useState<string | null>(null);
    const [epicId, setEpicId] = useState<string | null>(null);
    const [storyPoints, setStoryPoints] = useState<number | null>(null);
    const [estimatedHours, setEstimatedHours] = useState<number | null>(null);
    const [remainingHours, setRemainingHours] = useState<number | null>(null);
    const [dueDate, setDueDate] = useState<string>("");
    const [componentIds, setComponentIds] = useState<string[]>([]);

    // Details state
    const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
    const [technicalNotes, setTechnicalNotes] = useState("");
    const [reproSteps, setReproSteps] = useState("");
    const [businessValue, setBusinessValue] = useState("");
    const [userPersona, setUserPersona] = useState("");

    // Fetch related data
    const { data: project } = useQuery<any>(
        trpc.project.getById.queryOptions({ id: projectId }) as any
    );
    const { data: sprints } = useQuery<any>(
        trpc.sprint.getAll.queryOptions({ projectId }) as any
    );
    const { data: epics } = useQuery<any>(
        trpc.workItem.getEpics.queryOptions({ projectId }) as any
    );
    const { data: components } = useQuery<any>(
        trpc.component.getByProject.queryOptions({ projectId }) as any
    );

    // Reset form to initial values
    const resetForm = () => {
        setTitle("");
        setDescription("");
        setPriority(Priority.MEDIUM);
        setType(WorkItemType.TASK);
        setAssigneeId(null);
        setSprintId(null);
        setEpicId(null);
        setStoryPoints(null);
        setEstimatedHours(null);
        setRemainingHours(null);
        setDueDate("");
        setComponentIds([]);
        setAcceptanceCriteria("");
        setTechnicalNotes("");
        setReproSteps("");
        setBusinessValue("");
        setUserPersona("");
    };

    // Initialize form based on mode
    useEffect(() => {
        if (mode === "edit" && task) {
            // Edit mode: populate with task data
            setTitle(task.title || "");
            setDescription(task.description || "");
            setPriority(task.priority || Priority.MEDIUM);
            setType(task.type || WorkItemType.TASK);
            setAssigneeId(task.assigneeId || null);
            setSprintId(task.sprintId || null);
            setEpicId(task.epicId || null);
            setStoryPoints(task.storyPoints || null);
            setEstimatedHours(task.estimatedHours || null);
            setRemainingHours(task.remainingHours || null);
            setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");

            // Details
            setAcceptanceCriteria(task.details?.acceptanceCriteria || "");
            setTechnicalNotes(task.details?.technicalNotes || "");
            setReproSteps(task.details?.reproSteps || "");
            setBusinessValue(task.details?.businessValue || "");
            setUserPersona(task.details?.userPersona || "");

            // Components - extract IDs from the junction table data
            const taskComponentIds = task.components?.map((c: any) => c.componentId || c.component?.id) || [];
            setComponentIds(taskComponentIds);
        } else if (mode === "create") {
            // Create mode: reset to empty values
            resetForm();
        }
    }, [mode, task]);

    // Mode-based mutation
    const mutation = useMutation({
        mutationFn: async (data: any) => {
            if (mode === "create") {
                return await client.workItem.create.mutate({
                    ...data,
                    projectId,
                });
            } else {
                return await client.workItem.update.mutate({
                    id: task.id,
                    ...data,
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workItem"] });
            const successMessage = mode === "create" 
                ? "Task created successfully" 
                : "Task updated successfully";
            toast.success(successMessage);
            onOpenChange(false);
            
            // Reset form only in create mode
            if (mode === "create") {
                resetForm();
            }
        },
        onError: (error) => {
            console.error(`[TaskFormModal] ${mode} error:`, error);
            const errorMessage = mode === "create"
                ? "Failed to create task"
                : "Failed to update task";
            toast.error(errorMessage);
        },
    });

    const handleSave = () => {
        // Validation
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }

        if (title.trim().length < 2) {
            toast.error("Title must be at least 2 characters");
            return;
        }

        // Helper function to convert "none" or null to undefined
        const normalizeOptionalId = (value: string | null) => {
            if (!value || value === "none") return undefined;
            return value;
        };

        const taskData = {
            title,
            description,
            priority,
            type,
            assigneeId: normalizeOptionalId(assigneeId),
            sprintId: normalizeOptionalId(sprintId),
            epicId: normalizeOptionalId(epicId),
            storyPoints: storyPoints === 0 ? null : storyPoints,
            estimatedHours: estimatedHours === 0 ? null : estimatedHours,
            remainingHours: remainingHours === 0 ? null : remainingHours,
            dueDate: dueDate && dueDate.trim() !== "" ? new Date(dueDate) : null,
            componentIds,
            details: {
                acceptanceCriteria,
                technicalNotes,
                reproSteps,
                businessValue,
                userPersona,
            },
        };

        console.log(`[TaskFormModal] ${mode} mode - Saving task with data:`, taskData);
        console.log(`[TaskFormModal] Details:`, {
            acceptanceCriteria,
            technicalNotes,
            reproSteps,
            businessValue,
            userPersona,
        });

        mutation.mutate(taskData);
    };

    const members = project?.organization?.users?.map((u: any) => u.user) || [];

    // Dynamic title and description
    const dialogTitle = mode === "create" 
        ? "Create Task" 
        : `Edit Task: ${task?.id?.split("-")[0]}`;
    const dialogDescription = mode === "create"
        ? "Add a new work item to your project."
        : "Update task details and planning information";

    // Conditional tabs based on mode
    const showDependenciesTab = mode === "edit";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>
                        {dialogDescription}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="general" className="w-full">
                    <TabsList className={`grid w-full ${showDependenciesTab ? "grid-cols-4" : "grid-cols-3"}`}>
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="planning">Planning</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        {showDependenciesTab && (
                            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                        )}
                    </TabsList>

                    {/* General Tab */}
                    <TabsContent value="general" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Task title"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Task description"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={type}
                                    onValueChange={(value) => setType(value as WorkItemType)}
                                >
                                    <SelectTrigger id="type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={WorkItemType.TASK}>Task</SelectItem>
                                        <SelectItem value={WorkItemType.BUG}>Bug</SelectItem>
                                        <SelectItem value={WorkItemType.STORY}>Story</SelectItem>
                                        <SelectItem value={WorkItemType.FEATURE}>Feature</SelectItem>
                                        <SelectItem value={WorkItemType.EPIC}>Epic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={priority}
                                    onValueChange={(value) => setPriority(value as Priority)}
                                >
                                    <SelectTrigger id="priority">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={Priority.LOW}>Low</SelectItem>
                                        <SelectItem value={Priority.MEDIUM}>Medium</SelectItem>
                                        <SelectItem value={Priority.HIGH}>High</SelectItem>
                                        <SelectItem value={Priority.CRITICAL}>Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="assignee">Assignee</Label>
                                <Select
                                    value={assigneeId || "none"}
                                    onValueChange={setAssigneeId}
                                >
                                    <SelectTrigger id="assignee">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Unassigned</SelectItem>
                                        {members.map((member: any) => (
                                            <SelectItem key={member.id} value={member.id}>
                                                {member.firstName} {member.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sprint">Sprint</Label>
                                <Select
                                    value={sprintId || "none"}
                                    onValueChange={setSprintId}
                                >
                                    <SelectTrigger id="sprint">
                                        <SelectValue placeholder="No Sprint" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Sprint</SelectItem>
                                        {sprints?.map((sprint: any) => (
                                            <SelectItem key={sprint.id} value={sprint.id}>
                                                {sprint.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="epic">Epic</Label>
                                <Select
                                    value={epicId || "none"}
                                    onValueChange={setEpicId}
                                >
                                    <SelectTrigger id="epic">
                                        <SelectValue placeholder="No Epic" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Epic</SelectItem>
                                        {epics?.map((epic: any) => (
                                            <SelectItem key={epic.id} value={epic.id}>
                                                {epic.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Components</Label>
                            <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                                {components && components.length > 0 ? (
                                    components.map((component: any) => (
                                        <div key={component.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`component-${component.id}`}
                                                checked={componentIds.includes(component.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setComponentIds([...componentIds, component.id]);
                                                    } else {
                                                        setComponentIds(componentIds.filter(id => id !== component.id));
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor={`component-${component.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: component.color }}
                                                />
                                                {component.name}
                                            </label>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No components defined yet</p>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Planning Tab */}
                    <TabsContent value="planning" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="storyPoints">Story Points</Label>
                                <Input
                                    id="storyPoints"
                                    type="number"
                                    value={storyPoints || ""}
                                    onChange={(e) => setStoryPoints(e.target.value ? Number(e.target.value) : null)}
                                    placeholder="e.g. 5"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                                <Input
                                    id="estimatedHours"
                                    type="number"
                                    value={estimatedHours || ""}
                                    onChange={(e) => setEstimatedHours(e.target.value ? Number(e.target.value) : null)}
                                    placeholder="e.g. 8"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="remainingHours">Remaining Hours</Label>
                                <Input
                                    id="remainingHours"
                                    type="number"
                                    value={remainingHours || ""}
                                    onChange={(e) => setRemainingHours(e.target.value ? Number(e.target.value) : null)}
                                    placeholder="e.g. 4"
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* Details Tab */}
                    <TabsContent value="details" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="acceptanceCriteria">Acceptance Criteria</Label>
                            <Textarea
                                id="acceptanceCriteria"
                                value={acceptanceCriteria}
                                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                                placeholder="What needs to be true for this task to be done?"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="technicalNotes">Technical Notes</Label>
                            <Textarea
                                id="technicalNotes"
                                value={technicalNotes}
                                onChange={(e) => setTechnicalNotes(e.target.value)}
                                placeholder="Implementation details, architectural decisions..."
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reproSteps">Reproduction Steps (for Bugs)</Label>
                            <Textarea
                                id="reproSteps"
                                value={reproSteps}
                                onChange={(e) => setReproSteps(e.target.value)}
                                placeholder="1. Go to... 2. Click on..."
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="businessValue">Business Value</Label>
                                <Input
                                    id="businessValue"
                                    value={businessValue}
                                    onChange={(e) => setBusinessValue(e.target.value)}
                                    placeholder="High, Customer Request, etc."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="userPersona">User Persona</Label>
                                <Input
                                    id="userPersona"
                                    value={userPersona}
                                    onChange={(e) => setUserPersona(e.target.value)}
                                    placeholder="Admin, End User, etc."
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* Dependencies Tab (Edit mode only) */}
                    {showDependenciesTab && (
                        <TabsContent value="dependencies" className="py-4">
                            <DependencyManager
                                workItemId={task.id}
                                projectId={projectId}
                            />
                        </TabsContent>
                    )}
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending 
                            ? (mode === "create" ? "Creating..." : "Saving...") 
                            : (mode === "create" ? "Create Task" : "Save Changes")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
