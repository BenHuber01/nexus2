import { getUser } from "@/functions/get-user";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamManagement } from "@/components/team-management";
import { Users, UserPlus, X, Settings, Shield } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/organizations/$organizationId/settings")({
    component: RouteComponent,
    beforeLoad: async () => {
        const session = await getUser();
        return { session };
    },
    loader: async ({ context }) => {
        if (!context.session) {
            throw redirect({
                to: "/login",
            });
        }
    },
});

function RouteComponent() {
    const { organizationId } = Route.useParams();
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();

    // Fetch organization data
    const { data: organization, isLoading: orgLoading } = useQuery<any>(
        trpc.organization.getById.queryOptions({ id: organizationId }) as any
    );

    // Fetch organization members
    const { data: members, isLoading: membersLoading } = useQuery<any>(
        trpc.organizationMembership.getByOrganization.queryOptions({
            organizationId,
        }) as any
    );

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
                <p className="text-muted-foreground">
                    {organization?.name || "Loading..."}
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="general">
                        <Settings className="h-4 w-4 mr-2" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="members">
                        <Users className="h-4 w-4 mr-2" />
                        Members
                    </TabsTrigger>
                    <TabsTrigger value="teams">
                        <Users className="h-4 w-4 mr-2" />
                        Teams
                    </TabsTrigger>
                </TabsList>

                {/* General Settings Tab */}
                <TabsContent value="general">
                    <GeneralSettings organization={organization} />
                </TabsContent>

                {/* Members Management Tab */}
                <TabsContent value="members">
                    <MembersManagement
                        organizationId={organizationId}
                        members={members}
                        isLoading={membersLoading}
                    />
                </TabsContent>

                {/* Teams Management Tab */}
                <TabsContent value="teams">
                    <TeamManagement organizationId={organizationId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function GeneralSettings({ organization }: { organization: any }) {
    const { organizationId } = Route.useParams();
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();
    const [name, setName] = useState(organization?.name || "");
    const [description, setDescription] = useState(organization?.description || "");

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.organization.update.mutate(data);
        },
        onMutate: async (updatedData) => {
            const queryKey = trpc.organization.getById.queryOptions({ id: organizationId }).queryKey;
            
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey });
            
            // Snapshot previous value
            const previousOrg = queryClient.getQueryData(queryKey);
            
            // Optimistically update
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return { ...old, ...updatedData };
            });
            
            console.log("[GeneralSettings] Optimistic update:", updatedData);
            return { previousOrg };
        },
        onError: (error: any, _data, context: any) => {
            const queryKey = trpc.organization.getById.queryOptions({ id: organizationId }).queryKey;
            if (context?.previousOrg) {
                queryClient.setQueryData(queryKey, context.previousOrg);
            }
            console.error("[GeneralSettings] Update error:", error);
            toast.error(error.message || "Failed to update organization");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organization"] });
            toast.success("Organization updated successfully");
        },
    });

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Organization name is required");
            return;
        }
        updateMutation.mutate({
            id: organization.id,
            name,
            description: description || undefined,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>
                    Update your organization's basic information
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                        id="org-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Acme Inc."
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="org-description">Description (Optional)</Label>
                    <Input
                        id="org-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="A brief description of your organization"
                    />
                </div>

                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
            </CardContent>
        </Card>
    );
}

