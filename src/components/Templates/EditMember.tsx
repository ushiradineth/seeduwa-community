import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import "react-calendar/dist/Calendar.css";

import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { api } from "@/utils/api";
import { LANE } from "@/lib/consts";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { CreateMemberSchema, type CreateMemberFormData } from "@/lib/validators";
import { Button } from "../Atoms/Button";
import FormFieldError from "../Atoms/FormFieldError";
import { Input } from "../Atoms/Input";
import Loader from "../Atoms/Loader";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Molecules/Select";

export default function EditMember() {
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    data: member,
    isLoading: gettingMember,
    isRefetching: refetchingMember,
  } = api.member.get.useQuery(
    { id: String(router.query.member) },
    { enabled: router.query.action === "edit" && typeof router.query.member === "string" },
  );

  const { mutate: editMember, isLoading: editingMember } = api.member.edit.useMutation({
    onSuccess: async () => {
      await exitPopup(false);
      toast.success("Member updated successfully");
    },
    onError: (error) => {
      setError(error.message);
    },
    onMutate: () => setError(""),
  });

  const { mutate: deleteMember, isLoading: deletingMember } = api.member.delete.useMutation({
    onSuccess: async () => {
      await exitPopup(false);
      toast.success("Member deleted successfully");
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
    editMember({
      id: member?.id ?? "",
      name: data.Name,
      houseId: data.House,
      lane: data.Lane,
    });
  }

  const exitPopup = useCallback(
    (shallow: boolean) =>
      router.push({ query: removeQueryParamsFromRouter(router, ["mode", "payment", "month", "year"]) }, undefined, { shallow }),
    [router],
  );

  useEffect(() => {
    form.clearErrors();
    if (member) {
      form.setValue("Name", member.name);
      form.setValue("House", member.houseId);
      form.setValue("Lane", member.lane);
    }
  }, [form, member]);

  return (
    <Dialog open={router.query.action === "edit" && typeof router.query.member === "string"} onOpenChange={() => exitPopup(true)}>
      <DialogContent className="dark text-white sm:max-w-[425px]">
        {gettingMember || refetchingMember ? (
          <Loader background removeBackgroundColor height={"385px"} />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <DialogHeader>
                <DialogTitle>Edit Member</DialogTitle>
              </DialogHeader>
              <FormField
                control={form.control}
                name="Name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Member name" {...field} defaultValue={member?.name ?? field.value} />
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
                      <Input placeholder="House number" {...field} defaultValue={member?.houseId ?? field.value} />
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
                      <Select onValueChange={field.onChange} defaultValue={member?.lane ?? field.value}>
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
                <Button
                  onClick={() => deleteMember({ id: member?.id ?? "" })}
                  type="button"
                  variant={"destructive"}
                  loading={deletingMember}>
                  Delete member
                </Button>
                <Button loading={editingMember} type="submit">
                  Edit member
                </Button>
              </DialogFooter>
            </form>
            <DialogFooter className="flex items-center justify-center">
              {error && <FormFieldError error={`Error: ${error}`} />}
            </DialogFooter>
          </Form>
        )}
        <DialogFooter className="flex items-center justify-center">{error && <FormFieldError error={`Error: ${error}`} />}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
