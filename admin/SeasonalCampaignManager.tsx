// src/components/admin/SeasonalCampaignManager.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Gift, Snowflake, Sun, Moon, Zap } from 'lucide-react';

const campaigns = [
  { id: 'black_friday', name: 'Black Friday', icon: Zap, color: 'bg-purple-500', date: 'Nov 29' },
  { id: 'christmas', name: 'Christmas', icon: Gift, color: 'bg-red-500', date: 'Dec 25' },
  { id: 'summer_sale', name: 'Summer Sale', icon: Sun, color: 'bg-yellow-500', date: 'Jun 21' },
  { id: 'ramadan', name: 'Ramadan Kareem', icon: Moon, color: 'bg-indigo-500', date: 'Mar 10' }
];

interface DiscountConfig {
  global?: string;
  freeShippingThreshold?: string;
}

const SeasonalCampaignManager = () => {
  const [activeCampaign, setActiveCampaign] = useState<string | null>(null);
  const [discounts, setDiscounts] = useState<DiscountConfig>({});

  const activateCampaign = async (campaignId: string) => {
    const response = await fetch('/api/admin/campaigns/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, discounts })
    });
    if (response.ok) {
      toast.success(`${campaignId} campaign activated!`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Seasonal Campaigns</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {campaigns.map(campaign => {
          const Icon = campaign.icon;
          return (
            <Card key={campaign.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setActiveCampaign(campaign.id)}>
              <CardContent className="p-4 text-center">
                <div className={`w-12 h-12 rounded-full ${campaign.color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className="font-semibold">{campaign.name}</p>
                <p className="text-xs text-muted-foreground">{campaign.date}</p>
                <Calendar className="w-3 h-3 mx-auto mt-1 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeCampaign && (
        <Card>
          <CardHeader>
            <CardTitle>Configure {activeCampaign} Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Global Discount (%)</label>
              <Input type="number" value={discounts.global || ''} onChange={(e) => setDiscounts({ ...discounts, global: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Free Shipping Threshold (₦)</label>
              <Input type="number" value={discounts.freeShippingThreshold || ''} onChange={(e) => setDiscounts({ ...discounts, freeShippingThreshold: e.target.value })} />
            </div>
            <Button onClick={() => activateCampaign(activeCampaign)} className="w-full">Activate Campaign</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};