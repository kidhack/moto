import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ReceiveBitcoinProps {
  address: string;
}

export default function ReceiveBitcoin({ address }: ReceiveBitcoinProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate QR code URL using a public API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(address)}&margin=10`;

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img src="/assets/generated/receive-icon.dim_32x32.png" alt="Receive" className="h-6 w-6" />
            Receive Bitcoin
          </CardTitle>
          <CardDescription>
            Share your address to receive BTC
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <div className="rounded-lg border-4 border-border bg-white p-4">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="h-64 w-64"
                onError={(e) => {
                  // Fallback if QR code fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Your Bitcoin Address</label>
            <div className="flex gap-2">
              <Input
                value={address}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={copyAddress}
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> This is your unique Bitcoin address. Share it with others to receive BTC. All transactions are recorded on the Bitcoin blockchain.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
