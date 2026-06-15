import { useRef } from 'react';
import { Shield, Truck, Calendar, Clock, MapPin, Phone, Mail, User, Package, CreditCard, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReceiptProps {
  order: {
    id?: string;
    order_number?: string;
    buyer_name?: string;
    buyer_email?: string;
    buyer_phone?: string;
    buyer_address?: string;
    products?: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
    }>;
    subtotal?: number;
    delivery_fee?: number;
    service_fee?: number;
    discount?: number;
    total?: number;
    amount?: number;
    payment_method?: string;
    payment_reference?: string;
    payment_date?: string;
    delivery_address?: string;
    status?: string;
    seller_name?: string;
  };
}

const Receipt = ({ order }: ReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Handle both receipt formats
  const orderNumber = order.order_number || order.id?.slice(0, 8).toUpperCase() || 'N/A';
  const totalAmount = order.total || order.amount || 0;
  const paymentDate = order.payment_date || new Date().toISOString();
  const paymentRef = order.payment_reference || `JZ-${orderNumber}`;
  const buyerName = order.buyer_name || 'Customer';
  const buyerEmail = order.buyer_email || 'N/A';
  const buyerPhone = order.buyer_phone || 'N/A';
  const deliveryAddress = order.delivery_address || 'Address on file';
  const sellerName = order.seller_name || 'JZTradeHub Seller';
  const products = order.products || [{ name: 'Order Items', quantity: 1, price: totalAmount, total: totalAmount }];

  const printReceipt = () => {
    const printContent = receiptRef.current;
    if (printContent) {
      const WinPrint = window.open('', '', 'width=800,height=600');
      WinPrint?.document.write(`
        <html>
          <head>
            <title>Receipt - JZTradeHub</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .receipt { max-width: 800px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 20px; }
              .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
              .title { font-size: 20px; margin: 10px 0; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; }
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
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`receipt_${orderNumber}.pdf`);
      toast.success('Receipt downloaded!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-4">
      {/* Receipt Content */}
      <div ref={receiptRef} className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl max-w-4xl mx-auto">
        {/* Header with Logo */}
        <div className="text-center border-b pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-blue-600">JZTradeHub</h1>
          <p className="text-gray-500">Secure Escrow Marketplace</p>
          <div className="mt-2">
            <Badge className="bg-green-100 text-green-800">
              Payment Confirmed ✓
            </Badge>
          </div>
        </div>

        {/* Receipt Title */}
        <div className="text-center my-6">
          <h2 className="text-2xl font-bold">PAYMENT RECEIPT</h2>
          <p className="text-gray-500">Transaction Confirmation</p>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>{new Date(paymentDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>{new Date(paymentDate).toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4 text-blue-500" />
            <span>{order.payment_method || 'Card/Bank Transfer'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono">
            <span className="text-gray-500">Ref:</span>
            <span>{paymentRef.slice(0, 16)}...</span>
          </div>
        </div>

        {/* Buyer Information */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 mb-6">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-blue-500" />
            Buyer Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span>{buyerName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{buyerEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{buyerPhone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{deliveryAddress}</span>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="mb-6">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-blue-500" />
            Order Items
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-3">{product.name}</td>
                    <td className="p-3 text-center">{product.quantity}</td>
                    <td className="p-3 text-right">₦{product.price?.toLocaleString()}</td>
                    <td className="p-3 text-right">₦{product.total?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="border-t pt-4">
          <div className="space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>₦{(order.subtotal || totalAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Delivery Fee</span>
              <span>₦{(order.delivery_fee || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Service Fee (5%)</span>
              <span>₦{(order.service_fee || 0).toLocaleString()}</span>
            </div>
            {(order.discount || 0) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-₦{(order.discount || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total Paid</span>
              <span className="text-blue-600">₦{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mt-6">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-blue-500" />
            <span className="font-semibold">Delivery Information</span>
          </div>
          <p className="text-sm">{deliveryAddress}</p>
          <p className="text-xs text-gray-500 mt-2">Sold by: {sellerName}</p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t">
          <p className="text-xs text-gray-500">
            This is a computer-generated receipt and requires no signature.
            Your payment is protected by JZTradeHub Escrow.
          </p>
          <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
            <span>support@jztradehub.com</span>
            <span>+234 801 234 5678</span>
            <span>www.jztradehub.com</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-3 no-print">
        <Button onClick={printReceipt} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" />
          Print Receipt
        </Button>
        <Button onClick={downloadPDF} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>
    </div>
  );
};

export default Receipt;