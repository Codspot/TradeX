# TradeX API

A comprehensive stock management system API for MCD TradeX platform, integrated with Smart API from Angel One. Handles real-time data streaming with enterprise-grade database architecture. Built with NestJS, TypeScript, and PostgreSQL.

## 🚀 Features

- **Real-time Stock Data Management**: Handle 150 important stocks across multiple websockets
- **Smart API Integration**: Compatible with Angel One Smart API constraints
- **Distributed Architecture**: Support for multiple servers with 3 websockets each (50 stocks per websocket)
- **RESTful API**: Clean and well-documented endpoints with Swagger integration
- **Database Management**: PostgreSQL with TypeORM for robust data handling
- **Auto-seeding**: Automatic database population with important stocks data

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **PostgreSQL** (v13 or higher) - [Download here](https://www.postgresql.org/download/)
- **Git** - [Download here](https://git-scm.com/downloads)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Codspot/TradeX
cd tradeX-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. PostgreSQL Setup

#### Option A: Using PostgreSQL GUI (pgAdmin)

1. Install PostgreSQL and pgAdmin
2. Create a new database named `tradex_db`
3. Create a user `tradex_user` with superuser privileges
4. Set password for the user

#### Option B: Using Command Line

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database
CREATE DATABASE tradex_db;

# Create user with superuser privileges
CREATE USER tradex_user WITH SUPERUSER PASSWORD 'your_password_here';

# Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE tradex_db TO tradex_user;

# Exit PostgreSQL
\q
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=tradex_user
DB_PASSWORD=your_password_here
DB_NAME=tradex_db

# Application Configuration
PORT=5000
NODE_ENV=development

# Smart API Configuration (Angel One)
SMART_API_KEY=your_api_key_here
SMART_SECRET_KEY=your_secret_key_here
SMART_CLIENT_CODE=your_client_code_here
SMART_TOTP_SECRET=your_totp_secret_here
SMART_PASSWORD=your_password_here
SMART_ENVIRONMENT=PROD
```

### 5. Database Setup

The application will automatically:

- Create all necessary tables using TypeORM migrations
- Seed the database with:
  - 1 Server record with Smart API credentials
  - 3 WebSocket records (50 stocks capacity each)
  - 150 important stocks distributed across websockets

## 🚀 Running the Application

### Development Mode

```bash
npm run start:dev
```

### Production Mode

```bash
npm run build
npm run start:prod
```

### Watch Mode (Auto-restart on changes)

```bash
npm run start:dev
```

The application will be available at:

- **API Server**: http://localhost:5000
- **Swagger Documentation**: http://localhost:5000/api/docs

## 📊 Database Schema

### Entities Overview

1. **Server Entity**
   - Stores Smart API credentials and server information
   - UUID, server name, API keys, environment settings

2. **WebSocket Entity**
   - Manages websocket connections and capacity
   - Links to server, tracks current stock count (max 50 per websocket)

3. **Instrument Entity**
   - Contains stock/instrument details
   - Smart API tokens, trading symbols, exchange info

## 🔌 API Endpoints

### Core Endpoints (5 total)

| Method | Endpoint                                    | Description                                       |
| ------ | ------------------------------------------- | ------------------------------------------------- |
| GET    | `/api/instruments`                          | Get all instruments with pagination and filtering |
| GET    | `/api/instruments/:uuid`                    | Get specific instrument by UUID                   |
| GET    | `/api/instruments/websocket/:websocketUuid` | Get instruments by websocket                      |
| PUT    | `/api/instruments/:uuid`                    | Update instrument details                         |
| DELETE | `/api/instruments/:uuid`                    | Delete instrument                                 |

### Query Parameters for GET `/api/instruments`

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `exchange` (optional): Filter by exchange (NSE, BSE)
- `segment` (optional): Filter by segment (EQ, INDICES)
- `search` (optional): Search by trading symbol or name

### Example API Calls

```bash
# Get all instruments (paginated)
curl http://localhost:5000/api/instruments

# Get instruments with filtering
curl "http://localhost:5000/api/instruments?exchange=NSE&segment=EQ&page=1&limit=10"

# Search for specific stocks
curl "http://localhost:5000/api/instruments?search=RELIANCE"

# Get instruments by websocket
curl http://localhost:5000/api/instruments/websocket/{websocket-uuid}

# Get specific instrument
curl http://localhost:5000/api/instruments/{instrument-uuid}
```

## 📚 Important Stocks

The system comes pre-loaded with 150 carefully selected stocks covering:

- **Major Indices**: NIFTY 50, BANK NIFTY, SENSEX
- **Banking**: HDFC Bank, ICICI Bank, Kotak Bank, SBI, Axis Bank
- **IT**: TCS, Infosys, Wipro, HCL Tech, Tech Mahindra
- **FMCG**: Hindustan Unilever, ITC, Nestle, Britannia
- **Auto**: Maruti Suzuki, Tata Motors, M&M, Bajaj Auto
- **Pharma**: Sun Pharma, Dr. Reddy's, Cipla, Divi's Labs
- **And many more across all major sectors**

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

## 🐳 Docker Support

### Using Docker Compose (Recommended)

```bash
# Start all services (app + database)
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

### Manual Docker Build

```bash
# Build the image
docker build -t tradex-backend .

# Run the container
docker run -p 5000:5000 --env-file .env tradex-backend
```

## 🔧 Development

### Project Structure

```
src/
├── app/
│   ├── controller/           # API Controllers
│   ├── services/            # Business Logic
│   ├── repositories/        # Data Access Layer
│   ├── entities/            # Database Models
│   └── core/
│       └── dtos/            # Data Transfer Objects
├── config/                  # Configuration Files
│   ├── database.typeorm.ts  # Database Config
│   └── important-stocks.ts  # Stock Data
└── main.ts                  # Application Entry Point
```

### Adding New Stocks

1. Update `src/config/important-stocks.ts`
2. Add stock details with instrumentToken and exchangeToken
3. Restart the application (auto-seeding will handle the rest)

### Smart API Integration

The system is designed to work with Angel One Smart API constraints:

- Maximum 150 stocks per user
- Maximum 3 websockets per server
- Maximum 50 stocks per websocket

## 🔒 Security

- Environment variables for sensitive data
- Input validation using class-validator
- PostgreSQL parameterized queries
- CORS configuration for production

## 📈 Monitoring & Logging

- Built-in NestJS logging
- Database query logging (configurable)
- Error handling and validation
- Health check endpoints

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Swagger Documentation](http://localhost:5000/api/docs)
2. Review the console logs for error messages
3. Ensure PostgreSQL is running and accessible
4. Verify environment variables are correctly set

## 🔗 Related Links

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Angel One Smart API](https://smartapi.angelbroking.com/)

---

**TradeX Backend System for MCD TradeX** - Built with ❤️ using NestJS and TypeScript
