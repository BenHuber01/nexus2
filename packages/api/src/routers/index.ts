import { router, publicProcedure } from "../index";

import { organizationRouter } from "./organization";
import { projectRouter } from "./project";
import { workItemRouter } from "./workItem";
import { teamRouter } from "./team";
import { sprintRouter } from "./sprint";
import { boardRouter } from "./board";
import { portfolioRouter } from "./portfolio";
import { milestoneRouter } from "./milestone";
import { retrospectiveRouter } from "./retrospective";
import { timeLogRouter } from "./timeLog";
import { commentRouter } from "./comment";
import { attachmentRouter } from "./attachment";
import { tagRouter } from "./tag";
import { dependencyRouter } from "./dependency";
import { workItemStateRouter } from "./workItemState";
import { componentRouter } from "./component";
import { teamMembershipRouter } from "./teamMembership";
import { organizationMembershipRouter } from "./organizationMembership";
import { dashboardRouter } from "./dashboard";
import { activityRouter } from "./activity";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => true),
	organization: organizationRouter,
	project: projectRouter,
	workItem: workItemRouter,
	team: teamRouter,
	sprint: sprintRouter,
	board: boardRouter,
	portfolio: portfolioRouter,
	milestone: milestoneRouter,
	retrospective: retrospectiveRouter,
	timeLog: timeLogRouter,
	comment: commentRouter,
	attachment: attachmentRouter,
	tag: tagRouter,
	dependency: dependencyRouter,
	workItemState: workItemStateRouter,
	component: componentRouter,
	teamMembership: teamMembershipRouter,
	organizationMembership: organizationMembershipRouter,
	dashboard: dashboardRouter,
	activity: activityRouter,
});

export type AppRouter = typeof appRouter;
