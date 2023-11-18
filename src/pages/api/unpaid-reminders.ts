import moment from "moment";
import { type NextApiRequest, type NextApiResponse } from "next";

import { DEFAULT_AMOUNT } from "@/lib/consts";
import { generateUnpaidNotificationMessage } from "@/lib/utils";
import { messageRouter } from "@/server/api/routers/message";
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

  const month = moment(
    moment().year(new Date().getFullYear()).month(new Date().getMonth()).startOf("month").utcOffset(0, true).format(),
  ).toDate();

  const members = await prisma.member.findMany({
    where: {
      active: true,
      payments: {
        none: {
          active: true,
          paymentAt: { equals: month },
        },
      },
    },
  });

  const message = messageRouter.createCaller({ prisma, session: null });

  members.forEach((member) => {
    void (async () => {
      await message.send({
        recipient: member.phoneNumber,
        text: generateUnpaidNotificationMessage(DEFAULT_AMOUNT, month),
      });
    })();
  });

  response.status(200).json({
    body: {
      unpaidMembers: members,
    },
  });
}
