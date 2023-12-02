import { RecordType } from "@prisma/client";
import moment from "moment";
import * as yup from "yup";
import { z } from "zod";

import { MONTHS, RECORD_TYPE } from "@/lib/consts";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const recordRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      yup
        .object({
          amount: yup.number().required(),
          months: yup.array(yup.date().required()).required(),
          recordDate: yup.date().required(),
          name: yup.string().required(),
          recordType: yup.string().oneOf(RECORD_TYPE, `Record Type has to be either Income or Expense`).required("Record Type is required"),
        })
        .required(),
    )
    .mutation(async ({ ctx, input }) => {
      const createdRecords = [];

      for (const month of input.months) {
        const record = await ctx.prisma.record.create({
          data: {
            name: input.name,
            amount: input.amount,
            month,
            recordAt: input.recordDate,
            type:
              input.recordType === RecordType.Income.toString()
                ? RecordType.Income
                : input.recordType === RecordType.Expense.toString()
                ? RecordType.Expense
                : undefined,
          },
          select: {
            recordAt: true,
          },
        });

        createdRecords.push(record);
      }

      return createdRecords;
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return await ctx.prisma.record.update({ where: { id: input.id }, data: { active: false } });
  }),

  edit: protectedProcedure
    .input(
      yup
        .object({
          id: yup.string().required(),
          name: yup.string().required(),
          amount: yup.number().required(),
          recordDate: yup.date().required(),
          recordType: yup.string().oneOf(RECORD_TYPE, `Record Type has to be either Income or Expense`).required("Record Type is required"),
        })
        .required(),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.record.update({
        where: { id: input.id },
        data: {
          name: input.name,
          amount: input.amount,
          recordAt: input.recordDate,
          type:
            input.recordType === RecordType.Income.toString()
              ? RecordType.Income
              : input.recordType === RecordType.Expense.toString()
              ? RecordType.Expense
              : undefined,
        },
      });
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.record.findFirst({
      where: { id: input.id, active: true },
    });
  }),

  getRecordsDocumentData: protectedProcedure
    .input(
      yup
        .object({
          search: yup.string(),
          month: yup.string(),
          year: yup.number(),
          type: yup.string().oneOf(["XSLX", "PDF"]).required(),
        })
        .required(),
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

      const [records, income, expense, previousPayments, currentPayments] = await ctx.prisma.$transaction([
        ctx.prisma.record.findMany({
          where,
          select: {
            id: true,
            createdAt: true,
            recordAt: true,
            month: true,
            name: true,
            amount: true,
            type: true,
          },
          orderBy: { recordAt: "asc" },
        }),
        ctx.prisma.record.aggregate({
          where: {
            month: {
              lt: recordDate,
            },
            type: "Income",
            active: true,
            OR: [{ name: { contains: search } }],
          },
          _sum: {
            amount: true,
          },
        }),
        ctx.prisma.record.aggregate({
          where: {
            month: {
              lt: recordDate,
            },
            type: "Expense",
            active: true,
            OR: [{ name: { contains: search } }],
          },
          _sum: {
            amount: true,
          },
        }),
        ctx.prisma.payment.aggregate({
          where: {
            month: {
              lt: recordDate,
            },
            active: true,
          },
          _sum: {
            amount: true,
          },
        }),
        ctx.prisma.payment.aggregate({
          where: {
            month: {
              equals: recordDate,
            },
            active: true,
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      const balance = (income._sum.amount ?? 0) + (previousPayments._sum.amount ?? 0) - (expense._sum.amount ?? 0);

      return {
        records: records.map((record) => ({
          ...record,
          month: record.month.toDateString(),
        })),
        year,
        month,
        balance: Number(balance),
        currentPayments: currentPayments._sum.amount ?? 0,
      };
    }),
});
