import { TRPCError } from "@trpc/server";
import moment from "moment";
import { z } from "zod";

import { ITEMS_PER_PAGE, LANE_FILTER, MEMBERS_PAYMENT_FILTER_ENUM, YEARS } from "@/lib/consts";
import { commonAttribute, now } from "@/lib/utils";
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
      const commonAttributeType = commonAttribute(
        {
          name: exisitingMember[0].name,
          houseId: exisitingMember[0].houseId,
          lane: exisitingMember[0].lane,
          phoneNumber: exisitingMember[0].phoneNumber,
        },
        {
          name: input.Name,
          houseId: input.House,
          lane: input.Lane,
          phoneNumber: input.Number,
        },
      );

      ctx.log.info("Member already exists", { input, id: exisitingMember[0].id, commonAttribute: commonAttributeType });

      throw new TRPCError({
        message: `Member with this ${commonAttributeType} already exists`,
        code: "CONFLICT",
      });
    }

    try {
      const member = await ctx.prisma.member.create({
        data: {
          houseId: input.House,
          lane: input.Lane,
          name: input.Name,
          phoneNumber: input.Number,
        },
      });

      ctx.log.info("Member created", { member });

      return member;
    } catch (error) {
      ctx.log.error("Member not created", { input, error });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create member" });
    }
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    try {
      const member = await ctx.prisma.member.update({
        where: { id: input.id, active: true },
        data: {
          active: false,
          deletedAt: now(),
          payments: { updateMany: { where: { active: true }, data: { active: false, deletedAt: now() } } },
        },
      });

      ctx.log.info("Member deleted", { member });

      return member;
    } catch (error) {
      ctx.log.error("Member not deleted", { input, error });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete member" });
    }
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
        const commonAttributeType = commonAttribute(
          {
            name: exisitingMember[0].name,
            houseId: exisitingMember[0].houseId,
            lane: exisitingMember[0].lane,
            phoneNumber: exisitingMember[0].phoneNumber,
          },
          {
            name: input.name,
            houseId: input.houseId,
            lane: input.lane,
            phoneNumber: input.number,
          },
        );

        ctx.log.info("Member already exists", { input, id: exisitingMember[0].id, commonAttribute: commonAttributeType });

        throw new TRPCError({
          message: `Member with this ${commonAttributeType} already exists`,
          code: "CONFLICT",
        });
      }

      try {
        const member = await ctx.prisma.member.update({
          where: { id: input.id, active: true },
          data: { name: input.name, houseId: input.houseId, lane: input.lane, phoneNumber: input.number },
        });

        ctx.log.info("Member edited", { member });

        return member;
      } catch (error) {
        ctx.log.error("Member not edited", { input, error });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to edit member" });
      }
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.member.findFirst({ where: { id: input.id, active: true } });
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

  getMembers: protectedProcedure
    .input(
      z.object({
        search: z.string(),
        members: z.string(),
        months: z.string().array(),
        itemsPerPage: z.number().optional(),
        page: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const search = input.search ? input.search.split(" ").join(" <-> ") : "";
      const membersParam = String(input.members ?? MEMBERS_PAYMENT_FILTER_ENUM.All) as MEMBERS_PAYMENT_FILTER_ENUM;

      const months = [...input.months.map((month) => moment(month).startOf("month").utcOffset(0, true).toDate())];

      let paymentsFilter = {};

      const takePartial =
        membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Partial ? true : membersParam === MEMBERS_PAYMENT_FILTER_ENUM.All ? undefined : false;

      if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Paid || membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid) {
        paymentsFilter = {
          OR: [
            {
              payments: {
                some: {
                  active: true,
                  month: { in: months },
                  partial: false,
                },
              },
            },
            {
              payments: {
                none: {
                  active: true,
                  month: { in: months },
                  partial: false,
                },
              },
            },
          ],
        };
      } else if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Partial) {
        paymentsFilter = {
          AND: [
            {
              payments: {
                some: {
                  active: true,
                  month: { in: months },
                  partial: true,
                },
              },
            },
          ],
        };
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
                { ...paymentsFilter },
              ],
            }
          : { active: true, ...paymentsFilter };

      let members = await ctx.prisma.member.findMany({
        take: input.itemsPerPage ?? undefined,
        skip: input.page ? (Number(input.page) - 1) * (input.itemsPerPage ?? ITEMS_PER_PAGE) : undefined,
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
              month: { in: months },
              partial: takePartial,
            },
            select: { id: true, month: true, partial: true },
          },
        },

        orderBy: { lane: "asc" },
      });

      let count = await ctx.prisma.member.findMany({
        where,
        select: {
          payments: {
            where: {
              active: true,
              month: { in: months },
              partial: takePartial,
            },
            select: { id: true, month: true, partial: true },
          },
        },
      });

      if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid) {
        members = members.filter((member) => member.payments.length < months.length);
        count = count.filter((member) => member.payments.length < months.length);
      }

      if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Paid || membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Partial) {
        members = members.filter((member) => member.payments.length === months.length);
        count = count.filter((member) => member.payments.length === months.length);
      }

      const total = await ctx.prisma.member.count({ where: { active: true } });

      return {
        members: members.map((member) => ({
          ...member,
          payment: {
            paid: member.payments.length === months.length,
            partial: member.payments.length === months.length ? member.payments.some((payment) => payment.partial === true) : false,
          },
        })),
        membersParam,
        months: input.months,
        count: count.length,
        total,
      };
    }),

  getDashboard: protectedProcedure
    .input(
      z.object({
        search: z.string(),
        year: z.number(),
        lane: z.string(),
        itemsPerPage: z.number().optional(),
        page: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
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
        take: input.itemsPerPage ?? undefined,
        skip: input.page ? (Number(input.page) - 1) * (input.itemsPerPage ?? ITEMS_PER_PAGE) : undefined,
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
              partial: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const count = await ctx.prisma.member.count({
        where,
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
        count,
      };
    }),
});
