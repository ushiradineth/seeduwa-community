import { Edit } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { ITEMS_PER_PAGE, MONTHS } from "@/lib/consts";
import { removeTimezone } from "@/lib/utils";
import { type Payment, type Props } from "@/pages/payment";
import PageNumbers from "../Atoms/PageNumbers";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../Molecules/Card";
import Search from "../Molecules/Search";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../Molecules/Table";

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
        <CardTitle>Payments</CardTitle>
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
