import { useState } from "react";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Plus,
    Edit2,
    Trash2,
    GripVertical,
    Circle,
    AlertCircle,
    CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { WorkItemStateCategory } from "@my-better-t-app/db";

interface WorkflowStateEditorProps {
    projectId: string;
}

interface WorkflowState {
    id: string;
    name: string;
    category: WorkItemStateCategory;
    position: number;
    color: string;
    wipLimit?: number | null;
    isInitial: boolean;
    isFinal: boolean;
    _count?: {
        workItems: number;
    };
}

export function WorkflowStateEditor({ projectId }: WorkflowStateEditorProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedState, setSelectedState] = useState<WorkflowState | null>(null);

    const [formData, setFormData] = useState<{
        name: string;
        category: WorkItemStateCategory;
        color: string;
        wipLimit: number | null;
        isInitial: boolean;
        isFinal: boolean;
    }>({
        name: "",
        category: WorkItemStateCategory.TODO,
        color: "#6B7280",
        wipLimit: null,
        isInitial: false,
        isFinal: false,
    });

    // Fetch workflow states
    const { data: states, isLoading } = useQuery<any>(
        trpc.workItemState.getByProject.queryOptions({ projectId }) as any
    );

    // Create state mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.workItemState.create.mutate(data);
        },
        onMutate: async (newStateData) => {
            const queryKey = trpc.workItemState.getByProject.queryOptions({ projectId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousStates = queryClient.getQueryData(queryKey);
            
            // Optimistically add new state
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                const tempId = `temp-${Date.now()}`;
                const position = old.length;
                const newState = {
                    id: tempId,
                    ...newStateData,
                    position,
                    _count: { workItems: 0 },
                };
                return [...old, newState];
            });
            
            console.log("[WorkflowStateEditor] Optimistic state create:", newStateData);
            return { previousStates };
        },
        onError: (error: any, _data, context: any) => {
            const queryKey = trpc.workItemState.getByProject.queryOptions({ projectId }).queryKey;
            if (context?.previousStates) {
                queryClient.setQueryData(queryKey, context.previousStates);
            }
            console.error("[WorkflowStateEditor] Create error:", error);
            toast.error(error.message || "Failed to create state");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workItemState"] });
            queryClient.invalidateQueries({ queryKey: ["board"] }); // Refresh board states too
            toast.success("State created successfully");
            setCreateDialogOpen(false);
            resetForm();
        },
    });

    // Update state mutation
    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.workItemState.update.mutate(data);
        },
        onMutate: async (updatedData) => {
            const queryKey = trpc.workItemState.getByProject.queryOptions({ projectId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousStates = queryClient.getQueryData(queryKey);
            
            // Optimistically update state
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old.map((state: any) =>
                    state.id === updatedData.id ? { ...state, ...updatedData } : state
                );
            });
            
            console.log("[WorkflowStateEditor] Optimistic state update:", updatedData);
            return { previousStates };
        },
        onError: (error: any, _data, context: any) => {
            const queryKey = trpc.workItemState.getByProject.queryOptions({ projectId }).queryKey;
            if (context?.previousStates) {
                queryClient.setQueryData(queryKey, context.previousStates);
            }
            console.error("[WorkflowStateEditor] Update error:", error);
            toast.error(error.message || "Failed to update state");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workItemState"] });
            queryClient.invalidateQueries({ queryKey: ["board"] });
            toast.success("State updated successfully");
            setEditDialogOpen(false);
            resetForm();
        },
    });

    // Delete state mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await client.workItemState.delete.mutate({ id });
        },
        onMutate: async (stateId) => {
            const queryKey = trpc.workItemState.getByProject.queryOptions({ projectId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousStates = queryClient.getQueryData(queryKey);
            
            // Optimistically remove state
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old.filter((state: any) => state.id !== stateId);
            });
            
            console.log("[WorkflowStateEditor] Optimistic state delete:", stateId);
            return { previousStates };
        },
        onError: (error: any, _id, context: any) => {
            const queryKey = trpc.workItemState.getByProject.queryOptions({ projectId }).queryKey;
            if (context?.previousStates) {
                queryClient.setQueryData(queryKey, context.previousStates);
            }
            console.error("[WorkflowStateEditor] Delete error:", error);
            toast.error(error.message || "Failed to delete state");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workItemState"] });
            queryClient.invalidateQueries({ queryKey: ["board"] });
            toast.success("State deleted successfully");
        },
    });

    // Reorder mutation
    const reorderMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.workItemState.reorder.mutate(data);
        },
        onMutate: async (reorderData) => {
            const queryKey = trpc.workItemState.getByProject.queryOptions({ projectId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousStates = queryClient.getQueryData(queryKey);
            
            // Optimistically reorder states
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                const reordered = [...old];
                reorderData.states.forEach((item: any) => {
                    const index = reordered.findIndex((s: any) => s.id === item.id);
                    if (index !== -1) {
                        reordered[index] = { ...reordered[index], position: item.position };
                    }
                });
                return reordered.sort((a: any, b: any) => a.position - b.position);
            });
            
            console.log("[WorkflowStateEditor] Optimistic reorder:", reorderData);
            return { previousStates };
        },
        onError: (error: any, _data, context: any) => {
            const queryKey = trpc.workItemState.getByProject.queryOptions({ projectId }).queryKey;
            if (context?.previousStates) {
                queryClient.setQueryData(queryKey, context.previousStates);
            }
            console.error("[WorkflowStateEditor] Reorder error:", error);
            toast.error(error.message || "Failed to reorder states");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workItemState"] });
            toast.success("States reordered");
        },
    });

    const resetForm = () => {
        setFormData({
            name: "",
            category: WorkItemStateCategory.TODO,
            color: "#6B7280",
            wipLimit: null,
            isInitial: false,
            isFinal: false,
        });
        setSelectedState(null);
    };

    const handleCreate = () => {
        if (!formData.name.trim()) {
            toast.error("State name is required");
            return;
        }
        createMutation.mutate({
            projectId,
            ...formData,
        });
    };

    const handleEdit = (state: WorkflowState) => {
        setSelectedState(state);
        setFormData({
            name: state.name,
            category: state.category,
            color: state.color,
            wipLimit: state.wipLimit ?? null,
            isInitial: state.isInitial,
            isFinal: state.isFinal,
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = () => {
        if (!selectedState || !formData.name.trim()) {
            toast.error("State name is required");
            return;
        }
        updateMutation.mutate({
            id: selectedState.id,
            ...formData,
        });
    };

    const handleDelete = (state: WorkflowState) => {
        if (state._count && state._count.workItems > 0) {
            toast.error(
                `Cannot delete state: ${state._count.workItems} work items are using this state`
            );
            return;
        }
        if (
            confirm(
                `Are you sure you want to delete "${state.name}"? This action cannot be undone.`
            )
        ) {
            deleteMutation.mutate(state.id);
        }
    };

    const handleMoveState = (index: number, direction: "up" | "down") => {
        if (!states) return;
        if ((direction === "up" && index === 0) || (direction === "down" && index === states.length - 1)) {
            return;
        }

        const newIndex = direction === "up" ? index - 1 : index + 1;
        const updatedStates = [...states];
        [updatedStates[index], updatedStates[newIndex]] = [
            updatedStates[newIndex],
            updatedStates[index],
        ];

        // Update positions for all states
        const updatedStatesWithPositions = updatedStates.map((state, idx) => ({
            ...state,
            position: idx,
        }));

        // Immediately update cache with new order (including temp states)
        const queryKey = trpc.workItemState.getByProject.queryOptions({ projectId }).queryKey;
        queryClient.setQueryData(queryKey, updatedStatesWithPositions);
        console.log("[WorkflowStateEditor] Immediate reorder (all states):", updatedStatesWithPositions);

        // Send only non-temp states to backend
        const reorderedStates = updatedStatesWithPositions
            .map((state) => ({
                id: state.id,
                position: state.position,
            }))
            .filter((state) => !state.id.startsWith('temp-'));

        if (reorderedStates.length > 0) {
            console.log("[WorkflowStateEditor] Backend reorder (excluding temp):", reorderedStates);
            reorderMutation.mutate({ states: reorderedStates });
        }
    };

    const getCategoryIcon = (category: WorkItemStateCategory) => {
        switch (category) {
            case WorkItemStateCategory.DONE:
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case WorkItemStateCategory.IN_PROGRESS:
                return <Circle className="h-4 w-4 text-blue-500" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    const getCategoryLabel = (category: WorkItemStateCategory) => {
        return category.replace(/_/g, " ");
    };

    if (isLoading) {
        return <div className="text-center py-8">Loading workflow states...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Workflow States</h2>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create State
                </Button>
            </div>

            <p className="text-sm text-muted-foreground">
                Customize your workflow by creating and organizing states for your work items.
            </p>

            {/* States List */}
            <div className="space-y-2">
                {states?.map((state: WorkflowState, index: number) => (
                    <Card key={state.id}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                    <div
                                        className="h-4 w-4 rounded-full"
                                        style={{ backgroundColor: state.color }}
                                    />
                                    {getCategoryIcon(state.category)}
                                    <CardTitle className="text-base">{state.name}</CardTitle>
                                    <div className="flex gap-2">
                                        {state.isInitial && (
                                            <Badge variant="outline" className="text-xs">
                                                Initial
                                            </Badge>
                                        )}
                                        {state.isFinal && (
                                            <Badge variant="outline" className="text-xs">
                                                Final
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                        {state._count?.workItems || 0} items
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleMoveState(index, "up")}
                                        disabled={index === 0}
                                    >
                                        ↑
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleMoveState(index, "down")}
                                        disabled={index === states.length - 1}
                                    >
                                        ↓
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(state)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(state)}
                                        disabled={state._count && state._count.workItems > 0}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Category: {getCategoryLabel(state.category)}</span>
                                {state.wipLimit && <span>WIP Limit: {state.wipLimit}</span>}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {states?.length === 0 && (
                <div className="text-center py-12 border border-dashed rounded-lg">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-4">No workflow states yet</p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First State
                    </Button>
                </div>
            )}

            {/* Create State Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Workflow State</DialogTitle>
                        <DialogDescription>
                            Define a new state for your workflow.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">State Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g., In Progress"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        category: value as WorkItemStateCategory,
                                    })
                                }
                            >
                                <SelectTrigger id="category">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={WorkItemStateCategory.TODO}>
                                        To Do
                                    </SelectItem>
                                    <SelectItem value={WorkItemStateCategory.IN_PROGRESS}>
                                        In Progress
                                    </SelectItem>
                                    <SelectItem value={WorkItemStateCategory.DONE}>
                                        Done
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="color">Color</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="color"
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) =>
                                        setFormData({ ...formData, color: e.target.value })
                                    }
                                    className="w-20"
                                />
                                <Input
                                    value={formData.color}
                                    onChange={(e) =>
                                        setFormData({ ...formData, color: e.target.value })
                                    }
                                    placeholder="#6B7280"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="wipLimit">WIP Limit (Optional)</Label>
                            <Input
                                id="wipLimit"
                                type="number"
                                placeholder="No limit"
                                value={formData.wipLimit || ""}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        wipLimit: e.target.value ? parseInt(e.target.value) : null,
                                    })
                                }
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="isInitial"
                                checked={formData.isInitial}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, isInitial: checked as boolean })
                                }
                            />
                            <Label htmlFor="isInitial" className="cursor-pointer">
                                Set as initial state
                            </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="isFinal"
                                checked={formData.isFinal}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, isFinal: checked as boolean })
                                }
                            />
                            <Label htmlFor="isFinal" className="cursor-pointer">
                                Set as final state
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCreateDialogOpen(false);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={createMutation.isPending}>
                            {createMutation.isPending ? "Creating..." : "Create State"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit State Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Workflow State</DialogTitle>
                        <DialogDescription>
                            Update state properties.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">State Name</Label>
                            <Input
                                id="edit-name"
                                placeholder="e.g., In Progress"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-category">Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        category: value as WorkItemStateCategory,
                                    })
                                }
                            >
                                <SelectTrigger id="edit-category">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={WorkItemStateCategory.TODO}>
                                        To Do
                                    </SelectItem>
                                    <SelectItem value={WorkItemStateCategory.IN_PROGRESS}>
                                        In Progress
                                    </SelectItem>
                                    <SelectItem value={WorkItemStateCategory.DONE}>
                                        Done
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-color">Color</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="edit-color"
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) =>
                                        setFormData({ ...formData, color: e.target.value })
                                    }
                                    className="w-20"
                                />
                                <Input
                                    value={formData.color}
                                    onChange={(e) =>
                                        setFormData({ ...formData, color: e.target.value })
                                    }
                                    placeholder="#6B7280"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-wipLimit">WIP Limit (Optional)</Label>
                            <Input
                                id="edit-wipLimit"
                                type="number"
                                placeholder="No limit"
                                value={formData.wipLimit || ""}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        wipLimit: e.target.value ? parseInt(e.target.value) : null,
                                    })
                                }
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="edit-isInitial"
                                checked={formData.isInitial}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, isInitial: checked as boolean })
                                }
                            />
                            <Label htmlFor="edit-isInitial" className="cursor-pointer">
                                Set as initial state
                            </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="edit-isFinal"
                                checked={formData.isFinal}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, isFinal: checked as boolean })
                                }
                            />
                            <Label htmlFor="edit-isFinal" className="cursor-pointer">
                                Set as final state
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditDialogOpen(false);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? "Updating..." : "Update State"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
