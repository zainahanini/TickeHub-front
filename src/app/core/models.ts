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
  Admin = 'Admin',
}

export interface User {
  id: number;
  email: string;
  displayName: string;
  phone: string | null;
  userType: UserType;
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
  firstName: string;
  lastName: string;
  email: string;
  departmentId: number;
  isAvailable: boolean;
}

export interface TicketListItem {
  id: number;
  ticketNumber?: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  categoryName: string;
  departmentName: string;
  createdByName: string;
  assignedAgentName: string | null;
  createdAt: string;
  createdDate?: string;
  updatedAt: string;
  categoryId?: number;
}

export interface Ticket {
  id: number;
  ticketNumber?: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  categoryId: number;
  departmentId: number;
  categoryName?: string;
  departmentName?: string;
  location?: string | null;
  locationAddress?: string | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
  reporterPhone?: string | null;
  assignedAgentName?: string | null;
  createdByUserId: number;
  assignedAgentId: number | null;
  createdAt: string;
  updatedAt: string;
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
}

export interface Attachment {
  id: number;
  ticketId: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  description?: string | null;
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
}

export interface PagedTickets {
  items: TicketListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface TicketWorkflowAction {
  action?: string;
  name?: string;
  label?: string;
  status?: TicketStatus;
  toStatus?: TicketStatus;
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
  ticketId: number;
  senderUserId: number;
  senderName: string;
  body: string;
  sentAt: string;
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
