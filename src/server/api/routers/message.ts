import { log } from "next-axiom";
import { z } from "zod";

import { env } from "@/env.mjs";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export function sendMessage(recipient: string, text: string) {
  const formData = new URLSearchParams();
  formData.append("user_id", env.SMS_USER_ID);
  formData.append("api_key", env.SMS_API_KEY);
  formData.append("sender_id", env.SMS_SENDER_ID);
  formData.append("to", recipient);
  formData.append("message", text);

  fetch("http://send.srilankandiver.com/api/v2/send.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      // @ts-expect-error SMS Gateway does not responde with an error code
      if (!response.ok || response.status === "unsuccess") {
        log.error("Message not sent", { message: text, reciever: recipient });
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json(); // or response.text() if the response is not JSON
    })
    .then((data) => {
      log.info("Message sent", { message: text, reciever: recipient, response: data });
    })
    .catch((error) => {
      log.error("Message not sent", { message: text, reciever: recipient, response: error });
      return false;
    });

  return recipient;
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

      const messages = [];

      for (const member of members) {
        messages.push(sendMessage(member.phoneNumber, input.text));
      }

      return messages;
    }),

  broadcast: protectedProcedure.input(z.object({ text: z.string() })).mutation(async ({ input, ctx }) => {
    const members = await ctx.prisma.member.findMany({
      where: {
        active: true,
      },
    });

    const messages = [];

    for (const member of members) {
      messages.push(sendMessage(member.phoneNumber, input.text));
    }

    return messages;
  }),
});
