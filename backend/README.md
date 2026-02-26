# Study Platform Backend

## Phase 1: Foundation (Completed)

This is the Spring Boot backend for the AI-Powered Study Platform.

### Prerequisites

- Java 21 JDK
- Maven 3.8+
- MongoDB (local or Docker)
- Node.js 20+ (for frontend)

### Project Structure

```
backend/
├── src/main/java/com/study/
│   ├── config/          # Security and Web configs
│   ├── controller/        # REST API controllers
│   ├── dto/              # Data Transfer Objects
│   ├── exception/         # Global exception handlers
│   ├── model/            # MongoDB entities
│   ├── repository/       # MongoDB repositories
│   ├── security/         # JWT and authentication
│   ├── service/          # Business logic
│   └── StudyPlatformApplication.java
├── src/main/resources/
│   └── application.yml
├── pom.xml
└── README.md
```

### Setup Instructions

#### 1. Start MongoDB

**Option A: Using Docker (Recommended)**
```bash
docker-compose up -d mongodb
```

**Option B: Local MongoDB**
- Install MongoDB from https://www.mongodb.com/try/download/community
- Start MongoDB service
- Default connection: mongodb://localhost:27017

#### 2. Configure Environment

Create `.env` file in `backend/` directory:
```env
# Copy from .env.example
cp .env.example .env

# Edit as needed
JWT_SECRET=your-super-secret-key-here
```

#### 3. Build and Run

```bash
# Build the project
mvn clean install

# Run the application
mvn spring-boot:run
```

The API will be available at: `http://localhost:8080/api`

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/health` - Health check

#### User Management
- `GET /api/users/me` - Get current user profile (JWT required)
- `PUT /api/users/me` - Update profile (JWT required)
- `PUT /api/users/me/preferences` - Update learning preferences (JWT required)

### Testing the API

#### 1. Health Check
```bash
curl http://localhost:8080/api/auth/health
```

#### 2. Register User
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 3. Login User
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "johndoe",
    "password": "password123"
  }'
```

#### 4. Get User Profile (with JWT)
```bash
curl http://localhost:8080/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Features Implemented (Phase 1)

✅ Spring Boot 3.x with Java 21
✅ MongoDB integration with Spring Data
✅ JWT Authentication
✅ User registration and login
✅ Password encryption (BCrypt)
✅ User profile management
✅ Global exception handling
✅ CORS configuration
✅ Input validation
✅ Learning preferences tracking

### Next Steps (Phase 2)

- NVIDIA AI API integration
- RAG system implementation
- Vector search with MongoDB
- AI roadmap generation

### Troubleshooting

**MongoDB Connection Error:**
```
Make sure MongoDB is running on localhost:27017
```

**JWT Secret Error:**
```
The JWT secret must be at least 32 characters when base64 encoded
```

**Port Already in Use:**
```
Change SERVER_PORT in .env or application.yml
```

### Security Notes

- JWT tokens expire after 24 hours
- Passwords are encrypted with BCrypt
- CORS is configured for localhost development
- In production, update CORS origins and JWT secret

---

Built with Spring Boot 3.x, MongoDB, and JWT
