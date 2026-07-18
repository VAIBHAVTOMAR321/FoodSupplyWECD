import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Collapse, Table, Button, ButtonGroup, Tooltip, OverlayTrigger } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/directorleftnav.css";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  DoughnutController,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { FaUsers, FaUserShield, FaUserGraduate, FaUserCog, FaUserTie, FaHome, FaUserFriends, FaBox, FaChevronDown, FaChevronUp, FaTruckLoading } from "react-icons/fa";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  DoughnutController,
  Title,
  ChartTooltip,
  Legend,
  ChartDataLabels
);


const DirectorDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hcmSummary, setHcmSummary] = useState(null);
  const [thrSummary, setThrSummary] = useState(null);
  const [hcmFoodItemsCount, setHcmFoodItemsCount] = useState(0);
  const [thrFoodItemsCount, setThrFoodItemsCount] = useState(0);
  const [roleCounts, setRoleCounts] = useState({
    dpo: 0,
    cdpo: 0,
    supervisor: 0,
    anganwadi: 0,
  });
  const [loadingRoles, setLoadingRoles] = useState({
    dpo: true,
    cdpo: true,
    supervisor: true,
    anganwadi: true,
  });
  const [totalBeneficiaries, setTotalBeneficiaries] = useState(0);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [beneficiaryCategoryTotals, setBeneficiaryCategoryTotals] = useState(null);
  const [viewMode, setViewMode] = useState("card");
  const [overallData, setOverallData] = useState(null);

  // Month-wise session & month filter states
  const [monthWiseData, setMonthWiseData] = useState(null);
  const [loadingMonthWise, setLoadingMonthWise] = useState(false);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("All Months");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchHcmFoodItems = async () => {
    try {
      const response = await api.get("/hcm-food-items/");
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setHcmFoodItemsCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error("Failed to fetch HCM food items:", err);
    }
  };

  const fetchThrFoodItems = async () => {
    try {
      const response = await api.get("/thr-food-items/");
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setThrFoodItemsCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error("Failed to fetch THR food items:", err);
    }
  };

  const fetchDashboardSummaries = async () => {
    try {
      const [hcmRes, thrRes] = await Promise.all([ 
        api.get("/director/dashboard/hcm/"),
        api.get("/director/dashboard/thr/")
      ]);
      setHcmSummary(hcmRes.data);
      setThrSummary(thrRes.data);
    } catch (err) {
      setError("Failed to fetch dashboard summaries.");
      console.error("Dashboard summary fetch error:", err);
    }
  };

  const fetchRoleCount = async (role, endpoint) => {
    setLoadingRoles(prev => ({ ...prev, [role]: true }));
    try {
      const response = await api.get(endpoint);
      let data = response.data?.data || [];
      if (role === 'dpo') {
        data = data.filter(u => u.role === 'dpo');
      }
      setRoleCounts(prev => ({ ...prev, [role]: data.length }));
    } catch (err) {
      console.error(`Failed to fetch ${role} count:`, err);
    } finally {
      setLoadingRoles(prev => ({ ...prev, [role]: false }));
    }
  };

  const fetchAwcCount = async () => {
    setLoadingRoles(prev => ({ ...prev, anganwadi: true }));
    try {
      const response = await api.get('/director/awc/count/');
      if (response.data.success) {
        setRoleCounts(prev => ({ ...prev, anganwadi: response.data.total_awc }));
      }
    } catch (err) {
      console.error(`Failed to fetch anganwadi count:`, err);
    } finally {
      setLoadingRoles(prev => ({ ...prev, anganwadi: false }));
    }
  };

  const fetchTotalBeneficiaries = async () => {
    setLoadingBeneficiaries(true);
     try {
       const response = await api.get('/director/beneficiary/total-category/');
       if (response.data.success) {
         setBeneficiaryCategoryTotals(response.data.state_total);
         setTotalBeneficiaries(response.data.state_total.total_beneficiaries);
       }
     } catch (err) {
       console.error("Failed to fetch total beneficiaries count:", err);
     } finally {
       setLoadingBeneficiaries(false);
     }
  };

  const fetchOverallDashboardData = async () => {
    try {
      const response = await api.get("/director/dashboard/overall/");
      if (response.data.success) {
        setOverallData(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch overall dashboard data:", err);
    }
  };

  // Fetch month-wise data and default to first (current) session
  const fetchMonthWiseData = async () => {
    setLoadingMonthWise(true);
    try {
      const response = await api.get("/director-beneficiary-state-monthwise-category/");
      if (response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
        setMonthWiseData(response.data.data);
        // Default to first session (current) with all months
        setSelectedSession(response.data.data[0].fin_year);
        setSelectedMonth("All Months");
      } else {
        setMonthWiseData([]);
        setSelectedSession("");
        setSelectedMonth("All Months");
      }
    } catch (err) {
      console.error("Failed to fetch month-wise beneficiary data:", err);
      setMonthWiseData([]);
    } finally {
      setLoadingMonthWise(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError("");

    fetchRoleCount('dpo', '/director/districts/');
    fetchRoleCount('cdpo', '/director/projects/');
    fetchRoleCount('supervisor', '/director/sectors/');
    fetchAwcCount();
    fetchTotalBeneficiaries();
    fetchOverallDashboardData();
    fetchMonthWiseData();

    try {
      await Promise.all([
        fetchDashboardSummaries(), 
        fetchHcmFoodItems(), 
        fetchThrFoodItems()
      ]);
    } catch (err) {
      setError("Failed to fetch Director dashboard data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (api) {
      fetchAllData();
    }
  }, [api]);
 
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // When session changes, reset month to "All Months"
  const handleSessionChange = (e) => {
    setSelectedSession(e.target.value);
    setSelectedMonth("All Months");
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  // Extract unique sessions from API response
  const sessionList = useMemo(() => {
    if (!monthWiseData || !Array.isArray(monthWiseData)) return [];
    return monthWiseData.map(item => item.fin_year);
  }, [monthWiseData]);

  // Get months array for the currently selected session
  const currentSessionMonths = useMemo(() => {
    if (!monthWiseData || !Array.isArray(monthWiseData) || !selectedSession) return [];
    const found = monthWiseData.find(item => item.fin_year === selectedSession);
    return found && Array.isArray(found.month_wise) ? found.month_wise : [];
  }, [monthWiseData, selectedSession]);

  // Build chart data based on session + month selection
  const beneficiaryChartData = useMemo(() => {
    const labels = [
      "PW & LM",
      "Child (6m-3y)",
      "Child (3-6y)",
      "Adol. Girls",
      "SAM (6m-3y)",
      "SAM (3-5y)",
      "SUW (6m-3y)",
      "SUW (3-6y)",
    ];
    const colors = ["#2f6fed", "#20c997", "#ff8c00", "#6f42c1", "#dc3545", "#fd7e14", "#198754", "#0dcaf0"];

    if (!selectedSession || currentSessionMonths.length === 0) {
      return { labels, datasets: [] };
    }

    if (selectedMonth === "All Months") {
      // Sum all months in the selected session
      const summed = {
        pw_lm: 0, children_3_6y: 0, children_6m_3y: 0, adolescent_girls: 0,
        sam_6m_3y: 0, sam_3_5y: 0, suw_6m_3y: 0, suw_3_6y: 0
      };
      currentSessionMonths.forEach(m => {
        summed.pw_lm += (m.pw_lm || 0);
        summed.children_3_6y += (m.children_3_6y || 0);
        summed.children_6m_3y += (m.children_6m_3y || 0);
        summed.adolescent_girls += (m.adolescent_girls || 0);
        summed.sam_6m_3y += (m.sam_6m_3y || 0);
        summed.sam_3_5y += (m.sam_3_5y || 0);
        summed.suw_6m_3y += (m.suw_6m_3y || 0);
        summed.suw_3_6y += (m.suw_3_6y || 0);
      });

      return {
        labels,
        datasets: [{
          label: `All Months (FY ${selectedSession})`,
          data: [summed.pw_lm, summed.children_6m_3y, summed.children_3_6y, summed.adolescent_girls, summed.sam_6m_3y, summed.sam_3_5y, summed.suw_6m_3y, summed.suw_3_6y],
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 6,
        }],
      };
    } else {
      // Specific month selected
      const monthData = currentSessionMonths.find(m => m.month === selectedMonth);
      if (!monthData) return { labels, datasets: [] };

      return {
        labels,
        datasets: [{
          label: `${selectedMonth} (FY ${selectedSession})`,
          data: [monthData.pw_lm || 0, monthData.children_6m_3y || 0, monthData.children_3_6y || 0, monthData.adolescent_girls || 0, monthData.sam_6m_3y || 0, monthData.sam_3_5y || 0, monthData.suw_6m_3y || 0, monthData.suw_3_6y || 0],
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 6,
        }],
      };
    }
  }, [currentSessionMonths, selectedSession, selectedMonth]);

  // Compute display total based on filters
  const displayTotalBeneficiaries = useMemo(() => {
    if (selectedMonth === "All Months") {
      let total = 0;
      currentSessionMonths.forEach(m => { total += (m.total_beneficiaries || 0); });
      return total;
    } else {
      const monthData = currentSessionMonths.find(m => m.month === selectedMonth);
      return monthData ? (monthData.total_beneficiaries || 0) : 0;
    }
  }, [currentSessionMonths, selectedMonth]);

  // Check if chart has any data > 0
  const hasBeneChartData = useMemo(() => {
    if (!beneficiaryChartData.datasets || beneficiaryChartData.datasets.length === 0) return false;
    return beneficiaryChartData.datasets[0].data.some(v => v > 0);
  }, [beneficiaryChartData]);

  // Subtitle text
  const beneSubtitle = useMemo(() => {
    if (!selectedSession) return "Loading session data...";
    if (selectedMonth === "All Months") {
      return `All months summary for FY ${selectedSession}`;
    }
    return `${selectedMonth} data for FY ${selectedSession}`;
  }, [selectedSession, selectedMonth]);

  // Chart options for beneficiary chart
  const beneficiaryChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y?.toLocaleString() || 0;
            return `${context.label}: ${value}`;
          },
        },
      },
      datalabels: {
        display: true,
        color: 'black',
        anchor: 'end',
        align: 'top',
        formatter: (value) => value > 0 ? value.toLocaleString() : '',
        font: { weight: 'bold' },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0, callback: (value) => value.toLocaleString() },
      },
    },
  }), []);

  const FoodItemTable = ({ scheme, api }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      const fetchItems = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await api.get(`/${scheme}-food-items/`);
          const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
          setItems(Array.isArray(data) ? data : []);
        } catch (err) {
          setError(`Failed to fetch ${scheme.toUpperCase()} food items.`);
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchItems();
    }, [scheme, api]);

    if (loading) return <div className="text-center p-4"><Spinner animation="border" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (items.length === 0) return <div className="text-center p-4 text-muted">No food items found.</div>;

    return (
      <div className="table-responsive food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 food-item-table">
          <thead className="table-light sticky-top">
            <tr>
              <th>#</th>
              <th>Food Item</th>
              <th>Quantity Per Beneficiary</th>
              <th>Unit</th>
              <th>Beneficiary Category</th>
              <th>Days Allotted</th>
              <th>Total Quantity</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.food_item}</td>
                <td>{item.qty_per_ben}</td>
                <td>{item.unit}</td>
                <td>{item.bene_category}</td>
                <td>{item.days_allotted}</td>
                <td>{item.total_quantity}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  const ReceivingTable = ({ items }) => { 
    if (!items || items.length === 0) return <div className="text-center p-4 text-muted">No receiving records found.</div>;
    return (
      <div className="table-responsive food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 food-item-table">
          <thead className="table-light sticky-top">
            <tr><th>#</th><th>Quantity</th><th>Unit</th></tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}><td>{index + 1}</td><td>{item.total_quantity}</td><td>{item.unit}</td></tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  const DistributionTable = ({ items }) => { 
    if (!items || items.length === 0) return <div className="text-center p-4 text-muted">No distribution records found.</div>;
    return (
      <div className="table-responsive food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 food-item-table">
          <thead className="table-light sticky-top">
            <tr><th>#</th><th>Total Beneficiaries</th><th>Total Quantity</th><th>Unit</th></tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}><td>{index + 1}</td><td>{item.total_beneficiaries}</td><td>{item.total_quantity}</td><td>{item.unit}</td></tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  const BeneficiarySummaryTable = ({ items }) => { 
    if (!items || items.length === 0) return <div className="text-center p-4 text-muted">No beneficiary summary found.</div>;
    return (
      <div className="table-responsive food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 food-item-table">
          <thead className="table-light sticky-top">
            <tr><th>#</th><th>Category Name</th><th>Beneficiary Count</th></tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.category_id}><td>{index + 1}</td><td>{item.category_name}</td><td>{item.beneficiary_count}</td></tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  const handleCardClick = (scheme) => {
    setExpanded(expanded === scheme ? null : scheme);
  };

  const generateTooltip = (summary, type) => {
    const data = type === 'receiving' ? summary?.receiving_summary : summary?.distribution_summary;
    if (!data || data.length === 0) return <Tooltip>No data available</Tooltip>;
    const unitTotals = data.reduce((acc, item) => {
      const unit = item.unit || 'N/A';
      acc[unit] = (acc[unit] || 0) + safeNumber(item.total_quantity);
      return acc;
    }, {});
    return <Tooltip>{Object.entries(unitTotals).map(([unit, total]) => <div key={unit}>{unit}: {total.toLocaleString()}</div>)}</Tooltip>;
  };

  const thrSummaryChartData = useMemo(() => ({
    labels: ["Beneficiaries", "Received Qty", "Distributed Qty"],
    datasets: [{
      label: "THR Summary",
      data: [
        thrSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0) || 0,
        thrSummary?.receiving_summary?.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0) || 0,
        thrSummary?.distribution_summary?.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0) || 0,
      ],
      backgroundColor: ["#ff8c00", "#dc3545", "#6f42c1"],
      borderRadius: 6,
    }],
  }), [thrSummary]);

  const hcmSummaryChartData = useMemo(() => ({
    labels: ["Beneficiaries", "Received Qty", "Distributed Qty"],
    datasets: [{
      label: "HCM Summary",
      data: [
        hcmSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0) || 0,
        hcmSummary?.receiving_summary?.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0) || 0,
        hcmSummary?.distribution_summary?.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0) || 0,
      ],
      backgroundColor: ["#20c997", "#0dcaf0", "#fd7e14"],
      borderRadius: 6,
    }],
  }), [hcmSummary]);

  const safeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const hasAnyValue = (values) => values.some((value) => safeNumber(value) > 0);

  const roleChartData = useMemo(() => ({
    labels: ["DPO", "CDPO", "Supervisor"],
    datasets: [{
      label: "User counts",
      data: [roleCounts.dpo, roleCounts.cdpo, roleCounts.supervisor],
      backgroundColor: ["#2f6fed", "#20c997", "#ff8c00"],
      borderColor: ["#2f6fed", "#20c997", "#ff8c00"],
      borderWidth: 1,
      borderRadius: 6,
    }],
  }), [roleCounts]);

  const roleDistributionChartData = useMemo(() => ({
    labels: ["DPO", "CDPO", "Supervisor"],
    datasets: [{
      data: hasAnyValue([roleCounts.dpo, roleCounts.cdpo, roleCounts.supervisor]) ? [roleCounts.dpo, roleCounts.cdpo, roleCounts.supervisor] : [1],
      backgroundColor: ["#2f6fed", "#20c997", "#ff8c00"],
      borderColor: ["#ffffff"],
      borderWidth: 2,
    }],
  }), [roleCounts]);

  const schemeComparisonChartData = useMemo(() => ({
    labels: ["Beneficiaries", "Received Qty", "Distributed Qty"],
    datasets: [
      {
        label: "THR",
        data: [
          thrSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_beneficiaries), 0) || 0,
          thrSummary?.receiving_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0) || 0,
          thrSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0) || 0,
        ],
        backgroundColor: "#ff8c00",
      },
      {
        label: "HCM",
        data: [
          hcmSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_beneficiaries), 0) || 0,
          hcmSummary?.receiving_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0) || 0,
          hcmSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0) || 0,
        ],
        backgroundColor: "#20c997",
      },
    ],
  }), [hcmSummary, thrSummary]);

  const categoryWiseChartData = useMemo(() => {
    if (!overallData || !overallData.beneficiary_summary) return { labels: [], datasets: [] };
    const fullLabels = overallData.beneficiary_summary.map(item => item.category);
    const shortLabels = fullLabels.map(label => label.length > 25 ? label.substring(0, 22) + '...' : label);
    return {
      labels: shortLabels,
      datasets: [
        { label: "THR Distributed", fullLabels, data: overallData.beneficiary_summary.map(item => item.thr_distributed), backgroundColor: "#ff8c00" },
        { label: "THR Received", fullLabels, data: overallData.beneficiary_summary.map(item => item.thr_received), backgroundColor: "#dc3545" },
        { label: "HCM Distributed", fullLabels, data: overallData.beneficiary_summary.map(item => item.hcm_distributed), backgroundColor: "#20c997" },
        { label: "HCM Received", fullLabels, data: overallData.beneficiary_summary.map(item => item.hcm_received), backgroundColor: "#fd7e14" },
      ],
    };
  }, [overallData]);

  const getUnitTotals = (summary) => {
    if (!summary) return {};
    return summary.reduce((acc, item) => {
      const unit = item.unit || 'N/A';
      acc[unit] = (acc[unit] || 0) + safeNumber(item.total_quantity);
      return acc;
    }, {});
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.parsed.y?.toLocaleString() || 0;
            let tooltipLines = [`${context.dataset.label || "Value"}: ${value}`];
            const summary = context.dataset.label === "HCM Summary" ? hcmSummary : thrSummary;
            let unitData;
            if (label === "Received Qty") unitData = summary?.receiving_summary;
            else if (label === "Distributed Qty") unitData = summary?.distribution_summary;
            if (unitData) {
              const unitTotals = unitData.reduce((acc, item) => {
                const unit = item.unit || 'N/A';
                acc[unit] = (acc[unit] || 0) + safeNumber(item.total_quantity);
                return acc;
              }, {});
              tooltipLines.push('');
              Object.entries(unitTotals).forEach(([unit, total]) => tooltipLines.push(`${unit}: ${total.toLocaleString()}`));
            }
            return tooltipLines;
          },
        },
      },
      datalabels: { display: true, color: 'black', anchor: 'end', align: 'top', formatter: (value) => value.toLocaleString(), font: { weight: 'bold' } },
    },
    scales: { y: { beginAtZero: true, ticks: { precision: 0, callback: (value) => value.toLocaleString() } } },
  };

  const groupedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y?.toLocaleString() || 0}`,
          footer: (tooltipItems) => {
            const context = tooltipItems[0];
            if (!context) return '';
            const label = context.label || "";
            let footerLines = [''];
            tooltipItems.forEach(item => {
              const summary = item.dataset.label === "HCM" ? hcmSummary : thrSummary;
              let unitData;
              if (label === "Received Qty") unitData = summary?.receiving_summary;
              else if (label === "Distributed Qty") unitData = summary?.distribution_summary;
              if (unitData) {
                const unitTotals = unitData.reduce((acc, item) => {
                  const unit = item.unit || 'N/A';
                  acc[unit] = (acc[unit] || 0) + safeNumber(item.total_quantity);
                  return acc;
                }, {});
                footerLines.push(`${item.dataset.label} Totals:`, ...Object.entries(unitTotals).map(([unit, total]) => `  ${unit}: ${total.toLocaleString()}`));
              }
            });
            return footerLines.length > 1 ? footerLines : '';
          }
        },
      },
      datalabels: { display: true, color: 'black', anchor: 'end', align: 'top', formatter: (value) => value.toLocaleString(), font: { weight: 'bold' } },
    },
    scales: { y: { beginAtZero: true, ticks: { precision: 0, callback: (value) => value.toLocaleString() } } },
  };

  const categoryWiseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          title: (tooltipItems) => {
            const firstItem = tooltipItems[0];
            return firstItem.dataset.fullLabels[firstItem.dataIndex] || firstItem.label;
          },
          label: (context) => `${context.dataset.label}: ${context.parsed.y?.toLocaleString() || 0}`,
          footer: (tooltipItems) => {
            if (!overallData || !overallData.food_item_summary || tooltipItems.length === 0) return '';
            const tooltipItem = tooltipItems[0];
            const category = tooltipItem.dataset.fullLabels[tooltipItem.dataIndex];
            const datasetLabel = tooltipItem.dataset.label;
            const dataKeyMap = { "THR Distributed": "thr_distributed", "THR Received": "thr_received", "HCM Distributed": "hcm_distributed", "HCM Received": "hcm_received" };
            const dataKey = dataKeyMap[datasetLabel];
            if (!dataKey) return '';
            const relevantFoodItems = overallData.food_item_summary.filter((item) => item.beneficiary_category === category && item[dataKey] > 0);
            if (relevantFoodItems.length === 0) return '';
            const footerLines = ['\nFood Item Breakdown:'];
            relevantFoodItems.forEach(item => { footerLines.push(`  - ${item.food_item}: ${item[dataKey].toLocaleString()} ${item.unit}`); });
            return footerLines;
          },
        },
      },
      datalabels: { display: true, color: '#444', anchor: 'end', align: 'top', rotation: -45, offset: 8, formatter: (value) => value.toLocaleString(), overlap: true, font: { weight: 'bold' } },
    },
    scales: { x: { stacked: false }, y: { beginAtZero: true, ticks: { precision: 0, callback: (value) => value.toLocaleString() } } },
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed?.toLocaleString() || 0}` } },
      datalabels: { display: true, color: 'black', formatter: (value, ctx) => { const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); return total > 0 ? `${Math.round((value / total) * 100)}%` : ''; }, font: { weight: 'bold' } },
    },
    cutout: "65%",
  };

  const GraphCard = ({ title, subtitle, children }) => (
    <Card className="dashboard-card h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h6 className="dashboard-card-title mb-1">{title}</h6>
            {subtitle ? <div className="text-muted small">{subtitle}</div> : null}
          </div>
        </div>
        {children}
      </Card.Body>
    </Card>
  );

  return (
    <div className="dashboard-container">
      <DirectorLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3"> 
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          <div className="d-flex justify-content-end mb-3">
            <ButtonGroup size="sm">
              <Button variant={viewMode === "card" ? "primary" : "outline-primary"} onClick={() => setViewMode("card")}>Card View</Button>
              <Button variant={viewMode === "graph" ? "primary" : "outline-primary"} onClick={() => setViewMode("graph")}>Graph View</Button>
            </ButtonGroup>
          </div>

          {viewMode === 'card' && (
            <div className="dashboard-section">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="section-title mb-0">User Lists Overview</h4>
              </div>
              <Row className="g-3">
                <Col md={3}>
                  <Card className="dashboard-card card-hcm h-100" onClick={() => navigate('/DirectorAwcList?tab=dpo')}>
                    <Card.Body>
                      <div className="d-flex align-items-center w-100">
                        <div className="dashboard-card-icon hcm-icon"><FaUserCog /></div>
                        <div className="ms-3 text-start">
                          <h6 className="dashboard-card-title mb-1">DPO List</h6>
                          <div className="dashboard-card-value">{loadingRoles.dpo ? <Spinner animation="border" size="sm" /> : roleCounts.dpo}</div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="dashboard-card card-thr h-100" onClick={() => navigate('/DirectorAwcList?tab=cdpo')}>
                    <Card.Body>
                      <div className="d-flex align-items-center w-100">
                        <div className="dashboard-card-icon thr-icon"><FaUserShield /></div>
                        <div className="ms-3 text-start">
                          <h6 className="dashboard-card-title mb-1">CDPO List</h6>
                          <div className="dashboard-card-value">{loadingRoles.cdpo ? <Spinner animation="border" size="sm" /> : roleCounts.cdpo}</div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="dashboard-card card-hcm h-100" onClick={() => navigate('/DirectorAwcList?tab=supervisor')}>
                    <Card.Body>
                      <div className="d-flex align-items-center w-100">
                        <div className="dashboard-card-icon hcm-icon"><FaUserTie /></div>
                        <div className="ms-3 text-start">
                          <h6 className="dashboard-card-title mb-1">Supervisor List</h6>
                          <div className="dashboard-card-value">{loadingRoles.supervisor ? <Spinner animation="border" size="sm" /> : roleCounts.supervisor}</div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="dashboard-card card-thr h-100" onClick={() => navigate('/DirectorAwcList?tab=anganwadi')}>
                    <Card.Body>
                      <div className="d-flex align-items-center w-100">
                        <div className="dashboard-card-icon thr-icon"><FaHome /></div>
                        <div className="ms-3 text-start">
                          <h6 className="dashboard-card-title mb-1">Anganwadi List</h6>
                          <div className="dashboard-card-value">{loadingRoles.anganwadi ? <Spinner animation="border" size="sm" /> : roleCounts.anganwadi}</div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          <div className="dashboard-section">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="section-title mb-0">Food Items Overview</h4>
            </div>
            {viewMode === 'graph' ? (
              <Row>
                <Col>
                  <GraphCard title="Category-wise Quantities" subtitle="Received vs. Distributed quantities for HCM & THR across beneficiary categories">
                    <div style={{ position: 'relative', height: '500px', overflowX: 'auto' }}>
                      <div style={{ minWidth: `${(overallData?.beneficiary_summary?.length || 0) * 120}px`, height: '100%' }}>
                        {overallData ? (
                          <Bar data={categoryWiseChartData} options={{...categoryWiseChartOptions, maintainAspectRatio: false}} />
                        ) : (
                          <div className="d-flex align-items-center justify-content-center h-100 text-muted">Loading chart data...</div>
                        )}
                      </div>
                    </div>
                  </GraphCard>
                </Col>
              </Row>
            ) : (
              <Row className="g-3">
                <Col md={6}><Card className="dashboard-card card-hcm h-100" onClick={() => navigate('/director/food-items')}><Card.Body><div className="d-flex align-items-center w-100"><div className="dashboard-card-icon hcm-icon"><FaBox /></div><div className="ms-3 text-start"><h6 className="dashboard-card-title">HCM Food Items</h6><div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : hcmFoodItemsCount}</div></div></div></Card.Body></Card></Col>
                <Col md={6}><Card className="dashboard-card card-thr h-100" onClick={() => navigate('/director/food-items')}><Card.Body><div className="d-flex align-items-center w-100"><div className="dashboard-card-icon thr-icon"><FaBox /></div><div className="ms-3 text-start"><h6 className="dashboard-card-title">THR Food Items</h6><div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : thrFoodItemsCount}</div></div></div></Card.Body></Card></Col>
              </Row>
            )}
          </div>

          <div className="dashboard-section">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="section-title mb-0">THR Distribution & Received Summary</h4>
            </div>
            {viewMode === "graph" ? (
              <Row className="g-3">
                <Col lg={8}>
                  <GraphCard title="THR performance overview" subtitle="Comparison of beneficiaries, received quantity, and distributed quantity">
                    <div style={{ height: 340 }}>
                      {hasAnyValue([
                        thrSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_beneficiaries), 0) || 0,
                        thrSummary?.receiving_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0) || 0,
                        thrSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0) || 0,
                      ]) ? (
                        <Bar data={thrSummaryChartData} options={chartOptions} />
                      ) : (
                        <div className="d-flex align-items-center justify-content-center h-100 text-muted">No data available</div>
                      )}
                    </div>
                  </GraphCard>
                </Col>
                <Col lg={4}>
                  <GraphCard title="THR snapshot" subtitle="Key totals at a glance">
                    <div className="d-flex flex-column gap-3">
                      <div className="p-3 rounded bg-light"><div className="text-muted small">Distribution beneficiaries</div><div className="fs-4 fw-bold text-dark">{thrSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_beneficiaries), 0) || 0}</div></div>
                      <OverlayTrigger placement="top" overlay={generateTooltip(thrSummary, 'receiving')}><div className="p-3 rounded bg-light"><div className="text-muted small">Total received quantity</div><div className="fs-4 fw-bold text-dark">{thrSummary?.receiving_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0) || 0}</div></div></OverlayTrigger>
                      <OverlayTrigger placement="top" overlay={generateTooltip(thrSummary, 'distribution')}><div className="p-3 rounded bg-light"><div className="text-muted small">Total distributed quantity</div><div className="fs-4 fw-bold text-dark">{thrSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0) || 0}</div></div></OverlayTrigger>
                    </div>
                  </GraphCard>
                </Col>
              </Row>
            ) : (
              <Row className="g-3"> 
                <Col md={4} className="d-flex">
                  <Card className="dashboard-card card-thr h-100" onClick={() => navigate('/THRDirectorReport')}>
                    <Card.Body>
                      <div className="d-flex align-items-center w-100">
                        <div className="dashboard-card-icon thr-icon"><FaUserFriends /></div>
                        <div className="ms-3 text-start">
                          <h6 className="dashboard-card-title mb-1">THR Distribution</h6>
                          <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : thrSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0).toLocaleString() || 0}</div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <OverlayTrigger placement="top" overlay={generateTooltip(thrSummary, 'receiving')}>
                    <Card className="dashboard-card card-thr expandable-card w-100" onClick={() => handleCardClick('thr-receiving')}>
                      <Card.Body>
                        <div className="d-flex align-items-center">
                          <div className="dashboard-card-icon thr-icon"><FaTruckLoading /></div>
                          <div className="ms-3 text-start">
                            <h6 className="dashboard-card-title">THR Received</h6>
                            <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : thrSummary?.receiving_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0).toLocaleString() || 0}</div>
                          </div>
                          <div className="ms-auto expand-icon">{expanded === 'thr-receiving' ? <FaChevronUp /> : <FaChevronDown />}</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </OverlayTrigger>
                  <Collapse in={expanded === 'thr-receiving'}><div className="mt-3"><ReceivingTable items={thrSummary?.receiving_summary} /></div></Collapse>
                </Col>
                <Col md={4}>
                  <OverlayTrigger placement="top" overlay={generateTooltip(thrSummary, 'distribution')}>
                    <Card className="dashboard-card card-thr expandable-card w-100" onClick={() => handleCardClick('thr-quantity')}>
                      <Card.Body>
                        <div className="d-flex align-items-center">
                          <div className="dashboard-card-icon thr-icon"><FaBox /></div>
                          <div className="ms-3 text-start">
                            <h6 className="dashboard-card-title mb-1">THR Distributed Quantity</h6>
                            <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : thrSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0).toLocaleString() || 0}</div>
                          </div>
                          <div className="ms-auto expand-icon">{expanded === 'thr-quantity' ? <FaChevronUp /> : <FaChevronDown />}</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </OverlayTrigger>
                  <Collapse in={expanded === 'thr-quantity'}><div className="mt-3"><DistributionTable items={thrSummary?.distribution_summary} /></div></Collapse>
                </Col>
              </Row>
            )}
          </div>

          <div className="dashboard-section">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="section-title mb-0">HCM Distribution & Received Summary</h4>
            </div>
            {viewMode === "graph" ? (
              <Row className="g-3">
                <Col lg={8}>
                  <GraphCard title="HCM performance overview" subtitle="Comparison of beneficiaries, received quantity, and distributed quantity">
                    <div style={{ height: 340 }}>
                      {hasAnyValue([
                        hcmSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_beneficiaries), 0) || 0,
                        hcmSummary?.receiving_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0) || 0,
                        hcmSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0) || 0,
                      ]) ? (
                        <Bar data={hcmSummaryChartData} options={chartOptions} />
                      ) : (
                        <div className="d-flex align-items-center justify-content-center h-100 text-muted">No data available</div>
                      )}
                    </div>
                  </GraphCard>
                </Col>
                <Col lg={4}>
                  <GraphCard title="HCM snapshot" subtitle="Key totals at a glance">
                    <div className="d-flex flex-column gap-3">
                      <div className="p-3 rounded bg-light"><div className="text-muted small">Distribution beneficiaries</div><div className="fs-4 fw-bold text-dark">{hcmSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_beneficiaries), 0) || 0}</div></div>
                      <OverlayTrigger placement="top" overlay={generateTooltip(hcmSummary, 'receiving')}><div className="p-3 rounded bg-light"><div className="text-muted small">Total received quantity</div><div className="fs-4 fw-bold text-dark">{hcmSummary?.receiving_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0) || 0}</div></div></OverlayTrigger>
                      <OverlayTrigger placement="top" overlay={generateTooltip(hcmSummary, 'distribution')}><div className="p-3 rounded bg-light"><div className="text-muted small">Total distributed quantity</div><div className="fs-4 fw-bold text-dark">{hcmSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0) || 0}</div></div></OverlayTrigger>
                    </div>
                  </GraphCard>
                </Col>
              </Row>
            ) : (
              <Row className="g-3"> 
                <Col md={4} className="d-flex">
                  <Card className="dashboard-card card-hcm h-100" onClick={() => navigate('/HCMDirectorReport')}>
                    <Card.Body>
                      <div className="d-flex align-items-center w-100">
                        <div className="dashboard-card-icon hcm-icon"><FaUserFriends /></div>
                        <div className="ms-3 text-start">
                          <h6 className="dashboard-card-title mb-1">HCM Distribution</h6>
                          <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : hcmSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0).toLocaleString() || 0}</div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <OverlayTrigger placement="top" overlay={generateTooltip(hcmSummary, 'receiving')}>
                    <Card className="dashboard-card card-hcm expandable-card w-100" onClick={() => handleCardClick('hcm-receiving')}>
                      <Card.Body>
                        <div className="d-flex align-items-center">
                          <div className="dashboard-card-icon hcm-icon"><FaTruckLoading /></div>
                          <div className="ms-3 text-start">
                            <h6 className="dashboard-card-title">HCM Received</h6>
                            <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : hcmSummary?.receiving_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0).toLocaleString() || 0}</div>
                          </div>
                          <div className="ms-auto expand-icon">{expanded === 'hcm-receiving' ? <FaChevronUp /> : <FaChevronDown />}</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </OverlayTrigger>
                  <Collapse in={expanded === 'hcm-receiving'}><div className="mt-3"><ReceivingTable items={hcmSummary?.receiving_summary} /></div></Collapse>
                </Col>
                <Col md={4}>
                  <OverlayTrigger placement="top" overlay={generateTooltip(hcmSummary, 'distribution')}>
                    <Card className="dashboard-card card-hcm expandable-card w-100" onClick={() => handleCardClick('hcm-quantity')}>
                      <Card.Body>
                        <div className="d-flex align-items-center">
                          <div className="dashboard-card-icon hcm-icon"><FaBox /></div>
                          <div className="ms-3 text-start">
                            <h6 className="dashboard-card-title mb-1">HCM Distributed Quantity</h6>
                            <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : hcmSummary?.distribution_summary?.reduce((sum, item) => sum + safeNumber(item.total_quantity), 0).toLocaleString() || 0}</div>
                          </div>
                          <div className="ms-auto expand-icon">{expanded === 'hcm-quantity' ? <FaChevronUp /> : <FaChevronDown />}</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </OverlayTrigger>
                  <Collapse in={expanded === 'hcm-quantity'}><div className="mt-3"><DistributionTable items={hcmSummary?.distribution_summary} /></div></Collapse>
                </Col>
              </Row>
            )}
          </div>

          {/* ====== Beneficiary Overview - Session + Month Filter ====== */}
          <div className="dashboard-section">
            <h4 className="section-title mb-3">Beneficiary Overview</h4>
            {viewMode === "graph" ? (
              <Row className="g-3">
                <Col lg={12}>
                  <GraphCard title="Beneficiary by Category" subtitle={beneSubtitle}>
                    
                    {/* Session Dropdown */}
                    <div className="d-flex align-items-center gap-3 mb-2">
                      <span className="text-muted small fw-medium" style={{ whiteSpace: 'nowrap' }}>Session:</span>
                      <select
                        className="form-select form-select-sm"
                        value={selectedSession}
                        onChange={handleSessionChange}
                        disabled={loadingMonthWise || sessionList.length === 0}
                        style={{ maxWidth: '180px', fontSize: '0.875rem' }}
                      >
                        {loadingMonthWise ? (
                          <option>Loading...</option>
                        ) : sessionList.length === 0 ? (
                          <option>No sessions found</option>
                        ) : (
                          sessionList.map(fy => (
                            <option key={fy} value={fy}>FY {fy}</option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Month Dropdown - populated from selected session's months */}
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <span className="text-muted small fw-medium" style={{ whiteSpace: 'nowrap' }}>Month:</span>
                      <select
                        className="form-select form-select-sm"
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        disabled={loadingMonthWise || !selectedSession}
                        style={{ maxWidth: '180px', fontSize: '0.875rem' }}
                      >
                        <option value="All Months">All Months</option>
                        {currentSessionMonths.map(m => (
                          <option key={m.month} value={m.month}>{m.month}</option>
                        ))}
                      </select>
                      {loadingMonthWise && <Spinner animation="border" size="sm" />}
                    </div>

                    <div className="d-flex flex-column gap-3">
                      {/* Total count with badge */}
                      <div className="d-flex align-items-center gap-3">
                        <div className="display-6 fw-bold" style={{ color: '#0d6efd' }}>
                          {loadingMonthWise ? (
                            <Spinner animation="border" size="sm" />
                          ) : (
                            displayTotalBeneficiaries.toLocaleString()
                          )}
                        </div>
                        {selectedSession && !loadingMonthWise && (
                          <span className="badge rounded-pill" style={{ background: '#e8f0fe', color: '#2f6fed', fontSize: '0.75rem', fontWeight: 600 }}>
                            {selectedMonth === "All Months" ? `All Months - FY ${selectedSession}` : `${selectedMonth} - FY ${selectedSession}`}
                          </span>
                        )}
                      </div>

                      {/* Chart */}
                      <div style={{ height: 320 }}>
                        {loadingMonthWise ? (
                          <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                            <Spinner animation="border" />
                          </div>
                        ) : hasBeneChartData ? (
                          <Bar data={beneficiaryChartData} options={beneficiaryChartOptions} />
                        ) : (
                          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                            <FaUsers size={40} className="mb-2" style={{ opacity: 0.25 }} />
                            <span>
                              {!selectedSession ? "No session data available" : `No beneficiary data for ${selectedMonth === "All Months" ? "this session" : selectedMonth}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </GraphCard>
                </Col>
              </Row>
            ) : (
              <Row className="g-3">
                <Col md={4}>
                  <Card className="dashboard-card card-hcm h-100" onClick={() => navigate('/DirectorBeneEntry')}>
                    <Card.Body>
                      <div className="d-flex align-items-center w-100">
                        <div className="dashboard-card-icon hcm-icon"><FaUsers /></div>
                        <div className="ms-3 text-start">
                          <h6 className="dashboard-card-title mb-1">Total Beneficiaries</h6>
                          <div className="dashboard-card-value">{loadingBeneficiaries ? <Spinner animation="border" size="sm" /> : totalBeneficiaries.toLocaleString()}</div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
};

export default DirectorDashboard;