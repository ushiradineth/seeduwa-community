import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import PhoneInput, { getCountryCallingCode, parsePhoneNumber } from "react-phone-number-input";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import "react-phone-number-input/style.css";

import { toast } from "react-toastify";

import { api } from "@/utils/api";
import { LANE } from "@/lib/consts";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { CreateMemberSchema, type CreateMemberFormData } from "@/lib/validators";
import { Button } from "../Atoms/Button";
import FormFieldError from "../Atoms/FormFieldError";
import { Input, inputStyle } from "../Atoms/Input";
import Loader from "../Atoms/Loader";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Molecules/Select";

export default function EditMember() {
  const router = useRouter();
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
      number: data.Number,
    });
  }

  const exitPopup = useCallback(
    (shallow: boolean) => router.push({ query: removeQueryParamsFromRouter(router, ["action", "member"]) }, undefined, { shallow }),
    [router],
  );

  useEffect(() => {
    form.clearErrors();
    if (member) {
      form.setValue("Name", member.name);
      form.setValue("House", member.houseId);
      form.setValue("Lane", member.lane);
      form.setValue("Number", member.phoneNumber);
    }
  }, [form, member]);

  return (
    <Dialog open={router.query.action === "edit" && typeof router.query.member === "string"} onOpenChange={() => exitPopup(true)}>
      <DialogContent className="dark max-h-[90%] text-white sm:max-w-[425px]">
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
                name="Number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <PhoneInput
                        // @ts-expect-error Type is not clear for this component
                        ref={inputRef}
                        onCountryChange={(e) => {
                          if (inputRef.current && e) {
                            inputRef.current.value = "+" + getCountryCallingCode(e);
                          }
                        }}
                        defaultCountry={parsePhoneNumber(member?.phoneNumber ?? field.value)?.country ?? undefined}
                        className={inputStyle}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        value={field.value}
                      />
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
                      <Select onValueChange={field.onChange} defaultValue={String(member?.lane ?? field.value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a lane" />
                        </SelectTrigger>
                        <SelectContent className="dark z-[250] max-h-72 w-max">
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
                  Delete
                </Button>
                <Button loading={editingMember} type="submit">
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
