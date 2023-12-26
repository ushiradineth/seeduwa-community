import { yupResolver } from "@hookform/resolvers/yup";
import moment from "moment";
import Calendar from "react-calendar";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { DEFAULT_AMOUNT, MONTHS } from "@/lib/consts";
import { generateThankYouMessage, removeQueryParamsFromRouter } from "@/lib/utils";
import { CreatePaymentForMemberSchema, type CreatePaymentForMemberFormData } from "@/lib/validators";
import { Badge } from "../Atoms/Badge";
import { Button } from "../Atoms/Button";
import { Checkbox } from "../Atoms/Checkbox";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import { Label } from "../Atoms/Label";
import { Switch } from "../Atoms/Switch";
import { Textarea } from "../Atoms/Textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Popover, PopoverContent, PopoverTrigger } from "../Molecules/Popover";

export default function CreatePaymentForMember() {
  const [error, setError] = useState("");
  const router = useRouter();

  const { mutate: createPayment, isLoading: creatingPayment } = api.payment.create.useMutation({
    onSuccess: async (data, variables) => {
      variables.notify && !data.response && toast.error("Failed to notify user");
      await exitPopup(false);
      toast.success("Payment added successfully");
    },
    onError: (error) => {
      setError(error.message);
    },
    onMutate: () => setError(""),
  });

  const form = useForm<CreatePaymentForMemberFormData>({
    resolver: yupResolver(CreatePaymentForMemberSchema),
  });

  function onSubmit(data: CreatePaymentForMemberFormData) {
    createPayment({
      amount: data.Amount,
      memberId: data.Member,
      months: data.Months.map((month) => moment(month).startOf("month").utcOffset(0, true).toDate()),
      paymentDate: moment(data.PaymentDate).startOf("day").utcOffset(0, true).toDate(),
      notify: data.Notify,
      text: data.Text,
      partial: data.Partial,
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
    form.setValue("Partial", false);
    form.setValue("Notify", false);
    form.setValue("Months", [
      new Date(Number(router.query.year ?? new Date().getFullYear()), Number(router.query.month ?? new Date().getMonth()), 1),
    ]);
    form.setValue("PaymentDate", new Date());
    form.setValue("Text", generateThankYouMessage(DEFAULT_AMOUNT, form.getValues("Months")));
  }, [router.query.create, form, router.query.month, router.query.year, creatingPayment, router.query.memberId]);

  useEffect(() => {
    setError("");
  }, [router]);

  return (
    <Dialog open={router.query.mode === "new"} onOpenChange={() => exitPopup(true)}>
      <DialogContent className="dark max-h-[90%] text-white sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <DialogHeader>
              <DialogTitle className="flex w-fit items-center justify-center gap-2">
                <p>Add New Payment</p>
                <Badge key={Number(router.query.year ?? new Date().getFullYear())} className="w-fit">
                  {MONTHS[Number(router.query.month ?? new Date().getMonth())]} {Number(router.query.year ?? new Date().getFullYear())}
                </Badge>
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
              name="Partial"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="partial" checked={field.value} onCheckedChange={field.onChange} />
                      <Label htmlFor="partial">Partial Payment</Label>
                    </div>
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
              name="Notify"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Notify member?</FormLabel>
                      <FormDescription>Send a SMS Notification as a payment of payment</FormDescription>
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
              <Button loading={creatingPayment} type="submit">
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
