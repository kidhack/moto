import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import type { UserWallet } from '../backend';

interface WalletOverviewProps {
  wallet: UserWallet;
}

export default function WalletOverview({ wallet }: WalletOverviewProps) {
  const formatBTC = (satoshis: bigint) => {
    const btc = Number(satoshis) / 100000000;
    return btc.toFixed(8);
  };

  const recentTransactions = wallet.transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      <Card className="border-bitcoin/20 bg-gradient-to-br from-bitcoin/5 to-transparent">
        <CardHeader>
          <CardDescription>Total Balance</CardDescription>
          <CardTitle className="text-4xl font-bold text-bitcoin">
            {formatBTC(wallet.balance)} BTC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{wallet.bitcoinAddress}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wallet.transactions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wallet.transactions.filter(tx => tx.fromAddress === wallet.bitcoinAddress).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wallet.transactions.filter(tx => tx.toAddress === wallet.bitcoinAddress).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((tx) => {
                const isSent = tx.fromAddress === wallet.bitcoinAddress;
                return (
                  <div key={tx.id} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isSent ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                        {isSent ? (
                          <ArrowUpRight className="h-5 w-5 text-destructive" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{isSent ? 'Sent' : 'Received'}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {isSent ? tx.toAddress.slice(0, 12) : tx.fromAddress.slice(0, 12)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isSent ? 'text-destructive' : 'text-green-500'}`}>
                        {isSent ? '-' : '+'}{formatBTC(tx.amount)} BTC
                      </p>
                      <Badge variant={tx.status === 'confirmed' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'}>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
