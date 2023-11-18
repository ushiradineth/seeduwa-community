import { yupResolver } from "@hookform/resolvers/yup";
import Calendar from "react-calendar";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { DEFAULT_AMOUNT, MONTHS } from "@/lib/consts";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { EditExpenseSchema, type EditExpenseFormData } from "@/lib/validators";
import { Badge } from "../Atoms/Badge";
import { Button } from "../Atoms/Button";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import Loader from "../Atoms/Loader";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Popover, PopoverContent, PopoverTrigger } from "../Molecules/Popover";

export default function EditExpense() {
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    data: expense,
    isLoading: gettingExpense,
    isRefetching: refetchingExpense,
  } = api.expense.get.useQuery(
    { id: String(router.query.expense) },
    { enabled: router.query.mode === "edit" && typeof router.query.expense === "string" },
  );

  const { mutate: editExpense, isLoading: editingExpense } = api.expense.edit.useMutation({
    onSuccess: async () => {
      await exitPopup(false);
      toast.success("Expense updated successfully");
    },
    onError: (error) => {
      setError(error.message);
    },
    onMutate: () => setError(""),
  });

  const { mutate: deleteExpense, isLoading: deletingExpense } = api.expense.delete.useMutation({
    onSuccess: async () => {
      await exitPopup(false);
      toast.success("Expense deleted successfully");
    },
    onError: (error) => {
      setError(error.message);
    },
    onMutate: () => setError(""),
  });

  const form = useForm<EditExpenseFormData>({
    resolver: yupResolver(EditExpenseSchema),
  });

  function onSubmit(data: EditExpenseFormData) {
    editExpense({
      amount: data.Amount,
      id: expense?.id ?? "",
      expenseDate: data.ExpenseDate,
      name: data.Name,
    });
  }

  const exitPopup = useCallback(
    (shallow: boolean) =>
      router.push(
        {
          query: removeQueryParamsFromRouter(router, [
            "mode",
            "expense",
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
    form.setValue("Name", expense?.name ?? "");
    form.setValue("Amount", expense?.amount ?? DEFAULT_AMOUNT);
    form.setValue("ExpenseDate", expense?.expenseAt ?? new Date());
  }, [form, expense]);

  return (
    <Dialog open={router.query.mode === "edit" && typeof router.query.expense === "string"} onOpenChange={() => exitPopup(true)}>
      <DialogContent className="dark max-h-[90%] text-white sm:max-w-[425px]">
        {gettingExpense || refetchingExpense ? (
          <Loader background removeBackgroundColor height={"385px"} />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <DialogHeader>
                <DialogTitle className="flex w-fit items-center justify-center gap-2">
                  <p>Edit Expense</p>
                  <Badge key={expense?.month.getFullYear()} className="w-fit">
                    {MONTHS[Number(expense?.month.getMonth() ?? 0)]} {expense?.month.getFullYear()}
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
                      <Input placeholder="Amount" type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ExpenseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Date</FormLabel>
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
                              onClickDay={(date) => form.setValue("ExpenseDate", date)}
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
                  onClick={() => deleteExpense({ id: expense?.id ?? "" })}
                  type="button"
                  variant={"destructive"}
                  loading={deletingExpense}>
                  Delete expense
                </Button>
                <Button loading={editingExpense} type="submit">
                  Edit expense
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
