// import fs from "fs";
// import moment from "moment";
// import * as XLSX from "xlsx/xlsx.mjs";
// import { type NextApiRequest, type NextApiResponse } from "next";

// import { prisma } from "@/server/db";

// const excelFilePath = "./a.xlsx";

// export default async function handler(request: NextApiRequest, response: NextApiResponse) {
//   const db = prisma;
//   XLSX.set_fs(fs);
//   const workbook = XLSX.readFile(excelFilePath);
//   const sheetName = workbook.SheetNames[0];
//   const worksheet = workbook.Sheets[sheetName];
//   const months = ["March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

//   const members: {
//     memberId: string;
//     lane: string | null;
//     houseid: string | null;
//     name: string | null;
//     number: string | undefined;
//     payments: { month: string; amount: number }[];
//   }[] = [];

//   for (let rowIndex = 2; ; rowIndex++) {
//     const row = XLSX.utils.encode_row(rowIndex);
//     const lane = worksheet[`A${row}`] ? String(worksheet[`A${row}`].v).trim() : null;
//     const houseid = worksheet[`B${row}`] ? String(worksheet[`B${row}`].v).trim() : null;
//     const name = worksheet[`C${row}`] ? String(worksheet[`C${row}`].v).trim() : null;
//     const number = worksheet[`D${row}`] ? String(worksheet[`D${row}`].v).trim() : undefined;

//     if (!houseid && !name && !lane) {
//       break;
//     }

//     const rowData: {
//       memberId: string;
//       lane: string | null;
//       houseid: string | null;
//       name: string | null;
//       number: string | undefined;
//       payments: { month: string; amount: number }[];
//     } = {
//       memberId: "",
//       lane,
//       houseid,
//       name,
//       number: number ? (number?.length === 9 ? "+94" + number : !number?.startsWith("+") ? "+" + number : number) : undefined,
//       payments: [],
//     };

//     // Add monthly data
//     for (let i = 0; i < months.length; i++) {
//       const monthHeader = worksheet[XLSX.utils.encode_col(i + 4) + "1"] ? worksheet[XLSX.utils.encode_col(i + 4) + "1"].v : null;
//       const monthValue = worksheet[XLSX.utils.encode_col(i + 4) + row] ? worksheet[XLSX.utils.encode_col(i + 4) + row].v : null;

//       if (monthHeader && monthValue) {
//         rowData.payments.push({ month: monthHeader, amount: monthValue });
//       }
//     }

//     members.push(rowData);
//   }

//   for (const member of members) {
//     // Create member
//     const createdMember = await db.member.create({
//       data: {
//         houseId: member.houseid!,
//         lane: member.lane!,
//         name: member.name!,
//         phoneNumber: member.number,
//       },
//     });

//     // Create payments for the member
//     member.payments.forEach(async (payment) => {
//       await db.payment.create({
//         data: {
//           memberId: createdMember.id,
//           amount: payment.amount,
//           month: moment().year(2023).month(payment.month).startOf("month").utcOffset(0, true).toDate(),
//           paymentAt: moment().year(2023).month(payment.month).startOf("month").utcOffset(0, true).toDate(),
//         },
//       });
//     });
//   }

//   response.status(200).json({ members });
// }
