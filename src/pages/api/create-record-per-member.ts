import { type NextApiRequest, type NextApiResponse } from "next";

// import { MONTHS } from "@/lib/consts";
// import { prisma } from "@/server/db";

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  // const db = prisma;

  // [
  //   "March",
  //   "April",
  //   "May",
  //   "June",
  //   "July",
  //   "August",
  //   "September",
  //   "October",
  //   "November",
  //   "December"
  // ]
  // .forEach(
  //   async (month) =>
  //     await db.payment.create({
  //       data: {
  //         amount: DEFAULT_AMOUNT,
  //         paymentAt: new Date(
  //           2023,
  //           MONTHS.findIndex((m) => m === month),
  //           1,
  //         ),
  //         memberId: "cln0naqxn001tvgz62z3d7k3u",
  //       },
  //     }),
  // );
  response.status(200).json({});
}
