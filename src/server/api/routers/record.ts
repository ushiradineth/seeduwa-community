import moment from "moment";
import { z } from "zod";

import { MONTHS } from "@/lib/consts";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { messageRouter } from "./message";

export const recordRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ memberId: z.string(), amount: z.number(), months: z.array(z.date()), paymentDate: z.date(), notify: z.boolean() }))
    .mutation(({ ctx, input }) => {
      input.months.forEach((month) => {
        void (async () => {
          const exisitingRecord = await ctx.prisma.payment.findMany({
            where: { memberId: input.memberId, date: moment(month).utcOffset(0, true).format(), active: true },
          });

          console.log(input);

          console.log(exisitingRecord);

          if (exisitingRecord.length === 0) {
            const payment = await ctx.prisma.payment.create({
              data: {
                amount: input.amount,
                memberId: input.memberId,
                date: moment(month).utcOffset(0, true).format(),
                createdAt: input.paymentDate,
              },
              select: {
                date: true,
                member: {
                  select: {
                    phoneNumber: true,
                  },
                },
              },
            });

            if (input.notify) {
              const message = messageRouter.createCaller({ ...ctx });
              await message.send({
                recipient: Number(payment.member.phoneNumber),
                text: `Your payment of ${input.amount} LKR for ${MONTHS[Number(payment.date.getMonth())]} ${Number(
                  payment.date.getFullYear(),
                )} has been recieved, Thank you!`,
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
        data: { amount: input.amount, createdAt: moment(input.paymentDate).utcOffset(0, true).format() },
      });
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.payment.findFirst({
      where: { id: input.id, active: true },
      include: { member: true },
    });
  }),
});
