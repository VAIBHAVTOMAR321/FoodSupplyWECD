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

import "./style.css";
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
import HcmCdpoDistributions from "./components/CDPO_panel/HcmCdpoDistributions";
import HcmDpoDistributions from "./components/DPO_panel/HcmDpoDistributions";
import ITCellHCMDistributions from "./components/it_cell_panel/ITCellHCMDistributions";
import ITCellHCMReceiving from "./components/it_cell_panel/ITCellHCMReceiving";
import ITCellHCMReport from "./components/it_cell_panel/ITCellHCMReport";
import ITCellTHRDistributions from "./components/it_cell_panel/ITCellTHRDistributions";
import ITCellTHRReport from "./components/it_cell_panel/ITCellTHRReport";
import ITCellFoodItem from "./components/it_cell_panel/ITCellFoodItem";
import AllRoleResetpassword from "./components/it_cell_panel/AllRoleResetpassword";
import ITBeneEntry from "./components/it_cell_panel/ITBeneEntry";
import FoodItemReceiving from "./components/anganwadi_panel/FoodItemReceiving";
import StudentForm from "./components/DPO_panel/StudentForm";
import BeneficiarieEntry from "./components/anganwadi_panel/BeneficiarieEntry";
import ThrSupervisorReceiving from "./components/supervisor_panel/ThrSupervisorReceiving";
import HcmSupervisorReceiving from "./components/supervisor_panel/HcmSupervisorReceiving";
import SupervisorBeneficiarieEntry from "./components/supervisor_panel/SupervisorBeneficiarieEntry";
import CDPOBeneEntry from "./components/CDPO_panel/CDPOBeneEntry";
import DPOBeneEntry from "./components/DPO_panel/DPOBeneEntry";
import DirectorBeneEntry from "./components/director_panel/DirectorBeneEntry";
import CDPOTHRReceiving from "./components/CDPO_panel/CDPOTHRReceiving";
import CDPOHCMReceiving from "./components/CDPO_panel/CDPOHCMReceiving";
import DPOTHRReceiving from "./components/DPO_panel/DPOTHRReceiving";
import DPOHCMReceiving from "./components/DPO_panel/DPOHCMReceiving";
import DirectorHCMReceiving from "./components/director_panel/DirectorHCMReceiving";
import DirectorTHRReceiving from "./components/director_panel/DirectorTHRReceiving";
import ITCellTHRReceiving from "./components/it_cell_panel/ITCellTHRReceiving";
import DirFoodItemReceiving from "./components/director_panel/DirFoodItemReceiving";
import AwcAganWadi from "./components/supervisor_panel/AwcAganWadi";
import CdpoAWCList from "./components/CDPO_panel/CdpoAWCList";
import DpoAwcList from "./components/DPO_panel/DpoAwcList";



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

const hideNavbarRoutes = ["/DirectorHCMReceiving", "/DirectorTHRReceiving", "/DirectorBeneEntry", "/CDPOBeneEntry", "/CDPOHCMReceiving", "/AwcAganWadi",
      "/DPOBeneEntry", "/CDPOTHRReceiving", "/DPOTHRReceiving", "/DPOHCMReceiving", "/DirFoodItemReceiving", "/CdpoAWCList",
      "/SupervisorBeneficiarieEntry", "/ThrSupervisorReceiving", "/HcmSupervisorReceiving", "/BeneficiarieEntry", "/StudentForm","/SupervisorDashBoard", "/FoodItemReceiving", "/AllRoleResetpassword", "/HcmDpoDistributions","/HcmCdpoDistributions", "/HcmSupervisorDistributions", "/DPODashboard", "/DpoAwcList", "/AnganwadiDashboard", "/CDPODashboard", "/DirectorDashboard", "/AnganwadiProfile","/SectorProfile", "/director/food-items", "/ITCellDashBoard", "/ITBeneEntry", "/thr-supervisor-distributions","/HCMDirectorReport","/THRDirectorReport", "/ThrCdpoDistributions", "/ThrDpoDistributions", "/ITCellHCMDistributions", "/ITCellHCMReport", "/ITCellTHRDistributions", "/ITCellTHRReport", "/ITCellFoodItem", "/ITCellHCMReceiving", "/ITCellTHRReceiving"];
