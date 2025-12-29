import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@my-better-t-app/api/routers/index";

export const { TRPCProvider, useTRPC, useTRPCClient } =
	createTRPCContext<AppRouter>();
