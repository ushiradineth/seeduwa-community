// import fs from "fs";
// import * as XLSX from "xlsx/xlsx.mjs";
import { type NextApiRequest, type NextApiResponse } from "next";

// import { prisma } from "@/server/db";

// const excelFilePath = "./data.xlsx";

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  // const db = prisma;
  // XLSX.set_fs(fs);
  // const workbook = XLSX.readFile(excelFilePath);
  // const sheetName = workbook.SheetNames[0];
  // const worksheet = workbook.Sheets[sheetName];
  // const months = ["March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // const members = [];

  // for (let rowIndex = 1; ; rowIndex++) {
  //   const row = XLSX.utils.encode_row(rowIndex);
  //   const houseid = worksheet[`A${row}`] ? worksheet[`A${row}`].v : null;
  //   const name = worksheet[`B${row}`] ? worksheet[`B${row}`].v : null;

  //   if (!houseid && !name) {
  //     break;
  //   }

  //   const rowData: {
  //     memberId: string;
  //     houseid: string;
  //     name: string;
  //     payments: { month: string; amount: number }[];
  //   } = {
  //     memberId: "",
  //     houseid,
  //     name,
  //     payments: [],
  //   };

  //   // Add monthly data
  //   for (let i = 0; i < months.length; i++) {
  //     const monthHeader = worksheet[XLSX.utils.encode_col(i + 2) + "1"] ? worksheet[XLSX.utils.encode_col(i + 2) + "1"].v : null;
  //     const monthValue = worksheet[XLSX.utils.encode_col(i + 2) + row] ? worksheet[XLSX.utils.encode_col(i + 2) + row].v : null;

  //     if (monthHeader && monthValue) {
  //       rowData.payments.push({ month: monthHeader, amount: monthValue });
  //     }
  //   }

  //   members.push(rowData);
  // }

  // members.forEach(async (member) => {
  //   const memberData = await db.member.findFirst({ where: { houseId: String(member.houseid) } });

  //   member.payments.forEach(async (payment) => {
  //     await db.payment.create({
  //       data: {
  //         member: {
  //           connect: {
  //             id: memberData?.id,
  //           },
  //         },
  //         amount: payment.amount,
  //         paymentAt: new Date(
  //           2023,
  //           MONTHS.findIndex((m) => m === payment.month),
  //           1,
  //         ),
  //       },
  //     });
  //   });
  // });

  response.status(200).json({});
}
