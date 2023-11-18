import { yupResolver } from "@hookform/resolvers/yup";
import Calendar from "react-calendar";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { DEFAULT_AMOUNT, MONTHS } from "@/lib/consts";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { EditRecordSchema, type EditRecordFormData } from "@/lib/validators";
import { Badge } from "../Atoms/Badge";
import { Button } from "../Atoms/Button";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import Loader from "../Atoms/Loader";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Popover, PopoverContent, PopoverTrigger } from "../Molecules/Popover";

export default function EditRecord() {
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    data: record,
    isLoading: gettingRecord,
    isRefetching: refetchingRecord,
  } = api.record.get.useQuery(
    { id: String(router.query.payment) },
    { enabled: router.query.mode === "edit" && typeof router.query.payment === "string" },
  );

  const { mutate: editRecord, isLoading: editingRecord } = api.record.edit.useMutation({
    onSuccess: async () => {
      await exitPopup(false);
      toast.success("Record updated successfully");
    },
    onError: (error) => {
      setError(error.message);
    },
    onMutate: () => setError(""),
  });

  const { mutate: deleteRecord, isLoading: deletingRecord } = api.record.delete.useMutation({
    onSuccess: async () => {
      await exitPopup(false);
      toast.success("Record deleted successfully");
    },
    onError: (error) => {
      setError(error.message);
    },
    onMutate: () => setError(""),
  });

  const form = useForm<EditRecordFormData>({
    resolver: yupResolver(EditRecordSchema),
  });

  function onSubmit(data: EditRecordFormData) {
    editRecord({
      amount: data.Amount,
      id: record?.id ?? "",
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
    form.setValue("Amount", record?.amount ?? DEFAULT_AMOUNT);
    form.setValue("PaymentDate", record?.paymentAt ?? new Date());
  }, [form, record]);

  return (
    <Dialog open={router.query.mode === "edit" && typeof router.query.payment === "string"} onOpenChange={() => exitPopup(true)}>
      <DialogContent className="dark max-h-[90%] text-white sm:max-w-[425px]">
        {gettingRecord || refetchingRecord ? (
          <Loader background removeBackgroundColor height={"385px"} />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <DialogHeader>
                <DialogTitle className="flex w-fit items-center justify-center gap-2">
                  <p>Edit Record</p>
                  <Badge key={record?.paymentAt.getFullYear()} className="w-fit">
                    {MONTHS[Number(record?.paymentAt.getMonth() ?? 0)]} {record?.paymentAt.getFullYear()}
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
              <DialogFooter className="gap-2 md:gap-0">
                <Button
                  onClick={() => deleteRecord({ id: record?.id ?? "" })}
                  type="button"
                  variant={"destructive"}
                  loading={deletingRecord}>
                  Delete record
                </Button>
                <Button loading={editingRecord} type="submit">
                  Edit record
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
