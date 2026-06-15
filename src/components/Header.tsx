import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";
// Add to Header.tsx - inside the desktop navigation
import NotificationBell from "@/components/NotificationBell";

// Add after ThemeToggle or before user menu
<NotificationBell />
import { 
  LogOut, 
  User, 
  Shield, 
  Store, 
  Menu, 
  ShoppingCart, 
  Home, 
  Package, 
  Wallet as WalletIcon,
  Settings,
  Heart,
  Star
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ThemeToggle from "@/components/ThemeToggle";

const Header = () => {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
    setMobileMenuOpen(false);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const isAdmin = roles.includes("admin");
  const isSeller = roles.includes("seller");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 glass-strong">
      <div className="container px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-strong">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-lg sm:text-xl text-white">
              JZ
            </div>
            <span className="text-xl sm:text-2xl font-bold gradient-text">TradeHub</span>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          {user && (
            <>
              <Button variant="ghost" onClick={() => navigate("/cart")} className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                Cart
              </Button>
              <Button variant="ghost" onClick={() => navigate("/buyer")} className="gap-2">
                <Package className="w-4 h-4" />
                My Orders
              </Button>
              <Button variant="ghost" onClick={() => navigate("/wallet")} className="gap-2">
                <WalletIcon className="w-4 h-4" />
                Wallet
              </Button>
            </>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="glass">
                  <User className="w-4 h-4 mr-2" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-strong w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {roles.join(", ")}
                  </p>
                </div>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => handleNavigate("/profile")}>
                  <User className="w-4 h-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => handleNavigate("/wallet")}>
                  <WalletIcon className="w-4 h-4 mr-2" />
                  My Wallet
                </DropdownMenuItem>
                
                {isAdmin && (
                  <DropdownMenuItem onClick={() => handleNavigate("/admin")}>
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
                {isSeller && (
                  <DropdownMenuItem onClick={() => handleNavigate("/seller")}>
                    <Store className="w-4 h-4 mr-2" />
                    Seller Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : loading ? (
            <div className="w-20 h-9 rounded-md glass animate-pulse" />
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => navigate("/auth")}
                className="glass"
              >
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")}>Get Started</Button>
            </>
          )}
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="glass">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="glass-strong w-72">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {user ? (
                  <>
                    <div className="px-2 py-3 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {roles.join(", ")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate("/profile")}
                      >
                        <User className="w-4 h-4 mr-3" />
                        My Profile
                      </Button>
                      
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate("/wallet")}
                      >
                        <WalletIcon className="w-4 h-4 mr-3" />
                        My Wallet
                      </Button>
                      
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleNavigate("/admin")}
                        >
                          <Shield className="w-4 h-4 mr-3" />
                          Admin Dashboard
                        </Button>
                      )}
                      {isSeller && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleNavigate("/seller")}
                        >
                          <Store className="w-4 h-4 mr-3" />
                          Seller Dashboard
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate("/cart")}
                      >
                        <ShoppingCart className="w-4 h-4 mr-3" />
                        Cart
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate("/buyer")}
                      >
                        <Package className="w-4 h-4 mr-3" />
                        My Orders
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigate("/")}
                      >
                        <Home className="w-4 h-4 mr-3" />
                        Home
                      </Button>
                    </div>
                    <div className="pt-4 border-t">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-destructive hover:text-destructive"
                        onClick={handleSignOut}
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        Sign Out
                      </Button>
                    </div>
                  </>
                ) : loading ? (
                  <div className="space-y-3">
                    <div className="w-full h-10 rounded-md glass animate-pulse" />
                    <div className="w-full h-10 rounded-md glass animate-pulse" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full glass"
                      onClick={() => handleNavigate("/auth")}
                    >
                      Sign In
                    </Button>
                    <Button
                      className="w-full"
                      onClick={() => handleNavigate("/auth")}
                    >
                      Get Started
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;