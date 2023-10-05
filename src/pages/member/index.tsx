import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import Filter from "@/components/Molecules/Filter";
import Members from "@/components/Templates/Members";
import { ITEMS_PER_PAGE, MEMBERS_PAYMENT_FILTER, MEMBERS_PAYMENT_FILTER_ENUM, MONTHS, YEARS } from "@/lib/consts";
import { prisma } from "@/server/db";

export type Member = {
  id: string;
  phoneNumber: string;
  houseId: string;
  name: string;
  lane: string;
  payment: boolean;
};

export type Props = {
  members: Member[];
  count: number;
  total: number;
  membersParam: MEMBERS_PAYMENT_FILTER_ENUM;
  year: number;
  month: string;
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

  const search = context.query.search ? (context.query.search as string).split(" ").join(" <-> ") : "";
  const membersParam = String(context.query.members ?? "All") as MEMBERS_PAYMENT_FILTER_ENUM;
  const year = Number(context.query.filterYear ?? new Date().getFullYear());
  const month = String(context.query.filterMonth ?? MONTHS[new Date().getMonth()]);

  let membersFilter = {};

  const monthIndex = MONTHS.findIndex((value) => value === month);

  if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Paid) {
    membersFilter = {
      some: {
        active: true,
        date: { equals: new Date(year, monthIndex, 1) },
      },
    };
  } else if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid) {
    membersFilter = {
      none: {
        active: true,
        date: { equals: new Date(year, monthIndex, 1) },
      },
    };
  }

  const where =
    search !== ""
      ? {
          AND: [
            { active: true },
            {
              OR: [
                { name: { search: search } },
                { phoneNumber: { search: search } },
                { houseId: { search: search } },
                { lane: { search: search } },
              ],
            },
            { payments: { ...membersFilter } },
          ],
        }
      : {
          active: true,
          payments: { ...membersFilter },
        };

  const members = await prisma.member.findMany({
    take: ITEMS_PER_PAGE,
    skip: context.query.page ? (Number(context.query.page) - 1) * ITEMS_PER_PAGE : 0,
    where,
    select: {
      id: true,
      phoneNumber: true,
      houseId: true,
      name: true,
      lane: true,
      payments: { where: { active: true, date: { equals: new Date(year, monthIndex, 1) } }, select: { id: true, date: true } },
    },
    orderBy: {
      _relevance: {
        fields: ["name", "houseId", "lane"],
        search,
        sort: "asc",
      },
    },
  });

  const count = await prisma.member.count({
    where,
  });

  const total = await prisma.member.count({ where: { active: true } });

  return {
    props: {
      members: members.map((member) => ({
        ...member,
        payments: {},
        payment: member.payments.length > 0,
      })),
      count,
      total,
      membersParam,
      month,
      year,
    },
  };
};

export default function AllMembers({
  members,
  count,
  total,
  membersParam,
  year,
  month,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Members - Seeduwa Village Security Association</title>
      </Head>
      <main className="dark flex flex-col items-center justify-center px-4">
        <div className="flex w-full gap-8 py-4">
          <Filter label="Members" filterItems={MEMBERS_PAYMENT_FILTER} paramKey="members" value={membersParam} />
          {membersParam !== MEMBERS_PAYMENT_FILTER_ENUM.All && (
            <>
              <Filter label="Month" filterItems={MONTHS} paramKey="filterMonth" value={month} />
              <Filter label="Year" filterItems={YEARS} paramKey="filterYear" value={String(year)} />
            </>
          )}
        </div>
        <Members members={members} count={count} total={total} year={year} month={month} membersParam={membersParam} />
      </main>
    </>
  );
}
