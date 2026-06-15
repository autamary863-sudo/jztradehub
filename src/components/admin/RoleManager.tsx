import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, UserPlus, Search } from "lucide-react";

const RoleManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [role, setRole] = useState<"buyer" | "seller" | "admin">("buyer");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .ilike("display_name", `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No users found");
        setSearchResults([]);
      } else {
        setSearchResults(data);
      }
    } catch (error) {
      toast.error("Failed to search users");
    } finally {
      setIsLoading(false);
    }
  };

  const selectUser = (userId: string, displayName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(displayName || "Unknown");
    setSearchResults([]);
    setSearchTerm("");
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      toast.error("Please select a user first");
      return;
    }

    setIsLoading(true);

    try {
      // Use the secure admin function
      const { data, error } = await supabase.rpc('admin_assign_role', {
        _target_user_id: selectedUserId,
        _role: role
      });

      if (error) {
        if (error.message.includes("Unauthorized")) {
          toast.error("You don't have permission to assign roles");
        } else if (error.message.includes("not found")) {
          toast.error("User not found");
        } else {
          toast.error("Failed to assign role");
        }
      } else {
        toast.success(`Successfully assigned ${role} role to ${selectedUserName}`);
        setSelectedUserId("");
        setSelectedUserName("");
        setRole("buyer");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-strong">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Role Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAssignRole} className="space-y-4">
          <div className="space-y-2">
            <Label>Search User by Display Name</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search by display name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass"
              />
              <Button type="button" variant="outline" onClick={handleSearch} disabled={isLoading}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="glass rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectUser(user.id, user.display_name)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-primary/10 transition-colors"
                >
                  {user.display_name || "Unnamed User"} <span className="text-xs text-muted-foreground">({user.id.slice(0, 8)}...)</span>
                </button>
              ))}
            </div>
          )}

          {selectedUserId && (
            <div className="glass p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Selected User:</p>
              <p className="font-medium">{selectedUserName}</p>
              <p className="text-xs text-muted-foreground">{selectedUserId}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger className="glass">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">Buyer</SelectItem>
                <SelectItem value="seller">Seller</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !selectedUserId}>
            <UserPlus className="w-4 h-4 mr-2" />
            {isLoading ? "Assigning..." : "Assign Role"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RoleManager;
