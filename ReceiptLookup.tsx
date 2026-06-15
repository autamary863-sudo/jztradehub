import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, Mail } from 'lucide-react';
import { toast } from 'sonner';
import Receipt from './Receipt';

const API_URL = "http://localhost:5000";

const ReceiptLookup = () => {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [email, setEmail] = useState('');

  const lookupReceipt = async () => {
    if (!orderId.trim()) {
      toast.error("Please enter an Order ID");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/receipt/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setReceipt(data.receipt);
        toast.success("Receipt found!");
      } else {
        toast.error(data.message || "Receipt not found");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch receipt");
    } finally {
      setLoading(false);
    }
  };

  const emailReceipt = async () => {
    if (!email) {
      toast.error("Please enter email address");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/resend-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, email })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Receipt sent to your email!");
      } else {
        toast.error(data.message || "Failed to send receipt");
      }
    } catch (error) {
      toast.error("Failed to send receipt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-strong max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          View Your Receipt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Order ID</Label>
          <Input
            placeholder="Enter your order ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
        </div>
        
        <Button onClick={lookupReceipt} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          View Receipt
        </Button>
        
        {receipt && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-sm text-green-600">
                Receipt found! Total: ₦{receipt.total?.toLocaleString()}
              </p>
            </div>
            
            <div>
              <Label>Email Receipt</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button onClick={emailReceipt} variant="outline" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Send
                </Button>
              </div>
            </div>
            
            {receipt && <Receipt order={receipt} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptLookup;