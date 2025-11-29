export const clientTypes = [
    { name: 'Family', price: 50, description: 'For families and personal home use', imageId: 'plan-family' },
    { name: 'SME', price: 100, description: 'For small teams, kiosks, and home offices', imageId: 'plan-sme' },
    { name: 'Commercial', price: 150, description: 'For growing offices and warehouses', imageId: 'plan-commercial' },
    { name: 'Corporate', price: 250, description: 'For multi-site companies and BPOs', imageId: 'plan-corporate' },
    { name: 'Enterprise', price: 500, description: 'Customize and pay based on consumption', imageId: 'plan-enterprise' },
];

export const familyPlans = [
    {
        name: 'Starter',
        price: 599,
        liters: '250',
        refillFrequency: '1/week',
        persons: '1-3',
        gallons: '~3',
        recommended: false,
    },
    {
        name: 'Family',
        price: 999,
        liters: '400',
        refillFrequency: '1-2/week',
        persons: '3-5',
        gallons: '~5',
        recommended: true,
    },
    {
        name: 'Customize Your Plan',
        price: 2.50,
        liters: 'Custom',
        refillFrequency: 'Custom',
        persons: '1-5+',
        gallons: 'Custom',
        recommended: false,
        details: [
            'Priced at ₱2.50 per liter',
            'Perfect for unique consumption needs',
            'All standard benefits included'
        ]
    }
]

export const smePlans = [
    {
        name: 'Micro',
        price: 1500,
        liters: '500',
        refillFrequency: '1-2/week',
        employees: '5 - 10',
        stations: '1',
        recommended: false,
    },
    {
        name: 'Starter',
        price: 3000,
        liters: '1,000',
        refillFrequency: '2-3/week',
        employees: '10 - 20',
        stations: '1',
        recommended: false,
    },
    {
        name: 'Professional',
        price: 6000,
        liters: '2,000',
        refillFrequency: '3-4/week',
        employees: '20 - 40',
        stations: '1',
        recommended: true,
    },
    {
        name: 'Customize Your Plan',
        price: 3.00,
        liters: 'Custom',
        refillFrequency: 'Custom',
        employees: 'Custom',
        stations: 'Custom',
        recommended: false,
        details: [
            'Priced at ₱3.00 per liter',
            'Perfect for unique consumption needs',
            'All standard benefits included'
        ]
    }
]
