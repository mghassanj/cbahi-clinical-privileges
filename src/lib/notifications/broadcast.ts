/**
 * CBAHI Real-time Notification Broadcast System
 *
 * In-memory store for managing SSE connections and broadcasting notifications
 * to connected clients in real-time.
 */

// ============================================================================
// Types
// ============================================================================

export type NotificationEventType =
  | "REQUEST_SUBMITTED"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "REQUEST_RETURNED"
  | "APPROVAL_REQUIRED"
  | "ESCALATION_WARNING"
  | "DOCUMENT_UPLOADED"
  | "COMMENT_ADDED"
  | "STATUS_CHANGED";

export interface BroadcastNotification {
  id: string;
  type: NotificationEventType;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  severity: "info" | "success" | "warning" | "error";
  requestId?: string;
  requestNumber?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface SSEClient {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController;
  createdAt: Date;
}

// ============================================================================
// In-Memory Store
// ============================================================================

// Store for connected SSE clients, keyed by user ID
const connectedClients = new Map<string, Set<SSEClient>>();

// Store for pending notifications (for users who might reconnect)
const pendingNotifications = new Map<string, BroadcastNotification[]>();

// Maximum pending notifications per user
const MAX_PENDING_NOTIFICATIONS = 50;

// ============================================================================
// Client Management
// ============================================================================

/**
 * Register a new SSE client connection
 */
export function registerClient(
  userId: string,
  controller: ReadableStreamDefaultController
): SSEClient {
  const client: SSEClient = {
    id: `${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    userId,
    controller,
    createdAt: new Date(),
  };

  if (!connectedClients.has(userId)) {
    connectedClients.set(userId, new Set());
  }

  connectedClients.get(userId)!.add(client);

  console.log(
    `[Broadcast] Client ${client.id} registered for user ${userId}. Total clients for user: ${connectedClients.get(userId)!.size}`
  );

  // Send any pending notifications
  const pending = pendingNotifications.get(userId);
  if (pending && pending.length > 0) {
    pending.forEach((notification) => {
      sendToClient(client, notification);
    });
    pendingNotifications.delete(userId);
    console.log(
      `[Broadcast] Sent ${pending.length} pending notifications to client ${client.id}`
    );
  }

  return client;
}

/**
 * Unregister an SSE client connection
 */
export function unregisterClient(client: SSEClient): void {
  const userClients = connectedClients.get(client.userId);
  if (userClients) {
    userClients.delete(client);
    console.log(
      `[Broadcast] Client ${client.id} unregistered. Remaining clients for user ${client.userId}: ${userClients.size}`
    );

    if (userClients.size === 0) {
      connectedClients.delete(client.userId);
    }
  }
}

/**
 * Check if a user has any connected clients
 */
export function isUserConnected(userId: string): boolean {
  const clients = connectedClients.get(userId);
  return clients !== undefined && clients.size > 0;
}

/**
 * Get the number of connected clients for a user
 */
export function getClientCount(userId: string): number {
  return connectedClients.get(userId)?.size || 0;
}

/**
 * Get total number of connected clients across all users
 */
export function getTotalClientCount(): number {
  let total = 0;
  connectedClients.forEach((clients) => {
    total += clients.size;
  });
  return total;
}

// ============================================================================
// Notification Sending
// ============================================================================

/**
 * Send a notification to a specific client
 */
function sendToClient(
  client: SSEClient,
  notification: BroadcastNotification
): boolean {
  try {
    const data = JSON.stringify(notification);
    const message = `event: notification\ndata: ${data}\n\n`;
    client.controller.enqueue(new TextEncoder().encode(message));
    return true;
  } catch (error) {
    console.error(
      `[Broadcast] Failed to send to client ${client.id}:`,
      error
    );
    // Client might be disconnected, remove it
    unregisterClient(client);
    return false;
  }
}

/**
 * Send a heartbeat/ping to keep the connection alive
 */
export function sendHeartbeat(client: SSEClient): boolean {
  try {
    const message = `:heartbeat ${new Date().toISOString()}\n\n`;
    client.controller.enqueue(new TextEncoder().encode(message));
    return true;
  } catch (error) {
    console.error(
      `[Broadcast] Failed to send heartbeat to client ${client.id}:`,
      error
    );
    unregisterClient(client);
    return false;
  }
}

/**
 * Broadcast a notification to a specific user
 */
export function broadcastToUser(
  userId: string,
  notification: Omit<BroadcastNotification, "id" | "timestamp">
): void {
  const fullNotification: BroadcastNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date(),
  };

  const userClients = connectedClients.get(userId);

  if (userClients && userClients.size > 0) {
    // User is connected, send immediately
    let sentCount = 0;
    userClients.forEach((client) => {
      if (sendToClient(client, fullNotification)) {
        sentCount++;
      }
    });
    console.log(
      `[Broadcast] Sent notification to ${sentCount} clients for user ${userId}`
    );
  } else {
    // User not connected, store for later
    if (!pendingNotifications.has(userId)) {
      pendingNotifications.set(userId, []);
    }

    const pending = pendingNotifications.get(userId)!;
    pending.push(fullNotification);

    // Trim old notifications if exceeding limit
    if (pending.length > MAX_PENDING_NOTIFICATIONS) {
      pending.shift();
    }

    console.log(
      `[Broadcast] User ${userId} not connected. Stored notification for later delivery. Pending: ${pending.length}`
    );
  }
}

/**
 * Broadcast a notification to multiple users
 */
export function broadcastToUsers(
  userIds: string[],
  notification: Omit<BroadcastNotification, "id" | "timestamp">
): void {
  userIds.forEach((userId) => {
    broadcastToUser(userId, notification);
  });
}

/**
 * Broadcast a notification to all connected clients
 */
export function broadcastToAll(
  notification: Omit<BroadcastNotification, "id" | "timestamp">
): void {
  const fullNotification: BroadcastNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date(),
  };

  let totalSent = 0;
  connectedClients.forEach((clients) => {
    clients.forEach((client) => {
      if (sendToClient(client, fullNotification)) {
        totalSent++;
      }
    });
  });

  console.log(`[Broadcast] Sent notification to ${totalSent} total clients`);
}

// ============================================================================
// Helper Functions for Common Notification Types
// ============================================================================

/**
 * Notify that a request needs approval
 */
export function notifyApprovalRequired(
  approverId: string,
  requestId: string,
  requestNumber: string,
  applicantName: string,
  applicantNameAr: string
): void {
  broadcastToUser(approverId, {
    type: "APPROVAL_REQUIRED",
    titleEn: "New Approval Request",
    titleAr: "طلب موافقة جديد",
    messageEn: `A privilege request from ${applicantName} requires your approval.`,
    messageAr: `طلب امتيازات من ${applicantNameAr} يتطلب موافقتك.`,
    severity: "info",
    requestId,
    requestNumber,
    actionUrl: `/requests/${requestId}`,
  });
}

/**
 * Notify that a request has been approved
 */
export function notifyRequestApproved(
  applicantId: string,
  requestId: string,
  requestNumber: string,
  approverName: string,
  approverNameAr: string,
  isFinalApproval: boolean
): void {
  broadcastToUser(applicantId, {
    type: isFinalApproval ? "REQUEST_APPROVED" : "STATUS_CHANGED",
    titleEn: isFinalApproval ? "Request Approved" : "Request Progress",
    titleAr: isFinalApproval ? "تمت الموافقة على الطلب" : "تقدم الطلب",
    messageEn: isFinalApproval
      ? `Your privilege request ${requestNumber} has been fully approved.`
      : `Your request ${requestNumber} has been approved by ${approverName} and moved to the next stage.`,
    messageAr: isFinalApproval
      ? `تمت الموافقة النهائية على طلب الامتيازات ${requestNumber}.`
      : `تمت الموافقة على طلبك ${requestNumber} من قبل ${approverNameAr} وانتقل إلى المرحلة التالية.`,
    severity: "success",
    requestId,
    requestNumber,
    actionUrl: `/requests/${requestId}`,
  });
}

/**
 * Notify that a request has been rejected
 */
export function notifyRequestRejected(
  applicantId: string,
  requestId: string,
  requestNumber: string,
  reason: string,
  reasonAr: string
): void {
  broadcastToUser(applicantId, {
    type: "REQUEST_REJECTED",
    titleEn: "Request Rejected",
    titleAr: "تم رفض الطلب",
    messageEn: `Your privilege request ${requestNumber} has been rejected. Reason: ${reason}`,
    messageAr: `تم رفض طلب الامتيازات ${requestNumber}. السبب: ${reasonAr}`,
    severity: "error",
    requestId,
    requestNumber,
    actionUrl: `/requests/${requestId}`,
  });
}

/**
 * Notify that modifications are requested
 */
export function notifyModificationsRequested(
  applicantId: string,
  requestId: string,
  requestNumber: string,
  comments: string,
  commentsAr: string
): void {
  broadcastToUser(applicantId, {
    type: "REQUEST_RETURNED",
    titleEn: "Modifications Requested",
    titleAr: "مطلوب تعديلات",
    messageEn: `Your request ${requestNumber} requires modifications: ${comments}`,
    messageAr: `طلبك ${requestNumber} يتطلب تعديلات: ${commentsAr}`,
    severity: "warning",
    requestId,
    requestNumber,
    actionUrl: `/requests/${requestId}/edit`,
  });
}

/**
 * Notify about escalation warning
 */
export function notifyEscalationWarning(
  approverId: string,
  requestId: string,
  requestNumber: string,
  hoursPending: number
): void {
  broadcastToUser(approverId, {
    type: "ESCALATION_WARNING",
    titleEn: "Pending Approval Reminder",
    titleAr: "تذكير بموافقة معلقة",
    messageEn: `Request ${requestNumber} has been pending your approval for ${hoursPending} hours. Please review it soon to avoid escalation.`,
    messageAr: `الطلب ${requestNumber} معلق بانتظار موافقتك منذ ${hoursPending} ساعة. يرجى مراجعته قريباً لتجنب التصعيد.`,
    severity: "warning",
    requestId,
    requestNumber,
    actionUrl: `/requests/${requestId}`,
  });
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Clear all pending notifications for a user
 */
export function clearPendingNotifications(userId: string): void {
  pendingNotifications.delete(userId);
}

/**
 * Get statistics about the notification system
 */
export function getStats(): {
  connectedUsers: number;
  totalClients: number;
  usersWithPending: number;
  totalPendingNotifications: number;
} {
  let totalPendingNotifications = 0;
  pendingNotifications.forEach((notifications) => {
    totalPendingNotifications += notifications.length;
  });

  return {
    connectedUsers: connectedClients.size,
    totalClients: getTotalClientCount(),
    usersWithPending: pendingNotifications.size,
    totalPendingNotifications,
  };
}

const broadcastService = {
  registerClient,
  unregisterClient,
  isUserConnected,
  getClientCount,
  getTotalClientCount,
  sendHeartbeat,
  broadcastToUser,
  broadcastToUsers,
  broadcastToAll,
  notifyApprovalRequired,
  notifyRequestApproved,
  notifyRequestRejected,
  notifyModificationsRequested,
  notifyEscalationWarning,
  clearPendingNotifications,
  getStats,
};

export default broadcastService;
