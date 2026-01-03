import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { getUser } from "@/functions/get-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskFormModal } from "@/components/task-form-modal";
import { Calendar, AlertCircle } from "lucide-react";
import { formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns";

export function UpcomingDueDates() {
    const trpc = useTRPC();
    const [editingTask, setEditingTask] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { data: session } = useQuery({
        queryKey: ["session"],
        queryFn: getUser,
    });

    const { data: tasks, isLoading } = useQuery<any>({
        ...(trpc.workItem.getUpcoming.queryOptions({
            userId: session?.user?.id || "",
            days: 7,
        }) as any),
        enabled: !!session?.user?.id,
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Due Dates</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!tasks || tasks.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Due Dates</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        No upcoming due dates
                    </div>
                </CardContent>
            </Card>
        );
    }

    const groupTasksByDate = (tasks: any[]) => {
        const overdue: any[] = [];
        const today: any[] = [];
        const tomorrow: any[] = [];
        const thisWeek: any[] = [];

        tasks.forEach((task) => {
            if (!task.dueDate) return;

            const dueDate = new Date(task.dueDate);

            if (isPast(dueDate) && !isToday(dueDate)) {
                overdue.push(task);
            } else if (isToday(dueDate)) {
                today.push(task);
            } else if (isTomorrow(dueDate)) {
                tomorrow.push(task);
            } else {
                thisWeek.push(task);
            }
        });

        return { overdue, today, tomorrow, thisWeek };
    };

    const grouped = groupTasksByDate(tasks);

    const renderTaskItem = (task: any) => {
        const taskKey = task.project?.key
            ? `${task.project.key}-${task.id.split("-")[0]}`
            : task.id.split("-")[0];

        return (
            <div
                key={task.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                    setEditingTask(task);
                    setIsEditModalOpen(true);
                }}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                            {taskKey}
                        </span>
                        <Badge variant="outline" className="text-xs">
                            {task.state?.name}
                        </Badge>
                    </div>
                    <p className="text-sm font-medium mt-1 truncate">
                        {task.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{task.project?.name}</span>
                        {task.assignee && task.assignee.id !== session?.user?.id && (
                            <span>• {task.assignee.name}</span>
                        )}
                    </div>
                </div>
                <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                </div>
            </div>
        );
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Upcoming Due Dates
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Overdue */}
                    {grouped.overdue.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <h3 className="text-sm font-semibold text-destructive">
                                    Overdue ({grouped.overdue.length})
                                </h3>
                            </div>
                            <div className="space-y-2">
                                {grouped.overdue.map(renderTaskItem)}
                            </div>
                        </div>
                    )}

                    {/* Today */}
                    {grouped.today.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-orange-600 mb-3">
                                Today ({grouped.today.length})
                            </h3>
                            <div className="space-y-2">
                                {grouped.today.map(renderTaskItem)}
                            </div>
                        </div>
                    )}

                    {/* Tomorrow */}
                    {grouped.tomorrow.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-yellow-600 mb-3">
                                Tomorrow ({grouped.tomorrow.length})
                            </h3>
                            <div className="space-y-2">
                                {grouped.tomorrow.map(renderTaskItem)}
                            </div>
                        </div>
                    )}

                    {/* This Week */}
                    {grouped.thisWeek.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold mb-3">
                                This Week ({grouped.thisWeek.length})
                            </h3>
                            <div className="space-y-2">
                                {grouped.thisWeek.map(renderTaskItem)}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <TaskFormModal
                mode="edit"
                open={isEditModalOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsEditModalOpen(false);
                        setEditingTask(null);
                    }
                }}
                projectId={editingTask?.projectId}
                task={editingTask}
            />
        </>
    );
}
