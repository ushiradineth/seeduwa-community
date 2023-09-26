import { Label } from "@radix-ui/react-label";
import { getSession } from "next-auth/react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";
import { useRouter } from "next/router";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Molecules/Select";
import Members from "@/components/Templates/Members";
import { ITEMS_PER_PAGE, MEMBERS_PAYMENT_FILTER, MEMBERS_PAYMENT_FILTER_ENUM } from "@/lib/consts";
import { prisma } from "@/server/db";

export type Member = {
  id: string;
  houseId: string;
  name: string;
  lane: string;
  payment: boolean;
};

export type Props = {
  members: Member[];
  count: number;
  total: number;
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
  const membersParam = String(context.query.members ?? "All") as MEMBERS_PAYMENT_FILTER_ENUM;

  let membersFilter = {};

  if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Paid) {
    membersFilter = {
      some: {
        active: true,
        date: {
          equals: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)),
        },
      },
    };
  } else if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid) {
    membersFilter = {
      none: {
        active: true,
        date: {
          equals: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)),
        },
      },
    };
  }

  const where =
    search !== ""
      ? {
          AND: [
            { active: true },
            { OR: [{ name: { search: search } }, { houseId: { search: search } }, { lane: { search: search } }] },
            membersFilter,
          ],
        }
      : {
          active: true,
          payments: {
            ...membersFilter,
          },
        };

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
            equals: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)),
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

  console.log(members[0]?.payments);

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
    },
  };
};

export default function AllMembers({ members, count, total }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  return (
    <>
      <Head>
        <title>Members | Seeduwa Community</title>
      </Head>
      <main className="dark flex flex-col items-center justify-center">
        <div className="flex w-full gap-8 py-4">
          <div className="flex flex-col gap-2">
            <Label>Members</Label>
            <Select
              defaultValue={String(router.query.members ?? "All")}
              onValueChange={(value) => router.push({ query: { ...router.query, members: value === "All" ? undefined : value } })}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark z-[250] w-max">
                {MEMBERS_PAYMENT_FILTER.map((value) => {
                  return (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Members members={members} count={count} total={total} />
      </main>
    </>
  );
}
