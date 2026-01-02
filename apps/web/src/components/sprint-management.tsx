import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState } from "react";
import { ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SprintManagementProps {
    projectId: string;
}

export function SprintManagement({ projectId }: SprintManagementProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [editSprint, setEditSprint] = useState<any>(null);
    const [deleteSprintId, setDeleteSprintId] = useState<string | null>(null);
    const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());
    const [newSprint, setNewSprint] = useState({ name: "", goal: "", startDate: "", endDate: "" });

    const { data: sprints, isLoading } = useQuery<any>(
        trpc.sprint.getAll.queryOptions({ projectId }) as any,
    );

    // Fetch all workItems to calculate task counts
    const { data: allWorkItems } = useQuery<any>(
        trpc.workItem.getAll.queryOptions({ projectId }) as any,
    );

    // Calculate task count per sprint
    const getTaskCount = (sprintId: string) => {
        return allWorkItems?.filter((item: any) => item.sprintId === sprintId).length || 0;
    };

    const toggleExpand = (sprintId: string) => {
        setExpandedSprints(prev => {
            const next = new Set(prev);
            if (next.has(sprintId)) {
                next.delete(sprintId);
            } else {
                next.add(sprintId);
            }
            return next;
        });
    };

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.sprint.create.mutate(data);
        },
        onMutate: async (newSprintData) => {
            const queryKey = trpc.sprint.getAll.queryOptions({ projectId }).queryKey;
            
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey });
            
            // Snapshot previous value
            const previousSprints = queryClient.getQueryData(queryKey);
            
            // Optimistically add sprint
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                
                const tempId = `temp-${Date.now()}`;
                const now = new Date().toISOString();
                
                const optimisticSprint = {
                    id: tempId,
                    name: newSprintData.name,
                    goal: newSprintData.goal || null,
                    startDate: newSprintData.startDate,
                    endDate: newSprintData.endDate,
                    state: "planning",
                    projectId: newSprintData.projectId,
                    createdAt: now,
                    updatedAt: now,
                };
                
                console.log("[SprintManagement] Optimistic create:", optimisticSprint);
                return [...old, optimisticSprint];
            });
            
            return { previousSprints };
        },
        onError: (error: any, _data, context: any) => {
            const queryKey = trpc.sprint.getAll.queryOptions({ projectId }).queryKey;
            
            // Rollback on error
            if (context?.previousSprints) {
                queryClient.setQueryData(queryKey, context.previousSprints);
            }
            
            console.error("[SprintManagement] create error:", error);
            toast.error(error.message || "Failed to create sprint");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: trpc.sprint.getAll.queryOptions({ projectId }).queryKey 
            });
            toast.success("Sprint created successfully");
            setCreateOpen(false);
            setNewSprint({ name: "", goal: "", startDate: "", endDate: "" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.sprint.update.mutate(data);
        },
        onMutate: async (updatedSprint) => {
            const queryKey = trpc.sprint.getAll.queryOptions({ projectId }).queryKey;
            
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey });
            
            // Snapshot previous value
            const previousSprints = queryClient.getQueryData(queryKey);
            
            // Optimistically update sprint
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old.map((sprint: any) =>
                    sprint.id === updatedSprint.id 
                        ? { ...sprint, ...updatedSprint } 
                        : sprint
                );
            });
            
            console.log("[SprintManagement] Optimistic update:", updatedSprint);
            return { previousSprints };
        },
        onError: (error: any, _data, context: any) => {
            const queryKey = trpc.sprint.getAll.queryOptions({ projectId }).queryKey;
            
            // Rollback on error
            if (context?.previousSprints) {
                queryClient.setQueryData(queryKey, context.previousSprints);
            }
            
            console.error("[SprintManagement] update error:", error);
            toast.error("Failed to update sprint");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: trpc.sprint.getAll.queryOptions({ projectId }).queryKey 
            });
            toast.success("Sprint updated successfully");
            setEditSprint(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await client.sprint.delete.mutate({ id });
        },
        onMutate: async (sprintId) => {
            const queryKey = trpc.sprint.getAll.queryOptions({ projectId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousSprints = queryClient.getQueryData(queryKey);
            
            // Optimistically remove sprint
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old.filter((sprint: any) => sprint.id !== sprintId);
            });
            
            console.log("[SprintManagement] Optimistic delete:", sprintId);
            return { previousSprints };
        },
        onError: (error: any, _id, context: any) => {
            const queryKey = trpc.sprint.getAll.queryOptions({ projectId }).queryKey;
            
            if (context?.previousSprints) {
                queryClient.setQueryData(queryKey, context.previousSprints);
            }
            console.error("[SprintManagement] delete error:", error);
            toast.error("Failed to delete sprint");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: trpc.sprint.getAll.queryOptions({ projectId }).queryKey 
            });
            toast.success("Sprint deleted successfully");
            setDeleteSprintId(null);
        },
    });

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full" />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Sprints</h2>
                <Button onClick={() => setCreateOpen(true)}>New Sprint</Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {sprints?.length === 0 ? (
                    <div className="p-12 text-center border rounded-lg border-dashed text-muted-foreground">
                        No sprints created yet.
                    </div>
                ) : (
                    sprints?.map((sprint: any) => {
                        const taskCount = getTaskCount(sprint.id);
                        const isExpanded = expandedSprints.has(sprint.id);
                        const sprintTasks = allWorkItems?.filter((item: any) => item.sprintId === sprint.id) || [];
                        
                        return (
                            <Card key={sprint.id}>
                                <CardHeader className="flex flex-row items-center justify-between py-4">
                                    <div className="flex items-center gap-4 flex-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleExpand(sprint.id)}
                                            className="p-1 h-8 w-8"
                                        >
                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </Button>
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-lg">{sprint.name}</CardTitle>
                                                <Badge variant="outline">{taskCount} tasks</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{sprint.goal || "No goal set"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right text-sm">
                                            <div className="font-medium">
                                                {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                                            </div>
                                            <Badge variant={sprint.state === "active" ? "default" : "secondary"}>
                                                {sprint.state}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => setEditSprint(sprint)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => setDeleteSprintId(sprint.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                            {sprint.state === "planning" && (
                                                <Button size="sm" onClick={() => updateMutation.mutate({ id: sprint.id, state: "active" } as any)}>
                                                    Start Sprint
                                                </Button>
                                            )}
                                            {sprint.state === "active" && (
                                                <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: sprint.id, state: "completed" } as any)}>
                                                    Complete Sprint
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                
                                {/* Collapsible Task Table */}
                                {isExpanded && (
                                    <CardContent className="pt-0">
                                        {sprintTasks.length === 0 ? (
                                            <div className="py-8 text-center text-sm text-muted-foreground">
                                                No tasks in this sprint
                                            </div>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>ID</TableHead>
                                                        <TableHead>Title</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Priority</TableHead>
                                                        <TableHead>State</TableHead>
                                                        <TableHead>Assignee</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sprintTasks.map((task: any) => (
                                                        <TableRow key={task.id}>
                                                            <TableCell className="font-mono text-xs">
                                                                {task.id.split("-")[0]}
                                                            </TableCell>
                                                            <TableCell>{task.title}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{task.type}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={task.priority === "HIGH" ? "destructive" : "secondary"}>
                                                                    {task.priority}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{task.state?.name || "N/A"}</TableCell>
                                                            <TableCell>
                                                                {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned"}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Sprint</DialogTitle>
                        <DialogDescription>Set up a new sprint for your project.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={newSprint.name}
                                onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                                placeholder="Sprint 1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Goal</Label>
                            <Input
                                value={newSprint.goal}
                                onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })}
                                placeholder="Complete core features"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={newSprint.startDate}
                                    onChange={(e) => setNewSprint({ ...newSprint, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={newSprint.endDate}
                                    onChange={(e) => setNewSprint({ ...newSprint, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => createMutation.mutate({ ...newSprint, projectId } as any)}
                            disabled={!newSprint.name || !newSprint.startDate || !newSprint.endDate}
                        >
                            Create Sprint
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Sprint Dialog */}
            <Dialog open={!!editSprint} onOpenChange={(open) => !open && setEditSprint(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Sprint</DialogTitle>
                        <DialogDescription>Update sprint details.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={editSprint?.name || ""}
                                onChange={(e) => setEditSprint({ ...editSprint, name: e.target.value })}
                                placeholder="Sprint 1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Goal</Label>
                            <Input
                                value={editSprint?.goal || ""}
                                onChange={(e) => setEditSprint({ ...editSprint, goal: e.target.value })}
                                placeholder="Complete core features"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={editSprint?.startDate ? new Date(editSprint.startDate).toISOString().split('T')[0] : ""}
                                    onChange={(e) => setEditSprint({ ...editSprint, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={editSprint?.endDate ? new Date(editSprint.endDate).toISOString().split('T')[0] : ""}
                                    onChange={(e) => setEditSprint({ ...editSprint, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditSprint(null)}>Cancel</Button>
                        <Button
                            onClick={() => updateMutation.mutate({ 
                                id: editSprint.id,
                                name: editSprint.name,
                                goal: editSprint.goal,
                                startDate: editSprint.startDate,
                                endDate: editSprint.endDate,
                            } as any)}
                            disabled={!editSprint?.name}
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteSprintId} onOpenChange={(open) => !open && setDeleteSprintId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Sprint</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this sprint? This action cannot be undone.
                            Tasks in this sprint will not be deleted but will be unassigned from the sprint.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteSprintId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteSprintId && deleteMutation.mutate(deleteSprintId)}
                        >
                            Delete Sprint
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
