import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { MONTHS } from "@/lib/consts";
import { now, removeTimezone } from "@/lib/utils";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sendMessage } from "./message";

export const paymentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        memberId: z.string(),
        amount: z.number(),
        partial: z.boolean(),
        months: z.array(z.date()),
        paymentDate: z.date(),
        notify: z.boolean(),
        text: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingPayments = await ctx.prisma.payment.findMany({
        where: { memberId: input.memberId, member: { active: true }, month: { in: input.months }, active: true },
      });

      if (existingPayments[0]) {
        ctx.log.info("Payment already exists", { input, id: existingPayments[0].id, month: existingPayments[0].month });

        throw new TRPCError({
          code: "CONFLICT",
          message: `Payment for ${MONTHS[existingPayments[0].month.getMonth()]} ${existingPayments[0].month.getFullYear()} Already Exists`,
        });
      }

      try {
        const [payments, _] = await ctx.prisma.$transaction([
          ctx.prisma.payment.createMany({
            data: [
              ...input.months.map((month) => {
                return {
                  amount: input.amount,
                  memberId: input.memberId,
                  month,
                  paymentAt: input.paymentDate,
                  partial: input.partial,
                };
              }),
            ],
            skipDuplicates: true,
          }),

          ctx.prisma.member.update({
            where: { id: input.memberId },
            data: { lastPaymentAt: new Date() },
          }),
        ]);

        ctx.log.info("Payment created", { input });

        let response;

        if (input.notify) {
          const member = await ctx.prisma.member.findUnique({ where: { id: input.memberId } });
          if (member?.phoneNumber) {
            response = await sendMessage(member.phoneNumber, input.text, ctx.log);
          }
        }

        return { payments, response };
      } catch (error) {
        ctx.log.error("Payment not created", { input, error });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create payment" });
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    try {
      const payment = await ctx.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.update({
          where: { id: input.id, active: true },
          data: { active: false, deletedAt: now() },
        });

        await tx.member.update({
          where: { id: payment.memberId },
          data: { lastPaymentAt: new Date() },
        });

        return payment;
      });

      ctx.log.info("Payment deleted", { payment });

      return payment;
    } catch (error) {
      ctx.log.error("Payment not deleted", { input, error });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete payment" });
    }
  }),

  edit: protectedProcedure
    .input(z.object({ id: z.string(), amount: z.number(), paymentDate: z.date(), partial: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const payment = await ctx.prisma.$transaction(async (tx) => {
          const payment = await tx.payment.update({
            where: { id: input.id, active: true },
            data: { amount: input.amount, paymentAt: input.paymentDate, partial: input.partial },
          });

          await tx.member.update({
            where: { id: payment.memberId },
            data: { lastPaymentAt: new Date() },
          });

          return payment;
        });

        ctx.log.info("Payment edited", { payment });

        return payment;
      } catch (error) {
        ctx.log.error("Payment not edited", { input, error });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to edit payment" });
      }
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.payment.findFirst({
      where: { id: input.id, active: true },
      include: { member: true },
    });
  }),

  getPayments: protectedProcedure
    .input(z.object({ year: z.number(), month: z.string(), search: z.string() }))
    .query(async ({ ctx, input }) => {
      const monthIndex = MONTHS.findIndex((value) => value === input.month);
      const recordDate = removeTimezone().year(input.year).month(monthIndex);
      const paymentAt = { gte: recordDate.startOf("month").toDate(), lte: recordDate.endOf("month").toDate() };
      const where =
        input.search !== ""
          ? {
              AND: [
                { paymentAt },
                { active: true },
                { OR: [{ member: { name: { search: input.search }, houseId: { search: input.search }, lane: { search: input.search } } }] },
              ],
            }
          : { AND: [{ paymentAt }, { active: true }] };

      return {
        year: input.year,
        month: input.month,
        payments: await ctx.prisma.payment.findMany({
          where,
          select: {
            id: true,
            amount: true,
            month: true,
            paymentAt: true,
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
      };
    }),
});
