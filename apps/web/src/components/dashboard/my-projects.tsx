import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, ChevronRight } from "lucide-react";

export function MyProjects() {
    const trpc = useTRPC();
    const navigate = useNavigate();

    const { data: organizations, isLoading } = useQuery<any>(
        trpc.organization.getWithProjects.queryOptions() as any
    );

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>My Projects</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!organizations || organizations.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>My Projects</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        No organizations or projects found
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    My Projects
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {organizations.map((org: any) => (
                        <Card key={org.id} className="border-2">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">
                                    {org.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {org.projects && org.projects.length > 0 ? (
                                    <div className="space-y-2">
                                        {org.projects.slice(0, 5).map((project: any) => (
                                            <div
                                                key={project.id}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                                                onClick={() =>
                                                    navigate({
                                                        to: "/projects/$projectId",
                                                        params: { projectId: project.id },
                                                    })
                                                }
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-mono text-muted-foreground">
                                                            {project.key}
                                                        </span>
                                                        {project.taskCount > 0 && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {project.taskCount}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-medium truncate mt-0.5">
                                                        {project.name}
                                                    </p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                                            </div>
                                        ))}
                                        {org.projects.length > 5 && (
                                            <div className="pt-2 border-t">
                                                <p className="text-xs text-muted-foreground text-center">
                                                    +{org.projects.length - 5} more projects
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No projects in this organization
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
