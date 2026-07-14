import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Table, Tabs, Tab } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/dpo.css";
import DPOHeader from "./DPOHeader";
import DPOLeftNav from "./DPOLeftNav";

function DpoAwcList() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeTab, setActiveTab] = useState("awc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [awcData, setAwcData] = useState([]);
  const [sectorData, setSectorData] = useState([]);
  const [projectData, setProjectData] = useState([]);
  const [awcCount, setAwcCount] = useState(0);
  const [sectorCount, setSectorCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const { api } = useAuth();

  const queryTab = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("tab") || "awc";
  }, [location.search]);

  useEffect(() => {
    setActiveTab(queryTab);
  }, [queryTab]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!api) return;

    const fetchLists = async () => {
      setLoading(true);
      setError("");

      try {
        const [awcResponse, sectorResponse, projectResponse] = await Promise.all([
          api.get("/dpo-awc-dropdown/"),
          api.get("/dpo-sector-list/"),
          api.get("/dpo-project-list/"),
        ]);

        const awcPayload = awcResponse.data;
        const sectorPayload = sectorResponse.data;
        const projectPayload = projectResponse.data;

        setAwcData(Array.isArray(awcPayload?.data) ? awcPayload.data : []);
        setAwcCount(awcPayload?.count ?? (Array.isArray(awcPayload?.data) ? awcPayload.data.length : 0));

        setSectorData(Array.isArray(sectorPayload?.data) ? sectorPayload.data : []);
        setSectorCount(sectorPayload?.count ?? (Array.isArray(sectorPayload?.data) ? sectorPayload.data.length : 0));

        setProjectData(Array.isArray(projectPayload?.data) ? projectPayload.data : []);
        setProjectCount(projectPayload?.count ?? (Array.isArray(projectPayload?.data) ? projectPayload.data.length : 0));
      } catch (err) {
        console.error("Failed to fetch DPO AWC/Sector/Project lists:", err);
        setError("Failed to load AWC, sector, or project data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, [api]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="dashboard-container">
      <DPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <DPOHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="dashboard-section">
            <h4 className="section-title">CDPO AWC & Sector List</h4>
            {error && <Alert variant="danger">{error}</Alert>}

            {loading ? (
              <div className="text-center p-4">
                <Spinner animation="border" />
              </div>
            ) : (
              <>
              

                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  id="cdpo-awc-list-tabs"
                  className="mb-4"
                >
                  <Tab eventKey="awc" title={`AWC List (${awcCount})`}>
                    <div className="table-responsive">
                      <Table striped bordered hover responsive className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>AWC Code</th>
                            <th>AWC Name</th>
                            <th>AWC Type</th>
                            <th>Code</th>
                            <th>Sector</th>
                            <th>Project</th>
                            <th>District</th>
                          </tr>
                        </thead>
                        <tbody>
                          {awcData.map((item, index) => (
                            <tr key={item.awc_code ?? item.id ?? index}>
                              <td>{index + 1}</td>
                              <td>{item.awc_code}</td>
                              <td>{item.awc_name}</td>
                              <td>{item.awc_type}</td>
                              <td>{item.code1}</td>
                              <td>{item.sector}</td>
                              <td>{item.project}</td>
                              <td>{item.district_name ?? item.district}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Tab>
                  <Tab eventKey="sector" title={`Sector List (${sectorCount})`}>
                    <div className="table-responsive">
                      <Table striped bordered hover responsive className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>SD Name</th>
                            <th>District</th>
                            <th>Project Code</th>
                            <th>Project Name</th>
                            <th>Sector</th>
                            <th>Sector Incharge</th>
                            <th>Incharge Mobile</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectorData.map((item, index) => (
                            <tr key={item.id ?? index}>
                              <td>{index + 1}</td>
                              <td>{item.sdname}</td>
                              <td>{item.district}</td>
                              <td>{item.project_code}</td>
                              <td>{item.project_name}</td>
                              <td>{item.sector}</td>
                              <td>{item.sector_incharge}</td>
                              <td>{item.incharge_mob}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Tab>
                  <Tab eventKey="project" title={`Project List (${projectCount})`}>
                    <div className="table-responsive">
                      <Table striped bordered hover responsive className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Project Code</th>
                            <th>Project Name</th>
                            <th>Project Show</th>
                            <th>Status</th>
                            <th>ANG Pur</th>
                            <th>Adhar Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectData.map((item, index) => (
                            <tr key={item.id ?? index}>
                              <td>{index + 1}</td>
                              <td>{item.project_code}</td>
                              <td>{item.project_name}</td>
                              <td>{item.project_show}</td>
                              <td>{item.stat_fin}</td>
                              <td>{item.ang_pur}</td>
                              <td>{item.adhar_stat}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Tab>
                </Tabs>
              </>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
}

export default DpoAwcList;