import moment from "moment";
import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";
import { useRouter } from "next/router";

import { Label } from "@/components/Atoms/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Molecules/Select";
import Dashboard from "@/components/Templates/Dashboard";
import { ITEMS_PER_PAGE, YEARS } from "@/lib/consts";
import { prisma } from "@/server/db";

export type Member = {
  id: string;
  houseId: string;
  name: string;
  lane: string;
  payments: {
    id: string;
    date: string;
  }[];
};

export type Props = {
  members: Member[];
  count: number;
  year: number;
};

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const session = await getSession({ ctx: context });

  if (!session) {
    return {
      redirect: {
        destination: "/auth",
        permanent: false,
      },
      props: {},
    };
  }

  const search = context.query.search ? (context.query.search as string).split(" ").join(" | ") : "";
  const recordYear = context.query.recordYear ? Number(context.query.recordYear) : new Date().getFullYear();

  const where =
    search !== ""
      ? { AND: [{ active: true }, { OR: [{ name: { search: search } }, { houseId: { search: search } }, { lane: { search: search } }] }] }
      : { active: true };

  const members = await prisma.member.findMany({
    take: ITEMS_PER_PAGE,
    skip: context.query.page ? (Number(context.query.page) - 1) * ITEMS_PER_PAGE : 0,
    where,
    select: {
      id: true,
      houseId: true,
      name: true,
      lane: true,
      payments: {
        where: {
          active: true,
          date: {
            gt: moment().year(recordYear).startOf("year").toDate(),
            lt: moment().year(recordYear).endOf("year").toDate(),
          },
        },
        select: {
          id: true,
          date: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const count = await prisma.member.count({
    where,
  });

  return {
    props: {
      members: members.map((member) => ({
        ...member,
        payments: member.payments.map((payment) => {
          return { ...payment, date: payment.date.toISOString() };
        }),
      })),
      count,
      year: recordYear,
    },
  };
};

export default function TableDashboard({ members, count, year }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Records - Seeduwa Community</title>
      </Head>
      <main className="dark flex flex-col items-center justify-center">
        <div className="flex w-full gap-8 py-4">
          <div className="flex flex-col gap-2">
            <Label>Year</Label>
            <Select defaultValue={String(year)} onValueChange={(year) => router.push({ query: { ...router.query, recordYear: year } })}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark z-[250] w-max">
                {YEARS.map((year) => {
                  return (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Dashboard members={members} count={count} year={year} />
      </main>
    </>
  );
}
