// src/App.tsx
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MaintenanceMode from "@/components/MaintenanceMode";
import LoadingSpinner from "@/components/LoadingSpinner";

// Eager load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import UserProfile from "./pages/UserProfile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import WalletDepositSuccess from './pages/WalletDepositSuccess';
import Wallet from "./pages/Wallet";

// Lazy load non-critical pages
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const BuyerDashboard = lazy(() => import("./pages/BuyerDashboard"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const BecomeSellerPage = lazy(() => import("./pages/BecomeSellerPage"));
const ProductManagement = lazy(() => import("./pages/ProductManagement"));
const ProductEdit = lazy(() => import("./pages/ProductEdit"));  // ADD THIS
const Disputes = lazy(() => import("./pages/Disputes"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Cart = lazy(() => import("./pages/Cart"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute"));
const LiveChat = lazy(() => import("./components/LiveChat"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <LoadingSpinner size="lg" />
  </div>
);

// Email Confirmation Handler Component
const EmailConfirmationHandler = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      if (location.hash && location.hash.includes('access_token')) {
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('Email confirmation detected:', { type, hasToken: !!accessToken });

        if (accessToken && refreshToken && type === 'signup') {
          try {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Error setting session:', error);
              toast.error('Email verification failed. Please try again.');
              navigate('/auth');
            } else {
              toast.success('Email verified successfully! You are now logged in.');
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { data: roles } = await supabase
                  .from('user_roles')
                  .select('role')
                  .eq('user_id', user.id);
                
                if (roles?.some(r => r.role === 'admin')) {
                  navigate('/admin');
                } else if (roles?.some(r => r.role === 'seller')) {
                  navigate('/seller');
                } else {
                  navigate('/');
                }
              } else {
                navigate('/');
              }
            }
          } catch (error) {
            console.error('Confirmation error:', error);
            toast.error('Failed to verify email. Please try again.');
            navigate('/auth');
          }
        }
      }
    };

    handleEmailConfirmation();
  }, [location, navigate]);

  return <>{children}</>;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner richColors position="top-right" />
        <BrowserRouter>
          <EmailConfirmationHandler>
            <MaintenanceMode>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/become-seller" element={<BecomeSellerPage />} />
                  <Route path="/checkout/:productId" element={<Checkout />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/wallet/deposit-success" element={<WalletDepositSuccess />} />
                  <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
                  
                  {/* Protected Routes */}
                  <Route path="/order/:orderId" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin/*" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
                  
                  {/* Seller Routes */}
                  <Route path="/seller" element={<ProtectedRoute requiredRole="seller"><SellerDashboard /></ProtectedRoute>} />
                  <Route path="/products" element={<ProtectedRoute requiredRole="seller"><ProductManagement /></ProtectedRoute>} />
                  <Route path="/products/edit/:productId" element={<ProtectedRoute requiredRole="seller"><ProductEdit /></ProtectedRoute>} />
                  <Route path="/products/new" element={<ProtectedRoute requiredRole="seller"><ProductEdit /></ProtectedRoute>} />
                  
                  {/* Buyer Routes */}
                  <Route path="/buyer" element={<ProtectedRoute><BuyerDashboard /></ProtectedRoute>} />
                  <Route path="/disputes" element={<ProtectedRoute><Disputes /></ProtectedRoute>} />
                  <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
                  
                  {/* 404 - Catch all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <LiveChat />
              </Suspense>
            </MaintenanceMode>
          </EmailConfirmationHandler>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;