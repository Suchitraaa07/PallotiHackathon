# 🔧 Backend Integration Guide for Hospital Dashboard

## Currently Implemented ✅

### API Endpoints Already Available:

```python
# GET /api/reports (existing)
- Returns all incident reports from Supabase
- Hospital dashboard uses this to populate initial incidents
- Real-time updates via Supabase subscription

# POST /api/report-incident (existing)
- User submits incident data
- Data: victim_name, location, latitude, longitude, incident_date, etc
- Stores in Supabase `reports` table

# GET /api/nearby-hospitals (existing)
- Returns hospitals near incident location
- Sorts by distance, antivenom availability
```

---

## Still Need to Build 🔄

### 1. Case Request Handler

```python
# FILE: backend/app/routes/riskcheck.py
# ADD THIS ENDPOINT:

@router.post("/case-request")
def create_case_request(data: CaseRequestInput):
    """
    Hospital accepts a case
    
    Request data:
    {
        incident_id: "uuid",
        hospital_id: "uuid",
        status: "accepted"  # or "pending" / "completed"
    }
    
    Should:
    1. Check hospital exists and is verified
    2. Insert into case_requests table
    3. Return created case record
    4. Trigger notification to user
    """
    
    # Implementation needed


# MODEL
class CaseRequestInput(BaseModel):
    incident_id: str
    hospital_id: str
    status: str = "pending"  # pending, accepted, completed


class CaseRequest(BaseModel):
    id: str
    incident_id: str
    hospital_id: str
    status: str
    created_at: str
```

### 2. Update Antivenom Inventory

```python
# FILE: backend/app/routes/riskcheck.py
# ADD THIS ENDPOINT:

@router.put("/hospital/{hospital_id}/inventory")
def update_hospital_inventory(hospital_id: str, data: InventoryUpdateInput):
    """
    Hospital updates their antivenom stock
    
    Request data:
    {
        polyvalent: 5,
        cobra: 2,
        viper: 3,
        krait: 1
    }
    
    Should:
    1. Validate hospital_id is verified
    2. Update hospitals table
    3. Check for low stock alerts
    4. Return updated inventory
    """
    
    # Implementation needed


# MODEL
class InventoryUpdateInput(BaseModel):
    polyvalent: int = 0
    cobra: int = 0
    viper: int = 0
    krait: int = 0
```

### 3. Update Case Status

```python
# FILE: backend/app/routes/riskcheck.py
# ADD THIS ENDPOINT:

@router.put("/case-request/{case_id}")
def update_case_status(case_id: str, data: CaseStatusUpdate):
    """
    Hospital updates case progress
    
    Request data:
    {
        status: "accepted",  # or "treating", "completed"
        notes: "Patient en route to hospital"
    }
    
    Should:
    1. Verify hospital owns this case
    2. Update case_requests table
    3. Trigger user notification
    4. Update analytics
    """
    
    # Implementation needed


# MODEL
class CaseStatusUpdate(BaseModel):
    status: str  # pending, accepted, treating, completed
    notes: str = ""
```

### 4. Analytics Queries

```python
# FILE: backend/app/routes/riskcheck.py
# ADD THIS ENDPOINT:

@router.get("/hospital/{hospital_id}/analytics")
def get_hospital_analytics(hospital_id: str, days: int = 7):
    """
    Get analytics for hospital dashboard
    
    Returns:
    {
        cases_today: 5,
        cases_this_week: 28,
        avg_response_time: 18.5,
        success_rate: 0.98,
        most_common_snake: "Russell's Viper",
        peak_hours: "6-9 PM",
        antivenom_usage: {
            polyvalent: 3,
            cobra: 0,
            viper: 1,
            krait: 0
        }
    }
    """
    
    # Implementation needed


# SQL Query Pattern:
# 1. Count incidents in reports table for date range
# 2. Count accepted cases in case_requests
# 3. Calculate avg response time (incident_time to case accepted time)
# 4. Count successful completions
# 5. Group by snake species
# 6. Group incidents by hour
```

### 5. Notification Trigger

```python
# FILE: backend/app/services/notification_service.py (NEW FILE)
# SEND NOTIFICATIONS TO USERS

async def notify_user_case_accepted(incident_id: str, hospital_id: str, hospital_name: str):
    """
    When hospital accepts case, notify victim:
    "🏥 Hospital Accepted!
     {hospital_name} has accepted your case
     ETA: 9 minutes
     Contact: +91-XXXXXXXXXX"
    """
    
    # Implementation:
    # 1. Query case_requests for incident → hospital
    # 2. Get user's phone/email from reports
    # 3. Send WhatsApp/SMS via Twilio (optional)
    # 4. Store notification in notifications table
    pass
```

---

## Supabase Table Setup

### Make sure these tables exist:

