import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, ArrowLeft, XCircle, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const WalletDepositSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [amount, setAmount] = useState(0);

  const reference = searchParams.get('reference');
  const status = searchParams.get('status');

  useEffect(() => {
    if (status === 'success') {
      setSuccess(true);
      setVerifying(false);
      const amt = searchParams.get('amount');
      if (amt) setAmount(parseFloat(amt));
      triggerConfetti();
    } else if (reference) {
      verifyDeposit();
    } else {
      setVerifying(false);
      setSuccess(false);
    }
  }, [reference, status]);

  const triggerConfetti = () => {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#10b981', '#3b82f6'] });
    setTimeout(() => {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.5, x: 0.3 } });
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.5, x: 0.7 } });
    }, 200);
  };

  const verifyDeposit = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/wallet/deposit/verify?reference=${reference}`);
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        triggerConfetti();
      } else {
        setSuccess(false);
      }
    } catch (error) {
      setSuccess(false);
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-semibold">Verifying Your Deposit...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-md w-full text-center">
        {success ? (
          <>
            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 animate-bounce">
              <PartyPopper className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Deposit Successful! 🎉</h1>
            <p className="text-gray-600 mb-2">
              ₦{amount.toLocaleString()} has been added to your wallet
            </p>
            <div className="space-y-3 mt-8">
              <button onClick={() => navigate('/wallet')} className="w-full py-3 rounded-xl bg-primary text-white font-semibold">
                Go to Wallet
              </button>
              <button onClick={() => navigate('/marketplace')} className="w-full py-3 rounded-xl border border-gray-200 font-semibold flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Continue Shopping
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Deposit Failed</h1>
            <p className="text-gray-600 mb-8">We couldn't verify your deposit. Please contact support.</p>
            <button onClick={() => navigate('/wallet')} className="w-full py-3 rounded-xl bg-primary text-white font-semibold">
              Back to Wallet
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WalletDepositSuccess;