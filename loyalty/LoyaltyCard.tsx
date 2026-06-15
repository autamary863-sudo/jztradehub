// src/components/loyalty/LoyaltyCard.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Crown, Gift, TrendingUp, Users } from 'lucide-react';

const tiers = [
  { name: 'Bronze', minSpend: 0, color: '#cd7f32', benefits: ['1% cashback', 'Basic support'] },
  { name: 'Silver', minSpend: 50000, color: '#c0c0c0', benefits: ['2% cashback', 'Priority support', 'Free shipping'] },
  { name: 'Gold', minSpend: 200000, color: '#ffd700', benefits: ['3% cashback', '24/7 VIP support', 'Free shipping', 'Birthday gift'] },
  { name: 'Platinum', minSpend: 500000, color: '#e5e4e2', benefits: ['5% cashback', 'Dedicated account manager', 'Free express shipping', 'Exclusive deals'] }
];

const LoyaltyCard = ({ userId }: { userId: string }) => {
  const [userPoints, setUserPoints] = useState({ points: 0, tier: 'bronze', totalSpent: 0 });
  const [nextTier, setNextTier] = useState(null);

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const fetchLoyaltyData = async () => {
    const response = await fetch(`/api/loyalty/${userId}`);
    const data = await response.json();
    setUserPoints(data);
    
    const currentTierIndex = tiers.findIndex(t => t.name.toLowerCase() === data.tier);
    if (currentTierIndex < tiers.length - 1) {
      setNextTier(tiers[currentTierIndex + 1]);
    }
  };

  const progressToNextTier = nextTier ? (userPoints.totalSpent / nextTier.minSpend) * 100 : 100;

  return (
    <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          Loyalty Program
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary">{userPoints.points.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground">Loyalty Points</p>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium capitalize">{userPoints.tier}</span>
          {nextTier && <span className="text-sm font-medium capitalize">{nextTier.name}</span>}
        </div>
        <Progress value={progressToNextTier} className="h-2" />
        
        {nextTier && (
          <p className="text-xs text-muted-foreground text-center">
            Spend ₦{(nextTier.minSpend - userPoints.totalSpent).toLocaleString()} more to reach {nextTier.name}
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="text-center p-2 rounded-lg bg-primary/5">
            <Gift className="w-4 h-4 mx-auto mb-1" />
            <p className="text-xs">Redeem Points</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/5">
            <TrendingUp className="w-4 h-4 mx-auto mb-1" />
            <p className="text-xs">Earn More</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/5 col-span-2">
            <Users className="w-4 h-4 mx-auto mb-1" />
            <p className="text-xs">Refer & Earn 500 points</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};