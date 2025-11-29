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

export const commercialPlans = [
    {
        name: 'Growth',
        price: 9000,
        liters: '3,000',
        refillFrequency: '4-5/week',
        employees: '40 - 70',
        stations: '2',
        recommended: false,
    },
    {
        name: 'Pro',
        price: 12000,
        liters: '4,000',
        refillFrequency: '5-6/week',
        employees: '70 - 100',
        stations: '2-3',
        recommended: true,
    },
    {
        name: 'Business',
        price: 18000,
        liters: '6,000',
        refillFrequency: 'Daily',
        employees: '100 - 150',
        stations: '2-3',
        recommended: false,
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
];

export const corporatePlans = [
    {
        name: 'Enterprise Basic',
        price: 30000,
        liters: '10,000',
        refillFrequency: '1-2/day',
        employees: '150 - 250',
        stations: '2-3',
        recommended: false,
    },
    {
        name: 'Enterprise Plus',
        price: 50000,
        liters: '16,600',
        refillFrequency: '2-3/day',
        employees: '250 - 350',
        stations: '2-3',
        recommended: true,
    },
    {
        name: 'Enterprise Elite',
        price: 75000,
        liters: '25,000',
        refillFrequency: '3+/day',
        employees: '350 - 500',
        stations: '3-4',
        recommended: false,
    },
    {
        name: 'Enterprise Pro',
        price: 100000,
        liters: '33,000+',
        refillFrequency: 'Continuous',
        employees: '500+',
        stations: '5+',
        recommended: false,
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
            'Tailored pricing based on high-volume needs',
            'Dedicated account manager and support',
            'Advanced analytics and reporting',
            'Contact us for a personalized quote'
        ]
    },
    {
        name: 'Flowing Plan',
        price: 0,
        description: 'For pure usage-based, pay-as-you-go enterprise clients.',
        recommended: false,
        imageId: 'plan-enterprise-flowing',
        details: [
            'Pay only for what you consume',
            'Ideal for fluctuating water needs',
            'Flexible and transparent billing',
            'Contact us for a personalized quote'
        ]
    }
];
