import { createTRPCRouter } from "@/server/api/trpc";
import { expenseRouter } from "./routers/expense";
import { memberRouter } from "./routers/member";
import { messageRouter } from "./routers/message";
import { recordRouter } from "./routers/record";

export const appRouter = createTRPCRouter({
  member: memberRouter,
  record: recordRouter,
  message: messageRouter,
  expense: expenseRouter,
});

export type AppRouter = typeof appRouter;
