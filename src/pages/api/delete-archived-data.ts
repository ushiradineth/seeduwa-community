import moment from "moment";
import { Logger } from "next-axiom";
import { type NextApiRequest, type NextApiResponse } from "next";

import { prisma } from "@/server/db";

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const logger = new Logger();
  const log = logger.with({ cron: "delete-archived-data" });

  if (!process.env.CRON_SECRET || request.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    log.info("Archived data failed to delete", { error: "UNAUTHORIZED", code: 401 });
    return response.status(401).json({ success: false });
  }

  const members = await prisma.member.deleteMany({
    where: {
      active: false,
      deletedAt: {
        lt: moment().subtract(30, "days").toDate(),
      },
    },
  });

  const payments = await prisma.payment.deleteMany({
    where: {
      active: false,
      deletedAt: {
        lt: moment().subtract(30, "days").toDate(),
      },
    },
  });

  const records = await prisma.record.deleteMany({
    where: {
      active: false,
      deletedAt: {
        lt: moment().subtract(30, "days").toDate(),
      },
    },
  });

  log.info("Archived data deleted", { members, payments, records });

  response.status(200).json({
    body: {
      members,
      payments,
      records,
    },
  });
}
