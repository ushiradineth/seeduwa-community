import { type Payment } from "@prisma/client";
import { getSession } from "next-auth/react";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import { useCallback, useMemo } from "react";
import { type GetServerSideProps, type InferGetServerSidePropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { Button } from "@/components/Atoms/Button";
import { Card } from "@/components/Molecules/Card";
import Carousel from "@/components/Molecules/Carousel";
import { MONTHS, YEARS } from "@/lib/consts";
import { formalizeDate } from "@/lib/utils";
import { prisma } from "@/server/db";

export type Props = {
  member: {
    id: string;
    phoneNumber: string;
    createdAt: string;
    houseId: string;
    name: string;
    lane: string;
    active: boolean;
    payments: {
      id: string;
      createdAt: string;
      amount: number;
      active: boolean;
      month: string;
      memberId: string;
    }[];
  };
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

  const member = await prisma.member.findFirst({
    where: {
      id: context.params?.memberId as string,
      active: true,
    },
    include: { payments: { where: { active: true } } },
  });

  if (!member) return { notFound: true };

  return {
    props: {
      member: {
        ...member,
        createdAt: formalizeDate(member.createdAt),
        payments: member.payments.map((payment: Payment) => {
          return {
            ...payment,
            createdAt: formalizeDate(payment.createdAt),
            paymentAt: formalizeDate(payment.paymentAt),
            month: formalizeDate(payment.month),
          };
        }),
      },
    },
  };
};

export default function Member({ member }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();

  const paymentFilter = useCallback(
    (month: string, year: number) => {
      return member.payments.find((payment) => {
        const paymentDate = new Date(payment.month);
        const paymentMonth = paymentDate.toLocaleString("en-US", { month: "long" });
        const paymentYear = paymentDate.getFullYear().toString();

        return paymentMonth === month && paymentYear === String(year) ? payment : undefined;
      });
    },
    [member.payments],
  );

  const total = useMemo(() => member.payments.reduce((acc, cur) => acc + cur.amount, 0).toFixed(0), [member.payments]);

  return (
    <>
      <Head>
        <title>{member.name} - Seeduwa Village Security Association</title>
      </Head>
      <Card className="flex flex-col justify-center gap-4 p-4">
        <div className="flex flex-col gap-1">
          <span className="flex items-center">
            <p className="text-2xl font-semibold">{member.name}</p>
            <Button
              className="ml-auto w-fit"
              onClick={() =>
                router.push({
                  href: router.asPath,
                  query: { ...router.query, member: member.id, action: "edit" },
                })
              }>
              Edit
            </Button>
          </span>
          <p>
            No.{member.houseId} - {member.lane}
          </p>
          <Link href={`tel:${member.phoneNumber}`}>{formatPhoneNumberIntl(member.phoneNumber)}</Link>
          <p>LKR {Number(total).toLocaleString()}</p>
        </div>
        <Carousel navButtons activeIndex={YEARS.findIndex((year) => year === new Date().getFullYear())}>
          {YEARS.map((year) => (
            <div key={year} className="w-[300px] select-none px-1 md:w-[400px]">
              <p className="flex items-center justify-center rounded-t-2xl border border-b p-4 font-semibold">{year}</p>
              <div className="grid grid-cols-3">
                {MONTHS.map((month, index) => {
                  const payment = paymentFilter(month, year);
                  return (
                    <div
                      key={`${month}-${year}`}
                      onClick={() =>
                        router.push(
                          {
                            query: {
                              ...router.query,
                              mode: payment ? "edit" : "new",
                              payment: payment ? payment.id : null,
                              month: index,
                              year,
                            },
                          },
                          undefined,
                          {
                            shallow: true,
                          },
                        )
                      }
                      className={`flex items-center justify-center border p-8 active:bg-accent ${index === 9 && "rounded-bl-2xl"} ${
                        index === 11 && "rounded-br-2xl"
                      } ${payment ? "bg-green-500 hover:bg-green-600" : "hover:bg-accent/90"}`}>
                      {month}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </Carousel>
      </Card>
    </>
  );
}
