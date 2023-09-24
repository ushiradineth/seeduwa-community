import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { LANE } from "@/lib/consts";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { CreateMemberSchema, type CreateMemberFormData } from "@/lib/validators";
import { Button } from "../Atoms/Button";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Molecules/Select";

export default function CreateMember() {
  const [error, setError] = useState("");
  const router = useRouter();

  const { mutate, isLoading } = api.member.create.useMutation({
    onSuccess: async () => {
      await router.push({ query: removeQueryParamsFromRouter(router, ["create"]) });
      toast.success("Member created successfully");
    },
    onError: (error) => {
      setError(error.message);
    },
    onMutate: () => setError(""),
  });

  const form = useForm<CreateMemberFormData>({
    resolver: yupResolver(CreateMemberSchema),
  });

  function onSubmit(data: CreateMemberFormData) {
    mutate(data);
  }

  useEffect(() => {
    form.clearErrors();
    form.setValue("Name", "");
    form.setValue("House", "");
    form.setValue("Lane", "");
  }, [router.query.create, form]);

  return (
    <Dialog
      open={router.query.create === "member"}
      onOpenChange={() => router.push({ query: removeQueryParamsFromRouter(router, ["create"]) }, undefined, { shallow: true })}>
      <DialogContent className="dark text-white sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <DialogHeader>
              <DialogTitle>Create Member</DialogTitle>
              <DialogDescription>Add new member to the SVS List.</DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="Name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Member name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="House"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>House number</FormLabel>
                  <FormControl>
                    <Input placeholder="House number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="Lane"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lane</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange}>
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
            <DialogFooter>
              <Button loading={isLoading} type="submit">
                Save member
              </Button>
            </DialogFooter>
          </form>
        </Form>
        <DialogFooter className="flex items-center justify-center">{error && <FormFieldError error={`Error: ${error}`} />}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
