# Quick Start - PoE Cluster Jewel Searcher

## 1️⃣ Install Dependencies

```bash
npm install
cd server && npm install && cd ..
```

## 2️⃣ Start the Proxy Server

Open Terminal 1:
```bash
cd server
npx ts-node server.ts
```

You should see:
```
🚀 PoE Cluster Search Proxy Server running on http://localhost:3001
```

## 3️⃣ Start the React App

Open Terminal 2:
```bash
npm start
```

The app will open automatically at `http://localhost:3000`

## 4️⃣ Use the App

1. Click **"🔍 Search Cluster Jewels"** button
2. Set how many results to fetch (1-100)
3. Use filters on the left:
   - **Cluster Type** - Select from dropdown
   - **Price Range** - Set min/max in Chaos
   - **Item Level** - Adjust iLvl range with sliders
4. Click column headers to sort by Price or iLvl
5. View results with seller info and online status

## 📝 Files Overview

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main layout component |
| `src/components/` | React UI components (Search, Filter, Results) |
| `src/store/` | Zustand state management |
| `src/services/` | API client code |
| `src/types/` | TypeScript definitions |
| `server/server.ts` | Express proxy server |

## 🐛 Troubleshooting

### Server won't start
- Ensure port 3001 is available: `netstat -ano | findstr :3001`
- Kill process: `taskkill /PID <PID> /F`
- Try running with Node: `node --loader ts-node/esm server/server.ts`

### App won't load
- Clear browser cache: `Ctrl+Shift+Del`
- Check proxy is running on :3001
- Check browser console for errors (F12)

### "Cannot fetch" errors
- Ensure proxy server is running first
- Check internet connection
- PoE API may have rate limited you (wait a minute)

## 📚 Full Documentation

See `README_SETUP.md` or `IMPLEMENTATION_COMPLETE.md` for complete guides.

---

**You're all set!** 🎮✨
