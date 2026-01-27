
'use client';

export const clientTypes = [
    { name: 'Family', price: 50, description: 'For families and personal home use', imageId: 'plan-family' },
    { name: 'SME', price: 100, description: 'For small teams, kiosks, and home offices', imageId: 'plan-sme' },
    { name: 'Commercial', price: 150, description: 'For growing offices and warehouses', imageId: 'plan-commercial' },
    { name: 'Corporate', price: 250, description: 'For multi-site companies and BPOs', imageId: 'plan-corporate' },
    { name: 'Enterprise', price: 500, description: 'Customize and pay based on consumption', imageId: 'plan-enterprise' },
];

export const familyPlans = [
    {
        name: 'Family Plan',
        price: 50,
        isConsumptionBased: false,
        details: 'Fixed monthly pricing.'
    },
    {
        name: 'Custom Family (Per-Liter)',
        price: 3,
        isConsumptionBased: true,
        details: 'Pay for what you consume.'
    }
]

export const smePlans = [
    {
        name: 'SME Plan',
        price: 100,
        isConsumptionBased: false,
        details: 'Fixed monthly pricing.'
    },
    {
        name: 'Custom SME (Per-Liter)',
        price: 3,
        isConsumptionBased: true,
        details: 'Pay for what you consume.'
    }
]

export const commercialPlans = [
    {
        name: 'Commercial Plan',
        price: 150,
        isConsumptionBased: false,
        details: 'Fixed monthly pricing.'
    },
    {
        name: 'Custom Commercial (Per-Liter)',
        price: 3,
        isConsumptionBased: true,
        details: 'Pay for what you consume.'
    }
];

export const corporatePlans = [
    {
        name: 'Corporate Plan',
        price: 250,
        isConsumptionBased: false,
        details: 'Fixed monthly pricing.'
    },
    {
        name: 'Custom Corporate (Per-Liter)',
        price: 3,
        isConsumptionBased: true,
        details: 'Pay for what you consume.'
    }
];

export const enterprisePlans = [
    {
        name: 'Customized Enterprise Plan',
        price: 0,
        description: 'A tailored, fixed-price plan with a set monthly allocation.',
        isConsumptionBased: false,
        imageId: 'plan-enterprise-customized',
        details: [
            { label: 'Liters/Month', value: 'Custom' },
            { label: 'Pricing', value: 'Fixed Monthly' },
        ]
    },
    {
        name: 'Flow Plan',
        price: 3, // Default price per liter, adjustable in the form
        description: 'A flexible plan where you pay only for what you consume.',
        isConsumptionBased: true,
        imageId: 'plan-enterprise-flowing',
        details: [
            { label: 'Pricing', value: 'Per Liter' },
            { label: 'Billing', value: 'Based on consumption' },
        ]
    }
];
