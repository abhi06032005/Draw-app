import { prismaClient } from "@repo/db/client";
import { analyzeRepository } from "../github/repositoryAnalyzer";
import { GitHubClient } from "../github/githubClient";
import { getUserGitHubToken } from "./tokenVault";
import type { AnalysisDepth, ArchitectureGraph } from "../github/types";

const activeJobs = new Map<string, AbortController>();

export async function enqueueArchitectureJob(input: {
  roomId: number;
  userId: string;
  repositoryUrl: string;
  repositoryFullName: string;
  branch: string;
  depth: AnalysisDepth;
  githubToken?: string;
  commitSha?: string;
  forceRefresh?: boolean;
}) {
  const token =
    input.githubToken || (await getUserGitHubToken(input.userId)) || undefined;

  const cached =
    !input.forceRefresh && input.commitSha
      ? await prismaClient.architectureGraph
          .findUnique({
            where: {
              roomId_repositoryFullName_commitSha: {
                roomId: input.roomId,
                repositoryFullName: input.repositoryFullName,
                commitSha: input.commitSha,
              },
            },
          })
          .catch(() => null)
      : null;

  const job = await prismaClient.analysisJob.create({
    data: {
      roomId: input.roomId,
      userId: input.userId,
      repositoryFullName: input.repositoryFullName,
      repositoryUrl: input.repositoryUrl,
      branch: input.branch,
      depth: input.depth,
      status: cached ? "completed" : "queued",
      stage: cached ? "complete" : "queued",
      architectureGraphId: cached?.id,
      startedAt: cached ? new Date() : undefined,
      finishedAt: cached ? new Date() : undefined,
    },
  });

  if (!cached) {
    void runArchitectureJob(job.id, { ...input, githubToken: token });
  }

  return { job, cached: Boolean(cached) };
}

export async function retryArchitectureJob(jobId: string, userId: string) {
  const existing = await prismaClient.analysisJob.findFirst({
    where: { id: jobId, userId },
  });
  if (!existing) return null;

  const token = await getUserGitHubToken(userId);

  await prismaClient.analysisJob.update({
    where: { id: jobId },
    data: {
      status: "queued",
      stage: "queued",
      error: null,
      cancelRequested: false,
      startedAt: new Date(),
      finishedAt: null,
    },
  });

  void runArchitectureJob(jobId, {
    roomId: existing.roomId,
    userId: existing.userId,
    repositoryUrl: existing.repositoryUrl,
    repositoryFullName: existing.repositoryFullName,
    branch: existing.branch,
    depth: existing.depth as AnalysisDepth,
    githubToken: token || undefined,
  });

  return existing;
}

export async function cancelArchitectureJob(jobId: string, userId: string) {
  const job = await prismaClient.analysisJob.findFirst({
    where: { id: jobId, userId },
  });
  if (!job) return null;
  await prismaClient.analysisJob.update({
    where: { id: jobId },
    data: { cancelRequested: true, status: "cancelling", stage: "cancelling" },
  });
  activeJobs.get(jobId)?.abort();
  return jobId;
}

export async function getRoomArchitectureJobs(roomId: number) {
  return await prismaClient.analysisJob.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      architectureGraph: {
        select: {
          id: true,
          commitSha: true,
          nodeCount: true,
          edgeCount: true,
          sourceCount: true,
        },
      },
    },
  });
}

async function runArchitectureJob(
  jobId: string,
  input: {
    roomId: number;
    userId: string;
    repositoryUrl: string;
    repositoryFullName: string;
    branch: string;
    depth: AnalysisDepth;
    githubToken?: string;
  },
) {
  const controller = new AbortController();
  activeJobs.set(jobId, controller);
  try {
    await updateJob(jobId, { status: "running", stage: "connecting" });
    const graph = await analyzeRepository({
      url: input.repositoryUrl,
      branch: input.branch,
      depth: input.depth,
      client: new GitHubClient({
        token: input.githubToken,
        signal: controller.signal,
      }),
      onStage: async (stage) => {
        if (!controller.signal.aborted) {
          await updateJob(jobId, { stage }).catch(() => undefined);
        }
      },
    });
    if (controller.signal.aborted) throw new Error("Analysis cancelled.");
    await updateJob(jobId, { stage: "persisting" });
    const persisted = await prismaClient.architectureGraph.upsert({
      where: {
        roomId_repositoryFullName_commitSha: {
          roomId: input.roomId,
          repositoryFullName: graph.repository.fullName,
          commitSha: graph.repository.commitSha,
        },
      },
      create: {
        roomId: input.roomId,
        userId: input.userId,
        repositoryFullName: graph.repository.fullName,
        repositoryUrl: input.repositoryUrl,
        commitSha: graph.repository.commitSha,
        branch: input.branch,
        depth: input.depth,
        graph: graph as object,
        sourceCount: graph.stats.filesAnalyzed,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
      },
      update: {
        graph: graph as object,
        updatedAt: new Date(),
        depth: input.depth,
      },
    });
    await prismaClient.analysisJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        stage: "complete",
        architectureGraphId: persisted.id,
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    await prismaClient.analysisJob
      .update({
        where: { id: jobId },
        data: {
          status: message === "Analysis cancelled." ? "cancelled" : "failed",
          stage: "failed",
          error: message,
          finishedAt: new Date(),
        },
      })
      .catch(() => undefined);
  } finally {
    activeJobs.delete(jobId);
  }
}

async function updateJob(
  jobId: string,
  data: { status?: string; stage?: string },
) {
  await prismaClient.analysisJob.update({ where: { id: jobId }, data });
}

export async function getJobGraph(
  jobId: string,
  userId: string,
): Promise<ArchitectureGraph | null> {
  const job = await prismaClient.analysisJob.findFirst({
    where: { id: jobId, userId },
    include: { architectureGraph: true },
  });
  return (
    (job?.architectureGraph?.graph as unknown as ArchitectureGraph) || null
  );
}

