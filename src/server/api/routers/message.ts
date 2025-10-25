import { type Logger } from "next-axiom";
import { parsePhoneNumber } from "react-phone-number-input";
import { z } from "zod";

import { env } from "@/env.mjs";
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
  notifyUnpaidMembers: protectedProcedure
    .input(z.object({ amount: z.number(), month: z.date(), text: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const members = await ctx.prisma.member.findMany({
        where: {
          active: true,
          payments: {
            none: {
              active: true,
              month: {
                equals: input.month,
              },
            },
          },
        },
      });

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

      return messages;
    }),

  broadcast: protectedProcedure.input(z.object({ text: z.string() })).mutation(async ({ input, ctx }) => {
    const members = await ctx.prisma.member.findMany({
      where: {
        active: true,
      },
    });

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

    return messages;
  }),
});
