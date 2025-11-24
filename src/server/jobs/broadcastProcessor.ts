import { type PrismaClient } from "@prisma/client";
import { type Logger } from "next-axiom";

import { MEMBERS_PAYMENT_FILTER_ENUM } from "@/lib/consts";
import { removeTimezone } from "@/lib/utils";
import { sendMessage } from "../api/routers/message";

const BATCH_SIZE = 20; // Process 20 messages in parallel

type MessageResult = {
  name: string;
  number: string;
  status: boolean;
  error?: string;
};

export async function processBroadcastJob(jobId: string, prisma: PrismaClient, log: Logger): Promise<void> {
  try {
    // Get the job
    const job = await prisma.broadcastJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status !== "QUEUED") {
      log.warn("Job not found or already processed", { jobId, status: job?.status });
      return;
    }

    // Mark job as processing
    await prisma.broadcastJob.update({
      where: { id: jobId },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    log.info("Starting broadcast job processing", { jobId });

    // Parse filter parameters
    const membersParam = (job.membersFilter ?? MEMBERS_PAYMENT_FILTER_ENUM.All) as MEMBERS_PAYMENT_FILTER_ENUM;
    const months = job.monthsFilter
      ? (JSON.parse(job.monthsFilter) as string[]).map((m) => removeTimezone(m).startOf("month").toDate())
      : [];
    const search = job.searchFilter ? job.searchFilter.split(" ").filter(Boolean).join(" & ") : "";

    // Build query filter (same logic as original broadcast)
    let paymentsFilter = {};

    if (months.length > 0) {
      if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Paid || membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid) {
        paymentsFilter = {
          OR: [
            {
              payments: {
                some: {
                  active: true,
                  month: { in: months },
                },
              },
            },
            {
              payments: {
                none: {
                  active: true,
                  month: { in: months },
                },
              },
            },
          ],
        };
      } else if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Partial) {
        paymentsFilter = {
          AND: [
            {
              payments: {
                some: {
                  active: true,
                  month: { in: months },
                  partial: true,
                },
              },
            },
          ],
        };
      }
    }

    const where =
      search !== ""
        ? {
            AND: [
              { active: true },
              {
                OR: [
                  { name: { search: search } },
                  { phoneNumber: { search: search } },
                  { houseId: { search: search } },
                  { lane: { search: search } },
                ],
              },
              { ...paymentsFilter },
            ],
          }
        : { active: true, ...paymentsFilter };

    // Fetch members
    let members = await prisma.member.findMany({
      where,
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        payments:
          months.length > 0
            ? {
                where: {
                  active: true,
                  month: { in: months },
                },
                select: {
                  amount: true,
                  month: true,
                  partial: true,
                },
              }
            : undefined,
      },
      orderBy: { lane: "asc" },
    });

    // Apply payment filters
    if (months.length > 0) {
      if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Paid) {
        members = members.filter(
          (member) => member.payments && member.payments.filter((payment) => payment.partial === false).length === months.length,
        );
      } else if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Unpaid) {
        members = members.filter(
          (member) => !member.payments || member.payments.filter((payment) => payment.partial === false).length < months.length,
        );
      } else if (membersParam === MEMBERS_PAYMENT_FILTER_ENUM.Partial) {
        members = members.filter((member) => member.payments && member.payments.length === months.length);
      }
    }

    // Update total recipients
    await prisma.broadcastJob.update({
      where: { id: jobId },
      data: { totalRecipients: members.length },
    });

    log.info("Processing broadcast messages", { jobId, totalRecipients: members.length });

    // Process in batches with real-time progress updates
    const results: MessageResult[] = [];

    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE);

      // Process batch in parallel, but update progress after each individual message
      const batchPromises = batch.map(async (member) => {
        const result = await sendMessage(member.phoneNumber, job.message, log);
        const messageResult = {
          name: member.name,
          number: member.phoneNumber,
          status: result.success,
          error: result.error,
        };

        // Update progress immediately after each message using atomic DB increment
        const updated = await prisma.broadcastJob.update({
          where: { id: jobId },
          data: {
            processedCount: { increment: 1 },
            successCount: messageResult.status ? { increment: 1 } : undefined,
            failedCount: messageResult.status ? undefined : { increment: 1 },
          },
          select: {
            processedCount: true,
            successCount: true,
            failedCount: true,
          },
        });

        log.info("Message processed", {
          jobId,
          processedCount: updated.processedCount,
          totalRecipients: members.length,
          recipient: member.name,
        });

        return messageResult;
      });

      // Wait for all messages in the batch to complete
      const batchResults = await Promise.allSettled(batchPromises);

      // Collect results
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          // Promise rejected - increment failed count
          log.error("Message processing error", { error: result.reason });
          await prisma.broadcastJob.update({
            where: { id: jobId },
            data: {
              processedCount: { increment: 1 },
              failedCount: { increment: 1 },
            },
          });
        }
      }

      // Get final counts for this batch
      const jobStatus = await prisma.broadcastJob.findUnique({
        where: { id: jobId },
        select: { processedCount: true },
      });

      log.info("Batch completed", { jobId, processedCount: jobStatus?.processedCount, totalRecipients: members.length });
    }

    // Sort results to show errors first
    results.sort((a, b) => {
      if (!a.status && b.status) return -1;
      if (a.status && !b.status) return 1;
      return 0;
    });

    // Get final counts from database
    const finalJob = await prisma.broadcastJob.findUnique({
      where: { id: jobId },
      select: {
        processedCount: true,
        successCount: true,
        failedCount: true,
      },
    });

    // Mark job as completed
    await prisma.broadcastJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        results: JSON.stringify(results),
      },
    });

    log.info("Broadcast job completed successfully", {
      jobId,
      totalRecipients: members.length,
      successCount: finalJob?.successCount ?? 0,
      failedCount: finalJob?.failedCount ?? 0,
    });
  } catch (error) {
    log.error("Broadcast job failed", { jobId, error });

    // Mark job as failed
    await prisma.broadcastJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
