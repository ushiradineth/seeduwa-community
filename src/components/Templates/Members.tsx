import { type inferRouterOutputs } from "@trpc/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BadgeCheck, BadgeMinus, BadgeXIcon, Edit, FileText, MessagesSquare, MoreVertical, Plus, Sheet } from "lucide-react";
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
import { MEMBERS_PAYMENT_FILTER_ENUM, MONTHS } from "@/lib/consts";
import { s2ab } from "@/lib/utils";
import { type Props } from "@/pages/member";
import { type AppRouter } from "@/server/api/root";
import { Label } from "../Atoms/Label";
import Loader from "../Atoms/Loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../Molecules/Card";
import { Popover, PopoverContent, PopoverTrigger } from "../Molecules/Popover";
import Search from "../Molecules/Search";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../Molecules/Table";

export default function Members({ months, membersParam, search }: Props) {
  const router = useRouter();
  const filter = String(
    membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid
      ? "not paid"
      : membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Paid
      ? "paid"
      : membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Partial
      ? "partially paid"
      : "",
  ).toLowerCase();
  const [type, setType] = useState("");

  const { data } = api.member.getMembers.useQuery(
    { members: membersParam, months, search },
    { refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  const {
    data: documentData,
    isFetching: gettingDocumentData,
    isSuccess: gettingDocumentDataSuccess,
  } = api.member.getMembers.useQuery(
    { members: membersParam, months, search },
    {
      enabled: type === "PDF" || type === "XSLX",
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const generateDocument = useCallback(() => {
    if (documentData) {
      const monthsText = documentData.months
        .map((month, index) => {
          const monthName = MONTHS[new Date(month).getMonth()];
          const year = new Date(month).getFullYear();

          if (index === 0) {
            return `${monthName} ${year}`;
          } else if (index === documentData.months.length - 1) {
            return ` and ${monthName} ${year}`;
          } else {
            return `, ${monthName} ${year}`;
          }
        })
        .join("");

      if (type === "PDF") {
        generatePDF(documentData, monthsText);
      } else if (type === "XSLX") {
        generateXSLX(documentData, monthsText);
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
      {gettingDocumentData && <Loader blurBackground height="100%" background className="absolute w-full" />}
      <Card>
        <CardHeader>
          <CardTitle className="flex w-full items-center justify-center gap-2">
            <p>Members</p>
            <OptionMenu
              onClickPDF={() => setType("PDF")}
              onClickXSLX={() => setType("XSLX")}
              month={new Date(months[0] ?? "")}
              filter={membersParam}
              enabledUnpaidNotification={months.length === 1}
            />
          </CardTitle>
          <CardDescription>
            {typeof router.query.members !== "undefined" && router.query.members !== "All" ? (
              <p className="text-lg font-bold">
                {data.members.length} member{data.members.length > 1 || data.members.length === 0 ? "s" : ""}{" "}
                {data.members.length > 1 || data.members.length === 0 ? "have" : "has"} {filter} for the selected month
                {months.length > 1 ? "s" : ""} so far
              </p>
            ) : (
              <p className="text-lg font-bold">A list of all members.</p>
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
            count={data.members.length}
          />
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="border text-center">#</TableHead>
                <TableHead className="border text-center">Name</TableHead>
                <TableHead className="border text-center">Phone number</TableHead>
                <TableHead className="border text-center">Address</TableHead>
                <TableHead className="border text-center">Paid</TableHead>
                <TableHead className="border text-center">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.length !== 0 ? (
                data.members.map((member, index) => {
                  return (
                    <TableRow key={member.id}>
                      <TableCell onClick={() => router.push(`/member/${member.id}`)} className="cursor-pointer border text-center">
                        <Link className="flex items-center justify-center" href={`/member/${member.id}`}>
                          {index + 1}
                        </Link>
                      </TableCell>
                      <TableCell onClick={() => router.push(`/member/${member.id}`)} className="cursor-pointer border text-center">
                        <Link className="flex items-center justify-center" href={`/member/${member.id}`}>
                          {member.name}
                        </Link>
                      </TableCell>
                      <TableCell onClick={() => router.push(`/member/${member.id}`)} className="cursor-pointer border text-center">
                        <Link href={`/member/${member.id}`}>
                          {member.phoneNumber !== "" ? formatPhoneNumberIntl(member.phoneNumber) : "-"}
                        </Link>
                      </TableCell>
                      <TableCell onClick={() => router.push(`/member/${member.id}`)} className="cursor-pointer border text-center">
                        <Link href={`/member/${member.id}`}>
                          No {member.houseId} - {member.lane}
                        </Link>
                      </TableCell>
                      <TableCell className="border">
                        <Popover>
                          <PopoverTrigger className="flex w-full items-center justify-center">
                            {member.payment.partial ? (
                              <BadgeMinus color="orange" />
                            ) : member.payment.paid ? (
                              <BadgeCheck color="green" />
                            ) : (
                              <BadgeXIcon color="red" />
                            )}
                          </PopoverTrigger>
                          <PopoverContent className="flex flex-col items-center justify-center gap-2">
                            <Label className="mb-2 w-full text-left text-lg font-semibold">Payments</Label>
                            {months.map((month) => {
                              const monthDate = new Date(month);
                              const monthString = `${MONTHS[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
                              const payment = member.payments.find(
                                (payment) => payment.month.toDateString() === new Date(month).toDateString(),
                              );

                              return (
                                <div key={member.id + month} className="flex w-full gap-2">
                                  <p>{monthString}</p>
                                  {payment ? (
                                    payment.partial ? (
                                      <BadgeMinus className="ml-auto" color="orange" />
                                    ) : (
                                      <BadgeCheck className="ml-auto" color="green" />
                                    )
                                  ) : (
                                    <BadgeXIcon className="ml-auto" color="red" />
                                  )}
                                </div>
                              );
                            })}
                          </PopoverContent>
                        </Popover>
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
                  <TableCell colSpan={6} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableCaption>Currently, a total of {data.total} Members are on SVSA</TableCaption>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function OptionMenu({
  onClickPDF,
  onClickXSLX,
  month,
  filter,
  enabledUnpaidNotification,
}: {
  onClickPDF: () => void;
  onClickXSLX: () => void;
  month: Date;
  filter: MEMBERS_PAYMENT_FILTER_ENUM;
  enabledUnpaidNotification: boolean;
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
        {enabledUnpaidNotification && filter === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid && (
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

function generatePDF(data: RouterOutput["member"]["getMembers"], monthsText: string) {
  const pdfDocument = new jsPDF();
  const pageWidth = pdfDocument.internal.pageSize.width || pdfDocument.internal.pageSize.getWidth();

  pdfDocument.text(`${data.membersParam} members for  ${monthsText}`, pageWidth / 2, 10, { align: "center" });

  const head = [["Lane", "House Number", "Name", "Phone Number"]];

  if (data.membersParam === MEMBERS_PAYMENT_FILTER_ENUM.All) head[0]?.push(`Paid`);

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
        const memberData = [
          member.lane,
          member.houseId,
          member.name,
          member.phoneNumber === "" ? "-" : formatPhoneNumberIntl(member.phoneNumber),
        ];
        if (data.membersParam === MEMBERS_PAYMENT_FILTER_ENUM.All)
          memberData.push(member.payment.partial ? "PARTIAL" : member.payment.paid ? "YES" : "NO");
        return memberData;
      }),
    ],
  });

  pdfDocument.save(
    `SVSA - ${data.membersParam}${data.membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Partial ? " Paid" : ""} members for ${monthsText}.pdf`,
  );
}

function generateXSLX(data: RouterOutput["member"]["getMembers"], monthsText: string) {
  const workbook = XLSX.utils.book_new();
  const header = ["Lane", "House Number", "Name", "Phone Number", "Paid?"];

  const worksheetData = [
    header,
    ...data.members.map((member) => [
      member.lane,
      member.houseId,
      member.name,
      member.phoneNumber === "" ? "-" : formatPhoneNumberIntl(member.phoneNumber),
      member.payment.partial ? "PARTIAL" : member.payment.paid ? "YES" : "NO",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
  const xlsxFile: string = XLSX.write(workbook, { bookType: "xlsx", type: "binary" });
  const blob = new Blob([s2ab(xlsxFile)], { type: "application/octet-stream" });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SVSA - ${data.membersParam}${
    data.membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Partial ? " Paid" : ""
  } members for ${monthsText}.xlsx`;

  a.click();

  window.URL.revokeObjectURL(url);
}
