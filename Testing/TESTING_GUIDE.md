# Study Platform - API Testing Guide

## Quick Test Commands (Windows CMD)

### 1. Health Check
```cmd
curl -X GET http://localhost:8080/api/auth/health
```

### 2. Register User
```cmd
curl -X POST http://localhost:8080/api/auth/register -H "Content-Type: application/json" -d "{\"fullName\":\"Test User\",\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

### 3. Login User
```cmd
curl -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d "{\"usernameOrEmail\":\"testuser\",\"password\":\"password123\"}"
```

### 4. Get User Profile (requires JWT token)
Replace `YOUR_TOKEN_HERE` with the token from login response:
```cmd
curl -X GET http://localhost:8080/api/users/me -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Update Profile
```cmd
curl -X PUT http://localhost:8080/api/users/me -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN_HERE" -d "{\"fullName\":\"Updated Name\",\"learningGoal\":\"Learn AI\",\"currentLevel\":\"beginner\"}"
```

## Using Postman (Recommended)

1. **Import these requests:**

### Register
- **Method:** POST
- **URL:** `http://localhost:8080/api/auth/register`
- **Headers:** Content-Type: application/json
- **Body (raw JSON):**
```json
{
  "fullName": "Test User",
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

### Login
- **Method:** POST
- **URL:** `http://localhost:8080/api/auth/login`
- **Headers:** Content-Type: application/json
- **Body (raw JSON):**
```json
{
  "usernameOrEmail": "testuser",
  "password": "password123"
}
```

### Get Profile (Authenticated)
- **Method:** GET
- **URL:** `http://localhost:8080/api/users/me`
- **Headers:** 
  - Content-Type: application/json
  - Authorization: Bearer YOUR_TOKEN_HERE

## Alternative: Using HTTPie

If you have HTTPie installed:

```bash
# Health check
http GET localhost:8080/api/auth/health

# Register
http POST localhost:8080/api/auth/register fullName="Test User" username="testuser" email="test@example.com" password="password123"

# Login
http POST localhost:8080/api/auth/login usernameOrEmail="testuser" password="password123"

# Get profile (replace TOKEN)
http GET localhost:8080/api/users/me Authorization:"Bearer TOKEN"
```

## Expected Responses

### Health Check (Success)
```json
{
  "success": true,
  "message": "Service is running",
  "data": null
}
```

### Register (Success)
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "type": "Bearer",
  "id": "...",
  "username": "testuser",
  "email": "test@example.com",
  "fullName": "Test User",
  "roles": ["USER"]
}
```

### Login (Success)
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "type": "Bearer",
  "id": "...",
  "username": "testuser",
  "email": "test@example.com",
  "fullName": "Test User",
  "roles": ["USER"]
}
```

### Get Profile (Success)
```json
{
  "success": true,
  "message": "User profile retrieved",
  "data": {
    "id": "...",
    "username": "testuser",
    "email": "test@example.com",
    "fullName": "Test User",
    "roles": ["USER"],
    "active": true,
    "createdAt": "2026-02-20T...",
    "lastLogin": "2026-02-20T...",
    "learningGoal": null,
    "currentLevel": null,
    "completedTopics": [],
    "interests": []
  }
}
```

## Troubleshooting

### Port Already in Use
```cmd
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID)
taskkill /F /PID <PID>
```

### MongoDB Connection Error
Make sure MongoDB is running:
```cmd
docker ps
docker-compose ps
```

### JWT Secret Error
Check that JWT_SECRET is at least 32 characters when base64 decoded.

## Next Steps

1. Test all endpoints successfully
2. Move to Phase 2: NVIDIA AI Integration
3. Frontend development (Phase 3)

---

**Phase 1 Status:** COMPLETE ✓
