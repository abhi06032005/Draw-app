import "dotenv/config";
import express from "express";
import bcrypt from "bcrypt";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import {
  AnalyzeGitHubRepositorySchema,
  CreateSignupSchema,
  SigninSchema,
  CreateRoomSchema,
  UpdateSceneSchema,
} from "@repo/common/types";
import jwt from "jsonwebtoken";
import { prismaClient } from "@repo/db/client";
import { JWT_SECRET } from "@repo/common-backend/config";
import { middleware, ensureUser, extractTokenPayload } from "./middleware";
import { analyzeRepository } from "./github/repositoryAnalyzer";
import { GitHubApiError } from "./github/githubClient";
import { GitHubClient, parseGitHubRepositoryUrl } from "./github/githubClient";
import {
  cancelArchitectureJob,
  enqueueArchitectureJob,
  getJobGraph,
  retryArchitectureJob,
  getRoomArchitectureJobs,
} from "./architecture/jobService";
import {
  saveUserGitHubToken,
  getUserGitHubConnectionStatus,
  deleteUserGitHubConnection,
  getUserGitHubToken,
} from "./architecture/tokenVault";

const app = express();

// Security Headers
app.use(helmet());
app.disable("x-powered-by");

// JSON Body Parser with Size Limit (50MB for Excalidraw scenes & file assets)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// CORS Configuration for local & production deployment
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:3000,http://127.0.0.1:3000,https://localhost:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== "production"
      ) {
        callback(null, true);
      } else {
        // Return false to reject CORS cleanly without throwing an unhandled 500 error
        callback(null, false);
      }
    },
    credentials: true,
  }),
);

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per IP
  message: { message: "Too many auth attempts. Please try again later." },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 600, // 600 requests per minute for smooth real-time autosave
  message: { message: "Too many requests. Please slow down." },
});

