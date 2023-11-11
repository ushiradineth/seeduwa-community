import { yupResolver } from "@hookform/resolvers/yup";
import { CalendarIcon, X } from "lucide-react";
import Calendar from "react-calendar";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { DEFAULT_AMOUNT, MONTHS } from "@/lib/consts";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { CreateRecordSchema, type CreateRecordFormData } from "@/lib/validators";
import { Badge } from "../Atoms/Badge";
import { Button } from "../Atoms/Button";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Popover, PopoverContent, PopoverTrigger } from "../Molecules/Popover";

export default function CreateRecordForMember() {
  const [error, setError] = useState("");
  const [monthPicker, setMonthPicker] = useState(false);
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

  const form = useForm<CreateRecordFormData>({
    resolver: yupResolver(CreateRecordSchema),
  });

  function onSubmit(data: CreateRecordFormData) {
    createRecord({
      amount: data.Amount,
      memberId: data.Member,
      months: data.Months,
      paymentDate: data.PaymentDate,
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
    form.setValue("Amount", DEFAULT_AMOUNT);
    form.setValue("Months", [
      new Date(Number(router.query.year ?? new Date().getFullYear()), Number(router.query.month ?? new Date().getMonth()), 1),
    ]);
    form.setValue("PaymentDate", new Date());
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
              name="PaymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild className="w-full">
                        <Button
                          type="button"
                          variant={"outline"}
                          className={"flex h-10 max-w-full justify-start text-left font-normal hover:bg-bgc"}>
                          {field.value?.toDateString()}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="z-[1000] m-0 w-auto border-bc bg-bc p-0" align="start">
                        <div className="z-[1000] max-w-[300px] rounded-sm bg-card text-white">
                          <Calendar
                            defaultView="month"
                            defaultValue={field.value}
                            onClickDay={(date) => form.setValue("PaymentDate", date)}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="Months"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <FormControl>
                    <Popover open={monthPicker} onOpenChange={(open) => setMonthPicker(open)}>
                      <div className="flex w-full gap-2">
                        <PopoverTrigger asChild className="w-full" disabled={form.getValues("Member") === ""}>
                          <Button
                            type="button"
                            onClick={() => field.value.length === 0 && setMonthPicker(!monthPicker)}
                            variant={"outline"}
                            className={"flex h-12 max-w-fit justify-start text-left font-normal hover:bg-bgc"}>
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>

                        {field.value?.length === 0 ? (
                          <Button
                            variant={"outline"}
                            disabled={form.getValues("Member") === ""}
                            type="button"
                            onClick={() => field.value.length === 0 && setMonthPicker(!monthPicker)}
                            className={"flex h-full w-full justify-center text-left font-normal hover:bg-bgc"}>
                            {form.getValues("Member") === "" ? "Pick a user" : "Pick payment month(s)"}
                          </Button>
                        ) : (
                          <div className="flex w-full flex-wrap gap-1 rounded-sm border p-2">
                            {field.value?.map((month) => {
                              return (
                                <Badge key={month.toDateString()}>
                                  {MONTHS[new Date(month).getMonth()]} {month.getFullYear()}
                                  <X
                                    className="h-5 cursor-pointer"
                                    onClick={() =>
                                      form.setValue(
                                        "Months",
                                        field.value.filter((deletedMonth) => deletedMonth !== month),
                                      )
                                    }
                                  />
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <PopoverContent className="z-[1000] m-0 w-auto border-bc bg-bc p-0" align="start">
                        <div className="z-[1000] max-w-[300px] rounded-sm bg-card text-white">
                          <Calendar
                            defaultView="year"
                            maxDetail="year"
                            minDetail="year"
                            onClickMonth={(month) =>
                              form
                                .getValues("Months")
                                .filter(
                                  (innerMonth) =>
                                    month.getMonth() === innerMonth.getMonth() && month.getFullYear() === innerMonth.getFullYear(),
                                ).length === 0
                                ? form.setValue("Months", [...field.value, month])
                                : form.setValue(
                                    "Months",
                                    form
                                      .getValues("Months")
                                      .filter(
                                        (deletedMonth) =>
                                          month.getMonth() !== deletedMonth.getMonth() ||
                                          month.getFullYear() !== deletedMonth.getFullYear(),
                                      ),
                                  )
                            }
                            tileDisabled={() => form.getValues("Months").length > 0}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
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
          {error && (
            <DialogFooter className="flex items-center justify-center">
              <FormFieldError error={`Error: ${error}`} />
            </DialogFooter>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
