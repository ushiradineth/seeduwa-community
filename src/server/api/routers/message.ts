import { type Logger } from "next-axiom";
import { parsePhoneNumber } from "react-phone-number-input";
import { z } from "zod";

import { env } from "@/env.mjs";
import { MEMBERS_PAYMENT_FILTER_ENUM } from "@/lib/consts";
import { removeTimezone } from "@/lib/utils";
import { createTRPCRouter, protectedProcedure } from "../trpc";

type SendMessageResult = {
  success: boolean;
  error?: string;
};

export async function sendMessage(recipient: string, text: string, log: Logger): Promise<SendMessageResult> {
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
      // Build filter conditions based on input (reusing member.ts filtering logic)
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
          name: true,
          phoneNumber: true,
          payments:
            months.length > 0
              ? {
                  where: {
                    active: true,
                    month: { in: months },
                  },
                  select: {
                    amount: true,
                    month: true,
                    partial: true,
                  },
                }
              : undefined,
        },
        orderBy: { lane: "asc" },
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

      const messages: { name: string; number: string; status: boolean; error?: string }[] = [];

      for (const member of members) {
        const result = await sendMessage(member.phoneNumber, input.text, ctx.log);
        messages.push({
          name: member.name,
          number: member.phoneNumber,
          status: result.success,
          error: result.error,
        });
      }

      // Sort to show errors first
      return messages.sort((a, b) => {
        if (!a.status && b.status) return -1;
        if (a.status && !b.status) return 1;
        return 0;
      });
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
