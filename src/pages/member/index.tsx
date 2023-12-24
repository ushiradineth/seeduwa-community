import { createServerSideHelpers } from "@trpc/react-query/server";
import { getSession } from "next-auth/react";
import { log } from "next-axiom";
import SuperJSON from "superjson";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";

import { Card } from "@/components/Molecules/Card";
import Filter from "@/components/Molecules/Filter";
import Members from "@/components/Templates/Members";
import { ITEMS_PER_PAGE, ITEMS_PER_PAGE_FILTER, MEMBERS_PAYMENT_FILTER, MEMBERS_PAYMENT_FILTER_ENUM, MONTHS, YEARS } from "@/lib/consts";
import { appRouter } from "@/server/api/root";
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
  const membersParam = String(context.query.members ?? MEMBERS_PAYMENT_FILTER_ENUM.All) as MEMBERS_PAYMENT_FILTER_ENUM;
  const year = Number(context.query.filterYear ?? new Date().getFullYear());
  const month = String(context.query.filterMonth ?? MONTHS[new Date().getMonth()]);
  const itemsPerPage = ITEMS_PER_PAGE_FILTER.includes(Number(context.query.itemsPerPage))
    ? Number(context.query.itemsPerPage)
    : ITEMS_PER_PAGE;
  const page = Number(context.query.page ?? 1);

  const trpc = createServerSideHelpers({
    router: appRouter,
    ctx: {
      session,
      prisma,
      log,
    },
    transformer: SuperJSON,
  });

  await trpc.member.getMembers.prefetch({ itemsPerPage, members: membersParam, month, year, page, search });

  return {
    props: {
      trpcState: trpc.dehydrate(),
      membersParam,
      month,
      year,
      itemsPerPage,
      search,
    },
  };
};

export default function AllMembers({
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