function MembersManagement({
    organizationId,
    members,
    isLoading,
}: {
    organizationId: string;
    members: any[];
    isLoading: boolean;
}) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [inviteRole, setInviteRole] = useState("member");

    // Fetch available users (not already members)
    const { data: availableUsers, isLoading: usersLoading } = useQuery<any>(
        trpc.organizationMembership.getAvailableUsers.queryOptions({ organizationId }) as any
    );

    // Add member mutation
    const addMemberMutation = useMutation({
        mutationFn: async (data: { userId: string; role: string }) => {
            return await client.organizationMembership.inviteMember.mutate({
                organizationId,
                userId: data.userId,
                role: data.role,
            });
        },
        onMutate: async (newMemberData) => {
            const membersKey = trpc.organizationMembership.getByOrganization.queryOptions({ organizationId }).queryKey;
            const usersKey = trpc.organizationMembership.getAvailableUsers.queryOptions({ organizationId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey: membersKey });
            await queryClient.cancelQueries({ queryKey: usersKey });
            
            const previousMembers = queryClient.getQueryData(membersKey);
            const previousUsers = queryClient.getQueryData(usersKey);
            
            // Get user details from available users
            const user = availableUsers?.find((u: any) => u.id === newMemberData.userId);
            
            if (user) {
                // Optimistically add member
                const tempMember = {
                    id: `temp-${Date.now()}`,
                    userId: newMemberData.userId,
                    organizationId,
                    role: newMemberData.role,
                    joinedAt: new Date(),
                    user: user,
                };
                
                queryClient.setQueryData(membersKey, (old: any) => {
                    if (!old) return [tempMember];
                    return [...old, tempMember];
                });
                
                // Remove user from available users
                queryClient.setQueryData(usersKey, (old: any) => {
                    if (!old) return old;
                    return old.filter((u: any) => u.id !== newMemberData.userId);
                });
            }
            
            console.log("[MembersManagement] Optimistic add member:", newMemberData);
            return { previousMembers, previousUsers };
        },
        onError: (error: any, _data, context: any) => {
            const membersKey = trpc.organizationMembership.getByOrganization.queryOptions({ organizationId }).queryKey;
            const usersKey = trpc.organizationMembership.getAvailableUsers.queryOptions({ organizationId }).queryKey;
            
            if (context?.previousMembers) {
                queryClient.setQueryData(membersKey, context.previousMembers);
            }
            if (context?.previousUsers) {
                queryClient.setQueryData(usersKey, context.previousUsers);
            }
            console.error("[MembersManagement] Add member error:", error);
            toast.error(error.message || "Failed to add member");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizationMembership"] });
            toast.success("Member added to organization");
            setShowInviteForm(false);
            setSelectedUserId("");
            setInviteRole("member");
        },
    });

    // Remove member mutation
    const removeMemberMutation = useMutation({
        mutationFn: async (id: string) => {
            return await client.organizationMembership.removeMember.mutate({ id });
        },
        onMutate: async (memberId) => {
            const membersKey = trpc.organizationMembership.getByOrganization.queryOptions({ organizationId }).queryKey;
            const usersKey = trpc.organizationMembership.getAvailableUsers.queryOptions({ organizationId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey: membersKey });
            await queryClient.cancelQueries({ queryKey: usersKey });
            
            const previousMembers = queryClient.getQueryData(membersKey);
            const previousUsers = queryClient.getQueryData(usersKey);
            
            // Find member being removed
            const removedMember = members?.find((m: any) => m.id === memberId);
            
            // Optimistically remove from members list
            queryClient.setQueryData(membersKey, (old: any) => {
                if (!old) return old;
                return old.filter((m: any) => m.id !== memberId);
            });
            
            // Add user back to available users
            if (removedMember?.user) {
                queryClient.setQueryData(usersKey, (old: any) => {
                    if (!old) return [removedMember.user];
                    return [...old, removedMember.user].sort((a: any, b: any) => 
                        a.email.localeCompare(b.email)
                    );
                });
            }
            
            console.log("[MembersManagement] Optimistic remove member:", memberId);
            return { previousMembers, previousUsers };
        },
        onError: (error: any, _id, context: any) => {
            const membersKey = trpc.organizationMembership.getByOrganization.queryOptions({ organizationId }).queryKey;
            const usersKey = trpc.organizationMembership.getAvailableUsers.queryOptions({ organizationId }).queryKey;
            
            if (context?.previousMembers) {
                queryClient.setQueryData(membersKey, context.previousMembers);
            }
            if (context?.previousUsers) {
                queryClient.setQueryData(usersKey, context.previousUsers);
            }
            console.error("[MembersManagement] Remove member error:", error);
            toast.error(error.message || "Failed to remove member");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizationMembership"] });
            toast.success("Member removed from organization");
        },
    });

    // Update role mutation
    const updateRoleMutation = useMutation({
        mutationFn: async (data: { id: string; role: string }) => {
            return await client.organizationMembership.updateRole.mutate(data);
        },
        onMutate: async (updateData) => {
            const membersKey = trpc.organizationMembership.getByOrganization.queryOptions({ organizationId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey: membersKey });
            const previousMembers = queryClient.getQueryData(membersKey);
            
            // Optimistically update role
            queryClient.setQueryData(membersKey, (old: any) => {
                if (!old) return old;
                return old.map((m: any) => 
                    m.id === updateData.id ? { ...m, role: updateData.role } : m
                );
            });
            
            console.log("[MembersManagement] Optimistic update role:", updateData);
            return { previousMembers };
        },
        onError: (error: any, _data, context: any) => {
            const membersKey = trpc.organizationMembership.getByOrganization.queryOptions({ organizationId }).queryKey;
            
            if (context?.previousMembers) {
                queryClient.setQueryData(membersKey, context.previousMembers);
            }
            console.error("[MembersManagement] Update role error:", error);
            toast.error(error.message || "Failed to update role");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizationMembership"] });
            toast.success("Member role updated");
        },
    });

    const handleRemoveMember = (memberId: string, memberName: string) => {
        if (
            confirm(
                `Are you sure you want to remove ${memberName} from the organization?`
            )
        ) {
            removeMemberMutation.mutate(memberId);
        }
    };

    const handleUpdateRole = (memberId: string, newRole: string) => {
        updateRoleMutation.mutate({ id: memberId, role: newRole });
    };

    const getInitials = (name: string | null) => {
        if (!name) return "?";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const getRoleBadgeVariant = (role: string) => {
        if (role === "owner" || role === "admin") return "default";
        return "secondary";
    };

    if (isLoading) {
        return <div className="text-center py-8">Loading members...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Organization Members</CardTitle>
                            <CardDescription>
                                Manage who has access to your organization ({members?.length || 0}{" "}
                                members)
                            </CardDescription>
                        </div>
                        <Button onClick={() => setShowInviteForm(!showInviteForm)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite Member
                        </Button>
                    </div>
                </CardHeader>

                {/* Invite Form */}
                {showInviteForm && (
                    <CardContent className="border-t">
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="invite-user">Select User</Label>
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger id="invite-user">
                                        <SelectValue placeholder="Choose a user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {usersLoading && (
                                            <SelectItem value="loading" disabled>
                                                Loading users...
                                            </SelectItem>
                                        )}
                                        {!usersLoading && availableUsers?.length === 0 && (
                                            <SelectItem value="none" disabled>
                                                No available users
                                            </SelectItem>
                                        )}
                                        {availableUsers?.map((user: any) => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.name || `${user.firstName} ${user.lastName}`} ({user.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-role">Role</Label>
                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                    <SelectTrigger id="invite-role">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">Member</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        if (!selectedUserId) {
                                            toast.error("Please select a user");
                                            return;
                                        }
                                        addMemberMutation.mutate({
                                            userId: selectedUserId,
                                            role: inviteRole,
                                        });
                                    }}
                                    disabled={addMemberMutation.isPending || !selectedUserId}
                                >
                                    {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowInviteForm(false);
                                        setSelectedUserId("");
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Members List */}
            <Card>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {members?.map((member: any) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-4 hover:bg-accent"
                            >
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={member.user?.avatarUrl || undefined} />
                                        <AvatarFallback>
                                            {getInitials(member.user?.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">
                                            {member.user?.name || "Unknown User"}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {member.user?.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Select
                                        value={member.role}
                                        onValueChange={(value) =>
                                            handleUpdateRole(member.id, value)
                                        }
                                    >
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="member">Member</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="owner">Owner</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            handleRemoveMember(member.id, member.user?.name)
                                        }
                                        disabled={removeMemberMutation.isPending}
                                    >
                                        <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {members?.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                No members in this organization yet
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
