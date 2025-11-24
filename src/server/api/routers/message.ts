import { type Logger } from "next-axiom";
import { parsePhoneNumber } from "react-phone-number-input";
import { z } from "zod";

import { env } from "@/env.mjs";
import { MEMBERS_PAYMENT_FILTER_ENUM } from "@/lib/consts";
import { removeTimezone } from "@/lib/utils";
import { processBroadcastJob } from "@/server/jobs/broadcastProcessor";
import { createTRPCRouter, protectedProcedure } from "../trpc";

type SendMessageResult = {
  success: boolean;
  error?: string;
};

// Mock SMS gateway for development
async function sendMessageMock(recipient: string, text: string, log: Logger): Promise<SendMessageResult> {
  // Random delay between 2-10 seconds to simulate network latency
  const delay = Math.floor(Math.random() * 8000) + 2000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // 20% chance of random failure
  const shouldFail = Math.random() < 0.2;

  if (shouldFail) {
    const errors = [
      "Network timeout",
      "SMS Gateway temporarily unavailable",
      "Invalid phone number format",
      "Recipient opted out",
      "Rate limit exceeded",
    ];
    const error = errors[Math.floor(Math.random() * errors.length)]!;

    log.warn("Mock SMS failed", { recipient, error, delay });
    return { success: false, error };
  }

  log.info("Mock SMS sent successfully", { recipient, text: text.substring(0, 50), delay });
  return { success: true };
}

export async function sendMessage(recipient: string, text: string, log: Logger): Promise<SendMessageResult> {
  // Use mock in development
  if (process.env.NODE_ENV === "development") {
    return sendMessageMock(recipient, text, log);
  }

  if (recipient === "") {
    const error = "Empty phone number";
    log.error("Message not sent: Empty phone number", { message: text, receiver: recipient, error });
    return { success: false, error };
  }

  const phoneNumber = parsePhoneNumber(recipient);
  if (phoneNumber && phoneNumber.country !== "LK") {
    const error = "Phone number not in Sri Lanka";
    log.error("Message not sent: Invalid country", {
      message: text,
      receiver: recipient,
      country: phoneNumber.country,
      error,
    });
    return { success: false, error };
  }

  // Remove country code (+94) for API - it only accepts local format
  const localNumber = phoneNumber?.nationalNumber ?? recipient.replace(/^\+94/, "0");

  const formData = new URLSearchParams();
  formData.append("user_id", env.SMS_USER_ID);
  formData.append("api_key", env.SMS_API_KEY);
  formData.append("sender_id", env.SMS_SENDER_ID);
  formData.append("to", localNumber);
  formData.append("message", text);

  try {
    const response = await fetch("https://sagesms.com/API/Sms_api/send_sms", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = `SMS Gateway HTTP error: ${response.status} ${response.statusText}`;
      log.error("Message not sent: HTTP error", {
        message: text,
        receiver: recipient,
        localNumber,
        httpStatus: response.status,
        httpStatusText: response.statusText,
        error,
      });
      return { success: false, error };
    }

    const data = await response.json();

    if (data.status === "error" || data.msg_id === "no") {
      const errorMsg = data.message || "Unknown SMS Gateway error";
      const error = `SMS Gateway failure: ${errorMsg}`;
      log.error("Message not sent: Gateway rejected", {
        message: text,
        receiver: recipient,
        localNumber,
        gatewayResponse: data,
        error,
      });
      return { success: false, error };
    }

    log.info("Message sent successfully", {
      message: text,
      receiver: recipient,
      localNumber,
      gatewayResponse: data,
    });
    return { success: true };
  } catch (error) {
    const errorMsg = `SMS Gateway request failed: ${error instanceof Error ? error.message : String(error)}`;
    log.error("Message not sent: Network/Request error", {
      message: text,
      receiver: recipient,
      localNumber,
      error: errorMsg,
      exception: error,
    });
    return { success: false, error: errorMsg };
  }
}

