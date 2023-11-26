import moment from "moment";
import { z } from "zod";

import { MONTHS } from "@/lib/consts";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const recordRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        amount: z.number(),
        months: z.array(z.date()),
        recordDate: z.date(),
        name: z.string(),
      }),
    )
    .mutation(({ ctx, input }) => {
      input.months.forEach((month) => {
        void (async () => {
          await ctx.prisma.record.create({
            data: {
              name: input.name,
              amount: input.amount,
              month: moment(month).startOf("month").utcOffset(0, true).toDate(),
              recordAt: moment(input.recordDate).startOf("day").utcOffset(0, true).toDate(),
            },
            select: {
              recordAt: true,
            },
          });
        })();
      });
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return await ctx.prisma.record.update({ where: { id: input.id }, data: { active: false } });
  }),

  edit: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string(), amount: z.number(), recordDate: z.date() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.record.update({
        where: { id: input.id },
        data: { name: input.name, amount: input.amount, recordAt: moment(input.recordDate).utcOffset(0, true).toDate() },
      });
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.record.findFirst({
      where: { id: input.id, active: true },
    });
  }),

  getRecordsDocumentData: protectedProcedure
    .input(
      z.object({
        search: z.string(),
        month: z.string(),
        year: z.number(),
        type: z.union([z.literal("XSLX"), z.literal("PDF")]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const search = input.search ? input.search.split(" ").join(" <-> ") : "";
      const year = Number(input.year ?? new Date().getFullYear());
      const month = String(input.month ?? MONTHS[new Date().getMonth()]);
      const monthIndex = MONTHS.findIndex((value) => value === month);
      const recordDate = moment().year(year).month(monthIndex).startOf("month").utcOffset(0, true).toDate();

      const where =
        search !== ""
          ? { AND: [{ month: { equals: recordDate } }, { active: true }, { OR: [{ name: { search: search } }] }] }
          : { AND: [{ month: { equals: recordDate } }, { active: true }] };

      const records = await ctx.prisma.record.findMany({
        where,
        select: {
          id: true,
          month: true,
          name: true,
          amount: true,
          recordAt: true,
        },
        orderBy: { month: "desc" },
      });

      return {
        records: records.map((record) => ({
          ...record,
          month: record.month.toDateString(),
        })),
        year,
        month,
      };
    }),
});
