import { type inferRouterOutputs } from "@trpc/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BadgeCheck, BadgeXIcon, Edit, FileText, MoreVertical, Plus, Sheet } from "lucide-react";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import * as XLSX from "xlsx";
import { useEffect, useState } from "react";
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
import { ITEMS_PER_PAGE, MEMBERS_PAYMENT_FILTER_ENUM } from "@/lib/consts";
import { s2ab } from "@/lib/utils";
import { type Member, type Props } from "@/pages/member";
import { type AppRouter } from "@/server/api/root";
import PageNumbers from "../Atoms/PageNumbers";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../Molecules/Card";
import Search from "../Molecules/Search";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../Molecules/Table";

export default function Members({ members: initialMembers, count, total, year, month, membersParam, search }: Props) {
  const router = useRouter();
  const pageNumber = Number(router.query.page ?? 1);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const filter = String(membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid ? "not paid" : "paid").toLowerCase();
  const { mutate } = api.member.getMemberDocumentData.useMutation({
    onSuccess: (data, variables) => {
      if (variables.type === "PDF") generatePDF(data);
      else if (variables.type === "XSLX") generateXSLX(data);
    },
  });

  useEffect(() => {
    initialMembers !== members && setMembers(initialMembers);
  }, [initialMembers, members]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex w-full items-center justify-center gap-2">
          <p>Members</p>
          <OptionMenu
            onClickPDF={() => mutate({ members: membersParam, month, year, search, type: "PDF" })}
            onClickXSLX={() => mutate({ members: membersParam, month, year, search, type: "XSLX" })}
          />
        </CardTitle>
        <CardDescription>
          {typeof router.query.members !== "undefined" && router.query.members !== "All" ? (
            <p className="text-lg font-bold">
              {count} members have {filter} for {month} {year} so far
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
          count={count}
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
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length !== 0 ? (
              members.map((member) => {
                return (
                  <TableRow key={member.id}>
                    <TableCell onClick={() => router.push(`/member/${member.id}`)} className="cursor-pointer text-center">
                      <Link className="max-w-24 flex truncate" href={`/member/${member.id}`}>
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
          <TableCaption>Currently, a total of {total} Members are on SVC</TableCaption>
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

function generatePDF(data: RouterOutput["member"]["getMemberDocumentData"]) {
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

function generateXSLX(data: RouterOutput["member"]["getMemberDocumentData"]) {
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
  a.download = `SVSA - ${data.membersParam} ${
    data.membersParam !== MEMBERS_PAYMENT_FILTER_ENUM.All ? `members for ${data.month} ${data.year}` : ""
  }.xlsx`;

  a.click();

  window.URL.revokeObjectURL(url);
}
