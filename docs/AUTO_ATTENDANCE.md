# Automatic Attendance System

## Overview

The SafeCampus Tracker now features **fully automatic attendance** that monitors student locations during class hours and marks attendance without requiring manual button clicks.

## How It Works

### 1. **Continuous Location Monitoring**

- When a student logs into their dashboard, the auto-attendance service starts automatically
- The system checks the student's GPS location **every 2 minutes** during class hours
- Location checks only happen when a class is currently in session

### 2. **Geofence Validation**

The system verifies:

- ✅ Student is within the classroom's geographic boundaries (lat/lng)
- ✅ Student is on the correct floor (altitude check ±15 meters)
- ✅ Student is within the class time window (start time to end time)

### 3. **Automatic Marking**

When all conditions are met:

- **Present**: Auto-marked if student arrives within 10 minutes of class start
- **Late**: Auto-marked if student arrives more than 10 minutes after class start
- **Absent**: Auto-marked by teacher at end of class for students who were never detected

### 4. **Smart Features**

- 🔄 **No Duplicates**: Won't mark attendance twice for the same class
- 📍 **5-meter Buffer**: Accounts for GPS drift and positioning errors
- 🔋 **Battery Efficient**: Uses cached location data (30-second cache)
- 🔒 **Privacy**: Only checks location during active class hours

## User Experience

### For Students

#### Visual Indicators

1. **Green Banner**: "🤖 Auto-Attendance Active" appears during class
2. **Location Badge**: Shows if you're "In Class" or "Outside"
3. **Auto-Mark Popup**: Notification when attendance is automatically recorded

#### Manual Override

Students can still manually mark attendance by:

- Clicking the "Mark Attendance" button during class
- Useful if auto-detection fails or for immediate confirmation

### For Teachers

Teachers retain full control:

- View real-time attendance status
- Manually edit individual records
- Use "Auto-Absent Remaining" button to mark no-shows at class end
- Generate PDF reports of attendance

## Technical Implementation

### Files Created/Modified

1. **`/src/services/auto-attendance-service.js`** (NEW)
   - Singleton service managing automatic attendance
   - Handles geolocation checks and database updates
   - Configurable check frequency (default: 2 minutes)

2. **`/src/pages/StudentDashboard.jsx`** (MODIFIED)
   - Integrated auto-attendance service
   - Added visual status indicators
   - Callback handling for auto-marked attendance

### Service Configuration

```javascript
// Default settings
CHECK_FREQUENCY_MS = 2 * 60 * 1000  // 2 minutes
GPS_BUFFER = 5 meters                // Geofence buffer
ALTITUDE_TOLERANCE = ±15 meters      // Floor detection tolerance
LATE_THRESHOLD = 10 minutes          // After class start
```

### Database Schema

Uses existing `attendance` table:

```sql
- student_id (UUID)
- class_id (UUID)
- date (DATE)
- status ('present' | 'late' | 'absent')
- class_name (TEXT)
- recorded_at (TIMESTAMP)
```

## Privacy & Security

### Location Access

- ✅ Location is only checked during class hours
- ✅ No location data is stored (only attendance status)
- ✅ Students can see when monitoring is active (green banner)
- ✅ Requires browser geolocation permission

### Data Protection

- Location checks happen client-side
- Only attendance status is sent to database
- Complies with educational privacy standards

## Performance

### Scalability

- **60 students**: ✅ Easily handled
- **200+ students**: ✅ No issues (free tier)
- **1000+ students**: Consider Supabase Pro

### Battery Impact

- **Minimal**: Checks every 2 minutes (not continuous)
- Uses cached location data when possible
- Service stops when no class is in session

## Troubleshooting

### Attendance Not Auto-Marking?

**Check:**

1. ✅ Location permissions enabled in browser
2. ✅ GPS signal available (not in basement/tunnel)
3. ✅ Currently within class time window
4. ✅ Inside classroom geofence boundaries
5. ✅ On correct floor (altitude check)
6. ✅ Not already marked for this class

### Manual Fallback

If auto-attendance fails, students can always:

- Click "Mark Attendance" button manually
- Contact teacher to manually add record

## Future Enhancements

Potential improvements:

- [ ] Bluetooth beacon support for indoor accuracy
- [ ] WiFi-based location as fallback
- [ ] Configurable check frequency per institution
- [ ] Parent notifications for auto-marked attendance
- [ ] Analytics dashboard for attendance patterns

## Benefits

### For Students

- ✅ No need to remember to mark attendance
- ✅ Automatic tracking when in classroom
- ✅ Transparent monitoring (visible status)
- ✅ Manual override available

### For Teachers

- ✅ More accurate attendance records
- ✅ Less time spent on roll call
- ✅ Real-time attendance visibility
- ✅ Reduced proxy attendance fraud

### For Administrators

- ✅ Higher attendance accuracy
- ✅ Better data for analytics
- ✅ Reduced administrative overhead
- ✅ Scalable to large student populations

---

**Last Updated**: February 17, 2026  
**Version**: 1.0.0
