// server.js
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - Allow Netlify frontend
const allowedOrigins = [
  'http://localhost:8083',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://jztradehub.netlify.app',
  'https://*.netlify.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============ SUPABASE CONFIGURATION ============
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://csianbopsmufkrdrsasn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaWFuYm9wc211ZmtyZHJzYXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyOTk3MCwiZXhwIjoyMDkwMjA1OTcwfQ.RRRy6ugDIZk_iuNr3lBi1TgJAQSjw26dpgJlpBfIFpg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============ FLUTTERWAVE KEYS ============
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || 'FLWSECK_TEST-0a8aae8f596e6970eface67e79104b4e-X';
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_Z43aYrco_KoiY6AaZVfWNpC3BhwruWp62';

// Frontend URL for redirects
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://jztradehub.netlify.app';

console.log('=================================');
console.log('🚀 JZTRADEHUB SERVER STARTING');
console.log(`📍 Port: ${PORT}`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📍 Frontend URL: ${FRONTEND_URL}`);
console.log(`📍 Flutterwave: ${FLW_SECRET_KEY ? '✓ Configured' : '✗ Missing'}`);
console.log(`📍 Email Service: ${RESEND_API_KEY ? '✓ Configured' : '✗ Missing'}`);
console.log(`📍 Supabase: ${SUPABASE_URL ? '✓ Configured' : '✗ Missing'}`);
console.log('=================================');

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'JZTradeHub API is running', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============ CREATE ORDER ============
app.post('/api/create-order', async (req, res) => {
  console.log('\n📦 CREATE ORDER');
  console.log('Request body:', req.body);
  
  try {
    const {
      buyer_id, seller_id, product_id, quantity, product_price,
      delivery_address, delivery_fee, service_fee, phone_number,
      delivery_type, estimated_days, delivery_state, payment_method
    } = req.body;

    // Validate required fields
    if (!buyer_id || !seller_id || !product_id || !quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: buyer_id, seller_id, product_id, quantity' 
      });
    }

    // Check stock
    const { data: product, error: stockError } = await supabase
      .from('products')
      .select('stock_quantity, title, price')
      .eq('id', product_id)
      .single();

    if (stockError || !product) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    if (product.stock_quantity < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${product.stock_quantity} units available` 
      });
    }

    // Generate proper UUID for order
    const orderId = randomUUID();
    
    const subtotal = product_price * quantity;
    const deliveryFee = delivery_fee || 0;
    const serviceFeeVal = service_fee || 0;
    const total = subtotal + deliveryFee + serviceFeeVal;

    console.log(`💰 Order total: ₦${total}, Order ID: ${orderId}`);

    // Create order with proper UUID
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        buyer_id,
        seller_id,
        product_id,
        quantity,
        total_amount: total,
        status: 'pending',
        payment_status: 'pending',
        delivery_address: delivery_address || 'Address provided at checkout',
        phone_number: phone_number || null,
        delivery_fee: deliveryFee,
        service_fee: serviceFeeVal,
        delivery_type: delivery_type || 'standard',
        estimated_days: estimated_days || null,
        delivery_state: delivery_state || null,
        payment_method: payment_method || 'flutterwave',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return res.status(500).json({ success: false, message: orderError.message });
    }

    // Reduce product stock
    const newStock = product.stock_quantity - quantity;
    await supabase
      .from('products')
      .update({ stock_quantity: newStock })
      .eq('id', product_id);

    console.log(`✅ Order created: ${order.id}`);
    console.log(`📦 Stock reduced: ${newStock} remaining`);

    res.json({ success: true, orderId: order.id, order });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ INITIALIZE FLUTTERWAVE PAYMENT ============
