import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Edit, FileText, MoreVertical, Plus, Sheet } from "lucide-react";
import * as XLSX from "xlsx";
import { ITEMS_PER_PAGE, MONTHS } from "@/lib/consts";
import { type Payment, type Props } from "@/pages/payment";
import PageNumbers from "../Atoms/PageNumbers";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../Molecules/Card";
import Search from "../Molecules/Search";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../Molecules/Table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/Molecules/DropdownMenu";
import { removeTimezone, s2ab } from "@/lib/utils";

export default function Payments({ payments: initialPayments, count, year, month, search, page, itemPerPage }: Props) {
  const router = useRouter();
  const pageNumber = Number(router.query.page ?? 1);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);

  useEffect(() => {
    initialPayments !== payments && setPayments(initialPayments);
  }, [initialPayments, payments]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex w-full items-center justify-center gap-2">
          <p>Payments</p>{" "}
          <OptionMenu
            onClickPDF={() => generatePDF({ payments: initialPayments, count, year, month, search, page, itemPerPage })}
            onClickXSLX={() => generateXSLX({ payments: initialPayments, count, year, month, search, page, itemPerPage })}
          />
        </CardTitle>
        <CardDescription>
          <p className="text-lg font-bold">
            A list of payments made in {month} {year}.
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Search
          classname="pb-4"
          search={router.query.search as string}
          placeholder="Search for Payments"
          path={router.asPath}
          params={router.query}
          count={count}
        />
        <Table className="border">
          <TableHeader>
            <TableRow>
              <TableHead className="border text-center">#</TableHead>
              <TableHead className="border text-center">Member</TableHead>
              <TableHead className="border text-center">Amount</TableHead>
              <TableHead className="border text-center">Period</TableHead>
              <TableHead className="border text-center">Paid on</TableHead>
              <TableHead className="border text-center">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length !== 0 ? (
              payments.map((payment, index) => {
                return (
                  <TableRow key={payment.id}>
                    <TableCell onClick={() => router.push(`/member/${payment.member.id}`)} className="cursor-pointer border text-center">
                      <Link href={`/member/${payment.member.id}`} className="max-w-24 flex items-center justify-center truncate">
                        {index + itemPerPage * (page - 1) + 1}
                      </Link>
                    </TableCell>
                    <TableCell onClick={() => router.push(`/member/${payment.member.id}`)} className="cursor-pointer border text-center">
                      <Link href={`/member/${payment.member.id}`} className="max-w-24 flex items-center justify-center truncate">
                        {payment.member.name}
                      </Link>
                    </TableCell>
                    <TableCell className="cursor-pointer border text-center">
                      <Link href={`/payment/${payment.id}`}>LKR {payment.amount.toLocaleString()}</Link>
                    </TableCell>
                    <TableCell className="cursor-pointer border text-center">
                      <Link href={`/payment/${payment.id}`}>
                        {MONTHS[removeTimezone(payment.month).toDate().getMonth()]} {removeTimezone(payment.month).toDate().getFullYear()}
                      </Link>
                    </TableCell>
                    <TableCell className="cursor-pointer border text-center">
                      <p>{removeTimezone(payment.paymentAt).format("DD/MM/YYYY")}</p>
                    </TableCell>
                    <TableCell>
                      <button
                        className="flex w-full items-center justify-center"
                        onClick={() =>
                          router.push(
                            {
                              query: {
                                ...router.query,
                                mode: "edit",
                                payment: payment.id,
                                month: removeTimezone(payment.month).toDate().getMonth(),
                                year: removeTimezone(payment.month).toDate().getFullYear(),
                              },
                            },
                            undefined,
                            {
                              shallow: true,
                            },
                          )
                        }>
                        <Edit />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      {count !== 0 && count > ITEMS_PER_PAGE && (
        <CardFooter className="flex justify-center">
          <TableCaption>
            <PageNumbers count={count} itemsPerPage={ITEMS_PER_PAGE} pageNumber={pageNumber} path={router.asPath} params={router.query} />
          </TableCaption>
        </CardFooter>
      )}
    </Card>
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
        <DropdownMenuLabel>Payments</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex cursor-pointer gap-4"
          onClick={() => router.push({ query: { ...router.query, create: "payment" } }, undefined, { shallow: true })}>
          New payment <Plus className="ml-auto" size={20} />
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

const yellow = [202, 222, 185] as [number, number, number];

function generatePDF(data: Props) {
  const pdfDocument = new jsPDF();
  const pageWidth = pdfDocument.internal.pageSize.width || pdfDocument.internal.pageSize.getWidth();

  pdfDocument.text(`Seeduwa Village Security - Payments for ${data.month} ${data.year} `, pageWidth / 2, 10, {
    align: "center",
  });

  const head = [["#", "Member", "Amount", "Period", "Paid on"]];

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
      ...data.payments.map((payment, index) => {
        const rowData = [
          index + 1,
          payment.member.name,
          "LKR " + payment.amount.toLocaleString(),
          `${MONTHS[removeTimezone(payment.month).toDate().getMonth()]} ${removeTimezone(payment.month).toDate().getFullYear()}`,
          removeTimezone(payment.paymentAt).format("DD/MM/YYYY"),
        ];
        return rowData;
      }),
    ],
  });

  pdfDocument.save(`SVSA - Payments for ${data.month} ${data.year}.pdf`);
}

function generateXSLX(data: Props) {
  const workbook = XLSX.utils.book_new();
  const header = ["#", "Member", "Amount", "Period", "Paid on"];

  const worksheetData = [
    ["", "", "", "", ""],
    header,
    ...data.payments.map((payment, index) => {
      const rowData = [
        index + 1,
        payment.member.name,
        "LKR " + payment.amount.toLocaleString(),
        `${MONTHS[removeTimezone(payment.month).toDate().getMonth()]} ${removeTimezone(payment.month).toDate().getFullYear()}`,
        removeTimezone(payment.paymentAt).format("DD/MM/YYYY"),
      ];
      return rowData;
    }),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  worksheet.A1.v = `Seeduwa Village Security - Payments for ${data.month} ${data.year}`;
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
  const xlsxFile: string = XLSX.write(workbook, { bookType: "xlsx", type: "binary" });
  const blob = new Blob([s2ab(xlsxFile)], { type: "application/octet-stream" });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SVSA - Payments for ${data.month} ${data.year}.xlsx`;

  a.click();

  window.URL.revokeObjectURL(url);
}
