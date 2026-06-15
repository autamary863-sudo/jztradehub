// src/services/notificationService.ts
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'promo';
  is_global: boolean;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  action_link: string | null;
  action_text: string | null;
  image_url: string | null;
  created_at: string;
}

export interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  content: string;
  type: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

class NotificationService {
  // Get all active notifications (no user-specific)
  async getActiveNotifications(): Promise<Notification[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", now)
        .gte("ends_at", now)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error("Error in getActiveNotifications:", error);
      return [];
    }
  }

  // Get unread notifications for a user - with better error handling
  async getUserUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      // First check if tables exist by trying a simple query
      const { error: tableCheck } = await supabase
        .from("user_notifications")
        .select("id")
        .limit(1);
      
      // If table doesn't exist, return empty array
      if (tableCheck && tableCheck.code === '42P01') {
        console.log("User notifications table not yet created - skipping");
        return [];
      }
      
      // If there's a different error, log it but don't break
      if (tableCheck) {
        console.warn("User notifications query warning:", tableCheck.message);
      }
      
      const { data, error } = await supabase
        .from("user_notifications")
        .select("notification_id")
        .eq("user_id", userId)
        .eq("is_read", false);
      
      if (error) {
        // If table doesn't exist or other error, return empty
        if (error.code === '42P01') {
          return [];
        }
        console.error("Error fetching user notifications:", error);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      const notificationIds = data.map(n => n.notification_id);
      
      const { data: notifications, error: notifError } = await supabase
        .from("notifications")
        .select("*")
        .in("id", notificationIds);
      
      if (notifError) {
        console.error("Error fetching notification details:", notifError);
        return [];
      }
      
      return notifications || [];
    } catch (error) {
      console.error("Error in getUserUnreadNotifications:", error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("notification_id", notificationId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error marking notification as read:", error);
      }
    } catch (error) {
      console.error("Error in markAsRead:", error);
    }
  }

  // Create notification (Admin only)
  async createNotification(
    notification: Omit<Notification, "id" | "created_at">,
    userId: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      // Insert notification first
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          ...notification,
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      // If global notification, create entries for all users
      if (notification.is_global) {
        await this.createUserNotificationEntries(data.id);
      }

      return { success: true, id: data.id };
    } catch (error: any) {
      console.error("Error creating notification:", error);
      return { success: false, error: error.message };
    }
  }

  // Create user notification entries for all users
  private async createUserNotificationEntries(notificationId: string): Promise<void> {
    try {
      const { data: users, error } = await supabase
        .from("profiles")
        .select("id");

      if (error || !users) return;

      const entries = users.map(user => ({
        notification_id: notificationId,
        user_id: user.id,
        is_read: false
      }));

      // Insert in batches to avoid large payloads
      const batchSize = 100;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        await supabase.from("user_notifications").insert(batch);
      }
    } catch (error) {
      console.error("Error creating user notification entries:", error);
    }
  }

  // Send email (simplified)
  async sendEmail(params: {
    to: string;
    subject: string;
    content: string;
    type: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch("http://localhost:5000/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: params.to,
          subject: params.subject,
          html: this.formatEmailTemplate(params.subject, params.content)
        })
      });

      const result = await response.json();
      return { success: result.success };
    } catch (error: any) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }
  }

  // Format email template
  private formatEmailTemplate(title: string, content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6, #10b981); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .content p { line-height: 1.6; color: #333; }
          .footer { text-align: center; padding: 20px; background: #f8f9fa; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>JZTradeHub</h1>
            <p>${title}</p>
          </div>
          <div class="content">
            ${content.split('\n').map(p => `<p>${p}</p>`).join('')}
          </div>
          <div class="footer">
            <p>JZTradeHub - Secure Escrow Marketplace</p>
            <p>&copy; ${new Date().getFullYear()} JZTradeHub. All rights reserved.</p>
          </div>
        </div>
      </html>
    `;
  }

  // Get email logs (Admin only)
  async getEmailLogs(limit: number = 100): Promise<EmailLog[]> {
    try {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching email logs:", error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error("Error in getEmailLogs:", error);
      return [];
    }
  }
}

export const notificationService = new NotificationService();