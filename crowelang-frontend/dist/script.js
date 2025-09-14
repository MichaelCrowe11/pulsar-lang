// Crowe-Lang Landing Page JavaScript

// Global Configuration
const CONFIG = {
    API_BASE_URL: 'https://api.crowetrade.com',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_51234567890', // Replace with actual key
    PRICING: {
        personal: { monthly: 9, annual: 99 },
        professional: { monthly: 49, annual: 499 },
        team: { monthly: 199, annual: 1999 }
    }
};

// DOM Elements
const elements = {
    navToggle: document.querySelector('.nav-toggle'),
    navMenu: document.querySelector('.nav-menu'),
    pricingToggle: document.getElementById('pricing-toggle'),
    modals: document.querySelectorAll('.modal'),
    signupForm: document.getElementById('signup-form')
};

// State Management
let state = {
    isAnnualPricing: false,
    currentExample: 'web-server',
    user: null,
    stripe: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Initializing Crowe-Lang Landing Page...');
    
    // Initialize Stripe
    if (typeof Stripe !== 'undefined') {
        state.stripe = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize components
    initializePricing();
    initializeExamples();
    initializeAnimations();
    
    console.log('✅ Application initialized successfully');
}

function setupEventListeners() {
    // Mobile navigation
    if (elements.navToggle) {
        elements.navToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Pricing toggle
    if (elements.pricingToggle) {
        elements.pricingToggle.addEventListener('change', togglePricing);
    }
    
    // Form submissions
    if (elements.signupForm) {
        elements.signupForm.addEventListener('submit', handleSignup);
    }
    
    // Close modals on outside click
    elements.modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal(modal.id.replace('-modal', ''));
            }
        });
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.feature-card, .pricing-card, .example-content').forEach(el => {
        observer.observe(el);
    });
}

// Navigation Functions
function toggleMobileMenu() {
    elements.navMenu.classList.toggle('active');
    elements.navToggle.classList.toggle('active');
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Pricing Functions
function initializePricing() {
    updatePricingDisplay();
}

function togglePricing() {
    state.isAnnualPricing = elements.pricingToggle.checked;
    updatePricingDisplay();
    
    // Analytics
    trackEvent('pricing_toggle', {
        billing_cycle: state.isAnnualPricing ? 'annual' : 'monthly'
    });
}

function updatePricingDisplay() {
    const monthlyElements = document.querySelectorAll('.monthly');
    const annualElements = document.querySelectorAll('.annual');
    
    monthlyElements.forEach(el => {
        el.style.display = state.isAnnualPricing ? 'none' : 'inline';
    });
    
    annualElements.forEach(el => {
        el.style.display = state.isAnnualPricing ? 'inline' : 'none';
    });
    
    // Update pricing amounts
    Object.keys(CONFIG.PRICING).forEach(plan => {
        const priceElement = document.querySelector(`[data-plan="${plan}"] .amount`);
        if (priceElement) {
            const amount = state.isAnnualPricing 
                ? Math.round(CONFIG.PRICING[plan].annual / 12)
                : CONFIG.PRICING[plan].monthly;
            priceElement.textContent = amount;
        }
    });
}

// Example Functions
function initializeExamples() {
    // Set initial active example
    switchExample(state.currentExample);
}

function switchExample(exampleId) {
    // Update state
    state.currentExample = exampleId;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="switchExample('${exampleId}')"]`).classList.add('active');
    
    // Update example content
    document.querySelectorAll('.example-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(exampleId).classList.add('active');
    
    // Re-highlight syntax
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
    
    // Analytics
    trackEvent('example_view', { example: exampleId });
}

// Modal Functions
function openModal(modalType) {
    const modal = document.getElementById(`${modalType}-modal`);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Analytics
        trackEvent('modal_open', { modal_type: modalType });
    }
}

function closeModal(modalType) {
    const modal = document.getElementById(`${modalType}-modal`);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Analytics
        trackEvent('modal_close', { modal_type: modalType });
    }
}

// Payment Functions
async function openPaymentModal(plan, paymentMethod) {
    const modal = document.getElementById('payment-modal');
    const content = document.getElementById('payment-content');
    
    if (!modal || !content) return;
    
    // Show loading state
    content.innerHTML = '<div class="loading">Setting up payment...</div>';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    try {
        if (paymentMethod === 'stripe') {
            await setupStripePayment(plan);
        } else if (paymentMethod === 'crypto') {
            await setupCryptoPayment(plan);
        }
        
        // Analytics
        trackEvent('payment_modal_open', { 
            plan: plan, 
            payment_method: paymentMethod 
        });
        
    } catch (error) {
        console.error('Payment setup error:', error);
        content.innerHTML = `
            <h3>Payment Setup Error</h3>
            <p>Unable to set up payment. Please try again or contact support.</p>
            <button class="cta-button secondary" onclick="closeModal('payment')">Close</button>
        `;
    }
}

async function setupStripePayment(plan) {
    if (!state.stripe) {
        throw new Error('Stripe not initialized');
    }
    
    const content = document.getElementById('payment-content');
    const billingCycle = state.isAnnualPricing ? 'annual' : 'monthly';
    
    content.innerHTML = `
        <h3>Complete Your Purchase</h3>
        <div class="payment-summary">
            <h4>${capitalizeFirst(plan)} Plan</h4>
            <p>Billed ${billingCycle}ly</p>
            <div class="price-display">
                $${getPriceForPlan(plan, billingCycle)}/${billingCycle === 'annual' ? 'year' : 'month'}
            </div>
        </div>
        
        <form id="stripe-payment-form">
            <div id="card-element"></div>
            <div id="card-errors" role="alert"></div>
            <button type="submit" class="cta-button primary" id="submit-payment">
                Complete Payment
            </button>
        </form>
        
        <p class="payment-note">
            Secure payment powered by Stripe. Your card details are never stored on our servers.
        </p>
    `;
    
    // Initialize Stripe Elements
    const elements = state.stripe.elements();
    const cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
        },
    });
    
    cardElement.mount('#card-element');
    
    // Handle form submission
    const form = document.getElementById('stripe-payment-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const submitButton = document.getElementById('submit-payment');
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';
        
        try {
            // Create checkout session
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/payment/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getUserToken()}`
                },
                body: JSON.stringify({
                    plan: plan,
                    billing_cycle: billingCycle,
                    success_url: `${window.location.origin}/dashboard?success=true`,
                    cancel_url: `${window.location.origin}/pricing?canceled=true`
                })
            });
            
            const session = await response.json();
            
            if (session.checkout_url) {
                // Redirect to Stripe Checkout
                window.location.href = session.checkout_url;
            } else {
                throw new Error('Failed to create checkout session');
            }
            
        } catch (error) {
            console.error('Payment error:', error);
            document.getElementById('card-errors').textContent = 
                'Payment failed. Please try again or contact support.';
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Complete Payment';
        }
    });
}

