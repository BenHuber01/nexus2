import { useTRPC } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Priority } from "@my-better-t-app/db";
import { Button } from "@/components/ui/button";
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
    const queryClient = useQueryClient();

    const { data: project } = useQuery<any>(
        trpc.project.getById.queryOptions({ id: projectId }) as any,
    );

    const { data: workItems, isLoading: itemsLoading } = useQuery<any>(
        trpc.workItem.getAll.queryOptions({ projectId }) as any,
    );

    const { data: sprints } = useQuery<any>(
        trpc.sprint.getAll.queryOptions({ projectId }) as any,
    );

    const moveToSprintMutation = useMutation(
        trpc.workItem.moveToSprint.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.workItem.getAll.queryFilter({ projectId }));
                toast.success("Item moved to sprint");
            },
        }) as any
    );

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

            <div className="space-y-2">
                {backlogItems.length === 0 ? (
                    <div className="p-12 text-center border rounded-lg border-dashed text-muted-foreground">
                        Backlog is empty.
                    </div>
                ) : (
                    backlogItems.map((item: any) => (
                        <Card key={item.id} className="hover:bg-muted/30 transition-colors">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className="w-20 justify-center">
                                        {project?.key}-{item.id.split("-")[0]}
                                    </Badge>
                                    <span className="font-medium">{item.title}</span>
                                    <Badge variant="secondary" className="text-[10px]">
                                        {item.type}
                                    </Badge>
                                    <Badge variant={item.priority === Priority.HIGH ? "destructive" : "secondary"} className="text-[10px]">
                                        {item.priority}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4">
                                    {item.assignee && (
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                                            {item.assignee.firstName[0]}{item.assignee.lastName[0]}
                                        </div>
                                    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">Move to Sprint</Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
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
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
