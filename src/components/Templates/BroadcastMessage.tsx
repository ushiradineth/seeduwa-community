import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useCallback } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { BroadcastSchema, type BroadcastFormData } from "@/lib/validators";
import { Button } from "../Atoms/Button";
import { Textarea } from "../Atoms/Textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";

export default function BroadcastMessage() {
  const router = useRouter();

  const { mutate: broadcast, isLoading: broadcasting } = api.message.broadcast.useMutation({
    onSuccess: async () => {
      await exitPopup(false);
      toast.success("Notifications sent successfully");
    },
  });

  const form = useForm<BroadcastFormData>({
    resolver: yupResolver(BroadcastSchema),
  });

  function onSubmit(data: BroadcastFormData) {
    broadcast({
      text: data.Text,
    });
  }

  const exitPopup = useCallback(
    (shallow: boolean) =>
      router.push(
        {
          query: removeQueryParamsFromRouter(router, ["mode"]),
        },
        undefined,
        { shallow },
      ),
    [router],
  );

  return (
    <Dialog open={router.query.mode === "broadcast"} onOpenChange={() => exitPopup(true)}>
      <DialogContent className="dark max-h-[90%] text-white sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <DialogHeader>
              <DialogTitle className="flex w-fit items-center justify-center gap-2">
                <p>Broadcast Message to All Members</p>
              </DialogTitle>
            </DialogHeader>

            <FormField
              control={form.control}
              name="Text"
              render={({ field: innerField }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Broadcast Message" {...innerField} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 md:gap-0">
              <Button loading={broadcasting} type="submit">
                Broadcast to All Members
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
