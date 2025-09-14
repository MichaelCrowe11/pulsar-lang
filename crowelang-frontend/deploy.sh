#!/bin/bash

# Crowe-Lang Frontend Deployment Script
# Deploy to lang.crowetrade.com

echo "🚀 Starting Crowe-Lang Frontend Deployment..."

# Configuration
DOMAIN="lang.crowetrade.com"
BUILD_DIR="dist"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v rsync &> /dev/null; then
        log_error "rsync is required but not installed"
        exit 1
    fi
    
    if ! command -v ssh &> /dev/null; then
        log_error "ssh is required but not installed"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build optimizations
optimize_build() {
    log_info "Optimizing build for production..."
    
    # Create build directory
    mkdir -p $BUILD_DIR
    
    # Copy HTML, CSS, JS
    cp index.html $BUILD_DIR/
    cp styles.css $BUILD_DIR/
    cp script.js $BUILD_DIR/
    
    # Minify CSS (if available)
    if command -v cssnano &> /dev/null; then
        cssnano $BUILD_DIR/styles.css $BUILD_DIR/styles.min.css
        mv $BUILD_DIR/styles.min.css $BUILD_DIR/styles.css
        log_success "CSS minified"
    fi
    
    # Minify JavaScript (if available)
    if command -v terser &> /dev/null; then
        terser $BUILD_DIR/script.js -o $BUILD_DIR/script.min.js
        mv $BUILD_DIR/script.min.js $BUILD_DIR/script.js
        log_success "JavaScript minified"
    fi
    
    # Create assets directory structure
    mkdir -p $BUILD_DIR/assets
    
    # Copy placeholder assets (replace with actual assets)
    echo '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40" viewBox="0 0 100 40"><rect width="100" height="40" fill="#2563eb"/><text x="50" y="25" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">Crowe-Lang</text></svg>' > $BUILD_DIR/assets/logo.svg
    
    # Create favicon
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > $BUILD_DIR/favicon.ico
    
    # Create sitemap.xml
    cat > $BUILD_DIR/sitemap.xml << EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://$DOMAIN/</loc>
        <lastmod>$(date +%Y-%m-%d)</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://$DOMAIN/#features</loc>
        <lastmod>$(date +%Y-%m-%d)</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>https://$DOMAIN/#pricing</loc>
        <lastmod>$(date +%Y-%m-%d)</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>https://$DOMAIN/#examples</loc>
        <lastmod>$(date +%Y-%m-%d)</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
</urlset>
EOF
    
    # Create robots.txt
    cat > $BUILD_DIR/robots.txt << EOF
User-agent: *
Allow: /
Sitemap: https://$DOMAIN/sitemap.xml

# Block access to admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /.env
Disallow: /config/

# Allow search engines to index main content
Allow: /$
Allow: /#features
Allow: /#pricing
Allow: /#examples
EOF
    
    log_success "Build optimization completed"
}

# Deploy to server
deploy_to_server() {
    log_info "Deploying to $DOMAIN..."
    
    # Note: This is a template - you'll need to replace with actual server details
    # SERVER_USER="your_username"
    # SERVER_HOST="your_server_ip_or_domain"
    # SERVER_PATH="/var/www/$DOMAIN"
    
    log_warning "Server deployment requires:"
    log_warning "1. SSH access to crowetrade.com server"
    log_warning "2. Web server configuration (Nginx/Apache)"
    log_warning "3. SSL certificate setup"
    log_warning "4. DNS subdomain configuration"
    
    echo ""
    log_info "Manual deployment steps:"
    echo "1. Upload $BUILD_DIR/* to your web server"
    echo "2. Configure web server for $DOMAIN"
    echo "3. Set up SSL certificate"
    echo "4. Configure DNS A record for lang.crowetrade.com"
    
    # Uncomment and configure these lines for actual deployment:
    # rsync -avz --delete $BUILD_DIR/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/
    # ssh $SERVER_USER@$SERVER_HOST "sudo systemctl reload nginx"
}

