import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileIcon, Paperclip, Trash2 } from "lucide-react";

interface AttachmentListProps {
    workItemId: string;
}

export function AttachmentList({ workItemId }: AttachmentListProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const { data: attachments, isLoading } = useQuery(
        trpc.attachment.getByWorkItem.queryOptions({ workItemId })
    );

    const deleteMutation = useMutation(
        trpc.attachment.delete.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.attachment.getByWorkItem.queryFilter({ workItemId }));
                toast.success("Attachment deleted");
            },
            onError: (error: any) => {
                toast.error(error.message || "Failed to delete attachment");
            },
        })
    );

    // Mock upload function - in a real app, this would handle file selection and upload to S3/etc.
    const handleUpload = () => {
        toast.info("File upload functionality would be integrated here.");
    };

    if (isLoading) return <div>Loading attachments...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attachments ({(attachments as unknown as any[])?.length || 0})
                </h3>
                <Button variant="outline" size="sm" onClick={handleUpload}>
                    Upload
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {(attachments as unknown as any[])?.map((attachment: any) => (
                    <div
                        key={attachment.id}
                        className="flex items-center justify-between p-2 border rounded-md hover:bg-accent transition-colors"
                    >
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex flex-col overflow-hidden">
                                <a
                                    href={attachment.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium truncate hover:underline"
                                >
                                    {attachment.fileName}
                                </a>
                                <span className="text-xs text-muted-foreground">
                                    {attachment.fileType} • {formatBytes(attachment.fileSize)}
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteMutation.mutate({ id: attachment.id })}
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}

                {(attachments as any[])?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No attachments yet.
                    </p>
                )}
            </div>
        </div>
    );
}

// Simple formatBytes helper
function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
