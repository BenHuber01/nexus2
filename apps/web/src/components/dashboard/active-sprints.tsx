import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ActiveSprints() {
    const trpc = useTRPC();
    const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());

    const { data: sprints, isLoading } = useQuery<any>(
        trpc.sprint.getActive.queryOptions({ limit: 3 }) as any
    );

    const toggleExpand = (sprintId: string) => {
        setExpandedSprints((prev) => {
            const next = new Set(prev);
            if (next.has(sprintId)) {
                next.delete(sprintId);
            } else {
                next.add(sprintId);
            }
            return next;
        });
    };

    if (isLoading) {
        return <Skeleton className="h-[200px] w-full" />;
    }

    if (!sprints || sprints.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Active Sprints</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        No active sprints
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Active Sprints</h2>
            {sprints.map((sprint: any) => {
                const isExpanded = expandedSprints.has(sprint.id);
                const progress = sprint.stats.total > 0 
                    ? (sprint.stats.done / sprint.stats.total) * 100 
                    : 0;
                const daysRemaining = Math.ceil(
                    (new Date(sprint.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                    <Card key={sprint.id}>
                        <CardHeader 
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleExpand(sprint.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">{sprint.name}</CardTitle>
                                        <Badge variant="outline" className="text-xs">
                                            {sprint.project?.name}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {daysRemaining > 0 ? (
                                                <span>{daysRemaining} days left</span>
                                            ) : (
                                                <span className="text-destructive">Overdue</span>
                                            )}
                                        </div>
                                        <div className="flex-1 max-w-xs">
                                            <Progress value={progress} className="h-2" />
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {Math.round(progress)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    {isExpanded ? (
                                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        
                        {isExpanded && (
                            <CardContent>
                                <div className="grid grid-cols-4 gap-4 pt-2">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{sprint.stats.total}</div>
                                        <div className="text-xs text-muted-foreground">Total</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-500">{sprint.stats.todo}</div>
                                        <div className="text-xs text-muted-foreground">Todo</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-500">{sprint.stats.inProgress}</div>
                                        <div className="text-xs text-muted-foreground">In Progress</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-500">{sprint.stats.done}</div>
                                        <div className="text-xs text-muted-foreground">Done</div>
                                    </div>
                                </div>
                                {sprint.goal && (
                                    <div className="mt-4 pt-4 border-t">
                                        <div className="text-xs font-medium text-muted-foreground mb-1">Sprint Goal</div>
                                        <p className="text-sm">{sprint.goal}</p>
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}
