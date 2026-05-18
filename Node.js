const express = require('express');
const cors = require('cors');
const stripe = require('stripe')('sk_test_51RtbUJA6P6n1uuusI9CIvrcC7SrO4bhttfXZA3b2mFXwc29T5eXp41bxhb72nwSl5WpITIyO2fbV1iLPOjvnLNuf00bbfOYBNd');
const app = express();

app.use(cors());
app.use(express.json());

// Create payment intent
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency, customerId, paymentMethodId } = req.body;
        
        // Create or retrieve customer
        let customer;
        if (customerId) {
            customer = await stripe.customers.retrieve(customerId);
        } else {
            customer = await stripe.customers.create({
                payment_method: paymentMethodId,
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
        }
        
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency || 'eur',
            customer: customer.id,
            payment_method: paymentMethodId,
            confirm: true,
            off_session: true,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never',
            },
        });
        
        res.json({
            success: true,
            paymentIntent: paymentIntent,
            customerId: customer.id
        });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Create setup intent for saving payment method
app.post('/api/create-setup-intent', async (req, res) => {
    try {
        const { customerId } = req.body;
        
        const setupIntent = await stripe.setupIntents.create({
            customer: customerId,
            payment_method_types: ['card'],
        });
        
        res.json({
            success: true,
            clientSecret: setupIntent.client_secret
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Get customer payment methods
app.get('/api/payment-methods/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });
        
        res.json({
            success: true,
            paymentMethods: paymentMethods.data
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Refund payment
app.post('/api/refund-payment', async (req, res) => {
    try {
        const { paymentIntentId } = req.body;
        
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
        });
        
        res.json({
            success: true,
            refund: refund
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});