
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { CheckCircle, ExternalLink, Gift, Lightbulb, MapPin, Rocket, Users, Target, Calendar, Edit, BellRing } from 'lucide-react';
import { AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const perks = [
    { 
        brand: "Fitness Gym", 
        image: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FPartners%2FNewBreed.png?alt=media&token=51a87e73-21f0-448c-9596-cc4a7016ad27",
        subtitle: "6 locations currently and continuously growing",
        discounts: [
            { title: "50% Membership Discount" },
            { title: "1 Free Pass" },
            { title: "Free class (Office Visit)", description: "Boost team wellness with a guided physical activity session at your office." }
        ],
        websiteUrl: "https://www.newbreed.com",
        mapUrl: "https://www.google.com/maps/search/?api=1&query=New+Breed+Fitness"
    },
];

interface InfoCardsProps {
}

export function InfoCards() {

  return (
    <div className="space-y-6">
      <Dialog>
        <DialogTrigger asChild>
          <Card className="cursor-pointer hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Perks with Us
              </CardTitle>
              <CardDescription>Exclusive discounts from our partner brands.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-center text-primary">View all perks</p>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Exclusive Partner Perks</DialogTitle>
            <DialogDescription>
              As a River Business client, you get access to these special offers.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {perks.map((perk, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="relative h-40 w-full">
                  <Image src={perk.image} alt={perk.brand} fill style={{ objectFit: 'cover' }} />
                </div>
                <CardHeader>
                  <CardTitle>{perk.brand}</CardTitle>
                  <CardDescription>{perk.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="text-sm space-y-2">
                    {perk.discounts.map((discount, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-1 shrink-0 text-green-500" />
                        <div>
                          <span className="font-medium">{discount.title}</span>
                          {discount.description && <p className="text-xs text-muted-foreground">{discount.description}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 pt-2">
                    <Button asChild className="flex-1">
                      <a href={perk.websiteUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Visit Website
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <a href={perk.mapUrl} target="_blank" rel="noopener noreferrer">
                        <MapPin className="mr-2 h-4 w-4" />
                        Find Nearby
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="text-center p-6 bg-accent/50 border-dashed">
              <CardContent className="p-0">
                <p className="font-semibold">More perks are coming soon!</p>
                <p className="text-sm text-muted-foreground mt-1">We're always working on new partnerships for you.</p>
              </CardContent>
            </Card>
          </div>
          <DialogFooter className="text-xs text-muted-foreground text-center sm:text-center pt-4 border-t">
            <p>All employees of your company are entitled to these perks.</p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" /> What's Coming Next
          </CardTitle>
          <CardDescription>A look at the future of River Business automation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                  <h4 className="font-semibold">HR Solution</h4>
                  <p className="text-sm text-muted-foreground">Automate payroll, manage employee data, and streamline HR processes with our upcoming, fully-integrated HR platform.</p>
              </div>
          </div>
          <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div>
                  <h4 className="font-semibold">CRM Solution</h4>
                  <p className="text-sm text-muted-foreground">Enhance customer relationships with our powerful CRM. Track leads, manage sales pipelines, and improve customer service effortlessly.</p>
              </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
