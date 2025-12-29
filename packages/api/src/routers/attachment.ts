import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const attachmentRouter = router({
    getByWorkItem: protectedProcedure
        .input(z.object({ workItemId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.attachment.findMany({
                where: { workItemId: input.workItemId },
                orderBy: { createdAt: "desc" },
            });
        }),

    create: protectedProcedure
        .input(
            z.object({
                fileName: z.string(),
                fileType: z.string(),
                fileSize: z.number(),
                storagePath: z.string(),
                fileUrl: z.string(),
                workItemId: z.string(),
                uploadedBy: z.string(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.attachment.create({
                data: input,
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.prisma.attachment.delete({
                where: { id: input.id },
            });
        }),
});
