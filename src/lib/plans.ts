

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
        price: 0,
        recommended: true,
        details: 'Admin-configured'
    }
]

export const smePlans = [
    {
        name: 'SME Plan',
        price: 0,
        recommended: true,
        details: 'Admin-configured'
    }
]

export const commercialPlans = [
    {
        name: 'Commercial Plan',
        price: 0,
        recommended: true,
        details: 'Admin-configured'
    }
];

export const corporatePlans = [
    {
        name: 'Corporate Plan',
        price: 0,
        recommended: true,
        details: 'Admin-configured'
    }
];

export const enterprisePlans = [
    {
        name: 'Customized Plan',
        price: 0,
        description: 'Tailored for predictable, prepaid enterprise solutions.',
        recommended: false,
        imageId: 'plan-enterprise-customized',
        details: [
            { label: 'Liters/Month', value: 'Custom' },
            { label: 'Deliveries', value: 'Custom' },
            { label: 'Stations', value: 'Custom' },
        ]
    },
    {
        name: 'Flow Plan',
        price: 3, // Price per liter
        description: 'For pure usage-based, pay-as-you-go enterprise clients.',
        recommended: false,
        isConsumptionBased: true,
        imageId: 'plan-enterprise-flowing',
        details: [
            { label: 'Pricing', value: 'P3 per Liter' },
            { label: 'Deliveries', value: 'On-demand' },
            { label: 'Billing', value: 'Pay-as-you-go' },
        ]
    }
];
