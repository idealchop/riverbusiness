
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
        price: 0,
        recommended: false,
        details: [
            'Details to be configured by admin'
        ]
    },
    {
        name: 'Family',
        price: 0,
        recommended: true,
         details: [
            'Details to be configured by admin'
        ]
    },
    {
        name: 'Customize Your Plan',
        price: 0,
        recommended: false,
        details: [
            'Tailored for unique consumption needs',
            'All standard benefits included'
        ]
    }
]

export const smePlans = [
    {
        name: 'Micro',
        price: 0,
        recommended: false,
         details: [
            'Details to be configured by admin'
        ]
    },
    {
        name: 'Starter',
        price: 0,
        recommended: false,
         details: [
            'Details to be configured by admin'
        ]
    },
    {
        name: 'Professional',
        price: 0,
        recommended: true,
         details: [
            'Details to be configured by admin'
        ]
    },
    {
        name: 'Customize Your Plan',
        price: 0,
        recommended: false,
        details: [
            'Tailored for unique consumption needs',
            'All standard benefits included'
        ]
    }
]

export const commercialPlans = [
    {
        name: 'Growth',
        price: 0,
        recommended: false,
         details: [
            'Details to be configured by admin'
        ]
    },
    {
        name: 'Pro',
        price: 0,
        recommended: true,
         details: [
            'Details to be configured by admin'
        ]
    },
    {
        name: 'Business',
        price: 0,
        recommended: false,
         details: [
            'Details to be configured by admin'
        ]
    },
    {
        name: 'Customize Your Plan',
        price: 0,
        recommended: false,
        details: [
            'Tailored for unique consumption needs',
            'All standard benefits included'
        ]
    }
];

export const corporatePlans = [
    {
        name: 'Enterprise Basic',
        price: 0,
        recommended: false,
         details: [
            'Details to be configured by admin'
        ]
    },
    {
        name: 'Enterprise Plus',
        price: 0,
        recommended: true,
         details: [
            'Details to be configured by admin'
        ]
    },
    {
        name: 'Enterprise Elite',
        price: 0,
        recommended: false,
         details: [
            'Details to be configured by admin'
        ]
    },
    {
        name: 'Enterprise Pro',
        price: 0,
        recommended: false,
         details: [
            'Details to be configured by admin'
        ]
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
            'Tailored for high-volume needs',
            'Dedicated account manager and support',
            'Advanced analytics and reporting'
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
            'Flexible and transparent billing'
        ]
    }
];
