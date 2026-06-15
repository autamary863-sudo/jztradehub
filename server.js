// server.js
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const allowedOrigins = [
  'http://localhost:8083',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://jztradehub-frontend.onrender.com',
  'https://*.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============ SUPABASE CONFIGURATION ============
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials!');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============ FLUTTERWAVE KEYS ============
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

console.log('=================================');
console.log('🚀 JZTRADEHUB SERVER STARTING');
console.log(`📍 Port: ${PORT}`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📍 Supabase: ${SUPABASE_URL ? '✓ Configured' : '✗ Missing'}`);
console.log(`📍 Flutterwave: ${FLW_SECRET_KEY ? '✓ Configured' : '✗ Missing'}`);
console.log('=================================');

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'JZTradeHub API is running', 
    timestamp: new Date().toISOString()
  });
});

// ============ CREATE ORDER ============
app.post('/api/create-order', async (req, res) => {
  console.log('\n📦 CREATE ORDER');
  
  try {
    const {
      buyer_id, seller_id, product_id, quantity, product_price,
      delivery_address, delivery_fee, service_fee, phone_number,
      delivery_type, estimated_days, delivery_state
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

    const orderId = randomUUID();
    const subtotal = product_price * quantity;
    const deliveryFee = delivery_fee || 0;
    const serviceFeeVal = service_fee || 0;
    const total = subtotal + deliveryFee + serviceFeeVal;

    // Create order
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
    await supabase
      .from('products')
      .update({ stock_quantity: product.stock_quantity - quantity })
      .eq('id', product_id);

    console.log(`✅ Order created: ${order.id}`);
    res.json({ success: true, orderId: order.id, order });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ INITIALIZE FLUTTERWAVE PAYMENT ============
app.post('/api/initialize-payment', async (req, res) => {
  console.log('\n💰 INITIALIZE PAYMENT');
  
  try {
    const { amount, email, name, orderId, phone } = req.body;

    if (!amount || !email || !orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: amount, email, orderId' 
      });
    }

    if (!FLW_SECRET_KEY) {
      console.error('❌ Flutterwave secret key missing');
      return res.status(500).json({ 
        success: false, 
        message: 'Payment gateway not configured' 
      });
    }

    const finalAmount = parseFloat(amount);
    const reference = `JZ-${orderId.slice(0, 8)}-${Date.now()}`;
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://jztradehub-frontend.onrender.com';

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
        logo: 'https://jztradehub-frontend.onrender.com/logo.png'
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
  
  try {
    const { reference, orderId, status } = req.query;

    if (status === 'cancelled') {
      return res.json({ success: false, paid: false, cancelled: true });
    }

    if (!reference) {
      return res.json({ success: false, paid: false, message: 'No reference' });
    }

    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${FLW_SECRET_KEY}` }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data?.status === 'successful') {
      if (orderId) {
        await supabase
          .from('orders')
          .update({ 
            payment_status: 'paid', 
            status: 'confirmed',
            paid_at: new Date().toISOString()
          })
          .eq('id', orderId);
      }
      return res.json({ success: true, paid: true, amount: data.data.amount });
    }

    return res.json({ success: false, paid: false });
    
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ success: false, message: error.message });
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

// ============ START SERVER ============
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server running on http://0.0.0.0:${PORT}`);
  console.log('\n📋 Endpoints:');
  console.log('   GET  /api/health');
  console.log('   POST /api/create-order');
  console.log('   POST /api/initialize-payment');
  console.log('   GET  /api/verify-payment');
  console.log('   GET  /api/wallet/balance');
  console.log('\n🚀 Ready for deployment!\n');
});
