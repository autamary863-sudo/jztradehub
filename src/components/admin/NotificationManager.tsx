// src/components/admin/NotificationManager.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { notificationService, Notification, EmailLog } from "@/services/notificationService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Bell,
  Mail,
  Send,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";

const notificationTypes = [
  { value: "info", label: "Info", color: "text-blue-500", bg: "bg-blue-500/10" },
  { value: "success", label: "Success", color: "text-green-500", bg: "bg-green-500/10" },
  { value: "warning", label: "Warning", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { value: "error", label: "Error", color: "text-red-500", bg: "bg-red-500/10" },
  { value: "promo", label: "Promotion", color: "text-pink-500", bg: "bg-pink-500/10" }
];

const NotificationManager = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [activeTab, setActiveTab] = useState("notifications");
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
    is_global: true,
    is_active: true,
    starts_at: "",
    ends_at: "",
    action_link: "",
    action_text: "",
    image_url: "",
  });

  useEffect(() => {
    fetchNotifications();
    fetchEmailLogs();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const fetchEmailLogs = async () => {
    const logs = await notificationService.getEmailLogs(50);
    setEmailLogs(logs);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.message) {
      toast.error("Please fill in title and message");
      return;
    }

    setLoading(true);
    try {
      const result = await notificationService.createNotification(formData, user!.id);
      if (result.success) {
        toast.success(editingNotification ? "Notification updated!" : "Notification created!");
        setDialogOpen(false);
        resetForm();
        fetchNotifications();
      } else {
        toast.error(result.error || "Failed to save notification");
      }
    } catch (error) {
      toast.error("Failed to save notification");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      type: "info",
      is_global: true,
      is_active: true,
      starts_at: "",
      ends_at: "",
      action_link: "",
      action_text: "",
      image_url: "",
    });
    setEditingNotification(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;

    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete notification");
    } else {
      toast.success("Notification deleted");
      fetchNotifications();
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Notification ${!currentStatus ? "activated" : "deactivated"}`);
      fetchNotifications();
    }
  };

  const getStatusBadge = (notification: Notification) => {
    const now = new Date();
    const startsAt = notification.starts_at ? new Date(notification.starts_at) : null;
    const endsAt = notification.ends_at ? new Date(notification.ends_at) : null;
    const isExpired = endsAt && endsAt < now;
    const isFuture = startsAt && startsAt > now;

    if (!notification.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (isFuture) {
      return <Badge className="bg-yellow-500/20 text-yellow-600">Scheduled</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-600">Active</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const t = notificationTypes.find(t => t.value === type);
    return (
      <Badge className={`${t?.bg} ${t?.color} border-0`}>
        {t?.label}
      </Badge>
    );
  };

  const getEmailStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500/20 text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Sent</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-600"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Notification Manager
            </CardTitle>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Notification
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="email-logs" className="gap-2">
                <Mail className="w-4 h-4" />
                Email Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notifications">
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No notifications yet</p>
                  <p className="text-sm">Create your first notification to engage users</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 rounded-lg border hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h3 className="font-semibold text-lg">{notification.title}</h3>
                            {getTypeBadge(notification.type)}
                            {getStatusBadge(notification)}
                          </div>
                          <p className="text-muted-foreground text-sm mb-2">
                            {notification.message}
                          </p>
                          {notification.action_link && (
                            <a
                              href={notification.action_link}
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {notification.action_text || "Learn More"}
                            </a>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span>Created: {new Date(notification.created_at).toLocaleString()}</span>
                            {notification.ends_at && (
                              <span>Expires: {new Date(notification.ends_at).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleActive(notification.id, notification.is_active)}
                          >
                            {notification.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(notification.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="email-logs">
              {emailLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No emails sent yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {log.recipient_email}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {log.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.type}</Badge>
                          </TableCell>
                          <TableCell>
                            {getEmailStatusBadge(log.status)}
                            {log.error_message && (
                              <p className="text-xs text-red-500 mt-1 truncate max-w-[150px]">
                                {log.error_message}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                            {log.sent_at && (
                              <p className="text-xs">Sent: {new Date(log.sent_at).toLocaleString()}</p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNotification ? "Edit Notification" : "Create Notification"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Notification title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                placeholder="Notification message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Action Link (Optional)</Label>
                <Input
                  placeholder="/marketplace"
                  value={formData.action_link}
                  onChange={(e) => setFormData({ ...formData, action_link: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Action Button Text</Label>
              <Input
                placeholder="Learn More"
                value={formData.action_text}
                onChange={(e) => setFormData({ ...formData, action_text: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Image URL (Optional)</Label>
              <Input
                placeholder="https://..."
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Global Notification</Label>
                <p className="text-xs text-muted-foreground">Send to all users</p>
              </div>
              <Switch
                checked={formData.is_global}
                onCheckedChange={(checked) => setFormData({ ...formData, is_global: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Show this notification immediately</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {editingNotification ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationManager;