/**
 * Shared TypeScript interfaces for CapstonePH API responses.
 *
 * These types are the single source of truth for data shapes returned
 * by the backend. Import from here instead of re-declaring inline.
 */

/* ═══ Auth & Users ═══ */

export type UserRole = "student" | "panelist" | "adviser" | "coordinator";
export type UserStatus = "Active" | "Inactive";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  secondaryRoles?: UserRole[];
  group: string;
  adviser: string;
  department: string;
  status: UserStatus;
  avatar: string;
  avatarUrl?: string | null;
  createdAt: string;
  profileSetupComplete?: boolean;
  program?: string;
  section?: string;
  course?: string;
}

/* ═══ Groups ═══ */

export type GroupStatus = "Pre-Defense" | "Defense Ready" | "Graded" | "Archived";
export type SubmissionType = "video" | "youtube" | "photo" | "website" | "zip" | "gdrive" | "custom";

export interface GroupMember {
  initials: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface PanelistInfo {
  initials: string;
  name: string;
}

export interface Group {
  id: number;
  number: number;
  title: string;
  type: string;
  status: GroupStatus;
  members: GroupMember[];
  adviser: string;
  adviserInitials: string;
  panelists: PanelistInfo[];
  progress: number;
  description: string;
  client: string;
  submissionType: SubmissionType;
  submissionInstructions: string;
  photoUrl?: string | null;
  /** Post-defense revision fields */
  revisionStatus?: string;
  revisionSubmittedAt?: string;
  revisionChecklist?: { label: string; done?: boolean }[];
  revisionReviewNote?: string;
  revisionReviewedBy?: string;
  revisionReviewedAt?: string;
  defenseStatus?: string;
  capstoneTitle?: string;
}

/* ═══ Defenses ═══ */

export type DefenseMode = "face-to-face" | "online" | "hybrid";
export type DefenseVerdict = "Pass" | "Pass with Minor Revision" | "Pass with Major Revision/Re-demonstration" | "Re-demonstration" | "Fail";

export interface Defense {
  id: number;
  group_number: number;
  title?: string;
  date: string;
  time?: string;
  room?: string;
  mode?: DefenseMode;
  panel_members: PanelistInfo[];
  score?: number;
  verdict?: DefenseVerdict | string;
  status?: string;
}

/* ═══ Submissions / Manuscripts ═══ */

export interface PreDefenseFile {
  fileId: string;
  fileName: string;
  fileSize?: string;
  linkUrl?: string;
  status?: string;
  uploadDate?: string;
  uploadedBy?: string;
  reviewStatus?: string;
  reviewNote?: string;
  reviewedAt?: string;
}

export interface ProjectOutput {
  fileName?: string;
  reviewStatus?: string;
  uploadDate?: string;
}

export interface Submission {
  manuscriptLink?: string | null;
  manuscriptLinkUpdatedAt?: string;
  manuscriptLinkUpdatedBy?: string;
  preDefenseFiles?: PreDefenseFile[];
  projectOutput?: ProjectOutput | null;
  comments?: SubmissionComment[];
}

export interface SubmissionComment {
  id: string;
  author: string;
  authorRole?: UserRole;
  text: string;
  createdAt: string;
}

/* ═══ Grading ═══ */

export interface GradeRecord {
  id: number;
  groupId: number;
  groupNumber: number;
  groupTitle: string;
  panelistId: string;
  panelistName: string;
  groupScores: Record<string, number>;
  individualScores: Record<string, Record<string, number>>;
  weightedTotal: number;
  verdict: DefenseVerdict | string;
  feedback: string;
  revisions: { text: string; checked?: boolean }[];
  createdAt: string;
}

export interface AggregatedGrade {
  groupNumber: number;
  groupTitle: string;
  averageGroupScore: number;
  averageIndividualScores: Record<string, number>;
  overallAverage: number;
  verdict: DefenseVerdict | string;
  submittedCount: number;
  grades: GradeRecord[];
}

/* ═══ Notifications ═══ */

export type NotificationType = "info" | "success" | "warning" | "error" | "defense" | "grade" | "submission";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

/* ═══ Bootstrap ═══ */

export interface BootstrapContext {
  profile: UserProfile;
  myGroup: Group | null;
  myDefense: Defense | null;
  assignedGroups: Group[];
  advisedGroups: Group[];
}

export interface BootstrapData {
  context: BootstrapContext;
  announcements: any[];
  deadlines: any[];
  notifications: Notification[];
  timeline: any[];
}

/* ═══ API Response Wrappers ═══ */

export interface UsersResponse {
  users: UserProfile[];
}

export interface GroupsResponse {
  groups: Group[];
}

export interface DefensesResponse {
  defenses: Defense[];
}

export interface GradesResponse {
  grades: GradeRecord[];
}

export interface SearchResponse {
  groups: Group[];
  users: UserProfile[];
}

export interface SubmissionResponse {
  submission: Submission;
}
