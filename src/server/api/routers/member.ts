import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { CreateMemberSchema } from "@/lib/validators";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { commonAttribute } from "@/lib/utils";

export const memberRouter = createTRPCRouter({
  create: protectedProcedure.input(CreateMemberSchema).mutation(async ({ ctx, input }) => {
    const exisitingMember = await ctx.prisma.member.findMany({
      where: {
        AND: [{ active: true }, { OR: [{ houseId: input.House }, { name: input.Name }, { phoneNumber: input.Number }] }],
      },
    });

    if (exisitingMember[0]) {
      throw new TRPCError({
        message: `Member with this ${commonAttribute(
          {
            name: exisitingMember[0]?.name,
            houseId: exisitingMember[0]?.houseId,
            lane: exisitingMember[0]?.lane,
            phoneNumber: exisitingMember[0]?.phoneNumber,
          },
          {
            name: input.Name,
            houseId: input.House,
            lane: input.Lane,
            phoneNumber: input.Number,
          },
        )}
         already exists`,
        code: "CONFLICT",
      });
    }

    return await ctx.prisma.member.create({
      data: {
        houseId: input.House,
        lane: input.Lane,
        name: input.Name,
        phoneNumber: input.Number,
      },
    });
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.prisma.payment.updateMany({ where: { memberId: input.id }, data: { active: false } });
    return await ctx.prisma.member.update({ where: { id: input.id }, data: { active: false } });
  }),

  edit: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string(), houseId: z.string(), lane: z.string(), number: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const exisitingMember = await ctx.prisma.member.findMany({
        where: {
          AND: [
            { id: { not: input.id } },
            { active: true },
            { OR: [{ houseId: input.houseId }, { name: input.name }, { phoneNumber: input.number }] },
          ],
        },
      });

      if (exisitingMember[0]) {
        throw new TRPCError({
          message: `Member with this ${commonAttribute(
            {
              name: exisitingMember[0]?.name,
              houseId: exisitingMember[0]?.houseId,
              lane: exisitingMember[0]?.lane,
              phoneNumber: exisitingMember[0]?.phoneNumber,
            },
            {
              name: input.name,
              houseId: input.houseId,
              lane: input.lane,
              phoneNumber: input.number,
            },
          )} already exists`,
          code: "CONFLICT",
        });
      }

      return await ctx.prisma.member.update({
        where: { id: input.id },
        data: { name: input.name, houseId: input.houseId, lane: input.lane, phoneNumber: input.number },
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
