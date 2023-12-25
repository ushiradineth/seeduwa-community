import { log } from "next-axiom";
import { type NextApiRequest, type NextApiResponse } from "next";

import { DEFAULT_AMOUNT } from "@/lib/consts";
import { generateUnpaidNotificationMessage, now } from "@/lib/utils";
import { sendMessage } from "@/server/api/routers/message";
import { prisma } from "@/server/db";

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (new Date().getDate() !== 25) {
    response.status(400).json({
      body: {
        message: "No Access",
      },
    });

    return false;
  }

  const month = now();

  const members = await prisma.member.findMany({
    where: {
      active: true,
      payments: {
        none: {
          active: true,
          month: { equals: month },
        },
      },
    },
  });

  const messages: { name: string; number: string; status: boolean }[] = [];

  for (const member of members) {
    await sendMessage(member.phoneNumber, generateUnpaidNotificationMessage(DEFAULT_AMOUNT, month), log);
  }

  response.status(200).json({
    body: {
      unpaidMembers: members,
      messages,
    },
  });
}
