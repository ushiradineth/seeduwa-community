import moment from "moment";
import { z } from "zod";

import { MONTHS } from "@/lib/consts";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const expenseRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        amount: z.number(),
        months: z.array(z.date()),
        expenseDate: z.date(),
        name: z.string(),
      }),
    )
    .mutation(({ ctx, input }) => {
      input.months.forEach((month) => {
        void (async () => {
          await ctx.prisma.expense.create({
            data: {
              name: input.name,
              amount: input.amount,
              month: moment(month).startOf("month").utcOffset(0, true).toDate(),
              expenseAt: moment(input.expenseDate).startOf("day").utcOffset(0, true).toDate(),
            },
            select: {
              expenseAt: true,
            },
          });
        })();
      });
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return await ctx.prisma.expense.update({ where: { id: input.id }, data: { active: false } });
  }),

  edit: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string(), amount: z.number(), expenseDate: z.date() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.expense.update({
        where: { id: input.id },
        data: { name: input.name, amount: input.amount, expenseAt: moment(input.expenseDate).utcOffset(0, true).toDate() },
      });
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.expense.findFirst({
      where: { id: input.id, active: true },
    });
  }),

  getExpensesDocumentData: protectedProcedure
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
      const expenseDate = moment().year(year).month(monthIndex).startOf("month").utcOffset(0, true).toDate();

      const where =
        search !== ""
          ? { AND: [{ month: { equals: expenseDate } }, { active: true }, { OR: [{ name: { search: search } }] }] }
          : { AND: [{ month: { equals: expenseDate } }, { active: true }] };

      const expenses = await ctx.prisma.expense.findMany({
        where,
        select: {
          id: true,
          month: true,
          name: true,
          amount: true,
          expenseAt: true,
        },
        orderBy: { month: "desc" },
      });

      return {
        expenses: expenses.map((expense) => ({
          ...expense,
          month: expense.month.toDateString(),
        })),
        year,
        month,
      };
    }),
});
