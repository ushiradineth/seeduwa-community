import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import "react-calendar/dist/Calendar.css";

import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { api } from "@/utils/api";
import { MONTHS } from "@/lib/consts";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { EditRecordSchema, type EditRecordFormData } from "@/lib/validators";
import { Button } from "../Atoms/Button";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import Loader from "../Atoms/Loader";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";

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
    form.setValue("Amount", record?.amount ?? 2000);
  }, [form, record?.amount]);

  return (
    <Dialog open={router.query.mode === "edit" && typeof router.query.payment === "string"} onOpenChange={() => exitPopup(true)}>
      <DialogContent className="dark text-white sm:max-w-[425px]">
        {gettingRecord || refetchingRecord ? (
          <Loader background removeBackgroundColor height={"385px"} />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <DialogHeader>
                <DialogTitle>Edit Record</DialogTitle>
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
                name="Month"
                control={undefined}
                render={() => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <FormControl>
                      <Input placeholder="Month" defaultValue={MONTHS[Number(record?.date.getMonth() ?? 0)]} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="Year"
                control={undefined}
                render={() => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input placeholder="Year" defaultValue={record?.date.getFullYear()} disabled />
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
            <DialogFooter className="flex items-center justify-center">
              {error && <FormFieldError error={`Error: ${error}`} />}
            </DialogFooter>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
