import { yupResolver } from "@hookform/resolvers/yup";
import { BadgeCheck, BadgeXIcon } from "lucide-react";
import Calendar from "react-calendar";
import { useForm } from "react-hook-form";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import { toast } from "react-toastify";
import { useCallback, useEffect } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { DEFAULT_AMOUNT, MONTHS } from "@/lib/consts";
import { generateUnpaidNotificationMessage, now, removeQueryParamsFromRouter, removeTimezone } from "@/lib/utils";
import { NotifyUnpaidMembersSchema, type NotifyUnpaidMembersFormData } from "@/lib/validators";
import { Button } from "../Atoms/Button";
import { Input } from "../Atoms/Input";
import { Textarea } from "../Atoms/Textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Popover, PopoverContent, PopoverTrigger } from "../Molecules/Popover";

export default function NotifyUnpaidMembers() {
  const router = useRouter();

  const {
    data,
    mutate: notify,
    isLoading: notifying,
  } = api.message.notifyUnpaidMembers.useMutation({
    onSuccess: () => {
      toast.success("Notifications sent successfully");
    },
  });

  const form = useForm<NotifyUnpaidMembersFormData>({
    resolver: yupResolver(NotifyUnpaidMembersSchema),
  });

  function onSubmit(data: NotifyUnpaidMembersFormData) {
    notify({
      amount: data.Amount,
      month: removeTimezone(data.Month).startOf("month").toDate(),
      text: data.Text,
    });
  }

  const exitPopup = useCallback(
    (shallow: boolean) =>
      router.push(
        {
          query: removeQueryParamsFromRouter(router, ["month", "year", "mode"]),
        },
        undefined,
        { shallow },
      ),
    [router],
  );

  useEffect(() => {
    form.clearErrors();
    form.setValue("Amount", DEFAULT_AMOUNT);
    form.setValue(
      "Month",
      removeTimezone()
        .startOf("month")
        .year(Number(router.query.year ?? now().getFullYear()))
        .month(Number(router.query.month ?? now().getMonth()))
        .toDate(),
    );
    form.setValue("Text", generateUnpaidNotificationMessage(DEFAULT_AMOUNT, form.getValues("Month")));
  }, [form, router.query.month, router.query.year]);

  return (
    <Dialog open={router.query.mode === "notify"} onOpenChange={() => exitPopup(true)}>
      <DialogContent className="dark max-h-[90%] text-white sm:max-w-[425px]">
        {data ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex w-fit items-center justify-center gap-2">
                <p>Notify Unpaid Members</p>
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {data.map((member) => (
                <div key={member.name} className="flex items-center justify-start gap-2">
                  <p className="w-36 truncate">{member.name}</p>
                  <p>{member.number === "" ? "-" : formatPhoneNumberIntl(member.number)}</p>
                  {member.status ? <BadgeCheck color="green" className="ml-auto" /> : <BadgeXIcon color="red" className="ml-auto" />}
                </div>
              ))}
            </div>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <DialogHeader>
                <DialogTitle className="flex w-fit items-center justify-center gap-2">
                  <p>Notify Unpaid Members</p>
                </DialogTitle>
              </DialogHeader>
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
                          form.setValue("Text", generateUnpaidNotificationMessage(Number(e.target.value), form.watch("Month")));
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
                name="Month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild className="w-full">
                          <Button
                            type="button"
                            variant={"outline"}
                            className={"flex h-10 max-w-full justify-start text-left font-normal hover:bg-bgc"}>
                            {MONTHS[field.value?.getMonth()]} {field.value?.getFullYear()}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="z-[1000] m-0 w-auto border-bc bg-bc p-0" align="start">
                          <div className="z-[1000] max-w-[300px] rounded-sm bg-card text-white">
                            <Calendar
                              defaultView="year"
                              maxDetail="year"
                              minDetail="year"
                              onClickMonth={(clickedMonth) => {
                                form.setValue("Month", clickedMonth);
                                form.setValue("Text", generateUnpaidNotificationMessage(form.getValues("Amount"), form.getValues("Month")));
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

              <DialogFooter className="gap-2 md:gap-0">
                <Button loading={notifying} type="submit">
                  Notify Unpaid Members
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
