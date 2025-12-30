import { useState, useEffect } from "react";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, GripVertical, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface BoardSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    boardId?: string;
}

interface Lane {
    id?: string;
    name: string;
    position: number;
    mappedStates: string[];
    wipLimit?: number | null;
}

export function BoardSettingsModal({
    open,
    onOpenChange,
    projectId,
    boardId,
}: BoardSettingsModalProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();

    const [boardName, setBoardName] = useState("");
    const [boardType, setBoardType] = useState<"kanban" | "scrum">("kanban");
    const [isDefault, setIsDefault] = useState(false);
    const [sprintId, setSprintId] = useState<string | null>(null);
    const [lanes, setLanes] = useState<Lane[]>([]);
    const [editingLaneId, setEditingLaneId] = useState<string | null>(null);

    // Fetch board data if editing
    const { data: board } = useQuery({
        ...trpc.board.getById.queryOptions({ id: boardId || "" }),
        enabled: !!boardId,
    } as any);

    // Type assertion for board data
    const boardData = board as any;

    // Fetch available states
    const { data: states } = useQuery<any>(
        trpc.board.getStatesForProject.queryOptions({ projectId }) as any,
    );

    // Fetch available sprints
    const { data: sprints } = useQuery<any>(
        trpc.sprint.getAll.queryOptions({ projectId }) as any,
    );

    // Initialize form when board data loads
    useEffect(() => {
        if (boardData) {
            setBoardName(boardData.name);
            setBoardType(boardData.boardType);
            setIsDefault(boardData.isDefault);
            setSprintId(boardData.sprintId || null);
            setLanes(boardData.lanes || []);
        }
    }, [boardData]);

    const createBoardMutation = useMutation({
        mutationFn: async (data: any) => {
            const result = await client.board.create.mutate(data);
            return result;
        },
        onSuccess: async (newBoard: any) => {
            // Create lanes for the new board
            for (const lane of lanes) {
                await client.board.createLane.mutate({
                    boardId: newBoard.id,
                    name: lane.name,
                    position: lane.position,
                    mappedStates: lane.mappedStates,
                    wipLimit: lane.wipLimit || undefined,
                });
            }
            queryClient.invalidateQueries({ queryKey: ["board", "getForProject"] });
            toast.success("Board created successfully");
            onOpenChange(false);
        },
        onError: () => {
            toast.error("Failed to create board");
        },
    });

    const updateBoardMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.board.update.mutate(data);
        },
        onMutate: async (updatedBoard) => {
            const getByIdKey = trpc.board.getById.queryOptions({ id: boardId || "" }).queryKey;
            const getForProjectKey = trpc.board.getForProject.queryOptions({ projectId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey: getByIdKey });
            await queryClient.cancelQueries({ queryKey: getForProjectKey });
            
            const previousBoard = queryClient.getQueryData(getByIdKey);
            const previousBoards = queryClient.getQueryData(getForProjectKey);
            
            // Optimistically update the board in getById query
            queryClient.setQueryData(getByIdKey, (old: any) => {
                if (!old) return old;
                return { ...old, ...updatedBoard };
            });
            
            // Optimistically update the board in getForProject query
            queryClient.setQueryData(getForProjectKey, (old: any) => {
                if (!old || !Array.isArray(old)) return old;
                return old.map((board: any) => {
                    if (board.id === boardId) {
                        return { ...board, ...updatedBoard };
                    }
                    return board;
                });
            });
            
            console.log("[BoardSettings] Optimistic board update:", updatedBoard);
            return { previousBoard, previousBoards };
        },
        onError: (err, _updatedBoard, context: any) => {
            const getByIdKey = trpc.board.getById.queryOptions({ id: boardId || "" }).queryKey;
            const getForProjectKey = trpc.board.getForProject.queryOptions({ projectId }).queryKey;
            
            if (context?.previousBoard) {
                queryClient.setQueryData(getByIdKey, context.previousBoard);
            }
            if (context?.previousBoards) {
                queryClient.setQueryData(getForProjectKey, context.previousBoards);
            }
            console.error("[BoardSettings] Board update error:", err);
            toast.error("Failed to update board");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["board"] });
            toast.success("Board updated successfully");
        },
    });

    const deleteBoardMutation = useMutation({
        mutationFn: async (id: string) => {
            return await client.board.delete.mutate({ id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["board"] });
            toast.success("Board deleted successfully");
            onOpenChange(false);
        },
        onError: () => {
            toast.error("Failed to delete board");
        },
    });

    const updateLaneMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.board.updateLane.mutate(data);
        },
        onMutate: async (updatedLane) => {
            const getByIdKey = trpc.board.getById.queryOptions({ id: boardId || "" }).queryKey;
            const getForProjectKey = trpc.board.getForProject.queryOptions({ projectId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey: getByIdKey });
            await queryClient.cancelQueries({ queryKey: getForProjectKey });
            
            const previousBoard = queryClient.getQueryData(getByIdKey);
            const previousBoards = queryClient.getQueryData(getForProjectKey);
            
            // Optimistically update the lane in getById query
            queryClient.setQueryData(getByIdKey, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    lanes: old.lanes.map((lane: any) =>
                        lane.id === updatedLane.id ? { ...lane, ...updatedLane } : lane
                    ),
                };
            });
            
            // Optimistically update the lane in getForProject query
            queryClient.setQueryData(getForProjectKey, (old: any) => {
                if (!old || !Array.isArray(old)) return old;
                return old.map((board: any) => {
                    if (board.id === boardId) {
                        return {
                            ...board,
                            lanes: board.lanes.map((lane: any) =>
                                lane.id === updatedLane.id ? { ...lane, ...updatedLane } : lane
                            ),
                        };
                    }
                    return board;
                });
            });
            
            console.log("[BoardSettings] Optimistic lane update:", updatedLane);
            return { previousBoard, previousBoards };
        },
        onError: (err, _updatedLane, context: any) => {
            const getByIdKey = trpc.board.getById.queryOptions({ id: boardId || "" }).queryKey;
            const getForProjectKey = trpc.board.getForProject.queryOptions({ projectId }).queryKey;
            
            if (context?.previousBoard) {
                queryClient.setQueryData(getByIdKey, context.previousBoard);
            }
            if (context?.previousBoards) {
                queryClient.setQueryData(getForProjectKey, context.previousBoards);
            }
            console.error("[BoardSettings] Lane update error:", err);
            toast.error("Failed to update lane");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["board"] });
            toast.success("Lane updated successfully");
        },
    });

    const deleteLaneMutation = useMutation({
        mutationFn: async (id: string) => {
            return await client.board.deleteLane.mutate({ id });
        },
        onMutate: async (laneId) => {
            const getByIdKey = trpc.board.getById.queryOptions({ id: boardId || "" }).queryKey;
            const getForProjectKey = trpc.board.getForProject.queryOptions({ projectId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey: getByIdKey });
            await queryClient.cancelQueries({ queryKey: getForProjectKey });
            
            const previousBoard = queryClient.getQueryData(getByIdKey);
            const previousBoards = queryClient.getQueryData(getForProjectKey);
            
            // Optimistically remove the lane from getById query
            queryClient.setQueryData(getByIdKey, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    lanes: old.lanes.filter((lane: any) => lane.id !== laneId),
                };
            });
            
            // Optimistically remove the lane from getForProject query
            queryClient.setQueryData(getForProjectKey, (old: any) => {
                if (!old || !Array.isArray(old)) return old;
                return old.map((board: any) => {
                    if (board.id === boardId) {
                        return {
                            ...board,
                            lanes: board.lanes.filter((lane: any) => lane.id !== laneId),
                        };
                    }
                    return board;
                });
            });
            
            console.log("[BoardSettings] Optimistic lane delete:", laneId);
            return { previousBoard, previousBoards };
        },
        onError: (err, _laneId, context: any) => {
            const getByIdKey = trpc.board.getById.queryOptions({ id: boardId || "" }).queryKey;
            const getForProjectKey = trpc.board.getForProject.queryOptions({ projectId }).queryKey;
            
            if (context?.previousBoard) {
                queryClient.setQueryData(getByIdKey, context.previousBoard);
            }
            if (context?.previousBoards) {
                queryClient.setQueryData(getForProjectKey, context.previousBoards);
            }
            console.error("[BoardSettings] Lane delete error:", err);
            toast.error("Failed to delete lane");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["board"] });
            toast.success("Lane deleted successfully");
        },
    });

    const handleAddLane = () => {
        const newLane: Lane = {
            name: `Lane ${lanes.length + 1}`,
            position: lanes.length,
            mappedStates: [],
            wipLimit: null,
        };
        console.log("[BoardSettings] Adding new lane:", newLane);
        setLanes([...lanes, newLane]);
    };

    const handleUpdateLane = (index: number, updates: Partial<Lane>) => {
        const updatedLanes = [...lanes];
        updatedLanes[index] = { ...updatedLanes[index], ...updates };
        setLanes(updatedLanes);

        // If lane has an ID, update it in the backend
        if (updatedLanes[index].id) {
            updateLaneMutation.mutate({
                id: updatedLanes[index].id,
                ...updates,
            });
        }
    };

    const handleDeleteLane = (index: number) => {
        const lane = lanes[index];
        
        // Only call backend delete if lane has a real ID (not a temporary one)
        if (lane.id && !lane.id.startsWith('temp-')) {
            console.log("[BoardSettings] Deleting lane from database:", lane.id);
            deleteLaneMutation.mutate(lane.id);
        } else {
            console.log("[BoardSettings] Removing unsaved lane locally:", lane);
            
            // For temp lanes, remove them from the optimistic cache too
            if (lane.id && lane.id.startsWith('temp-')) {
                const getByIdKey = trpc.board.getById.queryOptions({ id: boardId || "" }).queryKey;
                const getForProjectKey = trpc.board.getForProject.queryOptions({ projectId }).queryKey;
                
                // Remove temp lane from getById cache
                queryClient.setQueryData(getByIdKey, (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        lanes: old.lanes.filter((l: any) => l.id !== lane.id),
                    };
                });
                
                // Remove temp lane from getForProject cache
                queryClient.setQueryData(getForProjectKey, (old: any) => {
                    if (!old || !Array.isArray(old)) return old;
                    return old.map((board: any) => {
                        if (board.id === boardId) {
                            return {
                                ...board,
                                lanes: board.lanes.filter((l: any) => l.id !== lane.id),
                            };
                        }
                        return board;
                    });
                });
                
                console.log("[BoardSettings] Removed temp lane from cache:", lane.id);
            }
            
            toast.success("Lane removed");
        }
        
        const updatedLanes = lanes.filter((_, i) => i !== index);
        // Reorder positions
        updatedLanes.forEach((l, i) => {
            l.position = i;
        });
        setLanes(updatedLanes);
    };

    const handleMoveLane = (index: number, direction: "up" | "down") => {
        if (
            (direction === "up" && index === 0) ||
            (direction === "down" && index === lanes.length - 1)
        ) {
            return;
        }

        const newIndex = direction === "up" ? index - 1 : index + 1;
        const updatedLanes = [...lanes];
        [updatedLanes[index], updatedLanes[newIndex]] = [
            updatedLanes[newIndex],
            updatedLanes[index],
        ];

        // Update positions
        updatedLanes.forEach((l, i) => {
            l.position = i;
        });

        setLanes(updatedLanes);
    };

    const createLaneMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.board.createLane.mutate(data);
        },
        onMutate: async (newLaneData) => {
            // Update both getById and getForProject queries using proper query keys
            const getByIdKey = trpc.board.getById.queryOptions({ id: boardId || "" }).queryKey;
            const getForProjectKey = trpc.board.getForProject.queryOptions({ projectId }).queryKey;
            
            console.log("[BoardSettings] Query keys:", {
                getByIdKey,
                getForProjectKey,
                boardId,
                projectId,
            });
            
            await queryClient.cancelQueries({ queryKey: getByIdKey });
            await queryClient.cancelQueries({ queryKey: getForProjectKey });
            
            const previousBoard = queryClient.getQueryData(getByIdKey);
            const previousBoards = queryClient.getQueryData(getForProjectKey);
            
            console.log("[BoardSettings] Previous data:", {
                previousBoard,
                previousBoards,
            });
            
            const tempId = `temp-${Date.now()}-${Math.random()}`;
            const newLane = {
                id: tempId,
                ...newLaneData,
            };
            
            // Optimistically add the new lane to getById query
            queryClient.setQueryData(getByIdKey, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    lanes: [...(old.lanes || []), newLane],
                };
            });
            
            // Optimistically add the new lane to getForProject query
            queryClient.setQueryData(getForProjectKey, (old: any) => {
                if (!old || !Array.isArray(old)) return old;
                return old.map((board: any) => {
                    if (board.id === boardId) {
                        return {
                            ...board,
                            lanes: [...(board.lanes || []), newLane],
                        };
                    }
                    return board;
                });
            });
            
            console.log("[BoardSettings] Optimistic lane create:", newLaneData);
            console.log("[BoardSettings] New temp lane:", newLane);
            return { previousBoard, previousBoards };
        },
        onError: (err, _newLaneData, context: any) => {
            const getByIdKey = trpc.board.getById.queryOptions({ id: boardId || "" }).queryKey;
            const getForProjectKey = trpc.board.getForProject.queryOptions({ projectId }).queryKey;
            
            if (context?.previousBoard) {
                queryClient.setQueryData(getByIdKey, context.previousBoard);
            }
            if (context?.previousBoards) {
                queryClient.setQueryData(getForProjectKey, context.previousBoards);
            }
            console.error("[BoardSettings] Lane create error:", err);
            toast.error("Failed to create lane");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["board"] });
        },
    });

    const handleSave = async () => {
        console.log("[BoardSettings] Saving board. BoardId:", boardId, "Lanes:", lanes);
        
        if (!boardName.trim()) {
            toast.error("Board name is required");
            return;
        }

        if (boardId) {
            // Update existing board
            await updateBoardMutation.mutateAsync({
                id: boardId,
                name: boardName,
                boardType,
                isDefault,
                sprintId,
            });

            // Create any new lanes (lanes without an ID)
            const newLanes = lanes.filter(lane => !lane.id);
            console.log("[BoardSettings] New lanes to create:", newLanes);
            
            for (const lane of newLanes) {
                console.log("[BoardSettings] Creating lane for existing board:", lane);
                await createLaneMutation.mutateAsync({
                    boardId: boardId,
                    name: lane.name,
                    position: lane.position,
                    mappedStates: lane.mappedStates,
                    wipLimit: lane.wipLimit || undefined,
                });
            }

            if (newLanes.length > 0) {
                toast.success("Board and lanes updated successfully");
            }
            
            onOpenChange(false);
        } else {
            // Create new board
            await createBoardMutation.mutateAsync({
                name: boardName,
                projectId,
                boardType,
                isDefault,
                sprintId,
            });
        }
    };

    const handleDelete = () => {
        if (boardId && confirm("Are you sure you want to delete this board?")) {
            deleteBoardMutation.mutate(boardId);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {boardId ? "Edit Board" : "Create Board"}
                    </DialogTitle>
                    <DialogDescription>
                        Configure your board settings and lanes
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Board Settings */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="board-name">Board Name</Label>
                            <Input
                                id="board-name"
                                value={boardName}
                                onChange={(e) => setBoardName(e.target.value)}
                                placeholder="e.g., Sprint Board"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="board-type">Board Type</Label>
                            <Select
                                value={boardType}
                                onValueChange={(value: "kanban" | "scrum") =>
                                    setBoardType(value)
                                }
                            >
                                <SelectTrigger id="board-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kanban">Kanban</SelectItem>
                                    <SelectItem value="scrum">Scrum</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sprint">Sprint (optional)</Label>
                            <Select
                                value={sprintId || "none"}
                                onValueChange={(value) =>
                                    setSprintId(value === "none" ? null : value)
                                }
                            >
                                <SelectTrigger id="sprint">
                                    <SelectValue placeholder="No sprint selected" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No sprint</SelectItem>
                                    {sprints?.map((sprint: any) => (
                                        <SelectItem key={sprint.id} value={sprint.id}>
                                            {sprint.name} ({sprint.state})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Associate this board with a specific sprint to filter work items
                            </p>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is-default"
                                checked={isDefault}
                                onCheckedChange={(checked) =>
                                    setIsDefault(checked as boolean)
                                }
                            />
                            <Label htmlFor="is-default" className="cursor-pointer">
                                Set as default board
                            </Label>
                        </div>
                    </div>

                    {/* Lanes Configuration */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Lanes</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddLane}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Lane
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {lanes.map((lane, index) => (
                                <Card key={lane.id || index}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                                <CardTitle className="text-sm">
                                                    Lane {index + 1}
                                                </CardTitle>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleMoveLane(index, "up")}
                                                    disabled={index === 0}
                                                >
                                                    ↑
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleMoveLane(index, "down")}
                                                    disabled={index === lanes.length - 1}
                                                >
                                                    ↓
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        setEditingLaneId(
                                                            editingLaneId === (lane.id || `new-${index}`)
                                                                ? null
                                                                : lane.id || `new-${index}`,
                                                        )
                                                    }
                                                >
                                                    <Settings2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteLane(index)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="space-y-2">
                                            <Label>Lane Name</Label>
                                            <Input
                                                value={lane.name}
                                                onChange={(e) =>
                                                    handleUpdateLane(index, { name: e.target.value })
                                                }
                                                placeholder="e.g., In Progress"
                                            />
                                        </div>

                                        {editingLaneId === (lane.id || `new-${index}`) && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>WIP Limit (optional)</Label>
                                                    <Input
                                                        type="number"
                                                        value={lane.wipLimit || ""}
                                                        onChange={(e) =>
                                                            handleUpdateLane(index, {
                                                                wipLimit: e.target.value
                                                                    ? parseInt(e.target.value)
                                                                    : null,
                                                            })
                                                        }
                                                        placeholder="No limit"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Mapped States</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {states?.map((state: any) => (
                                                            <div
                                                                key={state.id}
                                                                className="flex items-center space-x-2"
                                                            >
                                                                <Checkbox
                                                                    id={`state-${state.id}-${index}`}
                                                                    checked={lane.mappedStates.includes(state.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        const newMappedStates = checked
                                                                            ? [...lane.mappedStates, state.id]
                                                                            : lane.mappedStates.filter(
                                                                                (id) => id !== state.id,
                                                                            );
                                                                        handleUpdateLane(index, {
                                                                            mappedStates: newMappedStates,
                                                                        });
                                                                    }}
                                                                />
                                                                <Label
                                                                    htmlFor={`state-${state.id}-${index}`}
                                                                    className="cursor-pointer text-sm"
                                                                >
                                                                    {state.name}
                                                                </Label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}

                            {lanes.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                                    No lanes configured. Click "Add Lane" to get started.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between pt-4 border-t">
                        <div>
                            {boardId && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleDelete}
                                >
                                    Delete Board
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleSave}>
                                {boardId ? "Save Changes" : "Create Board"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
