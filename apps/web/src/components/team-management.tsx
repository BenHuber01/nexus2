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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, Trash2, Edit2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { TeamMemberSelector } from "./team-member-selector";

interface TeamManagementProps {
    organizationId: string;
}

interface Team {
    id: string;
    name: string;
    description?: string | null;
    members: any[];
    projects?: any[];
}

export function TeamManagement({ organizationId }: TeamManagementProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [memberDialogOpen, setMemberDialogOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
    });

    // Fetch teams
    const { data: teams, isLoading } = useQuery<any>(
        trpc.team.getAll.queryOptions({ organizationId }) as any
    );

    // Create team mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.team.create.mutate(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["team"] });
            toast.success("Team created successfully");
            setCreateDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to create team");
        },
    });

    // Update team mutation
    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.team.update.mutate(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["team"] });
            toast.success("Team updated successfully");
            setEditDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update team");
        },
    });

    // Delete team mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await client.team.delete.mutate({ id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["team"] });
            toast.success("Team deleted successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete team");
        },
    });

    const resetForm = () => {
        setFormData({ name: "", description: "" });
        setSelectedTeam(null);
    };

    const handleCreate = () => {
        if (!formData.name.trim()) {
            toast.error("Team name is required");
            return;
        }
        createMutation.mutate({
            name: formData.name,
            description: formData.description || undefined,
            organizationId,
        });
    };

    const handleEdit = (team: Team) => {
        setSelectedTeam(team);
        setFormData({
            name: team.name,
            description: team.description || "",
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = () => {
        if (!selectedTeam || !formData.name.trim()) {
            toast.error("Team name is required");
            return;
        }
        updateMutation.mutate({
            id: selectedTeam.id,
            name: formData.name,
            description: formData.description || undefined,
        });
    };

    const handleDelete = (team: Team) => {
        if (confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`)) {
            deleteMutation.mutate(team.id);
        }
    };

    const handleManageMembers = (team: Team) => {
        setSelectedTeam(team);
        setMemberDialogOpen(true);
    };

    if (isLoading) {
        return <div className="text-center py-8">Loading teams...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Teams</h2>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Team
                </Button>
            </div>

            {/* Teams Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams?.map((team: Team) => (
                    <Card key={team.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                    <CardTitle className="text-lg">{team.name}</CardTitle>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(team)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(team)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {team.description && (
                                <p className="text-sm text-muted-foreground">
                                    {team.description}
                                </p>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    {team.members?.length || 0} members
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleManageMembers(team)}
                                >
                                    <UserPlus className="h-4 w-4 mr-1" />
                                    Manage
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {teams?.length === 0 && (
                <div className="text-center py-12 border border-dashed rounded-lg">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-4">No teams yet</p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Team
                    </Button>
                </div>
            )}

            {/* Create Team Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Team</DialogTitle>
                        <DialogDescription>
                            Create a new team to organize your members.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Team Name</Label>
                            <Input
                                id="name"
                                placeholder="Engineering Team"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Team description..."
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                            />
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
                            {createMutation.isPending ? "Creating..." : "Create Team"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Team Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Team</DialogTitle>
                        <DialogDescription>
                            Update team information.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Team Name</Label>
                            <Input
                                id="edit-name"
                                placeholder="Engineering Team"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description (Optional)</Label>
                            <Textarea
                                id="edit-description"
                                placeholder="Team description..."
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                            />
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
                            {updateMutation.isPending ? "Updating..." : "Update Team"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Members Dialog */}
            {selectedTeam && (
                <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Manage Team Members - {selectedTeam.name}</DialogTitle>
                            <DialogDescription>
                                Add or remove members from this team.
                            </DialogDescription>
                        </DialogHeader>
                        <TeamMemberSelector
                            teamId={selectedTeam.id}
                            organizationId={organizationId}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
