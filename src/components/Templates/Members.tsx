import { type inferRouterOutputs } from "@trpc/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BadgeCheck, BadgeXIcon, Edit, FileText, MessagesSquare, MoreVertical, Plus, Sheet } from "lucide-react";
import moment from "moment";
import { formatPhoneNumberIntl } from "react-phone-number-input";
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
import { ITEMS_PER_PAGE, MEMBERS_PAYMENT_FILTER_ENUM, MONTHS } from "@/lib/consts";
import { s2ab } from "@/lib/utils";
import { type Props } from "@/pages/member";
import { type AppRouter } from "@/server/api/root";
import Loader from "../Atoms/Loader";
import PageNumbers from "../Atoms/PageNumbers";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../Molecules/Card";
import Search from "../Molecules/Search";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../Molecules/Table";

export default function Members({ year, month, membersParam, search, itemsPerPage }: Props) {
  const router = useRouter();
  const pageNumber = Number(router.query.page ?? 1);
  const filter = String(membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid ? "not paid" : "paid").toLowerCase();
  const [type, setType] = useState("");

  const { data } = api.member.getMembers.useQuery(
    { itemsPerPage, members: membersParam, month, year, page: pageNumber, search },
    { refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  const {
    data: documentData,
    isLoading: gettingDocumentData,
    isPaused: documentDataEnabled,
    isSuccess: gettingDocumentDataSuccess,
  } = api.member.getMembers.useQuery(
    { members: membersParam, month, year, search },
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
      {documentDataEnabled && gettingDocumentData && <Loader blurBackground height="100%" background className="absolute w-full" />}
      <Card>
        <CardHeader>
          <CardTitle className="flex w-full items-center justify-center gap-2">
            <p>Members</p>
            <OptionMenu
              onClickPDF={() => setType("PDF")}
              onClickXSLX={() => setType("XSLX")}
              month={moment(
                moment()
                  .year(year)
                  .month(MONTHS.findIndex((value) => value === month))
                  .startOf("month")
                  .utcOffset(0, true)
                  .format(),
              ).toDate()}
              filter={membersParam}
            />
          </CardTitle>
          <CardDescription>
            {typeof router.query.members !== "undefined" && router.query.members !== "All" ? (
              <p className="text-lg font-bold">
                {data.count} member(s) have {filter} for {month} {year} so far
              </p>
            ) : (
              <p>A list of all members.</p>
            )}
          </CardDescription>
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
                <TableHead className="text-center">Name</TableHead>
                <TableHead className="text-center">Phone number</TableHead>
                <TableHead className="text-center">Address</TableHead>
                <TableHead className="text-center">
                  Paid for {month} {year}
                </TableHead>
                <TableHead className="text-center">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.length !== 0 ? (
                data.members.map((member) => {
                  return (
                    <TableRow key={member.id}>
                      <TableCell onClick={() => router.push(`/member/${member.id}`)} className="cursor-pointer text-center">
                        <Link className="max-w-24 flex items-center justify-center truncate" href={`/member/${member.id}`}>
                          {member.name}
                        </Link>
                      </TableCell>
                      <TableCell onClick={() => router.push(`/member/${member.id}`)} className="cursor-pointer text-center">
                        <Link href={`/member/${member.id}`}>
                          {member.phoneNumber !== "" ? formatPhoneNumberIntl(member.phoneNumber) : "-"}
                        </Link>
                      </TableCell>
                      <TableCell onClick={() => router.push(`/member/${member.id}`)} className="cursor-pointer text-center">
                        <Link href={`/member/${member.id}`}>
                          No {member.houseId} - {member.lane}
                        </Link>
                      </TableCell>
                      <TableCell onClick={() => router.push(`/member/${member.id}`)} className="cursor-pointer text-center">
                        <Link className="max-w-24 flex items-center justify-center truncate" href={`/member/${member.id}`}>
                          {member.payment ? <BadgeCheck color="green" /> : <BadgeXIcon color="red" />}
                        </Link>
                      </TableCell>
                      <TableCell className="flex items-center justify-center">
                        <button
                          onClick={() =>
                            router.push({
                              href: router.asPath,
                              query: { ...router.query, member: member.id, action: "edit" },
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
            <TableCaption>Currently, a total of {data.total} Members are on SVC</TableCaption>
          </Table>
        </CardContent>
        {data.count !== 0 && data.count > ITEMS_PER_PAGE && (
          <CardFooter className="flex justify-center">
            <TableCaption>
              <PageNumbers
                count={data.count}
                itemsPerPage={itemsPerPage}
                pageNumber={pageNumber}
                path={router.asPath}
                params={router.query}
              />
            </TableCaption>
          </CardFooter>
        )}
      </Card>
    </>
  );
}

function OptionMenu({
  onClickPDF,
  onClickXSLX,
  month,
  filter,
}: {
  readonly onClickPDF: () => void;
  readonly onClickXSLX: () => void;
  readonly month: Date;
  readonly filter: MEMBERS_PAYMENT_FILTER_ENUM;
}) {
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
        {filter === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex cursor-pointer gap-4"
              onClick={() =>
                router.push({ query: { ...router.query, mode: "notify", month: month.getMonth(), year: month.getFullYear() } }, undefined, {
                  shallow: true,
                })
              }>
              Notify Unpaid Members <MessagesSquare className="ml-auto" size={20} />
            </DropdownMenuItem>
          </>
        )}
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

function generatePDF(data: RouterOutput["member"]["getMembers"]) {
  const pdfDocument = new jsPDF();
  const pageWidth = pdfDocument.internal.pageSize.width || pdfDocument.internal.pageSize.getWidth();

  pdfDocument.text(`${data.membersParam} members for ${data.month} ${data.year}`, pageWidth / 2, 10, { align: "center" });

  const head = [["Lane", "House Number", "Name", "Phone Number"]];

  if (data.membersParam === MEMBERS_PAYMENT_FILTER_ENUM.All) head[0]?.push(`Paid for ${data.month} ${data.year}`);

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
      ...data.members.map((member) => {
        const memberData = [member.lane, member.houseId, member.name, member.phoneNumber === "" ? "-" : member.phoneNumber];
        if (data.membersParam === MEMBERS_PAYMENT_FILTER_ENUM.All) memberData.push(member.payment ? "YES" : "NO");
        return memberData;
      }),
    ],
  });

  pdfDocument.save(`SVSA - ${data.membersParam} members for ${data.month} ${data.year}.pdf`);
}

function generateXSLX(data: RouterOutput["member"]["getMembers"]) {
  const workbook = XLSX.utils.book_new();
  const header = ["Lane", "House Number", "Name", "Phone Number", "Paid?"];

  const worksheetData = [
    header,
    ...data.members.map((member) => [member.lane, member.houseId, member.name, member.phoneNumber ?? "-", member.payment ? "YES" : "NO"]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
  const xlsxFile: string = XLSX.write(workbook, { bookType: "xlsx", type: "binary" });
  const blob = new Blob([s2ab(xlsxFile)], { type: "application/octet-stream" });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SVSA - ${data.membersParam} members for ${data.month} ${data.year}.xlsx`;

  a.click();

  window.URL.revokeObjectURL(url);
}
