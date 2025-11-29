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
    }
]