export const messageRouter = createTRPCRouter({
  broadcast: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        members: z.string().optional(),
        months: z.string().array().optional(),
        search: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Create a broadcast job instead of processing synchronously
      const job = await ctx.prisma.broadcastJob.create({
        data: {
          message: input.text,
          membersFilter: input.members,
          monthsFilter: input.months ? JSON.stringify(input.months) : null,
          searchFilter: input.search,
          status: "QUEUED",
        },
      });

      ctx.log.info("Broadcast job queued", { jobId: job.id });

      // Process the job asynchronously (fire and forget)
      processBroadcastJob(job.id, ctx.prisma, ctx.log).catch((error) => {
        ctx.log.error("Failed to process broadcast job", {
          error,
          jobId: job.id,
        });
      });

      return { jobId: job.id };
    }),

  getBroadcastJobStatus: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const job = await ctx.prisma.broadcastJob.findUnique({
        where: { id: input.jobId },
      });

      if (!job) {
        throw new Error("Job not found");
      }

      // Auto-retry: if job stuck in QUEUED for >30 seconds, retry processing
      if (job.status === "QUEUED") {
        const secondsSinceCreated = (Date.now() - job.createdAt.getTime()) / 1000;

        if (secondsSinceCreated > 30) {
          ctx.log.warn("Job stuck in QUEUED, auto-retrying", {
            jobId: job.id,
            secondsSinceCreated,
          });

          // Fire and forget retry
          processBroadcastJob(job.id, ctx.prisma, ctx.log).catch((error) => {
            ctx.log.error("Auto-retry failed", { error, jobId: job.id });
          });
        }
      }

      return {
        id: job.id,
        status: job.status,
        totalRecipients: job.totalRecipients,
        processedCount: job.processedCount,
        successCount: job.successCount,
        failedCount: job.failedCount,
        results: job.results ? (JSON.parse(job.results) as { name: string; number: string; status: boolean; error?: string }[]) : null,
        error: job.error,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      };
    }),

  getRecipientCount: protectedProcedure
    .input(
      z.object({
        members: z.string().optional(),
        months: z.string().array().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      // Build filter conditions (same logic as broadcast)
      const search = input.search ? input.search.split(" ").filter(Boolean).join(" & ") : "";
      const membersParam = String(input.members ?? MEMBERS_PAYMENT_FILTER_ENUM.All) as MEMBERS_PAYMENT_FILTER_ENUM;
      const months = input.months ? [...input.months.map((month) => removeTimezone(month).startOf("month").toDate())] : [];

      let paymentsFilter = {};

      if (months.length > 0) {
        if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Paid || membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid) {
          paymentsFilter = {
            OR: [
              {
                payments: {
                  some: {
                    active: true,
                    month: { in: months },
                  },
                },
              },
              {
                payments: {
                  none: {
                    active: true,
                    month: { in: months },
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
        where,
        select: {
          id: true,
          payments:
            months.length > 0
              ? {
                  where: {
                    active: true,
                    month: { in: months },
                  },
                  select: {
                    amount: true,
                    partial: true,
                  },
                }
              : undefined,
        },
      });

      // Filter by paid/unpaid status if months are provided (must match member.ts logic exactly)
      if (months.length > 0) {
        if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Paid) {
          // Paid = has paid for ALL selected months (excluding partial payments)
          members = members.filter(
            (member) => member.payments && member.payments.filter((payment) => payment.partial === false).length === months.length,
          );
        } else if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid) {
          // Unpaid = has paid for LESS THAN ALL selected months (excluding partial payments)
          members = members.filter(
            (member) => !member.payments || member.payments.filter((payment) => payment.partial === false).length < months.length,
          );
        } else if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Partial) {
          // Partial = has made payments for all months, but at least one is partial
          members = members.filter((member) => member.payments && member.payments.length === months.length);
        }
      }

      return members.length;
    }),
});
