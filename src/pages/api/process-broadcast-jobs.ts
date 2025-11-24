import { Logger } from "next-axiom";
import { type NextApiRequest, type NextApiResponse } from "next";

import { prisma } from "@/server/db";
import { processBroadcastJob } from "@/server/jobs/broadcastProcessor";

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const logger = new Logger();
  const log = logger.with({ cron: "process-broadcast-jobs" });

  // For production, use CRON_SECRET to protect this endpoint
  // For development, allow internal requests
  const isDevelopment = process.env.NODE_ENV === "development";
  if (!isDevelopment && (!process.env.CRON_SECRET || request.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`)) {
    log.info("Process broadcast jobs failed", { error: "UNAUTHORIZED", code: 401 });
    return response.status(401).json({ success: false });
  }

  try {
    // Find all queued jobs
    const queuedJobs = await prisma.broadcastJob.findMany({
      where: {
        status: "QUEUED",
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 5, // Process up to 5 jobs at once
    });

    log.info("Found queued broadcast jobs", { count: queuedJobs.length });

    if (queuedJobs.length === 0) {
      return response.status(200).json({ success: true, processedJobs: 0 });
    }

    // Process jobs sequentially (to avoid overwhelming the SMS API)
    const processedJobIds: string[] = [];
    for (const job of queuedJobs) {
      log.info("Processing broadcast job", { jobId: job.id });
      await processBroadcastJob(job.id, prisma, log);
      processedJobIds.push(job.id);
    }

    log.info("Broadcast jobs processed successfully", { processedJobIds });

    await logger.flush();

    return response.status(200).json({
      success: true,
      processedJobs: processedJobIds.length,
      jobIds: processedJobIds,
    });
  } catch (error) {
    log.error("Error processing broadcast jobs", { error });
    await logger.flush();
    return response.status(500).json({ success: false, error: String(error) });
  }
}
