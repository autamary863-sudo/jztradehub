// src/components/sustainability/CarbonOffset.tsx
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaf, Tree, Droplet, Recycle } from 'lucide-react';
import { toast } from 'sonner';

const CarbonOffset = ({ orderAmount }: { orderAmount: number }) => {
  const [offsetEnabled, setOffsetEnabled] = useState(false);
  const offsetCost = Math.round(orderAmount * 0.01); // 1% of order for carbon offset

  const enableOffset = () => {
    setOffsetEnabled(true);
    toast.success(`₦${offsetCost} added for tree planting!`);
  };

  return (
    <Card className="bg-green-500/5 border-green-500/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Leaf className="w-5 h-5 text-green-500" />
          <span className="font-semibold">Make Your Order Carbon Neutral</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Add ₦{offsetCost.toLocaleString()} to plant 1 tree and offset your carbon footprint
        </p>
        <div className="flex items-center gap-3">
          <Button variant={offsetEnabled ? "default" : "outline"} onClick={enableOffset} className="gap-2">
            <Tree className="w-4 h-4" />
            {offsetEnabled ? "Offset Added" : "Add Carbon Offset"}
          </Button>
          {offsetEnabled && <span className="text-xs text-green-600">✓ Tree will be planted</span>}
        </div>
      </CardContent>
    </Card>
  );
};

// Eco-Friendly Badge Component
const EcoBadge = ({ productId }: { productId: string }) => {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-xs">
      <Recycle className="w-3 h-3" />
      <span>Eco-Friendly</span>
    </div>
  );
};