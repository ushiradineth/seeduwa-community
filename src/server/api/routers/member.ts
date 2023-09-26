import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { CreateMemberSchema } from "@/lib/validators";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const memberRouter = createTRPCRouter({
  create: protectedProcedure.input(CreateMemberSchema).mutation(async ({ ctx, input }) => {
    const exisitingMember = await ctx.prisma.member.findMany({
      where: { AND: [{ active: true }, { OR: [{ houseId: input.House }, { name: input.Name }] }] },
    });

    if (exisitingMember.length > 0) {
      throw new TRPCError({
        message: `Member with this ${
          exisitingMember[0]?.name === input.Name
            ? "name"
            : exisitingMember[0]?.houseId === input.House && exisitingMember[0]?.lane === input.Lane && "address"
        } already exists`,
        code: "CONFLICT",
      });
    }

    return await ctx.prisma.member.create({
      data: {
        houseId: input.House,
        lane: input.Lane,
        name: input.Name,
      },
    });
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.prisma.payment.updateMany({ where: { memberId: input.id }, data: { active: false } });
    return await ctx.prisma.member.update({ where: { id: input.id }, data: { active: false } });
  }),

  edit: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string(), houseId: z.string(), lane: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.member.update({
        where: { id: input.id },
        data: { name: input.name, houseId: input.houseId, lane: input.lane },
      });
    }),

  getAllByLane: protectedProcedure.input(z.object({ lane: z.string() })).mutation(async ({ ctx, input }) => {
    return await ctx.prisma.member.findMany({
      where: {
        lane: input.lane,
        active: true,
      },
      include: {
        payments: {
          select: { date: true },
          where: { active: true },
        },
      },
    });
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.member.findFirst({ where: { id: input.id, active: true } });
  }),
});
