import { yupResolver } from "@hookform/resolvers/yup";
import moment from "moment";
import Calendar from "react-calendar";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { DEFAULT_AMOUNT, MONTHS } from "@/lib/consts";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { EditPaymentSchema, type EditPaymentFormData } from "@/lib/validators";
import { Badge } from "../Atoms/Badge";
import { Button } from "../Atoms/Button";
import { Checkbox } from "../Atoms/Checkbox";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import { Label } from "../Atoms/Label";
import Loader from "../Atoms/Loader";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Popover, PopoverContent, PopoverTrigger } from "../Molecules/Popover";

export default function EditPayment() {
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    data: payment,
    isLoading: gettingPayment,
    isRefetching: refetchingPayment,
  } = api.payment.get.useQuery(
    { id: String(router.query.payment) },
    { enabled: router.query.mode === "edit" && typeof router.query.payment === "string" },
  );

  const { mutate: editPayment, isLoading: editingPayment } = api.payment.edit.useMutation({
    onSuccess: async () => {
      await exitPopup(false);
      toast.success("Payment updated successfully");
    },
    onError: (error) => {
      setError(error.message);
    },
    onMutate: () => setError(""),
  });

  const { mutate: deletePayment, isLoading: deletingPayment } = api.payment.delete.useMutation({
    onSuccess: async () => {
      await exitPopup(false);
      toast.success("Payment deleted successfully");
    },
    onError: (error) => {
      setError(error.message);
    },
    onMutate: () => setError(""),
  });

  const form = useForm<EditPaymentFormData>({
    resolver: yupResolver(EditPaymentSchema),
  });

  function onSubmit(data: EditPaymentFormData) {
    editPayment({
      amount: data.Amount,
      id: payment?.id ?? "",
      paymentDate: moment(data.PaymentDate).utcOffset(0, true).toDate(),
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
    form.setValue("Amount", payment?.amount ?? DEFAULT_AMOUNT);
    form.setValue("PaymentDate", payment?.paymentAt ?? new Date());
    form.setValue("Partial", payment?.partial ?? false);
  }, [form, payment]);

  return (
    <Dialog open={router.query.mode === "edit" && typeof router.query.payment === "string"} onOpenChange={() => exitPopup(true)}>
      <DialogContent className="dark max-h-[90%] text-white sm:max-w-[425px]">
        {gettingPayment || refetchingPayment ? (
          <Loader background removeBackgroundColor height={"385px"} />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <DialogHeader>
                <DialogTitle className="flex w-fit items-center justify-center gap-2">
                  <p>Edit Payment</p>
                  <Badge key={payment?.month.getFullYear()} className="w-fit">
                    {MONTHS[Number(payment?.month.getMonth() ?? 0)]} {payment?.month.getFullYear()}
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
                      <Input placeholder="Amount" type="number" step="0.01" {...field} />
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
              <DialogFooter className="gap-2 md:gap-0">
                <Button
                  onClick={() => deletePayment({ id: payment?.id ?? "" })}
                  type="button"
                  variant={"destructive"}
                  loading={deletingPayment}>
                  Delete
                </Button>
                <Button loading={editingPayment} type="submit">
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
        )}
      </DialogContent>
    </Dialog>
  );
}
