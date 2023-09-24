import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const recordRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ memberId: z.string(), amount: z.number(), date: z.date() }))
    .mutation(async ({ ctx, input }) => {
      const exisitingRecord = await ctx.prisma.payment.findMany({ where: { memberId: input.memberId, date: input.date, active: true } });

      if (exisitingRecord.length !== 0) {
        throw new TRPCError({ message: "Record already exists", code: "CONFLICT" });
      }

      return await ctx.prisma.payment.create({
        data: input,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return await ctx.prisma.payment.update({ where: { id: input.id }, data: { active: false } });
  }),

  edit: protectedProcedure.input(z.object({ id: z.string(), amount: z.number() })).mutation(async ({ ctx, input }) => {
    return await ctx.prisma.payment.update({ where: { id: input.id }, data: { amount: input.amount } });
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.payment.findFirst({ where: { id: input.id }, include: { member: true } });
  }),
});