async function setupCryptoPayment(plan) {
    const content = document.getElementById('payment-content');
    const billingCycle = state.isAnnualPricing ? 'annual' : 'monthly';
    
    content.innerHTML = `
        <h3>Pay with Cryptocurrency</h3>
        <div class="payment-summary">
            <h4>${capitalizeFirst(plan)} Plan</h4>
            <p>Billed ${billingCycle}ly</p>
            <div class="price-display">
                $${getPriceForPlan(plan, billingCycle)} USD
            </div>
        </div>
        
        <div class="crypto-info">
            <p>✅ Bitcoin, Ethereum, Litecoin, and more</p>
            <p>✅ Secure blockchain payments</p>
            <p>✅ No chargebacks or reversals</p>
        </div>
        
        <button class="cta-button crypto" onclick="createCryptoCharge('${plan}')">
            Continue with Crypto Payment
        </button>
        
        <p class="payment-note">
            You'll be redirected to Coinbase Commerce to complete your crypto payment securely.
        </p>
    `;
}

async function createCryptoCharge(plan) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/crypto/create-charge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getUserToken()}`
            },
            body: JSON.stringify({ plan: plan })
        });
        
        const result = await response.json();
        
        if (result.success && result.charge.hosted_url) {
            // Redirect to Coinbase Commerce
            window.location.href = result.charge.hosted_url;
        } else {
            throw new Error('Failed to create crypto charge');
        }
        
    } catch (error) {
        console.error('Crypto payment error:', error);
        alert('Failed to create crypto payment. Please try again.');
    }
}

// User Authentication Functions
async function handleSignup(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Creating Account...';
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password'),
                company: formData.get('company')
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Store user token
            localStorage.setItem('crowe_lang_token', result.token);
            state.user = result.user;
            
            // Close modal and show success
            closeModal('signup');
            showNotification('Account created successfully! Welcome to Crowe-Lang!', 'success');
            
            // Analytics
            trackEvent('signup_success', { user_id: result.user.id });
            
            // Redirect to dashboard or show next steps
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Signup failed');
        }
        
    } catch (error) {
        console.error('Signup error:', error);
        showNotification(error.message || 'Signup failed. Please try again.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Create Free Account';
    }
}

// Utility Functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getPriceForPlan(plan, billingCycle) {
    if (!CONFIG.PRICING[plan]) return 0;
    
    return billingCycle === 'annual' 
        ? CONFIG.PRICING[plan].annual 
        : CONFIG.PRICING[plan].monthly;
}

function getUserToken() {
    return localStorage.getItem('crowe_lang_token') || '';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            ${message}
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Close button handler
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
}

function trackEvent(eventName, properties = {}) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, properties);
    }
    
    // Console log for development
    console.log('📊 Event:', eventName, properties);
}

// Animation Functions
function initializeAnimations() {
    // Add entrance animations to elements
    const animatedElements = document.querySelectorAll(
        '.hero-content, .feature-card, .pricing-card'
    );
    
    animatedElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.1}s`;
    });
}

// Performance Monitoring
function initializePerformanceMonitoring() {
    // Monitor Core Web Vitals
    if ('web-vital' in window) {
        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);
    }
    
    // Monitor page load time
    window.addEventListener('load', () => {
        const loadTime = performance.now();
        trackEvent('page_load_time', { 
            load_time: Math.round(loadTime),
            page: window.location.pathname 
        });
    });
}

// Error Handling
window.addEventListener('error', (error) => {
    console.error('JavaScript Error:', error);
    
    trackEvent('javascript_error', {
        message: error.message,
        filename: error.filename,
        line: error.lineno,
        column: error.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    trackEvent('promise_rejection', {
        reason: event.reason?.message || String(event.reason)
    });
});

// Export functions for global access
window.CroweLang = {
    openModal,
    closeModal,
    switchExample,
    toggleMobileMenu,
    scrollToSection,
    openPaymentModal,
    createCryptoCharge,
    showNotification,
    trackEvent
};

console.log('🎯 Crowe-Lang Landing Page JavaScript Loaded Successfully');

// Additional CSS for notifications
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-success {
        border-left: 4px solid #10b981;
    }
    
    .notification-error {
        border-left: 4px solid #ef4444;
    }
    
    .notification-info {
        border-left: 4px solid #3b82f6;
    }
    
    .notification-content {
        padding: 16px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #64748b;
        padding: 0;
        margin: 0;
        line-height: 1;
    }
    
    .notification-close:hover {
        color: #334155;
    }
`;

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);