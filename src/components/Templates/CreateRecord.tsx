import { yupResolver } from "@hookform/resolvers/yup";
import { CalendarIcon, X } from "lucide-react";
import moment from "moment";
import Calendar from "react-calendar";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { MONTHS, RECORD_TYPE } from "@/lib/consts";
import { now, removeQueryParamsFromRouter, removeTimezone } from "@/lib/utils";
import { CreateRecordSchema, type CreateRecordFormData } from "@/lib/validators";
import { Badge } from "../Atoms/Badge";
import { Button } from "../Atoms/Button";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Popover, PopoverContent, PopoverTrigger } from "../Molecules/Popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Molecules/Select";

export default function CreateRecord() {
  const [error, setError] = useState("");
  const [monthPicker, setMonthPicker] = useState(false);
  const router = useRouter();

  const { mutate: createRecord, isLoading: creatingRecord } = api.record.create.useMutation({
    onSuccess: async () => {
      await router.push({ query: removeQueryParamsFromRouter(router, ["create"]) });
      toast.success("Record added successfully");
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
      months: data.Months.map((month) => moment(month).startOf("month").utcOffset(0, true).toDate()),
      recordDate: moment(data.RecordDate).startOf("day").utcOffset(0, true).toDate(),
      name: data.Name,
      recordType: data.RecordType,
    });
  }

  useEffect(() => {
    form.clearErrors();
    form.resetField("Name");
    form.resetField("Amount");
    form.setValue("Months", [
      moment()
        .startOf("month")
        .month(router.query.filterMonth ? MONTHS.findIndex((value) => value === router.query.filterMonth) : now().getMonth())
        .year(Number(router.query.filterYear ?? now().getFullYear()))
        .utcOffset(0, true)
        .toDate(),
    ]);
    form.setValue("RecordDate", now());
  }, [router.query.create, form, router.query.filterMonth, router.query.filterYear]);

  return (
    <Dialog
      open={router.query.create === "record"}
      onOpenChange={() => router.push({ query: removeQueryParamsFromRouter(router, ["create"]) }, undefined, { shallow: true })}>
      <DialogContent className="dark h-fit max-h-[90%] text-white sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <DialogHeader>
              <DialogTitle>Create Record</DialogTitle>
              <DialogDescription>Add new record.</DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="Name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Name" type="text" {...field} />
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
                    <Input placeholder="Amount" type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="RecordType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Record Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select record type" />
                      </SelectTrigger>
                      <SelectContent className="dark z-[250] max-h-72 w-max">
                        {RECORD_TYPE.map((type) => {
                          return (
                            <SelectItem key={type} value={type}>
                              {type}
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
              name="RecordDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Record Date</FormLabel>
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild className="w-full">
                        <Button
                          type="button"
                          variant={"outline"}
                          className={"flex h-10 max-w-full justify-start text-left font-normal hover:bg-bgc"}>
                          {(field.value ?? now()).toDateString()}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="z-[1000] m-0 w-auto border-bc bg-bc p-0" align="start">
                        <div className="z-[1000] max-w-[300px] rounded-sm bg-card text-white">
                          <Calendar
                            defaultView="month"
                            defaultValue={field.value}
                            onClickDay={(date) => form.setValue("RecordDate", date)}
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
                        <PopoverTrigger asChild className="w-full">
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
                            type="button"
                            onClick={() => field.value.length === 0 && setMonthPicker(!monthPicker)}
                            className={"flex h-full w-full justify-center text-left font-normal hover:bg-bgc"}>
                            Pick record month(s)
                          </Button>
                        ) : (
                          <div className="flex w-full flex-wrap gap-1 rounded-sm border p-2">
                            {field.value?.map((month) => {
                              return (
                                <Badge key={month.toDateString()}>
                                  {MONTHS[removeTimezone(month).getMonth()]} {month.getFullYear()}
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

                      <PopoverContent className="z-[1000] m-0 w-auto border-bc bg-bc p-0" align="start" side="top" sideOffset={450}>
                        <div className="absolute w-[300px] rounded-sm border border-bc bg-card p-2 text-white ">
                          <Calendar
                            defaultView="year"
                            maxDetail="year"
                            minDetail="year"
                            onClickMonth={(clickedMonth) => {
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

            <DialogFooter>
              <Button loading={creatingRecord} type="submit">
                Confirm
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
