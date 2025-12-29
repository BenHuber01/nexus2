import { useState } from "react";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, X, Search } from "lucide-react";
import { toast } from "sonner";

interface TeamMemberSelectorProps {
    teamId: string;
    organizationId: string;
}

export function TeamMemberSelector({
    teamId,
    organizationId,
}: TeamMemberSelectorProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    // Fetch active team members
    const { data: teamMembers } = useQuery<any>(
        trpc.teamMembership.getActiveMembers.queryOptions({ teamId }) as any
    );

    // Fetch all organization members
    const { data: orgMembers } = useQuery<any>(
        trpc.organizationMembership.getByOrganization.queryOptions({
            organizationId,
        }) as any
    );

    // Add member mutation
    const addMemberMutation = useMutation({
        mutationFn: async (data: any) => {
            return await client.teamMembership.addMember.mutate(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teamMembership"] });
            queryClient.invalidateQueries({ queryKey: ["team"] });
            toast.success("Member added to team");
            setSelectedUserId("");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to add member");
        },
    });

    // Remove member mutation
    const removeMemberMutation = useMutation({
        mutationFn: async (id: string) => {
            return await client.teamMembership.removeMember.mutate({ id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teamMembership"] });
            queryClient.invalidateQueries({ queryKey: ["team"] });
            toast.success("Member removed from team");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to remove member");
        },
    });

    // Update role mutation
    const updateRoleMutation = useMutation({
        mutationFn: async (data: { id: string; roleId: string | null }) => {
            return await client.teamMembership.updateRole.mutate(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teamMembership"] });
            toast.success("Role updated");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update role");
        },
    });

    // Get available users (org members not in team)
    const availableUsers = orgMembers?.filter(
        (orgMember: any) =>
            !teamMembers?.some(
                (teamMember: any) => teamMember.userId === orgMember.userId
            )
    );

    // Filter members by search query
    const filteredMembers = teamMembers?.filter((member: any) => {
        const searchLower = searchQuery.toLowerCase();
        const name = member.user?.name?.toLowerCase() || "";
        const email = member.user?.email?.toLowerCase() || "";
        return name.includes(searchLower) || email.includes(searchLower);
    });

    const handleAddMember = () => {
        if (!selectedUserId) {
            toast.error("Please select a user");
            return;
        }
        addMemberMutation.mutate({
            teamId,
            userId: selectedUserId,
            roleId: null,
        });
    };

    const handleRemoveMember = (membershipId: string) => {
        if (confirm("Are you sure you want to remove this member from the team?")) {
            removeMemberMutation.mutate(membershipId);
        }
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

    return (
        <div className="space-y-6">
            {/* Add Member Section */}
            <div className="space-y-3">
                <h3 className="font-semibold">Add Member</h3>
                <div className="flex gap-2">
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a user..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableUsers?.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    All organization members are already in this team
                                </div>
                            ) : (
                                availableUsers?.map((orgMember: any) => (
                                    <SelectItem
                                        key={orgMember.userId}
                                        value={orgMember.userId}
                                    >
                                        {orgMember.user?.name || orgMember.user?.email}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    <Button
                        onClick={handleAddMember}
                        disabled={!selectedUserId || addMemberMutation.isPending}
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add
                    </Button>
                </div>
            </div>

            {/* Current Members Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                        Current Members ({teamMembers?.length || 0})
                    </h3>
                    {teamMembers && teamMembers.length > 3 && (
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search members..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 w-64"
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {filteredMembers?.map((member: any) => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                        >
                            <div className="flex items-center gap-3">
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
                            <div className="flex items-center gap-2">
                                {member.role && (
                                    <span className="text-xs bg-secondary px-2 py-1 rounded">
                                        {member.role.name}
                                    </span>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMember(member.id)}
                                    disabled={removeMemberMutation.isPending}
                                >
                                    <X className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    {filteredMembers?.length === 0 && teamMembers?.length > 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No members found matching "{searchQuery}"
                        </div>
                    )}

                    {teamMembers?.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No members in this team yet. Add some members to get started.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
