# Deploy Aliah Tracker on free plans

This project has three hosted pieces:

1. MongoDB Atlas Free cluster for data.
2. Render Free web service for the FastAPI backend.
3. Vercel Hobby project for the React frontend.

## 1. Create the free database

1. Go to https://cloud.mongodb.com and create or sign in to a MongoDB Atlas account.
2. Create a Free cluster.
3. Create a database user and save the username and password.
4. In Network Access, allow access from anywhere for hosted services: `0.0.0.0/0`.
5. Copy the connection string. It should look like:

```text
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
```

Use your real username, password, and cluster host.

## 2. Deploy the backend on Render

1. Go to https://dashboard.render.com and create or sign in to a Render account.
2. Choose New, then Web Service.
3. Connect the GitHub repo: `datacore31-bit/aliah-tracker`.
4. Use these settings:

```text
Name: aliah-tracker-api
Root Directory: backend
Runtime: Python
Build Command: pip install -r requirements.txt
Start Command: uvicorn server:app --host 0.0.0.0 --port $PORT
Instance Type: Free
```

5. Add these environment variables:

```text
MONGO_URL=<your MongoDB Atlas connection string>
DB_NAME=auction_ledger
CORS_ORIGINS=*
```

6. Deploy the service.
7. Copy the backend URL, for example:

```text
https://aliah-tracker-api.onrender.com
```

8. Visit this URL with `/api/` at the end. You should see:

```json
{"name":"Auction Ledger","status":"ok"}
```

## 3. Deploy the frontend on Vercel

1. Go to https://vercel.com and create or sign in to a Vercel account.
2. Import the GitHub repo: `datacore31-bit/aliah-tracker`.
3. Use these settings:

```text
Framework Preset: Create React App
Root Directory: frontend
Build Command: npm run build
Output Directory: build
```

4. Add this environment variable:

```text
REACT_APP_BACKEND_URL=<your Render backend URL with no trailing slash>
```

Example:

```text
REACT_APP_BACKEND_URL=https://aliah-tracker-api.onrender.com
```

5. Deploy the project.
6. Copy the frontend URL, for example:

```text
https://aliah-tracker.vercel.app
```

## 4. Lock CORS to the frontend URL

After Vercel gives you the final frontend URL, go back to Render and change:

```text
CORS_ORIGINS=*
```

to:

```text
CORS_ORIGINS=https://your-vercel-url.vercel.app
```

Then redeploy the backend.

## 5. Seed starter data

The seed endpoint needs a POST request. From your own computer, run:

```text
curl -X POST https://your-render-backend-url.onrender.com/api/seed
```

Or send a POST request with any API tool to:

```text
https://your-render-backend-url.onrender.com/api/seed
```

## What to keep private

Never publish these values in GitHub:

- MongoDB username
- MongoDB password
- Full `MONGO_URL`

Only put them into Render environment variables.
