import { createServerSideHelpers } from "@trpc/react-query/server";
import { CalendarIcon, SearchIcon, X } from "lucide-react";
import moment from "moment";
import { getSession } from "next-auth/react";
import { log } from "next-axiom";
import Calendar from "react-calendar";
import SuperJSON from "superjson";
import { useState } from "react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";
import { useRouter } from "next/router";

import { Badge } from "@/components/Atoms/Badge";
import { Button } from "@/components/Atoms/Button";
import { Card } from "@/components/Molecules/Card";
import Filter from "@/components/Molecules/Filter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Molecules/Popover";
import Members from "@/components/Templates/Members";
import { MEMBERS_PAYMENT_FILTER, MEMBERS_PAYMENT_FILTER_ENUM, MONTHS } from "@/lib/consts";
import { removeTimezone } from "@/lib/utils";
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
  months: string[];
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
  const months =
    typeof context.query.months === "string"
      ? [
          ...context.query.months.split(",").map((month) =>
            removeTimezone()
              .month(month.split("+")[0] ?? "")
              .year(Number(month.split("+")[1]) ?? moment().year())
              .startOf("month")
              .toISOString(false),
          ),
        ]
      : [removeTimezone().startOf("month").toISOString(false)];

  const trpc = createServerSideHelpers({
    router: appRouter,
    ctx: {
      session,
      prisma,
      log,
    },
    transformer: SuperJSON,
  });

  await trpc.member.getMembers.prefetch({ members: membersParam, months, search });

  return {
    props: {
      trpcState: trpc.dehydrate(),
      membersParam,
      months,
      search,
    },
  };
};

export default function AllMembers({ membersParam, months, search }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Members - Seeduwa Village Security Association</title>
      </Head>
      <div className="flex max-w-[1024px] flex-col gap-4">
        <Card className="flex flex-col justify-between gap-4 p-4">
          <div className="flex items-center justify-between gap-4">
            <Filter label="Members" filterItems={MEMBERS_PAYMENT_FILTER} paramKey="members" value={membersParam} />
          </div>
          <MonthPicker months={months} />
        </Card>
        <Members months={months} membersParam={membersParam} search={search} />
      </div>
    </>
  );
}

function MonthPicker({ months: initialMonths }: { months: string[] }) {
  const router = useRouter();
  const [monthPicker, setMonthPicker] = useState(false);
  const [months, setMonths] = useState<Date[]>([...initialMonths.map((month) => removeTimezone(month).toDate())]);

  return (
    <Popover open={monthPicker} onOpenChange={(open) => setMonthPicker(open)}>
      <div className="flex w-full gap-2">
        <PopoverTrigger asChild className="w-full">
          <Button
            type="button"
            onClick={() => months.length === 0 && setMonthPicker(!monthPicker)}
            variant={"outline"}
            className={"flex h-10 max-w-fit justify-start text-left font-normal hover:bg-bgc"}>
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>

        {months.length === 0 ? (
          <Button
            variant={"outline"}
            type="button"
            onClick={() => months.length === 0 && setMonthPicker(!monthPicker)}
            className={"flex h-10 w-full justify-center text-left font-normal hover:bg-bgc"}>
            Pick filter month(s)
          </Button>
        ) : (
          <div className="flex w-full flex-col gap-2 rounded-sm border p-2 sm:flex-row">
            <div className="flex flex-wrap items-center gap-1">
              {months.map((month) => {
                return (
                  <Badge key={month.toDateString()} className="h-5 w-fit">
                    {MONTHS[removeTimezone(month).toDate().getMonth()]} {month.getFullYear()}
                    <X
                      className="h-5 w-5 cursor-pointer"
                      onClick={() => setMonths(months.filter((deletedMonth) => deletedMonth !== month))}
                    />
                  </Badge>
                );
              })}
            </div>
            {!arrayCompare(
              [...months.map((month) => month.toDateString())],
              [...initialMonths.map((month) => removeTimezone(month).toDate().toDateString())],
            ) ? (
              <Button
                type="button"
                onClick={() =>
                  router.push({
                    pathname: router.pathname,
                    query: { ...router.query, months: months.map((month) => `${month.getMonth()}+${month.getFullYear()}`).join(",") },
                  })
                }
                className="ml-auto w-full sm:h-full sm:w-fit">
                <SearchIcon className="h-4 w-4 text-black" />
              </Button>
            ) : (
              <></>
            )}
          </div>
        )}
      </div>

      <PopoverContent className="z-[1100] m-0 w-auto border-bc bg-bc p-0" align="start">
        <div className="z-[1000] max-w-[300px] rounded-sm bg-card text-white">
          <Calendar
            defaultView="year"
            maxDetail="year"
            minDetail="year"
            onClickMonth={(clickedMonth) => {
              months.filter(
                (paidMonth) => clickedMonth.getMonth() === paidMonth.getMonth() && clickedMonth.getFullYear() === paidMonth.getFullYear(),
              ).length === 0 &&
              months.filter(
                (selectedMonth) =>
                  clickedMonth.getMonth() === selectedMonth.getMonth() && clickedMonth.getFullYear() === selectedMonth.getFullYear(),
              ).length === 0
                ? setMonths([...months, clickedMonth].sort((a, b) => a.getTime() - b.getTime()))
                : setMonths(
                    months
                      .filter(
                        (deletedMonth) =>
                          clickedMonth.getMonth() !== deletedMonth.getMonth() || clickedMonth.getFullYear() !== deletedMonth.getFullYear(),
                      )
                      .sort((a, b) => a.getTime() - b.getTime()),
                  );
            }}
            tileClassName={(args) => {
              if (
                months.filter((month) => month.getMonth() === args.date.getMonth() && month.getFullYear() === args.date.getFullYear())
                  .length > 0
              ) {
                return "react-calendar--selected_tiles";
              } else if (
                months.filter(
                  (paidMonth) => args.date.getMonth() === paidMonth.getMonth() && args.date.getFullYear() === paidMonth.getFullYear(),
                ).length !== 0
              ) {
                return "react-calendar--paid_tiles";
              }
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function arrayCompare<T>(array1: T[], array2: T[]): boolean {
  if (array1.length !== array2.length) {
    return false;
  }

  // Sort the arrays before comparing
  const sortedArray1 = [...array1].sort();
  const sortedArray2 = [...array2].sort();

  return sortedArray1.every((value, index) => value === sortedArray2[index]);
}
