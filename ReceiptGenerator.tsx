import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Mail, Printer, Download, Eye, Send } from 'lucide-react';
import { toast } from 'sonner';
import Receipt from './Receipt';

// Use the correct port (5000) and localhost
const API_URL = "http://localhost:5000";

const ReceiptGenerator = () => {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const generateReceipt = async () => {
    if (!orderId.trim()) {
      toast.error("Please enter an Order ID");
      return;
    }

    setLoading(true);
    try {
      console.log("Generating receipt for order:", orderId);
      console.log("API URL:", `${API_URL}/api/generate-receipt`);
      
      const response = await fetch(`${API_URL}/api/generate-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, email: email || undefined })
      });

      console.log("Response status:", response.status);
      
      const data = await response.json();
      console.log("Receipt response:", data);
      
      if (data.success) {
        setReceipt(data.receipt);
        setShowReceipt(true);
        toast.success(data.message || "Receipt generated successfully!");
      } else {
        toast.error(data.message || "Failed to generate receipt");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to generate receipt. Make sure the server is running on port 5000");
    } finally {
      setLoading(false);
    }
  };

  const resendReceipt = async () => {
    if (!orderId.trim()) {
      toast.error("Please enter an Order ID");
      return;
    }

    if (!email.trim()) {
      toast.error("Please enter an email address");
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
        toast.success(data.message || "Receipt sent successfully!");
      } else {
        toast.error(data.message || "Failed to send receipt");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to send receipt");
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    const printContent = document.getElementById('receipt-print-area');
    if (printContent) {
      const WinPrint = window.open('', '', 'width=800,height=600');
      WinPrint?.document.write(`
        <html>
          <head>
            <title>Receipt - JZTradeHub</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .receipt { max-width: 800px; margin: 0 auto; }
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      WinPrint?.document.close();
      WinPrint?.print();
    }
  };

  const downloadPDF = async () => {
    toast.info("PDF download will be available soon");
  };

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Generate Receipt by Order ID
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Order ID *</Label>
            <Input
              placeholder="Enter order ID (e.g., a1b2c3d4-e5f6-7890-abcd-ef1234567890)"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="mt-1 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the full order ID from the database
            </p>
          </div>
          
          <div>
            <Label>Customer Email (Optional)</Label>
            <Input
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              If provided, receipt will be emailed to this address
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={generateReceipt} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {loading ? "Generating..." : "Generate Receipt"}
            </Button>
            <Button onClick={resendReceipt} disabled={loading || !email} variant="outline" className="gap-2">
              <Mail className="w-4 h-4" />
              Send Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {showReceipt && receipt && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2 no-print">
            <Button variant="outline" onClick={printReceipt} className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button variant="outline" onClick={downloadPDF} className="gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={() => setShowReceipt(false)} className="gap-2">
              <Eye className="w-4 h-4" />
              Hide Receipt
            </Button>
          </div>
          <div id="receipt-print-area">
            <Receipt order={receipt} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptGenerator;