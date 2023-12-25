import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Edit, FileText, MoreVertical, Plus, Sheet } from "lucide-react";
import moment from "moment";
import * as XLSX from "xlsx";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/Molecules/DropdownMenu";
import { s2ab } from "@/lib/utils";
import { type Props, type Record } from "@/pages/record";
import { Card, CardContent, CardHeader, CardTitle } from "../Molecules/Card";
import Search from "../Molecules/Search";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../Molecules/Table";

export default function Records({ records: initialRecords, count, year, month, search, balance: initialBalance, currentPayments }: Props) {
  const router = useRouter();
  const [records, setRecords] = useState<Record[]>(initialRecords);
  const [balance, setBalance] = useState<number[]>([]);

  useEffect(() => {
    initialRecords !== records && setRecords(initialRecords);
  }, [initialRecords, records]);

  useEffect(() => {
    let innerBalance = initialBalance + currentPayments;
    const arr: number[] = [innerBalance];

    records.forEach((record) => {
      if (record.type === "Income") {
        innerBalance = innerBalance + record.amount;
      } else {
        innerBalance = innerBalance - record.amount;
      }

      arr.push(innerBalance);
    });

    setBalance(arr);
  }, [initialBalance, records, currentPayments]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex w-full items-center justify-center gap-2">
            <p>Records</p>
            <OptionMenu
              onClickPDF={() =>
                generatePDF({ records: initialRecords, count, year, month, search, balance: initialBalance, currentPayments })
              }
              onClickXSLX={() =>
                generateXSLX({ records: initialRecords, count, year, month, search, balance: initialBalance, currentPayments })
              }
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Search
            classname="pb-4"
            search={router.query.search as string}
            placeholder="Search for records"
            path={router.asPath}
            params={router.query}
            count={count}
          />
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Date</TableHead>
                <TableHead className="text-center">Description</TableHead>
                <TableHead className="text-center">Income</TableHead>
                <TableHead className="text-center">Expense</TableHead>
                <TableHead className="text-center">Balance</TableHead>
                <TableHead className="text-center">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow key={"header"} className="bg-slate-400 font-bold text-black hover:bg-slate-500">
                <TableCell className="border text-center">
                  <p>{moment().month(month).year(year).startOf("month").utcOffset(0, true).format("DD/MM/YYYY")}</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>Balance Brought Forward</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>-</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>-</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>LKR {initialBalance.toLocaleString()}</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>-</p>
                </TableCell>
              </TableRow>
              <TableRow key={"payments"}>
                <TableCell className="border text-center">
                  <p>{moment().month(month).year(year).startOf("month").utcOffset(0, true).format("DD/MM/YYYY")}</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>Monthly Fee from Residents</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>LKR {currentPayments.toLocaleString()}</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>-</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>LKR {balance[0]?.toLocaleString()}</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>-</p>
                </TableCell>
              </TableRow>
              {records.map((record, index) => {
                return (
                  <TableRow key={record.id}>
                    <TableCell className="border text-center">
                      <p>{moment(record.recordAt).utcOffset(0, true).format("DD/MM/YYYY")}</p>
                    </TableCell>
                    <TableCell className="border text-center">
                      <p className="max-w-24 flex items-center justify-center truncate">{record.name}</p>
                    </TableCell>
                    <TableCell className="border text-center">
                      <p>{record.type === "Income" ? "LKR " + record.amount.toLocaleString() : "-"}</p>
                    </TableCell>
                    <TableCell className="border text-center">
                      <p>{record.type === "Expense" ? "LKR " + record.amount.toLocaleString() : "-"}</p>
                    </TableCell>
                    <TableCell className="border text-center">
                      <p>LKR {balance[index + 1]?.toLocaleString()}</p>
                    </TableCell>
                    <TableCell className="flex items-center justify-center">
                      <button
                        onClick={() =>
                          router.push({
                            href: router.asPath,
                            query: { ...router.query, record: record.id, mode: "edit" },
                          })
                        }>
                        <Edit />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow key={"footer"} className="bg-slate-400 font-bold text-black hover:bg-slate-500">
                <TableCell className="border text-center">
                  <p>{moment().month(month).year(year).endOf("month").utcOffset(0, true).format("DD/MM/YYYY")}</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>Balance</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>-</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>-</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>LKR {balance[balance.length - 1]?.toLocaleString()}</p>
                </TableCell>
                <TableCell className="border text-center">
                  <p>-</p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function OptionMenu({ onClickPDF, onClickXSLX }: { readonly onClickPDF: () => void; readonly onClickXSLX: () => void }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-auto">
        <MoreVertical size={20} className="cursor-pointer" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dark">
        <DropdownMenuLabel>Records</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex cursor-pointer gap-4"
          onClick={() => router.push({ query: { ...router.query, create: "record" } }, undefined, { shallow: true })}>
          New record <Plus className="ml-auto" size={20} />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex cursor-pointer gap-4" onClick={onClickPDF}>
          Download as PDF <FileText className="ml-auto" size={20} />
        </DropdownMenuItem>
        <DropdownMenuItem className="flex cursor-pointer gap-4" onClick={onClickXSLX}>
          Download as Excel <Sheet className="ml-auto" size={20} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const green = [253, 243, 208] as [number, number, number];
const yellow = [202, 222, 185] as [number, number, number];

function generatePDF(data: Props) {
  const pdfDocument = new jsPDF();
  const pageWidth = pdfDocument.internal.pageSize.width || pdfDocument.internal.pageSize.getWidth();

  pdfDocument.text(`Seeduwa Village Security - Monthly Accounts Report - ${data.month} ${data.year}`, pageWidth / 2, 10, {
    align: "center",
  });

  const head = [["Date", "Description", "Income", "Expense", "Balance"]];

  let balanceWithPayments = data.balance + data.currentPayments;

  autoTable(pdfDocument, {
    head,
    headStyles: {
      halign: "center",
      fillColor: yellow,
      textColor: "black",
      fontStyle: "bold",
    },
    bodyStyles: {
      halign: "center",
    },
    theme: "grid",
    body: [
      [
        {
          content: moment().month(data.month).year(data.year).startOf("month").utcOffset(0, true).format("DD/MM/YYYY"),
          styles: { fillColor: green },
        },
        {
          content: "Balance Brought Forward",
          styles: { fontStyle: "bold" },
        },
        "-",
        "-",
        "LKR " + data.balance.toLocaleString(),
      ],
      [
        {
          content: moment().month(data.month).year(data.year).startOf("month").utcOffset(0, true).format("DD/MM/YYYY"),
          styles: { fillColor: green },
        },
        {
          content: "Monthly Fee from Residents",
          styles: { fontStyle: "bold" },
        },
        "LKR " + data.currentPayments.toLocaleString(),
        "-",
        "LKR " + (data.balance + data.currentPayments).toLocaleString(),
      ],
      ...data.records.map((record) => {
        const rowData = [
          {
            content: moment(record.recordAt).utcOffset(0, true).format("DD/MM/YYYY"),
            styles: { fillColor: green },
          },
          record.name,
        ];
        record.type === "Income"
          ? rowData.push("LKR " + record.amount.toLocaleString(), "-")
          : rowData.push("-", "LKR " + record.amount.toLocaleString());

        if (record.type === "Income") {
          balanceWithPayments = Number(balanceWithPayments) + Number(record.amount);
          rowData.push("LKR " + balanceWithPayments.toLocaleString());
        } else {
          balanceWithPayments = Number(balanceWithPayments) - Number(record.amount);
          rowData.push("LKR " + balanceWithPayments.toLocaleString());
        }
        return rowData;
      }),
      [
        {
          content: moment().month(data.month).year(data.year).endOf("month").utcOffset(0, true).format("DD/MM/YYYY"),
          styles: { fillColor: green },
        },
        {
          content: "Balance",
          styles: { fontStyle: "bold" },
        },
        "",
        "",
        {
          content: "LKR " + balanceWithPayments.toLocaleString(),
          styles: { fillColor: yellow, fontStyle: "bold" },
        },
      ],
    ],
  });

  pdfDocument.save(`SVSA - Records for ${data.month} ${data.year}.pdf`);
}

function generateXSLX(data: Props) {
  const workbook = XLSX.utils.book_new();
  const header = ["Date", "Description", "Income", "Expense", "Balance"];

  let balanceWithPayments = data.balance + data.currentPayments;

  const worksheetData = [
    ["", "", "", "", ""],
    header,
    [
      moment().month(data.month).year(data.year).startOf("month").utcOffset(0, true).format("DD/MM/YYYY"),
      "Balance Brought Forward",
      "-",
      "-",
      "LKR " + data.balance.toLocaleString(),
    ],
    [
      moment().month(data.month).year(data.year).startOf("month").utcOffset(0, true).format("DD/MM/YYYY"),
      "Monthly Fee from Residents",
      "LKR " + data.currentPayments.toLocaleString(),
      "-",
      "LKR " + (data.balance + data.currentPayments).toLocaleString(),
    ],
    ...data.records.map((record) => {
      const rowData = [moment(record.recordAt).utcOffset(0, true).format("DD/MM/YYYY"), record.name];
      record.type === "Income"
        ? rowData.push("LKR " + record.amount.toLocaleString(), "-")
        : rowData.push("-", "LKR " + record.amount.toLocaleString());

      if (record.type === "Income") {
        balanceWithPayments = Number(balanceWithPayments) + Number(record.amount);
        rowData.push("LKR " + balanceWithPayments.toLocaleString());
      } else {
        balanceWithPayments = Number(balanceWithPayments) - Number(record.amount);
        rowData.push("LKR " + balanceWithPayments.toLocaleString());
      }
      return rowData;
    }),
    [
      moment().month(data.month).year(data.year).endOf("month").utcOffset(0, true).format("DD/MM/YYYY"),
      "Balance",
      "-",
      "-",
      "LKR " + balanceWithPayments.toLocaleString(),
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  worksheet.A1.v = `Seeduwa Village Security - Monthly Accounts Report - ${data.month} ${data.year}`;
  XLSX.utils.book_append_sheet(workbook, worksheet, "Records");
  const xlsxFile: string = XLSX.write(workbook, { bookType: "xlsx", type: "binary" });
  const blob = new Blob([s2ab(xlsxFile)], { type: "application/octet-stream" });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SVSA - Records for ${data.month} ${data.year}.xlsx`;

  a.click();

  window.URL.revokeObjectURL(url);
}
