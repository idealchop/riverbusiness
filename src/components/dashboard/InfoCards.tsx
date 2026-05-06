'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { CheckCircle, ExternalLink, Gift, MapPin, Rocket, Users, Target, ArrowRight, Sparkles } from 'lucide-react';

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

export function InfoCards() {
  return (
    <div className="space-y-6">
      <Dialog>
        <DialogTrigger asChild>
          <Card className="cursor-pointer group hover:border-primary transition-all shadow-sm border-none bg-gradient-to-br from-primary to-blue-700 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-20">
                <Gift className="h-24 w-24 -mr-6 -mt-6" />
            </div>
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Sparkles className="h-5 w-5 text-blue-200" />
                Partner Perks
              </CardTitle>
              <CardDescription className="text-blue-100 text-xs font-medium uppercase tracking-widest">Exclusive Business Benefits</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <p className="text-sm font-bold text-white/90 group-hover:underline flex items-center gap-2">
                Explore member-only discounts <ArrowRight className="h-4 w-4" />
              </p>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Exclusive Partner Perks</DialogTitle>
            <DialogDescription>
              As a River Business client, your entire team gets access to these special offers from our partners.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {perks.map((perk, index) => (
              <Card key={index} className="overflow-hidden border-slate-200 shadow-none bg-muted/20">
                <div className="relative h-40 w-full">
                  <Image src={perk.image} alt={perk.brand} fill style={{ objectFit: 'cover' }} />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{perk.brand}</CardTitle>
                  <CardDescription className="text-xs">{perk.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm space-y-2">
                    {perk.discounts.map((discount, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-1 shrink-0 text-green-500" />
                        <div>
                          <span className="font-bold text-slate-900">{discount.title}</span>
                          {discount.description && <p className="text-xs text-muted-foreground mt-0.5">{discount.description}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 pt-2">
                    <Button asChild className="flex-1 rounded-full font-bold h-9 text-xs">
                      <a href={perk.websiteUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Visit Website
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="flex-1 rounded-full font-bold h-9 text-xs bg-white">
                      <a href={perk.mapUrl} target="_blank" rel="noopener noreferrer">
                        <MapPin className="mr-2 h-3.5 w-3.5" />
                        Locations
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="text-center p-8 bg-slate-50 border-2 border-dashed rounded-2xl">
                <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">More partnerships incoming</p>
                <p className="text-xs text-muted-foreground mt-2 px-6">We're actively negotiating more perks to add value to your business subscription.</p>
            </div>
          </div>
          <DialogFooter className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center sm:text-center pt-4 border-t">
            <p>Verification is based on your active corporate account.</p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4 bg-muted/10 border-b border-slate-100">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-start gap-3 group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    HR Solution
                    <Badge variant="secondary" className="text-[8px] h-4 font-black uppercase tracking-tighter bg-slate-200">Soon</Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">Automated payroll and employee management integrated with your hydration data.</p>
              </div>
          </div>
          <div className="flex items-start gap-3 group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
                <Target className="h-5 w-5" />
              </div>
              <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    B2B CRM
                    <Badge variant="secondary" className="text-[8px] h-4 font-black uppercase tracking-tighter bg-slate-200">Q3 2025</Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">Track leads and manage multi-site client relationships in one centralized dashboard.</p>
              </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
