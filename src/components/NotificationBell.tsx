// src/components/NotificationBell.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { notificationService, Notification } from "@/services/notificationService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  Info,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Gift,
  X,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "success": return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "warning": return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case "error": return <AlertCircle className="w-5 h-5 text-red-500" />;
    case "promo": return <Gift className="w-5 h-5 text-pink-500" />;
    default: return <Info className="w-5 h-5 text-blue-500" />;
  }
};

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    const data = await notificationService.getUserUnreadNotifications(user!.id);
    setNotifications(data);
    setUnreadCount(data.length);
  };

  const markAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId, user!.id);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => prev - 1);
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 max-h-[500px] overflow-hidden" align="end">
        <div className="p-3 border-b bg-muted/30">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-xs text-muted-foreground">Stay updated with the latest news</p>
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No new notifications</p>
              <p className="text-xs mt-1">Check back later for updates</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-3 hover:bg-muted/50 transition-colors group cursor-pointer"
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{notification.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    {notification.action_link && (
                      <a
                        href={notification.action_link}
                        className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {notification.action_text || "Learn More"}
                        <ChevronRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-2 border-t bg-muted/30 text-center">
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => {
                notifications.forEach(n => markAsRead(n.id));
              }}
            >
              Mark all as read
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;