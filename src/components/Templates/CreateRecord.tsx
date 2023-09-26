import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import "react-calendar/dist/Calendar.css";

import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { api } from "@/utils/api";
import { LANE, MONTHS, YEARS } from "@/lib/consts";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { CreateRecordSchema, type CreateRecordFormData } from "@/lib/validators";
import { Button } from "../Atoms/Button";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import Loader from "../Atoms/Loader";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Molecules/Select";

export default function CreateRecord() {
  const [error, setError] = useState("");
  const [years, setYears] = useState<{ year: number; months: string[] }[]>();
  const [months, setMonths] = useState<string[]>([]);
  const router = useRouter();

  const { mutate: createRecord, isLoading: creatingRecord } = api.record.create.useMutation({
    onSuccess: async () => {
      await router.push({ query: removeQueryParamsFromRouter(router, ["create"]) });
      toast.success("Record created successfully");
    },
    onError: (error) => {
      setError(error.message);
    },
    onMutate: () => setError(""),
  });

  const { data: members, mutate: getMembers, isLoading: gettingMembers } = api.member.getAllByLane.useMutation();

  const form = useForm<CreateRecordFormData>({
    resolver: yupResolver(CreateRecordSchema),
  });

  function onSubmit(data: CreateRecordFormData) {
    createRecord({
      amount: data.Amount,
      memberId: data.Member,
      date: new Date(Date.UTC(data.Year, Number(data.Month), 1)),
    });
  }

  const calculateMonths = useCallback(
    (currentYear: number, internalYears?: { year: number; months: string[] }[]) =>
      setMonths((internalYears ?? years)?.filter((year) => year.year === currentYear)[0]?.months ?? []),
    [years],
  );

  const calculateMemberMonths = useCallback(() => {
    const unpaidMonths: { year: number; months: string[] }[] = [];

    YEARS?.forEach((year) => {
      const paidMonthsForYear = members
        ?.find((member) => form.watch("Member") === member.id)
        ?.payments.filter((payment) => payment.date.getFullYear() === year)
        .map((payment) => payment.date.getMonth());

      const unpaidMonthsForYear = MONTHS.filter((month: string, index: number) => !paidMonthsForYear?.includes(index));

      unpaidMonths.push({ year: year, months: unpaidMonthsForYear });
    });

    setYears(unpaidMonths);
    calculateMonths(Number(form.watch("Year")), unpaidMonths);
  }, [calculateMonths, form, members]);

  useEffect(() => {
    form.clearErrors();
    form.setValue("Member", "");
    form.setValue("Amount", 2000);
  }, [router.query.create, form]);

  return (
    <Dialog
      open={router.query.create === "record"}
      onOpenChange={() => router.push({ query: removeQueryParamsFromRouter(router, ["create"]) }, undefined, { shallow: true })}>
      <DialogContent className="dark text-white sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <DialogHeader>
              <DialogTitle>Create Record</DialogTitle>
              <DialogDescription>Add new payment record to the SVS List.</DialogDescription>
            </DialogHeader>
            <FormField
              control={undefined}
              name="Lane"
              render={() => (
                <FormItem>
                  <FormLabel>Lane</FormLabel>
                  <FormControl>
                    <Select onValueChange={(value) => getMembers({ lane: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lane" />
                      </SelectTrigger>
                      <SelectContent className="dark z-[250] w-max">
                        {LANE.map((lane) => {
                          return (
                            <SelectItem key={lane} value={lane}>
                              {lane}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="Member"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(e) => {
                        field.onChange(e);
                        calculateMemberMonths();
                      }}
                      disabled={!Array.isArray(members) || members?.length === 0}>
                      <SelectTrigger>
                        {gettingMembers ? (
                          <div className="flex w-full items-center justify-center">
                            <Loader />
                          </div>
                        ) : (
                          <SelectValue
                            placeholder={
                              !Array.isArray(members) || members?.length === 0 ? "No members found in this lane" : "Select a member"
                            }
                          />
                        )}
                      </SelectTrigger>
                      <SelectContent className="dark z-[250] w-max">
                        {Array.isArray(members) &&
                          members.map((member) => {
                            return (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="Amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input placeholder="Amount" type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="Year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(e) => {
                        field.onChange(e);
                        calculateMonths(Number(form.watch("Year")));
                      }}
                      disabled={form.watch("Member") === ""}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={form.watch("Member") === "" ? "Pick a member to get the eligible years" : "Select year"}
                          defaultValue={String(field.value)}
                        />
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="Month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} disabled={months?.length === 0}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={form.watch("Year") === undefined ? "Pick a year to get the eligible months" : "Select month"}
                          defaultValue={String(field.value)}
                        />
                      </SelectTrigger>
                      <SelectContent className="dark z-[250] w-max">
                        {months?.map((month, index) => (
                          <SelectItem key={month} value={String(index)}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button loading={creatingRecord} type="submit">
                Save record
              </Button>
            </DialogFooter>
          </form>
        </Form>
        <DialogFooter className="flex items-center justify-center">{error && <FormFieldError error={`Error: ${error}`} />}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