app.post('/api/initialize-payment', async (req, res) => {
  console.log('\n💰 FLUTTERWAVE PAYMENT');
  console.log('Request:', req.body);
  
  try {
    const { amount, email, name, orderId, phone } = req.body;

    if (!amount || !email || !orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: amount, email, orderId' 
      });
    }

    // Use actual amount (no capping in production)
    const finalAmount = parseFloat(amount);
    const reference = `JZ-${orderId.slice(0, 8)}-${Date.now()}`;

    console.log(`💰 Amount: ₦${finalAmount}, Ref: ${reference}`);

    // Update order with payment reference
    await supabase
      .from('orders')
      .update({ payment_reference: reference })
      .eq('id', orderId);

    const payload = {
      tx_ref: reference,
      amount: finalAmount,
      currency: 'NGN',
      redirect_url: `${FRONTEND_URL}/payment-success?reference=${reference}&orderId=${orderId}`,
      payment_options: 'card,banktransfer,ussd',
      customer: {
        email: email,
        phonenumber: phone || '08012345678',
        name: name || email.split('@')[0]
      },
      customizations: {
        title: 'JZTradeHub',
        description: `Order #${orderId.slice(0, 8)}`,
        logo: 'https://jztradehub.netlify.app/logo.png'
      },
      meta: {
        order_id: orderId
      }
    };

    console.log('Calling Flutterwave API...');

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Flutterwave Response:', data.status, data.message);

    if (response.ok && data.status === 'success' && data.data?.link) {
      console.log(`✅ Checkout URL: ${data.data.link}`);
      res.json({ 
        success: true, 
        data: { 
          checkout_url: data.data.link, 
          reference 
        } 
      });
    } else {
      console.error('Flutterwave Error:', data);
      res.status(422).json({ 
        success: false, 
        message: data.message || 'Failed to initialize payment' 
      });
    }
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ VERIFY PAYMENT ============
app.get('/api/verify-payment', async (req, res) => {
  console.log('\n🔍 VERIFY PAYMENT');
  console.log('Query params:', req.query);
  
  try {
    const { reference, orderId, status } = req.query;

    // Handle cancellation
    if (status === 'cancelled') {
      console.log(`❌ Payment cancelled for order ${orderId}`);
      
      if (orderId) {
        // Restore stock
        const { data: order } = await supabase
          .from('orders')
          .select('product_id, quantity')
          .eq('id', orderId)
          .single();
        
        if (order) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', order.product_id)
            .single();
          
          if (product) {
            await supabase
              .from('products')
              .update({ stock_quantity: product.stock_quantity + order.quantity })
              .eq('id', order.product_id);
          }
        }
        
        await supabase
          .from('orders')
          .update({ payment_status: 'cancelled', status: 'cancelled' })
          .eq('id', orderId);
      }
      
      return res.json({ success: false, paid: false, cancelled: true });
    }

    // Check if order is already paid
    if (orderId) {
      const { data: order } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .single();
      
      if (order && order.payment_status === 'paid') {
        console.log(`✅ Order ${orderId} already paid`);
        return res.json({ success: true, paid: true });
      }
    }

    if (!reference) {
      return res.json({ success: false, paid: false, message: 'No reference' });
    }

    // Verify with Flutterwave
    console.log(`Verifying with Flutterwave: ${reference}`);

    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${FLW_SECRET_KEY}` }
    });

    const data = await response.json();
    console.log('Flutterwave verification:', data.status, data.data?.status);

    if (data.status === 'success' && data.data?.status === 'successful') {
      console.log(`✅ Payment successful! Amount: ₦${data.data.amount}`);
      
      if (orderId) {
        await supabase
          .from('orders')
          .update({ 
            payment_status: 'paid', 
            status: 'confirmed',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);
      }
      
      return res.json({ success: true, paid: true, amount: data.data.amount });
    }
    
    if (data.data?.status === 'failed') {
      console.log(`❌ Payment failed`);
      
      if (orderId) {
        // Restore stock
        const { data: order } = await supabase
          .from('orders')
          .select('product_id, quantity')
          .eq('id', orderId)
          .single();
        
        if (order) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', order.product_id)
            .single();
          
          if (product) {
            await supabase
              .from('products')
              .update({ stock_quantity: product.stock_quantity + order.quantity })
              .eq('id', order.product_id);
          }
        }
        
        await supabase
          .from('orders')
          .update({ payment_status: 'failed', status: 'failed' })
          .eq('id', orderId);
      }
      
      return res.json({ success: false, paid: false, failed: true });
    }

    return res.json({ success: false, paid: false, pending: true });
    
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ SEND ORDER EMAIL ============
app.post('/api/send-order-email', async (req, res) => {
  console.log('\n📧 SENDING ORDER EMAIL');
  console.log('Request body:', req.body);
  
  try {
    const { 
      to, name, orderId, orderDate, orderTime, totalAmount, quantity, 
      deliveryAddress, phoneNumber, productTitle, productPrice, productImageUrl, trackingUrl 
    } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, error: 'No email provided' });
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return res.status(500).json({ success: false, error: 'Email service not configured' });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Order Confirmation - JZTradeHub</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6, #10b981); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .order-details { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0; }
          .product-row { display: flex; gap: 15px; margin: 20px 0; padding: 15px; border-bottom: 1px solid #eee; }
          .product-image { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; }
          .total { font-size: 18px; font-weight: bold; color: #3b82f6; text-align: right; margin-top: 20px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; background: #f8f9fa; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>JZTradeHub</h1>
            <p>Order Confirmation</p>
          </div>
          <div class="content">
            <h2>Thank you for your order, ${name || 'Valued Customer'}!</h2>
            <p>Your order has been confirmed and payment has been received.</p>
            
            <div class="order-details">
              <p><strong>Order ID:</strong> ${orderId?.slice(0, 8)}</p>
              <p><strong>Order Date:</strong> ${orderDate || new Date().toLocaleDateString()} at ${orderTime || new Date().toLocaleTimeString()}</p>
              <p><strong>Payment Method:</strong> Flutterwave</p>
            </div>
            
            <div class="product-row">
              ${productImageUrl ? `<img src="${productImageUrl}" alt="${productTitle}" class="product-image" />` : ''}
              <div>
                <h3>${productTitle || 'Product'}</h3>
                <p>Quantity: ${quantity || 1}</p>
                <p>Price: ₦${(productPrice || totalAmount / (quantity || 1)).toLocaleString()}</p>
              </div>
            </div>
            
            <div class="total">
              Total Paid: ₦${(totalAmount || 0).toLocaleString()}
            </div>
            
            <div>
              <h4>Delivery Address:</h4>
              <p>${deliveryAddress || 'Address provided at checkout'}</p>
              <p>Phone: ${phoneNumber || 'Not provided'}</p>
            </div>
            
            <a href="${trackingUrl || FRONTEND_URL}" class="button">Track Your Order</a>
          </div>
          <div class="footer">
            <p>JZTradeHub - Secure Escrow Marketplace</p>
            <p>&copy; ${new Date().getFullYear()} JZTradeHub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'JZTradeHub <onboarding@resend.dev>',
        to: [to],
        subject: `Order Confirmation #${orderId?.slice(0, 8)}`,
        html: emailHtml
      })
    });

    const data = await response.json();
    console.log('Resend API response:', data);

    if (response.ok) {
      console.log(`✅ Email sent successfully to ${to}`);
      res.json({ success: true, data });
    } else {
      console.error('Resend error:', data);
      res.status(500).json({ success: false, error: data.message || 'Failed to send email' });
    }
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ WALLET BALANCE ============
app.get('/api/wallet/balance', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    let { data: wallet } = await supabase
      .from('wallets')
      .select('balance, total_deposited, total_withdrawn')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({ profile_id: user.id, balance: 0, total_deposited: 0, total_withdrawn: 0 })
        .select()
        .single();
      wallet = newWallet;
    }

    res.json({ 
      success: true, 
      wallet: { 
        balance: wallet?.balance || 0,
        total_deposited: wallet?.total_deposited || 0,
        total_withdrawn: wallet?.total_withdrawn || 0
      } 
    });
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ WALLET TRANSACTIONS ============
app.get('/api/wallet/transactions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    res.json({ 
      success: true, 
      transactions: transactions || [] 
    });
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ WALLET PAY ORDER ============
app.post('/api/wallet/pay-order', async (req, res) => {
  console.log('\n💰 WALLET PAY ORDER');
  
  try {
    const { orderId, amount } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    let { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('profile_id', user.id)
      .single();

    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const newBalance = wallet.balance - amount;

    await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('profile_id', user.id);

    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        type: 'payment',
        amount: amount,
        balance_before: wallet.balance,
        balance_after: newBalance,
        status: 'completed',
        reference: `ORDER-${orderId}`,
        description: `Order payment for #${orderId?.slice(0, 8)}`
      });

    await supabase
      .from('orders')
      .update({ payment_status: 'paid', status: 'confirmed', paid_at: new Date().toISOString() })
      .eq('id', orderId);

    res.json({ success: true, new_balance: newBalance });
  } catch (error) {
    console.error('Wallet payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log('\n📋 Endpoints:');
  console.log('   GET  /api/health');
  console.log('   POST /api/create-order');
  console.log('   POST /api/initialize-payment');
  console.log('   GET  /api/verify-payment');
  console.log('   POST /api/send-order-email');
  console.log('   GET  /api/wallet/balance');
  console.log('   GET  /api/wallet/transactions');
  console.log('   POST /api/wallet/pay-order');
  console.log('\n🚀 Ready for deployment!\n');
});