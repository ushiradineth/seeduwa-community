import { type inferRouterOutputs } from "@trpc/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Edit, FileText, MoreVertical, Plus, Sheet } from "lucide-react";
import * as XLSX from "xlsx";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/Molecules/DropdownMenu";
import { ITEMS_PER_PAGE } from "@/lib/consts";
import { s2ab } from "@/lib/utils";
import { type Props, type Record } from "@/pages/record";
import { type AppRouter } from "@/server/api/root";
import PageNumbers from "../Atoms/PageNumbers";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../Molecules/Card";
import Search from "../Molecules/Search";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../Molecules/Table";

export default function Records({ records: initialRecords, count, year, month, search }: Props) {
  const router = useRouter();
  const pageNumber = Number(router.query.page ?? 1);
  const [records, setRecords] = useState<Record[]>(initialRecords);
  const { mutate } = api.record.getRecordsDocumentData.useMutation({
    onSuccess: (data, variables) => {
      if (variables.type === "PDF") generatePDF(data);
      else if (variables.type === "XSLX") generateXSLX(data);
    },
  });

  useEffect(() => {
    initialRecords !== records && setRecords(initialRecords);
  }, [initialRecords, records]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex w-full items-center justify-center gap-2">
          <p>Records</p>
          <OptionMenu
            onClickPDF={() => mutate({ month, year, search, type: "PDF" })}
            onClickXSLX={() => mutate({ month, year, search, type: "XSLX" })}
          />
        </CardTitle>
        <CardDescription>
          <p className="text-lg font-bold">
            Total balance for {month} {year} is LKR {records.reduce((acc, cur) => acc + cur.amount, 0).toLocaleString()} so far
          </p>
        </CardDescription>
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
              <TableHead className="text-center">Name</TableHead>
              <TableHead className="text-center">Amount</TableHead>
              <TableHead className="text-center">Paid on</TableHead>
              <TableHead className="text-center">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length !== 0 ? (
              records.map((record) => {
                return (
                  <TableRow key={record.id}>
                    <TableCell className="cursor-pointer text-center">
                      <p className="max-w-24 flex items-center justify-center truncate">{record.name}</p>
                    </TableCell>
                    <TableCell className="cursor-pointer text-center">
                      <p>{record.amount.toLocaleString()}</p>
                    </TableCell>
                    <TableCell className="cursor-pointer text-center">
                      <p>{record.recordAt}</p>
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
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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

type RouterOutput = inferRouterOutputs<AppRouter>;

function generatePDF(data: RouterOutput["record"]["getRecordsDocumentData"]) {
  const pdfDocument = new jsPDF();
  const pageWidth = pdfDocument.internal.pageSize.width || pdfDocument.internal.pageSize.getWidth();

  pdfDocument.text(`Records for ${data.month} ${data.year}`, pageWidth / 2, 10, { align: "center" });

  const head = [["Name", "Paid on", "Amount"]];

  autoTable(pdfDocument, {
    head,
    headStyles: {
      halign: "center",
    },
    bodyStyles: {
      halign: "center",
    },
    theme: "grid",
    body: [
      ...data.records.map((record) => {
        return [record.name, new Date(record.recordAt).toDateString(), record.amount.toLocaleString()];
      }),
      ["", "Total:", data.records.reduce((acc, cur) => acc + cur.amount, 0).toLocaleString()],
    ],
  });

  pdfDocument.save(`SVSA - Records for ${data.month} ${data.year}.pdf`);
}

function generateXSLX(data: RouterOutput["record"]["getRecordsDocumentData"]) {
  const workbook = XLSX.utils.book_new();
  const header = ["Name", "Paid on", "Amount"];

  const worksheetData = [
    header,
    ...data.records.map((record) => [record.name, new Date(record.recordAt).toDateString(), record.amount.toLocaleString()]),
    ["", "Total:", data.records.reduce((acc, cur) => acc + cur.amount, 0).toLocaleString()],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
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
