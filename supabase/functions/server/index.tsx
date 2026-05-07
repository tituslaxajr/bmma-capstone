import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
// KV migration complete — all routes now use SQL (kv_store.tsx no longer used)

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-User-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

/* ─── Helper: get admin Supabase client (singleton — avoids creating a new client per KV call) ─── */
let _adminClient: any = null;
function getAdminClient() {
  if (!_adminClient) {
    _adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _adminClient;
}

/* ══════════════════════════════════════════
   DB HELPERS (inline — replaces db.tsx)
   ══════════════════════════════════════════ */
function db() { return getAdminClient(); }

/** snake_case → camelCase (top-level keys only) */
function R(row: any): any {
  if (row == null) return row;
  if (Array.isArray(row)) return row.map(R);
  if (typeof row !== "object") return row;
  const r: any = {};
  for (const [k, v] of Object.entries(row)) {
    r[k.replace(/_([a-z])/g, (_m: string, ch: string) => ch.toUpperCase())] = v;
  }
  return r;
}

/** camelCase → snake_case (top-level keys only) */
function W(obj: any): any {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const r: any = {};
  for (const [k, v] of Object.entries(obj)) {
    r[k.replace(/[A-Z]/g, (ch: string) => `_${ch.toLowerCase()}`)] = v;
  }
  return r;
}

/** Generic table accessor */
function T(name: string) {
  return {
    async get(id: any, idCol = "id") {
      const { data } = await db().from(name).select("*").eq(idCol, id).maybeSingle();
      return data ? R(data) : null;
    },
    async all(orderCol?: string, asc = true) {
      let q = db().from(name).select("*");
      if (orderCol) q = q.order(orderCol, { ascending: asc });
      const { data } = await q;
      return (data || []).map(R);
    },
    async where(col: string, val: any, orderCol?: string, asc = true) {
      let q = db().from(name).select("*").eq(col, val);
      if (orderCol) q = q.order(orderCol, { ascending: asc });
      const { data } = await q;
      return (data || []).map(R);
    },
    async ins(row: any) {
      const { data, error } = await db().from(name).insert(W(row)).select().single();
      if (error) { console.log(`DB insert ${name}: ${error.message}`); return null; }
      return data ? R(data) : null;
    },
    async upd(id: any, updates: any, idCol = "id") {
      const { data, error } = await db().from(name).update(W(updates)).eq(idCol, id).select().single();
      if (error) { console.log(`DB update ${name}: ${error.message}`); return null; }
      return data ? R(data) : null;
    },
    async ups(row: any) {
      const { data, error } = await db().from(name).upsert(W(row)).select().single();
      if (error) { console.log(`DB upsert ${name}: ${error.message}`); return null; }
      return data ? R(data) : null;
    },
    async del(id: any, idCol = "id") {
      await db().from(name).delete().eq(idCol, id);
    },
    q() { return db().from(name); },
  };
}

/** Insert notification row */
async function dbNotify(userId: string, type: string, title: string, detail: string) {
  try {
    await db().from("notifications").insert({
      user_id: userId, type, title, detail,
      time: new Date().toISOString(), read: false,
    });
  } catch (e) { console.log(`Notification insert (non-critical): ${e}`); }
}

/** Next auto-increment ID via SQL RPC */
async function dbNextId(entity: string): Promise<number> {
  const { data, error } = await db().rpc("next_id", { entity_name: entity });
  if (error) {
    console.log(`dbNextId(${entity}) rpc error: ${error.message}, fallback to timestamp`);
    return Date.now() % 1_000_000;
  }
  return data as number;
}

/* ─── Helper: verify authorized user, returns user id ─── */
async function getAuthedUserId(c: any): Promise<string | null> {
  // User token is passed in X-User-Token header (Authorization is used by Supabase gateway)
  const token = c.req.header("X-User-Token");
  if (!token) return null;
  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

/** Get full auth user object (for auto-provisioning) */
async function getAuthedUser(c: any): Promise<any | null> {
  const token = c.req.header("X-User-Token");
  if (!token) return null;
  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user;
}

function normalizeSecondaryRoles(role: string, roles: any): string[] {
  if (!Array.isArray(roles)) return [];
  const allowed = new Set(["panelist", "adviser"]);
  return Array.from(new Set(
    roles
      .map((r: any) => String(r || "").toLowerCase())
      .filter((r: string) => allowed.has(r) && r !== role)
  ));
}

function hasProfileRole(profile: any, role: string): boolean {
  const roles = [profile?.role, ...(profile?.secondaryRoles || [])].map((r: string) => r?.toLowerCase());
  return roles.includes(role);
}

/** Auto-provision a user_profiles row from Supabase Auth user if missing */
async function ensureProfile(userId: string, authUser?: any): Promise<any> {
  let profile = await T("user_profiles").get(userId);
  if (profile) return profile;

  // Auto-create from auth metadata
  const meta = authUser?.user_metadata || {};
  const email = authUser?.email || meta.email || "unknown@example.com";
  const name = meta.name || meta.full_name || email.split("@")[0];
  const role = meta.role || "coordinator"; // first user is usually coordinator
  const secondaryRoles = normalizeSecondaryRoles(role, meta.secondaryRoles);
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const newProfile = {
    id: userId,
    name,
    email,
    role,
    secondaryRoles,
    group: "—",
    adviser: "—",
    department: "",
    status: "Active",
    avatar: initials,
    createdAt: new Date().toISOString(),
  };
  await T("user_profiles").ins(newProfile);
  console.log(`Auto-provisioned profile for ${email} (${role})`);
  return newProfile;
}

/* ─── Helper: verify coordinator role ─── */
async function requireCoordinator(c: any): Promise<{ userId: string } | Response> {
  const authUser = await getAuthedUser(c);
  if (!authUser?.id) return c.json({ error: "Unauthorized — no valid session" }, 401);
  const userId = authUser.id;
  const profile = await ensureProfile(userId, authUser);
  if (!profile || profile.role !== "coordinator") {
    return c.json({ error: "Forbidden — coordinator access required" }, 403);
  }
  return { userId };
}

/* ─── Supabase Storage: idempotent bucket creation ─── */
const PREDEFENSE_BUCKET = "make-36da3eb1-predefense";
const AVATAR_BUCKET = "make-36da3eb1-avatars";
let _bucketsInitialized = false;
async function ensureBuckets() {
  if (_bucketsInitialized) return;
  try {
    const sb = getAdminClient();
    const { data: buckets } = await sb.storage.listBuckets();
    for (const bucketName of [PREDEFENSE_BUCKET, AVATAR_BUCKET]) {
      const exists = buckets?.some((b: any) => b.name === bucketName);
      if (!exists) {
        await sb.storage.createBucket(bucketName, { public: false });
        console.log(`Created storage bucket: ${bucketName}`);
      }
    }
    _bucketsInitialized = true;
  } catch (err) {
    console.log(`Bucket init warning (non-fatal): ${err}`);
  }
}
ensureBuckets();

// Health check endpoint
app.get("/make-server-36da3eb1/health", (c) => {
  return c.json({ status: "ok", ts: Date.now() });
});

/* ══════════════════════════════════════════
   LANDING: Public groups list (no auth)
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/landing/groups", async (c) => {
  try {
    // 1. Try real portal groups first
    const realGroups = await T("groups").all();
    if (realGroups && realGroups.length > 0) {
      // Fetch all user profiles so we can enrich members with avatarUrl
      const allUsers = await T("user_profiles").all();
      const userByEmail: Record<string, any> = {};
      const userByName: Record<string, any> = {};
      (allUsers || []).forEach((u: any) => {
        if (u.email) userByEmail[u.email.toLowerCase()] = u;
        if (u.name) userByName[u.name.toLowerCase()] = u;
      });

      // Resolve group photos AND feature images from Storage — list files in groups/ prefix
      // This ensures photos show even if the DB columns are missing
      const supabaseSt = getAdminClient();
      const groupPhotoMap: Record<string, string> = {};
      const groupFeatureMap: Record<string, string> = {};
      try {
        const { data: folders } = await supabaseSt.storage.from(AVATAR_BUCKET).list("groups", { limit: 200 });
        if (folders && folders.length > 0) {
          const folderChecks = folders
            .filter((f: any) => f.name && !f.name.startsWith("."))
            .map(async (folder: any) => {
              try {
                const { data: files } = await supabaseSt.storage.from(AVATAR_BUCKET).list(`groups/${folder.name}`, { limit: 10 });
                const photoFile = (files || []).find((f: any) => f.name?.startsWith("photo"));
                if (photoFile) {
                  const { data: signed } = await supabaseSt.storage
                    .from(AVATAR_BUCKET)
                    .createSignedUrl(`groups/${folder.name}/${photoFile.name}`, 60 * 60 * 24);
                  if (signed?.signedUrl) {
                    groupPhotoMap[folder.name] = signed.signedUrl;
                  }
                }
                const featureFile = (files || []).find((f: any) => f.name?.startsWith("feature"));
                if (featureFile) {
                  const { data: signed } = await supabaseSt.storage
                    .from(AVATAR_BUCKET)
                    .createSignedUrl(`groups/${folder.name}/${featureFile.name}`, 60 * 60 * 24);
                  if (signed?.signedUrl) {
                    groupFeatureMap[folder.name] = signed.signedUrl;
                  }
                }
              } catch (_e) { /* skip individual folder errors */ }
            });
          await Promise.all(folderChecks);
        }
      } catch (storageErr) {
        console.log(`Landing: storage photo/feature lookup (non-fatal): ${storageErr}`);
      }

      // Transform real group shape → landing GroupData shape
      const mapped = realGroups.map((g: any) => {
        const gId = String(g.id ?? g.number ?? 0);
        const getInitials = (name: string) => {
          if (!name) return "??";
          const parts = name.trim().split(/\s+/);
          if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
          return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        };
        // Normalize members to { initials, name } format, enriching with user profile avatars
        let members = (g.members || []).map((m: any) => {
          if (typeof m === "string") return { initials: getInitials(m), name: m };
          const mName = m.name || m.email || "Member";
          const profile = (m.email && userByEmail[m.email.toLowerCase()]) || userByName[mName.toLowerCase()] || null;
          const avatarUrl = m.avatarUrl || m.avatar_url || profile?.avatarUrl || profile?.avatar_url || null;
          return { initials: m.initials || getInitials(mName), name: mName, avatarUrl };
        });
        // Fallback: if g.members is empty (column stripped in migration), derive from user_profiles
        if (members.length === 0 && allUsers) {
          const groupLabel = `Group ${g.number || g.id}`;
          const profileMembers = (allUsers as any[])
            .filter((u: any) => u.role === "student" && (u.group === groupLabel || u.group === g.title || u.group === g.name))
            .map((u: any) => ({
              initials: u.avatar || getInitials(u.name || ""),
              name: u.name || u.email || "Member",
              avatarUrl: u.avatarUrl || u.avatar_url || null,
            }));
          if (profileMembers.length > 0) members = profileMembers;
        }
        // Resolve photo & feature image: prefer DB column, fallback to storage-derived signed URL
        const photoUrl = g.photoUrl || g.photo_url || groupPhotoMap[gId] || null;
        const featureImageUrl = g.featureImageUrl || g.feature_image_url || groupFeatureMap[gId] || null;
        return {
          id: g.id ?? g.number ?? 0,
          name: g.name || `Group ${g.number || g.id}`,
          type: g.type || "Other",
          title: g.title || "Untitled Project",
          area: g.description || g.title || "",
          status: g.status || "In Progress",
          members,
          adviser: g.adviser || "—",
          photoUrl,
          featureImageUrl,
        };
      });
      const sorted = mapped.sort((a: any, b: any) => a.id - b.id);
      return c.json({ groups: sorted, seeded: false, source: "portal" });
    }

    // 2. Fallback to seeded landing groups
    const seededGroups = await T("landing_groups").all();
    if (seededGroups && seededGroups.length > 0) {
      const sorted = seededGroups.sort((a: any, b: any) => a.id - b.id);
      return c.json({ groups: sorted, seeded: true, source: "seed" });
    }

    // 3. Nothing at all
    return c.json({ groups: [], seeded: false, source: "none" });
  } catch (err) {
    console.log(`Error fetching landing groups: ${err}`);
    return c.json({ error: `Failed to fetch groups: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   LANDING: Aggregated public stats (no auth)
   Returns live counts, upcoming defenses, faculty
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/landing/data", async (c) => {
  try {
    const [groups, users, defensesRaw, announcements] = await Promise.all([
      T("groups").all(),
      T("user_profiles").all(),
      T("defenses").all(),
      T("announcements").all(),
    ]);
    const defenses = defensesRaw.map(defenseToFrontend);

    // Counts
    const studentCount = users.filter((u: any) => u.role === "student" && u.status === "Active").length;
    const panelistProfiles = users.filter((u: any) => hasProfileRole(u, "panelist") && u.status === "Active");
    const coordinators = users.filter((u: any) => u.role === "coordinator" && u.status === "Active");

    // Unique advisers from groups
    const adviserNames = new Set(groups.map((g: any) => g.adviser).filter(Boolean).filter((a: string) => a !== "—"));

    // Upcoming defenses (future or today)
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const upcomingDefenses = defenses
      .filter((d: any) => d.date && d.date >= todayStr)
      .sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""))
      .map((d: any) => {
        const gNum = String(d.group || "").replace(/\D/g, "") || d.group;
        const matchedGroup = (groups || []).find((g: any) => String(g.number) === gNum || String(g.id) === gNum || String(g.id) === d.group);
        return {
          id: d.id, group: d.group, title: d.title,
          groupName: matchedGroup ? (matchedGroup.name || `Group ${matchedGroup.number}`) : "",
          groupTitle: matchedGroup?.title || d.title || "",
          date: d.date, time: d.time, room: d.room,
          mode: d.mode, status: d.status,
        };
      });

    // Distinct defense dates
    const defenseDates = [...new Set(upcomingDefenses.map((d: any) => d.date))];

    // Faculty: coordinators + panelists with public-safe fields
    const faculty = coordinators.map((u: any) => ({
      name: u.name, role: u.department ? "Program Head" : "Coordinator",
      dept: u.department || "BMMA Department",
      color: "#4D8FFF",
    }));
    const panelists = panelistProfiles.map((u: any) => ({
      name: u.name,
      dept: u.department || "Multimedia Arts",
    }));

    // Published announcements (latest 5, public preview)
    const pubAnnouncements = (announcements || [])
      .filter((a: any) => a.status === "published")
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
      .map((a: any) => ({ title: a.title, date: a.date, type: a.type }));

    return c.json({
      stats: {
        groups: groups.length,
        students: studentCount,
        panelists: panelistProfiles.length,
        advisers: adviserNames.size,
        defenseSlots: defenses.length,
        upcomingDefenses: upcomingDefenses.length,
      },
      defenses: upcomingDefenses,
      defenseDates,
      faculty,
      panelists,
      announcements: pubAnnouncements,
    });
  } catch (err) {
    console.log(`Error fetching landing data: ${err}`);
    return c.json({ error: `Failed to fetch landing data: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   LANDING: Seed default groups (public, idempotent)
   ══════════════════════════════════════════ */
app.post("/make-server-36da3eb1/landing/groups/seed", async (c) => {
  try {
    const existing = await T("landing_groups").all();
    if (existing && existing.length > 0) {
      return c.json({ message: "Groups already seeded", count: existing.length });
    }

    const defaultGroups = [
      { id: 1, name: "Lumière", type: "Short Film", title: "Silhouettes of Memory: A Short Film on Generational Storytelling", area: "Visual narrative & cultural preservation through cinematic storytelling", status: "In Progress", members: [{ initials: "AR", name: "Angel Ramos" }, { initials: "BC", name: "Bianca Cruz" }, { initials: "CD", name: "Carlos Diaz" }], adviser: "Prof. Ana Cruz" },
      { id: 2, name: "Pixel Collective", type: "Photo Exhibit", title: "Chromatic Dialogues: Visual Narratives in Urban Space", area: "Photography as social commentary in urban Filipino communities", status: "In Progress", members: [{ initials: "DE", name: "Diana Espino" }, { initials: "EF", name: "Eduardo Flores" }, { initials: "FG", name: "Francesca Garcia" }], adviser: "Prof. Jose Reyes" },
      { id: 3, name: "Vanguard", type: "Social Media", title: "Amplify: Social Media Campaigns for Community Health Awareness", area: "Digital health literacy campaigns for barangay youth", status: "Pre-Defense", members: [{ initials: "GH", name: "Gabrielle Herrera" }, { initials: "HI", name: "Hugo Ibañez" }, { initials: "IJ", name: "Isabella Jimenez" }], adviser: "Prof. Ana Cruz" },
      { id: 4, name: "Epoch", type: "Documentary", title: "Roots & Routes: Documenting San Fernando's Creative Heritage", area: "Oral history documentation through multimedia storytelling", status: "In Progress", members: [{ initials: "JK", name: "Juan Kalinga" }, { initials: "KL", name: "Kayla Lagman" }, { initials: "LM", name: "Luis Morales" }], adviser: "Prof. Jose Reyes" },
      { id: 5, name: "Infoviz", type: "Infographic", title: "Data Decoded: Infographic Series on Local Environmental Impact", area: "Environmental data visualization for community awareness", status: "Submitted", members: [{ initials: "MN", name: "Maria Navarro" }, { initials: "NO", name: "Nathan Ocampo" }, { initials: "OP", name: "Olivia Perez" }], adviser: "Dr. Maria Santos" },
      { id: 6, name: "Lens & Light", type: "Short Film", title: "Unseen Threads: A Short Film on Student Mental Health", area: "Mental health advocacy through visual media narratives", status: "In Progress", members: [{ initials: "PQ", name: "Paolo Quinto" }, { initials: "QR", name: "Queen Ramos" }, { initials: "RS", name: "Rafael Santos" }], adviser: "Dr. Maria Santos" },
      { id: 7, name: "Canvas Lab", type: "Photo Exhibit", title: "Ground Level: Perspectives from Below the City Line", area: "Photographic exploration of marginalized urban communities", status: "Pre-Defense", members: [{ initials: "ST", name: "Sofia Torres" }, { initials: "TU", name: "Tomas Umali" }, { initials: "UV", name: "Ursula Valdez" }], adviser: "Prof. Ana Cruz" },
      { id: 8, name: "Echo Studio", type: "Documentary", title: "Woven Words: A Documentary on Indigenous Textile Art", area: "Documentary preservation of traditional Filipino textile arts", status: "In Progress", members: [{ initials: "VW", name: "Victor Wong" }, { initials: "WX", name: "Wilma Xavier" }, { initials: "XY", name: "Xavier Yu" }], adviser: "Prof. Jose Reyes" },
    ];

    for (const g of defaultGroups) {
      await T("landing_groups").ins(g);
    }

    console.log(`Seeded ${defaultGroups.length} landing groups`);
    return c.json({ message: "Groups seeded successfully", count: defaultGroups.length }, 201);
  } catch (err) {
    console.log(`Error seeding groups: ${err}`);
    return c.json({ error: `Failed to seed groups: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   AUTH: Sign Up (Coordinator creates users)
   ══════════════════════════════════════════ */
app.post("/make-server-36da3eb1/auth/signup", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;

    const { email, password, name, role, secondaryRoles, group, adviser, department } = await c.req.json();
    const normalizedSecondaryRoles = normalizeSecondaryRoles(role, secondaryRoles);

    if (!email || !password || !name || !role) {
      return c.json({ error: "Missing required fields: email, password, name, role" }, 400);
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role, secondaryRoles: normalizedSecondaryRoles },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.log(`Error creating user ${email}: ${error.message}`);
      return c.json({ error: `Failed to create user: ${error.message}` }, 400);
    }

    // Store profile in KV
    const profile = {
      id: data.user.id,
      name,
      email,
      role,
      secondaryRoles: normalizedSecondaryRoles,
      group: group || "—",
      adviser: adviser || "���",
      department: department || "",
      status: "Active",
      avatar: name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    await T("user_profiles").ins(profile);

    console.log(`User created successfully: ${email} (${role})`);
    return c.json({ user: profile }, 201);
  } catch (err) {
    console.log(`Unexpected error in signup: ${err}`);
    return c.json({ error: `Server error during signup: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   AUTH: Bulk Sign Up (Coordinator creates multiple users at once)
   Accepts: { users: [{ name, email, password, role?, group?, adviser?, department? }] }
   ══════════════════════════════════════════ */
app.post("/make-server-36da3eb1/auth/bulk-signup", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;

    const { users } = await c.req.json();
    if (!Array.isArray(users) || users.length === 0) {
      return c.json({ error: "Provide a non-empty 'users' array" }, 400);
    }
    if (users.length > 100) {
      return c.json({ error: "Maximum 100 users per bulk operation" }, 400);
    }

    const supabase = getAdminClient();
    const results: { email: string; success: boolean; error?: string; userId?: string }[] = [];

    for (const u of users) {
      const { email, password, name, role, secondaryRoles, group, adviser, department } = u;
      const normalizedSecondaryRoles = normalizeSecondaryRoles(role || "student", secondaryRoles);
      if (!email || !password || !name) {
        results.push({ email: email || "?", success: false, error: "Missing name, email, or password" });
        continue;
      }
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password,
          user_metadata: { name, role: role || "student", secondaryRoles: normalizedSecondaryRoles },
          email_confirm: true,
        });
        if (error) {
          results.push({ email, success: false, error: error.message });
          continue;
        }
        const profile = {
          id: data.user.id, name, email,
          role: role || "student",
          secondaryRoles: normalizedSecondaryRoles,
          group: group || "—",
          adviser: adviser || "—",
          department: department || "",
          status: "Active",
          avatar: name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
          createdAt: new Date().toISOString(),
        };
        await T("user_profiles").ins(profile);
        results.push({ email, success: true, userId: data.user.id });
      } catch (e: any) {
        results.push({ email, success: false, error: e.message || String(e) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    console.log(`Bulk signup: ${successCount} created, ${failCount} failed out of ${users.length}`);
    return c.json({ results, summary: { total: users.length, created: successCount, failed: failCount } }, 201);
  } catch (err) {
    console.log(`Bulk signup error: ${err}`);
    return c.json({ error: `Server error during bulk signup: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   USERS: Bulk Avatar Upload (Coordinator uploads multiple profile pictures)
   Accepts: FormData with files named "avatar_{userId}" or "avatar_{email}"
   ══════════════════════════════════════════ */
app.post("/make-server-36da3eb1/users/bulk-avatar", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    await ensureBuckets();

    const formData = await c.req.formData();
    const supabase = getAdminClient();
    const allUsers = await T("user_profiles").all();
    const results: { key: string; success: boolean; error?: string }[] = [];

    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File)) continue;
      // key format: "avatar_{userId}" or "avatar_{email}"
      const identifier = key.replace(/^avatar_/, "");
      const user = allUsers.find((u: any) =>
        u.id === identifier || u.email?.toLowerCase() === identifier.toLowerCase()
      );
      if (!user) {
        results.push({ key, success: false, error: `No user found for identifier: ${identifier}` });
        continue;
      }
      try {
        const ext = value.name?.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/avatar.${ext}`;
        const bytes = new Uint8Array(await value.arrayBuffer());

        // Upsert the file
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(path, bytes, { contentType: value.type || "image/jpeg", upsert: true });
        if (uploadError) {
          results.push({ key, success: false, error: uploadError.message });
          continue;
        }
        // Generate signed URL (365 days)
        const { data: signed } = await supabase.storage
          .from(AVATAR_BUCKET)
          .createSignedUrl(path, 365 * 24 * 60 * 60);
        const avatarUrl = signed?.signedUrl || "";

        // Update user profile
        await T("user_profiles").upd(user.id, { avatarUrl });
        results.push({ key, success: true });
        console.log(`Avatar uploaded for ${user.name} (${user.email})`);
      } catch (e: any) {
        results.push({ key, success: false, error: e.message || String(e) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Bulk avatar upload: ${successCount}/${results.length} succeeded`);
    return c.json({ results, summary: { total: results.length, success: successCount, failed: results.length - successCount } });
  } catch (err) {
    console.log(`Bulk avatar upload error: ${err}`);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

/* ═���════════════════════════════════════════
   USERS: Single Avatar Upload (Coordinator uploads one profile picture)
   ══════════════════════════════════════════ */
app.post("/make-server-36da3eb1/users/:userId/avatar", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    await ensureBuckets();

    const userId = c.req.param("userId");
    const user = await T("user_profiles").get(userId);
    if (!user) return c.json({ error: "User not found" }, 404);

    const formData = await c.req.formData();
    const file = formData.get("avatar") as File | null;
    if (!file) return c.json({ error: "No avatar file provided" }, 400);

    const supabase = getAdminClient();
    const ext = file.name?.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, bytes, { contentType: file.type || "image/jpeg", upsert: true });
    if (uploadError) return c.json({ error: `Upload failed: ${uploadError.message}` }, 500);

    const { data: signed } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, 365 * 24 * 60 * 60);
    const avatarUrl = signed?.signedUrl || "";

    await T("user_profiles").upd(userId, { avatarUrl });
    console.log(`Avatar uploaded for ${user.name} (${user.email})`);
    return c.json({ avatarUrl });
  } catch (err) {
    console.log(`Avatar upload error: ${err}`);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   GROUPS: Photo Upload (Coordinator uploads group photo)
   ══════════════════════════════════════════ */
app.post("/make-server-36da3eb1/groups/:id/photo", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    await ensureBuckets();

    const groupId = c.req.param("id");
    // Try both string and numeric ID (groups table uses TEXT id but values are numeric)
    let group = await T("groups").get(groupId);
    if (!group) group = await T("groups").get(Number(groupId));
    if (!group) return c.json({ error: "Group not found" }, 404);

    const formData = await c.req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return c.json({ error: "No photo file provided" }, 400);

    const supabase = getAdminClient();
    const ext = file.name?.split(".").pop()?.toLowerCase() || "jpg";
    const path = `groups/${groupId}/photo.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, bytes, { contentType: file.type || "image/jpeg", upsert: true });
    if (uploadError) return c.json({ error: `Upload failed: ${uploadError.message}` }, 500);

    const { data: signed } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, 365 * 24 * 60 * 60);
    const photoUrl = signed?.signedUrl || "";

    // Try to persist URL in DB (may fail silently if photo_url column doesn't exist —
    // photo is still served via Storage lookup fallback in GET /groups and GET /landing/groups)
    const updResult = await T("groups").upd(groupId, { photoUrl });
    if (!updResult) {
      console.log(`Group photo DB persist skipped (photo_url column may be missing) — photo accessible via Storage for group ${groupId}`);
    }
    console.log(`Group photo uploaded for Group ${group.number || groupId}, path: ${path}`);
    return c.json({ photoUrl });
  } catch (err) {
    console.log(`Group photo upload error: ${err}`);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   GROUPS: Feature Image Upload (distinct from group photo — used for landing page "See What They Made")
   ══════════════════════════════════════════ */
app.post("/make-server-36da3eb1/groups/:id/feature-image", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    await ensureBuckets();

    const groupId = c.req.param("id");
    let group = await T("groups").get(groupId);
    if (!group) group = await T("groups").get(Number(groupId));
    if (!group) return c.json({ error: "Group not found" }, 404);

    const formData = await c.req.formData();
    const file = formData.get("featureImage") as File | null;
    if (!file) return c.json({ error: "No feature image file provided" }, 400);

    const supabase = getAdminClient();
    const ext = file.name?.split(".").pop()?.toLowerCase() || "jpg";
    const path = `groups/${groupId}/feature.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, bytes, { contentType: file.type || "image/jpeg", upsert: true });
    if (uploadError) return c.json({ error: `Upload failed: ${uploadError.message}` }, 500);

    const { data: signed } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, 365 * 24 * 60 * 60);
    const featureImageUrl = signed?.signedUrl || "";

    // Persist URL in group record
    await T("groups").upd(groupId, { featureImageUrl });
    console.log(`Feature image uploaded for Group ${group.number || groupId}, path: ${path}`);
    return c.json({ featureImageUrl });
  } catch (err) {
    console.log(`Feature image upload error: ${err}`);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   AUTH: Bootstrap — seed coordinator account
   (public, idempotent — creates initial coord if none exists)
   ══════════════════════════════════════════ */
app.post("/make-server-36da3eb1/auth/bootstrap", async (c) => {
  try {
    const existing = await T("user_profiles").all();
    const hasCoordinator = existing.some((u: any) => u.role === "coordinator");
    if (hasCoordinator) {
      return c.json({ message: "Coordinator already exists, skipping bootstrap" });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: "coord@sti.edu.ph",
      password: "coord123",
      user_metadata: { name: "Prof. Mario Reyes", role: "coordinator" },
      email_confirm: true,
    });

    if (error) {
      // User might already exist in auth but not in KV
      if (error.message?.includes("already been registered")) {
        // Try to find existing auth user
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u: any) => u.email === "coord@sti.edu.ph");
        if (existingUser) {
          const profile = {
            id: existingUser.id,
            name: "Prof. Mario Reyes",
            email: "coord@sti.edu.ph",
            role: "coordinator",
            group: "—",
            adviser: "—",
            department: "BMMA Department",
            status: "Active",
            avatar: "MR",
            createdAt: new Date().toISOString(),
          };
          await T("user_profiles").ins(profile);
          return c.json({ message: "Coordinator profile synced from existing auth user", user: profile });
        }
      }
      console.log(`Bootstrap error: ${error.message}`);
      return c.json({ error: `Bootstrap failed: ${error.message}` }, 400);
    }

    const profile = {
      id: data.user.id,
      name: "Prof. Mario Reyes",
      email: "coord@sti.edu.ph",
      role: "coordinator",
      group: "—",
      adviser: "—",
      department: "BMMA Department",
      status: "Active",
      avatar: "MR",
      createdAt: new Date().toISOString(),
    };
    await T("user_profiles").ins(profile);

    console.log("Bootstrap: Coordinator account created");
    return c.json({ message: "Coordinator account created", user: profile }, 201);
  } catch (err) {
    console.log(`Bootstrap error: ${err}`);
    return c.json({ error: `Bootstrap error: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   USERS: List all user profiles
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/users", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const users = await T("user_profiles").all();
    return c.json({ users });
  } catch (err) {
    console.log(`Error listing users: ${err}`);
    return c.json({ error: `Failed to list users: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   USERS: Get current user's profile
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/users/me", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const profile = await T("user_profiles").get(userId);
    if (!profile) return c.json({ error: "Profile not found" }, 404);
    return c.json({ user: profile });
  } catch (err) {
    console.log(`Error getting user profile: ${err}`);
    return c.json({ error: `Failed to get profile: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   USERS: Update user profile (coordinator only)
   ══════════════════════════════════════════ */
app.put("/make-server-36da3eb1/users/:id", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;

    const targetId = c.req.param("id");
    const updates = await c.req.json();

    const existing = await T("user_profiles").get(targetId);
    if (!existing) return c.json({ error: "User not found" }, 404);
    if (updates.secondaryRoles !== undefined || updates.role !== undefined) {
      updates.secondaryRoles = normalizeSecondaryRoles(updates.role || existing.role, updates.secondaryRoles || existing.secondaryRoles);
    }

    const updated = { ...existing, ...updates, id: targetId };
    await T("user_profiles").upd(targetId, updates);

    // Also update auth user_metadata if role or name changed
    if (updates.role || updates.name || updates.secondaryRoles) {
      const supabase = getAdminClient();
      await supabase.auth.admin.updateUserById(targetId, {
        user_metadata: {
          name: updated.name,
          role: updated.role,
          secondaryRoles: updated.secondaryRoles || [],
        },
      });
    }

    console.log(`User ${targetId} updated by coordinator`);
    return c.json({ user: updated });
  } catch (err) {
    console.log(`Error updating user: ${err}`);
    return c.json({ error: `Failed to update user: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   USERS: Toggle user status (coordinator only)
   ══════════════════════════════���═══════════ */
app.put("/make-server-36da3eb1/users/:id/toggle-status", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;

    const targetId = c.req.param("id");
    const existing = await T("user_profiles").get(targetId);
    if (!existing) return c.json({ error: "User not found" }, 404);

    const newStatus = existing.status === "Active" ? "Inactive" : "Active";
    await T("user_profiles").upd(targetId, { status: newStatus });
    existing.status = newStatus;

    // Ban/unban in Supabase Auth
    const supabase = getAdminClient();
    if (newStatus === "Inactive") {
      await supabase.auth.admin.updateUserById(targetId, { ban_duration: "876000h" }); // ~100 years
    } else {
      await supabase.auth.admin.updateUserById(targetId, { ban_duration: "none" });
    }

    console.log(`User ${targetId} status toggled to ${newStatus}`);
    return c.json({ user: existing });
  } catch (err) {
    console.log(`Error toggling user status: ${err}`);
    return c.json({ error: `Failed to toggle status: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   USERS: Delete user (coordinator only)
   ══════════════════════════════════════════ */
app.delete("/make-server-36da3eb1/users/:id", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;

    const targetId = c.req.param("id");
    
    // Remove from SQL
    await T("user_profiles").del(targetId);

    // Remove from Supabase Auth
    const supabase = getAdminClient();
    await supabase.auth.admin.deleteUser(targetId);

    console.log(`User ${targetId} deleted`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`Error deleting user: ${err}`);
    return c.json({ error: `Failed to delete user: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   COUNTER HELPER — auto-increment IDs (SQL RPC)
   ══════════════════════════════════════════ */
async function nextId(entity: string): Promise<number> {
  return dbNextId(entity);
}

/* ══════════════════════════════════════════
   GROUPS CRUD
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/groups", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const groups = await T("groups").all();
    const allUsers = await T("user_profiles").all();

    // Resolve group photos AND feature images from Storage as fallback
    const supabaseSt2 = getAdminClient();
    const groupPhotoMap2: Record<string, string> = {};
    const groupFeatureMap2: Record<string, string> = {};
    try {
      const { data: folders } = await supabaseSt2.storage.from(AVATAR_BUCKET).list("groups", { limit: 200 });
      if (folders && folders.length > 0) {
        const checks = folders
          .filter((f: any) => f.name && !f.name.startsWith("."))
          .map(async (folder: any) => {
            try {
              const { data: files } = await supabaseSt2.storage.from(AVATAR_BUCKET).list(`groups/${folder.name}`, { limit: 10 });
              const photoFile = (files || []).find((f: any) => f.name?.startsWith("photo"));
              if (photoFile) {
                const { data: signed } = await supabaseSt2.storage
                  .from(AVATAR_BUCKET)
                  .createSignedUrl(`groups/${folder.name}/${photoFile.name}`, 60 * 60 * 24);
                if (signed?.signedUrl) groupPhotoMap2[folder.name] = signed.signedUrl;
              }
              const featureFile = (files || []).find((f: any) => f.name?.startsWith("feature"));
              if (featureFile) {
                const { data: signed } = await supabaseSt2.storage
                  .from(AVATAR_BUCKET)
                  .createSignedUrl(`groups/${folder.name}/${featureFile.name}`, 60 * 60 * 24);
                if (signed?.signedUrl) groupFeatureMap2[folder.name] = signed.signedUrl;
              }
            } catch (_e) { /* skip */ }
          });
        await Promise.all(checks);
      }
    } catch (_e) { /* non-fatal */ }

    // Enrich each group: merge members from user profiles that reference this group
    const enriched = groups.map((g: any) => {
      const groupLabel = `Group ${g.number}`;
      // Find users whose profile.group matches this group
      const profileMembers = allUsers
        .filter((u: any) => u.role === "student" && (u.group === groupLabel || u.group === g.title))
        .map((u: any) => ({
          initials: u.avatar || u.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "??",
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl || null,
        }));

      // Merge: use profile-derived members (preferred), fall back to existing members
      const existingEmails = new Set(profileMembers.map((m: any) => m.email));
      const extraFromGroup = (g.members || [])
        .filter((m: any) => m.email && !existingEmails.has(m.email))
        .map((m: any) => {
          // Try to enrich with profile data
          const profile = allUsers.find((u: any) => u.email === m.email);
          return { ...m, avatarUrl: profile?.avatarUrl || null };
        });

      const mergedMembers = [...profileMembers, ...extraFromGroup];

      // Apply storage photo fallback if DB column photoUrl is missing/empty
      const photoUrl = g.photoUrl || g.photo_url || groupPhotoMap2[String(g.id)] || null;
      const featureImageUrl = g.featureImageUrl || g.feature_image_url || groupFeatureMap2[String(g.id)] || null;
      return { ...g, members: mergedMembers, photoUrl, featureImageUrl };
    });

    return c.json({ groups: enriched.sort((a: any, b: any) => a.number - b.number) });
  } catch (err) {
    console.log(`Error listing groups: ${err}`);
    return c.json({ error: `Failed to list groups: ${err}` }, 500);
  }
});

app.post("/make-server-36da3eb1/groups", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const body = await c.req.json();
    const id = await nextId("groups");
    const group = {
      id,
      number: body.number ?? id,
      title: body.title || "",
      type: body.type || "Other",
      status: body.status || "Pre-Defense",
      members: body.members || [],
      adviser: body.adviser || "—",
      adviserInitials: body.adviserInitials || "",
      panelists: body.panelists || [],
      progress: body.progress ?? 0,
      description: body.description || "",
      client: body.client || "",
      submissionType: body.submissionType || "custom",
      submissionInstructions: body.submissionInstructions || "",
      // Manuscript
      manuscriptFile: body.manuscriptFile || null,
      manuscriptPages: body.manuscriptPages || null,
      manuscriptSize: body.manuscriptSize || null,
      manuscriptDate: body.manuscriptDate || null,
      manuscriptStatus: body.manuscriptStatus || "Not Submitted",
      manuscriptPanelSent: body.manuscriptPanelSent ?? false,
      manuscriptPanelCount: body.manuscriptPanelCount ?? 0,
      manuscriptComments: body.manuscriptComments ?? 0,
      projectOutput: body.projectOutput || null,
      outputType: body.outputType || null,
      workingLink: body.workingLink ?? false,
      // Archive
      archiveRevisions: body.archiveRevisions || "empty",
      archiveApproval: body.archiveApproval || "empty",
      archiveHardbound: body.archiveHardbound || "empty",
      archiveSoftCopy: body.archiveSoftCopy || "empty",
      archivePeerEval: body.archivePeerEval || "empty",
      createdAt: new Date().toISOString(),
    };
    await T("groups").ins(group);
    console.log(`Group ${id} created: ${group.title}`);
    return c.json({ group }, 201);
  } catch (err) {
    console.log(`Error creating group: ${err}`);
    return c.json({ error: `Failed to create group: ${err}` }, 500);
  }
});

app.put("/make-server-36da3eb1/groups/:id", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param("id");
    // Try string ID first, then numeric (TEXT column stores numeric strings)
    let existing = await T("groups").get(id);
    if (!existing) existing = await T("groups").get(Number(id));
    if (!existing) return c.json({ error: `Group ${id} not found` }, 404);
    const updates = await c.req.json();
    console.log(`Group ${id} update payload keys: ${Object.keys(updates).join(", ")}`);
    const result = await T("groups").upd(existing.id, updates);
    if (!result) {
      console.log(`Group ${id} DB update FAILED — columns may be missing. Keys: ${Object.keys(updates).join(", ")}`);
      return c.json({ error: `Database update failed for group ${id}. Required columns may not exist in groups table (e.g. panelists JSONB). Check schema.` }, 500);
    }
    console.log(`Group ${id} updated successfully`);
    return c.json({ group: result });
  } catch (err) {
    console.log(`Error updating group: ${err}`);
    return c.json({ error: `Failed to update group: ${err}` }, 500);
  }
});

app.delete("/make-server-36da3eb1/groups/:id", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param("id");
    await T("groups").del(id);
    console.log(`Group ${id} deleted`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`Error deleting group: ${err}`);
    return c.json({ error: `Failed to delete group: ${err}` }, 500);
  }
});

/* ════════════════════════════════���═════════
   ANNOUNCEMENTS CRUD
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/announcements", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const items = await T("announcements").all();
    return c.json({ announcements: items.sort((a: any, b: any) => b.id - a.id) });
  } catch (err) {
    console.log(`Error listing announcements: ${err}`);
    return c.json({ error: `Failed to list announcements: ${err}` }, 500);
  }
});

app.post("/make-server-36da3eb1/announcements", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const body = await c.req.json();
    const id = await nextId("announcements");
    const item = {
      id,
      title: body.title || "",
      body: body.body || "",
      type: body.type || "General",
      priority: body.priority || "Normal",
      status: body.status || "Draft",
      audience: body.audience || "All Students",
      date: body.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      pinned: body.pinned ?? false,
      createdAt: new Date().toISOString(),
    };
    await T("announcements").ins(item);
    console.log(`Announcement ${id} created: ${item.title}`);
    return c.json({ announcement: item }, 201);
  } catch (err) {
    console.log(`Error creating announcement: ${err}`);
    return c.json({ error: `Failed to create announcement: ${err}` }, 500);
  }
});

app.put("/make-server-36da3eb1/announcements/:id", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param("id");
    const existing = await T("announcements").get(Number(id));
    if (!existing) return c.json({ error: "Announcement not found" }, 404);
    const updates = await c.req.json();
    const updated = { ...existing, ...updates, id: Number(id) };
    await T("announcements").upd(Number(id), updates);
    console.log(`Announcement ${id} updated`);
    return c.json({ announcement: updated });
  } catch (err) {
    console.log(`Error updating announcement: ${err}`);
    return c.json({ error: `Failed to update announcement: ${err}` }, 500);
  }
});

app.delete("/make-server-36da3eb1/announcements/:id", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param("id");
    await T("announcements").del(Number(id));
    console.log(`Announcement ${id} deleted`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`Error deleting announcement: ${err}`);
    return c.json({ error: `Failed to delete announcement: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   DEFENSE SLOTS CRUD
   Column mapping: DB uses group_number, panel_members, location
   but frontend/code uses group, panelists, room
   ══════════════════════════════════════════ */
function defenseToFrontend(d: any) {
  return {
    id: d.id,
    group: d.groupNumber || d.group || "",
    title: d.title || "",
    date: d.date || "TBD",
    time: d.time || "TBD",
    room: d.room || d.location || "TBD",
    mode: d.mode || "In-Person",
    panelists: d.panelMembers || d.panelists || [],
    status: d.status || "Scheduled",
    score: d.score ?? null,
    verdict: d.verdict ?? null,
    createdAt: d.createdAt,
  };
}

app.get("/make-server-36da3eb1/defenses", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const items = await T("defenses").all();
    const mapped = items.map(defenseToFrontend);
    return c.json({ defenses: mapped.sort((a: any, b: any) => String(a.id).localeCompare(String(b.id))) });
  } catch (err) {
    console.log(`Error listing defenses: ${err}`);
    return c.json({ error: `Failed to list defenses: ${err}` }, 500);
  }
});

app.post("/make-server-36da3eb1/defenses", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const body = await c.req.json();
    const id = await nextId("defenses");
    // Map frontend field names to actual DB column names
    // W() converts camelCase→snake_case: groupNumber→group_number, panelMembers→panel_members
    const dbRow: Record<string, any> = {
      id: String(id),
      groupNumber: body.group || "",
      title: body.title || "",
      date: body.date || "TBD",
      time: body.time || "TBD",
      room: body.room || "TBD",
      location: body.room || "TBD",
      mode: body.mode || "In-Person",
      panelMembers: body.panelists || [],
      status: body.status || "Scheduled",
      score: body.score ?? null,
      verdict: body.verdict ?? null,
      notes: body.notes || "",
      createdAt: new Date().toISOString(),
    };
    const result = await T("defenses").ins(dbRow);
    if (!result) {
      console.log(`Defense insert returned null — likely column mismatch. Row keys: ${Object.keys(dbRow).join(", ")}`);
      return c.json({ error: "Failed to save defense to database — check server logs for schema errors" }, 500);
    }
    console.log(`Defense slot ${id} created successfully`);

    const item = defenseToFrontend(result);

    // Notify group members (panelists now come from group record, not defense)
    try {
      const groups = await T("groups").all();
      const users = await T("user_profiles").all();
      const grp = groups.find((g: any) => `Group ${g.number}` === item.group || g.name === item.group);
      const recipientIds = new Set<string>();
      if (grp?.members) {
        for (const m of grp.members) {
          const u = users.find((usr: any) => usr.email === m.email);
          if (u) recipientIds.add(u.id);
        }
      }
      // Also notify panelists from the group record (source of truth)
      if (grp?.panelists?.length) {
        for (const p of grp.panelists) {
          const pName = typeof p === "string" ? p : p.name;
          const u = users.find((usr: any) => usr.name === pName || usr.email === pName);
          if (u) recipientIds.add(u.id);
        }
      }
      for (const uid of recipientIds) {
        await dbNotify(uid, "deadline", "Defense Scheduled",
          `${item.group} defense scheduled for ${item.date} at ${item.time} in ${item.room} (${item.mode}).`);
      }
    } catch (_) { /* non-critical */ }

    return c.json({ defense: item }, 201);
  } catch (err) {
    console.log(`Error creating defense: ${err}`);
    return c.json({ error: `Failed to create defense: ${err}` }, 500);
  }
});

app.put("/make-server-36da3eb1/defenses/:id", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param("id");
    const existing = await T("defenses").get(id);
    if (!existing) return c.json({ error: "Defense slot not found" }, 404);
    const body = await c.req.json();
    // Map frontend field names to DB column names for update
    const dbUpdates: Record<string, any> = {};
    if (body.group !== undefined) dbUpdates.groupNumber = body.group;
    if (body.title !== undefined) dbUpdates.title = body.title;
    if (body.date !== undefined) dbUpdates.date = body.date;
    if (body.time !== undefined) dbUpdates.time = body.time;
    if (body.room !== undefined) { dbUpdates.room = body.room; dbUpdates.location = body.room; }
    if (body.mode !== undefined) dbUpdates.mode = body.mode;
    if (body.panelists !== undefined) dbUpdates.panelMembers = body.panelists;
    if (body.status !== undefined) dbUpdates.status = body.status;
    if (body.score !== undefined) dbUpdates.score = body.score;
    if (body.verdict !== undefined) dbUpdates.verdict = body.verdict;
    const result = await T("defenses").upd(id, dbUpdates);
    if (!result) {
      console.log(`Defense update returned null — row ${id}. Keys: ${Object.keys(dbUpdates).join(", ")}`);
      return c.json({ error: "Failed to update defense in database — check server logs" }, 500);
    }
    console.log(`Defense ${id} updated successfully`);

    const updated = defenseToFrontend(result);

    // Notify on schedule/status changes
    try {
      const dateChanged = body.date && body.date !== (existing.date);
      const timeChanged = body.time && body.time !== (existing.time);
      const statusChanged = body.status && body.status !== (existing.status);
      if (dateChanged || timeChanged || statusChanged) {
        const groups = await T("groups").all();
        const users = await T("user_profiles").all();
        const grp = groups.find((g: any) => `Group ${g.number}` === updated.group || g.name === updated.group);
        const recipientIds = new Set<string>();
        if (grp?.members) {
          for (const m of grp.members) {
            const u = users.find((usr: any) => usr.email === m.email);
            if (u) recipientIds.add(u.id);
          }
        }
        if (grp?.panelists?.length) {
          for (const p of grp.panelists) {
            const pName = typeof p === "string" ? p : p.name;
            const u = users.find((usr: any) => usr.name === pName || usr.email === pName);
            if (u) recipientIds.add(u.id);
          }
        }
        const changeDesc = statusChanged ? `Status changed to "${updated.status}".` : `Rescheduled to ${updated.date} at ${updated.time}.`;
        for (const uid of recipientIds) {
          await dbNotify(uid, "deadline", "Defense Updated",
            `${updated.group} defense updated. ${changeDesc}`);
        }
      }
    } catch (_) { /* non-critical */ }

    return c.json({ defense: updated });
  } catch (err) {
    console.log(`Error updating defense: ${err}`);
    return c.json({ error: `Failed to update defense: ${err}` }, 500);
  }
});

app.delete("/make-server-36da3eb1/defenses/:id", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param("id");
    await T("defenses").del(id);
    console.log(`Defense ${id} deleted`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`Error deleting defense: ${err}`);
    return c.json({ error: `Failed to delete defense: ${err}` }, 500);
  }
});

/* ── DEADLINES & DEADLINE_PROGRESS routes removed (Mar 16, 2026) ──
   Tables `deadlines` and `deadline_progress` have been DROPped.
   ~570 lines of route handlers (14 endpoints) cleaned up. ── */

/* ══════════════════════════════════════════
   DASHBOARD STATS (aggregated read)
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/dashboard/stats", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const [users, groups, announcements] = await Promise.all([
      T("user_profiles").all(),
      T("groups").all(),
      T("announcements").all(),
    ]);

    const students = users.filter((u: any) => u.role === "student");
    const activeGroups = groups.filter((g: any) => g.status !== "Archived");
    const defenseReady = groups.filter((g: any) => g.status === "Defense Ready");
    const pending = groups.filter((g: any) => g.manuscriptStatus === "Not Submitted" || g.manuscriptStatus === "Needs Revision");
    const archived = groups.filter((g: any) => g.status === "Archived");

    const submitted = groups.filter((g: any) => g.manuscriptStatus === "Approved").length;
    const pendingMs = groups.filter((g: any) => g.manuscriptStatus === "Under Review" || g.manuscriptStatus === "Needs Revision").length;
    const missing = groups.filter((g: any) => g.manuscriptStatus === "Not Submitted").length;

    return c.json({
      totalStudents: students.length,
      activeGroups: activeGroups.length,
      defenseReady: defenseReady.length,
      pendingSubmissions: pending.length,
      fullyArchived: archived.length,
      submissionDonut: { submitted, pending: pendingMs, missing },
      recentGroups: groups.sort((a: any, b: any) => a.number - b.number).slice(0, 8),
    });
  } catch (err) {
    console.log(`Error fetching dashboard stats: ${err}`);
    return c.json({ error: `Failed to fetch stats: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   PUBLIC ANNOUNCEMENTS (published only, for student/panelist view)
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/announcements/published", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const items = await T("announcements").all();
    const published = items
      .filter((a: any) => a.status === "Published")
      .sort((a: any, b: any) => b.id - a.id);
    return c.json({ announcements: published });
  } catch (err) {
    console.log(`Error fetching published announcements: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   MY PROFILE + GROUP (for student/panelist context)
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/me/context", async (c) => {
  try {
    const authUser = await getAuthedUser(c);
    if (!authUser?.id) return c.json({ error: "Unauthorized" }, 401);
    const userId = authUser.id;

    // Auto-provision profile if missing (first login after direct Supabase Auth signup)
    const profile = await ensureProfile(userId, authUser);

    // Parallel fetch: all groups + all users + all defenses at once
    const [groups, allUsers, defensesRaw] = await Promise.all([
      T("groups").all(),
      T("user_profiles").all(),
      T("defenses").all(),
    ]);
    // Normalize defense records: DB uses group_number/panel_members, frontend expects group/panelists
    const defenses = defensesRaw.map(defenseToFrontend);

    // Find group this user belongs to (by profile.group field OR by matching member emails)
    let myGroup = null;
    for (const g of groups) {
      const groupLabel = `Group ${g.number}`;
      if (profile.group && (profile.group === groupLabel || profile.group === g.title)) {
        myGroup = g;
        break;
      }
      if (g.members?.some((m: any) => m.email === profile.email)) {
        myGroup = g;
        break;
      }
    }

    // Find defense for my group (defenses already normalized)
    let myDefense = null;
    if (myGroup) {
      myDefense = defenses.find((d: any) =>
        d.group === `Group ${myGroup.number}` || d.group === myGroup.name || d.group === myGroup.title
      ) || null;
    }

    // Helper: enrich a group's members from user profiles (allUsers already loaded)
    const enrichGroup = (g: any) => {
      const groupLabel = `Group ${g.number}`;
      const profileMembers = allUsers
        .filter((u: any) => u.role === "student" && (u.group === groupLabel || u.group === g.title))
        .map((u: any) => ({
          initials: u.avatar || u.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "??",
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl || null,
        }));
      const existingEmails = new Set(profileMembers.map((m: any) => m.email));
      const extraFromGroup = (g.members || [])
        .filter((m: any) => m.email && !existingEmails.has(m.email))
        .map((m: any) => {
          const prof = allUsers.find((u: any) => u.email === m.email);
          return { ...m, avatarUrl: prof?.avatarUrl || m.avatarUrl || null };
        });
      return { ...g, members: [...profileMembers, ...extraFromGroup] };
    };

    // For panelists/advisers: find groups where this user is a panelist
    let assignedGroups: any[] = [];
    if (hasProfileRole(profile, "panelist") || hasProfileRole(profile, "adviser")) {
      assignedGroups = groups
        .filter((g: any) =>
          g.panelists?.some((p: any) =>
            p.name === profile.name || p.name?.toLowerCase() === profile.name?.toLowerCase()
          )
        )
        .map(enrichGroup);
    }

    // For panelists/advisers/coordinator: find groups where this user is the adviser
    let advisedGroups: any[] = [];
    if (hasProfileRole(profile, "panelist") || hasProfileRole(profile, "adviser") || hasProfileRole(profile, "coordinator")) {
      advisedGroups = groups
        .filter((g: any) =>
          g.adviser && (g.adviser === profile.name || g.adviser?.toLowerCase() === profile.name?.toLowerCase())
        )
        .map(enrichGroup);
    }

    return c.json({
      profile,
      myGroup,
      myDefense,
      assignedGroups,
      advisedGroups,
    });
  } catch (err) {
    console.log(`Error fetching user context: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   ME: Bootstrap — single request that returns context +
   announcements + deadlines + notifications for dashboard.
   Eliminates 3–5 parallel HTTP round-trips on page load.
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/me/bootstrap", async (c) => {
  try {
    const authUser = await getAuthedUser(c);
    if (!authUser?.id) return c.json({ error: "Unauthorized" }, 401);
    const userId = authUser.id;

    // Auto-provision profile if missing
    const profile = await ensureProfile(userId, authUser);

    // Single massive parallel fetch — everything the dashboard needs
    const [groups, allUsers, defensesRaw, announcements, deadlines, notifRaw, timeline] = await Promise.all([
      T("groups").all(),
      T("user_profiles").all(),
      T("defenses").all(),
      T("announcements").all(),
      T("deadlines").all(),
      T("notifications").where("user_id", userId),
      T("timelines").all(),
    ]);
    // Normalize defense records: DB uses group_number/panel_members, frontend expects group/panelists
    const defenses = defensesRaw.map(defenseToFrontend);

    // ── Context (same logic as /me/context) ──
    let myGroup = null;
    for (const g of groups) {
      const groupLabel = `Group ${g.number}`;
      if (profile.group && (profile.group === groupLabel || profile.group === g.title)) { myGroup = g; break; }
      if (g.members?.some((m: any) => m.email === profile.email)) { myGroup = g; break; }
    }

    let myDefense = null;
    if (myGroup) {
      myDefense = defenses.find((d: any) =>
        d.group === `Group ${myGroup.number}` || d.group === myGroup.name || d.group === myGroup.title
      ) || null;
    }

    const enrichGroup = (g: any) => {
      const groupLabel = `Group ${g.number}`;
      const profileMembers = allUsers
        .filter((u: any) => u.role === "student" && (u.group === groupLabel || u.group === g.title))
        .map((u: any) => ({
          initials: u.avatar || u.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "??",
          name: u.name, email: u.email, avatarUrl: u.avatarUrl || null,
        }));
      const existingEmails = new Set(profileMembers.map((m: any) => m.email));
      const extraFromGroup = (g.members || [])
        .filter((m: any) => m.email && !existingEmails.has(m.email))
        .map((m: any) => {
          const prof = allUsers.find((u: any) => u.email === m.email);
          return { ...m, avatarUrl: prof?.avatarUrl || m.avatarUrl || null };
        });
      return { ...g, members: [...profileMembers, ...extraFromGroup] };
    };

    let assignedGroups: any[] = [];
    if (hasProfileRole(profile, "panelist") || hasProfileRole(profile, "adviser")) {
      assignedGroups = groups
        .filter((g: any) => g.panelists?.some((p: any) => p.name?.toLowerCase() === profile.name?.toLowerCase()))
        .map(enrichGroup);
    }
    let advisedGroups: any[] = [];
    if (hasProfileRole(profile, "panelist") || hasProfileRole(profile, "adviser") || hasProfileRole(profile, "coordinator")) {
      advisedGroups = groups
        .filter((g: any) => g.adviser?.toLowerCase() === profile.name?.toLowerCase())
        .map(enrichGroup);
    }

    // ── Announcements (published only) ──
    const pubAnnouncements = (announcements || [])
      .filter((a: any) => a.status === "published")
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // ── Deadlines ──
    const sortedDeadlines = (deadlines || [])
      .sort((a: any, b: any) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

    // ── Notifications (latest 50) ──
    const notifications = (notifRaw || [])
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 50);

    // ── Timeline ──
    const sortedTimeline = (timeline || [])
      .sort((a: any, b: any) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

    return c.json({
      context: { profile, myGroup, myDefense, assignedGroups, advisedGroups },
      announcements: pubAnnouncements,
      deadlines: sortedDeadlines,
      notifications,
      timeline: sortedTimeline,
    });
  } catch (err) {
    console.log(`Error in /me/bootstrap: ${err}`);
    return c.json({ error: `Bootstrap failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   ME: Update own profile (any authenticated user)
   Allows updating avatarUrl, profileSetupComplete
   ══════════════════════════════════════════ */
app.put("/make-server-36da3eb1/me/profile", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const updates = await c.req.json();
    const existing = await T("user_profiles").get(userId);
    if (!existing) return c.json({ error: "Profile not found" }, 404);

    // Only allow safe self-service fields
    const allowed: Record<string, any> = {};
    if (updates.avatarUrl !== undefined) allowed.avatarUrl = updates.avatarUrl;
    if (updates.profileSetupComplete !== undefined) allowed.profileSetupComplete = updates.profileSetupComplete;
    if (updates.name !== undefined && typeof updates.name === "string" && updates.name.trim()) allowed.name = updates.name.trim();
    if (updates.department !== undefined) allowed.department = updates.department;
    if (updates.contactNumber !== undefined) allowed.contactNumber = updates.contactNumber;

    const updated = { ...existing, ...allowed };
    await T("user_profiles").upd(userId, allowed);

    console.log(`User ${userId} updated own profile (fields: ${Object.keys(allowed).join(",")})`);
    return c.json({ profile: updated });
  } catch (err) {
    console.log(`Error updating own profile: ${err}`);
    return c.json({ error: `Failed to update profile: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   ME: Change own password (any authenticated user)
   ══════════════════════════════════════════ */
app.put("/make-server-36da3eb1/me/password", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const { newPassword } = await c.req.json();
    if (!newPassword || newPassword.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }

    const supabase = getAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) {
      console.log(`Error changing password for ${userId}: ${error.message}`);
      return c.json({ error: `Failed to change password: ${error.message}` }, 500);
    }

    console.log(`User ${userId} changed their password successfully`);
    return c.json({ message: "Password updated successfully" });
  } catch (err) {
    console.log(`Error changing password: ${err}`);
    return c.json({ error: `Failed to change password: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   ME: Notification/User preferences
   KV key: user-settings:{userId}
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/me/settings", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const row = await T("user_settings").get(userId, "user_id");
    return c.json({ settings: row?.settings || {} });
  } catch (err) {
    console.log(`Error fetching user settings: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

app.put("/make-server-36da3eb1/me/settings", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const updates = await c.req.json();
    const row = await T("user_settings").get(userId, "user_id");
    const existing = row?.settings || {};
    const merged = { ...existing, ...updates };
    await db().from("user_settings").upsert({ user_id: userId, settings: merged, updated_at: new Date().toISOString() });
    console.log(`User ${userId} updated their settings`);
    return c.json({ settings: merged });
  } catch (err) {
    console.log(`Error updating user settings: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   PORTAL SETTINGS (coordinator-only)
   KV key: portal-settings
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/portal-settings", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const row = await T("portal_settings").get("default", "id");
    return c.json({ settings: row?.settings || {} });
  } catch (err) {
    console.log(`Error fetching portal settings: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

app.put("/make-server-36da3eb1/portal-settings", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const updates = await c.req.json();
    const row = await T("portal_settings").get("default", "id");
    const existing = row?.settings || {};
    const merged = { ...existing, ...updates };
    await db().from("portal_settings").upsert({ id: "default", settings: merged, updated_at: new Date().toISOString() });
    console.log(`Portal settings updated by coordinator`);
    return c.json({ settings: merged });
  } catch (err) {
    console.log(`Error updating portal settings: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   WEEKLY PROGRESS REPORTS
   KV key: progress:{id}
   ══════════════════════════════════════════ */

/* Create a progress report (student) */
app.post("/make-server-36da3eb1/progress-reports", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const profile = await T("user_profiles").get(userId);
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    const { weekNumber, accomplishments, plans, blockers, groupNumber, groupId } = await c.req.json();
    if (!weekNumber || !accomplishments || !plans) {
      return c.json({ error: "Missing required fields: weekNumber, accomplishments, plans" }, 400);
    }

    const id = await nextId("progress");
    const report = {
      id,
      groupId: groupId || null,
      groupNumber: groupNumber || null,
      weekNumber,
      accomplishments,
      plans,
      blockers: blockers || "",
      submittedBy: userId,
      submittedByName: profile.name,
      submittedByAvatar: profile.avatarUrl || null,
      submittedByInitials: profile.avatar || profile.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
      status: "submitted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await T("progress_reports").ins(report);

    console.log(`Progress report ${id} created by ${profile.name} for Group ${groupNumber}, Week ${weekNumber}`);
    return c.json({ report }, 201);
  } catch (err) {
    console.log(`Error creating progress report: ${err}`);
    return c.json({ error: `Failed to create progress report: ${err}` }, 500);
  }
});

/* Get progress reports for a group */
app.get("/make-server-36da3eb1/progress-reports/group/:groupNumber", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const groupNumber = parseInt(c.req.param("groupNumber"));
    const all = await T("progress_reports").where("group_number", groupNumber);
    const reports = all
      .sort((a: any, b: any) => b.weekNumber - a.weekNumber || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ reports });
  } catch (err) {
    console.log(`Error fetching group progress reports: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Get ALL progress reports (coordinator view) */
app.get("/make-server-36da3eb1/progress-reports/all", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;

    const all = await T("progress_reports").all();
    const sorted = all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ reports: sorted });
  } catch (err) {
    console.log(`Error fetching all progress reports: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Update a progress report (own only) */
app.put("/make-server-36da3eb1/progress-reports/:id", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const reportId = parseInt(c.req.param("id"));
    const existing = await T("progress_reports").get(reportId);
    if (!existing) return c.json({ error: "Report not found" }, 404);
    if (existing.submittedBy !== userId) return c.json({ error: "You can only edit your own reports" }, 403);

    const updates = await c.req.json();
    const allowed: Record<string, any> = {};
    if (updates.accomplishments !== undefined) allowed.accomplishments = updates.accomplishments;
    if (updates.plans !== undefined) allowed.plans = updates.plans;
    if (updates.blockers !== undefined) allowed.blockers = updates.blockers;
    allowed.updatedAt = new Date().toISOString();

    const updated = { ...existing, ...allowed };
    await T("progress_reports").upd(reportId, allowed);

    console.log(`Progress report ${reportId} updated by user ${userId}`);
    return c.json({ report: updated });
  } catch (err) {
    console.log(`Error updating progress report: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Delete a progress report (own or coordinator) */
app.delete("/make-server-36da3eb1/progress-reports/:id", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const reportId = parseInt(c.req.param("id"));
    const existing = await T("progress_reports").get(reportId);
    if (!existing) return c.json({ error: "Report not found" }, 404);

    const profile = await T("user_profiles").get(userId);
    if (existing.submittedBy !== userId && profile?.role !== "coordinator") {
      return c.json({ error: "Forbidden" }, 403);
    }

    await T("progress_reports").del(reportId);
    console.log(`Progress report ${reportId} deleted by user ${userId}`);
    return c.json({ message: "Report deleted" });
  } catch (err) {
    console.log(`Error deleting progress report: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Add coordinator/adviser feedback to a progress report */
app.put("/make-server-36da3eb1/progress-reports/:id/feedback", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const profile = await T("user_profiles").get(userId);
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    // Allow coordinator, panelist, or adviser
    if (profile.role !== "coordinator" && profile.role !== "panelist" && profile.role !== "adviser") {
      return c.json({ error: "Forbidden — only coordinators/advisers can give feedback" }, 403);
    }

    const reportId = parseInt(c.req.param("id"));
    const existing = await T("progress_reports").get(reportId);
    if (!existing) return c.json({ error: "Report not found" }, 404);

    // If panelist or adviser, verify they are adviser for this group
    if (hasProfileRole(profile, "panelist") || hasProfileRole(profile, "adviser")) {
      const groups = await T("groups").all();
      const isAdviser = groups.some((g: any) =>
        (g.number === existing.groupNumber || g.id === existing.groupId) &&
        g.adviser && (g.adviser === profile.name || g.adviser?.toLowerCase() === profile.name?.toLowerCase())
      );
      if (!isAdviser) return c.json({ error: "Forbidden — you are not the adviser for this group" }, 403);
    }

    const { feedback, status } = await c.req.json();
    const feedbackSource = profile.role === "coordinator" ? "coordinator" : "adviser";
    const feedbackKey = feedbackSource === "adviser" ? "adviserFeedback" : "coordinatorFeedback";
    const feedbackAtKey = feedbackSource === "adviser" ? "adviserFeedbackAt" : "feedbackAt";
    const updates: any = {
      [feedbackKey]: feedback || existing[feedbackKey] || "",
      status: status || existing.status,
      [feedbackAtKey]: new Date().toISOString(),
      [`${feedbackSource}FeedbackBy`]: profile.name,
    };
    // Keep backward compat: coordinatorFeedback still set for coordinators
    if (feedbackSource === "coordinator") {
      updates.coordinatorFeedback = feedback || existing.coordinatorFeedback || "";
      updates.feedbackAt = new Date().toISOString();
    }
    await T("progress_reports").upd(reportId, updates);
    const updated = { ...existing, ...updates };

    // Create notification for submitter
    try {
      await dbNotify(existing.submittedBy, "feedback",
        `${feedbackSource === "adviser" ? "Adviser" : "Coordinator"} Feedback Received`,
        `${profile.name} left feedback on your Week ${existing.weekNumber} report.`);
    } catch (_) { /* notification creation is non-critical */ }

    console.log(`${feedbackSource} feedback added to progress report ${reportId} by ${profile.name}`);
    return c.json({ report: updated });
  } catch (err) {
    console.log(`Error adding feedback: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   GRADES CRUD — panelists submit grades per group
   KV key: grade:{id}
   ══════════════════════════════════════════ */

/* Submit a grade (panelist only) */
app.post("/make-server-36da3eb1/grades", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const profile = await T("user_profiles").get(userId);
    if (!profile || (profile.role !== "panelist" && profile.role !== "adviser")) {
      return c.json({ error: "Forbidden — only panelists/advisers can submit grades" }, 403);
    }

    const body = await c.req.json();
    const { groupId, groupNumber, groupTitle, scores, groupScores, groupTotal, individualScores, memberNotes, weightedTotal, verdict, feedback, revisions, panelSignOff } = body;

    if (!groupId || !verdict) {
      return c.json({ error: "Missing required fields: groupId, verdict" }, 400);
    }

    // Check for duplicate: same panelist + same group
    const existing = await T("grades").all();
    const dup = existing.find((g: any) => g.panelistId === userId && g.groupId === groupId);
    if (dup) {
      return c.json({ error: "You have already submitted a grade for this group" }, 409);
    }

    const id = await nextId("grades");
    const grade = {
      id,
      groupId,
      groupNumber: groupNumber ?? null,
      groupTitle: groupTitle || "",
      panelistId: userId,
      panelistName: profile.name,
      panelistAvatar: profile.avatar || "",
      scores: scores || groupScores || {},
      groupScores: groupScores || scores || {},
      individualScores: individualScores || {},
      memberNotes: memberNotes || {},
      groupTotal: groupTotal ?? null,
      panelSignOff: panelSignOff ?? null,
      weightedTotal: weightedTotal ?? 0,
      verdict,
      feedback: feedback || "",
      revisions: revisions || [],
      submittedAt: new Date().toISOString(),
    };
    await T("grades").ins(grade);
    console.log(`Grade ${id} submitted by ${profile.name} for group ${groupId}`);

    // Notify group members about panelist grade submission
    try {
      const groups = await T("groups").all();
      const users = await T("user_profiles").all();
      const grp = groups.find((g: any) => g.id === groupId || g.number === groupNumber);
      if (grp?.members) {
        for (const m of grp.members) {
          const u = users.find((usr: any) => usr.email === m.email);
          if (u) {
            await dbNotify(u.id, "grade", "Defense Grade Submitted",
              `A panelist has submitted a defense grade for your group. Verdict: ${verdict}.`);
          }
        }
      }
    } catch (_) { /* non-critical */ }

    // ── Auto-aggregate defense verdict when 3/3 panelists have graded ──
    let defenseVerdict: any = null;
    try {
      const allGrades = await T("grades").all();
      const gn = groupNumber ?? groupId;
      const groupGrades = allGrades.filter((g: any) => g.groupNumber === gn || g.groupId === gn);
      if (groupGrades.length >= 3) {
        const avgScore = groupGrades.reduce((s: number, g: any) => s + (g.weightedTotal || 0), 0) / groupGrades.length;
        const vCounts: Record<string, number> = {};
        groupGrades.forEach((g: any) => { vCounts[g.verdict] = (vCounts[g.verdict] || 0) + 1; });
        const majorityVerdict = Object.entries(vCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "pending";
        const criteriaKeys = ["results", "discussion", "output", "presentation", "qa"];
        const avgCriteria: Record<string, number> = {};
        for (const ck of criteriaKeys) {
          const vals = groupGrades.map((g: any) => g.scores?.[ck] || g.groupScores?.[ck] || 0).filter((v: number) => v > 0);
          if (vals.length > 0) avgCriteria[ck] = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
        }
        const memberIndivAvg: Record<string, Record<string, number>> = {};
        const indKeys = ["communication", "organization", "effectiveness"];
        const groups2 = await T("groups").all();
        const grp2 = groups2.find((g: any) => g.id === groupId || g.number === gn);
        for (const member of (grp2?.members || [])) {
          memberIndivAvg[member.name] = {};
          for (const ik of indKeys) {
            const vals = groupGrades.map((g: any) => g.individualScores?.[member.name]?.[ik] || 0).filter((v: number) => v > 0);
            if (vals.length > 0) memberIndivAvg[member.name][ik] = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
          }
        }
        defenseVerdict = {
          groupNumber: gn, groupName: grp2?.name || groupTitle || `Group ${gn}`,
          groupTitle: grp2?.title || groupTitle || "",
          panelistCount: groupGrades.length,
          panelists: groupGrades.map((g: any) => ({ name: g.panelistName, verdict: g.verdict, score: g.weightedTotal })),
          averageScore: Math.round(avgScore * 100) / 100, majorityVerdict,
          averageCriteria: avgCriteria, memberIndividualAverages: memberIndivAvg,
          verdictCounts: vCounts, completedAt: new Date().toISOString(),
          allGradeIds: groupGrades.map((g: any) => g.id),
        };
        await db().from("defence_verdicts").upsert(W({ ...defenseVerdict, groupNumber: gn }));
        console.log(`Defense verdict auto-computed for group ${gn}: ${majorityVerdict} (avg ${avgScore.toFixed(1)})`);
        // Notify students — official verdict is in!
        try {
          const users2 = await T("user_profiles").all();
          const memberEmails = (grp2?.members || []).map((m: any) => m.email?.toLowerCase());
          const verdictDisplay = majorityVerdict === "passed" || majorityVerdict === "pass" ? "PASSED" :
            majorityVerdict === "failed" ? "FAILED" : "PASSED WITH REVISIONS";
          for (const u of users2) {
            if (u.role === "student" && memberEmails.includes(u.email?.toLowerCase())) {
              await dbNotify(u.id, "defense-verdict", "All Panelists Have Graded!",
                `Your official defense verdict is in: ${verdictDisplay} (avg score: ${avgScore.toFixed(1)}/100). Check your Defense Results page!`);
            }
          }
          const coords = users2.filter((u: any) => u.role === "coordinator");
          for (const coord of coords) {
            await dbNotify(coord.id, "defense-verdict", `Defense Complete: Group ${gn}`,
              `All 3 panelists have graded Group ${gn}. Verdict: ${verdictDisplay} (${avgScore.toFixed(1)}/100).`);
          }
        } catch (_) { /* non-critical */ }
      }
    } catch (e) { console.log(`Auto-aggregate error (non-critical): ${e}`); }

    // Check if this panelist is lead for the group
    const groups3 = await T("groups").all();
    const grp3 = groups3.find((g: any) => g.id === groupId || g.number === (groupNumber ?? groupId));
    const isLeadPanelist = grp3?.panelists?.[0]?.name?.toLowerCase() === profile.name?.toLowerCase();
    // Count how many panelists have graded
    const latestGrades = await T("grades").all();
    const gn3 = groupNumber ?? groupId;
    const gradingProgress = latestGrades.filter((g: any) => g.groupId === groupId || g.groupNumber === gn3).length;

    return c.json({ grade, defenseVerdict, isLeadPanelist, gradingProgress, totalPanelists: grp3?.panelists?.length || 3 }, 201);
  } catch (err) {
    console.log(`Error submitting grade: ${err}`);
    return c.json({ error: `Failed to submit grade: ${err}` }, 500);
  }
});

/* Get defense verdict for a group (auto-aggregated after 3/3 panelists) */
app.get("/make-server-36da3eb1/defense-verdict/:groupNumber", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const groupNumber = Number(c.req.param("groupNumber"));
    const verdict = await T("defence_verdicts").get(groupNumber, "group_number");
    if (!verdict) return c.json({ verdict: null, complete: false });
    return c.json({ verdict, complete: true });
  } catch (err) {
    console.log(`Error fetching defense verdict: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* List all grades (coordinator or authed) */
app.get("/make-server-36da3eb1/grades", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const grades = await T("grades").all();
    return c.json({ grades: grades.sort((a: any, b: any) => b.id - a.id) });
  } catch (err) {
    console.log(`Error listing grades: ${err}`);
    return c.json({ error: `Failed to list grades: ${err}` }, 500);
  }
});

/* My submitted grades (panelist) */
app.get("/make-server-36da3eb1/grades/my", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const allGrades = await T("grades").all();
    const mine = allGrades
      .filter((g: any) => g.panelistId === userId)
      .sort((a: any, b: any) => b.id - a.id);

    // Also get assigned groups to show pending ones — with enriched members
    const profile = await T("user_profiles").get(userId);
    const groups = await T("groups").all();
    const allUsers = await T("user_profiles").all();

    // Resolve group photos from Storage (fresh signed URLs — same logic as landing route)
    const supabaseSt = getAdminClient();
    const groupPhotoMap: Record<string, string> = {};
    try {
      const { data: folders } = await supabaseSt.storage.from(AVATAR_BUCKET).list("groups", { limit: 200 });
      if (folders && folders.length > 0) {
        const folderChecks = folders
          .filter((f: any) => f.name && !f.name.startsWith("."))
          .map(async (folder: any) => {
            try {
              const { data: files } = await supabaseSt.storage.from(AVATAR_BUCKET).list(`groups/${folder.name}`, { limit: 10 });
              const photoFile = (files || []).find((f: any) => f.name?.startsWith("photo"));
              if (photoFile) {
                const { data: signed } = await supabaseSt.storage
                  .from(AVATAR_BUCKET)
                  .createSignedUrl(`groups/${folder.name}/${photoFile.name}`, 60 * 60 * 24);
                if (signed?.signedUrl) {
                  groupPhotoMap[folder.name] = signed.signedUrl;
                }
              }
            } catch (_e) { /* skip individual folder errors */ }
          });
        await Promise.all(folderChecks);
      }
    } catch (storageErr) {
      console.log(`grades/my: storage photo lookup (non-fatal): ${storageErr}`);
    }

    const enrichGroup = (g: any) => {
      const groupLabel = `Group ${g.number}`;
      const profileMembers = allUsers
        .filter((u: any) => u.role === "student" && (u.group === groupLabel || u.group === g.title))
        .map((u: any) => ({
          initials: u.avatar || u.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "??",
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl || null,
        }));
      const existingEmails = new Set(profileMembers.map((m: any) => m.email));
      const extraFromGroup = (g.members || [])
        .filter((m: any) => m.email && !existingEmails.has(m.email))
        .map((m: any) => {
          const prof = allUsers.find((u: any) => u.email === m.email);
          return { ...m, avatarUrl: prof?.avatarUrl || m.avatarUrl || null };
        });
      // Resolve photoUrl: prefer fresh Storage signed URL, fallback to DB-persisted value
      const gId = String(g.id ?? g.number ?? 0);
      const photoUrl = groupPhotoMap[gId] || g.photoUrl || g.photo_url || null;
      return { ...g, members: [...profileMembers, ...extraFromGroup], photoUrl };
    };

    const allGradesAll = await T("grades").all();
    const assignedGroups = groups
      .filter((g: any) =>
        g.panelists?.some((p: any) =>
          p.name === profile?.name || p.name?.toLowerCase() === profile?.name?.toLowerCase()
        )
      )
      .map((g: any) => {
        const enriched = enrichGroup(g);
        // Determine if current panelist is lead (first in panelists array)
        const isLead = g.panelists?.[0]?.name?.toLowerCase() === profile?.name?.toLowerCase();
        // Count how many panelists have graded this group
        const gn = g.number ?? g.id;
        const groupGrades = allGradesAll.filter((gr: any) => gr.groupId === g.id || gr.groupNumber === gn);
        return { ...enriched, isLeadPanelist: isLead, gradingProgress: groupGrades.length, totalPanelists: g.panelists?.length || 3 };
      });

    return c.json({ grades: mine, assignedGroups });
  } catch (err) {
    console.log(`Error fetching my grades: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Grades for a specific group (by group number) */
app.get("/make-server-36da3eb1/grades/group/:groupNumber", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const groupNumber = Number(c.req.param("groupNumber"));
    const allGrades = await T("grades").all();
    const forGroup = allGrades
      .filter((g: any) => g.groupNumber === groupNumber || g.groupId === groupNumber)
      .sort((a: any, b: any) => b.id - a.id);
    return c.json({ grades: forGroup });
  } catch (err) {
    console.log(`Error fetching group grades: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Delete a grade (coordinator only) */
app.delete("/make-server-36da3eb1/grades/:id", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param("id");
    await T("grades").del(Number(id));
    console.log(`Grade ${id} deleted`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`Error deleting grade: ${err}`);
    return c.json({ error: `Failed to delete grade: ${err}` }, 500);
  }
});

/* Save a grade draft (panelist) */
app.put("/make-server-36da3eb1/grades/draft", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    await db().from("grade_drafts").upsert({
      panelist_id: userId, group_id: body.groupId,
      draft: { ...body, updatedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    });
    console.log(`Draft saved for panelist ${userId}, group ${body.groupId}`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`Error saving draft: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Get a grade draft (panelist) */
app.get("/make-server-36da3eb1/grades/draft/:groupId", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const groupId = c.req.param("groupId");
    const { data: row } = await db().from("grade_drafts").select("*")
      .eq("panelist_id", userId).eq("group_id", groupId).maybeSingle();
    return c.json({ draft: row?.draft || null });
  } catch (err) {
    console.log(`Error fetching draft: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   REVISION SUBMISSION — student submits completed revisions to adviser
   ══════════════════════════════════════════ */
app.put("/make-server-36da3eb1/groups/:id/submit-revisions", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const existing = await T("groups").get(Number(id));
    if (!existing) return c.json({ error: "Group not found" }, 404);
    const body = await c.req.json();
    const revUpdates = {
      revisionSubmittedAt: new Date().toISOString(),
      revisionSubmittedBy: userId,
      revisionChecklist: body.checklist || [],
      revisionStatus: "Submitted",
    };
    await T("groups").upd(Number(id), revUpdates);
    const updated = { ...existing, ...revUpdates };
    console.log(`Group ${id} revisions submitted by user ${userId}`);
    return c.json({ group: updated });
  } catch (err) {
    console.log(`Error submitting revisions: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   REVIEW REVISIONS — panelist/adviser approves or requests changes
   ══════════════════════════════════════════ */
app.put("/make-server-36da3eb1/groups/:id/review-revisions", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const profile = await T("user_profiles").get(userId);
    if (!profile || (profile.role !== "panelist" && profile.role !== "adviser" && profile.role !== "coordinator")) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const id = c.req.param("id");
    const existing = await T("groups").get(Number(id));
    if (!existing) return c.json({ error: "Group not found" }, 404);
    const body = await c.req.json();
    const { status, reviewNote } = body;
    if (!status) return c.json({ error: "Missing status field" }, 400);

    const revUpdates = {
      revisionReviewStatus: status,
      revisionReviewNote: reviewNote || "",
      revisionReviewedBy: profile.name,
      revisionReviewedAt: new Date().toISOString(),
      revisionStatus: status === "Approved" ? "Approved" : "Needs Revision",
    };
    await T("groups").upd(Number(id), revUpdates);
    const updated = { ...existing, ...revUpdates };
    console.log(`Group ${id} revisions reviewed by ${profile.name}: ${status}`);

    const users = await T("user_profiles").all();
    const memberEmails = (existing.members || []).map((m: any) => m.email?.toLowerCase());
    for (const u of users) {
      if (u.role === "student" && memberEmails.includes(u.email?.toLowerCase())) {
        await dbNotify(u.authId || u.id, "revision",
          status === "Approved" ? "Revisions Approved!" : "Revisions Need More Work",
          status === "Approved"
            ? `Your revisions for Group ${existing.number} have been approved by ${profile.name}.`
            : `${profile.name} has requested additional changes for Group ${existing.number}.${reviewNote ? ` Note: ${reviewNote}` : ""}`);
      }
    }

    return c.json({ group: updated });
  } catch (err) {
    console.log(`Error reviewing revisions: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   SUBMISSIONS (manuscript link, pre-defense files, project output, comments)
   KV key: submission:{groupNumber}
   ══════════════════════════════════════════ */

/* Get ALL submissions (coordinator view) */
app.get("/make-server-36da3eb1/submissions/all", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const [groups, submissions] = await Promise.all([T("groups").all(), T("submissions").all()]);
    const subMap: Record<number, any> = {};
    for (const s of submissions) { if (s.groupNumber) subMap[s.groupNumber] = s; }
    const result = groups.map((g: any) => {
      const gn = g.number || g.id;
      return { group: g, submission: subMap[gn] || { groupNumber: gn, manuscriptLink: null, preDefenseFiles: [], projectOutput: null, comments: [] } };
    }).sort((a: any, b: any) => (a.group.number || a.group.id) - (b.group.number || b.group.id));
    return c.json({ data: result });
  } catch (err) { console.log(`Error fetching all submissions: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Coordinator: Review a pre-defense file (approve / request revision) */
app.put("/make-server-36da3eb1/submissions/review-file", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const { groupNumber, fileId, reviewStatus, reviewNote } = await c.req.json();
    if (!groupNumber || !fileId || !reviewStatus) return c.json({ error: "Missing fields" }, 400);
    const rows = await T("submissions").where("group_number", groupNumber);
    const existing = rows[0];
    if (!existing) return c.json({ error: "Submission not found" }, 404);
    const files = existing.preDefenseFiles || [];
    const idx = files.findIndex((f: any) => f.fileId === fileId);
    if (idx < 0) return c.json({ error: "File not found" }, 404);
    files[idx].reviewStatus = reviewStatus;
    files[idx].reviewNote = reviewNote || "";
    files[idx].reviewedAt = new Date().toISOString();
    await T("submissions").upd(existing.id, { preDefenseFiles: files });
    const updated = { ...existing, preDefenseFiles: files };
    // Notify group members
    try {
      const grp = (await T("groups").where("number", groupNumber))[0];
      if (grp?.members) {
        const users = await T("user_profiles").all();
        for (const m of grp.members) {
          const u = users.find((usr: any) => usr.email === m.email);
          if (u) await dbNotify(u.authId || u.id, reviewStatus === "Approved" ? "approved" : "revision",
            reviewStatus === "Approved" ? "File Approved" : "Revision Requested",
            `${fileId} for Group ${groupNumber} was ${reviewStatus === "Approved" ? "approved" : "flagged for revision"}.`);
        }
      }
    } catch (_) { /* non-critical */ }
    console.log(`File ${fileId} for group ${groupNumber} reviewed: ${reviewStatus}`);
    return c.json({ submission: updated });
  } catch (err) { console.log(`Error reviewing file: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Coordinator: Review project output */
app.put("/make-server-36da3eb1/submissions/review-output", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const { groupNumber, reviewStatus, reviewNote } = await c.req.json();
    if (!groupNumber || !reviewStatus) return c.json({ error: "Missing fields" }, 400);
    const rows = await T("submissions").where("group_number", groupNumber);
    const existing = rows[0];
    if (!existing?.projectOutput) return c.json({ error: "No project output found" }, 404);
    const po = { ...existing.projectOutput, reviewStatus, reviewNote: reviewNote || "", reviewedAt: new Date().toISOString() };
    await T("submissions").upd(existing.id, { projectOutput: po });
    const updated = { ...existing, projectOutput: po };
    // Notify group members
    try {
      const grp = (await T("groups").where("number", groupNumber))[0];
      if (grp?.members) {
        const users = await T("user_profiles").all();
        for (const m of grp.members) {
          const u = users.find((usr: any) => usr.email === m.email);
          if (u) await dbNotify(u.authId || u.id, reviewStatus === "Approved" ? "approved" : "revision",
            reviewStatus === "Approved" ? "Project Output Approved" : "Project Output — Revision Needed",
            `Your project output for Group ${groupNumber} was ${reviewStatus === "Approved" ? "approved" : "flagged for revision"}.`);
        }
      }
    } catch (_) { /* non-critical */ }
    return c.json({ submission: updated });
  } catch (err) { console.log(`Error reviewing output: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

app.get("/make-server-36da3eb1/submissions/group/:groupNumber", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const gn = Number(c.req.param("groupNumber"));
    const rows = await T("submissions").where("group_number", gn);
    const data = rows[0];
    return c.json({ submission: data || { groupNumber: gn, manuscriptLink: null, preDefenseFiles: [], projectOutput: null, comments: [] } });
  } catch (err) { console.log(`Error fetching submissions: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

app.put("/make-server-36da3eb1/submissions/manuscript-link", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const profile = await T("user_profiles").get(userId);
    const { groupNumber, link } = await c.req.json();
    if (!groupNumber || !link) return c.json({ error: "Missing groupNumber or link" }, 400);
    const rows = await T("submissions").where("group_number", groupNumber);
    let existing = rows[0];
    const updates = { manuscriptLink: link, manuscriptLinkUpdatedAt: new Date().toISOString(), manuscriptLinkUpdatedBy: profile?.name || "Unknown" };
    if (existing) { await T("submissions").upd(existing.id, updates); existing = { ...existing, ...updates }; }
    else { existing = await T("submissions").ins({ groupNumber, ...updates, preDefenseFiles: [], projectOutput: null, comments: [] }); }
    console.log(`Manuscript link updated for group ${groupNumber} by ${profile?.name}`);
    return c.json({ submission: existing });
  } catch (err) { console.log(`Error saving manuscript link: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

app.post("/make-server-36da3eb1/submissions/comments", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const profile = await T("user_profiles").get(userId);
    const { groupNumber, quote, comment } = await c.req.json();
    if (!groupNumber || !comment) return c.json({ error: "Missing groupNumber or comment" }, 400);
    const rows = await T("submissions").where("group_number", groupNumber);
    let existing = rows[0] || { groupNumber, manuscriptLink: null, preDefenseFiles: [], projectOutput: null, comments: [] };
    const comments = existing.comments || [];
    comments.unshift({
      id: Date.now(), name: profile?.name || "Unknown", role: profile?.role || "Student",
      initials: profile?.avatar || profile?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
      avatarUrl: profile?.avatarUrl || null, time: new Date().toISOString(), quote: quote || "", comment,
    });
    if (existing.id) { await T("submissions").upd(existing.id, { comments }); }
    else { existing = await T("submissions").ins({ groupNumber, comments, preDefenseFiles: [], projectOutput: null }); }
    return c.json({ comments });
  } catch (err) { console.log(`Error adding comment: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

app.put("/make-server-36da3eb1/submissions/pre-defense-file", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const profile = await T("user_profiles").get(userId);
    const { groupNumber, fileId, fileName, fileSize, linkUrl } = await c.req.json();
    if (!groupNumber || !fileId) return c.json({ error: "Missing groupNumber or fileId" }, 400);
    const rows = await T("submissions").where("group_number", groupNumber);
    let existing = rows[0] || { groupNumber, manuscriptLink: null, preDefenseFiles: [], projectOutput: null, comments: [] };
    const files = existing.preDefenseFiles || [];
    const idx = files.findIndex((f: any) => f.fileId === fileId);
    const fileEntry = {
      fileId, fileName: fileName || fileId, fileSize: fileSize || "", linkUrl: linkUrl || null,
      status: "submitted", uploadDate: new Date().toISOString(), uploadedBy: profile?.name || "Unknown",
      reviewStatus: "Submitted — Under Review",
    };
    if (idx >= 0) files[idx] = fileEntry;
    else files.push(fileEntry);
    if (existing.id) { await T("submissions").upd(existing.id, { preDefenseFiles: files }); existing = { ...existing, preDefenseFiles: files }; }
    else { existing = await T("submissions").ins({ groupNumber, preDefenseFiles: files, projectOutput: null, comments: [] }); }
    console.log(`Pre-defense file ${fileId} saved for group ${groupNumber}`);
    return c.json({ submission: existing });
  } catch (err) { console.log(`Error saving pre-defense file: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Upload pre-defense file as PDF to Supabase Storage */
app.post("/make-server-36da3eb1/submissions/pre-defense-upload", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const profile = await T("user_profiles").get(userId);

    await ensureBuckets();

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const groupNumber = formData.get("groupNumber") as string;
    const fileId = formData.get("fileId") as string;

    if (!file || !groupNumber || !fileId) {
      return c.json({ error: "Missing file, groupNumber, or fileId" }, 400);
    }

    // Validate PDF
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return c.json({ error: "Only PDF files are accepted" }, 400);
    }

    // Max 25MB
    if (file.size > 25 * 1024 * 1024) {
      return c.json({ error: "File too large (max 25 MB)" }, 400);
    }

    const storagePath = `group-${groupNumber}/${fileId}-${Date.now()}.pdf`;
    const sb = getAdminClient();

    const arrayBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadErr } = await sb.storage
      .from(PREDEFENSE_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      console.log(`Storage upload error: ${JSON.stringify(uploadErr)}`);
      return c.json({ error: `Upload failed: ${uploadErr.message}` }, 500);
    }

    // Create signed URL (7 days)
    const { data: signedData } = await sb.storage
      .from(PREDEFENSE_BUCKET)
      .createSignedUrl(storagePath, 7 * 24 * 60 * 60);

    // Update submission SQL record
    const subRows = await T("submissions").where("group_number", Number(groupNumber));
    let existing = subRows[0] || { groupNumber: Number(groupNumber), manuscriptLink: null, preDefenseFiles: [], projectOutput: null, comments: [] };
    const files = existing.preDefenseFiles || [];
    const idx = files.findIndex((f: any) => f.fileId === fileId);
    const fileEntry = {
      fileId,
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      linkUrl: signedData?.signedUrl || null,
      storagePath,
      uploadType: "pdf",
      status: "submitted",
      uploadDate: new Date().toISOString(),
      uploadedBy: profile?.name || "Unknown",
      reviewStatus: "Submitted — Under Review",
    };
    if (idx >= 0) {
      const oldPath = files[idx].storagePath;
      if (oldPath) { await sb.storage.from(PREDEFENSE_BUCKET).remove([oldPath]); }
      files[idx] = fileEntry;
    } else {
      files.push(fileEntry);
    }
    if (existing.id) { await T("submissions").upd(existing.id, { preDefenseFiles: files }); existing = { ...existing, preDefenseFiles: files }; }
    else { existing = await T("submissions").ins({ groupNumber: Number(groupNumber), preDefenseFiles: files, projectOutput: null, comments: [] }); }

    console.log(`PDF uploaded for group ${groupNumber}, fileId=${fileId}, path=${storagePath}`);
    return c.json({ submission: existing, signedUrl: signedData?.signedUrl });
  } catch (err) {
    console.log(`Error uploading pre-defense PDF: ${err}`);
    return c.json({ error: `Upload failed: ${err}` }, 500);
  }
});

/* Get fresh signed URL for a pre-defense file */
app.get("/make-server-36da3eb1/submissions/pre-defense-download/:groupNumber/:fileId", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const groupNumber = c.req.param("groupNumber");
    const fileId = c.req.param("fileId");
    const subRows = await T("submissions").where("group_number", Number(groupNumber));
    const existing = subRows[0];
    if (!existing?.preDefenseFiles) return c.json({ error: "No files found" }, 404);

    const file = existing.preDefenseFiles.find((f: any) => f.fileId === fileId);
    if (!file?.storagePath) return c.json({ error: "File not found or is a link submission" }, 404);

    const sb = getAdminClient();
    const { data } = await sb.storage
      .from(PREDEFENSE_BUCKET)
      .createSignedUrl(file.storagePath, 3600); // 1 hour

    return c.json({ signedUrl: data?.signedUrl, fileName: file.fileName });
  } catch (err) {
    console.log(`Error getting signed URL: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

app.put("/make-server-36da3eb1/submissions/project-output", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const profile = await T("user_profiles").get(userId);
    const { groupNumber, type, link, title, metadata } = await c.req.json();
    if (!groupNumber) return c.json({ error: "Missing groupNumber" }, 400);
    const subRows = await T("submissions").where("group_number", groupNumber);
    let existing = subRows[0] || { groupNumber, manuscriptLink: null, preDefenseFiles: [], comments: [] };
    const po = { type: type || "link", link: link || "", title: title || "", metadata: metadata || {},
      submittedAt: new Date().toISOString(), submittedBy: profile?.name || "Unknown" };
    if (existing.id) { await T("submissions").upd(existing.id, { projectOutput: po }); existing = { ...existing, projectOutput: po }; }
    else { existing = await T("submissions").ins({ groupNumber, projectOutput: po, preDefenseFiles: [], comments: [] }); }
    console.log(`Project output saved for group ${groupNumber}`);
    return c.json({ submission: existing });
  } catch (err) { console.log(`Error saving project output: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* ══════════════════════════════════════════
   POST-DEFENSE ARCHIVE  (SQL: archives table)
   ══════════════════════════════════════════ */

app.get("/make-server-36da3eb1/archive/group/:groupNumber", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const gn = Number(c.req.param("groupNumber"));
    const grades = await T("grades").all();
    const groupGrades = grades.filter((g: any) => g.groupNumber === gn || g.groupId === gn);
    let defenseVerdict = "pending";
    let defenseUnlocked = false;
    if (groupGrades.length > 0) {
      const verdictCounts: Record<string, number> = {};
      groupGrades.forEach((g: any) => { verdictCounts[g.verdict] = (verdictCounts[g.verdict] || 0) + 1; });
      defenseVerdict = Object.entries(verdictCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "pending";
      const passVerdicts = ["passed", "pass", "minor", "major", "revisions"];
      defenseUnlocked = passVerdicts.includes(defenseVerdict);
    }
    const archRows = await T("archives").where("group_number", gn);
    const archiveData = archRows[0] || { items: {} };
    const peRows = await T("peer_evaluations").where("evaluator_id", userId);
    return c.json({ defenseVerdict, defenseUnlocked, panelistCount: groupGrades.length, archive: archiveData.items ? archiveData : { items: {} }, peerEvalSubmitted: peRows.length > 0 });
  } catch (err) { console.log(`Error fetching archive: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

app.put("/make-server-36da3eb1/archive/group/:groupNumber", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const gn = Number(c.req.param("groupNumber"));
    const { itemId, status, linkUrl, notes } = await c.req.json();
    if (!itemId) return c.json({ error: "Missing itemId" }, 400);
    const archRows = await T("archives").where("group_number", gn);
    let existing = archRows[0];
    const items = existing?.items || {};
    items[itemId] = { status: status || "complete", linkUrl: linkUrl || null, notes: notes || "", updatedAt: new Date().toISOString(), updatedBy: userId };
    if (existing?.id) { await T("archives").upd(existing.id, { items }); existing = { ...existing, items }; }
    else { existing = await T("archives").ins({ groupNumber: gn, items }); }
    console.log(`Archive item ${itemId} updated for group ${gn}`);
    return c.json({ archive: existing });
  } catch (err) { console.log(`Error updating archive: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Coordinator: Bulk archive + peer eval data */
app.get("/make-server-36da3eb1/archive/all", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const [groups, peerEvals, grades, archives] = await Promise.all([
      T("groups").all(), T("peer_evaluations").all(), T("grades").all(), T("archives").all(),
    ]);
    const archMap: Record<number, any> = {};
    for (const a of archives) { if (a.groupNumber) archMap[a.groupNumber] = a; }
    const result = [];
    for (const g of groups) {
      const gn = g.number || g.id;
      const ad = archMap[gn];
      const groupGrades = grades.filter((gr: any) => gr.groupNumber === gn || gr.groupId === gn);
      const groupPeerEvals = peerEvals.filter((pe: any) => pe.groupNumber === gn);
      let defenseVerdict = "pending";
      if (groupGrades.length > 0) {
        const vc: Record<string, number> = {};
        groupGrades.forEach((gr: any) => { vc[gr.verdict] = (vc[gr.verdict] || 0) + 1; });
        defenseVerdict = Object.entries(vc).sort((a, b) => b[1] - a[1])[0]?.[0] || "pending";
      }
      const passVerdicts = ["passed", "pass", "minor", "major", "revisions"];
      result.push({
        group: g, groupNumber: gn,
        archive: ad || { items: {} },
        peerEvalCount: groupPeerEvals.length,
        peerEvals: groupPeerEvals,
        defenseVerdict,
        defenseUnlocked: passVerdicts.includes(defenseVerdict),
        panelistCount: groupGrades.length,
      });
    }
    result.sort((a: any, b: any) => a.groupNumber - b.groupNumber);
    return c.json({ data: result });
  } catch (err) { console.log(`Error fetching all archive data: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* ══════════════════════════════════════════
   PEER EVALUATIONS  (SQL: peer_evaluations table)
   ══════════════════════════════════════════ */

app.post("/make-server-36da3eb1/peer-evaluations", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const profile = await T("user_profiles").get(userId);
    const existingRows = await T("peer_evaluations").where("evaluator_id", userId);
    if (existingRows.length > 0) return c.json({ error: "You have already submitted your peer evaluation" }, 409);
    const { groupNumber, groupId, evaluations } = await c.req.json();
    if (!evaluations || Object.keys(evaluations).length === 0) return c.json({ error: "Missing evaluations data" }, 400);
    const record = await T("peer_evaluations").ins({
      evaluatorId: userId, evaluatorName: profile?.name || "Unknown",
      groupNumber: groupNumber ?? null, groupId: groupId ?? null,
      evaluations, submittedAt: new Date().toISOString(),
    });
    console.log(`Peer evaluation submitted by ${profile?.name} for group ${groupNumber}`);
    return c.json({ evaluation: record }, 201);
  } catch (err) { console.log(`Error submitting peer eval: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

app.get("/make-server-36da3eb1/peer-evaluations/my", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const rows = await T("peer_evaluations").where("evaluator_id", userId);
    const data = rows[0] || null;
    return c.json({ evaluation: data, submitted: !!data });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

app.get("/make-server-36da3eb1/peer-evaluations/group/:groupNumber", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const gn = Number(c.req.param("groupNumber"));
    const rows = await T("peer_evaluations").where("group_number", gn);
    return c.json({ evaluations: rows });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

/* ══════════════════════════════════════════
   ADVISER GRADES (30% of final grade)
   SQL table: adviser_grades
   ══════════════════════════════════════════ */

app.post("/make-server-36da3eb1/adviser-grades", async (c) => {
  try {
    const authUser = await getAuthedUser(c);
    if (!authUser?.id) return c.json({ error: "Unauthorized" }, 401);
    const profile = await ensureProfile(authUser.id, authUser);
    if (!hasProfileRole(profile, "coordinator") && !hasProfileRole(profile, "adviser")) {
      return c.json({ error: "Forbidden - adviser or coordinator access required" }, 403);
    }
    const body = await c.req.json();
    const { groupId, groupNumber, groupTitle, memberScores } = body;
    if (!groupId || !memberScores) return c.json({ error: "Missing required fields: groupId, memberScores" }, 400);
    const groupsForAuth = await T("groups").all();
    const targetGroup = groupsForAuth.find((g: any) => g.id === groupId || g.number === groupNumber);
    if (hasProfileRole(profile, "adviser") && !hasProfileRole(profile, "coordinator")) {
      const isAssignedAdviser = targetGroup?.adviser?.toLowerCase?.() === profile.name?.toLowerCase?.();
      if (!isAssignedAdviser) return c.json({ error: "Forbidden - this group is not assigned to you as adviser" }, 403);
    }
    const existing = await T("adviser_grades").all();
    const prev = existing.find((g: any) => g.groupId === groupId || g.groupNumber === groupNumber);
    const id = prev ? prev.id : await nextId("adviser-grade");
    const record = { id, groupId, groupNumber: groupNumber ?? null, groupTitle: groupTitle || "", memberScores, submittedBy: profile.name, submittedById: profile.id, submittedAt: new Date().toISOString() };
    await T("adviser_grades").ups(record);
    console.log(`Adviser grade ${id} saved for group ${groupId}`);

    // If the coordinator already aggregated this group, refresh the 30% adviser component immediately.
    try {
      const aggregate = await T("grade_aggregates").get(groupNumber, "group_number");
      if (aggregate?.memberFinalGrades) {
        for (const memberName of aggregate.members || []) {
          const scores = memberScores?.[memberName];
          if (!scores || !aggregate.memberFinalGrades[memberName]) continue;
          const adviserScore =
            ((scores.attendance || 0) / 4 * 100 * 0.15) +
            ((scores.participation || 0) / 4 * 100 * 0.25) +
            ((scores.involvement || 0) / 4 * 100 * 0.60);
          const memberGrade = aggregate.memberFinalGrades[memberName];
          const defenseScore = memberGrade.defenseScore || 0;
          const coordScore = memberGrade.coordScore || 0;
          const finalRaw = (defenseScore * 0.60) + (adviserScore * 0.30) + (coordScore * 0.10);
          const equivalent = finalDefenseEquivalent(finalRaw);
          const verdict = equivalent.verdict; const numericalGrade = equivalent.numericalGrade;
          aggregate.memberFinalGrades[memberName] = {
            ...memberGrade,
            adviserScore: Math.round(adviserScore * 100) / 100,
            finalRaw: Math.round(finalRaw * 100) / 100,
            verdict,
            numericalGrade,
            hasAdviserGrade: true,
          };
        }
        aggregate.hasAdviserGrade = true;
        aggregate.aggregatedAt = new Date().toISOString();
        await T("grade_aggregates").ups(aggregate);
      }
    } catch (e) { console.log(`Adviser aggregate refresh skipped: ${e}`); }

    // Notify group members about adviser grade
    try {
      const grp = targetGroup;
      if (grp?.members) {
        const users = await T("user_profiles").all();
        for (const m of grp.members) {
          const u = users.find((usr: any) => usr.email === m.email);
          if (u) {
            await dbNotify(u.id, "grade", "Adviser Grade Released",
              `Your adviser has submitted a grade for your group (30% component). Check your grades page for details.`);
          }
        }
      }
    } catch (_) { /* non-critical */ }

    return c.json({ grade: record }, prev ? 200 : 201);
  } catch (err) { console.log(`Error saving adviser grade: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

app.get("/make-server-36da3eb1/adviser-grades/group/:groupNumber", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const groupNumber = Number(c.req.param("groupNumber"));
    const all = await T("adviser_grades").all();
    const found = all.find((g: any) => g.groupNumber === groupNumber || g.groupId === groupNumber);
    return c.json({ grade: found || null });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

app.get("/make-server-36da3eb1/adviser-grades", async (c) => {
  try {
    const authUser = await getAuthedUser(c);
    if (!authUser?.id) return c.json({ error: "Unauthorized" }, 401);
    const profile = await ensureProfile(authUser.id, authUser);
    const grades = await T("adviser_grades").all();
    if (hasProfileRole(profile, "coordinator")) return c.json({ grades });
    if (hasProfileRole(profile, "adviser")) {
      const groups = await T("groups").all();
      const advisedGroupNumbers = new Set(groups
        .filter((g: any) => g.adviser?.toLowerCase?.() === profile.name?.toLowerCase?.())
        .map((g: any) => g.number || g.id));
      return c.json({ grades: grades.filter((g: any) => advisedGroupNumbers.has(g.groupNumber || g.groupId)) });
    }
    return c.json({ error: "Forbidden - adviser or coordinator access required" }, 403);
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

/* ══════════════════════════════════════════
   COORDINATOR GRADES (10% of final grade)
   SQL table: coordinator_grades
   ══════════════════════════════════════════ */

app.post("/make-server-36da3eb1/coordinator-grades", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const body = await c.req.json();
    const { groupId, groupNumber, groupTitle, memberScores } = body;
    if (!groupId || !memberScores) return c.json({ error: "Missing required fields: groupId, memberScores" }, 400);
    const existing = await T("coordinator_grades").all();
    const prev = existing.find((g: any) => g.groupId === groupId || g.groupNumber === groupNumber);
    const id = prev ? prev.id : await nextId("coordinator-grade");
    const record = { id, groupId, groupNumber: groupNumber ?? null, groupTitle: groupTitle || "", memberScores, submittedAt: new Date().toISOString() };
    await T("coordinator_grades").ups(record);
    console.log(`Coordinator grade ${id} saved for group ${groupId}`);

    // If the group already has a final aggregate, refresh the 10% coordinator component immediately.
    try {
      const aggregate = await T("grade_aggregates").get(groupNumber, "group_number");
      if (aggregate?.memberFinalGrades) {
        for (const memberName of aggregate.members || []) {
          const scores = memberScores?.[memberName];
          if (!scores || !aggregate.memberFinalGrades[memberName]) continue;
          const coordScore =
            ((scores.taskPerformance || 0) / 4 * 100 * 0.20) +
            ((scores.submissionOfRequirements || 0) / 4 * 100 * 0.80);
          const memberGrade = aggregate.memberFinalGrades[memberName];
          const defenseScore = memberGrade.defenseScore || 0;
          const adviserScore = memberGrade.adviserScore || 0;
          const finalRaw = (defenseScore * 0.60) + (adviserScore * 0.30) + (coordScore * 0.10);
          const equivalent = finalDefenseEquivalent(finalRaw);
          const verdict = equivalent.verdict; const numericalGrade = equivalent.numericalGrade;
          aggregate.memberFinalGrades[memberName] = {
            ...memberGrade,
            coordScore: Math.round(coordScore * 100) / 100,
            finalRaw: Math.round(finalRaw * 100) / 100,
            verdict,
            numericalGrade,
            hasCoordGrade: true,
          };
        }
        aggregate.hasCoordGrade = true;
        aggregate.aggregatedAt = new Date().toISOString();
        await T("grade_aggregates").ups(aggregate);
      }
    } catch (e) { console.log(`Coordinator aggregate refresh skipped: ${e}`); }

    // Notify group members about coordinator grade
    try {
      const groups = await T("groups").all();
      const grp = groups.find((g: any) => g.id === groupId || g.number === groupNumber);
      if (grp?.members) {
        const users = await T("user_profiles").all();
        for (const m of grp.members) {
          const u = users.find((usr: any) => usr.email === m.email);
          if (u) {
            await dbNotify(u.id, "grade", "Coordinator Grade Released",
              `The coordinator has submitted a grade for your group (10% component). Check your grades page for details.`);
          }
        }
      }
    } catch (_) { /* non-critical */ }

    return c.json({ grade: record }, prev ? 200 : 201);
  } catch (err) { console.log(`Error saving coordinator grade: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

app.get("/make-server-36da3eb1/coordinator-grades/group/:groupNumber", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const groupNumber = Number(c.req.param("groupNumber"));
    const all = await T("coordinator_grades").all();
    const found = all.find((g: any) => g.groupNumber === groupNumber || g.groupId === groupNumber);
    return c.json({ grade: found || null });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

app.get("/make-server-36da3eb1/coordinator-grades", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    return c.json({ grades: await T("coordinator_grades").all() });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

/* ══════════════════════════════════════════
   FINAL GRADES: Composite 60/30/10 computation
   ══════════════════════════════════════════ */
const CURRENT_GROUP_KEYS = ["results", "discussion", "output", "presentation", "qa"];
const LEGACY_GROUP_KEYS = ["manuscript", "output", "presentation"];
const INDIVIDUAL_KEYS = ["communication", "organization", "effectiveness"];

function computeDefenseComponent(pg: any, memberName: string) {
  const gs = pg.groupScores || pg.scores || {};
  const usesCurrentRubric = CURRENT_GROUP_KEYS.some((key) => gs[key] !== undefined && gs[key] !== null);
  let groupRaw = 0;
  if (usesCurrentRubric) {
    groupRaw = Number(pg.groupTotal ?? CURRENT_GROUP_KEYS.reduce((sum, key) => sum + Number(gs[key] || 0), 0));
  } else {
    groupRaw = LEGACY_GROUP_KEYS.reduce((sum, key) => sum + Number(gs[key] || 0), 0) / 12 * 100;
  }
  const indScores = pg.individualScores?.[memberName] || {};
  const indRaw = INDIVIDUAL_KEYS.reduce((sum, key) => sum + Number(indScores[key] || 0), 0) / (usesCurrentRubric ? 15 : 12) * 100;
  return (groupRaw * 0.60) + (indRaw * 0.40);
}

function finalDefenseEquivalent(rawScore: number) {
  if (rawScore >= 92) return { verdict: "Pass", numericalGrade: "1.00" };
  if (rawScore >= 82) return { verdict: "Pass with Minor Revision", numericalGrade: "2.00" };
  if (rawScore >= 60) return { verdict: "Pass with Major Revision/Re-demonstration", numericalGrade: "3.00" };
  return { verdict: "Failed", numericalGrade: "5.00" };
}

app.get("/make-server-36da3eb1/final-grades/group/:groupNumber", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const groupNumber = Number(c.req.param("groupNumber"));
    const [panelistGrades, adviserGrades, coordGrades, groups] = await Promise.all([
      T("grades").all(), T("adviser_grades").all(),
      T("coordinator_grades").all(), T("groups").all(),
    ]);
    const group = groups.find((g: any) => g.number === groupNumber || g.id === groupNumber);
    if (!group) return c.json({ error: "Group not found" }, 404);
    const members = (group.members || []).map((m: any) => m.name);
    const pgrades = panelistGrades.filter((g: any) => g.groupNumber === groupNumber || g.groupId === groupNumber);
    const advGrade = adviserGrades.find((g: any) => g.groupNumber === groupNumber || g.groupId === groupNumber);
    const coordGrade = coordGrades.find((g: any) => g.groupNumber === groupNumber || g.groupId === groupNumber);

    const memberFinalGrades: Record<string, any> = {};
    for (const memberName of members) {
      let defenseScore = 0; let panelistCount = 0;
      for (const pg of pgrades) {
        defenseScore += computeDefenseComponent(pg, memberName);
        panelistCount++;
      }
      const avgDefenseScore = panelistCount > 0 ? defenseScore / panelistCount : 0;
      let adviserScore = 0;
      if (advGrade?.memberScores?.[memberName]) {
        const as = advGrade.memberScores[memberName];
        adviserScore = ((as.attendance || 0) / 4 * 100 * 0.15) + ((as.participation || 0) / 4 * 100 * 0.25) + ((as.involvement || 0) / 4 * 100 * 0.60);
      }
      let coordScore = 0;
      if (coordGrade?.memberScores?.[memberName]) {
        const cs = coordGrade.memberScores[memberName];
        coordScore = ((cs.taskPerformance || 0) / 4 * 100 * 0.20) + ((cs.submissionOfRequirements || 0) / 4 * 100 * 0.80);
      }
      const finalRaw = (avgDefenseScore * 0.60) + (adviserScore * 0.30) + (coordScore * 0.10);
      const equivalent = finalDefenseEquivalent(finalRaw);
      const verdict = equivalent.verdict; const numericalGrade = equivalent.numericalGrade;
      memberFinalGrades[memberName] = {
        defenseScore: Math.round(avgDefenseScore * 100) / 100, adviserScore: Math.round(adviserScore * 100) / 100,
        coordScore: Math.round(coordScore * 100) / 100, finalRaw: Math.round(finalRaw * 100) / 100,
        verdict, numericalGrade, panelistCount,
        hasAdviserGrade: !!advGrade?.memberScores?.[memberName], hasCoordGrade: !!coordGrade?.memberScores?.[memberName],
      };
    }
    return c.json({ groupNumber, groupName: group.name, groupTitle: group.title, members, memberFinalGrades, panelistGradesCount: pgrades.length, hasAdviserGrade: !!advGrade, hasCoordGrade: !!coordGrade });
  } catch (err) { console.log(`Error computing final grades: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

app.get("/make-server-36da3eb1/final-grades/overview", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const [groups, panelistGrades, adviserGrades, coordGrades] = await Promise.all([
      T("groups").all(), T("grades").all(), T("adviser_grades").all(), T("coordinator_grades").all(),
    ]);
    const summary = groups.map((group: any) => {
      const gn = group.number || group.id;
      return {
        groupId: group.id, groupNumber: gn, groupName: group.name, groupTitle: group.title,
        members: (group.members || []).map((m: any) => m.name),
        panelistGradesCount: panelistGrades.filter((g: any) => g.groupNumber === gn || g.groupId === gn).length,
        hasAdviserGrade: !!adviserGrades.find((g: any) => g.groupNumber === gn || g.groupId === gn),
        hasCoordGrade: !!coordGrades.find((g: any) => g.groupNumber === gn || g.groupId === gn),
        status: group.status,
      };
    });
    return c.json({ groups: summary.sort((a: any, b: any) => a.groupNumber - b.groupNumber) });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

/* ══════════════════════════════════════════
   GRADE AGGREGATOR: Compute, persist, release final grades
   SQL table: grade_aggregates
   ══════════════════════════════════════════ */

/* Compute & persist aggregated grades for a single group */
app.post("/make-server-36da3eb1/final-grades/aggregate/:groupNumber", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const groupNumber = Number(c.req.param("groupNumber"));
    const [panelistGrades, adviserGrades, coordGrades, groups] = await Promise.all([
      T("grades").all(), T("adviser_grades").all(),
      T("coordinator_grades").all(), T("groups").all(),
    ]);
    const group = groups.find((g: any) => g.number === groupNumber || g.id === groupNumber);
    if (!group) return c.json({ error: "Group not found" }, 404);
    const members = (group.members || []).map((m: any) => m.name);
    const pgrades = panelistGrades.filter((g: any) => g.groupNumber === groupNumber || g.groupId === groupNumber);
    const advGrade = adviserGrades.find((g: any) => g.groupNumber === groupNumber || g.groupId === groupNumber);
    const coordGrade = coordGrades.find((g: any) => g.groupNumber === groupNumber || g.groupId === groupNumber);
    const memberFinalGrades: Record<string, any> = {};
    for (const memberName of members) {
      let defenseScore = 0; let panelistCount = 0;
      for (const pg of pgrades) {
        defenseScore += computeDefenseComponent(pg, memberName);
        panelistCount++;
      }
      const avgDefenseScore = panelistCount > 0 ? defenseScore / panelistCount : 0;
      let adviserScore = 0;
      if (advGrade?.memberScores?.[memberName]) {
        const as2 = advGrade.memberScores[memberName];
        adviserScore = ((as2.attendance || 0) / 4 * 100 * 0.15) + ((as2.participation || 0) / 4 * 100 * 0.25) + ((as2.involvement || 0) / 4 * 100 * 0.60);
      }
      let coordScore = 0;
      if (coordGrade?.memberScores?.[memberName]) {
        const cs = coordGrade.memberScores[memberName];
        coordScore = ((cs.taskPerformance || 0) / 4 * 100 * 0.20) + ((cs.submissionOfRequirements || 0) / 4 * 100 * 0.80);
      }
      const finalRaw = (avgDefenseScore * 0.60) + (adviserScore * 0.30) + (coordScore * 0.10);
      const equivalent = finalDefenseEquivalent(finalRaw);
      const verdict = equivalent.verdict; const numericalGrade = equivalent.numericalGrade;
      memberFinalGrades[memberName] = {
        defenseScore: Math.round(avgDefenseScore * 100) / 100, adviserScore: Math.round(adviserScore * 100) / 100,
        coordScore: Math.round(coordScore * 100) / 100, finalRaw: Math.round(finalRaw * 100) / 100,
        verdict, numericalGrade, panelistCount,
        hasAdviserGrade: !!advGrade?.memberScores?.[memberName], hasCoordGrade: !!coordGrade?.memberScores?.[memberName],
      };
    }
    const existing = await T("grade_aggregates").get(groupNumber, "group_number");
    const aggregate = {
      groupNumber, groupName: group.name || `Group ${groupNumber}`, groupTitle: group.title,
      members, memberFinalGrades, panelistGradesCount: pgrades.length,
      panelistNames: pgrades.map((pg: any) => pg.panelistName),
      hasAdviserGrade: !!advGrade, hasCoordGrade: !!coordGrade,
      released: existing?.released || false, releasedAt: existing?.releasedAt || null,
      releasedBy: existing?.releasedBy || null, aggregatedAt: new Date().toISOString(),
    };
    await T("grade_aggregates").ups(aggregate);
    console.log(`Grade aggregate computed for group ${groupNumber}`);
    return c.json({ aggregate }, 201);
  } catch (err) { console.log(`Error aggregating grades: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Aggregate all groups at once (coordinator) */
app.post("/make-server-36da3eb1/final-grades/aggregate-all", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const [panelistGrades, adviserGrades, coordGrades, groups] = await Promise.all([
      T("grades").all(), T("adviser_grades").all(),
      T("coordinator_grades").all(), T("groups").all(),
    ]);
    let aggregated = 0;
    for (const group of groups) {
      const gn = group.number || group.id;
      const pgrades = panelistGrades.filter((g: any) => g.groupNumber === gn || g.groupId === gn);
      if (pgrades.length === 0) continue;
      const members = (group.members || []).map((m: any) => m.name);
      const advGrade = adviserGrades.find((g: any) => g.groupNumber === gn || g.groupId === gn);
      const coordGrade = coordGrades.find((g: any) => g.groupNumber === gn || g.groupId === gn);
      const memberFinalGrades: Record<string, any> = {};
      for (const memberName of members) {
        let defenseScore = 0; let panelistCount = 0;
        for (const pg of pgrades) {
          defenseScore += computeDefenseComponent(pg, memberName);
          panelistCount++;
        }
        const avgDefenseScore = panelistCount > 0 ? defenseScore / panelistCount : 0;
        let adviserScore = 0;
        if (advGrade?.memberScores?.[memberName]) {
          const as2 = advGrade.memberScores[memberName];
          adviserScore = ((as2.attendance || 0) / 4 * 100 * 0.15) + ((as2.participation || 0) / 4 * 100 * 0.25) + ((as2.involvement || 0) / 4 * 100 * 0.60);
        }
        let coordScore = 0;
        if (coordGrade?.memberScores?.[memberName]) {
          const cs = coordGrade.memberScores[memberName];
          coordScore = ((cs.taskPerformance || 0) / 4 * 100 * 0.20) + ((cs.submissionOfRequirements || 0) / 4 * 100 * 0.80);
        }
        const finalRaw = (avgDefenseScore * 0.60) + (adviserScore * 0.30) + (coordScore * 0.10);
        const equivalent = finalDefenseEquivalent(finalRaw);
        const verdict = equivalent.verdict; const numericalGrade = equivalent.numericalGrade;
        memberFinalGrades[memberName] = {
          defenseScore: Math.round(avgDefenseScore * 100) / 100, adviserScore: Math.round(adviserScore * 100) / 100,
          coordScore: Math.round(coordScore * 100) / 100, finalRaw: Math.round(finalRaw * 100) / 100,
          verdict, numericalGrade, panelistCount,
          hasAdviserGrade: !!advGrade?.memberScores?.[memberName], hasCoordGrade: !!coordGrade?.memberScores?.[memberName],
        };
      }
      const existing = await T("grade_aggregates").get(gn, "group_number");
      await T("grade_aggregates").ups({
        groupNumber: gn, groupName: group.name || `Group ${gn}`, groupTitle: group.title,
        members, memberFinalGrades, panelistGradesCount: pgrades.length,
        panelistNames: pgrades.map((pg: any) => pg.panelistName),
        hasAdviserGrade: !!advGrade, hasCoordGrade: !!coordGrade,
        released: existing?.released || false, releasedAt: existing?.releasedAt || null,
        releasedBy: existing?.releasedBy || null, aggregatedAt: new Date().toISOString(),
      });
      aggregated++;
    }
    console.log(`Aggregated grades for ${aggregated} groups`);
    return c.json({ aggregated, total: groups.length });
  } catch (err) { console.log(`Error aggregating all: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Release final grades for a group */
app.put("/make-server-36da3eb1/final-grades/release/:groupNumber", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const groupNumber = Number(c.req.param("groupNumber"));
    const profile = await T("user_profiles").get(auth.userId);
    const aggregate = await T("grade_aggregates").get(groupNumber, "group_number");
    if (!aggregate) return c.json({ error: "No aggregated grades. Aggregate first." }, 404);
    aggregate.released = true;
    aggregate.releasedAt = new Date().toISOString();
    aggregate.releasedBy = profile?.name || "Coordinator";
    await T("grade_aggregates").ups(aggregate);
    // Notify students
    try {
      const groups = await T("groups").all();
      const group = groups.find((g: any) => g.number === groupNumber || g.id === groupNumber);
      const users = await T("user_profiles").all();
      const memberEmails = (group?.members || []).map((m: any) => m.email?.toLowerCase());
      for (const u of users) {
        if (u.role === "student" && memberEmails.includes(u.email?.toLowerCase())) {
          await dbNotify(u.id, "grade", "Final Grades Released!",
            `Your group's final composite grades have been officially released. Check your defense results page.`);
        }
        // Notify panelists/advisers who graded this group
        if ((hasProfileRole(u, "panelist") || hasProfileRole(u, "adviser")) && (aggregate.panelistNames || []).includes(u.name)) {
          await dbNotify(u.id, "grade", "Grades Released",
            `Final grades for Group ${groupNumber} (${aggregate.groupName}) have been released.`);
        }
      }
    } catch (_) { /* non-critical */ }
    console.log(`Grades released for group ${groupNumber}`);
    return c.json({ aggregate });
  } catch (err) { console.log(`Error releasing grades: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Unrelease grades */
app.put("/make-server-36da3eb1/final-grades/unrelease/:groupNumber", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const groupNumber = Number(c.req.param("groupNumber"));
    const aggregate = await T("grade_aggregates").get(groupNumber, "group_number");
    if (!aggregate) return c.json({ error: "No aggregated grades found" }, 404);
    aggregate.released = false; aggregate.releasedAt = null; aggregate.releasedBy = null;
    await T("grade_aggregates").ups(aggregate);
    return c.json({ aggregate });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Get aggregated grades (role-scoped) */
app.get("/make-server-36da3eb1/final-grades/aggregated", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const profile = await T("user_profiles").get(userId);
    const aggregates = await T("grade_aggregates").all();
    if (profile?.role === "coordinator") {
      return c.json({ aggregates: aggregates.sort((a: any, b: any) => a.groupNumber - b.groupNumber) });
    }
    if (hasProfileRole(profile, "panelist") || hasProfileRole(profile, "adviser")) {
      const myGrades = await T("grades").all();
      const myGroupNums = new Set(myGrades.filter((g: any) => g.panelistId === userId).map((g: any) => g.groupNumber || g.groupId));
      // Advisers also see groups they advise
      if (hasProfileRole(profile, "adviser")) {
        const groups = await T("groups").all();
        groups.filter((g: any) => g.adviser?.toLowerCase() === profile?.name?.toLowerCase())
          .forEach((g: any) => myGroupNums.add(g.number || g.id));
      }
      const relevant = aggregates.filter((a: any) => myGroupNums.has(a.groupNumber)).map((a: any) => {
        if (!a.released) return { groupNumber: a.groupNumber, groupName: a.groupName, groupTitle: a.groupTitle, panelistGradesCount: a.panelistGradesCount, hasAdviserGrade: a.hasAdviserGrade, hasCoordGrade: a.hasCoordGrade, released: false, aggregatedAt: a.aggregatedAt };
        return a;
      }).sort((a: any, b: any) => a.groupNumber - b.groupNumber);
      return c.json({ aggregates: relevant });
    }
    // Student — only released grades for their group
    const groups = await T("groups").all();
    const myGroup = groups.find((g: any) => (g.members || []).some((m: any) => m.email?.toLowerCase() === profile?.email?.toLowerCase()));
    if (!myGroup) return c.json({ aggregates: [] });
    const gn = myGroup.number || myGroup.id;
    const agg = aggregates.find((a: any) => a.groupNumber === gn && a.released);
    return c.json({ aggregates: agg ? [agg] : [] });
  } catch (err) { console.log(`Error fetching aggregated: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* ══════════════════════════════════════════
   GRADES: All grades with panelist + group info (coordinator view)
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/grades/overview", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const [grades, groups, defensesRaw] = await Promise.all([
      T("grades").all(),
      T("groups").all(),
      T("defenses").all(),
    ]);
    const defenses = defensesRaw.map(defenseToFrontend);

    // Build defense → grades map
    const defenseGrades: Record<string, any[]> = {};
    for (const d of defenses) {
      // Match grades by group name
      const matchingGrades = grades.filter((g: any) => {
        const groupName = `Group ${g.groupNumber}`;
        return groupName === d.group || g.groupTitle === d.title;
      });
      defenseGrades[d.id] = matchingGrades;
    }

    // Also build groupNumber → grades map
    const groupGrades: Record<number, any[]> = {};
    for (const g of grades) {
      const key = g.groupNumber || g.groupId;
      if (!groupGrades[key]) groupGrades[key] = [];
      groupGrades[key].push(g);
    }

    return c.json({
      grades: grades.sort((a: any, b: any) => b.id - a.id),
      defenseGrades,
      groupGrades,
      totalGrades: grades.length,
    });
  } catch (err) {
    console.log(`Error fetching grades overview: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   NOTIFICATIONS
   KV key: notification:{id}
   ══════════════════════════════════════════ */

/* Get notifications for the current user */
app.get("/make-server-36da3eb1/notifications", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const { data: rows } = await db().from("notifications").select("*")
      .eq("user_id", userId).order("time", { ascending: false }).limit(50);
    return c.json({ notifications: (rows || []).map(R) });
  } catch (err) { console.log(`Error fetching notifications: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Mark single notification as read */
app.put("/make-server-36da3eb1/notifications/:id/read", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const id = parseInt(c.req.param("id"));
    const n = await T("notifications").get(id);
    if (!n || n.userId !== userId) return c.json({ error: "Not found" }, 404);
    const updated = await T("notifications").upd(id, { read: true });
    return c.json({ notification: updated || { ...n, read: true } });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Mark all notifications as read for user */
app.put("/make-server-36da3eb1/notifications/read-all", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const { data, error } = await db().from("notifications").update({ read: true })
      .eq("user_id", userId).eq("read", false).select("id");
    if (error) console.log(`Notifications read-all error: ${error.message}`);
    return c.json({ updated: data?.length || 0 });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

/* ══════════════════════════════════════════
   GROUP TIMELINE / MILESTONES (coordinator managed)
   KV key: timeline:{groupNumber}
   ══════════════════════════════��═══════════ */

/* Get timelines for ALL groups (coordinator) — must be before :groupNumber */
app.get("/make-server-36da3eb1/timeline/all", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const [timelines, groups] = await Promise.all([
      T("timelines").all(), T("groups").all(),
    ]);
    const data = groups.map((g: any) => {
      const gn = g.number || g.id;
      const tl = timelines.find((t: any) => t.groupNumber === gn);
      return { group: g, groupNumber: gn, timeline: tl || { groupNumber: gn, milestones: [] } };
    }).sort((a: any, b: any) => a.groupNumber - b.groupNumber);
    return c.json({ data });
  } catch (err) { console.log(`Error fetching all timelines: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Get timeline for a single group */
app.get("/make-server-36da3eb1/timeline/:groupNumber", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const gn = Number(c.req.param("groupNumber"));
    const data = await T("timelines").get(gn, "group_number");
    return c.json({ timeline: data || { groupNumber: gn, milestones: [] } });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Update timeline milestones for a group (coordinator) */
app.put("/make-server-36da3eb1/timeline/:groupNumber", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const gn = Number(c.req.param("groupNumber"));
    const { milestones } = await c.req.json();
    if (!Array.isArray(milestones)) return c.json({ error: "milestones must be an array" }, 400);
    const record = { groupNumber: gn, milestones, updatedAt: new Date().toISOString() };
    await T("timelines").ups(record);

    // Notify group members of timeline update
    try {
      const groups = await T("groups").all();
      const grp = groups.find((g: any) => g.number === gn || g.id === gn);
      if (grp?.members) {
        const users = await T("user_profiles").all();
        for (const m of grp.members) {
          const u = users.find((usr: any) => usr.email === m.email);
          if (u) {
            await dbNotify(u.id, "deadline", "Timeline Updated",
              `Your group's (Group ${gn}) project timeline has been updated by the coordinator.`);
          }
        }
      }
    } catch (_) { /* non-critical */ }

    console.log(`Timeline updated for group ${gn}`);
    return c.json({ timeline: record });
  } catch (err) { console.log(`Error updating timeline: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* ══════════════════════════════════════════
   EMAIL DIGEST — generate HTML email for notifications
   ══════════════════════════════════════════ */

function generateEmailHtml(userName: string, notifications: any[], digestType: string = "daily"): string {
  const typeIcons: Record<string, { emoji: string; color: string; label: string }> = {
    announcement: { emoji: "📢", color: "#003087", label: "Announcement" },
    approved: { emoji: "✅", color: "#16A34A", label: "Approved" },
    revision: { emoji: "⚠️", color: "#D97706", label: "Revision Needed" },
    deadline: { emoji: "⏰", color: "#DC2626", label: "Deadline / Schedule" },
    grade: { emoji: "⭐", color: "#4D8FFF", label: "Grade Released" },
    feedback: { emoji: "💬", color: "#4D8FFF", label: "Feedback" },
  };

  const notifRows = notifications.map((n: any) => {
    const cfg = typeIcons[n.type] || typeIcons.announcement;
    const time = n.time ? new Date(n.time).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
    return `
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #1C2238;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="44" valign="top" style="padding-right:14px;">
                <div style="width:40px;height:40px;border-radius:12px;background:${cfg.color};text-align:center;line-height:40px;font-size:18px;">
                  ${cfg.emoji}
                </div>
              </td>
              <td valign="top">
                <div style="font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:700;color:#EEF0F6;margin-bottom:3px;">
                  ${n.title || "Notification"}
                </div>
                <div style="font-family:'DM Sans','Segoe UI',Arial,sans-serif;font-size:13px;color:rgba(238,240,246,0.65);line-height:1.5;">
                  ${n.detail || ""}
                </div>
                <div style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:rgba(238,240,246,0.35);margin-top:5px;">
                  <span style="display:inline-block;padding:2px 8px;border-radius:99px;background:${cfg.color}22;color:${cfg.color};font-weight:600;font-size:10px;margin-right:8px;">
                    ${cfg.label}
                  </span>
                  ${time}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join("");

  const urgentCount = notifications.filter((n: any) => n.type === "deadline" || n.type === "revision").length;
  const urgentBanner = urgentCount > 0 ? `
    <tr>
      <td style="padding:16px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.15);border-radius:12px;">
          <tr>
            <td style="padding:14px 18px;">
              <div style="font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:700;color:#F87171;">
                ⚡ ${urgentCount} urgent item${urgentCount > 1 ? "s" : ""} require${urgentCount === 1 ? "s" : ""} your attention
              </div>
              <div style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:rgba(248,113,113,0.7);margin-top:3px;">
                Defense schedules, deadlines, or revisions that need immediate action.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Hue We Are — ${digestType === "daily" ? "Daily" : "Weekly"} Digest</title>
</head>
<body style="margin:0;padding:0;background:#07090F;font-family:'DM Sans','Segoe UI',Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#07090F;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

          <!-- Logo Header -->
          <tr>
            <td style="padding:0 0 28px 0;text-align:center;">
              <div style="display:inline-block;padding:10px 24px;border-radius:16px;background:linear-gradient(135deg,#0C0F1A 0%,#161B2E 100%);border:1px solid rgba(255,255,255,0.06);">
                <span style="font-family:'Inter',Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
                  <span style="color:#4D8FFF;">Capstone</span><span style="color:#FFD100;">PH</span>
                </span>
                <span style="display:block;font-family:'DM Sans',Arial,sans-serif;font-size:10px;color:rgba(238,240,246,0.4);letter-spacing:1px;margin-top:2px;">
                  STI COLLEGE SAN FERNANDO
                </span>
              </div>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(180deg,#161B2E 0%,#111527 100%);border:1px solid rgba(255,255,255,0.07);border-radius:20px;overflow:hidden;">

                <!-- Greeting -->
                <tr>
                  <td style="padding:28px 24px 8px;">
                    <div style="font-family:'Inter',Arial,sans-serif;font-size:20px;font-weight:700;color:#EEF0F6;">
                      ${digestType === "daily" ? "Good day" : "Weekly recap"}, ${userName}! 👋
                    </div>
                    <div style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:rgba(238,240,246,0.55);margin-top:6px;line-height:1.5;">
                      Here's your ${digestType} capstone notification digest — ${notifications.length} update${notifications.length !== 1 ? "s" : ""} since your last visit.
                    </div>
                  </td>
                </tr>

                <!-- Summary pills -->
                <tr>
                  <td style="padding:16px 24px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right:8px;">
                          <div style="display:inline-block;padding:6px 14px;border-radius:99px;background:rgba(77,143,255,0.10);border:1px solid rgba(77,143,255,0.15);">
                            <span style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;color:#4D8FFF;">
                              📬 ${notifications.length} Total
                            </span>
                          </div>
                        </td>
                        <td style="padding-right:8px;">
                          <div style="display:inline-block;padding:6px 14px;border-radius:99px;background:rgba(74,222,128,0.10);border:1px solid rgba(74,222,128,0.15);">
                            <span style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;color:#4ADE80;">
                              ✅ ${notifications.filter((n: any) => n.read).length} Read
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style="display:inline-block;padding:6px 14px;border-radius:99px;background:rgba(248,113,113,0.10);border:1px solid rgba(248,113,113,0.15);">
                            <span style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;color:#F87171;">
                              🔴 ${notifications.filter((n: any) => !n.read).length} Unread
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Urgent banner -->
                ${urgentBanner}

                <!-- Divider -->
                <tr>
                  <td style="padding:0 20px;">
                    <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
                  </td>
                </tr>

                <!-- Section header -->
                <tr>
                  <td style="padding:18px 20px 4px;">
                    <div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:700;color:rgba(238,240,246,0.35);letter-spacing:1.2px;text-transform:uppercase;">
                      Recent Notifications
                    </div>
                  </td>
                </tr>

                <!-- Notification rows -->
                ${notifRows}

                <!-- CTA Button -->
                <tr>
                  <td style="padding:24px 20px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="#" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4D8FFF 0%,#3B7AE8 100%);border-radius:14px;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
                            Open Hue We Are Portal →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <div style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:rgba(238,240,246,0.25);line-height:1.6;">
                This is an automated notification from Hue We Are<br>
                BMMA Capstone Portal · STI College San Fernando<br>
                <span style="color:rgba(238,240,246,0.15);">You're receiving this because you have an active capstone account.</span>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* Get email digest preview for a user */
app.get("/make-server-36da3eb1/email-digest/preview", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const profile = await T("user_profiles").get(userId);
    const { data: notifRows } = await db().from("notifications").select("*")
      .eq("user_id", userId).order("time", { ascending: false }).limit(20);
    const mine = (notifRows || []).map(R);
    const digestType = c.req.query("type") || "daily";
    const html = generateEmailHtml(profile?.name || "Student", mine, digestType);
    return c.json({ html, notificationCount: mine.length });
  } catch (err) { console.log(`Error generating email digest: ${err}`); return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Get email digest HTML (coordinator — for any user) */
app.get("/make-server-36da3eb1/email-digest/user/:userId", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const targetId = c.req.param("userId");
    const profile = await T("user_profiles").get(targetId);
    if (!profile) return c.json({ error: "User not found" }, 404);
    const { data: notifRows } = await db().from("notifications").select("*")
      .eq("user_id", targetId).order("time", { ascending: false }).limit(20);
    const theirs = (notifRows || []).map(R);
    const digestType = c.req.query("type") || "daily";
    const html = generateEmailHtml(profile.name || "User", theirs, digestType);
    return c.json({ html, userName: profile.name, email: profile.email, notificationCount: theirs.length });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

/* Generate single notification email (for any notification type) */
app.post("/make-server-36da3eb1/email-template/single", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const { recipientName, notification } = await c.req.json();
    if (!recipientName || !notification) return c.json({ error: "Missing recipientName or notification" }, 400);
    const html = generateEmailHtml(recipientName, [notification], "single");
    return c.json({ html });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

/* ──────────────────────────────────────────
   EMAIL SENDING VIA RESEND
   ────────────────────────────────────────── */

async function sendEmailViaResend(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string; id?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "CapstonePH <noreply@capstoneph.app>",
        to: [to],
        subject,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.log(`Resend API error: ${JSON.stringify(data)}`);
      return { success: false, error: data.message || `HTTP ${res.status}` };
    }
    return { success: true, id: data.id };
  } catch (err) {
    console.log(`Resend send error: ${err}`);
    return { success: false, error: `${err}` };
  }
}

/* Send digest email to a specific user (coordinator action) */
app.post("/make-server-36da3eb1/email-digest/send", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const { userId, digestType } = await c.req.json();
    if (!userId) return c.json({ error: "Missing userId" }, 400);

    const profile = await T("user_profiles").get(userId);
    if (!profile) return c.json({ error: "User not found" }, 404);
    if (!profile.email) return c.json({ error: "User has no email address" }, 400);

    const { data: notifRows } = await db().from("notifications").select("*")
      .eq("user_id", userId).order("time", { ascending: false }).limit(20);
    const theirs = (notifRows || []).map(R);

    if (theirs.length === 0) return c.json({ error: "No notifications to send", sent: false });

    const type = digestType || "daily";
    const html = generateEmailHtml(profile.name || "User", theirs, type);
    const subject = type === "weekly"
      ? `Weekly Capstone Digest - ${theirs.length} notification${theirs.length !== 1 ? "s" : ""}`
      : `CapstonePH Digest - ${theirs.length} notification${theirs.length !== 1 ? "s" : ""}`;

    const result = await sendEmailViaResend(profile.email, subject, html);
    if (!result.success) return c.json({ error: `Email send failed: ${result.error}`, sent: false }, 500);

    await T("digest_tracking").ups({ userId, sentAt: new Date().toISOString(), type, notifCount: theirs.length });

    return c.json({ sent: true, emailId: result.id, recipientEmail: profile.email, notifCount: theirs.length });
  } catch (err) {
    console.log(`Error sending digest email: ${err}`);
    return c.json({ error: `Failed to send digest: ${err}` }, 500);
  }
});

/* Batch send digest to ALL users with unread notifications (coordinator action) */
app.post("/make-server-36da3eb1/email-digest/send-all", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const body = await c.req.json().catch(() => ({}));
    const digestType = body.digestType || "daily";

    const allUsers = await T("user_profiles").all();
    const { data: allNotifRows } = await db().from("notifications").select("*").order("time", { ascending: false });
    const allNotifs = (allNotifRows || []).map(R);
    const results: { userId: string; name: string; email: string; sent: boolean; error?: string }[] = [];

    for (const user of allUsers) {
      if (!user.email) { results.push({ userId: user.id, name: user.name, email: "", sent: false, error: "No email" }); continue; }
      const unread = allNotifs.filter((n: any) => n.userId === user.id && !n.read);
      if (unread.length === 0) continue;

      const recent = allNotifs.filter((n: any) => n.userId === user.id).slice(0, 20);

      const html = generateEmailHtml(user.name || "User", recent, digestType);
      const subject = digestType === "weekly"
        ? `Weekly Capstone Digest - ${unread.length} unread`
        : `CapstonePH Digest - ${unread.length} unread`;

      const result = await sendEmailViaResend(user.email, subject, html);
      results.push({ userId: user.id, name: user.name, email: user.email, sent: result.success, error: result.error });

      if (result.success) {
        await T("digest_tracking").ups({ userId: user.id, sentAt: new Date().toISOString(), type: digestType, notifCount: recent.length });
      }
    }

    const sentCount = results.filter(r => r.sent).length;
    const failedCount = results.filter(r => !r.sent).length;
    return c.json({ sentCount, failedCount, total: results.length, results });
  } catch (err) {
    console.log(`Error in batch email send: ${err}`);
    return c.json({ error: `Batch send failed: ${err}` }, 500);
  }
});

/* CRON endpoint — automatic digest delivery (call from external CRON scheduler) */
app.post("/make-server-36da3eb1/email-digest/cron", async (c) => {
  try {
    const cronSecret = c.req.header("X-Cron-Secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (expectedSecret && cronSecret !== expectedSecret) {
      return c.json({ error: "Invalid CRON secret" }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const digestType = body.digestType || "daily";
    const now = new Date();

    const allUsers = await T("user_profiles").all();
    const { data: allNotifRows } = await db().from("notifications").select("*").order("time", { ascending: false });
    const allNotifs = (allNotifRows || []).map(R);
    const allDigestTracking = await T("digest_tracking").all();
    const results: { userId: string; sent: boolean; error?: string; unread: number }[] = [];

    for (const user of allUsers) {
      if (!user.email) continue;
      const unread = allNotifs.filter((n: any) => n.userId === user.id && !n.read);
      if (unread.length === 0) continue;

      const lastSent = allDigestTracking.find((d: any) => d.userId === user.id);
      if (lastSent?.sentAt) {
        const hoursSince = (now.getTime() - new Date(lastSent.sentAt).getTime()) / (1000 * 60 * 60);
        const threshold = digestType === "weekly" ? 144 : 20;
        if (hoursSince < threshold) continue;
      }

      const recent = allNotifs.filter((n: any) => n.userId === user.id).slice(0, 20);

      const html = generateEmailHtml(user.name || "User", recent, digestType);
      const subject = digestType === "weekly"
        ? `Weekly Capstone Digest - ${unread.length} unread`
        : `CapstonePH Digest - ${unread.length} unread`;

      const result = await sendEmailViaResend(user.email, subject, html);
      results.push({ userId: user.id, sent: result.success, error: result.error, unread: unread.length });

      if (result.success) {
        await T("digest_tracking").ups({ userId: user.id, sentAt: now.toISOString(), type: digestType, notifCount: recent.length });
      }
    }

    const sentCount = results.filter(r => r.sent).length;
    console.log(`CRON digest: sent ${sentCount}/${results.length} emails (${digestType})`);
    return c.json({ sentCount, skipped: allUsers.length - results.length, failed: results.filter(r => !r.sent).length, digestType, timestamp: now.toISOString() });
  } catch (err) {
    console.log(`CRON digest error: ${err}`);
    return c.json({ error: `CRON failed: ${err}` }, 500);
  }
});

/* Get CRON digest status (coordinator) */
app.get("/make-server-36da3eb1/email-digest/status", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const allUsers = await T("user_profiles").all();
    const allDigest = await T("digest_tracking").all();
    const statuses: any[] = [];
    for (const user of allUsers) {
      const lastSent = allDigest.find((d: any) => d.userId === user.id);
      statuses.push({ userId: user.id, name: user.name, email: user.email, lastSent: lastSent || null });
    }
    return c.json({ statuses });
  } catch (err) { return c.json({ error: `Failed: ${err}` }, 500); }
});

/* ══════════════════════════════════════════
   PLAGIARISM CHECKER — Cross-group similarity analysis
   KV keys:
     manuscript-text:{groupNumber}  — stored extracted text
     plagiarism-report:{id}         — analysis reports
   ══════════════════════════════════════════ */

/* Helper: generate n-grams from text */
function generateNgrams(text: string, n: number = 4): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  if (words.length < n) return [words.join(" ")];
  const grams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    grams.push(words.slice(i, i + n).join(" "));
  }
  return grams;
}

/* Helper: split text into sentences */
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
}

/* Helper: compute Jaccard similarity between two n-gram sets */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  let intersection = 0;
  for (const gram of setA) {
    if (setB.has(gram)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/* Store extracted manuscript text for a group */
app.post("/make-server-36da3eb1/plagiarism/store", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const { groupNumber, text, fileName, pageCount } = await c.req.json();
    if (!groupNumber || !text) return c.json({ error: "Missing groupNumber or text" }, 400);
    if (text.length < 100) return c.json({ error: "Text too short for analysis (min 100 chars)" }, 400);

    const profile = await T("user_profiles").get(userId);
    const record = {
      groupNumber,
      text: text.slice(0, 200000),
      fileName: fileName || "manuscript.pdf",
      pageCount: pageCount || 0,
      wordCount: text.split(/\s+/).length,
      storedAt: new Date().toISOString(),
      storedBy: profile?.name || "Unknown",
    };
    await T("manuscript_texts").ups(record);
    console.log(`Manuscript text stored for group ${groupNumber} (${record.wordCount} words)`);
    return c.json({ success: true, wordCount: record.wordCount });
  } catch (err) {
    console.log(`Error storing manuscript text: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Get stored manuscript texts list (coordinator) */
app.get("/make-server-36da3eb1/plagiarism/manuscripts", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const all = await T("manuscript_texts").all();
    const list = all.map((m: any) => ({
      groupNumber: m.groupNumber,
      fileName: m.fileName,
      pageCount: m.pageCount,
      wordCount: m.wordCount,
      storedAt: m.storedAt,
      storedBy: m.storedBy,
    }));
    return c.json({ manuscripts: list.sort((a: any, b: any) => a.groupNumber - b.groupNumber) });
  } catch (err) {
    console.log(`Error fetching manuscripts: ${err}`);
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Run plagiarism analysis for a group against all others */
app.post("/make-server-36da3eb1/plagiarism/analyze", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const { groupNumber, text } = await c.req.json();
    if (!groupNumber) return c.json({ error: "Missing groupNumber" }, 400);

    let sourceText = text;
    if (!sourceText) {
      const stored = await T("manuscript_texts").get(groupNumber, "group_number");
      if (!stored?.text) return c.json({ error: "No manuscript text found. Upload a PDF first." }, 400);
      sourceText = stored.text;
    }

    const allManuscripts = await T("manuscript_texts").all();
    const others = allManuscripts.filter((m: any) => m.groupNumber !== groupNumber && m.text);

    if (others.length === 0) {
      return c.json({
        groupNumber,
        overallSimilarity: 0,
        comparisons: [],
        suspiciousPassages: [],
        analyzedAt: new Date().toISOString(),
        message: "No other manuscripts to compare against. Upload manuscripts from other groups first.",
      });
    }

    const sourceGrams = new Set(generateNgrams(sourceText, 4));
    const sourceSentences = splitSentences(sourceText);
    const groups = await T("groups").all();

    const comparisons: any[] = [];
    const allSuspicious: any[] = [];

    for (const other of others) {
      const otherGrams = new Set(generateNgrams(other.text, 4));
      const similarity = jaccardSimilarity(sourceGrams, otherGrams);

      const matchingPassages: any[] = [];
      const otherSentences = splitSentences(other.text);

      for (const sentence of sourceSentences) {
        if (sentence.split(/\s+/).length < 8) continue;
        const sentGrams = new Set(generateNgrams(sentence, 4));
        if (sentGrams.size === 0) continue;

        for (let j = 0; j < otherSentences.length; j++) {
          const otherSentGrams = new Set(generateNgrams(otherSentences[j], 4));
          if (otherSentGrams.size === 0) continue;
          const sentSim = jaccardSimilarity(sentGrams, otherSentGrams);
          if (sentSim > 0.35) {
            matchingPassages.push({
              sourcePassage: sentence.slice(0, 300),
              matchedPassage: otherSentences[j].slice(0, 300),
              similarity: Math.round(sentSim * 100),
            });
            if (matchingPassages.length >= 15) break;
          }
        }
        if (matchingPassages.length >= 15) break;
      }

      const grp = groups.find((g: any) => g.number === other.groupNumber || g.id === other.groupNumber);

      comparisons.push({
        groupNumber: other.groupNumber,
        groupName: grp?.title || grp?.name || `Group ${other.groupNumber}`,
        similarity: Math.round(similarity * 10000) / 100,
        matchingPassages: matchingPassages.slice(0, 10),
        wordCount: other.wordCount,
      });

      for (const mp of matchingPassages) {
        allSuspicious.push({
          ...mp,
          matchedGroup: other.groupNumber,
          matchedGroupName: grp?.title || grp?.name || `Group ${other.groupNumber}`,
        });
      }
    }

    comparisons.sort((a: any, b: any) => b.similarity - a.similarity);
    allSuspicious.sort((a: any, b: any) => b.similarity - a.similarity);

    const overallSimilarity = comparisons.length > 0 ? comparisons[0].similarity : 0;

    const reportId = await nextId("plagiarism-report");
    const report = {
      id: reportId,
      groupNumber,
      overallSimilarity,
      comparisons,
      suspiciousPassages: allSuspicious.slice(0, 30),
      analyzedAt: new Date().toISOString(),
      comparedAgainst: others.length,
    };
    await T("plagiarism_reports").ins(report);

    console.log(`Plagiarism analysis for group ${groupNumber}: ${overallSimilarity}% max similarity against ${others.length} groups`);
    return c.json(report);
  } catch (err) {
    console.log(`Error in plagiarism analysis: ${err}`);
    return c.json({ error: `Analysis failed: ${err}` }, 500);
  }
});

/* Get all plagiarism reports (coordinator) */
app.get("/make-server-36da3eb1/plagiarism/reports", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const reports = await T("plagiarism_reports").all("analyzed_at", false);
    return c.json({ reports });
  } catch (err) {
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Get a specific plagiarism report */
app.get("/make-server-36da3eb1/plagiarism/reports/:id", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param("id");
    const report = await T("plagiarism_reports").get(id);
    if (!report) return c.json({ error: "Report not found" }, 404);
    return c.json({ report });
  } catch (err) {
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Delete stored manuscript text */
app.delete("/make-server-36da3eb1/plagiarism/manuscripts/:groupNumber", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;
    const gn = c.req.param("groupNumber");
    await T("manuscript_texts").del(gn, "group_number");
    console.log(`Manuscript text deleted for group ${gn}`);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Student: self-check — upload own group text + run analysis in one step */
app.post("/make-server-36da3eb1/plagiarism/self-check", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const [profile, groups] = await Promise.all([
      T("users").get(userId),
      T("groups").all("number", true),
    ]);
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    let myGroup: any = null;
    for (const g of groups) {
      const groupLabel = `Group ${g.number}`;
      if (profile.group && (profile.group === groupLabel || profile.group === g.title)) { myGroup = g; break; }
      if (g.members?.some((m: any) => m.email === profile.email)) { myGroup = g; break; }
    }
    if (!myGroup) return c.json({ error: "You are not assigned to any group" }, 400);

    const groupNumber = myGroup.number || myGroup.id;
    const { text, fileName, pageCount } = await c.req.json();
    if (!text || text.length < 100) return c.json({ error: "Text too short for analysis (min 100 chars)" }, 400);

    const record = {
      groupNumber,
      text: text.slice(0, 200000),
      fileName: fileName || "manuscript.pdf",
      pageCount: pageCount || 0,
      wordCount: text.split(/\s+/).length,
      storedAt: new Date().toISOString(),
      storedBy: profile.name || "Unknown",
    };
    await T("manuscript_texts").ups(record);
    console.log(`Student self-check: stored text for group ${groupNumber} (${record.wordCount} words)`);

    const allManuscripts = await T("manuscript_texts").all();
    const others = allManuscripts.filter((m: any) => m.groupNumber !== groupNumber && m.text);

    if (others.length === 0) {
      return c.json({
        groupNumber,
        groupName: myGroup.title || `Group ${groupNumber}`,
        overallSimilarity: 0,
        comparisons: [],
        suspiciousPassages: [],
        analyzedAt: new Date().toISOString(),
        wordCount: record.wordCount,
        message: "No other manuscripts to compare against yet. Your manuscript has been stored — results will improve as more groups upload.",
      });
    }

    const sourceGrams = new Set(generateNgrams(text, 4));
    const sourceSentences = splitSentences(text);

    const comparisons: any[] = [];
    const allSuspicious: any[] = [];

    for (const other of others) {
      const otherGrams = new Set(generateNgrams(other.text, 4));
      const similarity = jaccardSimilarity(sourceGrams, otherGrams);

      const matchingPassages: any[] = [];
      const otherSentences = splitSentences(other.text);

      for (const sentence of sourceSentences) {
        if (sentence.split(/\s+/).length < 8) continue;
        const sentGrams = new Set(generateNgrams(sentence, 4));
        if (sentGrams.size === 0) continue;

        for (let j = 0; j < otherSentences.length; j++) {
          const otherSentGrams = new Set(generateNgrams(otherSentences[j], 4));
          if (otherSentGrams.size === 0) continue;
          const sentSim = jaccardSimilarity(sentGrams, otherSentGrams);
          if (sentSim > 0.35) {
            matchingPassages.push({
              sourcePassage: sentence.slice(0, 300),
              matchedPassage: otherSentences[j].slice(0, 300),
              similarity: Math.round(sentSim * 100),
            });
            if (matchingPassages.length >= 10) break;
          }
        }
        if (matchingPassages.length >= 10) break;
      }

      comparisons.push({
        groupNumber: other.groupNumber,
        groupName: "Another Group",
        similarity: Math.round(similarity * 10000) / 100,
        matchingPassages: matchingPassages.slice(0, 5),
        wordCount: other.wordCount,
      });

      for (const mp of matchingPassages.slice(0, 5)) {
        allSuspicious.push({ ...mp, matchedGroup: other.groupNumber, matchedGroupName: "Another Group" });
      }
    }

    comparisons.sort((a: any, b: any) => b.similarity - a.similarity);
    allSuspicious.sort((a: any, b: any) => b.similarity - a.similarity);
    const overallSimilarity = comparisons.length > 0 ? comparisons[0].similarity : 0;

    console.log(`Student self-check for group ${groupNumber}: ${overallSimilarity}% max similarity against ${others.length} groups`);
    return c.json({
      groupNumber, groupName: myGroup.title || `Group ${groupNumber}`,
      overallSimilarity, comparisons,
      suspiciousPassages: allSuspicious.slice(0, 20),
      analyzedAt: new Date().toISOString(),
      comparedAgainst: others.length, wordCount: record.wordCount,
    });
  } catch (err) {
    console.log(`Error in student self-check: ${err}`);
    return c.json({ error: `Self-check failed: ${err}` }, 500);
  }
});

/* Student: get their manuscript status */
app.get("/make-server-36da3eb1/plagiarism/my-status", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const [profile, groups] = await Promise.all([
      T("users").get(userId),
      T("groups").all("number", true),
    ]);
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    let myGroup: any = null;
    for (const g of groups) {
      const groupLabel = `Group ${g.number}`;
      if (profile.group && (profile.group === groupLabel || profile.group === g.title)) { myGroup = g; break; }
      if (g.members?.some((m: any) => m.email === profile.email)) { myGroup = g; break; }
    }
    if (!myGroup) return c.json({ hasManuscript: false, groupNumber: null });

    const groupNumber = myGroup.number || myGroup.id;
    const stored = await T("manuscript_texts").get(groupNumber, "group_number");
    return c.json({
      hasManuscript: !!stored, groupNumber,
      groupName: myGroup.title || `Group ${groupNumber}`,
      manuscript: stored ? {
        fileName: stored.fileName, wordCount: stored.wordCount,
        pageCount: stored.pageCount, storedAt: stored.storedAt, storedBy: stored.storedBy,
      } : null,
    });
  } catch (err) {
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   AI-POWERED DEEP ANALYSIS (OpenAI)
   Detects: AI-generated content, style inconsistencies,
   paraphrase patterns, academic integrity issues
   ══════════════════════════════════════════ */

/* ─── Rate Limiter for AI Endpoints ─── */
const AI_RATE_LIMIT = {
  maxRequests: 5,       // max requests per user per window
  windowMs: 60 * 60 * 1000, // 1 hour window
  globalMaxPerDay: 50,  // global daily cap across all users
};
const _rateLimitMap = new Map<string, { count: number; windowStart: number }>();
let _globalDayCount = { count: 0, dayStart: Date.now() };

function checkAIRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number; reason?: string } {
  const now = Date.now();
  // Reset global daily counter
  if (now - _globalDayCount.dayStart > 24 * 60 * 60 * 1000) {
    _globalDayCount = { count: 0, dayStart: now };
  }
  if (_globalDayCount.count >= AI_RATE_LIMIT.globalMaxPerDay) {
    const retryAfterMs = (_globalDayCount.dayStart + 24 * 60 * 60 * 1000) - now;
    return { allowed: false, retryAfterMs, reason: `Global daily limit reached (${AI_RATE_LIMIT.globalMaxPerDay}/day). Resets in ${Math.ceil(retryAfterMs / 60000)} minutes.` };
  }
  // Per-user sliding window
  const entry = _rateLimitMap.get(userId);
  if (entry) {
    if (now - entry.windowStart > AI_RATE_LIMIT.windowMs) {
      _rateLimitMap.set(userId, { count: 1, windowStart: now });
    } else if (entry.count >= AI_RATE_LIMIT.maxRequests) {
      const retryAfterMs = (entry.windowStart + AI_RATE_LIMIT.windowMs) - now;
      return { allowed: false, retryAfterMs, reason: `Rate limit exceeded (${AI_RATE_LIMIT.maxRequests} requests/hour). Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.` };
    } else {
      entry.count++;
    }
  } else {
    _rateLimitMap.set(userId, { count: 1, windowStart: now });
  }
  _globalDayCount.count++;
  return { allowed: true };
}

/* GET rate limit status */
app.get("/make-server-36da3eb1/plagiarism/ai-rate-limit", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const now = Date.now();
    const entry = _rateLimitMap.get(userId);
    let remaining = AI_RATE_LIMIT.maxRequests;
    let resetMs = 0;
    if (entry && (now - entry.windowStart) <= AI_RATE_LIMIT.windowMs) {
      remaining = Math.max(0, AI_RATE_LIMIT.maxRequests - entry.count);
      resetMs = (entry.windowStart + AI_RATE_LIMIT.windowMs) - now;
    }
    const globalRemaining = Math.max(0, AI_RATE_LIMIT.globalMaxPerDay - _globalDayCount.count);
    return c.json({
      remaining, limit: AI_RATE_LIMIT.maxRequests,
      windowMs: AI_RATE_LIMIT.windowMs, resetInMs: resetMs,
      globalRemaining, globalLimit: AI_RATE_LIMIT.globalMaxPerDay,
    });
  } catch (err) {
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* Coordinator / Student: AI deep analysis on manuscript text */
app.post("/make-server-36da3eb1/plagiarism/ai-analyze", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized — no valid session" }, 401);

    // ── Rate limit check ──
    const rateCheck = checkAIRateLimit(userId);
    if (!rateCheck.allowed) {
      console.log(`AI rate limit hit for user ${userId}: ${rateCheck.reason}`);
      return c.json({ error: rateCheck.reason, rateLimited: true, retryAfterMs: rateCheck.retryAfterMs }, 429);
    }

    const { groupNumber, text: directText } = await c.req.json();
    if (!groupNumber && !directText) return c.json({ error: "Missing groupNumber or text" }, 400);

    let textToAnalyze = directText;
    if (!textToAnalyze && groupNumber) {
      const stored = await T("manuscript_texts").get(groupNumber, "group_number");
      if (!stored?.text) return c.json({ error: "No manuscript text found for this group" }, 400);
      textToAnalyze = stored.text;
    }

    if (!textToAnalyze || textToAnalyze.length < 200) {
      return c.json({ error: "Text too short for AI analysis (minimum ~200 characters)" }, 400);
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return c.json({ error: "OpenAI API key not configured. Please add OPENAI_API_KEY in settings." }, 500);
    }

    const sample = textToAnalyze.slice(0, 14000);
    const wordCount = textToAnalyze.split(/\s+/).length;

    const systemPrompt = `You are an academic integrity analysis AI for a university capstone portal (BMMA program at STI College). Analyze the submitted manuscript text for potential academic integrity issues.

Return a JSON object with this EXACT structure (no markdown, just raw JSON):
{
  "aiGeneratedScore": <number 0-100, likelihood of AI-generated content>,
  "styleConsistencyScore": <number 0-100, how consistent the writing style is — higher = more consistent = better>,
  "academicIntegrityScore": <number 0-100, overall integrity — higher = better/cleaner>,
  "overallVerdict": "<CLEAN|LOW_RISK|MODERATE_RISK|HIGH_RISK>",
  "verdictSummary": "<1-2 sentence plain-English summary>",
  "sections": [
    {
      "title": "<section name or topic>",
      "aiLikelihood": "<LOW|MEDIUM|HIGH>",
      "styleNote": "<brief note on writing style in this section>",
      "flaggedExcerpt": "<quoted excerpt if suspicious, or null>",
      "concern": "<specific concern or null>"
    }
  ],
  "flags": [
    {
      "type": "<AI_GENERATED|STYLE_SHIFT|PARAPHRASE_PATTERN|CITATION_ISSUE|VOCABULARY_ANOMALY>",
      "severity": "<LOW|MEDIUM|HIGH>",
      "description": "<clear explanation>",
      "excerpt": "<quoted text excerpt, max 200 chars>",
      "recommendation": "<what the student should do>"
    }
  ],
  "writingProfile": {
    "vocabularyLevel": "<BASIC|INTERMEDIATE|ADVANCED|MIXED>",
    "sentenceComplexity": "<SIMPLE|MODERATE|COMPLEX|INCONSISTENT>",
    "toneFormality": "<INFORMAL|SEMI_FORMAL|FORMAL|INCONSISTENT>",
    "citationStyle": "<PROPER|PARTIAL|MISSING|INCONSISTENT>"
  },
  "recommendations": ["<actionable suggestion 1>", "<suggestion 2>", ...]
}

Guidelines:
- Be thorough but fair — flag genuine concerns, not minor stylistic choices
- AI detection: look for unnaturally uniform sentence structure, overuse of transitional phrases, generic filler, lack of domain-specific nuance
- Style shifts: sudden changes in vocabulary sophistication, sentence length patterns, or tone
- Paraphrase patterns: close rewording of common textbook/web phrasing with only synonym swaps
- Provide 3-8 flags maximum, focusing on the most significant concerns
- Provide 3-6 sections analysis
- Be calibrated: most student papers have some issues — do not be alarmist about normal academic writing`;

    const userPrompt = `Analyze this manuscript excerpt (${wordCount} total words, showing representative sample):\n\n---\n${sample}\n---`;

    console.log(`AI analysis requested for group ${groupNumber || "direct"} (${wordCount} words)`);

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      console.log(`OpenAI API error: ${openaiRes.status} — ${errBody}`);
      return c.json({ error: `OpenAI API error (${openaiRes.status}): ${errBody.slice(0, 200)}` }, 502);
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content;
    if (!content) {
      return c.json({ error: "Empty response from OpenAI" }, 502);
    }

    let analysis: any;
    try {
      analysis = JSON.parse(content);
    } catch (_parseErr) {
      console.log(`Failed to parse OpenAI response: ${content.slice(0, 300)}`);
      return c.json({ error: "Failed to parse AI analysis response" }, 502);
    }

    const reportId = await nextId("ai-plagiarism-report");
    const report = {
      id: reportId,
      groupNumber: groupNumber || null,
      wordCount,
      analysis,
      analyzedAt: new Date().toISOString(),
      analyzedBy: userId,
      model: "gpt-4o-mini",
    };
    await T("ai_plagiarism_reports").ins(report);

    console.log(`AI analysis complete for group ${groupNumber || "direct"}: verdict=${analysis.overallVerdict}, integrity=${analysis.academicIntegrityScore}`);
    return c.json(report);
  } catch (err) {
    console.log(`Error in AI plagiarism analysis: ${err}`);
    return c.json({ error: `AI analysis failed: ${err}` }, 500);
  }
});

/* Get AI analysis reports */
app.get("/make-server-36da3eb1/plagiarism/ai-reports", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const reports = await T("ai_plagiarism_reports").all("analyzed_at", false);
    return c.json({ reports });
  } catch (err) {
    return c.json({ error: `Failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   SEARCH: Fuzzy search across groups and users
   ══════════════════════════════════════════ */
app.get("/make-server-36da3eb1/search", async (c) => {
  try {
    const userId = await getAuthedUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const q = (c.req.query("q") || "").toLowerCase().trim();
    if (!q || q.length < 2) return c.json({ groups: [], users: [] });

    // Search groups — use Postgres text search
    const { data: groupData } = await db()
      .from("groups")
      .select("id, name, title, type, status, members")
      .or(`name.ilike.%${q}%,title.ilike.%${q}%,type.ilike.%${q}%`)
      .limit(5);
    const matchedGroups = (groupData || []).map((g: any) => ({
      id: g.id, name: g.name, title: g.title, type: g.type, status: g.status,
    }));

    // Search users
    const { data: userData } = await db()
      .from("users")
      .select("id, name, email, role")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,role.ilike.%${q}%`)
      .limit(5);
    const matchedUsers = (userData || []).map((u: any) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
    }));

    return c.json({ groups: matchedGroups, users: matchedUsers });
  } catch (err) {
    console.log(`Search error: ${err}`);
    return c.json({ error: `Search failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   DATA INTEGRITY: Validation and audit endpoints
   ══════════════════════════════════════════ */

// Comprehensive data validation endpoint
app.get("/make-server-36da3eb1/admin/data-integrity", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;

    const report: any = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      issues: [],
      stats: {},
      warnings: [],
      criticalErrors: [],
    };

    // ────── 1. Check orphaned records ──────
    console.log("Checking orphaned records...");

    // Submissions without valid groups
    const { data: allSubmissions } = await db().from("submissions").select("id, group_number");
    const { data: allGroups } = await db().from("groups").select("number");
    const groupNumbers = new Set((allGroups || []).map((g: any) => g.number));
    const orphanedSubmissions = (allSubmissions || []).filter((s: any) => !groupNumbers.has(s.group_number));
    if (orphanedSubmissions.length > 0) {
      report.issues.push({
        severity: "high",
        category: "orphaned_data",
        table: "submissions",
        count: orphanedSubmissions.length,
        message: `Found ${orphanedSubmissions.length} submissions for non-existent groups`,
        sample: orphanedSubmissions.slice(0, 3),
      });
    }

    // Grades without valid groups
    const { data: allGrades } = await db().from("grades").select("id, group_number");
    const orphanedGrades = (allGrades || []).filter((g: any) => !groupNumbers.has(g.group_number));
    if (orphanedGrades.length > 0) {
      report.issues.push({
        severity: "high",
        category: "orphaned_data",
        table: "grades",
        count: orphanedGrades.length,
        message: `Found ${orphanedGrades.length} grades for non-existent groups`,
        sample: orphanedGrades.slice(0, 3),
      });
    }

    // ────── 2. Check data consistency ──────
    console.log("Checking data consistency...");

    // Users with invalid roles
    const { data: invalidRoleUsers } = await db()
      .from("user_profiles")
      .select("id, name, role")
      .not("role", "in", ["student", "panelist", "adviser", "coordinator"]);
    if (invalidRoleUsers && invalidRoleUsers.length > 0) {
      report.criticalErrors.push({
        severity: "critical",
        category: "invalid_data",
        table: "user_profiles",
        count: invalidRoleUsers.length,
        message: `Found ${invalidRoleUsers.length} users with invalid roles`,
        sample: invalidRoleUsers,
      });
    }

    // Groups with invalid status
    const { data: invalidStatusGroups } = await db()
      .from("groups")
      .select("id, number, name, status")
      .not("status", "in", ["Active", "Completed", "Archived", "In Progress"]);
    if (invalidStatusGroups && invalidStatusGroups.length > 0) {
      report.issues.push({
        severity: "medium",
        category: "invalid_data",
        table: "groups",
        count: invalidStatusGroups.length,
        message: `Found ${invalidStatusGroups.length} groups with invalid status`,
        sample: invalidStatusGroups,
      });
    }

    // Defenses with past dates but "Scheduled" status
    const today = new Date().toISOString().split("T")[0];
    const { data: staleDefenses } = await db()
      .from("defenses")
      .select("id, group_number, date, status")
      .lt("date", today)
      .eq("status", "Scheduled");
    if (staleDefenses && staleDefenses.length > 0) {
      report.warnings.push({
        severity: "low",
        category: "stale_data",
        table: "defenses",
        count: staleDefenses.length,
        message: `Found ${staleDefenses.length} scheduled defenses with past dates`,
        sample: staleDefenses.slice(0, 5),
      });
    }

    // ────── 3. Collect table statistics ──────
    console.log("Collecting statistics...");

    const tables = [
      "user_profiles", "groups", "submissions", "defenses", "deadlines",
      "deadline_progress", "notifications", "announcements", "grades",
      "comments", "manuscript_texts", "plagiarism_reports", "ai_plagiarism_reports",
      "digest_tracking", "panelist_assignments", "timeline_events", "peer_evaluations"
    ];

    for (const table of tables) {
      try {
        const { count } = await db().from(table).select("*", { count: "exact", head: true });
        report.stats[table] = count || 0;
      } catch (err) {
        report.stats[table] = -1; // Table might not exist
      }
    }

    // ────── 4. Check for missing required data ──────
    console.log("Checking required fields...");

    // Groups without advisers
    const { data: groupsNoAdviser } = await db()
      .from("groups")
      .select("id, number, name, adviser")
      .or("adviser.is.null,adviser.eq.—");
    if (groupsNoAdviser && groupsNoAdviser.length > 0) {
      report.warnings.push({
        severity: "low",
        category: "missing_data",
        table: "groups",
        count: groupsNoAdviser.length,
        message: `Found ${groupsNoAdviser.length} groups without assigned advisers`,
      });
    }

    // Users without names or emails
    const { data: incompleteUsers } = await db()
      .from("user_profiles")
      .select("id, name, email")
      .or("name.is.null,email.is.null");
    if (incompleteUsers && incompleteUsers.length > 0) {
      report.issues.push({
        severity: "high",
        category: "missing_data",
        table: "user_profiles",
        count: incompleteUsers.length,
        message: `Found ${incompleteUsers.length} users with missing name or email`,
        sample: incompleteUsers,
      });
    }

    // ────── 5. Set overall status ──────
    if (report.criticalErrors.length > 0) {
      report.status = "critical";
    } else if (report.issues.length > 0) {
      report.status = "needs_attention";
    } else if (report.warnings.length > 0) {
      report.status = "healthy_with_warnings";
    }

    report.summary = {
      totalIssues: report.issues.length,
      totalWarnings: report.warnings.length,
      totalCriticalErrors: report.criticalErrors.length,
      totalTables: tables.length,
      totalRecords: Object.values(report.stats).reduce((a: any, b: any) => (a || 0) + (b || 0), 0),
    };

    console.log(`Data integrity check complete: ${report.status}`);
    return c.json(report);
  } catch (err) {
    console.log(`Data integrity check error: ${err}`);
    return c.json({ error: `Integrity check failed: ${err}` }, 500);
  }
});

// Quick health check endpoint
app.get("/make-server-36da3eb1/admin/health-check", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;

    // Quick counts
    const [users, groups, submissions, defenses] = await Promise.all([
      T("user_profiles").all(),
      T("groups").all(),
      T("submissions").all(),
      T("defenses").all(),
    ]);

    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      counts: {
        users: users.length,
        groups: groups.length,
        submissions: submissions.length,
        defenses: defenses.length,
      },
      database: "connected",
    });
  } catch (err) {
    console.log(`Health check error: ${err}`);
    return c.json({ status: "error", error: `${err}` }, 500);
  }
});

// Audit log viewer endpoint
app.get("/make-server-36da3eb1/admin/audit-log", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;

    const limit = Number(c.req.query("limit")) || 100;
    const table = c.req.query("table");

    let query = db()
      .from("audit_log")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(limit);

    if (table) {
      query = query.eq("table_name", table);
    }

    const { data: logs } = await query;

    return c.json({
      logs: (logs || []).map(R),
      count: logs?.length || 0,
      limit,
      filteredBy: table || "all",
    });
  } catch (err) {
    console.log(`Audit log fetch error: ${err}`);
    return c.json({ error: `Failed to fetch audit log: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   ADMIN: One-time KV → SQL Data Migration (v3)
   Queries actual table columns via information_schema,
   filters to valid fields, handles composite PKs.
   ══════════════════════════════════════════ */
app.post("/make-server-36da3eb1/admin/migrate-kv", async (c) => {
  try {
    const auth = await requireCoordinator(c);
    if (auth instanceof Response) return auth;

    const supabase = getAdminClient();
    const log: string[] = [];
    let totalMigrated = 0;

    // Fetch ALL KV rows
    const { data: allKv, error: kvErr } = await supabase
      .from("kv_store_36da3eb1")
      .select("key, value")
      .limit(10000);

    if (kvErr) return c.json({ error: `Failed to read KV store: ${kvErr.message}` }, 500);
    if (!allKv || allKv.length === 0) return c.json({ message: "KV store is empty", migrated: 0 });

    log.push(`Found ${allKv.length} KV entries`);

    // Group by prefix
    const grouped: Record<string, { key: string; value: any }[]> = {};
    for (const row of allKv) {
      const colonIdx = row.key.indexOf(":");
      const prefix = colonIdx > 0 ? row.key.substring(0, colonIdx) : row.key;
      if (!grouped[prefix]) grouped[prefix] = [];
      grouped[prefix].push(row);
    }
    log.push(`Prefixes: ${Object.keys(grouped).join(", ")}`);

    // Prefix → SQL table
    const prefixToTable: Record<string, string> = {
      "user": "user_profiles",
      "group": "groups",
      "submission": "submissions",
      "dlprog": "deadline_progress",
      "deadline": "deadlines",
      "notification": "notifications",
      "ai-plagiarism-report": "ai_plagiarism_reports",
      "manuscript-text": "manuscript_texts",
      "announcement": "announcements",
      "defense": "defenses",
      "grade": "grades",
      "peer-eval": "peer_evaluations",
      "panelist-assignment": "panelist_assignments",
      "archive": "archives",
      "plagiarism-report": "plagiarism_reports",
    };

    // ── Special: timeline → store as JSON in settings (no timelines table) ──
    if (grouped["timeline"]) {
      try {
        const td = grouped["timeline"].map((e) => ({ kvKey: e.key, ...e.value }));
        await supabase.from("settings").upsert({ key: "kv_timelines", value: td, updated_at: new Date().toISOString() }, { onConflict: "key" });
        log.push(`Done settings(kv_timelines): stored ${td.length} entries`);
        totalMigrated += td.length;
      } catch (e) { log.push(`Err timeline: ${e}`); }
      delete grouped["timeline"];
    }

    // ── Special: landing → store as JSON in settings (no landing_groups table) ──
    if (grouped["landing"]) {
      try {
        const ld = grouped["landing"].map((e) => e.value);
        await supabase.from("settings").upsert({ key: "landing_groups", value: ld, updated_at: new Date().toISOString() }, { onConflict: "key" });
        log.push(`Done settings(landing_groups): stored ${ld.length} entries`);
        totalMigrated += ld.length;
      } catch (e) { log.push(`Err landing: ${e}`); }
      delete grouped["landing"];
    }

    // ── Special: counter → store as JSON in settings ──
    if (grouped["counter"]) {
      let cc = 0;
      for (const entry of grouped["counter"]) {
        try {
          const nm = entry.key.replace("counter:", "");
          const v = typeof entry.value === "number" ? entry.value : parseInt(String(entry.value), 10);
          if (!isNaN(v)) {
            await supabase.from("settings").upsert({ key: `counter:${nm}`, value: { current: v }, updated_at: new Date().toISOString() }, { onConflict: "key" });
            cc++;
          }
        } catch (e) { log.push(`  counter err: ${e}`); }
      }
      log.push(`Done settings(counters): ${cc}/${grouped["counter"].length}`);
      totalMigrated += cc;
      delete grouped["counter"];
    }

    // ── Special: submission KV entries are group-level metadata, store in settings ──
    if (grouped["submission"]) {
      try {
        const subData = grouped["submission"].map((e) => ({ kvKey: e.key, ...e.value }));
        await supabase.from("settings").upsert(
          { key: "kv_submissions", value: subData, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
        log.push(`Done settings(kv_submissions): stored ${subData.length} submission entries as JSON`);
        totalMigrated += grouped["submission"].length;
      } catch (e) { log.push(`Err submission: ${e}`); }
      delete grouped["submission"];
    }

    // ── Main loop ──
    for (const [prefix, entries] of Object.entries(grouped)) {
      const tableName = prefixToTable[prefix];
      if (!tableName) { log.push(`Skip "${prefix}" (${entries.length})`); continue; }

      // Verify table exists by trying a no-op select
      const { error: tblErr } = await supabase.from(tableName).select("*").limit(0);
      if (tblErr) { log.push(`Skip "${prefix}" -> "${tableName}" (${tblErr.message})`); continue; }
      log.push(`  [${prefix}] -> ${tableName}`);

      let count = 0;
      const errors: string[] = [];
      const badCols = new Set<string>(); // columns the DB doesn't have, learned from errors

      for (const entry of entries) {
        try {
          const val = { ...(entry.value || {}) };
          if (typeof val !== "object") { errors.push(`${entry.key}: not object`); continue; }

          // ── deadline_progress: composite key dlprog:deadlineId:groupId ──
          if (tableName === "deadline_progress") {
            const parts = entry.key.split(":");
            if (parts.length >= 3) { val.deadlineId = parts[1]; val.groupId = parts[2]; }
            delete val.id;
          }

          // ── manuscript_texts: PK is group_number, not id ──
          if (tableName === "manuscript_texts") {
            const parts = entry.key.split(":");
            if (parts.length >= 2 && !val.groupNumber) val.groupNumber = parts[1];
            delete val.id;
          }

          // Extract ID from key if missing
          if (!val.id && tableName !== "deadline_progress" && tableName !== "manuscript_texts") {
            const ci = entry.key.indexOf(":");
            if (ci > 0) val.id = entry.key.substring(ci + 1);
          }

          // KV "notification" has "detail" but SQL has "message"
          if (tableName === "notifications" && val.detail && !val.message) {
            val.message = val.detail;
          }

          // Normalize user_profiles role to lowercase (constraint: student|panelist|adviser|coordinator)
          if (tableName === "user_profiles" && val.role) {
            const rawRole = String(val.role).toLowerCase();
            // Map aliases to valid DB roles
            const roleMap: Record<string, string> = {
              "student": "student", "panelist": "panelist", "adviser": "adviser", "coordinator": "coordinator",
              "advisor": "adviser", "admin": "coordinator",
              "faculty": "panelist", "teacher": "panelist", "prof": "panelist",
            };
            val.role = roleMap[rawRole] || "student";
          }

          // Normalize groups status (constraint: Active|Completed|Archived|In Progress)
          if (tableName === "groups" && val.status) {
            const s = String(val.status);
            const statusMap: Record<string, string> = {
              "active": "Active", "completed": "Completed", "archived": "Archived",
              "in progress": "In Progress", "in-progress": "In Progress",
              "pending": "Active", "inactive": "Archived",
            };
            val.status = statusMap[s.toLowerCase()] || "Active";
          }

          // Submissions: extract group_number from KV key "submission:2"
          if (tableName === "submissions") {
            const parts = entry.key.split(":");
            if (parts.length >= 2 && !val.groupNumber) {
              val.groupNumber = parts[1];
            }
          }

          // Convert camelCase → snake_case
          const snaked = W(val);

          // Pre-filter using known bad cols from previous rows, then let DB catch new ones
          let filtered: Record<string, any> = {};
          for (const [k, v] of Object.entries(snaked)) {
            if (v !== undefined && !badCols.has(k)) filtered[k] = v;
          }
          if (Object.keys(filtered).length < 1) { errors.push(`${entry.key}: empty`); continue; }

          let conflict = "id";
          if (tableName === "deadline_progress") conflict = "deadline_id,group_id";
          else if (tableName === "manuscript_texts") conflict = "group_number";
          // If 'id' col was already stripped, try 'group_number' as conflict target
          if (badCols.has("id") && conflict === "id" && filtered.group_number) {
            conflict = "group_number";
          }

          // Auto-retry: strip bad columns on "Could not find the 'X' column" errors
          let attempts = 0;
          let ok = false;
          // If conflict col is stripped, skip upsert and do insert-only
          const useInsertOnly = badCols.has("id") && !filtered.id;
          while (attempts < 8) {
            attempts++;
            // If we can't upsert (no PK), try insert directly
            const { error: e1 } = useInsertOnly
              ? await supabase.from(tableName).insert(filtered)
              : await supabase.from(tableName).upsert(filtered, { onConflict: conflict, ignoreDuplicates: false });
            if (!e1) { ok = true; break; }
            const cm = e1.message.match(/Could not find the '(\w+)' column/);
            if (cm) {
              delete filtered[cm[1]];
              if (!badCols.has(cm[1])) { badCols.add(cm[1]); log.push(`    [${tableName}] DB missing col "${cm[1]}" (stripped)`); }
              if (Object.keys(filtered).length < 1) { errors.push(`${entry.key}: all cols stripped`); break; }
              continue;
            }
            // Fallback: plain insert
            const { error: e2 } = await supabase.from(tableName).insert(filtered);
            if (!e2) { ok = true; break; }
            const cm2 = e2.message.match(/Could not find the '(\w+)' column/);
            if (cm2) {
              delete filtered[cm2[1]];
              if (!badCols.has(cm2[1])) { badCols.add(cm2[1]); log.push(`    [${tableName}] DB missing col "${cm2[1]}" (stripped)`); }
              continue;
            }
            errors.push(`${entry.key}: ${e2.message}`);
            break;
          }
          if (ok) count++;
        } catch (e) { errors.push(`${entry.key}: ${e}`); }
      }

      totalMigrated += count;
      log.push(`Done ${tableName}: ${count}/${entries.length}${errors.length > 0 ? ` (${errors.length} errors)` : ""}`);
      if (errors.length > 0) log.push(`   ${errors.slice(0, 5).join("; ")}${errors.length > 5 ? ` ...+${errors.length - 5}` : ""}`);
    }

    log.push(`\nTotal migrated: ${totalMigrated}`);
    return c.json({ message: "Migration complete", totalMigrated, log });
  } catch (err) {
    console.log(`KV migration error: ${err}`);
    return c.json({ error: `Migration failed: ${err}` }, 500);
  }
});

/* ══════════════════════════════════════════
   STARTUP: Wait for DB readiness before serving
   Retries on 57P03 "database system is shutting down" / "starting up"
   transient errors that can occur during Supabase deployment.
   ══════════════════════════════════════════ */
async function waitForDb(maxRetries = 8, delayMs = 2500): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { error } = await getAdminClient()
        .from("kv_store_36da3eb1")
        .select("key")
        .limit(1);
      if (!error) {
        if (i > 0) console.log(`DB ready after ${i + 1} attempts.`);
        return;
      }
      // Transient "shutting down" / "starting up" errors — keep retrying
      const msg = error.message || "";
      if (msg.includes("57P03") || msg.includes("shutting down") || msg.includes("starting up") || msg.includes("cannot_connect_now")) {
        console.log(`DB not ready yet (attempt ${i + 1}/${maxRetries}): ${msg} — retrying in ${delayMs}ms…`);
      } else {
        // Non-transient DB error (e.g. bad creds) — no point retrying
        console.log(`DB startup check failed (non-transient): ${msg}`);
        return;
      }
    } catch (e) {
      console.log(`DB startup check exception (attempt ${i + 1}/${maxRetries}): ${e} — retrying in ${delayMs}ms…`);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  console.log("Warning: DB readiness check timed out — starting server anyway.");
}

await waitForDb();

Deno.serve({
  onError: (err) => {
    console.log(`Unhandled server error: ${err}`);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  },
}, app.fetch);

