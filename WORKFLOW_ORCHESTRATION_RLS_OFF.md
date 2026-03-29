# 🔄 Complete Workflow Orchestration - RLS OFF

## **What You Need to Do**

This document ensures the CORRECT orchestration of the entire workflow from user reporting an incident to hospital dashboard displaying it, WITH RLS DISABLED.

---

## **STEP 1: DISABLE RLS ON SUPABASE TABLES**

### Go to Supabase Dashboard:

1. Open [supabase.com](https://supabase.com) → Open your project
2. Click **Database** → **Tables** (left sidebar)
3. Click on **"reports"** table
4. Look at the top → You'll see either:
   - **"RLS is ON"** (blue button) → Click it
   - **"RLS is OFF"** (gray badge) → Already disabled ✅

5. If "RLS is ON", click it and select **"Disable RLS"**
6. Confirm the popup

Do the SAME for **"case_requests"** table if it exists.

**Result**: ✅ Both tables have RLS OFF

---

## **STEP 2: FIX ENVIRONMENT VARIABLES**

File: `frontend/.env`

**Change FROM:**
```
SUPABASE_URL=https://vluxkkxzbzfktbpnfhnz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdXhra3h6Ynpma3RicG5maG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjcxODUsImV4cCI6MjA5MDI0MzE4NX0.etWja4zNLYX1KnzVWj_HMi8D_MwT2pssJasldwRNe3w
```

**Change TO:**
```
VITE_SUPABASE_URL=https://vluxkkxzbzfktbpnfhnz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdXhra3h6Ynpma3RicG5maG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjcxODUsImV4cCI6MjA5MDI0MzE4NX0.etWja4zNLYX1KnzVWj_HMi8D_MwT2pssJasldwRNe3w
```

**KEY CHANGE**: Add `VITE_` prefix to both variables

**Why?** Vite only loads environment variables that start with `VITE_` to the frontend.

---

## **COMPLETE WORKFLOW - RLS OFF**

### **Phase 1: User Reports Incident** 👤

```
1️⃣ USER SIDE
  User opens app → Takes snake photo
       ↓
  Extracts symptoms using ML model
       ↓
  Fills incident form:
    - Victim name: "John Doe"
    - Age: 35
    - Phone: "+919876543210"
    - Location: "Banjara Hills, Hyderabad"
    - Latitude: 17.3850
    - Longitude: 78.4867
    - Environment: "Garden"
    - Weather: "Sunny"
    - Temperature: 32°C
    - Snake Type: "Russell's Viper"
    - Severity: "HIGH"
       ↓
  Clicks "Report Incident" button
```

---

### **Phase 2: Backend Receives Report** 🖥️

```
2️⃣ BACKEND SIDE (FastAPI)
  
  POST /api/report-incident
       ↓
  Backend receives incident data:
  {
    victim_name: "John Doe",
    victim_age: 35,
    victim_phone: "+919876543210",
    location: "Banjara Hills",
    latitude: 17.3850,
    longitude: 78.4867,
    incident_date: "2026-03-29",
    incident_time: "14:30",
    environment_type: "Garden",
    weather_condition: "Sunny",
    temperature: 32,
    snake_type: "Russell's Viper",
    venom_status: true,
    severity: "HIGH"
  }
       ↓
  Backend validates all fields ✅
       ↓
  Gets Supabase service role key from .env
       ↓
  Inserts into Supabase "reports" table:
  {
    id: "550e8400-e29b-41d4-a716-446655440000" (auto-generated UUID),
    name: "John Doe",
    age: 35,
    phone: "+919876543210",
    location: "Banjara Hills",
    latitude: 17.3850,
    longitude: 78.4867,
    incident_time: "2026-03-29T14:30:00Z",
    environment: "Garden",
    weather_condition: "Sunny",
    temperature: 32,
    season: "Spring",
    time_of_day: "Afternoon",
    notes: "High severity snakebite",
    created_at: "2026-03-29T14:35:00Z" (server timestamp)
  }
       ↓
  ✅ Data saved to Supabase successfully
       ↓
  Returns success response to frontend:
  {
    message: "Incident report stored successfully",
    report: { ... saved data ... }
  }
```

**Why RLS OFF matters here:**
- Backend CAN write directly to "reports" table using service role key
- No policies blocking the INSERT operation
- Data immediately available for hospitals to read

---

### **Phase 3: Hospital Signs In** 🏥

```
3️⃣ HOSPITAL SIDE (Frontend)

  Hospital staff goes to: http://localhost:5173/login
       ↓
  Enters: hospital_email@hospital.com + password
       ↓
  Supabase Auth validates credentials
       ↓
  Checks user role in profiles table:
    - role = "hospital" ✅
    - verification_status = "approved" ✅
       ↓
  Redirects to: http://localhost:5173/hospital-dashboard
       ↓
  Dashboard component (HospitalPortalPage.tsx) loads
```

---

### **Phase 4: Dashboard Fetches Data** 📊

```
4️⃣ DASHBOARD INITIAL LOAD

useEffect runs on component mount:
       ↓
Query 1: GET all incidents for map display
  supabase.from("reports")
    .select("id,name,age,phone,location,latitude,longitude,...")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("incident_time", {ascending: false})
    .limit(100)
       ↓
  ✅ With RLS OFF: All records returned
  ✅ Hospital can read all incidents
       ↓
Query 2: GET TOTAL COUNT of all incidents
  supabase.from("reports")
    .select("id", { count: "exact", head: true })
       ↓
  ✅ With RLS OFF: Returns EXACT count
  ✅ "totalIncidents" stat shows correct number
       ↓
Query 3: GET case requests for this hospital
  supabase.from("case_requests")
    .select("id,incident_id,hospital_id,status,created_at")
    .eq("hospital_id", hospitalId)
    .order("created_at", {ascending: false})
       ↓
  ✅ All case requests returned
       ↓
Both setIncidents() and setTotalIncidentCount() called
       ↓
Dashboard renders with:
  ✅ Live incident map populated
  ✅ Total incidents: 1 (or more if multiple)
  ✅ Today's cases: 1
  ✅ This week: 1
  ✅ This month: 1
```

---

### **Phase 5: Real-Time Updates** ⚡

```
5️⃣ REAL-TIME SUBSCRIPTION

Another useEffect subscribes to changes:
       ↓
supabase
  .channel("hospital-incidents-live")
  .on('postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'reports'
      },
      (payload) => {
        // When new incident inserted
        setIncidents(prev => [payload.new, ...prev])
      }
  )
  .subscribe();
       ↓
✅ With RLS OFF: Real-time events work perfectly
✅ When user submits new incident:
   - Backend inserts to "reports"
   - Supabase fires INSERT event
   - Hospital dashboard receives it (2-3 sec latency)
   - Incident appears in live alerts INSTANTLY
```

---

## **STEP 3: RESTART FRONTEND**

```powershell
cd frontend

# Stop dev server if running (Ctrl+C)

# Clear Vite cache
rm -r node_modules/.vite

# Start dev server
npm run dev
```

Frontend will restart and load new `.env` variables.

---

## **STEP 4: TEST THE COMPLETE WORKFLOW**

### **Test A: Submit Incident**

1. Open browser: `http://localhost:5173`
2. Go to "Report Incident" page
3. Fill form with test data:
   ```
   Name: "Test Patient"
   Age: 50
   Phone: "+919876543210"
   Location: "Test Location"
   Latitude: 17.3850
   Longitude: 78.4867
   Date: Today
   Time: Current time
   Environment: "Garden"
   Snake: "Russell's Viper"
   ```
4. Click "Report Incident"
5. Watch network tab (F12 → Network)
   - Should see POST to `/api/report-incident`
   - Status: **200 OK** ✅

---

### **Test B: Hospital Dashboard Shows Data**

1. Open browser: `http://localhost:5173/hospital-dashboard`
2. Login with hospital credentials
3. Verify you see:
   - ✅ **Total Incidents**: Should show 1+ (not 0!)
   - ✅ **Today's Cases**: Shows count
   - ✅ **Incidents on map**: Red markers visible
   - ✅ **Live alerts feed**: Shows incident details

---

### **Test C: Real-Time Update**

1. Keep hospital dashboard open
2. In another tab, submit a NEW incident
3. Watch hospital dashboard without refreshing
4. Within 2-3 seconds:
   - ✅ **Total Incidents count increases**
   - ✅ **New incident appears in alerts feed**
   - ✅ **New marker appears on map**

---

## **DEBUGGING - IF SOMETHING DOESN'T WORK**

### **Issue: "Total Incidents" still shows 0**

**Check 1: Environment Variables**
```powershell
# In VS Code terminal, check if .env is properly set
cat frontend/.env
# Should show:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

**Check 2: Browser Console**
Press F12 → Console tab → Look for red errors

Common errors:
- `"Cannot read property 'from' of null"` → Supabase not initialized
- `"403 Forbidden"` → RLS still ON
- `"Cannot find module"` → Cache issue, restart dev server

**Check 3: Supabase Data**
1. Go to Supabase → SQL Editor
2. Run: `SELECT COUNT(*) FROM reports;`
3. If result is 0, no incidents exist yet
4. Submit an incident first, then check again

---

### **Issue: Backend Can't Insert to Supabase**

**Error**: "Supabase request failed: ..."

**Check**: Backend `.env` file has correct vars
```
SUPABASE_URL=https://vluxkkxzbzfktbpnfhnz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Service role key is different from anon key! Get it from:
Supabase → Settings → API → Service Role Key

---

### **Issue: Real-Time Updates Not Working**

Real-time subscription requires:
1. ✅ RLS OFF (you have this)
2. ✅ Correct channel subscription (code already has this)
3. ✅ Supabase project has Realtime enabled

Check: Supabase → Settings → Realtime → Should be ON

---

## **SUMMARY - WHAT SHOULD WORK NOW**

✅ User submits incident → Data saved to Supabase  
✅ Hospital signs in → Sees total incident count  
✅ Hospital dashboard → Shows all incidents with coordinates  
✅ Real-time → New incidents appear automatically  
✅ Map → Incidents display with correct locations  
✅ Analytics → Total, today, week, month counts work  

---

## **NEXT STEPS (After Testing Works)**

Once everything is working with RLS OFF:

1. **Optional**: Turn RLS ON with policies (for security + judges)
2. **Optional**: Add missing backend APIs:
   - POST `/case-request` (hospital accepts case)
   - PUT `/hospital/{id}/inventory` (update antivenom stock)
   - GET `/analytics` (performance metrics)

But for now, **get it working with RLS OFF**, then optimize later!

---

**Ready to test? Start with STEP 1 (disable RLS), then STEP 2 (fix .env), then STEP 3 (restart frontend).**

Let me know which step you're on! 🚀
