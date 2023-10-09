import { type inferRouterOutputs } from "@trpc/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileText, MoreVertical, Plus, Sheet } from "lucide-react";
import * as XLSX from "xlsx";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { MONTHS } from "@/lib/consts";
import { s2ab } from "@/lib/utils";
import { type Member, type Props } from "@/pages";
import { type AppRouter } from "@/server/api/root";
import PageNumbers from "../Atoms/PageNumbers";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../Molecules/Card";
import Search from "../Molecules/Search";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../Molecules/Table";

export default function Dashboard({ members: initialMembers, count, year, itemsPerPage, search }: Props) {
  const router = useRouter();
  const pageNumber = Number(router.query.page ?? 1);
  const [Members, setMembers] = useState<Member[]>(initialMembers);
  const { mutate } = api.member.getDashboardDocumentData.useMutation({
    onSuccess: (data, variables) => {
      if (variables.type === "PDF") generatePDF(data);
      else if (variables.type === "XSLX") generateXSLX(data);
    },
  });

  const paymentFilter = useCallback((month: string, year: number, member: Member) => {
    return member.payments.find((payment) => {
      const paymentDate = new Date(payment.date);
      const paymentMonth = paymentDate.toLocaleString("en-US", { month: "long" });
      const paymentYear = paymentDate.getFullYear().toString();

      return paymentMonth === month && paymentYear === String(year) ? payment : undefined;
    });
  }, []);

  useEffect(() => {
    initialMembers !== Members && setMembers(initialMembers);
  }, [initialMembers, Members]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gap-mb-2 flex w-full items-center justify-center">
          <p>{`Seeduwa Village Security Association - ${year}`}</p>
          <OptionMenu onClickPDF={() => mutate({ year, search, type: "PDF" })} onClickXSLX={() => mutate({ year, search, type: "XSLX" })} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Search
          classname="pb-4"
          search={router.query.search as string}
          placeholder="Search for members"
          path={router.asPath}
          params={router.query}
          count={count}
        />
        <Table className="border">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Member</TableHead>
              {MONTHS.map((month) => (
                <TableHead key={month} className="border-x-2 text-center">
                  {month}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Members.length !== 0 ? (
              Members.map((member) => {
                return (
                  <TableRow key={member.id}>
                    <TableCell onClick={() => router.push(`/member/${member.id}`)} className="cursor-pointer text-center">
                      <Link href={`/member/${member.id}`}>{member.name}</Link>
                    </TableCell>
                    {MONTHS.map((month, index) => {
                      const payment = paymentFilter(month, year, member);

                      return (
                        <TableCell
                          key={`${month}-${year}`}
                          onClick={() =>
                            router.push(
                              {
                                query: {
                                  ...router.query,
                                  memberId: member.id,
                                  mode: payment ? "edit" : "new",
                                  payment: payment ? payment.id : null,
                                  month: index,
                                  year: year,
                                },
                              },
                              undefined,
                              {
                                shallow: true,
                              },
                            )
                          }
                          className={`w-24 border text-center font-bold active:bg-accent ${
                            payment ? "bg-green-500 hover:bg-green-600" : "hover:bg-accent/90"
                          }`}>
                          {payment ? payment.amount : "-"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={13} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      {count !== 0 && count > itemsPerPage && (
        <CardFooter className="flex justify-center">
          <TableCaption>
            <PageNumbers count={count} itemsPerPage={itemsPerPage} pageNumber={pageNumber} path={router.asPath} params={router.query} />
          </TableCaption>
        </CardFooter>
      )}
    </Card>
  );
}

function OptionMenu({ onClickPDF, onClickXSLX }: { onClickPDF: () => void; onClickXSLX: () => void }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-auto">
        <MoreVertical size={20} className="cursor-pointer" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dark">
        <DropdownMenuLabel>Members</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex cursor-pointer gap-4"
          onClick={() => router.push({ query: { ...router.query, create: "member" } }, undefined, { shallow: true })}>
          Add new member <Plus className="ml-auto" size={20} />
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

function generatePDF(data: RouterOutput["member"]["getDashboardDocumentData"]) {
  const pdfDocument = new jsPDF("landscape");
  const pageWidth = pdfDocument.internal.pageSize.width || pdfDocument.internal.pageSize.getWidth();

  pdfDocument.text(`Seeduwa Village Security Association - ${data.year}`, pageWidth / 2, 10, { align: "center" });

  autoTable(pdfDocument, {
    head: [["Member Name", ...MONTHS]],
    headStyles: {
      halign: "center",
    },
    bodyStyles: {
      halign: "center",
    },
    theme: "grid",
    body: [
      ...data.members.map((member) => {
        const paymentsByMonth = MONTHS.map((month) => {
          const payment = member.payments.find((p) => {
            const paymentDate = new Date(p.date);
            const paymentMonth = paymentDate.toLocaleString("en-US", { month: "long" });
            return paymentMonth === month;
          });
          return payment ? payment.amount.toFixed(2) : "-";
        });

        return [member.name, ...paymentsByMonth];
      }),
    ],
  });

  pdfDocument.save(`SVSA - ${data.year}.pdf`);
}

function generateXSLX(data: RouterOutput["member"]["getDashboardDocumentData"]) {
  const workbook = XLSX.utils.book_new();
  const header = ["Member Name", ...MONTHS];

  const worksheetData = [
    header,
    ...data.members.map((member) => {
      const paymentsByMonth = MONTHS.map((month) => {
        const payment = member.payments.find((p) => {
          const paymentDate = new Date(p.date);
          const paymentMonth = paymentDate.toLocaleString("en-US", { month: "long" });
          return paymentMonth === month;
        });
        return payment ? payment.amount.toFixed(2) : "-";
      });

      return [member.name, ...paymentsByMonth];
    }),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
  const xlsxFile: string = XLSX.write(workbook, { bookType: "xlsx", type: "binary" });
  const blob = new Blob([s2ab(xlsxFile)], { type: "application/octet-stream" });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SVSA - ${data.year}.xlsx`;

  a.click();

  window.URL.revokeObjectURL(url);
}
