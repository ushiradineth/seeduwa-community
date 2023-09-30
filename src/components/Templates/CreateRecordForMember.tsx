import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import "react-calendar/dist/Calendar.css";

import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { api } from "@/utils/api";
import { MONTHS, YEARS } from "@/lib/consts";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { CreateRecordForMemberSchema, type CreateRecordForMemberFormData } from "@/lib/validators";
import { Button } from "../Atoms/Button";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Molecules/Select";

export default function CreateRecordForMember() {
  const [error, setError] = useState("");
  const router = useRouter();

  const { mutate: createRecord, isLoading: creatingRecord } = api.record.create.useMutation({
    onSuccess: async () => {
      await exitPopup(false);
      toast.success("Record created successfully");
    },
    onError: (error) => {
      setError(error.message);
    },
    onMutate: () => setError(""),
  });

  const form = useForm<CreateRecordForMemberFormData>({
    resolver: yupResolver(CreateRecordForMemberSchema),
  });

  function onSubmit(data: CreateRecordForMemberFormData) {
    createRecord({
      amount: data.Amount,
      memberId: data.Member,
      date: new Date(Date.UTC(data.Year, data.Month, 1)),
    });
  }

  const exitPopup = useCallback(
    (shallow: boolean) =>
      router.push(
        {
          query: removeQueryParamsFromRouter(router, [
            "mode",
            "payment",
            "month",
            "year",
            `${router.pathname === "/member/[memberId]" ? "" : "memberId"}`,
          ]),
        },
        undefined,
        { shallow },
      ),
    [router],
  );

  useEffect(() => {
    form.clearErrors();
    form.setValue("Member", String(router.query.memberId ?? ""));
    form.setValue("Amount", 2000);
    form.setValue("Month", Number(router.query.month ?? new Date().getMonth()));
    form.setValue("Year", Number(router.query.year ?? new Date().getFullYear()));
  }, [router.query.create, form, router.query.month, router.query.year, creatingRecord, router.query.memberId]);

  return (
    <Dialog open={router.query.mode === "new"} onOpenChange={() => exitPopup(true)}>
      <DialogContent className="dark text-white sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <DialogHeader>
              <DialogTitle>Add New Record</DialogTitle>
            </DialogHeader>

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
              name="Month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={String(field.value)} disabled>
                      <SelectTrigger>
                        <SelectValue placeholder={"Select month"} />
                      </SelectTrigger>
                      <SelectContent className="dark z-[250] w-max">
                        {MONTHS.map((month, index) => {
                          return (
                            <SelectItem key={month} value={String(index)}>
                              {month}
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
              name="Year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={String(field.value)} disabled>
                      <SelectTrigger>
                        <SelectValue placeholder={"Select year"} />
                      </SelectTrigger>
                      <SelectContent className="dark z-[250] w-max">
                        {YEARS.map((year) => {
                          return (
                            <SelectItem key={String(year)} value={String(year)}>
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

            <DialogFooter>
              <Button loading={creatingRecord} type="submit">
                Save Record
              </Button>
            </DialogFooter>
          </form>
          <DialogFooter className="flex items-center justify-center">{error && <FormFieldError error={`Error: ${error}`} />}</DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
