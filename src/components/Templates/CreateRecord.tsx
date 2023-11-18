import { yupResolver } from "@hookform/resolvers/yup";
import { CalendarIcon, X } from "lucide-react";
import Calendar from "react-calendar";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { DEFAULT_AMOUNT, LANE, MONTHS, YEARS } from "@/lib/consts";
import { generateThankYouMessage, removeQueryParamsFromRouter } from "@/lib/utils";
import { CreateRecordSchema, type CreateRecordFormData } from "@/lib/validators";
import { Badge } from "../Atoms/Badge";
import { Button } from "../Atoms/Button";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import Loader from "../Atoms/Loader";
import { Switch } from "../Atoms/Switch";
import { Textarea } from "../Atoms/Textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Popover, PopoverContent, PopoverTrigger } from "../Molecules/Popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Molecules/Select";

export default function CreateRecord() {
  const [error, setError] = useState("");
  const [months, setMonths] = useState<Date[]>([]);
  const [monthPicker, setMonthPicker] = useState(false);
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
      months: data.Months,
      paymentDate: data.PaymentDate,
      notify: data.Notify,
      text: data.Text,
    });
  }

  const calculateMemberMonths = useCallback(() => {
    const paidMonths: Date[] = [];

    YEARS?.forEach((year) => {
      const a = members
        ?.find((member) => form.watch("Member") === member.id)
        ?.payments.filter((payment) => payment.month.getFullYear() === year)
        .map((payment) => payment.month);

      if (a) paidMonths.push(...a);
    });

    setMonths(paidMonths);
  }, [form, members]);

  useEffect(() => {
    form.clearErrors();
    form.setValue("Member", "");
    form.setValue("Amount", DEFAULT_AMOUNT);
    form.setValue("Months", []);
    form.setValue("PaymentDate", new Date());
    form.setValue("Notify", false);
    form.setValue("Text", generateThankYouMessage(DEFAULT_AMOUNT, []));
  }, [router.query.create, form]);

  return (
    <Dialog
      open={router.query.create === "record"}
      onOpenChange={() => router.push({ query: removeQueryParamsFromRouter(router, ["create"]) }, undefined, { shallow: true })}>
      <DialogContent className="dark max-h-[90%] overflow-y-auto text-white sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <DialogHeader>
              <DialogTitle>Create Record</DialogTitle>
              <DialogDescription>Add new payment record.</DialogDescription>
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
                        form.setValue("Months", []);
                        setMonths([]);
                        calculateMemberMonths();
                      }}
                      disabled={!Array.isArray(members) || members?.length === 0}>
                      <SelectTrigger>
                        {gettingMembers ? (
                          <div className="flex w-full items-center justify-center">
                            <Loader />
                          </div>
                        ) : (
                          <SelectValue placeholder={(members?.length ?? 0) === 0 ? "No members found in this lane" : "Select a member"} />
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
                    <Input
                      placeholder="Amount"
                      type="number"
                      {...field}
                      onChange={(e) => {
                        form.setValue("Text", generateThankYouMessage(Number(e.target.value), form.watch("Months")));
                        field.onChange(e);
                      }}
                    />
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
                          {(field.value ?? new Date()).toDateString()}
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
                  <FormLabel>Month(s)</FormLabel>
                  <FormControl>
                    <Popover open={monthPicker} onOpenChange={(open) => setMonthPicker(open)}>
                      <div className="flex w-full gap-2">
                        <PopoverTrigger asChild className="w-full" disabled={form.getValues("Member") === ""}>
                          <Button
                            type="button"
                            onClick={() => field.value.length === 0 && setMonthPicker(!monthPicker)}
                            variant={"outline"}
                            className={"flex h-10 max-w-fit justify-start text-left font-normal hover:bg-bgc"}>
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>

                        {field.value?.length === 0 ? (
                          <Button
                            variant={"outline"}
                            disabled={form.watch("Member") === ""}
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

                      <PopoverContent className="z-[1100] m-0 w-auto border-bc bg-bc p-0" align="start">
                        <div className="z-[1000] max-w-[300px] rounded-sm bg-card text-white">
                          <Calendar
                            defaultView="year"
                            maxDetail="year"
                            minDetail="year"
                            onClickMonth={(clickedMonth) => {
                              months.filter(
                                (paidMonth) =>
                                  clickedMonth.getMonth() === paidMonth.getMonth() &&
                                  clickedMonth.getFullYear() === paidMonth.getFullYear(),
                              ).length === 0 &&
                              form
                                .getValues("Months")
                                .filter(
                                  (selectedMonth) =>
                                    clickedMonth.getMonth() === selectedMonth.getMonth() &&
                                    clickedMonth.getFullYear() === selectedMonth.getFullYear(),
                                ).length === 0
                                ? form.setValue(
                                    "Months",
                                    [...field.value, clickedMonth].sort((a, b) => a.getTime() - b.getTime()),
                                  )
                                : form.setValue(
                                    "Months",
                                    form
                                      .getValues("Months")
                                      .filter(
                                        (deletedMonth) =>
                                          clickedMonth.getMonth() !== deletedMonth.getMonth() ||
                                          clickedMonth.getFullYear() !== deletedMonth.getFullYear(),
                                      )
                                      .sort((a, b) => a.getTime() - b.getTime()),
                                  );

                              form.setValue("Text", generateThankYouMessage(form.getValues("Amount"), form.getValues("Months")));
                            }}
                            tileClassName={(args) => {
                              if (
                                form
                                  .getValues("Months")
                                  .filter(
                                    (month) => month.getMonth() === args.date.getMonth() && month.getFullYear() === args.date.getFullYear(),
                                  ).length > 0
                              ) {
                                return "react-calendar--selected_tiles";
                              } else if (
                                months.filter(
                                  (paidMonth) =>
                                    args.date.getMonth() === paidMonth.getMonth() && args.date.getFullYear() === paidMonth.getFullYear(),
                                ).length !== 0
                              ) {
                                return "react-calendar--paid_tiles";
                              }
                            }}
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
              name="Notify"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Notify member?</FormLabel>
                      <FormDescription>Send a SMS Notification as a record of payment</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                  {field.value && (
                    <FormField
                      control={form.control}
                      name="Text"
                      render={({ field: innerField }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Notification Message" {...innerField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button loading={creatingRecord} type="submit">
                Save record
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
