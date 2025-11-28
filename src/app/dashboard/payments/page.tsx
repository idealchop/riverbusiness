import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PaymentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
        <CardDescription>Manage your billing information and view payment history.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Current Method</h3>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Visa ending in 4242</p>
              <p className="text-sm text-muted-foreground">Expires 12/2026</p>
            </div>
            <Button variant="outline">Update</Button>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Payment History</h3>
          <div className="border rounded-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-medium">July 2024 Invoice</p>
                <p className="text-sm text-muted-foreground">Paid on July 15, 2024</p>
              </div>
              <p className="font-medium">$150.00</p>
            </div>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-medium">June 2024 Invoice</p>
                <p className="text-sm text-muted-foreground">Paid on June 15, 2024</p>
              </div>
              <p className="font-medium">$145.00</p>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">May 2024 Invoice</p>
                <p className="text-sm text-muted-foreground">Paid on May 15, 2024</p>
              </div>
              <p className="font-medium">$160.00</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
