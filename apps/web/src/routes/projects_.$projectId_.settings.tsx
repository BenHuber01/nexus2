import { getUser } from "@/functions/get-user";
import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkflowStateEditor } from "@/components/workflow-state-editor";
import { ComponentEditor } from "@/components/component-editor";
import { Settings, Workflow, ArrowLeft, Package } from "lucide-react";

export const Route = createFileRoute("/projects_/$projectId_/settings")({
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
    const params = Route.useParams() as { projectId: string };
    const projectId = params.projectId;
    const trpc = useTRPC();

    const { data: project, isLoading } = useQuery<any>(
        trpc.project.getById.queryOptions({ id: projectId }) as any
    );

    if (isLoading) {
        return <div className="container mx-auto py-8">Loading project settings...</div>;
    }

    if (!project) {
        return <div className="container mx-auto py-8">Project not found</div>;
    }

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <Link
                    to="/projects/$projectId"
                    params={{ projectId }}
                    className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Project
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
                <p className="text-muted-foreground">
                    {project.name} ({project.key})
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="general">
                        <Settings className="h-4 w-4 mr-2" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="workflow">
                        <Workflow className="h-4 w-4 mr-2" />
                        Workflow States
                    </TabsTrigger>
                    <TabsTrigger value="components">
                        <Package className="h-4 w-4 mr-2" />
                        Components
                    </TabsTrigger>
                </TabsList>

                {/* General Settings Tab */}
                <TabsContent value="general">
                    <GeneralSettings project={project} />
                </TabsContent>

                {/* Workflow States Tab */}
                <TabsContent value="workflow">
                    <WorkflowStateEditor projectId={projectId} />
                </TabsContent>

                {/* Components Tab */}
                <TabsContent value="components">
                    <ComponentEditor projectId={projectId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function GeneralSettings({ project }: { project: any }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>
                    Update your project's basic information
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                        id="project-name"
                        value={project.name}
                        disabled
                        placeholder="My Project"
                    />
                    <p className="text-xs text-muted-foreground">
                        Project name editing coming soon...
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="project-key">Project Key</Label>
                    <Input
                        id="project-key"
                        value={project.key}
                        disabled
                        placeholder="PROJ"
                    />
                    <p className="text-xs text-muted-foreground">
                        Project key cannot be changed
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="project-description">Description (Optional)</Label>
                    <Input
                        id="project-description"
                        value={project.description || ""}
                        disabled
                        placeholder="A brief description of your project"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
