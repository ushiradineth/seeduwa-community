import moment from "moment";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { messageRouter } from "./message";

export const paymentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        memberId: z.string(),
        amount: z.number(),
        months: z.array(z.date()),
        paymentDate: z.date(),
        notify: z.boolean(),
        text: z.string(),
      }),
    )
    .mutation(({ ctx, input }) => {
      let phoneNumber = "";

      input.months.forEach((month, index) => {
        void (async () => {
          const paymentMonth = moment(month).startOf("month").utcOffset(0, true).toDate();
          const exisitingPayment = await ctx.prisma.payment.findMany({
            where: { memberId: input.memberId, month: paymentMonth, active: true },
          });

          if (exisitingPayment.length === 0) {
            const payment = await ctx.prisma.payment.create({
              data: {
                amount: input.amount,
                memberId: input.memberId,
                month: paymentMonth,
                paymentAt: moment(input.paymentDate).startOf("day").utcOffset(0, true).toDate(),
              },
              select: {
                member: {
                  select: {
                    phoneNumber: true,
                  },
                },
              },
            });

            phoneNumber = payment.member.phoneNumber;
          }

          if (index === input.months.length - 1) {
            if (input.notify) {
              const message = messageRouter.createCaller({ ...ctx });
              await message.send({
                recipient: phoneNumber,
                text: input.text,
              });
            }
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
      return await ctx.prisma.payment.update({
        where: { id: input.id },
        data: { amount: input.amount, paymentAt: moment(input.paymentDate).utcOffset(0, true).toDate() },
      });
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.payment.findFirst({
      where: { id: input.id, active: true },
      include: { member: true },
    });
  }),
});
