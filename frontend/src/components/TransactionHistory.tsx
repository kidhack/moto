import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import type { Transaction } from '../backend';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const formatBTC = (satoshis: bigint) => {
    const btc = Number(satoshis) / 100000000;
    return btc.toFixed(8);
  };

  const formatDate = (timestamp: bigint) => {
    if (timestamp === BigInt(0)) return 'Pending';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const sortedTransactions = [...transactions].sort((a, b) => 
    Number(b.timestamp) - Number(a.timestamp)
  );

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All your Bitcoin transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No Transactions Yet</h3>
            <p className="text-sm text-muted-foreground">
              Your transaction history will appear here once you send or receive Bitcoin.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>All your Bitcoin transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((tx) => {
                const isSent = tx.fromAddress !== tx.toAddress;
                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isSent ? (
                          <>
                            <ArrowUpRight className="h-4 w-4 text-destructive" />
                            <span>Sent</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="h-4 w-4 text-green-500" />
                            <span>Received</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {isSent ? (
                        <span title={tx.toAddress}>
                          {tx.toAddress.slice(0, 8)}...{tx.toAddress.slice(-6)}
                        </span>
                      ) : (
                        <span title={tx.fromAddress}>
                          {tx.fromAddress.slice(0, 8)}...{tx.fromAddress.slice(-6)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={`font-semibold ${isSent ? 'text-destructive' : 'text-green-500'}`}>
                      {isSent ? '-' : '+'}{formatBTC(tx.amount)} BTC
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          tx.status === 'confirmed' ? 'default' : 
                          tx.status === 'pending' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(tx.timestamp)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
