import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const recordRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ memberId: z.string(), amount: z.number(), months: z.array(z.date()), paymentDate: z.date() }))
    .mutation(({ ctx, input }) => {
      input.months.forEach((month) => {
        void (async () => {
          const exisitingRecord = await ctx.prisma.payment.findMany({ where: { memberId: input.memberId, date: month, active: true } });

          if (exisitingRecord.length === 0) {
            await ctx.prisma.payment.create({
              data: {
                amount: input.amount,
                memberId: input.memberId,
                date: month,
                createdAt: input.paymentDate,
              },
            });
          }
        })();
      });
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return await ctx.prisma.payment.update({ where: { id: input.id }, data: { active: false } });
  }),

  edit: protectedProcedure
    .input(z.object({ id: z.string(), amount: z.number(), paymentDate: z.date() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.payment.update({ where: { id: input.id }, data: { amount: input.amount, createdAt: input.paymentDate } });
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.payment.findFirst({
      where: { id: input.id, active: true },
      include: { member: true },
    });
  }),
});
