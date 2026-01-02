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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Circle } from "lucide-react";
import { toast } from "sonner";

interface ComponentEditorProps {
    projectId: string;
}

interface Component {
    id: string;
    name: string;
    description?: string | null;
    color: string;
    position: number;
    _count?: {
        workItems: number;
    };
}

const DEFAULT_COLORS = [
    "#3B82F6", // Blue
    "#10B981", // Green
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#6366F1", // Indigo
    "#14B8A6", // Teal
];

export function ComponentEditor({ projectId }: ComponentEditorProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);

    const [formData, setFormData] = useState<{
        name: string;
        description: string;
        color: string;
    }>({
        name: "",
        description: "",
        color: DEFAULT_COLORS[0],
    });

    // Fetch components
    const { data: components, isLoading } = useQuery<any>(
        trpc.component.getByProject.queryOptions({ projectId }) as any
    );

    // Create component mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.component.create.mutate(data);
        },
        onMutate: async (newComponentData) => {
            const queryKey = trpc.component.getByProject.queryOptions({ projectId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousComponents = queryClient.getQueryData(queryKey);
            
            // Optimistically add new component
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                const tempId = `temp-${Date.now()}`;
                const position = old.length;
                const newComponent = {
                    id: tempId,
                    ...newComponentData,
                    position,
                    _count: { workItems: 0 },
                };
                return [...old, newComponent];
            });
            
            console.log("[ComponentEditor] Optimistic component create:", newComponentData);
            return { previousComponents };
        },
        onError: (error: any, _data, context: any) => {
            const queryKey = trpc.component.getByProject.queryOptions({ projectId }).queryKey;
            if (context?.previousComponents) {
                queryClient.setQueryData(queryKey, context.previousComponents);
            }
            console.error("[ComponentEditor] Create error:", error);
            toast.error(error.message || "Failed to create component");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["component"] });
            toast.success("Component created successfully");
            setCreateDialogOpen(false);
            resetForm();
        },
    });

    // Update component mutation
    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.component.update.mutate(data);
        },
        onMutate: async (updatedData) => {
            const queryKey = trpc.component.getByProject.queryOptions({ projectId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousComponents = queryClient.getQueryData(queryKey);
            
            // Optimistically update component
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old.map((component: any) =>
                    component.id === updatedData.id ? { ...component, ...updatedData } : component
                );
            });
            
            console.log("[ComponentEditor] Optimistic component update:", updatedData);
            return { previousComponents };
        },
        onError: (error: any, _data, context: any) => {
            const queryKey = trpc.component.getByProject.queryOptions({ projectId }).queryKey;
            if (context?.previousComponents) {
                queryClient.setQueryData(queryKey, context.previousComponents);
            }
            console.error("[ComponentEditor] Update error:", error);
            toast.error(error.message || "Failed to update component");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["component"] });
            toast.success("Component updated successfully");
            setEditDialogOpen(false);
            resetForm();
        },
    });

    // Delete component mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await client.component.delete.mutate({ id });
        },
        onMutate: async (componentId) => {
            const queryKey = trpc.component.getByProject.queryOptions({ projectId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousComponents = queryClient.getQueryData(queryKey);
            
            // Optimistically remove component
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old.filter((component: any) => component.id !== componentId);
            });
            
            console.log("[ComponentEditor] Optimistic component delete:", componentId);
            return { previousComponents };
        },
        onError: (error: any, _id, context: any) => {
            const queryKey = trpc.component.getByProject.queryOptions({ projectId }).queryKey;
            if (context?.previousComponents) {
                queryClient.setQueryData(queryKey, context.previousComponents);
            }
            console.error("[ComponentEditor] Delete error:", error);
            toast.error(error.message || "Failed to delete component");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["component"] });
            toast.success("Component deleted successfully");
        },
    });

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            color: DEFAULT_COLORS[0],
        });
        setSelectedComponent(null);
    };

    const handleCreate = () => {
        if (!formData.name.trim()) {
            toast.error("Component name is required");
            return;
        }

        createMutation.mutate({
            projectId,
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
        });
    };

    const handleUpdate = () => {
        if (!selectedComponent) return;
        if (!formData.name.trim()) {
            toast.error("Component name is required");
            return;
        }

        updateMutation.mutate({
            id: selectedComponent.id,
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
        });
    };

    const handleDelete = (component: Component) => {
        const itemCount = component._count?.workItems || 0;
        const message = itemCount > 0
            ? `This component is assigned to ${itemCount} task(s). Deleting it will remove it from all tasks. Continue?`
            : `Delete component "${component.name}"?`;
        
        if (!confirm(message)) return;
        
        deleteMutation.mutate(component.id);
    };

    const handleOpenEdit = (component: Component) => {
        setSelectedComponent(component);
        setFormData({
            name: component.name,
            description: component.description || "",
            color: component.color,
        });
        setEditDialogOpen(true);
    };

    if (isLoading) {
        return <div className="p-4">Loading components...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Project Components</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Define components for categorizing tasks (e.g., Frontend, Backend, Design)
                    </p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Component
                </Button>
            </div>

            {/* Components List */}
            <div className="grid gap-3">
                {components && components.length > 0 ? (
                    components.map((component: Component) => (
                        <Card key={component.id}>
                            <CardContent className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <Circle
                                        className="h-5 w-5 fill-current"
                                        style={{ color: component.color }}
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{component.name}</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {component._count?.workItems || 0} tasks
                                            </Badge>
                                        </div>
                                        {component.description && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {component.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenEdit(component)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(component)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No components defined yet. Create your first component to get started.
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Component</DialogTitle>
                        <DialogDescription>
                            Add a new component for categorizing tasks
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                placeholder="e.g., Frontend, Backend, Design"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Optional description"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2 flex-wrap">
                                {DEFAULT_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={`h-8 w-8 rounded-full border-2 ${
                                            formData.color === color
                                                ? "border-primary"
                                                : "border-transparent"
                                        }`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setFormData({ ...formData, color })}
                                    />
                                ))}
                            </div>
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
                        <Button onClick={handleCreate}>Create Component</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Component</DialogTitle>
                        <DialogDescription>
                            Modify component details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name *</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Input
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2 flex-wrap">
                                {DEFAULT_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={`h-8 w-8 rounded-full border-2 ${
                                            formData.color === color
                                                ? "border-primary"
                                                : "border-transparent"
                                        }`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setFormData({ ...formData, color })}
                                    />
                                ))}
                            </div>
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
                        <Button onClick={handleUpdate}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
