# Deploy To Render

## 1) Push Latest Code To GitHub

From the project root:

```powershell
git add -A
git commit -m "Add Render deployment config"
git push origin main
```

## 2) Create Web Service On Render

1. Open Render Dashboard.
2. Click New +, then Blueprint.
3. Connect your GitHub repo: cy-crypto/ecommerce-project.
4. Render will detect render.yaml automatically.
5. Click Apply.

## 3) Set Required Environment Variables

In Render service settings, set:

- MONGODB_URI
- SESSION_SECRET
- GEMINI_API_KEY

Suggested SESSION_SECRET generation:

```powershell
[guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()
```

## 4) MongoDB For Production

Use MongoDB Atlas (recommended) and put the full connection string in MONGODB_URI.

Example format:

```text
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/scoopcraft-store?retryWrites=true&w=majority
```

Make sure Atlas Network Access allows Render outbound access.

## 5) Verify Deployment

After deploy finishes:

1. Open your Render URL.
2. Confirm home page loads.
3. Test sign-in and cart session flow.
4. If chatbot is enabled, test one message.

## 6) Optional Custom Domain

In Render service settings:

1. Custom Domains
2. Add your domain
3. Follow DNS records shown by Render
