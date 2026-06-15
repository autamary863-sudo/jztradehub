// src/components/ReferralSystem.tsx (Fixed Version)
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Gift, Copy, Users, TrendingUp, CheckCircle, Clock, 
  Share2, Facebook, Twitter, Mail, Link, Award, Crown,
  Loader2, RefreshCw, Wallet, DollarSign, UserPlus
} from "lucide-react";

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  referralCode: string;
}

interface Referral {
  id: string;
  referral_code: string;
  status: string;
  created_at: string;
  referee: {
    id: string;
    display_name: string;
    email: string;
  };
}

interface Earning {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  credited_at: string;
  order_id: string;
}

const ReferralSystem = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    completedReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    referralCode: "",
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    setLoading(true);
    try {
      // Get user's profile with referral code
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("referral_code, total_referrals, total_referral_earnings")
        .eq("id", user?.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Profile fetch error:", profileError);
      }

      // Get referrals (users referred by this user)
      const { data: referralsData, error: referralsError } = await supabase
        .from("referrals")
        .select(`
          id,
          referral_code,
          status,
          created_at,
          referee:profiles!referrals_referee_id_fkey (
            id,
            display_name,
            email
          )
        `)
        .eq("referrer_id", user?.id)
        .order("created_at", { ascending: false });

      if (referralsError) {
        console.error("Referrals fetch error:", referralsError);
      }

      // Get earnings from referral_earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from("referral_earnings")
        .select(`
          id,
          amount,
          status,
          created_at,
          credited_at,
          order_id
        `)
        .in("referral_id", (referralsData || []).map(r => r.id));

      if (earningsError) {
        console.error("Earnings fetch error:", earningsError);
      }

      // Generate referral code if missing
      let referralCode = profile?.referral_code;
      if (!referralCode && user) {
        const newCode = generateReferralCode();
        await supabase
          .from("profiles")
          .update({ referral_code: newCode })
          .eq("id", user.id);
        referralCode = newCode;
      }

      const totalEarnings = earningsData?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const pendingEarnings = earningsData?.filter(e => e.status === "pending").reduce((sum, e) => sum + e.amount, 0) || 0;

      setStats({
        referralCode: referralCode || "",
        totalReferrals: referralsData?.length || 0,
        completedReferrals: referralsData?.filter(r => r.status === "completed").length || 0,
        totalEarnings: totalEarnings,
        pendingEarnings: pendingEarnings,
      });

      setReferrals(referralsData as unknown as Referral[] || []);
      setEarnings(earningsData as Earning[] || []);

    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast.error("Failed to load referral data");
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = () => {
    const prefix = user?.id?.slice(0, 4).toUpperCase() || "USER";
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/auth?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnFacebook = () => {
    const url = `${window.location.origin}/auth?ref=${stats.referralCode}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnTwitter = () => {
    const text = `Join me on JZTradeHub! Use my referral link to get started:`;
    const url = `${window.location.origin}/auth?ref=${stats.referralCode}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareByEmail = () => {
    const subject = "Join me on JZTradeHub";
    const body = `Hi,\n\nI've been using JZTradeHub and I think you'll love it! Sign up using my referral link:\n\n${window.location.origin}/auth?ref=${stats.referralCode}\n\nCheers!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Gift className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
            <p className="mt-4 text-muted-foreground">Loading referral system...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="glass-strong bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-accent mb-6 shadow-lg">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Refer & Earn!</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Invite your friends to join JZTradeHub and earn rewards when they make their first purchase!
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="flex items-center gap-2 bg-primary/20 rounded-full px-4 py-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">1 Referral = ₦1,000</span>
              </div>
              <div className="flex items-center gap-2 bg-green-500/20 rounded-full px-4 py-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Unlimited Earnings</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-strong">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Code</p>
                <p className="text-xl font-bold font-mono text-primary">{stats.referralCode || "Loading..."}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={copyReferralLink} className="h-8">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold text-primary">{stats.totalReferrals}</p>
              </div>
              <Users className="w-8 h-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedReferrals}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-accent">₦{stats.totalEarnings.toLocaleString()}</p>
              </div>
              <Wallet className="w-8 h-8 text-accent/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link Section */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-primary" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              value={`${window.location.origin}/auth?ref=${stats.referralCode}`}
              readOnly
              className="flex-1 font-mono text-sm"
            />
            <Button onClick={copyReferralLink} className="gap-2">
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" size="sm" onClick={shareOnFacebook} className="gap-2">
              <Facebook className="w-4 h-4" />
              Facebook
            </Button>
            <Button variant="outline" size="sm" onClick={shareOnTwitter} className="gap-2">
              <Twitter className="w-4 h-4" />
              Twitter
            </Button>
            <Button variant="outline" size="sm" onClick={shareByEmail} className="gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Share this link with friends. You'll earn ₦1,000 when they make their first purchase!
          </p>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-strong w-full">
          <TabsTrigger value="overview" className="flex-1 gap-2">
            <TrendingUp className="w-4 h-4" />
            How It Works
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex-1 gap-2">
            <Users className="w-4 h-4" />
            My Referrals ({referrals.length})
          </TabsTrigger>
          <TabsTrigger value="earnings" className="flex-1 gap-2">
            <Wallet className="w-4 h-4" />
            Earnings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>How Referrals Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">1</div>
                <div>
                  <p className="font-semibold">Share Your Link</p>
                  <p className="text-sm text-muted-foreground">Share your unique referral link with friends</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">2</div>
                <div>
                  <p className="font-semibold">Friend Signs Up</p>
                  <p className="text-sm text-muted-foreground">They create an account using your referral link</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
                <div>
                  <p className="font-semibold">They Make a Purchase</p>
                  <p className="text-sm text-muted-foreground">When they complete their first order, you earn ₦1,000</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">4</div>
                <div>
                  <p className="font-semibold">Get Rewarded</p>
                  <p className="text-sm text-muted-foreground">Your earnings are added to your wallet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>My Referrals ({referrals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No referrals yet</p>
                  <p className="text-sm mt-1">Share your referral link to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {referrals.map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between p-4 rounded-lg border border-white/10">
                      <div>
                        <p className="font-medium">{referral.referee?.display_name || "New User"}</p>
                        <p className="text-sm text-muted-foreground">{referral.referee?.email}</p>
                        <p className="text-xs text-muted-foreground">Joined: {new Date(referral.created_at).toLocaleDateString()}</p>
                      </div>
                      {getStatusBadge(referral.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Earnings History</CardTitle>
            </CardHeader>
            <CardContent>
              {earnings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No earnings yet</p>
                  <p className="text-sm mt-1">Refer friends to start earning</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {earnings.map((earning) => (
                    <div key={earning.id} className="flex items-center justify-between p-4 rounded-lg border border-white/10">
                      <div>
                        <p className="font-bold text-primary text-lg">₦{earning.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{new Date(earning.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge className={earning.status === "credited" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}>
                        {earning.status === "credited" ? "Credited" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReferralSystem;