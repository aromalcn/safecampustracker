import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import LandingPage from "./pages/LandingPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminTimetable from "./pages/AdminTimetable";
import AdminLocations from "./pages/AdminLocations";
import AdminAttendance from "./pages/AdminAttendance";
import AdminSettings from "./pages/AdminSettings";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import AdminExams from "./pages/AdminExams";
import AdminResults from "./pages/AdminResults";
import Reports from "./pages/Reports";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherAttendance from "./pages/TeacherAttendance";
import TeacherStudents from "./pages/TeacherStudents";
import TeacherSchedule from "./pages/TeacherSchedule";
import TeacherExams from "./pages/TeacherExams";
import TeacherResults from "./pages/TeacherResults";
import TeacherChat from "./pages/TeacherChat";
import StudentAttendance from "./pages/StudentAttendance";
import StudentNotices from "./pages/StudentNotices";
import StudentSafety from "./pages/StudentSafety";
import StudentChat from "./pages/StudentChat";
import StudentTimetable from "./pages/StudentTimetable";
import StudentExams from "./pages/StudentExams";
import StudentResults from "./pages/StudentResults";

import ParentDashboard from "./pages/ParentDashboard";
import ParentChat from "./pages/ParentChat";
import ParentResults from "./pages/ParentResults";
import ParentTracking from "./pages/ParentTracking";
import ParentAlerts from "./pages/ParentAlerts";
import Onboarding from "./pages/Onboarding";
import UserProfile from "./pages/UserProfile";
import Rooms from "./pages/Rooms";
import AdminAlerts from "./pages/AdminAlerts";
import TeacherAlerts from "./pages/TeacherAlerts";
import AdminChat from "./pages/AdminChat";
import TeacherAnnouncements from "./pages/TeacherAnnouncements";
import ParentAnnouncements from "./pages/ParentAnnouncements";

// Layout Imports
import Layout from "./components/Layout"; // Admin
import StudentLayout from "./components/StudentLayout";
import TeacherLayout from "./components/TeacherLayout";
import ParentLayout from "./components/ParentLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Onboarding />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        {/* Admin Routes */}
        <Route path="/admin" element={<Layout />}>
          <Route index element={<AdminDashboard />} />
          {/* Emergency integrated into 'safety' (AdminAlerts) */}
          <Route path="users" element={<AdminUsers />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="timetable" element={<AdminTimetable />} />
          <Route path="exams" element={<AdminExams />} />
          <Route path="results" element={<AdminResults />} />
          <Route path="safety" element={<AdminAlerts />} />
          <Route path="alerts" element={<AdminAlerts />} />
          <Route path="tracking" element={<AdminLocations />} />
          <Route path="locations" element={<AdminLocations />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="messages" element={<AdminChat />} />
          <Route path="profile" element={<UserProfile />} />
        </Route>
        {/* Student Routes */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="timetable" element={<StudentTimetable />} />
          <Route path="exams" element={<StudentExams />} />
          <Route path="results" element={<StudentResults />} />
          <Route path="notices" element={<StudentNotices />} />
          <Route path="safety" element={<StudentSafety />} />
          <Route path="chat" element={<StudentChat />} />
          <Route path="messages" element={<StudentChat />} />
          <Route path="profile" element={<UserProfile />} />
        </Route>
        {/* Teacher Routes */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="classes" element={<TeacherStudents />} />
          <Route path="chat" element={<TeacherChat />} />
          <Route path="messages" element={<TeacherChat />} />
          <Route path="safety" element={<TeacherAlerts />} />
          <Route path="schedule" element={<TeacherSchedule />} />
          <Route path="exams" element={<TeacherExams />} />
          <Route path="results" element={<TeacherResults />} />
          <Route path="announcements" element={<TeacherAnnouncements />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<UserProfile />} />
        </Route>
        {/* Parent Routes */}
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<ParentDashboard />} />
          <Route path="chat" element={<ParentChat />} />
          <Route path="tracking" element={<ParentTracking />} />
          <Route path="alerts" element={<ParentAlerts />} />
          <Route path="announcements" element={<ParentAnnouncements />} />
          <Route path="results" element={<ParentResults />} />
          <Route path="profile" element={<UserProfile />} />
        </Route>
        {/* Standalone Pages (Wrapped in Layouts if navigated to directly? or just leave them) */}
        <Route path="/profile" element={<UserProfile />} />{" "}
        {/* Generic Profile Access */}
        <Route path="/rooms" element={<Rooms />} /> {/* Public access? */}
        {/* 404 / Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
