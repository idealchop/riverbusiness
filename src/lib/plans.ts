

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
        name: 'Flow Plan (P2.5/L)',
        price: 2.5, // Price per liter
        description: 'Pay based on consumption at P2.5 per liter.',
        recommended: false,
        isConsumptionBased: true,
        imageId: 'plan-enterprise-flowing',
        details: [
            { label: 'Pricing', value: 'P2.5 per Liter' },
            { label: 'Deliveries', value: 'On-demand' },
            { label: 'Billing', value: 'Pay based on consumption' },
        ]
    },
    {
        name: 'Flow Plan (P3/L)',
        price: 3, // Price per liter
        description: 'Pay based on consumption at P3 per liter.',
        recommended: false,
        isConsumptionBased: true,
        imageId: 'plan-enterprise-flowing',
        details: [
            { label: 'Pricing', value: 'P3 per Liter' },
            { label: 'Deliveries', value: 'On-demand' },
            { label: 'Billing', value: 'Pay based on consumption' },
        ]
    }
];

    
