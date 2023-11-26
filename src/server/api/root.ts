import { createTRPCRouter } from "@/server/api/trpc";
import { expenseRouter } from "./routers/expense";
import { memberRouter } from "./routers/member";
import { messageRouter } from "./routers/message";
import { paymentRouter } from "./routers/payment";

export const appRouter = createTRPCRouter({
  member: memberRouter,
  payment: paymentRouter,
  message: messageRouter,
  expense: expenseRouter,
});

export type AppRouter = typeof appRouter;
