import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface CommentSectionProps {
    workItemId: string;
}

export function CommentSection({ workItemId }: CommentSectionProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [newComment, setNewComment] = useState("");

    const { data: comments, isLoading } = useQuery(
        trpc.comment.getByWorkItem.queryOptions({ workItemId })
    );

    const createMutation = useMutation(
        trpc.comment.create.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.comment.getByWorkItem.queryFilter({ workItemId }));
                setNewComment("");
                toast.success("Comment added");
            },
            onError: (error: any) => {
                toast.error(error.message || "Failed to add comment");
            },
        })
    );

    const handleSubmit = async () => {
        if (!newComment.trim()) return;
        await createMutation.mutateAsync({
            body: newComment,
            workItemId,
        });
    };

    if (isLoading) return <div>Loading comments...</div>;

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                {(comments as unknown as any[])?.map((comment: any) => (
                    <div key={comment.id} className="flex space-x-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.user.avatarUrl} />
                            <AvatarFallback>
                                {comment.user.firstName[0]}
                                {comment.user.lastName[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">
                                    {comment.user.firstName} {comment.user.lastName}
                                </h4>
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                            </div>
                            <p className="text-sm text-foreground">{comment.body}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
                    className="min-h-[100px]"
                />
                <div className="flex justify-end">
                    <Button
                        onClick={handleSubmit}
                        disabled={!newComment.trim() || createMutation.isPending}
                    >
                        {createMutation.isPending ? "Posting..." : "Post Comment"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