const hideFooterRoutes = ["/DirectorHCMReceiving", "/DirectorTHRReceiving", "/DirectorBeneEntry", "/CDPOBeneEntry", "/DPOBeneEntry", "/CDPOTHRReceiving", "/CDPOHCMReceiving", "/DPOTHRReceiving", "/DirFoodItemReceiving",
      "/SupervisorBeneficiarieEntry", "/ThrSupervisorReceiving", "/HcmSupervisorReceiving", "/BeneficiarieEntry", "/StudentForm","/SupervisorDashBoard", "/FoodItemReceiving", "/AllRoleResetpassword","/HcmDpoDistributions", "/HcmCdpoDistributions", "/AwcAganWadi", "/CdpoAWCList", "/DpoAwcList", "/HcmSupervisorDistributions", "/DPODashboard", "/AnganwadiDashboard", "/CDPODashboard", "/DirectorDashboard", "/AnganwadiProfile","/SectorProfile", "/director/food-items", "/ITCellDashBoard", "/ITBeneEntry", "/thr-supervisor-distributions","/HCMDirectorReport","/THRDirectorReport", "/ThrCdpoDistributions", "/ThrDpoDistributions", "/ITCellHCMDistributions", "/ITCellHCMReport", "/ITCellTHRDistributions", "/ITCellTHRReport", "/ITCellFoodItem", "/ITCellHCMReceiving", "/ITCellTHRReceiving"];
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
          <Route path="/DpoAwcList" element={
            <ProtectedRoute>
              <DpoAwcList />
            </ProtectedRoute>
          } />

           <Route path="/CdpoAWCList" element={
            <ProtectedRoute>
              <CdpoAWCList />
            </ProtectedRoute>
          } />

           <Route path="/CDPOHCMReceiving" element={
            <ProtectedRoute>
              <CDPOHCMReceiving />
            </ProtectedRoute>
          } />


          

           <Route path="/StudentForm" element={
            <ProtectedRoute>
              <StudentForm />
            </ProtectedRoute>
          } />

          
           <Route path="/CDPOTHRReceiving" element={
            <ProtectedRoute>
              <CDPOTHRReceiving />
            </ProtectedRoute>
          } />

            <Route path="/DPOTHRReceiving" element={
            <ProtectedRoute>
              <DPOTHRReceiving />
            </ProtectedRoute>
          } />

           <Route path="/DirFoodItemReceiving" element={
            <ProtectedRoute>
              <DirFoodItemReceiving />
            </ProtectedRoute>
          } />
            <Route path="/DPOHCMReceiving" element={
            <ProtectedRoute>
              <DPOHCMReceiving />
            </ProtectedRoute>
          } />

           <Route path="/DirectorHCMReceiving" element={
            <ProtectedRoute>
              <DirectorHCMReceiving />
            </ProtectedRoute>
          } />

           <Route path="/DirectorTHRReceiving" element={
            <ProtectedRoute>
              <DirectorTHRReceiving />
            </ProtectedRoute>
          } />



            <Route path="/DirectorBeneEntry" element={
            <ProtectedRoute>
              <DirectorBeneEntry />
            </ProtectedRoute>
          } />

            <Route path="/CDPOBeneEntry" element={
            <ProtectedRoute>
              <CDPOBeneEntry />
            </ProtectedRoute>
          } />

           <Route path="/DPOBeneEntry" element={
            <ProtectedRoute>
              <DPOBeneEntry />
            </ProtectedRoute>
          } />

           <Route path="/BeneficiarieEntry" element={
            <ProtectedRoute>
              <BeneficiarieEntry />
            </ProtectedRoute>
          } />

          <Route path="/HcmDpoDistributions" element={
            <ProtectedRoute>
              <HcmDpoDistributions />
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
           <Route path="/ThrSupervisorReceiving" element={
            <ProtectedRoute>
              <ThrSupervisorReceiving />               
            </ProtectedRoute>
          } />
          <Route path="/CDPODashboard" element={
            <ProtectedRoute>
              <CDPODashboard />
            </ProtectedRoute>
          } />

           <Route path="/HcmSupervisorReceiving" element={
            <ProtectedRoute>
              <HcmSupervisorReceiving />
            </ProtectedRoute>
          } />
           <Route path="/SupervisorBeneficiarieEntry" element={
            <ProtectedRoute>
              <SupervisorBeneficiarieEntry />
            </ProtectedRoute>
          } />

            <Route path="/ITCellFoodItem" element={
            <ProtectedRoute>
              <ITCellFoodItem />
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
              <Route path="/ITBeneEntry" element={
             <ProtectedRoute>
               <ITBeneEntry />
             </ProtectedRoute>
           } />
              <Route path="/HcmSupervisorDistributions" element={
            <ProtectedRoute>
              <HcmSupervisorDistributions />
            </ProtectedRoute>
          } />

            <Route path="/HcmCdpoDistributions" element={
            <ProtectedRoute>
              <HcmCdpoDistributions />
            </ProtectedRoute>
          } />

           <Route path="/ITCellHCMDistributions" element={
            <ProtectedRoute>
              <ITCellHCMDistributions />
            </ProtectedRoute>
          } />

          <Route path="/ITCellHCMReceiving" element={
            <ProtectedRoute>
              <ITCellHCMReceiving />
            </ProtectedRoute>
          } />



           <Route path="/ITCellHCMReport" element={
            <ProtectedRoute>
              <ITCellHCMReport />
            </ProtectedRoute>
          } />

           <Route path="/ITCellTHRDistributions" element={
            <ProtectedRoute>
              <ITCellTHRDistributions />
            </ProtectedRoute>
          } />

             <Route path="/AllRoleResetpassword" element={
            <ProtectedRoute>
              <AllRoleResetpassword />
            </ProtectedRoute>
          } />

            <Route path="/FoodItemReceiving" element={
            <ProtectedRoute>
              <FoodItemReceiving />
            </ProtectedRoute>
          } />

           <Route path="/ITCellTHRReport" element={
            <ProtectedRoute>
              <ITCellTHRReport />
            </ProtectedRoute>
          } />

          <Route path="/ITCellTHRReceiving" element={
            <ProtectedRoute>
              <ITCellTHRReceiving />
            </ProtectedRoute>
          } />

          <Route path="/AwcAganWadi" element={
            <ProtectedRoute>
              <AwcAganWadi />
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
