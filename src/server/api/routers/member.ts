import { TRPCError } from "@trpc/server";
import moment from "moment";
import { z } from "zod";

import { LANE_FILTER, MEMBERS_PAYMENT_FILTER_ENUM, MONTHS, YEARS } from "@/lib/consts";
import { commonAttribute } from "@/lib/utils";
import { CreateMemberSchema } from "@/lib/validators";
import { createTRPCRouter, protectedProcedure } from "../trpc";

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
          select: { month: true },
          where: { active: true },
        },
      },
    });
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.member.findFirst({ where: { id: input.id, active: true } });
  }),

  getByHouseID: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return await ctx.prisma.member.findFirst({
      where: { houseId: input.id, active: true },
      include: {
        payments: {
          select: { month: true },
          where: { active: true },
        },
      },
    });
  }),

  getMemberDocumentData: protectedProcedure
    .input(
      z.object({
        search: z.string(),
        members: z.string(),
        year: z.number(),
        month: z.string(),
        type: z.union([z.literal("XSLX"), z.literal("PDF")]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const search = input.search ? input.search.split(" ").join(" <-> ") : "";
      const membersParam = String(input.members ?? MEMBERS_PAYMENT_FILTER_ENUM.All) as MEMBERS_PAYMENT_FILTER_ENUM;
      const year = Number(input.year ?? new Date().getFullYear());
      const month = String(input.month ?? MONTHS[new Date().getMonth()]);
      let membersFilter = {};
      const monthIndex = MONTHS.findIndex((value) => value === month);
      const paymentMonth = moment().year(year).month(monthIndex).startOf("month").utcOffset(0, true).toDate();

      if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Paid) {
        membersFilter = { some: { active: true, month: { equals: paymentMonth } } };
      } else if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid) {
        membersFilter = { none: { active: true, month: { equals: paymentMonth } } };
      }

      const where =
        search !== ""
          ? {
              AND: [
                { active: true },
                {
                  OR: [
                    { name: { search: search } },
                    { phoneNumber: { search: search } },
                    { houseId: { search: search } },
                    { lane: { search: search } },
                  ],
                },
                { payments: { ...membersFilter } },
              ],
            }
          : { active: true, payments: { ...membersFilter } };

      const members = await ctx.prisma.member.findMany({
        where,
        select: {
          id: true,
          phoneNumber: true,
          houseId: true,
          name: true,
          lane: true,
          payments: {
            where: {
              active: true,
              month: { equals: paymentMonth },
            },
            select: { id: true, month: true },
          },
        },

        orderBy: { lane: "asc" },
      });

      return {
        members: members.map((member) => ({
          ...member,
          payments: {},
          payment: member.payments.length > 0,
        })),
        membersParam,
        month,
        year,
      };
    }),

  getDashboardDocumentData: protectedProcedure
    .input(
      z.object({
        search: z.string(),
        year: z.number(),
        lane: z.string(),
        type: z.union([z.literal("XSLX"), z.literal("PDF")]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const search = input.search ? input.search.split(" ").join(" | ") : "";
      const year = YEARS.includes(input.year) ? input.year : new Date().getFullYear();
      const lane = LANE_FILTER.includes(String(input.lane)) ? String(input.lane) : LANE_FILTER[0]!;

      const where =
        search !== ""
          ? {
              AND: [
                { active: true },
                {
                  OR: [
                    { name: { search: search } },
                    { phoneNumber: { search: search } },
                    { houseId: { search: search } },
                    { lane: { search: search } },
                  ],
                },
                { lane: lane !== LANE_FILTER[0] ? lane : undefined },
              ],
            }
          : {
              AND: [{ active: true }, { lane: lane !== LANE_FILTER[0] ? lane : undefined }],
            };

      const members = await ctx.prisma.member.findMany({
        where,
        select: {
          id: true,
          houseId: true,
          name: true,
          lane: true,
          payments: {
            where: {
              active: true,
              month: {
                gte: moment().year(year).startOf("year").utcOffset(0, true).toDate(),
                lte: moment().year(year).endOf("year").utcOffset(0, true).toDate(),
              },
            },
            select: {
              id: true,
              month: true,
              amount: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return {
        members: members.map((member) => ({
          ...member,
          payments: member.payments.map((payment) => {
            return { ...payment, month: payment.month.toISOString() };
          }),
        })),
        year,
        lane,
      };
    }),
});
