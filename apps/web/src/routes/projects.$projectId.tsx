import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TaskBoard } from "@/components/task-board";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTaskModal } from "@/components/create-task-modal";
import { SprintManagement } from "@/components/sprint-management";
import { BacklogView } from "@/components/backlog-view";
import { useState } from "react";

export const Route = createFileRoute("/projects/$projectId")({
    component: ProjectComponent,
});

function ProjectComponent() {
    const { projectId } = Route.useParams();
    const trpc = useTRPC();
    const [createTaskOpen, setCreateTaskOpen] = useState(false);

    const { data: project, isLoading } = useQuery<any>(
        trpc.project.getById.queryOptions({ id: projectId }) as any,
    );

    if (isLoading) {
        return (
            <div className="container mx-auto py-8 space-y-8">
                <Skeleton className="h-12 w-[300px]" />
                <Skeleton className="h-[600px] w-full" />
            </div>
        );
    }

    if (!project) {
        return <div className="container mx-auto py-8">Project not found</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto py-4 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <span>Projects</span>
                            <span>/</span>
                            <span>{project.key}</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                    </div>
                    <div className="flex gap-2">
                        <Link to="/projects/$projectId/settings" params={{ projectId }}>
                            <Button variant="outline">Settings</Button>
                        </Link>
                        <Button onClick={() => setCreateTaskOpen(true)}>Create Task</Button>
                    </div>
                </div>
            </div>

            <CreateTaskModal
                open={createTaskOpen}
                onOpenChange={setCreateTaskOpen}
                projectId={projectId}
            />

            <div className="container mx-auto py-6 flex-1 overflow-hidden">
                <Tabs defaultValue="board" className="h-full flex flex-col">
                    <TabsList className="mb-4">
                        <TabsTrigger value="board">Board</TabsTrigger>
                        <TabsTrigger value="list">List</TabsTrigger>
                        <TabsTrigger value="sprints">Sprints</TabsTrigger>
                        <TabsTrigger value="backlog">Backlog</TabsTrigger>
                    </TabsList>
                    <TabsContent value="board" className="flex-1 overflow-hidden">
                        <TaskBoard projectId={projectId} />
                    </TabsContent>
                    <TabsContent value="list">
                        <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                            List view coming soon...
                        </div>
                    </TabsContent>
                    <TabsContent value="sprints">
                        <SprintManagement projectId={projectId} />
                    </TabsContent>
                    <TabsContent value="backlog">
                        <BacklogView projectId={projectId} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
