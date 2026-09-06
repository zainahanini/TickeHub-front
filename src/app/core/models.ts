export enum TicketStatus {
  Open = 'Open',
  InProgress = 'InProgress',
  Pending = 'Pending',
  Resolved = 'Resolved',
  Closed = 'Closed',
}

export enum TicketPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Urgent = 'Urgent',
}

export enum UserType {
  Citizen = 'Citizen',
  Agent = 'Agent',
  Supervisor = 'Supervisor',
  Admin = 'Admin',
}

export interface User {
  id: number;
  email: string;
  displayName: string;
  phone: string | null;
  agentId?: number | null;
  userType?: UserType | string | null;
  role?: string | null;
  roles?: string[] | null;
  departmentId: number | null;
  departmentName?: string;
}

export interface Department {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  departmentId: number | null;
}

export interface Agent {
  id: number;
  userId: number;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  departmentId?: number;
  isAvailable?: boolean;
  openTicketCount?: number;
  capacity?: number;
  departmentName?: string;
  skills?: Array<string | AgentSkill>;
  bio?: string | null;
  avatarUrl?: string | null;
  officePhone?: string | null;
}

export interface AgentSkill {
  id: number;
  name: string;
}

export interface CreateAgentRequest {
  userId: number;
  departmentId: number;
  firstName: string;
  lastName: string;
  isAvailable?: boolean;
}

export interface UpdateAgentRequest {
  departmentId: number;
  firstName: string;
  lastName: string;
  isAvailable: boolean;
}

export interface UpdateAgentProfileRequest {
  bio: string | null;
  avatarUrl: string | null;
  officePhone: string | null;
}

export interface TicketListItem {
  id: number;
  ticketNumber?: string;
  title: string;
  status: TicketStatus;
  statusName?: string;
  priority: TicketPriority;
  priorityName?: string;
  categoryName: string;
  departmentName: string;
  createdByName: string;
  assignedAgentName: string | null;
  createdAt: string;
  createdDate?: string;
  updatedAt: string;
  dueAt?: string | null;
  isOverdue?: boolean;
  categoryId?: number;
}

export interface Ticket {
  id: number;
  ticketNumber?: string;
  title: string;
  description: string;
  status: TicketStatus;
  statusName?: string;
  priority: TicketPriority;
  priorityName?: string;
  categoryId: number;
  departmentId: number;
  categoryName?: string;
  departmentName?: string;
  location?: string | null;
  locationAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
  reporterPhone?: string | null;
  assignedAgentName?: string | null;
  createdByUserId: number;
  assignedAgentId: number | null;
  createdAt: string;
  updatedAt: string;
  dueAt?: string | null;
  isOverdue?: boolean;
  rowVersion?: string;
  comments?: Comment[];
  attachments?: Attachment[];
  rating?: Rating | null;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  categoryId: number;
  priority?: TicketPriority | null;
  reporterName: string;
  reporterPhone?: string | null;
  reporterEmail?: string | null;
  locationAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Comment {
  id: number;
  ticketId: number;
  userId: number;
  authorName: string;
  body: string;
  createdAt: string;
  canEdit?: boolean;
  canDelete?: boolean;
  isInternal?: boolean;
}

export interface Attachment {
  id: number;
  ticketId: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  description?: string | null;
  canDelete?: boolean;
}

export interface Rating {
  id: number;
  ticketId: number;
  userId: number;
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user?: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  phone?: string | null;
  password: string;
  confirmPassword: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface UpdateProfileRequest {
  displayName: string;
  phone: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  token: string;
  email?: string;
  password: string;
}

export interface AuthSession {
  id: string;
  createdAt: string;
  lastSeenAt?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  isCurrent?: boolean;
}

export interface TicketQuery {
  status?: TicketStatus;
  priority?: TicketPriority;
  departmentId?: number;
  categoryId?: number;
  assignedAgentId?: number;
  search?: string;
  sortBy?: string;
  sortDescending?: boolean;
  page?: number;
  pageSize?: number;
  unassigned?: boolean;
  overdue?: boolean;
  createdFrom?: string;
  createdTo?: string;
}

export interface UpdateTicketRequest {
  title: string;
  description: string;
  categoryId: number;
  priority: TicketPriority;
  locationAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rowVersion?: string | null;
}

export interface ChangeTicketStatusRequest {
  newStatus: TicketStatus;
  reason?: string | null;
  rowVersion?: string | null;
}

export interface PagedTickets {
  items: TicketListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export interface TicketWorkflowAction {
  action?: string;
  name?: string;
  label?: string;
  status?: TicketStatus;
  toStatus?: TicketStatus;
  newStatus?: TicketStatus;
  targetStatus?: TicketStatus;
  requiresReason?: boolean;
  reasonRequired?: boolean;
  canExecute?: boolean;
}

export interface TicketHistoryEntry {
  id?: number;
  action?: string;
  description?: string;
  fromStatus?: TicketStatus | null;
  toStatus?: TicketStatus | null;
  changedByName?: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId?: number;
  ticketId: number;
  senderUserId: number;
  senderName: string;
  body: string;
  sentAt: string;
  isMine?: boolean;
}

export interface ChatConversation {
  id: number;
  ticketId?: number | null;
  ticketNumber?: string | null;
  title?: string | null;
  subject?: string | null;
  participantName?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  unreadCount?: number;
}

export interface CreateConversationRequest {
  ticketId?: number | null;
  subject?: string | null;
  participantUserId?: number | null;
}

export interface SendChatMessageRequest {
  body: string;
}

export interface AppNotification {
  id: number;
  userId: number;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  ticketId?: number | null;
}

export interface Workflow {
  id: number;
  name: string;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  requiredUserType: UserType;
}

export interface WorkflowStatus {
  status: TicketStatus;
  name: string;
}

export interface WorkflowTransition {
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  name?: string;
  label?: string;
  requiresReason?: boolean;
  requiredUserType?: UserType | string;
}

export interface TicketStatusCount {
  status: TicketStatus;
  count: number;
}

export interface AgentPerformance {
  agentId: number;
  agentName: string;
  openTickets: number;
  resolvedTickets: number;
  averageResolutionHours: number;
}

export interface TicketStatistics {
  openTickets: number;
  overdueTickets: number;
  unassignedTickets: number;
}

export interface CategorySatisfaction {
  categoryId?: number;
  categoryName: string;
  averageScore: number;
  responseCount: number;
}

export interface DailyVolume {
  date: string;
  createdCount: number;
  resolvedCount: number;
}

export interface ReportFilters {
  from?: string | null;
  to?: string | null;
  departmentId?: number | null;
}
