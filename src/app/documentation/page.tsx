'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CreditCard, 
  User, 
  Droplets,
  ShieldCheck,
  KeyRound,
  ChevronRight,
  Settings,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const resourceCategories = [
  { 
    id: 'payments', 
    title: 'Payments & Billing', 
    description: 'Learn how to settle your invoices and upload proof of payment.',
    icon: CreditCard, 
    color: 'bg-blue-500',
    href: '/documentation/payments'
  },
  { 
    id: 'refills', 
    title: 'Refill Requests', 
    description: 'Difference between ASAP and Scheduled refills and tracking your delivery.',
    icon: Droplets, 
    color: 'bg-cyan-500',
    href: '/documentation/refills'
  },
  { 
    id: 'compliance', 
    title: 'Quality & Compliance', 
    description: 'Access DOH permits, water test results, and office sanitation logs.',
    icon: ShieldCheck, 
    color: 'bg-green-500',
    href: '/documentation/compliance'
  },
  { 
    id: 'security', 
    title: 'Security & Privacy', 
    description: 'How to update your password and synchronize your login email address.',
    icon: KeyRound, 
    color: 'bg-purple-500',
    href: '/documentation/security'
  },
  { 
    id: 'account', 
    title: 'Account Management', 
    description: 'Manage business details, profile photos, and support agents.',
    icon: Settings, 
    color: 'bg-slate-500',
    href: '/documentation/account'
  },
];

export default function DocumentationHubPage() {
  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="space-y-4 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
          <BookOpen className="h-3 w-3" />
          User Guide
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Everything you need <br/><span className="text-primary">to succeed.</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Welcome to the River Business Knowledge Base. Select a category below to view detailed resources.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {resourceCategories.map((category) => (
          <Link key={category.id} href={category.href} className="group">
            <Card className="h-full border-2 border-transparent group-hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={cn("p-3 rounded-2xl text-white shadow-lg", category.color)}>
                  <category.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">{category.title}</CardTitle>
                  <CardDescription className="line-clamp-1">{category.id.toUpperCase()}</CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {category.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* FAQ Callout */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-lg font-bold flex items-center gap-2 justify-center md:justify-start">
              <HelpCircle className="h-5 w-5 text-primary" />
              Still have questions?
            </h3>
            <p className="text-sm text-muted-foreground">Our support team is available Mon-Fri, 9am - 6pm via Live Chat in your dashboard.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              Contact Support
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
