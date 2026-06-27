import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';


import Home from './components/pages/Home';
import { AuthProvider, useAuth } from './components/all_login/AuthContext';
import SupervisorDashBoard from "./components/supervisor_panel/SupervisorDashBoard";
import ThrSupervisorDistributions from "./components/supervisor_panel/ThrSupervisorDistributions";
import NavBar from './components/nav_bar/NavBar';
import Login from "./components/all_login/Login";
import DPODashboard from "./components/DPO_panel/DPODashboard";
import AnganwadiDashboard from "./components/anganwadi_panel/AnganwadiDashboard";
import AnganwadiProfile from "./components/anganwadi_panel/AnganwadiProfile";
import CDPODashboard from "./components/CDPO_panel/CDPODashboard";
import DirectorDashboard from "./components/director_panel/DirectorDashboard";
import Footer from "./components/footer/Footer";
import SectorProfile from "./components/supervisor_panel/SectorProfile";
import DirectorFoodItems from "./components/director_panel/DirectorFoodItems";
import HCMDirectorReport from "./components/director_panel/HCMDirectorReport";
import THRDirectorReport from "./components/director_panel/THRDirectorReport";
import ITCellDashBoard from "./components/it_cell_panel/ITCellDashBoard";
import ThrCdpoDistributions from "./components/CDPO_panel/ThrCdpoDistributions";
import ThrDpoDistributions from "./components/DPO_panel/ThrDpoDistributions";
import HcmSupervisorDistributions from "./components/supervisor_panel/HcmSupervisorDistributions";



//  Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isReady } = useAuth();
  const location = useLocation();

  // While checking auth state, show nothing (prevents flash of wrong content)
  if (!isReady) {
    return null;
  }

  // If not authenticated, redirect to login (with return URL)
  if (!isAuthenticated) {
    return <Navigate to="/Login" state={{ from: location }} replace />;
  }

  return children;
};

function AppContent() {
  const location = useLocation();

  const hideNavbarRoutes = ["/SupervisorDashBoard", "/HcmSupervisorDistributions", "/DPODashboard", "/AnganwadiDashboard", "/CDPODashboard", "/DirectorDashboard", "/AnganwadiProfile","/SectorProfile", "/director/food-items", "/ITCellDashBoard", "/thr-supervisor-distributions","/HCMDirectorReport","/THRDirectorReport", "/ThrCdpoDistributions", "/ThrDpoDistributions"];
  const hideFooterRoutes = ["/SupervisorDashBoard", "/HcmSupervisorDistributions", "/DPODashboard", "/AnganwadiDashboard", "/CDPODashboard", "/DirectorDashboard", "/AnganwadiProfile","/SectorProfile", "/director/food-items", "/ITCellDashBoard", "/thr-supervisor-distributions","/HCMDirectorReport","/THRDirectorReport", "/ThrCdpoDistributions", "/ThrDpoDistributions"];
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);
  const shouldHideFooter = hideFooterRoutes.includes(location.pathname);

  return (
    <>
      {!shouldHideNavbar && <NavBar />}
      <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/SupervisorDashBoard" element={
            <ProtectedRoute>
              <SupervisorDashBoard />
            </ProtectedRoute>
          } />
          <Route path="/DPODashboard" element={
            <ProtectedRoute>
              <DPODashboard />
            </ProtectedRoute>
          } />
          <Route path="/AnganwadiDashboard" element={
            <ProtectedRoute>
              <AnganwadiDashboard />
            </ProtectedRoute>
          } />
          <Route path="/AnganwadiProfile" element={
            <ProtectedRoute>
              <AnganwadiProfile />
            </ProtectedRoute>
          } />
          <Route path="/ThrDpoDistributions" element={
            <ProtectedRoute>
              <ThrDpoDistributions />               
            </ProtectedRoute>
          } />
          <Route path="/CDPODashboard" element={
            <ProtectedRoute>
              <CDPODashboard />
            </ProtectedRoute>
          } />

          <Route path="/DirectorDashboard" element={
            <ProtectedRoute>
              <DirectorDashboard />
            </ProtectedRoute>
          } />
           <Route path="/director/food-items" element={
            <ProtectedRoute>
              <DirectorFoodItems />
            </ProtectedRoute>
          } />
          <Route path="/HCMDirectorReport" element={
            <ProtectedRoute>
              <HCMDirectorReport />
            </ProtectedRoute>
          } />
          <Route path="/THRDirectorReport" element={
            <ProtectedRoute>
              <THRDirectorReport />
            </ProtectedRoute>
          } />
           <Route path="/ThrCdpoDistributions" element={
            <ProtectedRoute>
              <ThrCdpoDistributions />
            </ProtectedRoute>
          } />
            <Route path="/SectorProfile" element={
             <ProtectedRoute>
               <SectorProfile /> 
             </ProtectedRoute>
           } />
            <Route path="/thr-supervisor-distributions" element={
             <ProtectedRoute>
               <ThrSupervisorDistributions />
             </ProtectedRoute>
           } />
            <Route path="/ITCellDashBoard" element={
            <ProtectedRoute>
              <ITCellDashBoard />
            </ProtectedRoute>
          } />
             <Route path="/HcmSupervisorDistributions" element={
            <ProtectedRoute>
              <HcmSupervisorDistributions />
            </ProtectedRoute>
          } />
            
          <Route path="/Login" element={<Login />} />
          
        </Routes>
        {!shouldHideFooter && <Footer />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router basename="/angfoodproject">
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
