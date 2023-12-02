// import { type RecordType } from "@prisma/client";
// import moment from "moment";
// import { type NextApiRequest, type NextApiResponse } from "next";

// import { prisma } from "@/server/db";

// const data = `
// 23/02/2023	Opening Balance	Rs. 2,000.00	-
// 28/02/2023	Interest	Rs. 69.65	-
// 28/02/2023	Withholding Tax	-	Rs. 3.48
// 08/03/2023	Cleaning the Security Premises	-	Rs. 4,015.00
// 29/03/2023	Water Pipe Laying Project	-	Rs. 30,015.00
// 31/03/2023	Interest	Rs. 539.80	-
// 31/03/2023	Withholding Tax	-	Rs. 26.99
// 08/03/2023	Cleaning the Security Premises	-	Rs. 4,015.00
// 03/04/2023	Mangoes Selling Income	Rs. 10,000.00	-
// 03/04/2023	ATM Card Fee	-	Rs. 600.00
// 03/04/2023	ATM Balance Receipt	-	Rs. 5.00
// 04/04/2023	Security Firm Invoice	-	Rs. 99,205.00
// 28/04/2023	Withholding Tax	-	Rs. 25.76
// 30/04/2023	Interest	Rs. 515.27	-
// 04/05/2023	Awurudu Gifts For Guards	-	Rs. 10,005.00
// 04/05/2023	Security Firm Invoice	-	Rs. 99,205.00
// 26/05/2023	Adv. Payment for Guard System	-	Rs. 53,005.00
// 29/05/2023	Bal. Payment for Guard System	-	Rs. 20,000.00
// 31/05/2023	Withholding Tax	-	Rs. 26.47
// 31/05/2023	Interest	Rs. 529.39	-
// 05/06/2023	Security Firm Invoice	-	Rs. 99,360.00
// 06/06/2023	For Security Jackets 4 Nos.	-	Rs. 3,000.00
// 13/06/2023	Map Banner Printing Cost	-	Rs. 3,150.00
// 14/06/2023	Heater Jug/13A Plug/Tea&Sugar	-	Rs. 7,084.00
// 26/06/2023	Security Point Water Bill	-	Rs. 1,267.65
// 28/06/2023	Withholding Tax	-	Rs. 21.58
// 28/06/2023	Interest	Rs. 431.67	-
// 04/07/2023	Security Firm Invoice	-	Rs. 92,960.00
// 05/07/2023	100 Tea Bags & 1.5Kg Sugar	-	Rs. 1,175.00
// 24/07/2023	100 Tea Bags & 1.5Kg Sugar	-	Rs. 1,090.00
// 28/07/2023	Security Jackets Letters Printing	-	Rs. 1,000.00
// 31/07/2023	Withholding Tax	-	Rs. 24.11
// 31/07/2023	Interest	Rs. 482.20	-
// 09/08/2023	Security Firm Invoice	-	Rs. 96,160.00
// 14/08/2023	Water Bill (Security Point)	-	Rs. 7,500.65
// 21/08/2023	100 Tea Bags & 1.5Kg Sugar	-	Rs. 1,090.00
// 31/08/2023	Withholding Tax	-	Rs. 31.13
// 31/08/2023	Interest	Rs. 622.53	-
// 04/09/2023	Security Firm Invoice	-	Rs. 96,160.00
// 15/09/2023	Security Device Compensation	Rs. 40,000.00	-
// 19/09/2023	Cleaning the Security Premises	-	Rs. 7,500.00
// 20/09/2023	Print Cost for A5 Notice Bills	-	Rs. 500.00
// 27/09/2023	Withholding Tax	-	Rs. 40.92
// 27/09/2023	Interest	Rs. 818.34	-
// 02/10/2023	Security Firm Invoice	-	Rs. 96,160.00
// 02/10/2023	Appreciation Cash for Securities	-	Rs. 20,000.00
// 03/10/2023	Purchased 2 Walkie Talkies	-	Rs. 15,000.00
// 27/10/2023	Tea & Sugar x 2 Times	-	Rs. 2,200.00
// 31/10/2023	Withholding Tax	-	Rs. 50.17
// 31/10/2023	Interest	Rs. 1,003.42	-
// 02/11/2023	Security Firm Invoice	-	Rs. 144,960.00
// 06/11/2023	SMS Gateway Charges (System)	-	Rs. 6,500.00
// 17/11/2023	Tea & Sugar	-	Rs. 1,200.00
// 28/11/2023	Purchase of 2 Torches	-	Rs. 6,271.00
// 28/11/2023	Purchase of Mobile Phone	-	Rs. 7,030.00
// 30/11/2023	Withholding Tax	-	Rs. 44.70
// 30/11/2023	Interest	Rs. 893.99	-
// `;

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   // Split data into rows and filter out empty rows
//   const rows = data
//     .trim()
//     .split("\n")
//     .map((row) => row.trim())
//     .filter((row) => row.length > 0);

//   const recordsToCreate = [];

//   // Loop through each row and create the objects
//   for (const row of rows) {
//     const [dateStr, description, income, expense] = row.split("\t");

//     const date = moment(dateStr, "DD/MM/YYYY").utcOffset(0, true).toDate();
//     const month = moment(date).startOf("month").utcOffset(0, true).toDate();

//     const type = income?.includes("-") ? "Expense" : "Income";

//     const amountMatch = type === "Income" ? income?.match(/Rs\. (\S+)/) : expense?.match(/Rs\. (\S+)/);

//     const amount = amountMatch ? parseFloat(amountMatch[1]!.replace(",", "")) : 0;

//     recordsToCreate.push({
//       name: description!,
//       recordAt: date,
//       month,
//       amount,
//       type: type === "Income" ? ("Income" as RecordType) : ("Expense" as RecordType),
//       active: true,
//     });
//   }

//   const results = await prisma.record.createMany({
//     data: recordsToCreate,
//   });

//   // Output the result array
//   res.status(200).json(results);
// }
