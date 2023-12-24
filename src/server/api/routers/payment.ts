import { TRPCError } from "@trpc/server";
import { log } from "next-axiom";
import { z } from "zod";

import { MONTHS } from "@/lib/consts";
import { now } from "@/lib/utils";
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
      const existingPayments = await ctx.prisma.payment.findMany({
        where: { memberId: input.memberId, member: { active: true }, month: { in: input.months }, active: true },
      });

      if (existingPayments[0]) {
        log.info("Payment already exists", { input, id: existingPayments[0].id, month: existingPayments[0].month });

        throw new TRPCError({
          code: "CONFLICT",
          message: `Payment for ${MONTHS[existingPayments[0].month.getMonth()]} ${existingPayments[0].month.getFullYear()} Already Exists`,
        });
      }

      try {
        const payments = await ctx.prisma.payment.createMany({
          data: [
            ...input.months.map((month) => {
              return {
                amount: input.amount,
                memberId: input.memberId,
                month,
                paymentAt: input.paymentDate,
              };
            }),
          ],
          skipDuplicates: true,
        });

        log.info("Payment created", { input });

        if (input.notify) {
          const member = await ctx.prisma.member.findUnique({ where: { id: input.memberId } });
          member?.phoneNumber && sendMessage(member.phoneNumber, input.text);
        }

        return payments;
      } catch (error) {
        log.error("Payment not created", { input, error });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create payment" });
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    try {
      const payment = await ctx.prisma.payment.update({
        where: { id: input.id, active: true },
        data: { active: false, deletedAt: now() },
      });

      log.info("Payment deleted", { payment });

      return payment;
    } catch (error) {
      log.error("Payment not deleted", { input, error });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete payment" });
    }
  }),

  edit: protectedProcedure
    .input(z.object({ id: z.string(), amount: z.number(), paymentDate: z.date() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const payment = await ctx.prisma.payment.update({
          where: { id: input.id, active: true },
          data: { amount: input.amount, paymentAt: input.paymentDate },
        });

        log.info("Payment edited", { payment });

        return payment;
      } catch (error) {
        log.error("Payment not edited", { input, error });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to edit payment" });
      }
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.payment.findFirst({
      where: { id: input.id, active: true },
      include: { member: true },
    });
  }),
});