app.get("/", (req, res) => {
  res.send("Sketio HTTP Backend is running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/signup", authLimiter);
app.use("/signin", authLimiter);
app.use(apiLimiter);

app.post("/signup", async function (req, res) {
  const parsedData = CreateSignupSchema.safeParse(req.body);

  if (!parsedData.success) {
    return res.status(400).json({
      message: "Incorrect inputs",
      errors: parsedData.error.flatten(),
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(parsedData.data.password, 10);

    const userExists = await prismaClient.user.findFirst({
      where: {
        email: parsedData.data.username,
      },
    });

    if (userExists) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    await prismaClient.user.create({
      data: {
        email: parsedData.data.username,
        password: hashedPassword,
        name: parsedData.data.name,
      },
    });

    return res.status(201).json({
      message: "User created successfully",
    });
  } catch (e) {
    console.error("Signup error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/signin", async function (req, res) {
  const parsedData = SigninSchema.safeParse(req.body);

  if (!parsedData.success) {
    return res.status(400).json({
      message: "Incorrect inputs",
    });
  }

  try {
    const user = await prismaClient.user.findFirst({
      where: {
        email: parsedData.data.username,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const matchPassword = await bcrypt.compare(
      parsedData.data.password,
      user.password,
    );

    if (!matchPassword) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const userId = user.id;

    const token = jwt.sign(
      { userId, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.status(200).json({
      token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (e) {
    console.error("Signin error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/user", middleware, async function (req, res) {
  //@ts-ignore
  const userId = req.userId;
  //@ts-ignore
  const userEmail = req.userEmail;

  try {
    const user = await prismaClient.user.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      // Resilient fallback for newly created OAuth sessions with alias
      if (userId) {
        return res.json({
          id: userId,
          email: userEmail || `${userId}@user.local`,
          name: (req as any).userName || (userEmail ? userEmail.split("@")[0] : "Collaborator"),
        });
      }
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/get-rooms", middleware, async function (req, res) {
  //@ts-ignore
  const userId = req.userId;
  //@ts-ignore
  const userEmail = req.userEmail;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Support all user identity aliases (UUID and email) to always discover all owned & shared rooms
  const candidateIds = Array.from(new Set([userId, userEmail])).filter(Boolean) as string[];

  const roomSelect = {
    id: true,
    slug: true,
    title: true,
    createAt: true,
    updatedAt: true,
    adminId: true,
  };

  try {
    // Ultra-fast index-driven queries in parallel:
    // 1. Owned rooms (uses Room_adminId_updatedAt_idx)
    // 2. Member rooms (uses BoardMember_userId_idx)
    const [ownedRooms, memberRecords] = await Promise.all([
      prismaClient.room.findMany({
        where: { adminId: { in: candidateIds } },
        select: roomSelect,
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      prismaClient.boardMember.findMany({
        where: { userId: { in: candidateIds } },
        select: {
          room: {
            select: roomSelect,
          },
        },
        take: 100,
      }),
    ]);

    // Merge & deduplicate by room id in memory
    const roomMap = new Map<number, any>();
    for (const r of ownedRooms) {
      if (r) roomMap.set(r.id, r);
    }
    for (const m of memberRecords) {
      if (m?.room && !roomMap.has(m.room.id)) {
        roomMap.set(m.room.id, m.room);
      }
    }

    const sortedRooms = Array.from(roomMap.values()).sort(
      (a, b) => new Date(b.updatedAt || b.createAt).getTime() - new Date(a.updatedAt || a.createAt).getTime(),
    );

    res.setHeader("Cache-Control", "private, no-cache, no-transform");
    return res.json(sortedRooms);
  } catch (err) {
    console.warn(
      "Primary parallel get-rooms query failed, attempting standard fallback:",
      err,
    );
    try {
      const fallbackRooms = await prismaClient.room.findMany({
        where: {
          adminId: { in: candidateIds },
        },
        select: roomSelect,
        orderBy: {
          updatedAt: "desc",
        },
        take: 100,
      });
      return res.json(fallbackRooms);
    } catch (fallbackErr) {
      console.error("All get-rooms queries failed:", fallbackErr);
      return res.json([]);
    }
  }
});

app.post("/room", middleware, async function (req, res) {
  const parsedData = CreateRoomSchema.safeParse(req.body);

  if (!parsedData.success) {
    return res.status(400).json({
      message: "Incorrect inputs",
      errors: parsedData.error.flatten(),
    });
  }

  //@ts-ignore
  const userId = req.userId;
  const roomSlug = parsedData.data.name.trim();

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Ensure user row exists in PostgreSQL to satisfy Foreign Key constraint
    await ensureUser(userId, (req as any).userEmail, (req as any).userName);

    // If room with this slug already exists, return it and add user as member if needed
    const existingRoom = await prismaClient.room
      .findUnique({
        where: { slug: roomSlug },
      })
      .catch(() => null);

    if (existingRoom) {
      if (existingRoom.adminId !== userId) {
        try {
          await prismaClient.boardMember.upsert({
            where: {
              roomId_userId: {
                roomId: existingRoom.id,
                userId: userId,
              },
            },
            create: {
              roomId: existingRoom.id,
              userId: userId,
              role: "EDITOR",
            },
            update: {},
          });
        } catch {
          // BoardMember table might not exist in legacy schema
        }
      }

      return res.status(200).json({
        roomId: existingRoom.slug,
        id: existingRoom.id,
        message: "Room already exists, opened successfully",
      });
    }

    try {
      const room = await prismaClient.room.create({
        data: {
          adminId: userId,
          slug: roomSlug,
          title: roomSlug,
          elements: [],
          appState: {},
          files: {},
          members: {
            create: {
              userId: userId,
              role: "ADMIN",
            },
          },
        },
      });

      return res.status(201).json({
        roomId: room.slug,
        id: room.id,
      });
    } catch (fullCreateErr: any) {
      console.warn(
        "Full room create failed, using legacy create:",
        fullCreateErr?.message || fullCreateErr,
      );
      const minimalRoom = await prismaClient.room.create({
        data: {
          adminId: userId,
          slug: roomSlug,
        },
      });

      return res.status(201).json({
        roomId: minimalRoom.slug,
        id: minimalRoom.id,
      });
    }
  } catch (e: any) {
    console.error("Create room error:", e);
    // Fallback: check if created by concurrent request
    const fallbackRoom = await prismaClient.room
      .findUnique({
        where: { slug: roomSlug },
      })
      .catch(() => null);
    if (fallbackRoom) {
      return res.status(200).json({
        roomId: fallbackRoom.slug,
        id: fallbackRoom.id,
      });
    }
    return res
      .status(500)
      .json({ message: e?.message || "Failed to create or enter room" });
  }
});

app.get("/room/:slug", async function (req, res) {
  const slug = String(req.params.slug).trim();

  const authHeader = req.headers["authorization"];
  let userId: string | null = null;
  let userEmail: string | undefined;
  let userName: string | undefined;

  if (authHeader) {
    const payload = extractTokenPayload(authHeader);
    if (payload?.userId) {
      userId = payload.userId;
      userEmail = payload.email;
      userName = payload.name;
    }
  }

  try {
    let room: any = null;
    try {
      room = await prismaClient.room.findUnique({
        where: { slug: slug },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          members: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
      });
    } catch {
      room = await prismaClient.room
        .findUnique({
          where: { slug: slug },
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })
        .catch(() => null);
    }

    // If room does not exist and caller is authenticated, auto-create room so user can start drawing immediately
    if (!room && userId) {
      userId = await ensureUser(userId, userEmail, userName);
      try {
        room = await prismaClient.room.create({
          data: {
            slug: slug,
            title: slug,
            adminId: userId,
            elements: [],
            appState: {},
            files: {},
            members: {
              create: {
                userId: userId,
                role: "ADMIN",
              },
            },
          },
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            members: {
              select: {
                userId: true,
                role: true,
              },
            },
          },
        });
      } catch {
        try {
          room = await prismaClient.room.create({
            data: {
              slug: slug,
              adminId: userId,
            },
            include: {
              admin: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });
        } catch {
          room = await prismaClient.room
            .findUnique({
              where: { slug: slug },
            })
            .catch(() => null);
        }
      }
    }

    if (!room) {
      return res
        .status(404)
        .json({
          message: "Room not found. Please log in or create this room.",
        });
    }

    // Determine user permission
    let role = "VIEWER";
    if (userId) {
      if (room.adminId === userId) {
        role = "ADMIN";
      } else {
        const membersList = room.members || [];
        const member = membersList.find((m: any) => m.userId === userId);
        if (member) {
          role = member.role;
        } else {
          role = "EDITOR"; // Default authenticated users to editor for seamless collaboration
          // Add user as editor in background without blocking room delivery
          prismaClient.boardMember.upsert({
            where: {
              roomId_userId: {
                roomId: room.id,
                userId: userId,
              },
            },
            create: {
              roomId: room.id,
              userId: userId,
              role: "EDITOR",
            },
            update: {},
          }).catch(() => {});
        }
      }
    }

    let latestArchitectureGraph: any = null;
    try {
      const persistedGraph = await prismaClient.architectureGraph.findFirst({
        where: { roomId: room.id },
        orderBy: { updatedAt: "desc" },
      });
      if (persistedGraph) {
        latestArchitectureGraph = persistedGraph.graph;
      }
    } catch {}

    return res.json({
      roomId: room.id,
      slug: room.slug,
      title: room.title || room.slug,
      elements: room.elements || [],
      appState: room.appState || {},
      files: room.files || {},
      architectureGraph: latestArchitectureGraph,
      role: role,
      admin: room.admin,
      createAt: room.createAt,
      updatedAt: room.updatedAt || room.createAt,
    });
  } catch (e) {
    console.error("Get room slug error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Scene persistence endpoint: autosave Excalidraw scene
app.put("/room/:slug/scene", middleware, async function (req, res) {
  const slug = String(req.params.slug).trim();
  //@ts-ignore
  const userId = req.userId;

  const parsed = UpdateSceneSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({
        message: "Invalid scene format",
        errors: parsed.error.flatten(),
      });
  }

  try {
    const room = await prismaClient.room.findUnique({
      where: { slug },
      include: { members: true },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check if user has permission to edit
    const isAuthorized =
      room.adminId === userId ||
      room.members.some(
        (m: { userId: string; role: string }) =>
          m.userId === userId && m.role !== "VIEWER",
      );

    if (!isAuthorized) {
      return res
        .status(403)
        .json({ message: "Viewer only: cannot edit board" });
    }

    const { elements, appState, files } = parsed.data;

    await prismaClient.room.update({
      where: { slug },
      data: {
        elements: elements !== undefined ? elements : undefined,
        appState: appState !== undefined ? appState : undefined,
        files: files !== undefined ? files : undefined,
      },
    });

    return res.json({ message: "Scene saved successfully" });
  } catch (e) {
    console.error("Save scene error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Analyze a public GitHub repository for the current editable room.
app.post(
  "/room/:slug/github-architecture",
  middleware,
  async function (req, res) {
    const slug = String(req.params.slug).trim();
    //@ts-ignore
    const userId = req.userId;
    const parsed = AnalyzeGitHubRepositorySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid GitHub analysis request",
        errors: parsed.error.flatten(),
      });
    }

    try {
      const room = await prismaClient.room.findUnique({
        where: { slug },
        include: { members: true },
      });

      if (!room) return res.status(404).json({ message: "Room not found" });

      const canEdit =
        room.adminId === userId ||
        room.members.some(
          (member: { userId: string; role: string }) =>
            member.userId === userId && member.role !== "VIEWER",
        );
      if (!canEdit)
        return res
          .status(403)
          .json({
            message: "Viewer only: cannot import architecture into this board",
          });

      const graph = await analyzeRepository(parsed.data);
      return res.json({ success: true, graph });
    } catch (error) {
      if (error instanceof GitHubApiError) {
        const status =
          error.status === 404
            ? 404
            : error.status === 403
              ? 429
              : error.status === 504
                ? 504
                : 502;
        return res
          .status(status)
          .json({ message: error.message, retryAfter: error.retryAfter });
      }
      const message =
        error instanceof Error ? error.message : "Repository analysis failed";
      return res.status(400).json({ message });
    }
  },
);

// GitHub Connection Management (Server-side token vault)
app.put("/github/connection", middleware, async function (req, res) {
  //@ts-ignore
  const userId = req.userId;
  const { accessToken, githubLogin } = req.body || {};
  if (!accessToken || typeof accessToken !== "string") {
    return res.status(400).json({ message: "accessToken is required" });
  }
  try {
    const conn = await saveUserGitHubToken(userId, accessToken, githubLogin);
    return res.json({
      success: true,
      connected: true,
      githubLogin: conn.githubLogin,
    });
  } catch (error) {
    console.error("Save GitHub connection error:", error);
    return res
      .status(500)
      .json({ message: "Could not save GitHub connection" });
  }
});

app.get("/github/connection/status", middleware, async function (req, res) {
  //@ts-ignore
  const userId = req.userId;
  try {
    const status = await getUserGitHubConnectionStatus(userId);
    return res.json(status);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Could not retrieve GitHub connection status" });
  }
});

app.delete("/github/connection", middleware, async function (req, res) {
  //@ts-ignore
  const userId = req.userId;
  try {
    await deleteUserGitHubConnection(userId);
    return res.json({ success: true, connected: false });
  } catch (error) {
    return res.status(500).json({ message: "Could not disconnect GitHub" });
  }
});

app.post(
  "/room/:slug/github-architecture/jobs",
  middleware,
  async function (req, res) {
    const slug = String(req.params.slug).trim();
    //@ts-ignore
    const userId = req.userId;
    const parsed = AnalyzeGitHubRepositorySchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({
          message: "Invalid GitHub analysis request",
          errors: parsed.error.flatten(),
        });

    try {
      const room = await prismaClient.room.findUnique({
        where: { slug },
        include: { members: true },
      });
      if (!room) return res.status(404).json({ message: "Room not found" });
      const canEdit =
        room.adminId === userId ||
        room.members.some(
          (member: { userId: string; role: string }) =>
            member.userId === userId && member.role !== "VIEWER",
        );
      if (!canEdit)
        return res
          .status(403)
          .json({
            message: "Viewer only: cannot analyze a repository in this board",
          });
      const repository = parseGitHubRepositoryUrl(parsed.data.url);
      if (!repository)
        return res
          .status(400)
          .json({
            message: "Enter a valid public or private GitHub repository URL.",
          });

      const userToken = await getUserGitHubToken(userId);
      const effectiveToken =
        String(req.headers["x-github-token"] || "").trim() ||
        userToken ||
        process.env.GITHUB_TOKEN ||
        process.env.GITHUB_PAT ||
        process.env.GH_TOKEN ||
        undefined;

      const github = new GitHubClient({
        token: effectiveToken,
      });
      const metadata = await github.getRepository(
        repository.owner,
        repository.repo,
      );
      const commitSha = await github.getCommitSha(
        repository.owner,
        repository.repo,
        parsed.data.branch || metadata.default_branch,
      );
      const { job, cached } = await enqueueArchitectureJob({
        roomId: room.id,
        userId,
        repositoryUrl: parsed.data.url,
        repositoryFullName: metadata.full_name,
        branch: parsed.data.branch || metadata.default_branch,
        depth: parsed.data.depth,
        githubToken: effectiveToken,
        commitSha,
        forceRefresh: Boolean(req.body?.forceRefresh),
      });
      return res.status(202).json({
        jobId: job.id,
        status: job.status,
        stage: job.stage,
        cached,
      });
    } catch (error) {
      if (error instanceof GitHubApiError)
        return res
          .status(error.status === 404 ? 404 : error.status === 403 ? 403 : 502)
          .json({ message: error.message });
      return res
        .status(500)
        .json({
          message:
            error instanceof Error
              ? error.message
              : "Could not queue analysis.",
        });
    }
  },
);

app.get(
  "/room/:slug/github-architecture/jobs",
  middleware,
  async function (req, res) {
    const slug = String(req.params.slug).trim();
    //@ts-ignore
    const userId = req.userId;
    try {
      const room = await prismaClient.room.findUnique({
        where: { slug },
        include: { members: true },
      });
      if (!room) return res.status(404).json({ message: "Room not found" });
      const canAccess =
        room.adminId === userId ||
        room.members.some(
          (member: { userId: string }) => member.userId === userId,
        );
      if (!canAccess)
        return res.status(403).json({ message: "Access denied to room jobs" });

      const jobs = await getRoomArchitectureJobs(room.id);
      return res.json({ jobs });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Could not retrieve room analysis jobs" });
    }
  },
);

app.get("/architecture-jobs/:jobId", middleware, async function (req, res) {
  //@ts-ignore
  const userId = req.userId;
  const job = await prismaClient.analysisJob.findFirst({
    where: { id: String(req.params.jobId), userId },
  });
  if (!job) return res.status(404).json({ message: "Analysis job not found" });
  const graph =
    job.status === "completed" ? await getJobGraph(job.id, userId) : null;
  return res.json({ job, graph });
});

app.post(
  "/architecture-jobs/:jobId/cancel",
  middleware,
  async function (req, res) {
    //@ts-ignore
    const userId = req.userId;
    const cancelled = await cancelArchitectureJob(
      String(req.params.jobId),
      userId,
    );
    if (!cancelled)
      return res.status(404).json({ message: "Analysis job not found" });
    return res.json({ jobId: cancelled, status: "cancelling" });
  },
);

app.post(
  "/architecture-jobs/:jobId/retry",
  middleware,
  async function (req, res) {
    //@ts-ignore
    const userId = req.userId;
    const retried = await retryArchitectureJob(
      String(req.params.jobId),
      userId,
    );
    if (!retried)
      return res.status(404).json({ message: "Analysis job not found" });
    return res.json({ jobId: retried.id, status: "queued", stage: "queued" });
  },
);

// Room members list
app.get("/room/:slug/members", middleware, async function (req, res) {
  const slug = String(req.params.slug).trim();

  try {
    const room = await prismaClient.room.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        admin: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    return res.json({
      admin: room.admin,
      members: room.members,
    });
  } catch (e) {
    console.error("Get members error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Add member by email
app.post("/room/:slug/members", middleware, async function (req, res) {
  const slug = String(req.params.slug).trim();
  //@ts-ignore
  const currentUserId = req.userId;
  const { email, role = "EDITOR" } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const room = await prismaClient.room.findUnique({ where: { slug } });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.adminId !== currentUserId) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    const userToAdd = await prismaClient.user.findUnique({ where: { email } });
    if (!userToAdd) {
      return res
        .status(404)
        .json({ message: "User not found with this email" });
    }

    const member = await prismaClient.boardMember.upsert({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: userToAdd.id,
        },
      },
      create: {
        roomId: room.id,
        userId: userToAdd.id,
        role: role,
      },
      update: {
        role: role,
      },
    });

    return res
      .status(201)
      .json({ message: "Member added successfully", member });
  } catch (e) {
    console.error("Add member error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// File asset upload (for Excalidraw images)
app.post("/api/files", middleware, async function (req, res) {
  const { id, mimeType, data } = req.body;
  if (!id || !data) {
    return res.status(400).json({ message: "Missing file id or data" });
  }

  try {
    await prismaClient.fileAsset.upsert({
      where: { id: id },
      create: {
        id: id,
        mimeType: mimeType || "application/octet-stream",
        data: data,
      },
      update: {
        mimeType: mimeType || "application/octet-stream",
        data: data,
      },
    });

    return res.status(201).json({ message: "File saved", id });
  } catch (e) {
    console.error("File upload error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// File asset retrieval
app.get("/api/files/:fileId", async function (req, res) {
  const fileId = req.params.fileId;
  try {
    const file = await prismaClient.fileAsset.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.json(file);
  } catch (e) {
    console.error("Get file error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/chats/:roomId", async function (req, res) {
  try {
    const roomId = Number(req.params.roomId);
    if (isNaN(roomId)) {
      return res.status(400).json({ error: "Invalid room ID" });
    }

    const messages = await prismaClient.chat.findMany({
      where: { roomId: roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { id: "asc" },
      take: 50,
    });

    return res.json({ messages });
  } catch (e) {
    console.error("Fetch chats error:", e);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.delete("/delete/:roomId", middleware, async function (req, res) {
  const roomId = Number(req.params.roomId);
  if (isNaN(roomId)) {
    return res.status(400).json({ error: "Invalid room ID" });
  }

  //@ts-ignore
  const userId = req.userId;

  try {
    // Verify room exists and caller is admin
    const room = await prismaClient.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.adminId !== userId) {
      return res
        .status(403)
        .json({ message: "Only room admin can reset room" });
    }

    await prismaClient.room.update({
      where: { id: roomId },
      data: {
        elements: [],
        files: {},
      },
    });

    return res.json({ message: "Canvas cleared successfully" });
  } catch (e) {
    console.error("Delete shapes error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

const port: number = Number(process.env.PORT || 4000);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server started on port ${port}`);
});
