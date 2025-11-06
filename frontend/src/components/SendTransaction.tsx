import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSendTransaction } from '../hooks/useQueries';
import { Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { UserWallet } from '../backend';

interface SendTransactionProps {
  wallet: UserWallet;
}

export default function SendTransaction({ wallet }: SendTransactionProps) {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const sendTransaction = useSendTransaction();

  const formatBTC = (satoshis: bigint) => {
    const btc = Number(satoshis) / 100000000;
    return btc.toFixed(8);
  };

  const handleSend = async () => {
    if (!toAddress || !amount) {
      toast.error('Please fill in all fields');
      return;
    }

    const amountSatoshis = Math.floor(parseFloat(amount) * 100000000);
    if (amountSatoshis <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    if (BigInt(amountSatoshis) > wallet.balance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      await sendTransaction.mutateAsync({
        toAddress,
        amount: BigInt(amountSatoshis)
      });
      toast.success('Transaction sent successfully!');
      setToAddress('');
      setAmount('');
    } catch (error) {
      toast.error('Failed to send transaction');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img src="/assets/generated/send-icon.dim_32x32.png" alt="Send" className="h-6 w-6" />
            Send Bitcoin
          </CardTitle>
          <CardDescription>
            Transfer BTC to any Bitcoin address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Available Balance: <span className="font-bold text-bitcoin">{formatBTC(wallet.balance)} BTC</span>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="bc1q..."
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (BTC)</Label>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                placeholder="0.00000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount((Number(wallet.balance) / 400000000).toFixed(8))}
                >
                  25%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount((Number(wallet.balance) / 200000000).toFixed(8))}
                >
                  50%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount((Number(wallet.balance) / 100000000).toFixed(8))}
                >
                  Max
                </Button>
              </div>
            </div>
          </div>

          {sendTransaction.isSuccess && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">
                Transaction submitted successfully!
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSend}
            disabled={sendTransaction.isPending || !toAddress || !amount}
            size="lg"
            className="w-full bg-bitcoin hover:bg-bitcoin/90"
          >
            {sendTransaction.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Transaction
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
