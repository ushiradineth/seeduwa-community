import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { ITEMS_PER_PAGE, MONTHS } from "@/lib/consts";
import { type Member, type Props } from "@/pages";
import PageNumbers from "../Atoms/PageNumbers";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../Molecules/Card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../Molecules/Table";

export default function Dashboard({ members: initialMembers, count, year }: Props) {
  const router = useRouter();
  const pageNumber = Number(router.query.page ?? 1);
  const [Members, setMembers] = useState<Member[]>(initialMembers);

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
        <CardTitle>{`Seeduwa Community Records - ${year}`}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="border">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Member</TableHead>
              {MONTHS.map((month) => (
                <TableHead key={month} className="text-center">
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
                          className={` border active:bg-accent ${payment ? "bg-green-500 hover:bg-green-600" : "hover:bg-accent/90"}`}>
                          {month}
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
