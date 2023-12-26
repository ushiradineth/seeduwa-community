import { createServerSideHelpers } from "@trpc/react-query/server";
import { Coins, User } from "lucide-react";
import { getSession } from "next-auth/react";
import { log } from "next-axiom";
import SuperJSON from "superjson";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";
import { useRouter } from "next/router";

import { Button } from "@/components/Atoms/Button";
import { Card } from "@/components/Molecules/Card";
import Filter from "@/components/Molecules/Filter";
import Dashboard from "@/components/Templates/Dashboard";
import { ITEMS_PER_PAGE, ITEMS_PER_PAGE_FILTER, LANE_FILTER, YEARS } from "@/lib/consts";
import { appRouter } from "@/server/api/root";
import { prisma } from "@/server/db";

export type Member = {
  id: string;
  houseId: string;
  name: string;
  lane: string;
  payments: {
    id: string;
    month: string;
    amount: number;
    partial: boolean;
  }[];
};

export type Props = {
  year: number;
  itemsPerPage: number;
  search: string;
  lane: string;
  page: number;
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
  const paymentYear = YEARS.includes(Number(context.query.paymentYear)) ? Number(context.query.paymentYear) : new Date().getFullYear();
  const itemsPerPage = ITEMS_PER_PAGE_FILTER.includes(Number(context.query.itemsPerPage))
    ? Number(context.query.itemsPerPage)
    : ITEMS_PER_PAGE;
  const lane = LANE_FILTER.includes(String(context.query.lane)) ? String(context.query.lane) : LANE_FILTER[0]!;
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

  await trpc.member.getDashboard.prefetch({ search, year: paymentYear, lane, page, itemsPerPage });

  return {
    props: {
      trpcState: trpc.dehydrate(),
      year: paymentYear,
      itemsPerPage,
      search,
      lane,
      page,
    },
  };
};

export default function TableDashboard({ year, itemsPerPage, search, lane, page }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Dashboard - Seeduwa Village Security Association</title>
      </Head>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col justify-between gap-4 p-4">
          <div className="flex w-full flex-col gap-4 md:flex-row">
            <Button
              variant={"outline"}
              className="flex w-full gap-2"
              onClick={() => router.push({ query: { ...router.query, create: "member" } }, undefined, { shallow: true })}>
              <User /> Add new member
            </Button>
            <Button
              variant={"outline"}
              className="flex w-full gap-2"
              onClick={() => router.push({ query: { ...router.query, create: "payment" } }, undefined, { shallow: true })}>
              <Coins /> Add new payment
            </Button>
          </div>
          <div className="flex w-full flex-col gap-4 md:flex-row">
            <Filter filterItems={YEARS} label="Year" paramKey="paymentYear" value={year} />
            <Filter filterItems={ITEMS_PER_PAGE_FILTER} label="Items per page" paramKey="itemsPerPage" value={itemsPerPage} />
            <Filter filterItems={LANE_FILTER} label="Lane" paramKey="lane" value={lane} />
          </div>
        </Card>
        <Dashboard year={year} itemsPerPage={itemsPerPage} search={search} lane={lane} page={page} />
      </div>
    </>
  );
}
