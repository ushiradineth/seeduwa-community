import { yupResolver } from "@hookform/resolvers/yup";
import { AlertCircle, BadgeCheck, BadgeXIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import { toast } from "react-toastify";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { BroadcastSchema, type BroadcastFormData } from "@/lib/validators";
import { Button } from "../Atoms/Button";
import { Textarea } from "../Atoms/Textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../Molecules/Dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../Molecules/Form";

const ITEMS_PER_PAGE = 10;

export default function BroadcastMessage() {
  const router = useRouter();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobId, setJobId] = useState<string | null>(null);

  // Determine if this is filtered mode or all members mode
  const isFiltered = router.query.mode === "broadcast-filtered";
  const isOpen = router.query.mode === "broadcast" || router.query.mode === "broadcast-filtered";

  // Extract filter params from query
  const filterParams = {
    members: Array.isArray(router.query.broadcastMembers) ? router.query.broadcastMembers[0] : router.query.broadcastMembers,
    months: Array.isArray(router.query.broadcastMonths)
      ? router.query.broadcastMonths
      : router.query.broadcastMonths
      ? [router.query.broadcastMonths]
      : undefined,
    search: Array.isArray(router.query.broadcastSearch) ? router.query.broadcastSearch[0] : router.query.broadcastSearch,
  };

  // Get recipient count for confirmation
  const { data: recipientCount } = api.message.getRecipientCount.useQuery(
    {
      members: filterParams.members,
      months: filterParams.months,
      search: filterParams.search,
    },
    {
      enabled: isFiltered && isOpen,
      refetchOnWindowFocus: false,
    },
  );

  // Poll for job status
  const { data: jobStatus } = api.message.getBroadcastJobStatus.useQuery(
    { jobId: jobId! },
    {
      enabled: !!jobId,
      refetchInterval: (data) => {
        // Stop polling when job is completed or failed
        if (data?.status === "COMPLETED" || data?.status === "FAILED") {
          return false;
        }
        return 2000; // Poll every 2 seconds
      },
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 0, // Always consider data stale
      cacheTime: 0, // Don't cache results
    },
  );

  const {
    mutate: broadcast,
    isLoading: broadcasting,
    reset: resetMutation,
  } = api.message.broadcast.useMutation({
    onSuccess: (response) => {
      setJobId(response.jobId);
      setShowConfirmation(false);
    },
    onError: (error) => {
      toast.error(`Failed to queue broadcast: ${error.message}`);
    },
  });

  // Derived data from job status
  const data = jobStatus?.results;
  const isProcessing = jobStatus?.status === "PROCESSING" || jobStatus?.status === "QUEUED";

  const form = useForm<BroadcastFormData>({
    resolver: yupResolver(BroadcastSchema),
  });

  function onSubmit(formData: BroadcastFormData) {
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    // Send broadcast with filter params
    broadcast({
      text: formData.Text,
      members: filterParams.members,
      months: filterParams.months,
      search: filterParams.search,
    });
  }

  const exitPopup = useCallback(
    (shallow: boolean) => {
      form.reset();
      resetMutation();
      setShowConfirmation(false);
      setCurrentPage(1);
      setJobId(null);
      void router.push(
        {
          query: removeQueryParamsFromRouter(router, ["mode", "broadcastMembers", "broadcastMonths", "broadcastSearch"]),
        },
        undefined,
        { shallow },
      );
    },
    [router, form, resetMutation],
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      form.reset({ Text: "" });
      resetMutation();
      setShowConfirmation(false);
      setCurrentPage(1);
      setJobId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.mode, form, resetMutation]);

  // Debug: Log job status updates
  useEffect(() => {
    if (jobStatus) {
      console.log("[Broadcast] Job status update:", {
        status: jobStatus.status,
        processed: jobStatus.processedCount,
        total: jobStatus.totalRecipients,
        success: jobStatus.successCount,
        failed: jobStatus.failedCount,
      });
    }
  }, [jobStatus]);

  // Show success toast when job completes
  useEffect(() => {
    if (jobStatus?.status === "COMPLETED") {
      toast.success(`Broadcast completed: ${jobStatus.successCount} sent, ${jobStatus.failedCount} failed`);
    } else if (jobStatus?.status === "FAILED") {
      toast.error(`Broadcast failed: ${jobStatus.error ?? "Unknown error"}`);
    }
  }, [jobStatus?.status, jobStatus?.successCount, jobStatus?.failedCount, jobStatus?.error]);

  // Paginate results
  const paginatedData = data ? data.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) : [];
  const totalPages = data ? Math.ceil(data.length / ITEMS_PER_PAGE) : 0;
  const errorCount = data ? data.filter((m) => !m.status).length : 0;
  const successCount = data ? data.filter((m) => m.status).length : 0;

  const dialogTitle = isFiltered ? `Broadcast Message to ${recipientCount ?? "..."} Members` : "Broadcast Message to All Members";

  return (
    <Dialog open={isOpen} onOpenChange={() => exitPopup(true)}>
      <DialogContent className="dark max-h-[90%] overflow-y-auto text-white sm:max-w-[425px]">
        {isProcessing ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex w-fit items-center justify-center gap-2">
                <p>{dialogTitle}</p>
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {jobStatus?.status === "QUEUED" && "Queued - waiting to start..."}
                {jobStatus?.status === "PROCESSING" && "Processing messages..."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded border border-blue-600 bg-blue-900/20 p-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-100">
                    {jobStatus?.processedCount ?? 0} / {jobStatus?.totalRecipients ?? "..."} messages sent
                  </p>
                  {jobStatus && jobStatus.totalRecipients > 0 && (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-700">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${(jobStatus.processedCount / jobStatus.totalRecipients) * 100}%` }}
                      />
                    </div>
                  )}
                  <p className="mt-2 text-xs text-blue-200/80">
                    Success: {jobStatus?.successCount ?? 0} • Failed: {jobStatus?.failedCount ?? 0}
                  </p>
                </div>
              </div>
              <p className="text-center text-sm text-gray-400">Please wait while messages are being sent...</p>
            </div>
          </>
        ) : data ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex w-fit items-center justify-center gap-2">
                <p>{dialogTitle}</p>
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {errorCount > 0 && <span className="text-red-400">{errorCount} failed</span>}
                {errorCount > 0 && successCount > 0 && " • "}
                {successCount > 0 && <span className="text-green-400">{successCount} successful</span>}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {paginatedData.map((member, idx) => (
                <div key={`${member.name}-${idx}`} className="flex flex-col gap-1 rounded border border-gray-700 p-2">
                  <div className="flex items-center justify-start gap-2">
                    <p className="w-36 truncate font-semibold">{member.name}</p>
                    <p className="text-sm">{member.number === "" ? "-" : formatPhoneNumberIntl(member.number)}</p>
                    {member.status ? <BadgeCheck color="green" className="ml-auto" /> : <BadgeXIcon color="red" className="ml-auto" />}
                  </div>
                  {!member.status && member.error && <p className="text-xs text-red-400">{member.error}</p>}
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <DialogHeader>
                <DialogTitle className="flex w-fit items-center justify-center gap-2">
                  <p>{dialogTitle}</p>
                </DialogTitle>
              </DialogHeader>

              {!showConfirmation ? (
                <>
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
                    <Button type="submit">Continue</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded border border-yellow-600 bg-yellow-900/20 p-4">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-yellow-100">Send broadcast to {isFiltered ? recipientCount : "all"} members?</p>
                      <p className="mt-2 text-sm text-yellow-200/80">
                        This may take a moment. Do not close this page while messages are being sent.
                      </p>
                    </div>
                  </div>

                  <div className="rounded border border-gray-700 bg-gray-800 p-3">
                    <p className="text-sm font-semibold text-gray-400">Message Preview:</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{form.getValues("Text")}</p>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowConfirmation(false)}>
                      Back
                    </Button>
                    <Button loading={broadcasting} type="submit">
                      {broadcasting ? "Sending..." : "Send Broadcast"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
