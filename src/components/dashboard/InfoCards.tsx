'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { CheckCircle, ExternalLink, Gift, Lightbulb, MapPin } from 'lucide-react';

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

const tips = [
    { title: "Give Your Bottle a Sniff Test", description: "Before you leave home, check your bottle for cleanliness. If it smells sour or 'off,' it needs a proper wash. That smell means germs are in the bottle, not the water!" },
    { title: "Empty Out Old Water", description: "Don't mix old, potentially contaminated water with your fresh refill. Always pour out any standing water from the day before to start fresh." },
    { title: "Check the Cap and Spout", description: "Inspect the threads and spout for any residue. The part that touches your mouth should always be clean to protect the fresh water." },
    { title: "Look for the Clean Signs", description: "At the refill station, check if the area is dry and tidy. A well-maintained station is a good sign of safe practices." },
    { title: "Stop the Touch", description: "Prevent cross-contamination by making sure the refilling nozzle never touches the inside of your bottle. Hold your container carefully beneath it." },
    { title: "Pick the Right Temperature", description: "If the station offers chilled water, choose it! People naturally drink more when water is cold and refreshing." },
    { title: "Weekly Soap and Water Wash", description: "Once a week, use dish soap and a bottle brush to scrub the inside walls, bottom, and especially the neck and threads where germs hide." },
    { title: "The Sanitizing Soak", description: "For a deep clean, fill your bottle with a mix of equal parts white vinegar and water and let it sit for 30 minutes. Rinse thoroughly afterward." },
    { title: "⭐ Hydration Tip", description: "Keep your refilled bottle visible on your desk or near you throughout the day. If you see it, you'll remember to drink it!" }
];

export function InfoCards() {
  const [dailyTip, setDailyTip] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const tipIndex = dayOfYear % tips.length;
    setDailyTip(tips[tipIndex]);
  }, []);

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
            <Lightbulb className="h-5 w-5 text-yellow-400" /> Tip of the Day
          </CardTitle>
          <CardDescription>A daily tip to keep your water safe and refreshing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {dailyTip && (
            <>
              <h4 className="font-semibold">{dailyTip.title}</h4>
              <p className="text-sm text-muted-foreground">{dailyTip.description}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
