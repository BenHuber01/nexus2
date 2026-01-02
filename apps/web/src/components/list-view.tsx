import { useState, useMemo } from "react";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TaskFormModal } from "@/components/task-form-modal";
import { Priority, WorkItemType, WorkItemStateCategory } from "@my-better-t-app/db";
import { toast } from "sonner";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Filter,
    X,
    Trash2,
    UserPlus,
    CheckSquare,
} from "lucide-react";

interface ListViewProps {
    projectId: string;
}

type SortField = "id" | "title" | "type" | "priority" | "state" | "assignee" | "sprint";
type SortOrder = "asc" | "desc";
type GroupBy = "none" | "state" | "assignee" | "sprint" | "type";

export function ListView({ projectId }: ListViewProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();

    // State
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [editingTask, setEditingTask] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [sortField, setSortField] = useState<SortField>("id");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [filters, setFilters] = useState({
        type: "all",
        priority: "all",
        stateCategory: "all",
        assignee: "all",
        sprint: "all",
        search: "",
    });

    // Data queries
    const { data: workItems, isLoading } = useQuery<any>({
        ...(trpc.workItem.getAll.queryOptions({ projectId }) as any),
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
    });

    const { data: states } = useQuery<any>(
        trpc.workItemState.getByProject.queryOptions({ projectId }) as any
    );

    // Get unique sprints from workItems
    const sprints = useMemo(() => {
        if (!workItems) return [];
        const uniqueSprints = new Map();
        workItems.forEach((item: any) => {
            if (item.sprint) {
                uniqueSprints.set(item.sprint.id, item.sprint);
            }
        });
        return Array.from(uniqueSprints.values());
    }, [workItems]);

    // Get unique assignees
    const assignees = useMemo(() => {
        if (!workItems) return [];
        const uniqueAssignees = new Map();
        workItems.forEach((item: any) => {
            if (item.assignee) {
                uniqueAssignees.set(item.assignee.id, item.assignee);
            }
        });
        return Array.from(uniqueAssignees.values());
    }, [workItems]);

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            console.log("[ListView] Deleting items:", ids);
            // Delete all items in parallel
            return await Promise.all(
                ids.map((id) => client.workItem.delete.mutate({ id }))
            );
        },
        onMutate: async (ids) => {
            const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
            await queryClient.cancelQueries({ queryKey });
            const previousItems = queryClient.getQueryData(queryKey);

            // Optimistically remove items
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old.filter((item: any) => !ids.includes(item.id));
            });

            console.log("[ListView] Optimistic bulk delete:", ids);
            return { previousItems };
        },
        onError: (err, _ids, context: any) => {
            const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
            if (context?.previousItems) {
                queryClient.setQueryData(queryKey, context.previousItems);
            }
            console.error("[ListView] Bulk delete error:", err);
            toast.error("Failed to delete items");
        },
        onSuccess: (_, ids) => {
            queryClient.invalidateQueries({
                queryKey: trpc.workItem.getAll.queryOptions({ projectId }).queryKey,
            });
            toast.success(`${ids.length} item${ids.length > 1 ? 's' : ''} deleted successfully`);
            setSelectedItems(new Set());
        },
    });

    // Bulk state change mutation
    const bulkUpdateStateMutation = useMutation({
        mutationFn: async ({ ids, stateId }: { ids: string[]; stateId: string }) => {
            return await Promise.all(
                ids.map((id) => client.workItem.updateState.mutate({ id, stateId }))
            );
        },
        onMutate: async ({ ids, stateId }) => {
            const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
            await queryClient.cancelQueries({ queryKey });
            const previousItems = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old.map((item: any) =>
                    ids.includes(item.id) ? { ...item, stateId } : item
                );
            });

            console.log("[ListView] Optimistic bulk state update:", { ids, stateId });
            return { previousItems };
        },
        onError: (err, _data, context: any) => {
            const queryKey = trpc.workItem.getAll.queryOptions({ projectId }).queryKey;
            if (context?.previousItems) {
                queryClient.setQueryData(queryKey, context.previousItems);
            }
            console.error("[ListView] Bulk state update error:", err);
            toast.error("Failed to update items");
        },
        onSuccess: (_, { ids }) => {
            queryClient.invalidateQueries({
                queryKey: trpc.workItem.getAll.queryOptions({ projectId }).queryKey,
            });
            toast.success(`${ids.length} items updated successfully`);
            setSelectedItems(new Set());
        },
    });

    // Filtered and sorted items
    const processedItems = useMemo(() => {
        if (!workItems) return [];

        let filtered = [...workItems];

        // Apply filters
        if (filters.type !== "all") {
            filtered = filtered.filter((item: any) => item.type === filters.type);
        }
        if (filters.priority !== "all") {
            filtered = filtered.filter((item: any) => item.priority === filters.priority);
        }
        if (filters.stateCategory !== "all") {
            filtered = filtered.filter((item: any) => {
                const state = states?.find((s: any) => s.id === item.stateId);
                return state?.category === filters.stateCategory;
            });
        }
        if (filters.assignee !== "all") {
            if (filters.assignee === "unassigned") {
                filtered = filtered.filter((item: any) => !item.assigneeId);
            } else {
                filtered = filtered.filter((item: any) => item.assigneeId === filters.assignee);
            }
        }
        if (filters.sprint !== "all") {
            filtered = filtered.filter((item: any) => item.sprintId === filters.sprint);
        }
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter((item: any) =>
                item.title.toLowerCase().includes(searchLower) ||
                item.id.toLowerCase().includes(searchLower)
            );
        }

        // Apply sorting
        filtered.sort((a: any, b: any) => {
            let aVal: any, bVal: any;

            switch (sortField) {
                case "id":
                    aVal = a.id;
                    bVal = b.id;
                    break;
                case "title":
                    aVal = a.title.toLowerCase();
                    bVal = b.title.toLowerCase();
                    break;
                case "type":
                    aVal = a.type;
                    bVal = b.type;
                    break;
                case "priority":
                    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                    aVal = priorityOrder[a.priority as keyof typeof priorityOrder];
                    bVal = priorityOrder[b.priority as keyof typeof priorityOrder];
                    break;
                case "state":
                    const aState = states?.find((s: any) => s.id === a.stateId);
                    const bState = states?.find((s: any) => s.id === b.stateId);
                    aVal = aState?.name || "";
                    bVal = bState?.name || "";
                    break;
                case "assignee":
                    aVal = a.assignee?.firstName || "";
                    bVal = b.assignee?.firstName || "";
                    break;
                case "sprint":
                    const aSprint = sprints?.find((s: any) => s.id === a.sprintId);
                    const bSprint = sprints?.find((s: any) => s.id === b.sprintId);
                    aVal = aSprint?.name || "";
                    bVal = bSprint?.name || "";
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
            if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [workItems, filters, sortField, sortOrder, states, sprints]);

    // Grouped items
    const groupedItems = useMemo(() => {
        if (groupBy === "none") {
            return { "All Items": processedItems };
        }

        const groups: Record<string, any[]> = {};

        processedItems.forEach((item: any) => {
            let groupKey: string;

            switch (groupBy) {
                case "state":
                    const state = states?.find((s: any) => s.id === item.stateId);
                    groupKey = state?.name || "No State";
                    break;
                case "assignee":
                    groupKey = item.assignee
                        ? `${item.assignee.firstName} ${item.assignee.lastName}`
                        : "Unassigned";
                    break;
                case "sprint":
                    const sprint = sprints?.find((s: any) => s.id === item.sprintId);
                    groupKey = sprint?.name || "No Sprint";
                    break;
                case "type":
                    groupKey = item.type;
                    break;
                default:
                    groupKey = "All Items";
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
        });

        return groups;
    }, [processedItems, groupBy, states, sprints]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("asc");
        }
    };

    const handleSelectAll = (groupItems: any[]) => {
        const allIds = groupItems.map((item) => item.id);
        const allSelected = allIds.every((id) => selectedItems.has(id));

        if (allSelected) {
            setSelectedItems(new Set(Array.from(selectedItems).filter((id) => !allIds.includes(id))));
        } else {
            setSelectedItems(new Set([...Array.from(selectedItems), ...allIds]));
        }
    };

    const handleSelectItem = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const handleBulkDelete = () => {
        if (selectedItems.size === 0) return;
        if (!confirm(`Delete ${selectedItems.size} items?`)) return;
        bulkDeleteMutation.mutate(Array.from(selectedItems));
    };

    const handleBulkStateChange = (stateId: string) => {
        if (selectedItems.size === 0) return;
        bulkUpdateStateMutation.mutate({ ids: Array.from(selectedItems), stateId });
    };

    const clearFilters = () => {
        setFilters({
            type: "all",
            priority: "all",
            stateCategory: "all",
            assignee: "all",
            sprint: "all",
            search: "",
        });
    };

    const hasActiveFilters = Object.values(filters).some((v) => v !== "all" && v !== "");

    if (isLoading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
        return sortOrder === "asc" ? (
            <ArrowUp className="h-4 w-4 ml-1" />
        ) : (
            <ArrowDown className="h-4 w-4 ml-1" />
        );
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-4">
                {/* Filters Row */}
                <div className="flex flex-wrap gap-2 items-center">
                    <Filter className="h-4 w-4 text-muted-foreground" />

                    <Input
                        placeholder="Search..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="w-[200px]"
                    />

                    <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {Object.values(WorkItemType).map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priorities</SelectItem>
                            {Object.values(Priority).map((priority) => (
                                <SelectItem key={priority} value={priority}>
                                    {priority}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filters.stateCategory} onValueChange={(value) => setFilters({ ...filters, stateCategory: value })}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All States</SelectItem>
                            {Object.values(WorkItemStateCategory).map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filters.assignee} onValueChange={(value) => setFilters({ ...filters, assignee: value })}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Assignee" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Assignees</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {assignees.map((assignee: any) => (
                                <SelectItem key={assignee.id} value={assignee.id}>
                                    {assignee.firstName} {assignee.lastName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {sprints && sprints.length > 0 && (
                        <Select value={filters.sprint} onValueChange={(value) => setFilters({ ...filters, sprint: value })}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Sprint" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sprints</SelectItem>
                                {sprints.map((sprint: any) => (
                                    <SelectItem key={sprint.id} value={sprint.id}>
                                        {sprint.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                            <X className="h-4 w-4 mr-1" />
                            Clear
                        </Button>
                    )}
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Group by:
                        </span>
                        <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="state">State</SelectItem>
                                <SelectItem value="assignee">Assignee</SelectItem>
                                <SelectItem value="sprint">Sprint</SelectItem>
                                <SelectItem value="type">Type</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedItems.size > 0 && (
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                                {selectedItems.size} selected
                            </Badge>

                            {states && states.length > 0 && (
                                <Select onValueChange={handleBulkStateChange}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Change state..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {states.map((state: any) => (
                                            <SelectItem key={state.id} value={state.id}>
                                                {state.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
                {Object.entries(groupedItems).map(([groupName, groupItems]) => (
                    <div key={groupName}>
                        {groupBy !== "none" && (
                            <div className="bg-muted px-4 py-2 font-medium flex items-center justify-between">
                                <span>
                                    {groupName} ({groupItems.length})
                                </span>
                                <Checkbox
                                    checked={groupItems.every((item) => selectedItems.has(item.id))}
                                    onCheckedChange={() => handleSelectAll(groupItems)}
                                />
                            </div>
                        )}

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={groupItems.every((item) => selectedItems.has(item.id))}
                                            onCheckedChange={() => handleSelectAll(groupItems)}
                                        />
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort("id")}>
                                        <div className="flex items-center">
                                            ID
                                            <SortIcon field="id" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort("title")}>
                                        <div className="flex items-center">
                                            Title
                                            <SortIcon field="title" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort("type")}>
                                        <div className="flex items-center">
                                            Type
                                            <SortIcon field="type" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort("state")}>
                                        <div className="flex items-center">
                                            State
                                            <SortIcon field="state" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort("priority")}>
                                        <div className="flex items-center">
                                            Priority
                                            <SortIcon field="priority" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort("assignee")}>
                                        <div className="flex items-center">
                                            Assignee
                                            <SortIcon field="assignee" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort("sprint")}>
                                        <div className="flex items-center">
                                            Sprint
                                            <SortIcon field="sprint" />
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                            No items found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    groupItems.map((item: any) => {
                                        const state = states?.find((s: any) => s.id === item.stateId);
                                        const sprint = sprints?.find((s: any) => s.id === item.sprintId);

                                        return (
                                            <TableRow
                                                key={item.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={(e: React.MouseEvent) => {
                                                    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                                                        return;
                                                    }
                                                    setEditingTask(item);
                                                    setIsEditModalOpen(true);
                                                }}
                                            >
                                                <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedItems.has(item.id)}
                                                        onCheckedChange={() => handleSelectItem(item.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {item.id.split("-")[0]}
                                                </TableCell>
                                                <TableCell className="font-medium max-w-[300px] truncate">
                                                    {item.title}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {item.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {state && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs"
                                                            style={{
                                                                borderColor: state.color,
                                                                color: state.color,
                                                            }}
                                                        >
                                                            {state.name}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            item.priority === Priority.CRITICAL ||
                                                            item.priority === Priority.HIGH
                                                                ? "destructive"
                                                                : "secondary"
                                                        }
                                                        className="text-xs"
                                                    >
                                                        {item.priority}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {item.assignee ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                                                                {item.assignee.firstName[0]}
                                                                {item.assignee.lastName[0]}
                                                            </div>
                                                            <span className="text-sm">
                                                                {item.assignee.firstName} {item.assignee.lastName}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Unassigned</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {sprint ? (
                                                        <Badge variant="outline" className="text-xs">
                                                            {sprint.name}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
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
