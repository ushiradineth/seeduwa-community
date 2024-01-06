import { yupResolver } from "@hookform/resolvers/yup";
import Calendar from "react-calendar";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { DEFAULT_AMOUNT, MONTHS, RECORD_TYPE } from "@/lib/consts";
import { now, removeQueryParamsFromRouter, removeTimezone } from "@/lib/utils";
import { EditRecordSchema, type EditRecordFormData } from "@/lib/validators";
import { Badge } from "../Atoms/Badge";
import { Button } from "../Atoms/Button";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import Loader from "../Atoms/Loader";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Popover, PopoverContent, PopoverTrigger } from "../Molecules/Popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Molecules/Select";

export default function EditRecord() {
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    data: record,
    isLoading: gettingRecord,
    isRefetching: refetchingRecord,
  } = api.record.get.useQuery(
    { id: String(router.query.record) },
    { enabled: router.query.mode === "edit" && typeof router.query.record === "string" },
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
      recordDate: removeTimezone(data.RecordDate).toDate(),
      name: data.Name,
      recordType: data.RecordType,
    });
  }

  const exitPopup = useCallback(
    (shallow: boolean) =>
      router.push(
        {
          query: removeQueryParamsFromRouter(router, [
            "mode",
            "record",
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
    form.setValue("Name", record?.name ?? "");
    form.setValue("Amount", record?.amount ?? DEFAULT_AMOUNT);
    form.setValue("RecordDate", record?.recordAt ?? now());
    form.setValue("RecordType", String(record?.type));
  }, [form, record]);

  return (
    <Dialog open={router.query.mode === "edit" && typeof router.query.record === "string"} onOpenChange={() => exitPopup(true)}>
      <DialogContent className="dark max-h-[90%] text-white sm:max-w-[425px]">
        {gettingRecord || refetchingRecord ? (
          <Loader background removeBackgroundColor height={"385px"} />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <DialogHeader>
                <DialogTitle className="flex w-fit items-center justify-center gap-2">
                  <p>Edit Record</p>
                  <Badge key={record?.month.getFullYear()} className="w-fit">
                    {MONTHS[Number(record?.month.getMonth() ?? 0)]} {record?.month.getFullYear()}
                  </Badge>
                </DialogTitle>
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
                      <Select onValueChange={field.onChange} defaultValue={record?.type ?? field.value}>
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
                            {field.value?.toDateString()}
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
              <DialogFooter className="gap-2 md:gap-0">
                <Button
                  onClick={() => deleteRecord({ id: record?.id ?? "" })}
                  type="button"
                  variant={"destructive"}
                  loading={deletingRecord}>
                  Delete
                </Button>
                <Button loading={editingRecord} type="submit">
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
