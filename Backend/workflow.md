USER
  │
  │ Clicks "Login with Google"
  ↓
REACT FRONTEND
  │
  │ GET /auth/google
  ↓
EXPRESS BACKEND
  │
  │ passport.authenticate("google")
  ↓
GOOGLE
  │
  │ User logs into Google
  │ Google verifies identity
  ↓
GOOGLE CREATES TEMPORARY
AUTHORIZATION CODE
  │
  │ Redirects browser to:
  │ /auth/google/callback?code=XYZ
  ↓
BROWSER
  │
  │ GET /auth/google/callback?code=XYZ
  ↓
EXPRESS BACKEND
  │
  │ passport.authenticate("google")
  ↓
GOOGLE STRATEGY
  │
  │ Sends authorization code
  │ to Google
  ↓
GOOGLE
  │
  │ Verifies code
  │
  │ Returns OAuth information
  ↓
GOOGLE STRATEGY
  │
  │ Gets Google profile
  ↓
PROFILE
{
  id,
  name,
  email,
  photo
}
  │
  ↓
YOUR STRATEGY CALLBACK
  │
  │ Find user using profile.id
  ↓
MONGODB
  │
  ├── User exists → get user
  │
  └── User doesn't exist → create user
  │
  ↓
USER OBJECT
{
  _id,
  googleId,
  name,
  email
}
  │
  │ done(null, user)
  ↓
PASSPORT
  │
  │ puts user on:
  │ req.user
  ↓
NEXT EXPRESS MIDDLEWARE
  │
  │ generateToken(req.user)
  ↓
YOUR JWT
{
  userId,
  email,
  name
}
  │
  ↓
BACKEND
  │
  │ 302 Redirect
  │ FRONTEND/#token=YOUR_JWT
  ↓
BROWSER
  │
  ↓
REACT FRONTEND
  │
  │ stores/uses YOUR JWT
  ↓
LOGIN COMPLETE



2) GET USER DATA

REACT
  │
  │ GET /auth/me
  │
  │ Authorization: Bearer YOUR_JWT
  ↓
EXPRESS
  │
  ↓
verifyJWT
  │
  ├── Verify JWT signature
  ├── Check expiration
  └── Decode payload
  │
  ↓
req.user
{
  userId: "123",
  email: "...",
  name: "..."
}
  │
  ↓
/auth/me
  │
  │ User.findById(req.user.userId)
  ↓
MONGODB
  │
  ↓
USER DATA
  │
  ↓
EXPRESS
  │
  │ JSON response
  ↓
REACT