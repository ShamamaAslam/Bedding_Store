# WF Bedding Store

Production deployment guide for the React frontend + Node/Express backend + MongoDB Atlas database.

## Deployment Architecture

```text
Frontend (Vercel)
   ↓ calls API
Backend (Render)
   ↓ connects
MongoDB Atlas
```

## 1) Deployment Order

Follow this order so each service has the values it needs.

### Step 1: Create MongoDB Atlas Free Cluster
1. Go to MongoDB Atlas and sign in.
2. Click **Build a Database**.
3. Choose **M0 Free**.
4. Pick a region near your users.
5. Create a database user in **Database Access**.
6. In **Network Access**, allow your IP or add `0.0.0.0/0` for testing.
7. Click **Connect** → **Drivers** and copy the connection string.

### Step 2: Deploy Backend on Render
1. Go to Render and sign in.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Select the repo.
5. Set **Root Directory** to `backend`.
6. Set **Environment** to Node.
7. Set **Build Command** to `npm install`.
8. Set **Start Command** to `npm start`.
9. Add environment variables from the table below.
10. Click **Create Web Service**.

### Step 3: Deploy Frontend on Vercel
1. Go to Vercel and sign in.
2. Click **Add New** → **Project**.
3. Import the same GitHub repository.
4. Set **Root Directory** to `frontend`.
5. Keep the framework preset as React / Create React App.
6. Set **Build Command** to `npm run build`.
7. Add environment variables from the table below.
8. Click **Deploy**.

### Step 4: Verify the Flow
- Frontend on Vercel should call the backend Render API.
- Backend on Render should connect to MongoDB Atlas.
- Refreshing routes like `/products` or `/checkout` should work on Vercel because of `frontend/vercel.json`.

## 2) Environment Variables

### Frontend Environment Variables
Add these in Vercel for the `frontend` app.

| Variable | Example Value | Purpose |
| --- | --- | --- |
| `REACT_APP_API_BASE_URL` | `https://your-render-service.onrender.com/api` | Points the frontend to the Render API in production |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Stripe publishable key for checkout |

### Backend Environment Variables
Add these in Render for the `backend` service.

| Variable | Example Value | Purpose |
| --- | --- | --- |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` | MongoDB Atlas connection string |
| `JWT_SECRET` | `your-strong-secret` | JWT signing secret |
| `FRONTEND_URL` | `https://your-vercel-app.vercel.app` | Allowed CORS origin for the deployed frontend |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe secret key for backend payment APIs |
| `PORT` | `10000` | Optional, Render sets the port automatically |

### Local Environment Variables
Use these for development on your machine.

| Variable | Example Value | Purpose |
| --- | --- | --- |
| `REACT_APP_API_BASE_URL` | `http://localhost:5000/api` | Local backend API |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Stripe publishable key |
| `MONGO_URI` | `mongodb+srv://...` | Atlas or local MongoDB connection |
| `JWT_SECRET` | `dev-secret` | Local JWT secret |
| `FRONTEND_URL` | `http://localhost:3000` | Local CORS origin |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe backend secret key |

## 3) Local vs Production Setup

| Area | Local Development | Production |
| --- | --- | --- |
| Frontend URL | `http://localhost:3000` | Vercel URL |
| Backend URL | `http://localhost:5000` | Render URL |
| API Base URL | `http://localhost:5000/api` | `https://your-render-service.onrender.com/api` |
| Backend CORS | `http://localhost:3000` | Vercel domain |
| Database | MongoDB Atlas or local MongoDB | MongoDB Atlas free cluster |
| Routing | React dev server handles routes | Vercel rewrite handles SPA routes |

## 4) Exact Click Path Summary

### MongoDB Atlas
1. **Build a Database**
2. **M0 Free**
3. **Create Database User**
4. **Network Access** → add IP
5. **Connect** → **Drivers**
6. Copy connection string

### Render
1. **New +**
2. **Web Service**
3. Connect GitHub repo
4. Select repository
5. Root Directory: `backend`
6. Build Command: `npm install`
7. Start Command: `npm start`
8. Add env vars
9. **Create Web Service**

### Vercel
1. **Add New**
2. **Project**
3. Import GitHub repo
4. Root Directory: `frontend`
5. Build Command: `npm run build`
6. Add env vars
7. **Deploy**

## 5) Common Deployment Errors and Fixes

### CORS Error
**Symptom:** Browser blocks API requests from Vercel.

**Fix:**
- Set `FRONTEND_URL` on Render to your exact Vercel URL.
- Make sure backend uses CORS with that origin.
- Redeploy the backend after changing env vars.

### API Not Found / 404
**Symptom:** Frontend calls localhost or wrong API URL in production.

**Fix:**
- Set `REACT_APP_API_BASE_URL` on Vercel to your Render API URL.
- Confirm the URL ends with `/api`.
- Rebuild and redeploy the frontend.

### Build Error on Vercel
**Symptom:** Deployment fails during `npm run build`.

**Fix:**
- Make sure the root directory is `frontend`.
- Check for missing environment variables.
- Run this locally before pushing:

```bash
cd frontend
npm run build
```

### Backend Fails to Start on Render
**Symptom:** Render service crashes or never becomes healthy.

**Fix:**
- Confirm `MONGO_URI` is correct.
- Confirm `JWT_SECRET` is set.
- Check Render logs for syntax/runtime errors.
- Make sure the start command is `npm start`.

### MongoDB Connection Fails
**Symptom:** Backend cannot connect to Atlas.

**Fix:**
- Confirm Atlas database user credentials.
- Confirm your Atlas network access allows the server.
- Re-check the copied connection string.

### React Refresh / Direct Route 404 on Vercel
**Symptom:** `/products`, `/cart`, or `/checkout` breaks when refreshed.

**Fix:**
- Keep `frontend/vercel.json` in the project.
- Redeploy the frontend after pushing that file.

## 6) Post-Deployment Testing Checklist

### Frontend Checks
- [ ] Open the Vercel site in a browser.
- [ ] Home page loads without console errors.
- [ ] Categories load correctly.
- [ ] Product listing loads.
- [ ] Product detail page opens.
- [ ] Cart page works.
- [ ] Checkout page loads.
- [ ] Refresh a route like `/products` and confirm it still works.

### Backend Checks
- [ ] Render service shows healthy logs.
- [ ] `/api/categories` returns data.
- [ ] `/api/products` returns data.
- [ ] Auth/login routes respond correctly.
- [ ] CORS requests from Vercel are allowed.

### Database Checks
- [ ] Atlas cluster is active.
- [ ] App can read categories/products from Atlas.
- [ ] Admin actions create/update data successfully.

### Integration Checks
- [ ] Frontend API requests go to Render, not localhost.
- [ ] Render connects to Atlas successfully.
- [ ] Images and uploaded assets display correctly.
- [ ] No mixed-content or CORS warnings in the browser console.

## 7) Local Development Commands

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm start
```

## 8) Production Build Check

Before deploying, verify the frontend build locally:

```bash
cd frontend
npm run build
```

## 9) Notes

- The frontend automatically uses the value from `REACT_APP_API_BASE_URL` when deployed.
- The backend automatically allows the origin from `FRONTEND_URL`.
- The backend serves uploaded files from `/uploads`.
- This setup keeps development and production separate without changing business logic.
