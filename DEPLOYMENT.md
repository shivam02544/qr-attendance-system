# Deployment Guide

This guide covers different deployment options for the QR Attendance System.

## 🚀 Quick Deploy Options

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables
   - Deploy automatically

3. **Environment Variables**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/qr-attendance-system
   NEXTAUTH_URL=https://YOUR_DOMAIN.vercel.app
   NEXTAUTH_SECRET=your-production-secret-key
   ```

### Netlify

1. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`

2. **Environment Variables**
   Same as Vercel configuration

## 🐳 Docker Deployment

### Using Docker Compose

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - MONGODB_URI=mongodb://mongo:27017/qr-attendance-system
         - NEXTAUTH_URL=http://localhost:3000
         - NEXTAUTH_SECRET=your-secret-key
       depends_on:
         - mongo
     
     mongo:
       image: mongo:latest
       ports:
         - "27017:27017"
       volumes:
         - mongo_data:/data/db
   
   volumes:
     mongo_data:
   ```

2. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   
   CMD ["npm", "start"]
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   ```

## ☁️ Cloud Platforms

### AWS (EC2 + RDS)

1. **Launch EC2 Instance**
   - Choose Ubuntu 20.04 LTS
   - Configure security groups (ports 22, 80, 443, 3000)

2. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install nodejs npm nginx
   ```

3. **Setup Application**
   ```bash
   git clone your-repo
   cd qr-attendance-system
   npm install
   npm run build
   ```

4. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Setup PM2**
   ```bash
   npm install -g pm2
   pm2 start npm --name "qr-attendance" -- start
   pm2 startup
   pm2 save
   ```

### Google Cloud Platform

1. **App Engine Deployment**
   ```yaml
   # app.yaml
   runtime: nodejs18
   
   env_variables:
     MONGODB_URI: "your-mongodb-uri"
     NEXTAUTH_URL: "https://your-app.appspot.com"
     NEXTAUTH_SECRET: "your-secret"
   ```

2. **Deploy**
   ```bash
   gcloud app deploy
   ```

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

1. **Create Cluster**
   - Visit [MongoDB Atlas](https://cloud.mongodb.com)
   - Create new cluster
   - Configure network access
   - Create database user

2. **Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/qr-attendance-system?retryWrites=true&w=majority
   ```

### Self-Hosted MongoDB

1. **Install MongoDB**
   ```bash
   # Ubuntu
   sudo apt install mongodb
   
   # macOS
   brew install mongodb-community
   ```

2. **Configure**
   ```bash
   # Start service
   sudo systemctl start mongod
   
   # Enable on boot
   sudo systemctl enable mongod
   ```

## 🔒 Security Considerations

### Production Environment Variables

```env
# Strong secret key (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-very-strong-secret-key-here

# Production MongoDB URI with authentication
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/production-db

# Production URL
NEXTAUTH_URL=https://your-production-domain.com

# Optional: Additional security
NODE_ENV=production
```

### SSL/HTTPS Setup

1. **Let's Encrypt (Free)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

2. **Cloudflare (Recommended)**
   - Add your domain to Cloudflare
   - Enable SSL/TLS encryption
   - Configure DNS records

### Security Headers

Ensure these headers are set (handled by Helmet.js):
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`
- `Content-Security-Policy`

## 📊 Monitoring & Logging

### Application Monitoring

1. **Vercel Analytics**
   - Built-in for Vercel deployments
   - Real-time performance metrics

2. **Custom Logging**
   ```javascript
   // Add to your app
   import winston from 'winston';
   
   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.File({ filename: 'error.log', level: 'error' }),
       new winston.transports.File({ filename: 'combined.log' })
     ]
   });
   ```

### Database Monitoring

1. **MongoDB Atlas Monitoring**
   - Built-in performance advisor
   - Real-time metrics
   - Automated alerts

2. **Self-Hosted Monitoring**
   ```bash
   # MongoDB Compass for GUI
   # Or use mongostat for CLI monitoring
   mongostat --host localhost:27017
   ```

## 🔄 CI/CD Pipeline

### GitHub Actions (Included)

The project includes a CI/CD pipeline that:
- Runs tests on multiple Node.js versions
- Performs security audits
- Builds the application
- Can be extended for automatic deployment

### Extending for Auto-Deploy

Add to `.github/workflows/ci.yml`:
```yaml
deploy:
  needs: test
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  
  steps:
  - name: Deploy to Vercel
    uses: amondnet/vercel-action@v20
    with:
      vercel-token: ${{ secrets.VERCEL_TOKEN }}
      vercel-org-id: ${{ secrets.ORG_ID }}
      vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and reinstall
   rm -rf .next node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Database Connection Issues**
   ```bash
   # Test connection
   npm run test-db
   ```

3. **Environment Variables**
   ```bash
   # Verify variables are loaded
   node -e "console.log(process.env.MONGODB_URI)"
   ```

### Performance Optimization

1. **Enable Compression**
   ```javascript
   // next.config.mjs
   const nextConfig = {
     compress: true,
     poweredByHeader: false
   };
   ```

2. **Database Indexing**
   ```javascript
   // Add indexes for better performance
   db.users.createIndex({ email: 1 });
   db.attendancerecords.createIndex({ session: 1, student: 1 });
   ```

## 📞 Support

If you encounter deployment issues:
1. Check the [troubleshooting section](#-troubleshooting)
2. Review application logs
3. Check database connectivity
4. Verify environment variables
5. Create an issue on GitHub with deployment details