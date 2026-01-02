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

interface EditTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: any;
    projectId: string;
}

export function EditTaskModal({
    open,
    onOpenChange,
    task,
    projectId,
}: EditTaskModalProps) {
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

    // Initialize form when task changes
    useEffect(() => {
        if (task) {
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
        }
    }, [task]);

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.workItem.update.mutate(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workItem"] });
            toast.success("Task updated successfully");
            onOpenChange(false);
        },
        onError: (error) => {
            console.error(error);
            toast.error("Failed to update task");
        },
    });

    const handleSave = () => {
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }

        updateMutation.mutate({
            id: task.id,
            title,
            description,
            priority,
            type,
            assigneeId: assigneeId === "none" ? null : assigneeId,
            sprintId: sprintId === "none" ? null : sprintId,
            epicId: epicId === "none" ? null : epicId,
            storyPoints: storyPoints === 0 ? null : storyPoints,
            estimatedHours: estimatedHours === 0 ? null : estimatedHours,
            remainingHours: remainingHours === 0 ? null : remainingHours,
            dueDate: dueDate ? new Date(dueDate) : null,
            componentIds,
            details: {
                acceptanceCriteria,
                technicalNotes,
                reproSteps,
                businessValue,
                userPersona,
            },
        });
    };

    const members = project?.organization?.users?.map((u: any) => u.user) || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Task: {task?.id?.split("-")[0]}</DialogTitle>
                    <DialogDescription>
                        Update task details and planning information
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="planning">Planning</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                    </TabsList>

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

                    <TabsContent value="dependencies" className="py-4">
                        <DependencyManager
                            workItemId={task.id}
                            projectId={projectId}
                        />
                    </TabsContent>
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
                        disabled={updateMutation.isPending}
                    >
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