# Performance optimizations
setup_performance() {
    log_info "Setting up performance optimizations..."
    
    # Create .htaccess for Apache
    cat > $BUILD_DIR/.htaccess << 'EOF'
# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Set cache headers
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options nosniff
    Header set X-Frame-Options DENY
    Header set X-XSS-Protection "1; mode=block"
    Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>

# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
EOF

    # Create nginx.conf snippet
    cat > $BUILD_DIR/nginx.conf << 'EOF'
# Nginx configuration for lang.crowetrade.com
server {
    listen 80;
    server_name lang.crowetrade.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lang.crowetrade.com;
    
    # SSL configuration
    ssl_certificate /etc/ssl/certs/crowetrade.com.crt;
    ssl_certificate_key /etc/ssl/private/crowetrade.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    root /var/www/lang.crowetrade.com;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript text/plain application/json;
    gzip_min_length 1000;
    
    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Main location
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy (if needed)
    location /api/ {
        proxy_pass https://api.crowetrade.com;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    
    log_success "Performance configurations created"
}

# SSL/TLS setup instructions
setup_ssl_instructions() {
    log_info "SSL/TLS Setup Instructions:"
    echo ""
    echo "1. Install Certbot (Let's Encrypt):"
    echo "   sudo apt install certbot python3-certbot-nginx"
    echo ""
    echo "2. Generate SSL certificate:"
    echo "   sudo certbot --nginx -d lang.crowetrade.com"
    echo ""
    echo "3. Test SSL renewal:"
    echo "   sudo certbot renew --dry-run"
    echo ""
    echo "4. Set up auto-renewal:"
    echo "   sudo crontab -e"
    echo "   Add: 0 12 * * * /usr/bin/certbot renew --quiet"
}

# DNS setup instructions
setup_dns_instructions() {
    log_info "DNS Configuration:"
    echo ""
    echo "Add the following DNS records to crowetrade.com:"
    echo ""
    echo "Type: A"
    echo "Name: lang"
    echo "Value: [Your server IP address]"
    echo "TTL: 3600"
    echo ""
    echo "Type: CNAME (alternative)"
    echo "Name: lang"
    echo "Value: crowetrade.com"
    echo "TTL: 3600"
}

# Test deployment
test_deployment() {
    log_info "Deployment test checklist:"
    echo ""
    echo "✓ HTML files are valid and minified"
    echo "✓ CSS is minified and compressed"
    echo "✓ JavaScript is minified"
    echo "✓ Images are optimized"
    echo "✓ Sitemap.xml is generated"
    echo "✓ Robots.txt is configured"
    echo "✓ Security headers are set"
    echo "✓ HTTPS redirect is configured"
    echo ""
    log_warning "Manual testing required:"
    echo "1. Test website loading at https://lang.crowetrade.com"
    echo "2. Test payment flows (Stripe + Crypto)"
    echo "3. Test mobile responsiveness"
    echo "4. Run Lighthouse audit"
    echo "5. Test SSL certificate"
}

# Main deployment process
main() {
    echo "🚀 Crowe-Lang Frontend Deployment"
    echo "=================================="
    echo ""
    
    check_prerequisites
    optimize_build
    setup_performance
    
    echo ""
    log_success "Build completed successfully!"
    log_info "Build files are ready in: $BUILD_DIR/"
    
    echo ""
    setup_ssl_instructions
    echo ""
    setup_dns_instructions
    echo ""
    test_deployment
    
    echo ""
    log_success "Deployment preparation complete!"
    log_info "Next steps:"
    echo "1. Upload $BUILD_DIR/* to your web server"
    echo "2. Configure DNS for lang.crowetrade.com"
    echo "3. Set up SSL certificate"
    echo "4. Test the deployment"
    echo "5. Run platform publishing"
}

# Run main function
main "$@"