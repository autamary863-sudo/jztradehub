import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Mail, Download, Printer, Eye, Send, CheckCircle, Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ReceiptComponent from '@/components/Receipt';

interface ReceiptData {
  id: string;
  order_number: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  amount: number;
  payment_reference: string;
  payment_date: string;
  status: string;
  sent_to_buyer: boolean;
}

const ReceiptManager = () => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await fetch('/api/admin/receipts');
      const data = await response.json();
      setReceipts(data);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendReceiptToBuyer = async (receipt: ReceiptData) => {
    try {
      const response = await fetch('/api/admin/send-receipt-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: receipt.id })
      });
      if (response.ok) {
        toast.success(`Receipt sent to ${receipt.buyer_email}`);
        fetchReceipts();
      }
    } catch (error) {
      toast.error('Failed to send receipt');
    }
  };

  const viewReceipt = (receipt: ReceiptData) => {
    // Transform receipt data to match Receipt component props
    const receiptData = {
      id: receipt.id,
      order_number: receipt.order_number,
      buyer_name: receipt.buyer_name,
      buyer_email: receipt.buyer_email,
      buyer_phone: receipt.buyer_phone,
      buyer_address: "Address on file",
      products: [{ name: "Order Items", quantity: 1, price: receipt.amount, total: receipt.amount }],
      subtotal: receipt.amount,
      delivery_fee: 0,
      service_fee: 0,
      discount: 0,
      total: receipt.amount,
      payment_method: "Card/Bank Transfer",
      payment_reference: receipt.payment_reference,
      payment_date: receipt.payment_date,
      delivery_address: "Address on file",
      status: receipt.status,
      seller_name: "JZTradeHub"
    };
    setSelectedReceipt(receiptData);
  };

  const filteredReceipts = receipts.filter(r => 
    r.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.buyer_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="glass-strong">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Receipt Management
          </span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search receipts..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No receipts found</div>
        ) : (
          <div className="space-y-3">
            {filteredReceipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-accent/5 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{receipt.order_number}</span>
                    <Badge variant={receipt.sent_to_buyer ? "default" : "secondary"}>
                      {receipt.sent_to_buyer ? "Sent" : "Pending"}
                    </Badge>
                  </div>
                  <p className="font-medium mt-1">{receipt.buyer_name}</p>
                  <p className="text-sm text-muted-foreground">{receipt.buyer_email}</p>
                  <p className="text-sm text-muted-foreground">₦{receipt.amount.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => viewReceipt(receipt)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => sendReceiptToBuyer(receipt)} disabled={receipt.sent_to_buyer}>
                    <Mail className="w-4 h-4 mr-1" />
                    {receipt.sent_to_buyer ? "Sent" : "Send"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          {selectedReceipt && <ReceiptComponent order={selectedReceipt} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ReceiptManager;