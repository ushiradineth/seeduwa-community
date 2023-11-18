import { Edit } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { ITEMS_PER_PAGE, MONTHS } from "@/lib/consts";
import { type Props, type Record } from "@/pages/record";
import PageNumbers from "../Atoms/PageNumbers";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../Molecules/Card";
import Search from "../Molecules/Search";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../Molecules/Table";

export default function Records({ records: initialRecords, count, total }: Props) {
  const router = useRouter();
  const pageNumber = Number(router.query.page ?? 1);
  const [records, setRecords] = useState<Record[]>(initialRecords);

  useEffect(() => {
    initialRecords !== records && setRecords(initialRecords);
  }, [initialRecords, records]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Records</CardTitle>
        <CardDescription>A list of all records.</CardDescription>
      </CardHeader>
      <CardContent>
        <Search
          classname="pb-4"
          search={router.query.search as string}
          placeholder="Search for Records"
          path={router.asPath}
          params={router.query}
          count={count}
        />
        <Table className="border">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Member</TableHead>
              <TableHead className="text-center">Amount</TableHead>
              <TableHead className="text-center">Period</TableHead>
              <TableHead className="text-center">Paid on</TableHead>
              <TableHead className="text-center">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length !== 0 ? (
              records.map((record) => {
                return (
                  <TableRow key={record.id}>
                    <TableCell onClick={() => router.push(`/member/${record.member.id}`)} className="cursor-pointer text-center">
                      <Link href={`/member/${record.member.id}`} className="max-w-24 flex items-center justify-center truncate">
                        {record.member.name}
                      </Link>
                    </TableCell>
                    <TableCell onClick={() => router.push(`/record/${record.id}`)} className="cursor-pointer text-center">
                      <Link href={`/record/${record.id}`}>LKR {record.amount.toLocaleString()}</Link>
                    </TableCell>
                    <TableCell onClick={() => router.push(`/record/${record.id}`)} className="cursor-pointer text-center">
                      <Link href={`/record/${record.id}`}>
                        {MONTHS[new Date(record.month).getMonth()]} {new Date(record.month).getFullYear()}
                      </Link>
                    </TableCell>
                    <TableCell onClick={() => router.push(`/record/${record.id}`)} className="cursor-pointer text-center">
                      <Link href={`/record/${record.id}`}>{record.paymentAt}</Link>
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
                                payment: record.id,
                                month: new Date(record.month).getMonth(),
                                year: new Date(record.month).getFullYear(),
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
                <TableCell colSpan={5} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableCaption>Currently, a total of {total} Records are on SVC</TableCaption>
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
