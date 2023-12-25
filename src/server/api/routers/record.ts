import { RecordType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import * as yup from "yup";
import { z } from "zod";

import { RECORD_TYPE } from "@/lib/consts";
import { now } from "@/lib/utils";
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
      try {
        const records = await ctx.prisma.record.createMany({
          data: [
            ...input.months.map((month) => {
              return {
                name: input.name,
                amount: input.amount,
                month,
                recordAt: input.recordDate,
                type: input.recordType === RecordType.Income.toString() ? RecordType.Income : RecordType.Expense,
              };
            }),
          ],
        });

        ctx.log.info("Record created", { input });

        return records;
      } catch (error) {
        ctx.log.error("Record not created", { input, error });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create record" });
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    try {
      const record = await ctx.prisma.record.update({
        where: { id: input.id, active: true },
        data: { active: false, deletedAt: now() },
      });

      ctx.log.info("Record deleted", { record });

      return record;
    } catch (error) {
      ctx.log.error("Record not deleted", { input, error });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete record" });
    }
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
      try {
        const record = await ctx.prisma.record.update({
          where: { id: input.id, active: true },
          data: {
            name: input.name,
            amount: input.amount,
            recordAt: input.recordDate,
            type: input.recordType === RecordType.Income.toString() ? RecordType.Income : RecordType.Expense,
          },
        });

        ctx.log.info("Record edited", { record });

        return record;
      } catch (error) {
        ctx.log.error("Record not edited", { input, error });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to edit record" });
      }
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.record.findFirst({
      where: { id: input.id, active: true },
    });
  }),
});
