import { useState } from "react";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Link2,
    X,
    AlertCircle,
    CheckCircle,
    ArrowRight,
    Plus,
} from "lucide-react";
import { toast } from "sonner";

interface DependencyManagerProps {
    workItemId: string;
    projectId: string;
}

export function DependencyManager({
    workItemId,
    projectId,
}: DependencyManagerProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();

    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string>("");
    const [dependencyType, setDependencyType] = useState<string>("blocks");
    const [description, setDescription] = useState("");

    // Fetch dependencies
    const { data: dependencies, isLoading } = useQuery<any>(
        trpc.dependency.getByWorkItem.queryOptions({ workItemId }) as any
    );

    // Fetch all work items for selection
    const { data: workItems } = useQuery<any>(
        trpc.workItem.getAll.queryOptions({ projectId }) as any
    );

    // Create dependency mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.dependency.create.mutate(data);
        },
        onMutate: async (newDep) => {
            const queryKey = trpc.dependency.getByWorkItem.queryOptions({ workItemId }).queryKey;
            
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey });
            
            // Snapshot previous value
            const previousDependencies = queryClient.getQueryData(queryKey);
            
            // Optimistically add dependency
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                
                const tempId = `temp-${Date.now()}`;
                const now = new Date().toISOString();
                
                // Find target item for display
                const targetItem = workItems?.find((item: any) => item.id === newDep.targetItemId);
                
                const optimisticDep = {
                    id: tempId,
                    sourceItemId: newDep.sourceItemId,
                    targetItemId: newDep.targetItemId,
                    dependencyType: newDep.dependencyType,
                    description: newDep.description || null,
                    createdAt: now,
                    updatedAt: now,
                    targetItem: targetItem || null,
                    sourceItem: null,
                };
                
                console.log("[DependencyManager] Optimistic create:", optimisticDep);
                return [...old, optimisticDep];
            });
            
            return { previousDependencies };
        },
        onError: (error: any, _data, context: any) => {
            const queryKey = trpc.dependency.getByWorkItem.queryOptions({ workItemId }).queryKey;
            
            // Rollback on error
            if (context?.previousDependencies) {
                queryClient.setQueryData(queryKey, context.previousDependencies);
            }
            
            console.error("[DependencyManager] create error:", error);
            toast.error(error.message || "Failed to add dependency");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: trpc.dependency.getByWorkItem.queryOptions({ workItemId }).queryKey 
            });
            queryClient.invalidateQueries({ 
                queryKey: trpc.workItem.getAll.queryOptions({ projectId }).queryKey 
            });
            toast.success("Dependency added successfully");
            resetForm();
        },
    });

    // Delete dependency mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await client.dependency.delete.mutate({ id });
        },
        onMutate: async (id) => {
            const queryKey = trpc.dependency.getByWorkItem.queryOptions({ workItemId }).queryKey;
            
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey });
            
            // Snapshot previous value
            const previousDependencies = queryClient.getQueryData(queryKey);
            
            // Optimistically remove dependency
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                console.log("[DependencyManager] Optimistic delete:", id);
                return old.filter((dep: any) => dep.id !== id);
            });
            
            return { previousDependencies };
        },
        onError: (error: any, _id, context: any) => {
            const queryKey = trpc.dependency.getByWorkItem.queryOptions({ workItemId }).queryKey;
            
            // Rollback on error
            if (context?.previousDependencies) {
                queryClient.setQueryData(queryKey, context.previousDependencies);
            }
            
            console.error("[DependencyManager] delete error:", error);
            toast.error(error.message || "Failed to remove dependency");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: trpc.dependency.getByWorkItem.queryOptions({ workItemId }).queryKey 
            });
            queryClient.invalidateQueries({ 
                queryKey: trpc.workItem.getAll.queryOptions({ projectId }).queryKey 
            });
            toast.success("Dependency removed");
        },
    });

    const resetForm = () => {
        setSelectedItemId("");
        setDependencyType("blocks");
        setDescription("");
        setShowAddForm(false);
    };

    const handleAddDependency = () => {
        if (!selectedItemId) {
            toast.error("Please select a work item");
            return;
        }

        createMutation.mutate({
            sourceItemId: workItemId,
            targetItemId: selectedItemId,
            dependencyType,
            description: description || undefined,
        });
    };

    const handleDeleteDependency = (id: string) => {
        if (confirm("Are you sure you want to remove this dependency?")) {
            deleteMutation.mutate(id);
        }
    };

    // Filter out the current work item and already dependent items
    const availableItems = workItems?.filter((item: any) => {
        if (item.id === workItemId) return false;
        return !dependencies?.some(
            (dep: any) =>
                dep.targetItemId === item.id || dep.sourceItemId === item.id
        );
    });

    // Categorize dependencies
    const outgoingDeps = dependencies?.filter(
        (dep: any) => dep.sourceItemId === workItemId
    );
    const incomingDeps = dependencies?.filter(
        (dep: any) => dep.targetItemId === workItemId
    );

    const getDependencyTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            blocks: "Blocks",
            depends_on: "Depends On",
            relates_to: "Relates To",
            duplicates: "Duplicates",
        };
        return labels[type] || type;
    };

    const getDependencyTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            blocks: "destructive",
            depends_on: "default",
            relates_to: "secondary",
            duplicates: "outline",
        };
        return colors[type] || "default";
    };

    const getStateIcon = (state: any) => {
        if (state?.category === "done") {
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        }
        if (state?.category === "in_progress") {
            return <AlertCircle className="h-4 w-4 text-blue-500" />;
        }
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    };

    if (isLoading) {
        return <div className="text-sm text-muted-foreground">Loading dependencies...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Dependencies ({dependencies?.length || 0})
                </h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                </Button>
            </div>

            {/* Add Dependency Form */}
            {showAddForm && (
                <div className="border rounded-lg p-4 space-y-3 bg-accent/50">
                    <div className="space-y-2">
                        <Label htmlFor="work-item">Work Item</Label>
                        <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                            <SelectTrigger id="work-item">
                                <SelectValue placeholder="Select work item..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableItems?.length === 0 ? (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        No available work items
                                    </div>
                                ) : (
                                    availableItems?.map((item: any) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.id.split("-")[0]} - {item.title}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dep-type">Dependency Type</Label>
                        <Select value={dependencyType} onValueChange={setDependencyType}>
                            <SelectTrigger id="dep-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="blocks">Blocks</SelectItem>
                                <SelectItem value="depends_on">Depends On</SelectItem>
                                <SelectItem value="relates_to">Relates To</SelectItem>
                                <SelectItem value="duplicates">Duplicates</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dep-desc">Description (Optional)</Label>
                        <Textarea
                            id="dep-desc"
                            placeholder="Additional notes..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleAddDependency}
                            disabled={createMutation.isPending || !selectedItemId}
                            size="sm"
                        >
                            {createMutation.isPending ? "Adding..." : "Add Dependency"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={resetForm}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Outgoing Dependencies (This item → Others) */}
            {outgoingDeps && outgoingDeps.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                        This item affects:
                    </h4>
                    {outgoingDeps.map((dep: any) => (
                        <div
                            key={dep.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                {getStateIcon(dep.targetItem?.state)}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            {dep.targetItem?.id?.split("-")[0]}
                                        </span>
                                        <Badge
                                            variant={getDependencyTypeColor(
                                                dep.dependencyType
                                            ) as any}
                                            className="text-xs"
                                        >
                                            {getDependencyTypeLabel(dep.dependencyType)}
                                        </Badge>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                        {dep.targetItem?.title}
                                    </p>
                                    {dep.description && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {dep.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDependency(dep.id)}
                                disabled={deleteMutation.isPending}
                            >
                                <X className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Incoming Dependencies (Others → This item) */}
            {incomingDeps && incomingDeps.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                        This item is affected by:
                    </h4>
                    {incomingDeps.map((dep: any) => (
                        <div
                            key={dep.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                {getStateIcon(dep.sourceItem?.state)}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            {dep.sourceItem?.id?.split("-")[0]}
                                        </span>
                                        <Badge
                                            variant={getDependencyTypeColor(
                                                dep.dependencyType
                                            ) as any}
                                            className="text-xs"
                                        >
                                            {getDependencyTypeLabel(dep.dependencyType)}
                                        </Badge>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                        {dep.sourceItem?.title}
                                    </p>
                                    {dep.description && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {dep.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDependency(dep.id)}
                                disabled={deleteMutation.isPending}
                            >
                                <X className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {dependencies?.length === 0 && (
                <div className="text-center py-6 border border-dashed rounded-lg">
                    <Link2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No dependencies yet</p>
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowAddForm(true)}
                        className="mt-1"
                    >
                        Add your first dependency
                    </Button>
                </div>
            )}
        </div>
    );
}