```sql
-- reports table (existing)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INT,
  phone TEXT,
  latitude FLOAT8,
  longitude FLOAT8,
  incident_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  environment TEXT,
  weather_condition TEXT,
  temperature FLOAT8,
  season TEXT,
  time_of_day TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- case_requests table (NEW - create this)
CREATE TABLE case_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES reports(id),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  status TEXT DEFAULT 'pending',  -- pending, accepted, treating, completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- hospitals table (existing)
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  latitude FLOAT8,
  longitude FLOAT8,
  phone TEXT,
  polyvalent_qty INT DEFAULT 0,
  cobra_qty INT DEFAULT 0,
  viper_qty INT DEFAULT 0,
  krait_qty INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional: notifications table (for audit trail)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  incident_id UUID REFERENCES reports(id),
  message TEXT,
  status TEXT DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Real-time Subscriptions (Already Wired)

### Hospital Dashboard listens to:

```typescript
// In HospitalPortalPage.tsx (ALREADY IMPLEMENTED)

// Subscribe to new incidents
supabase
  .channel('incidents')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'reports' },
    (payload) => {
      setIncidents(prev => [payload.new, ...prev])
    }
  )
  .subscribe()

// Add similar for case_requests updates:
supabase
  .channel('case-requests')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'case_requests' },
    (payload) => {
      setCaseRequests(prev => [payload.new, ...prev])
    }
  )
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'case_requests' },
    (payload) => {
      setCaseRequests(prev => 
        prev.map(c => c.id === payload.new.id ? payload.new : c)
      )
    }
  )
  .subscribe()
```

---

## Frontend API Calls (Already Wired)

### HospitalPortalPage already calls:

```typescript
// Get incidents on mount
const response = await fetch("/api/reports")

// Accept case
const response = await fetch("/api/case-request", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    incident_id: incidentId,
    hospital_id: hospitalId,
    status: "accepted"
  })
})

// TODO: Wire these in component
// 1. Update inventory when editing
//    PUT /api/hospital/{id}/inventory
//
// 2. Update case status
//    PUT /api/case-request/{id}
//
// 3. Fetch analytics
//    GET /api/hospital/{id}/analytics
```

---

## Implementation Priority

### HIGH (Critical for MVP):
1. ✅ Case request POST endpoint
2. ✅ Update case status PUT endpoint  
3. ✅ Case requests real-time subscription (frontend)

### MEDIUM (For full functionality):
4. Update inventory PUT endpoint
5. Analytics GET endpoint
6. Notification trigger service

### LOW (Enhancement):
7. Push notifications (PushBullet/FCM)
8. SMS notifications (Twilio)
9. Email notifications
10. Advanced analytics/reports

---

## Testing the Flow Locally

### Step 1: Start Backend
```bash
cd backend
python main.py
# Runs on http://localhost:8000
```

### Step 2: Start Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### Step 3: Test Hospital Flow

**Terminal 1 (Hospital Account):**
```
1. Go to http://localhost:5173
2. Click "Login / Signup"
3. Signup with:
   - Email: hospital@test.com
   - Password: Test123!
   - Role: Hospital
4. Admin approves in Supabase
5. Go to /hospital-dashboard
6. See empty "Live Alerts Feed" (waiting for incidents)
```

**Terminal 2 (User Account - in another browser):**
```
1. Go to http://localhost:5173
2. Click "Report Incident" or "Analyze Bite"
3. Upload snake image or describe bite:
   - Location: "Banjara Hills"
   - Lat/Lng: 17.3850, 78.4867 (Hyderabad)
   - Snake: "Russell's Viper"
   - Severity: "HIGH"
4. Click "Submit Report"
```

**Result:**
```
Hospital's dashboard:
✅ NEW INCIDENT appears in "Live Alerts Feed"
✅ Shows:
   - Victim name + age
   - Distance + ETA  
   - [Accept Case] button
✅ Hospital clicks [Accept Case]
✅ Case moves to "Accepted Cases"
✅ User gets notification
```

---

## Debugging Checklist

If data not appearing:

```
☐ Check Supabase: reports table has data
☐ Check browser console: any fetch errors?
☐ Check network tab: /api/reports responding?
☐ Verify real-time subscription connected
  → Open Supabase dashboard → Replication
  → Should show "incidents" channel
☐ Check auth: Hospital must be verified role
☐ Check CORS: Backend allows frontend origin
```

---

## Key Files to Reference

```
Frontend:
  frontend/src/app/components/auth/HospitalPortalPage.tsx (Main component)
  frontend/src/lib/supabaseClient.ts (Real-time client)
  
Backend:
  backend/app/routes/riskcheck.py (API endpoints)
  backend/app/services/risk_service.py (Data processing)
  
Database:
  Supabase Console → SQL Editor → above schema
```

Good luck! You're building something amazing. 🚀
