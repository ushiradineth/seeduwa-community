import { BadgeCheck, BadgeXIcon, Edit } from "lucide-react";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { ITEMS_PER_PAGE } from "@/lib/consts";
import { type Member, type Props } from "@/pages/member";
import PageNumbers from "../Atoms/PageNumbers";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../Molecules/Card";
import Search from "../Molecules/Search";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../Molecules/Table";

export default function Members({ members: initialMembers, count, total, year, month }: Props) {
  const router = useRouter();
  const pageNumber = Number(router.query.page ?? 1);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const filter = String((router.query.members ?? "") === "Unpaid" ? "not paid" : "paid").toLowerCase();

  useEffect(() => {
    initialMembers !== members && setMembers(initialMembers);
  }, [initialMembers, members]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          {typeof router.query.members !== "undefined" && router.query.members !== "All" && (
            <p className="text-lg font-bold">
              {count} members have {filter} for {month} {year} so far
            </p>
          )}
        </CardDescription>
        <Search
          search={router.query.search as string}
          placeholder="Search for members"
          path={router.asPath}
          params={router.query}
          count={count}
        />
      </CardHeader>
      <CardContent>
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
                      <Link href={`/member/${member.id}`}>{formatPhoneNumberIntl(member.phoneNumber)}</Link>
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
                    <TableCell>
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
                <TableCell colSpan={4} className="h-24 text-center">
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
