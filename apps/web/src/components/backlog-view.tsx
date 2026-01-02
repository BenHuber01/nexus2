import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Priority } from "@my-better-t-app/db";
import { Button } from "@/components/ui/button";
import { TaskFormModal } from "@/components/task-form-modal";
import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface BacklogViewProps {
    projectId: string;
}

export function BacklogView({ projectId }: BacklogViewProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();
    const [editingTask, setEditingTask] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { data: project } = useQuery<any>(
        trpc.project.getById.queryOptions({ id: projectId }) as any,
    );

    const { data: workItems, isLoading: itemsLoading } = useQuery<any>({
        ...(trpc.workItem.getAll.queryOptions({ projectId }) as any),
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
    });

    const { data: sprints } = useQuery<any>(
        trpc.sprint.getAll.queryOptions({ projectId }) as any,
    );

    const moveToSprintMutation = useMutation({
        mutationFn: async ({ id, sprintId }: { id: string; sprintId: string }) => {
            // Skip mutation if ID is temporary (optimistic create not yet confirmed)
            if (id.startsWith('temp-')) {
                console.log("[BacklogView] Skipping moveToSprint for temp ID:", id);
                throw new Error("Cannot move item with temporary ID. Please wait for creation to complete.");
            }
            return await client.workItem.moveToSprint.mutate({ id, sprintId });
        },
        onMutate: async ({ id, sprintId }) => {
            const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
            
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey });
            
            // Snapshot previous value
            const previousWorkItems = queryClient.getQueryData(queryKey);
            
            // Optimistically update item's sprintId (removes from backlog)
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old.map((item: any) =>
                    item.id === id ? { ...item, sprintId } : item
                );
            });
            
            console.log("[BacklogView] Optimistic moveToSprint:", { id, sprintId });
            return { previousWorkItems };
        },
        onError: (err, _vars, context: any) => {
            const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
            
            // Rollback on error
            if (context?.previousWorkItems) {
                queryClient.setQueryData(queryKey, context.previousWorkItems);
            }
            
            console.error("[BacklogView] moveToSprint error:", err);
            
            // User-friendly message for temp-ID error
            if (err.message?.includes('temporary ID')) {
                toast.error("Please wait for task creation to complete");
            } else {
                toast.error("Failed to move item to sprint");
            }
        },
        onSuccess: () => {
            // Invalidate to refetch fresh data
            queryClient.invalidateQueries({ 
                queryKey: trpc.workItem.getAll.queryOptions({ projectId }).queryKey 
            });
            toast.success("Item moved to sprint");
        },
    });

    if (itemsLoading) {
        return <Skeleton className="h-[400px] w-full" />;
    }

    const backlogItems = workItems?.filter((item: any) => !item.sprintId) || [];
    const activeSprints = sprints?.filter((s: any) => s.state !== "completed") || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Backlog</h2>
                <Badge variant="secondary">{backlogItems.length} Items</Badge>
            </div>

            {backlogItems.length === 0 ? (
                <div className="p-12 text-center border rounded-lg border-dashed text-muted-foreground">
                    Backlog is empty.
                </div>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead className="w-[120px]">Type</TableHead>
                                <TableHead className="w-[120px]">Priority</TableHead>
                                <TableHead className="w-[120px]">State</TableHead>
                                <TableHead className="w-[150px]">Assignee</TableHead>
                                <TableHead className="w-[180px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {backlogItems.map((item: any) => (
                                <TableRow 
                                    key={item.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => {
                                        setEditingTask(item);
                                        setIsEditModalOpen(true);
                                    }}
                                >
                                    <TableCell className="font-mono text-xs">
                                        {project?.key}-{item.id.split("-")[0]}
                                    </TableCell>
                                    <TableCell className="font-medium">{item.title}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{item.type}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={item.priority === Priority.HIGH ? "destructive" : "secondary"}>
                                            {item.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{item.state?.name || "N/A"}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {item.assignee ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                                                    {item.assignee.firstName[0]}{item.assignee.lastName[0]}
                                                </div>
                                                <span className="text-sm">
                                                    {item.assignee.firstName} {item.assignee.lastName}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Unassigned</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    disabled={item.id.startsWith('temp-')}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {item.id.startsWith('temp-') ? 'Creating...' : 'Move to Sprint'}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                {activeSprints.length === 0 ? (
                                                    <DropdownMenuItem disabled>No active sprints</DropdownMenuItem>
                                                ) : (
                                                    activeSprints.map((sprint: any) => (
                                                        <DropdownMenuItem
                                                            key={sprint.id}
                                                            onClick={() => moveToSprintMutation.mutate({ id: item.id, sprintId: sprint.id } as any)}
                                                        >
                                                            {sprint.name}
                                                        </DropdownMenuItem>
                                                    ))
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Task Edit Modal */}
            {editingTask && (
                <TaskFormModal
                    mode="edit"
                    open={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                    task={editingTask}
                    projectId={projectId}
                />
            )}
        </div>
    );
}
