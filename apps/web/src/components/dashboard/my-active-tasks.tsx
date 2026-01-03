import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { getUser } from "@/functions/get-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { TaskFormModal } from "@/components/task-form-modal";
import { Priority } from "@my-better-t-app/db";
import { formatDistanceToNow } from "date-fns";

export function MyActiveTasks() {
    const trpc = useTRPC();
    const [editingTask, setEditingTask] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { data: session } = useQuery({
        queryKey: ["session"],
        queryFn: getUser,
    });

    const { data: tasks, isLoading } = useQuery<any>({
        ...(trpc.workItem.getByAssignee.queryOptions({
            userId: session?.user?.id || "",
            limit: 15,
        }) as any),
        enabled: !!session?.user?.id,
    });

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full" />;
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>My Active Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                    {!tasks || tasks.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No active tasks assigned
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">ID</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead className="w-[100px]">Priority</TableHead>
                                    <TableHead className="w-[120px]">State</TableHead>
                                    <TableHead className="w-[100px]">Due</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.map((task: any) => (
                                    <TableRow
                                        key={task.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => {
                                            setEditingTask(task);
                                            setIsEditModalOpen(true);
                                        }}
                                    >
                                        <TableCell className="font-mono text-xs">
                                            {task.project?.key}-{task.id.split("-")[0]}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="max-w-[300px] truncate">
                                                {task.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {task.project?.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    task.priority === Priority.HIGH ||
                                                    task.priority === Priority.CRITICAL
                                                        ? "destructive"
                                                        : "secondary"
                                                }
                                            >
                                                {task.priority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{task.state?.name}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {task.dueDate ? (
                                                <span
                                                    className={
                                                        new Date(task.dueDate) < new Date()
                                                            ? "text-destructive font-medium"
                                                            : "text-sm"
                                                    }
                                                >
                                                    {formatDistanceToNow(new Date(task.dueDate), {
                                                        addSuffix: false,
                                                    })}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {editingTask && (
                <TaskFormModal
                    mode="edit"
                    open={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                    task={editingTask}
                    projectId={editingTask.project?.id || editingTask.projectId}
                />
            )}
        </>
    );
}
