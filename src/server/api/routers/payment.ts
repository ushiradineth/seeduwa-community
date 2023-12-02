import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sendMessage } from "./message";

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
    .mutation(async ({ ctx, input }) => {
      let phoneNumber = "";
      const createdPayments = [];

      for (const month of input.months) {
        try {
          const existingPayments = await ctx.prisma.payment.findMany({
            where: { memberId: input.memberId, month, active: true },
          });

          if (existingPayments.length === 0) {
            const createdPayment = await ctx.prisma.payment.create({
              data: {
                amount: input.amount,
                memberId: input.memberId,
                month,
                paymentAt: input.paymentDate,
              },
              select: {
                member: {
                  select: {
                    phoneNumber: true,
                  },
                },
              },
            });

            createdPayments.push(createdPayment);

            phoneNumber = createdPayment.member.phoneNumber;
          }
        } catch (error) {
          console.error(`Error in database operation: ${error}`);
          throw new Error("Failed to process payment.");
        }
      }

      if (input.notify && phoneNumber) {
        sendMessage(phoneNumber, input.text);
      }

      return createdPayments;
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return await ctx.prisma.payment.update({ where: { id: input.id }, data: { active: false } });
  }),

  edit: protectedProcedure
    .input(z.object({ id: z.string(), amount: z.number(), paymentDate: z.date() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.payment.update({
        where: { id: input.id },
        data: { amount: input.amount, paymentAt: input.paymentDate },
      });
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.payment.findFirst({
      where: { id: input.id, active: true },
      include: { member: true },
    });
  }),
});
