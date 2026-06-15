// src/components/buyer/PriceDropAlert.tsx
import { useState } from 'react';
import { Bell, BellOff, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const PriceDropAlert = ({ productId, currentPrice }: { productId: string; currentPrice: number }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [targetPrice, setTargetPrice] = useState(currentPrice * 0.8);
  const [email, setEmail] = useState('');

  const subscribe = async () => {
    const response = await fetch('/api/price-alert/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, targetPrice, email })
    });
    if (response.ok) {
      setIsSubscribed(true);
      toast.success('We will notify you when price drops!');
    }
  };

  return (
    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        {isSubscribed ? <Bell className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
        <span className="font-semibold">Price Drop Alert</span>
      </div>
      {!isSubscribed ? (
        <div className="space-y-3">
          <p className="text-sm">Notify me when price drops below ₦{targetPrice.toLocaleString()}</p>
          <div className="flex gap-2">
            <Input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button onClick={subscribe}>Subscribe</Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-green-600">You will be notified when price drops!</p>
      )}
    </div>
  );
};

// Product Comparison Component
const ProductComparison = ({ products }: { products: any[] }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-3 bg-muted">Features</th>
            {products.map(product => (
              <th key={product.id} className="p-3 bg-muted">{product.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr><td className="p-3 border">Price</td>{products.map(p => <td key={p.id} className="p-3 border">₦{p.price.toLocaleString()}</td>)}</tr>
          <tr><td className="p-3 border">Brand</td>{products.map(p => <td key={p.id} className="p-3 border">{p.brand}</td>)}</tr>
          <tr><td className="p-3 border">Rating</td>{products.map(p => <td key={p.id} className="p-3 border">{p.rating} ⭐</td>)}</tr>
          <tr><td className="p-3 border">Stock</td>{products.map(p => <td key={p.id} className="p-3 border">{p.stock} left</td>)}</tr>
        </tbody>
      </table>
    </div>
  );
};