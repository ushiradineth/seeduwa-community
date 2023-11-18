import moment from "moment";
import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import { Card } from "@/components/Molecules/Card";
import Filter from "@/components/Molecules/Filter";
import Members from "@/components/Templates/Members";
import { ITEMS_PER_PAGE, ITEMS_PER_PAGE_FILTER, MEMBERS_PAYMENT_FILTER, MEMBERS_PAYMENT_FILTER_ENUM, MONTHS, YEARS } from "@/lib/consts";
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
  itemsPerPage: number;
  search: string;
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
  const itemsPerPage = ITEMS_PER_PAGE_FILTER.includes(Number(context.query.itemsPerPage))
    ? Number(context.query.itemsPerPage)
    : ITEMS_PER_PAGE;
  let membersFilter = {};
  const monthIndex = MONTHS.findIndex((value) => value === month);
  const paymentMonth = moment().year(year).month(monthIndex).startOf("month").utcOffset(0, true).format();

  if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Paid) {
    membersFilter = {
      some: {
        active: true,
        month: { equals: paymentMonth },
      },
    };
  } else if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid) {
    membersFilter = {
      none: {
        active: true,
        month: { equals: paymentMonth },
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
    take: itemsPerPage,
    skip: context.query.page ? (Number(context.query.page) - 1) * itemsPerPage : 0,
    where,
    select: {
      id: true,
      phoneNumber: true,
      houseId: true,
      name: true,
      lane: true,
      payments: {
        where: { active: true, month: { equals: paymentMonth } },
        select: { id: true, month: true },
      },
    },
    orderBy: { lane: "asc" },
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
      itemsPerPage,
      search,
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
  itemsPerPage,
  search,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Members - Seeduwa Village Security Association</title>
      </Head>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col justify-between gap-4 p-4 md:flex-row">
          <Filter label="Members" filterItems={MEMBERS_PAYMENT_FILTER} paramKey="members" value={membersParam} />
          {membersParam !== MEMBERS_PAYMENT_FILTER_ENUM.All && (
            <>
              <Filter label="Month" filterItems={MONTHS} paramKey="filterMonth" value={month} />
              <Filter label="Year" filterItems={YEARS} paramKey="filterYear" value={String(year)} />
            </>
          )}
          <Filter filterItems={ITEMS_PER_PAGE_FILTER} label="Items per page" paramKey="itemsPerPage" value={itemsPerPage} />
        </Card>
        <Members
          members={members}
          count={count}
          total={total}
          year={year}
          month={month}
          membersParam={membersParam}
          itemsPerPage={itemsPerPage}
          search={search}
        />
      </div>
    </>
  );
}
