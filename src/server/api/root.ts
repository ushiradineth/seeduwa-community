import { createTRPCRouter } from "@/server/api/trpc";
import { memberRouter } from "./routers/member";
import { recordRouter } from "./routers/record";

export const appRouter = createTRPCRouter({
  member: memberRouter,
  record: recordRouter,
});

export type AppRouter = typeof appRouter;
