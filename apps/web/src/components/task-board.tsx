import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Priority } from "@my-better-t-app/db";
import { BoardSelector } from "./board-selector";
import { TaskFormModal } from "./task-form-modal";
import { useState } from "react";
import { toast } from "sonner";
import { getUser } from "@/functions/get-user";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

interface TaskBoardProps {
    projectId: string;
    boardId?: string;
}

export function TaskBoard({ projectId, boardId: initialBoardId }: TaskBoardProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();
    const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>(initialBoardId);
    const [editingTask, setEditingTask] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeTask, setActiveTask] = useState<any>(null);

    const { data: session } = useQuery({
        queryKey: ["session"],
        queryFn: getUser,
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const { data: boards, isLoading: boardsLoading } = useQuery<any>(
        trpc.board.getForProject.queryOptions({ projectId }) as any,
    );

    const { data: workItems, isLoading: itemsLoading } = useQuery<any>({
        ...(trpc.workItem.getAll.queryOptions({ projectId }) as any),
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
    });

    const { data: states } = useQuery<any>(
        trpc.workItemState.getByProject.queryOptions({ projectId }) as any,
    );

    const updateStateMutation = useMutation({
        mutationFn: async ({ id, stateId }: { id: string; stateId: string }) => {
            return await client.workItem.updateState.mutate({ id, stateId });
        },
        onMutate: async (newMove) => {
            const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;

            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey });

            // Snapshot the previous value
            const previousWorkItems = queryClient.getQueryData(queryKey);

            // Optimistically update to the new value
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old.map((item: any) =>
                    item.id === newMove.id ? { ...item, stateId: newMove.stateId } : item
                );
            });

            return { previousWorkItems };
        },
        onError: (err, _newMove, context: any) => {
            const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
            if (context?.previousWorkItems) {
                queryClient.setQueryData(queryKey, context.previousWorkItems);
            }
            console.error("Move error:", err);
            toast.error("Failed to move task");
        },
        onSettled: () => {
            const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
            queryClient.invalidateQueries({ queryKey });
        },
        onSuccess: () => {
            toast.success("Task moved successfully");
        },
    });

    if (boardsLoading || itemsLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-[600px] w-full" />
                    ))}
                </div>
            </div>
        );
    }

    const defaultBoard = boards?.find((b: any) => b.isDefault) || boards?.[0];
    const currentBoardId = selectedBoardId || defaultBoard?.id;
    const currentBoard = boards?.find((b: any) => b.id === currentBoardId);
    const lanes = currentBoard?.lanes || [];

    console.log("[TaskBoard] Current board lanes:", lanes.map((l: any) => ({ id: l.id, name: l.name, mappedStates: l.mappedStates })));

    const filteredWorkItems = workItems?.filter((item: any) => {
        if (currentBoard?.sprintId) {
            const match = item.sprintId === currentBoard.sprintId;
            console.log("[TaskBoard] Filter check:", {
                itemId: item.id,
                itemTitle: item.title,
                itemSprintId: item.sprintId,
                itemStateId: item.stateId,
                itemStateName: item.state?.name,
                boardSprintId: currentBoard.sprintId,
                match,
            });
            return match;
        }
        return true;
    });

    console.log("[TaskBoard] Filtered items:", filteredWorkItems?.length);
    console.log("[TaskBoard] Lanes:", lanes.map((l: any) => ({ id: l.id, name: l.name, mappedStates: l.mappedStates })));

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = workItems?.find((item: any) => item.id === active.id);
        setActiveTask(task);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const taskId = active.id as string;
        const overId = over.id as string;

        // Find which lane the task was dropped into
        // overId could be a lane ID or another task ID
        let targetLane = lanes.find((l: any) => l.id === overId);

        // If not dropped directly on a lane, check if dropped on a task
        if (!targetLane) {
            const overTask = workItems?.find((item: any) => item.id === overId);
            if (overTask) {
                targetLane = lanes.find((l: any) => l.mappedStates.includes(overTask.stateId));
            }
        }

        if (targetLane) {
            // Use the first mapped state as the target state
            const targetStateId = targetLane.mappedStates[0];
            const task = workItems?.find((item: any) => item.id === taskId);

            if (task && task.stateId !== targetStateId) {
                updateStateMutation.mutate({ id: taskId, stateId: targetStateId });
            }
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <BoardSelector
                    projectId={projectId}
                    selectedBoardId={currentBoardId}
                    onBoardChange={setSelectedBoardId}
                />
                {currentBoard?.sprintId && (
                    <Badge variant="outline" className="ml-2">
                        Sprint Filter Active
                    </Badge>
                )}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
                    {lanes.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center border rounded-lg border-dashed text-muted-foreground">
                            No board lanes configured. Click the settings icon to configure your board.
                        </div>
                    ) : (
                        lanes.map((lane: any) => (
                            <BoardLane
                                key={lane.id}
                                lane={lane}
                                tasks={filteredWorkItems?.filter((item: any) =>
                                    lane.mappedStates.includes(item.stateId)
                                ) || []}
                                states={states || []}
                                onEditTask={(task) => {
                                    setEditingTask(task);
                                    setIsEditModalOpen(true);
                                }}
                                currentUserId={session?.user?.id}
                            />
                        ))
                    )}
                </div>

                <DragOverlay>
                    {activeTask ? (
                        <TaskCard task={activeTask} isOverlay currentUserId={session?.user?.id} />
                    ) : null}
                </DragOverlay>
            </DndContext>

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

