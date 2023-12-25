import { type Logger } from "next-axiom";
import { z } from "zod";

import { env } from "@/env.mjs";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export async function sendMessage(recipient: string, text: string, log: Logger): Promise<boolean> {
  const formData = new URLSearchParams();
  formData.append("user_id", env.SMS_USER_ID);
  formData.append("api_key", env.SMS_API_KEY);
  formData.append("sender_id", env.SMS_SENDER_ID);
  formData.append("to", recipient);
  formData.append("message", text);

  try {
    const response = await fetch("http://send.srilankandiver.com/api/v2/send.php", {
      method: "POST",
      body: formData,
    });

    // @ts-expect-error SMS Gateway does not respond with an error code
    if (!response.ok || response.status === "unsuccess") {
      log.error("Message not sent", { message: text, receiver: recipient, response });
      return false;
    }

    const data = await response.json(); // or response.text() if the response is not JSON
    log.info("Message sent", { message: text, receiver: recipient, response: data });

    return true;
  } catch (error) {
    log.error("Message not sent", { message: text, receiver: recipient, response: error });
    return false;
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

      const messages: { name: string; number: string; status: boolean }[] = [];

      for (const member of members) {
        messages.push({
          name: member.name,
          number: member.phoneNumber,
          status: await sendMessage(member.phoneNumber, input.text, ctx.log),
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

    const messages: { name: string; number: string; status: boolean }[] = [];

    for (const member of members) {
      messages.push({
        name: member.name,
        number: member.phoneNumber,
        status: await sendMessage(member.phoneNumber, input.text, ctx.log),
      });
    }

    return messages;
  }),
});
