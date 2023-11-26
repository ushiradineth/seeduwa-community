import { createTRPCRouter } from "@/server/api/trpc";
import { memberRouter } from "./routers/member";
import { messageRouter } from "./routers/message";
import { paymentRouter } from "./routers/payment";
import { recordRouter } from "./routers/record";

export const appRouter = createTRPCRouter({
  member: memberRouter,
  payment: paymentRouter,
  message: messageRouter,
  record: recordRouter,
});

export type AppRouter = typeof appRouter;