function BoardLane({ lane, tasks, states, onEditTask, currentUserId }: { lane: any; tasks: any[]; states: any[]; onEditTask: (task: any) => void; currentUserId?: string }) {
    const { setNodeRef } = useDroppable({
        id: lane.id,
    });

    const hasNoMappedStates = !lane.mappedStates || lane.mappedStates.length === 0;

    // Get the state objects for this lane's mapped states
    const laneStates = states.filter((state: any) => 
        lane.mappedStates?.includes(state.id)
    );

    return (
        <div ref={setNodeRef} className="flex-shrink-0 w-80 flex flex-col gap-4">
            <div className="px-2 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                            {lane.name}
                        </h3>
                        {lane.wipLimit && (
                            <Badge variant="outline" className="text-xs">
                                WIP: {lane.wipLimit}
                            </Badge>
                        )}
                        {hasNoMappedStates && (
                            <Badge variant="destructive" className="text-xs">
                                ⚠️ No states
                            </Badge>
                        )}
                    </div>
                    <Badge variant="secondary">{tasks.length}</Badge>
                </div>
                
                {/* State badges with colors */}
                {laneStates.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {laneStates.map((state: any) => (
                            <Badge
                                key={state.id}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0.5"
                                style={{
                                    borderColor: state.color,
                                    color: state.color,
                                }}
                            >
                                {state.name}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 space-y-3 p-2 bg-muted/30 rounded-lg min-h-[500px]">
                {hasNoMappedStates ? (
                    <div className="flex items-center justify-center h-full text-center p-4">
                        <div className="text-sm text-muted-foreground">
                            <p className="font-medium mb-2">⚠️ No states mapped to this lane</p>
                            <p className="text-xs">Tasks won't appear here.</p>
                            <p className="text-xs">Configure in board settings.</p>
                        </div>
                    </div>
                ) : (
                    <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {tasks.map((task) => (
                            <SortableTaskCard key={task.id} task={task} onEdit={() => onEditTask(task)} currentUserId={currentUserId} />
                        ))}
                    </SortableContext>
                )}
            </div>
        </div>
    );
}

function SortableTaskCard({ task, onEdit, currentUserId }: { task: any; onEdit: () => void; currentUserId?: string }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onEdit}>
            <TaskCard task={task} currentUserId={currentUserId} />
        </div>
    );
}

function TaskCard({ task, isOverlay, currentUserId }: { task: any; isOverlay?: boolean; currentUserId?: string }) {
    const isAssignedToMe = currentUserId && task.assigneeId === currentUserId;
    
    return (
        <Card className={`shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
            isOverlay ? 'rotate-3 scale-105' : ''
        } ${
            isAssignedToMe ? 'ring-2 ring-primary/50 shadow-primary/20 shadow-lg' : ''
        }`}>
            <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                        {task.id.split("-")[0]}
                    </span>
                    <Badge variant={task.priority === Priority.HIGH ? "destructive" : "secondary"} className="text-[10px] px-1 py-0">
                        {task.priority}
                    </Badge>
                </div>
                <p className="text-sm font-medium leading-tight">
                    {task.title}
                </p>
                <div className="flex justify-between items-center pt-2">
                    <Badge variant="outline" className="text-[10px]">
                        {task.type}
                    </Badge>
                    {task.assignee && (
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                            {task.assignee.firstName[0]}
                            {task.assignee.lastName[0]}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
