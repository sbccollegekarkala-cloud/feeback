# Firebase Production Deployment Guide

## Updated Firestore Security Rules

Your Firestore security rules have been updated for production with the following enhancements:

### Key Security Features

1. **Authentication Required**: Most operations require user authentication
2. **Role-Based Access Control**: Admin vs Student permissions
3. **Data Validation**: Email format, data size limits (1MB per document)
4. **Field-Level Security**: Students cannot change their role
5. **Document Size Limits**: Prevents abuse with large documents
6. **Open Registration**: Students can register without authentication (secure validation applied)

### What Changed from Test Mode

**Before (Test Mode):**
```javascript
allow read, write: if true; // Anyone can do anything!
```

**After (Production Mode):**
- Users must be authenticated for most operations
- Students can register (create user) without authentication
- Students can only access their own data after login
- Admins have full access to manage system
- Data size is limited to 1MB per document
- Email format is validated
- Role field is protected

## Deployment Steps

### Step 1: Deploy Security Rules

Run the deployment batch file:
```cmd
deploy-firebase-rules.bat
```

Or manually deploy using Firebase CLI:
```cmd
firebase deploy --only firestore:rules
```

### Step 2: Verify Deployment

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to Firestore Database → Rules
4. Verify the rules are updated with the new version
5. Check the "Rules" tab shows your production rules

### Step 3: Test the Rules

Use the Firebase Console Rules Playground:

1. Go to Firestore → Rules → Playground
2. Test these scenarios:

**Test 1: Unauthenticated Access (Should FAIL)**
```
Location: /users/test123
Operation: get
Auth: Not signed in
Expected: ❌ Denied
```

**Test 2: Student Reading Own Data (Should PASS)**
```
Location: /users/student123
Operation: get
Auth: student123 (role: student)
Expected: ✅ Allowed
```

**Test 3: Student Reading Other's Data (Should FAIL)**
```
Location: /users/student456
Operation: get
Auth: student123 (role: student)
Expected: ❌ Denied
```

**Test 4: Admin Access (Should PASS)**
```
Location: /users/student123
Operation: get
Auth: admin123 (role: admin)
Expected: ✅ Allowed
```

### Step 4: Monitor Security

After deployment, monitor for security issues:

1. **Firebase Console → Firestore → Usage**
   - Watch for unusual read/write patterns
   - Check for denied requests (indicates attack attempts)

2. **Enable Audit Logs** (Optional, requires Blaze plan)
   - Track all admin operations
   - Monitor rule violations

3. **Set Up Alerts**
   - Alert on high denied request rates
   - Alert on unusual data access patterns

## Security Rules Breakdown

### Users Collection
- Students can create their own account (role must be 'student')
- Students can read/update their own data (cannot change role)
- Admins can read/update/delete any user
- Email validation enforced

### Surveys Collection
- All authenticated users can read surveys
- Only admins can create/update/delete surveys
- Survey creator is tracked (createdBy field)

### Feedbacks Collection
- Students can read only their own feedbacks
- Students can create feedbacks (one per survey - enforced in app)
- Only admins can update/delete feedbacks
- Submission timestamp validated

### Departments, Questions, Classes
- All authenticated users can read
- Only admins can create/update/delete
- Timestamps validated on create/update

### Sessions Collection
- Users can only access their own sessions
- Session timestamps validated

## Additional Security Recommendations

### 1. Enable App Check (Recommended)
Prevents unauthorized clients from accessing your Firebase services:

```cmd
firebase deploy --only appcheck
```

### 2. Set Up Firebase Authentication Email Verification
In Firebase Console → Authentication → Templates:
- Customize email verification template
- Enable email verification requirement

### 3. Rate Limiting
Consider implementing rate limiting for:
- Feedback submissions (max 1 per survey per student)
- Survey creation (max X per day)
- Login attempts (prevent brute force)

### 4. Data Backup
Set up automated backups:
- Firebase Console → Firestore → Backups
- Schedule daily backups
- Retain for 30 days minimum

### 5. Monitor Costs
- Set up billing alerts
- Monitor read/write operations
- Optimize queries to reduce costs

## Firestore Indexes

For optimal performance, create these indexes:

```
Collection: feedbacks
Fields: studentId (Ascending), surveyId (Ascending)

Collection: surveys
Fields: department (Ascending), isActive (Ascending), createdAt (Descending)

Collection: feedbacks
Fields: surveyId (Ascending), submittedAt (Descending)
```

Deploy indexes:
```cmd
firebase deploy --only firestore:indexes
```

## Troubleshooting

### Issue: "Permission Denied" errors after deployment

**Solution:**
1. Check if user is authenticated
2. Verify user role in Firestore users collection
3. Check browser console for detailed error
4. Test rules in Firebase Console Playground

### Issue: Admin cannot access data

**Solution:**
1. Verify admin user has `role: 'admin'` in users collection
2. Check if admin is properly authenticated
3. Clear browser cache and re-login

### Issue: Students can't submit feedback

**Solution:**
1. Verify studentId matches authenticated user ID
2. Check if survey exists and is active
3. Verify all required fields are present
4. Check document size is under 1MB

## Production Checklist

- [ ] Security rules deployed
- [ ] Rules tested in Firebase Console
- [ ] Email verification enabled
- [ ] App Check configured (optional)
- [ ] Indexes created
- [ ] Backup schedule configured
- [ ] Billing alerts set up
- [ ] Monitoring enabled
- [ ] Admin accounts verified
- [ ] Test student account created and tested
- [ ] All features tested in production
- [ ] Documentation updated

## Support

If you encounter issues:
1. Check Firebase Console → Firestore → Usage for errors
2. Review browser console for client-side errors
3. Test rules in Firebase Console Playground
4. Check Firebase Status page for service issues

## Important Notes

- **Never** set rules back to `allow read, write: if true;` in production
- Always test rule changes in a development project first
- Keep a backup of working rules before making changes
- Monitor denied requests to detect potential security issues
- Review and update rules as your app evolves

---

**Last Updated:** March 6, 2026
**Rules Version:** 2.0 (Production)
**Status:** ✅ Production Ready
