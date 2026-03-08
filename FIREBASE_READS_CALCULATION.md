# Firebase Firestore Reads Calculation Per User

## Summary
**Total reads per student per day: ~15-25 reads**
**Total reads per admin per day: ~100-500 reads**

---

## Student User Journey

### 1. Registration (One-time)
- Check if email exists: **1 read** (queries users collection)
- Check if roll number exists: **1 read** (queries users collection)
- Check if department exists: **1 read** (queries departments collection)
- Save user: **0 reads** (write operation)

**Registration Total: 3 reads**

---

### 2. Login (Each time)
- Find user by email: **1 read** (queries users collection)
- Create session: **0 reads** (write operation)

**Login Total: 1 read**

---

### 3. Student Dashboard (Each visit)
- Get current user: **0 reads** (from sessionStorage)
- Get all surveys: **N reads** (where N = number of surveys)
  - Example: 10 surveys = 10 reads
- Get student's feedbacks: **M reads** (where M = number of feedbacks by this student)
  - Example: 5 feedbacks = 5 reads
- Get departments (for faculty count): **P reads** (where P = number of departments)
  - Example: 5 departments = 5 reads

**Dashboard Total: 10 + 5 + 5 = 20 reads** (typical)

---

### 4. Take Survey (Each submission)
- Get survey details: **1 read**
- Get departments: **5 reads** (typical)
- Check duplicate submission: **M reads** (student's feedbacks)
  - Example: 5 reads
- Submit feedback: **0 reads** (write operation)

**Take Survey Total: 1 + 5 + 5 = 11 reads**

---

### 5. Forgot Password (If used)
- Find user by email: **1 read**
- Update password: **0 reads** (write operation)

**Password Reset Total: 1 read**

---

## Student Daily Usage Estimate

**Typical student behavior:**
- Login: 1 time/day = **1 read**
- View dashboard: 2 times/day = **40 reads** (20 × 2)
- Take survey: 1 time/week = **~2 reads/day** (11 ÷ 7)

**Student Daily Total: ~43 reads/day**

**BUT with caching disabled (your current setup):**
- Every page refresh = full reload
- **Actual: 20-50 reads per student per day**

---

## Admin User Journey

### 1. Admin Login
- Find user by email/username: **1 read**
- Firebase Auth: **0 reads** (handled by Firebase Auth)
- Get user data: **1 read**

**Admin Login Total: 2 reads**

---

### 2. Admin Dashboard
- Get statistics:
  - Get all users: **N reads** (N = number of users)
    - Example: 500 students = 500 reads
  - Get all surveys: **M reads** (M = number of surveys)
    - Example: 20 surveys = 20 reads
  - Get all feedbacks: **P reads** (P = number of feedbacks)
    - Example: 1000 feedbacks = 1000 reads
  - Get all departments: **D reads** (D = number of departments)
    - Example: 5 departments = 5 reads

**Admin Dashboard Total: 500 + 20 + 1000 + 5 = 1,525 reads** (typical)

---

### 3. Create Survey
- Get departments: **5 reads**
- Get classes: **10 reads** (typical)
- Save survey: **0 reads** (write operation)

**Create Survey Total: 15 reads**

---

### 4. View Feedbacks
- Get all feedbacks: **1000 reads** (typical)
- Get all users: **500 reads** (for student names)
- Get all surveys: **20 reads** (for survey names)

**View Feedbacks Total: 1,520 reads**

---

### 5. Faculty Performance Report
- Get all feedbacks: **1000 reads**
- Get departments: **5 reads**

**Performance Report Total: 1,005 reads**

---

### 6. Submitted Students List
- Get all feedbacks: **1000 reads**
- Get all users: **500 reads**
- Get all surveys: **20 reads**

**Submitted Students Total: 1,520 reads**

---

## Admin Daily Usage Estimate

**Typical admin behavior:**
- Login: 1 time/day = **2 reads**
- View dashboard: 5 times/day = **7,625 reads** (1,525 × 5)
- Create survey: 1 time/week = **~2 reads/day** (15 ÷ 7)
- View feedbacks: 3 times/day = **4,560 reads** (1,520 × 3)
- View reports: 2 times/day = **2,010 reads** (1,005 × 2)

**Admin Daily Total: ~14,199 reads/day**

---

## Firebase Free Tier Limits

**Free Tier (Spark Plan):**
- 50,000 reads/day
- 20,000 writes/day
- 1 GB storage

---

## Capacity Calculation

### Students Only
- 50,000 reads ÷ 43 reads/student = **~1,162 students/day**
- With 500 students: **21,500 reads/day** (43% of limit)

### With Admin Usage
- Admin: 14,199 reads/day
- Remaining: 50,000 - 14,199 = 35,801 reads/day
- Students: 35,801 ÷ 43 = **~832 students/day**

### Critical Issue: Admin Dashboard
**Each admin dashboard load = 1,525 reads!**
- 5 dashboard views = 7,625 reads
- 10 dashboard views = 15,250 reads
- 20 dashboard views = 30,500 reads
- 33 dashboard views = **50,325 reads (OVER LIMIT!)**

---

## Optimization Recommendations

### 1. Enable Caching (CRITICAL)
Your code has caching disabled:
```javascript
// DISABLED: Always return null to force fresh data fetch
return null;
```

**Enable caching to reduce reads by 80-90%:**
- Cache duration: 5-10 minutes
- Dashboard loads: 1,525 reads → **~150 reads** (10x improvement)

### 2. Pagination
Instead of loading all feedbacks:
- Load 50 feedbacks at a time
- 1000 reads → **50 reads** (20x improvement)

### 3. Aggregated Statistics
Store pre-calculated stats in a separate document:
- Update stats once per hour
- Dashboard loads: 1,525 reads → **1 read** (1,525x improvement)

### 4. Lazy Loading
Don't load all data on dashboard:
- Load statistics only
- Load details on demand
- 1,525 reads → **~10 reads** (152x improvement)

### 5. Use Firebase Auth for Students
Currently students don't use Firebase Auth:
- No authentication = no security rules
- Must allow `if true` = anyone can access
- With Firebase Auth: proper security + same read count

---

## Cost Projection

### Free Tier (Current Setup)
- **Students:** 500 students × 43 reads = 21,500 reads/day
- **Admin:** 1 admin × 14,199 reads = 14,199 reads/day
- **Total:** 35,699 reads/day
- **Status:** ✅ Within free tier (71% usage)

### With Optimizations (Caching Enabled)
- **Students:** 500 students × 5 reads = 2,500 reads/day (90% reduction)
- **Admin:** 1 admin × 1,500 reads = 1,500 reads/day (90% reduction)
- **Total:** 4,000 reads/day
- **Status:** ✅ Within free tier (8% usage)

### If You Exceed Free Tier
**Blaze Plan (Pay-as-you-go):**
- First 50,000 reads/day: FREE
- Additional reads: $0.06 per 100,000 reads
- Example: 100,000 reads/day = $0.03/day = **$0.90/month**

---

## Recommendations for Production

### Immediate Actions:
1. ✅ **Enable caching** - Reduces reads by 80-90%
2. ✅ **Implement pagination** - Load data in chunks
3. ✅ **Add Firebase Auth for students** - Enables security rules

### Future Optimizations:
4. ⚠️ **Aggregate statistics** - Pre-calculate dashboard stats
5. ⚠️ **Lazy loading** - Load data on demand
6. ⚠️ **Monitor usage** - Set up Firebase usage alerts

### Current Status:
- **Without optimizations:** 35,699 reads/day (71% of free tier)
- **Risk:** Admin dashboard can easily exceed limit
- **Solution:** Enable caching immediately

---

## Conclusion

**Your app will work on free tier with current usage, BUT:**
- Admin dashboard is expensive (1,525 reads per load)
- Caching is disabled (unnecessary repeated reads)
- No pagination (loading all data every time)

**Enable caching and you'll be fine for 500-1000 students on free tier.**

**Without caching, you risk hitting limits with just 1-2 active admins.**
