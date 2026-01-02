import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState } from "react";
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
    const [newSprint, setNewSprint] = useState({ name: "", goal: "", startDate: "", endDate: "" });

    const { data: sprints, isLoading } = useQuery<any>(
        trpc.sprint.getAll.queryOptions({ projectId }) as any,
    );

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
                    sprints?.map((sprint: any) => (
                        <Card key={sprint.id}>
                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">{sprint.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{sprint.goal || "No goal set"}</p>
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
                            </CardHeader>
                        </Card>
                    ))
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
        </div>
    );
}
