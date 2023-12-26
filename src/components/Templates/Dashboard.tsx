import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileText, MessagesSquare, MoreVertical, Sheet } from "lucide-react";
import * as XLSX from "xlsx";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { api, type RouterOutputs } from "@/utils/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/Molecules/DropdownMenu";
import { LANE_FILTER, MONTHS } from "@/lib/consts";
import { s2ab } from "@/lib/utils";
import { type Member, type Props } from "@/pages";
import Loader from "../Atoms/Loader";
import PageNumbers from "../Atoms/PageNumbers";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../Molecules/Card";
import Search from "../Molecules/Search";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../Molecules/Table";

export default function Dashboard({ year, itemsPerPage, search, lane, page }: Props) {
  const router = useRouter();
  const [type, setType] = useState("");

  const { data } = api.member.getDashboard.useQuery(
    { year, page, search, lane, itemsPerPage },
    { refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  const {
    data: documentData,
    isFetching: gettingDocumentData,
    isSuccess: gettingDocumentDataSuccess,
  } = api.member.getDashboard.useQuery(
    { year, search, lane },
    {
      enabled: type === "PDF" || type === "XSLX",
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const generateDocument = useCallback(() => {
    if (documentData) {
      if (type === "PDF") {
        generatePDF(documentData);
      } else if (type === "XSLX") {
        generateXSLX(documentData);
      }
    }
  }, [documentData, type]);

  const paymentFilter = useCallback((month: string, year: number, member: Member) => {
    return member.payments.find((payment) => {
      const paymentDate = new Date(payment.month);
      const paymentMonth = paymentDate.toLocaleString("en-US", { month: "long" });
      const paymentYear = paymentDate.getFullYear().toString();

      return paymentMonth === month && paymentYear === String(year) ? payment : undefined;
    });
  }, []);

  useEffect(() => {
    if (documentData) {
      generateDocument();
      setType("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    if (documentData && gettingDocumentDataSuccess) {
      generateDocument();
      setType("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gettingDocumentDataSuccess]);

  if (!data) return <Loader background />;

  return (
    <>
      {gettingDocumentData && <Loader blurBackground height="100%" background className="absolute w-full" />}
      <Card>
        <CardHeader>
          <CardTitle className="gap-mb-2 flex w-full items-center justify-center">
            <p>{`Seeduwa Village Security Association - ${year}`}</p>
            <OptionMenu onClickPDF={() => setType("PDF")} onClickXSLX={() => setType("XSLX")} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Search
            classname="pb-4"
            search={router.query.search as string}
            placeholder="Search for members"
            path={router.asPath}
            params={router.query}
            count={data.count}
          />
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Member</TableHead>
                {MONTHS.map((month) => (
                  <TableHead key={month} className="border-x-2 text-center font-extrabold">
                    {month}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.length !== 0 ? (
                data.members.map((member) => {
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
                              payment
                                ? payment.partial
                                  ? "bg-yellow-500 text-xl text-black hover:bg-yellow-600"
                                  : "bg-green-500 text-xl text-black hover:bg-green-600"
                                : "hover:bg-accent/90"
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
        {data.count !== 0 && data.count > itemsPerPage && (
          <CardFooter className="flex justify-center">
            <TableCaption>
              <PageNumbers count={data.count} itemsPerPage={itemsPerPage} pageNumber={page} path={router.asPath} params={router.query} />
            </TableCaption>
          </CardFooter>
        )}
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
        <DropdownMenuLabel>Dashboard</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex cursor-pointer gap-4" onClick={onClickPDF}>
          Download as PDF <FileText className="ml-auto" size={20} />
        </DropdownMenuItem>
        <DropdownMenuItem className="flex cursor-pointer gap-4" onClick={onClickXSLX}>
          Download as Excel <Sheet className="ml-auto" size={20} />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex cursor-pointer gap-4"
          onClick={() =>
            router.push({ query: { ...router.query, mode: "broadcast" } }, undefined, {
              shallow: true,
            })
          }>
          Broadcast Message <MessagesSquare className="ml-auto" size={20} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function generatePDF(data: RouterOutputs["member"]["getDashboard"]) {
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
            const paymentDate = new Date(p.month);
            const paymentMonth = paymentDate.toLocaleString("en-US", { month: "long" });
            return paymentMonth === month;
          });
          return payment ? payment.amount.toFixed(2) : "-";
        });

        return [member.name, ...paymentsByMonth];
      }),
    ],
  });

  pdfDocument.save(`SVSA - ${data.year}${data.lane !== LANE_FILTER[0] ? ` - ${data.lane}` : ""}.pdf`);
}

function generateXSLX(data: RouterOutputs["member"]["getDashboard"]) {
  const workbook = XLSX.utils.book_new();
  const header = ["Member Name", ...MONTHS];

  const worksheetData = [
    header,
    ...data.members.map((member) => {
      const paymentsByMonth = MONTHS.map((month) => {
        const payment = member.payments.find((p) => {
          const paymentDate = new Date(p.month);
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
  a.download = `SVSA - ${data.year}${data.lane !== LANE_FILTER[0] ? ` - ${data.lane}` : ""}.xlsx`;

  a.click();

  window.URL.revokeObjectURL(url);
}
