import React, { useState, useEffect, useMemo } from "react";
import {
  Container, Tabs, Tab, Form, Button, Table, Modal, Spinner, Alert,
  Row, Col, InputGroup, Badge, ListGroup, Dropdown
} from "react-bootstrap";

import { useAuth } from "../all_login/AuthContext";
import AnganwadiLeftNav from "./AnganwadiLeftNav";
import AnganwadiHeader from "./AnganwadiHeader";

import "../../assets/css/anganwadileftnav.css";
import "../../assets/css/dashboard.css";
import "../../assets/css/AnganwadiDashboard.css";
import {
  FaEdit, FaTrash, FaEye, FaBuilding, FaHashtag, FaUtensils, FaUsers,
  FaWeightHanging, FaCalendarDay, FaMapMarkerAlt, FaCubes,
  FaProjectDiagram, FaInfoCircle, FaClock
} from "react-icons/fa";

const API_URLS = {
  hcm_receiving: "/hcm-anganwadi-receiving/",
  thr_receiving: "/thr-anganwadi-receiving/",
  supp_nutrition: "/supplementary-nutrition-anganwadi/",
  category_food_item: "/categoryandfooditem/",
};

const getCurrentFinancialYear = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  return currentMonth >= 3
    ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}`
    : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
};

const monthOptions = [
  { value: 'apr', label: 'April' }, { value: 'may', label: 'May' }, { value: 'jun', label: 'June' },
  { value: 'jul', label: 'July' }, { value: 'aug', label: 'August' }, { value: 'sep', label: 'September' },
  { value: 'oct', label: 'October' }, { value: 'nov', label: 'November' }, { value: 'dec', label: 'December' },
  { value: 'jan', label: 'January' }, { value: 'feb', label: 'February' }, { value: 'mar', label: 'March' },
];

const quarterToMonths = {
  'apr-may-jun': ['apr', 'may', 'jun'], 'jul-aug-sep': ['jul', 'aug', 'sep'],
  'oct-nov-dec': ['oct', 'nov', 'dec'], 'jan-feb-mar': ['jan', 'feb', 'mar'],
};

const monthLabels = monthOptions.reduce((acc, month) => {
    acc[month.value] = month.label;
    return acc;
  }, {});

// Build a reverse lookup: label (lowercase) -> value, plus numeric/month-name fallbacks
const monthLabelToValue = {};
monthOptions.forEach(m => {
    monthLabelToValue[m.label.toLowerCase()] = m.value;
    monthLabelToValue[m.value.toLowerCase()] = m.value;
});
// Add common Hindi/other month name mappings if needed
const normalizeMonthKey = (raw) => {
    if (raw === undefined || raw === null) return null;
    const str = String(raw).trim().toLowerCase();
    if (!str) return null;
    // Direct value match (apr, may, etc.)
    if (monthLabelToValue[str]) return monthLabelToValue[str];
    // Try matching against labels (april, may, etc.)
    if (monthLabelToValue[str]) return monthLabelToValue[str];
    // Try partial match (e.g., "month:4" or "4")
    const found = monthOptions.find(m =>
      m.value === str || m.label.toLowerCase() === str ||
      m.label.toLowerCase().startsWith(str) || str.startsWith(m.label.toLowerCase())
    );
    return found ? found.value : null;
};

// Helper to safely parse months regardless of backend format
const getMonthsArray = (item) => {
    if (!item) return [];
    // Direct months array
    if (Array.isArray(item.months)) {
      return item.months.map(m => normalizeMonthKey(m)).filter(Boolean);
    }
    // months as string (JSON or comma-separated)
    if (typeof item.months === 'string' && item.months) {
      try {
        const parsed = JSON.parse(item.months);
        if (Array.isArray(parsed)) return parsed.map(m => normalizeMonthKey(m)).filter(Boolean);
      } catch (e) {
        /* ignore, fall through */
      }
      return item.months.split(',').map(m => normalizeMonthKey(m)).filter(Boolean);
    }
    // quarter as array
    if (Array.isArray(item.quarter)) {
      return item.quarter.map(m => normalizeMonthKey(m)).filter(Boolean);
    }
    // quarter as string - map via quarterToMonths
    if (typeof item.quarter === 'string' && item.quarter) {
      if (quarterToMonths[item.quarter]) return quarterToMonths[item.quarter];
      // Could be comma-separated month keys
      return item.quarter.split(',').map(m => normalizeMonthKey(m)).filter(Boolean);
    }
    return [];
};

// ✅ Shared mapping for Beneficiary Categories
const FOOD_BENE_CATEGORY_MAP = {
  'पौष्टिक सत्तू मिक्स': 'Pregnant Women & Lactating Mothers',
  'पंजीरी': 'Children (6m-3y)',
  'सत्तू': 'Children (6m-3y)',
  'मूंग दाल खिचड़ी मिक्स': 'Children (3-6y)',
  'मल्टीग्रेन आटा': 'Children (3-6y)',
};

const formatMonths = (months = []) => {
  if (!Array.isArray(months)) return '';
  return months.map((month) => monthLabels[month] || month).join(', ');
};

// Normalize a supp nutrition record's month field into a single month key
const normalizeSuppMonth = (rawMonth) => {
  if (!rawMonth) return '';
  // Handle numeric month (1-12)
  if (typeof rawMonth === 'number' && rawMonth >= 1 && rawMonth <= 12) {
    return monthOptions[rawMonth - 1].value;
  }
  // Handle string month
  const str = String(rawMonth).trim();
  if (!str) return '';
  // Try direct value match
  const direct = monthOptions.find(m => m.value === str.toLowerCase());
  if (direct) return direct.value;
  // Try label match (case-insensitive)
  const byLabel = monthOptions.find(m => m.label.toLowerCase() === str.toLowerCase());
  if (byLabel) return byLabel.value;
  // Try partial match
  const partial = monthOptions.find(m =>
    m.value.toLowerCase().includes(str.toLowerCase()) ||
    m.label.toLowerCase().includes(str.toLowerCase())
  );
  return partial ? partial.value : str.toLowerCase();
};

const FoodItemReceiving = () => {
  const { api } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [activeTab, setActiveTab] = useState("hcm");
  const [hcmReceivings, setHcmReceivings] = useState([]);
  const [thrReceivings, setThrReceivings] = useState([]);
  const [suppNutritionData, setSuppNutritionData] = useState([]);
  const [foodItemOptions, setFoodItemOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  const [filters, setFilters] = useState({ fin_year: '', months: [] });
  const [uniqueFilterOptions, setUniqueFilterOptions] = useState({
    hcm: { fin_year: [], months: [] },
    thr: { fin_year: [], months: [] },
  });

  const availableMonthsFromSupp = useMemo(() => {
    // Get unique months from supplementary nutrition data
    const monthsFromData = new Set();
    suppNutritionData.forEach(rec => {
      if (rec._monthKeys) {
        monthsFromData.add(rec._monthKeys);
      } else if (rec.month) {
        const normalized = normalizeSuppMonth(rec.month);
        if (normalized) monthsFromData.add(normalized);
      }
    });
    // Return sorted months based on monthOptions order
    return monthOptions
      .filter(m => monthsFromData.has(m.value))
      .map(m => m.value);
  }, [suppNutritionData]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [hcmRec, thrRec, suppResp, foodItemResp] = await Promise.all([
        api.get(API_URLS.hcm_receiving),
        api.get(API_URLS.thr_receiving),
        api.get(API_URLS.supp_nutrition),
        api.get(API_URLS.category_food_item),
      ]);

      const hcmData = hcmRec.data || [];
      const thrData = thrRec.data || [];
      const suppData = suppResp.data || [];
      const foodData =
        (foodItemResp.data && foodItemResp.data.food_data)
        ? foodItemResp.data.food_data
        : (Array.isArray(foodItemResp.data) ? foodItemResp.data : []);

      setHcmReceivings(hcmData);
      setThrReceivings(thrData);
      // Normalize supp nutrition data: handle different response shapes
      const normalizedSupp = Array.isArray(suppData)
        ? suppData
        : (suppData.food_data || suppResp.data?.results || []);
      // Normalize month field on each record for consistent downstream usage
      const normalizedSuppWithMonths = normalizedSupp.map(rec => ({
        ...rec,
        _monthKeys: normalizeSuppMonth(rec.month),
      }));
      setSuppNutritionData(normalizedSuppWithMonths);
      setFoodItemOptions(foodData);

      setUniqueFilterOptions({
        hcm: {
          fin_year: [...new Set(hcmData.map(item => item.fin_year).filter(Boolean))].sort().reverse(),
          months: [...new Set(hcmData.flatMap(item => getMonthsArray(item)).map(m => monthLabels[m] || m))].sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b)),
        },
        thr: {
          fin_year: [...new Set(thrData.map(item => item.fin_year).filter(Boolean))].sort().reverse(),
          months: [...new Set(thrData.flatMap(item => getMonthsArray(item)).map(m => monthLabels[m] || m))].sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b)),
        },
      });
    } catch (err) {
      setError("Failed to fetch data. Please refresh the page.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [api]);

  useEffect(() => {
    setFilters({ fin_year: '', months: [] });
  }, [activeTab]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (filterName, value) => {
    setFilters(prevFilters => {
      const currentValues = prevFilters[filterName];
      if (currentValues.includes(value)) {
        return { ...prevFilters, [filterName]: currentValues.filter(v => v !== value) };
      } else {
        return { ...prevFilters, [filterName]: [...currentValues, value] };
      }
    });
  };

  const resetFilters = () => {
    setFilters({ fin_year: '', months: [] });
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      const parsedMonths = getMonthsArray(item);
      setFormData({
        ...item,
        date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
        months: parsedMonths,
        quarter: item.quarter || ''
      });
    } else {
      setFormData({
        food_item: '', quantity: '', bene_category: '', unit: '',
        date: new Date().toISOString().split('T')[0],
        fin_year: getCurrentFinancialYear(), months: [], quarter: ''
      });
    }
    setFormError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleOpenViewModal = (record) => {
    setViewItem(record);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewItem(null);
  };

  const availableFoodItems = useMemo(() => {
    const tabCategory = activeTab.toUpperCase();
    return foodItemOptions.filter(item => item.category === tabCategory);
  }, [foodItemOptions, activeTab]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === 'food_item') {
      const selectedItem = foodItemOptions.find(item => item.food_item === value);
      let autoUnit = 'Packets';
      let autoQuantity = '';
      let autoFieldName = '';
      let autoBeneCategory = '';

      if (selectedItem) {
        autoFieldName = selectedItem.field_name || '';
        // Use API's beneficiary_category directly, fallback to mapping for backward compatibility
        autoBeneCategory = selectedItem.beneficiary_category || FOOD_BENE_CATEGORY_MAP[value] || selectedItem.bene_category || selectedItem.category || '';
      }

      // Use functional updater to get the absolute latest state for auto-filling logic
      setFormData(prev => {
if (suppNutritionData.length > 0 && autoFieldName) {
            const matchingRecord = suppNutritionData.find(rec => {
              const matchesYear = prev.fin_year ? rec.financial_year === prev.fin_year : true;
              const matchesMonth = prev.months && prev.months.length > 0
                ? prev.months.some(m => {
                    if (!m) return false;
                    const recMonthKey = rec._monthKeys || (rec.month ? normalizeMonthKey(rec.month) : '');
                    return recMonthKey === m || (rec.month && String(rec.month).toLowerCase().includes(String(m).toLowerCase()));
                  })
                : true;
              return matchesYear && matchesMonth;
            }) || suppNutritionData[0];

            if (matchingRecord) {
              autoQuantity = matchingRecord[autoFieldName] || '';
            }
          }

        return {
          ...prev,
          food_item: value,
          field_name: autoFieldName,
          unit: autoUnit,
          quantity: autoQuantity,
          bene_category: autoBeneCategory
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    const isThr = activeTab === 'thr';

    // Safely parse and calculate payload values
    const parsedQuantity = parseFloat(formData.quantity) || 0;
    const selectedMonths = Array.isArray(formData.months) ? formData.months : [];

    // Calculate Quarter string from selected months
    let quarterString = formData.quarter || '';
    if (selectedMonths.length > 0) {
      const matchedQuarter = Object.keys(quarterToMonths).find(qKey => {
        const qMonths = quarterToMonths[qKey];
        return selectedMonths.length === qMonths.length && selectedMonths.every(m => qMonths.includes(m));
      });
      if (matchedQuarter) {
        quarterString = matchedQuarter;
      } else {
        quarterString = selectedMonths.join(',');
      }
    }

    // Prevent duplicate receiving: same food_item + fin_year + overlapping months
    const existingRecords = isThr ? thrReceivings : hcmReceivings;
    const duplicate = existingRecords.find(rec => {
      if (editingItem && rec.id === editingItem.id) {
        return false;
      }
      const recMonths = getMonthsArray(rec);
      if (rec.food_item !== formData.food_item ||
          rec.fin_year !== (formData.fin_year || getCurrentFinancialYear())) {
        return false;
      }
      return selectedMonths.some(m => recMonths.includes(m));
    });

    if (duplicate) {
      setFormError("इस माह का प्राप्ति रिकॉर्ड पहले ही दर्ज है।");
      setSubmitting(false);
      return;
    }

    // Construct a clean payload explicitly to avoid backend schema rejection
    let payload = {
      food_item: formData.food_item || '',
      quantity: parsedQuantity,
      unit: formData.unit || '',
      bene_category: formData.bene_category || '',
      date: formData.date || new Date().toISOString().split('T')[0],
      fin_year: formData.fin_year || getCurrentFinancialYear(),
      months: selectedMonths,
      quarter: quarterString, 
    };

    if (editingItem) {
      payload.id = editingItem.id;
      if (editingItem.sector_status) {
        payload.sector_status = editingItem.sector_status;
      }
    }

    const url = isThr ? API_URLS.thr_receiving : API_URLS.hcm_receiving;
    const method = editingItem ? 'put' : 'post';

    try {
      await api[method](url, payload);
      handleCloseModal();
      fetchData();
    } catch (err) {
      setFormError(`Failed to ${editingItem ? 'update' : 'create'} record. Please try again.`);
      console.error("API Error:", err.response?.data || err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this receiving record?")) {
      const url = activeTab === 'thr' ? API_URLS.thr_receiving : API_URLS.hcm_receiving;
      try {
        await api.delete(url, { data: { id } });
        fetchData();
      } catch (err) {
        alert("Failed to delete record.");
        console.error(err);
      }
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved": return "success";
      case "rejected": return "danger";
      default: return "warning";
    }
  };

  const filteredHcmReceivings = useMemo(() => {
    return hcmReceivings.filter(item => {
      const itemMonths = getMonthsArray(item).map(m => monthLabels[m] || m);
      return (!filters.fin_year || item.fin_year === filters.fin_year) &&
        (filters.months.length === 0 || filters.months.some(m => itemMonths.includes(m)));
    });
  }, [hcmReceivings, filters]);

  const filteredThrReceivings = useMemo(() => {
    return thrReceivings.filter(item => {
      const itemMonths = getMonthsArray(item).map(m => monthLabels[m] || m);
      return (!filters.fin_year || item.fin_year === filters.fin_year) &&
        (filters.months.length === 0 || filters.months.some(m => itemMonths.includes(m)));
    });
  }, [thrReceivings, filters]);

  const renderTable = (records) => {
    const totalQuantity = records.reduce((sum, rec) => sum + (parseFloat(rec.quantity) || 0), 0);

    return (
      <Table striped bordered hover responsive className="mt-4">
        <thead>
          <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
            <th>#</th>
            <th>Date</th>
            <th>Quarterly Packets Distribution</th>
            <th>Beneficiary Category</th>
            <th>Packets</th>
            <th>Unit</th>
            <th>Fin. Year</th>
            <th>Months</th>
            <th>Sector Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.length > 0 ? records.map((rec, index) => (
            <tr key={rec.id}>
              <td>{index + 1}</td>
              <td>{new Date(rec.date).toLocaleDateString()}</td>
              <td>{rec.food_item}</td>
              <td>{rec.bene_category}</td>
              <td>{rec.quantity}</td>
              <td>{rec.unit}</td>
              <td>{rec.fin_year}</td>
              <td>{formatMonths(getMonthsArray(rec))}</td>
              <td>
                <Badge bg={getStatusVariant(rec.sector_status)}>{rec.sector_status || 'pending'}</Badge>
              </td>
              <td>
                {rec.sector_status === 'approved' || rec.sector_status === 'rejected' ? (
                  <Button variant="outline-info" size="sm" onClick={() => handleOpenViewModal(rec)}>
                    <FaEye /> View
                  </Button>
                ) : (
                  <>
                    <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleOpenModal(rec)}>
                      <FaEdit />
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rec.id)}>
                      <FaTrash />
                    </Button>
                  </>
                )}
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="10" className="text-center">No records found.</td>
            </tr>
          )}
        </tbody>
        {records.length > 0 && (
          <tfoot>
            <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
              <td colSpan="4" className="text-end">Total Quantity:</td>
              <td>{totalQuantity}</td>
              <td colSpan="5"></td>
            </tr>
          </tfoot>
        )}
      </Table>
    );
  };

  const renderSuppTable = (records) => {
    const totals = records.reduce((acc, rec) => {
      acc.active_beneficiaries += rec.active_beneficiaries || 0;
      acc.total_beneficiaries += rec.total_beneficiaries || 0;
      acc.hcm_beneficiaries_3y_6y += rec.hcm_beneficiaries_3y_6y || 0;
      acc.thr_25_days_frs_hcm_beneficiaries_3y_6y += rec.thr_25_days_frs_hcm_beneficiaries_3y_6y || 0;
      acc.children_6m_3y_beneficiaries += rec.children_6m_3y_beneficiaries || 0;
      acc.pregnant_women_lactating_mothers += rec.pregnant_women_lactating_mothers || 0;
      acc.sam_children_6m_6y += rec.sam_children_6m_6y || 0;
      acc.suw_children_6m_6y += rec.suw_children_6m_6y || 0;
      acc.quarterly_packets_mung_dal_khichdi += rec.quarterly_packets_mung_dal_khichdi || 0;
      acc.quarterly_packets_poushik_sattu_mix += rec.quarterly_packets_poushik_sattu_mix || 0;
      acc.panjeeri_75_days_2625gm_quarterly_packets += rec.panjeeri_75_days_2625gm_quarterly_packets || 0;
      acc.panjeeri_75_days_4625gm_quarterly_packets += rec.panjeeri_75_days_4625gm_quarterly_packets || 0;
      acc.quarterly_packets_sattu_2250gm += rec.quarterly_packets_sattu_2250gm || 0;
      acc.quarterly_packets_mix_1000gm += rec.quarterly_packets_mix_1000gm || 0;
      acc.quarterly_packets_multi_grain_aata_1250gm += rec.quarterly_packets_multi_grain_aata_1250gm || 0;
      return acc;
    }, {
      active_beneficiaries: 0, total_beneficiaries: 0, hcm_beneficiaries_3y_6y: 0, thr_25_days_frs_hcm_beneficiaries_3y_6y: 0,
      children_6m_3y_beneficiaries: 0, pregnant_women_lactating_mothers: 0, sam_children_6m_6y: 0, suw_children_6m_6y: 0,
      quarterly_packets_mung_dal_khichdi: 0, quarterly_packets_poushik_sattu_mix: 0, panjeeri_75_days_2625gm_quarterly_packets: 0,
      panjeeri_75_days_4625gm_quarterly_packets: 0, quarterly_packets_sattu_2250gm: 0, quarterly_packets_mix_1000gm: 0, quarterly_packets_multi_grain_aata_1250gm: 0
    });

    return (
      <Table striped bordered hover responsive className="mt-4">
        <thead>
          <tr style={{ backgroundColor: '#073f73', color: 'white', textAlign: 'center' }}>
            <th rowSpan="2">#</th>
            <th rowSpan="2">AWC Name</th>
            <th rowSpan="2">District</th>
            <th rowSpan="2">Project</th>
            <th rowSpan="2">Sector</th>
            <th rowSpan="2">Month</th>
            <th rowSpan="2">Fin. Year</th>
            <th rowSpan="2">Active Beneficiaries</th>
            <th rowSpan="2">Total Beneficiaries</th>
            <th colSpan="4">Children & Mothers Beneficiaries</th>
            <th colSpan="2">SAM / SUW Children</th>
            <th colSpan="7">Quarterly Packets Distribution</th>
          </tr>
          <tr style={{ backgroundColor: '#073f73', color: 'white', textAlign: 'center' }}>
            <th>HCM (3-6y)</th>
            <th>THR 25d (3-6y)</th>
            <th>Children (6m-3y)</th>
            <th>PW &amp; LM</th>
            <th>SAM (6m-6y)</th>
            <th>SUW (6m-6y)</th>
            <th>Mung Dal Khichdi</th>
            <th>Sattu Mix (Packets)</th>
            <th>Panjeeri (2625gm)</th>
            <th>Panjeeri (4625gm)</th>
            <th>Sattu (2250gm)</th>
            <th>Mix (1000gm)</th>
            <th>Aata (1250gm)</th>
          </tr>
        </thead>
        <tbody>
          {records.length > 0 ? records.map((rec, index) => (
            <tr key={rec.id} style={{ textAlign: 'center' }}>
              <td>{index + 1}</td>
              <td style={{ textAlign: 'left' }}>{rec.awc_name}</td>
              <td style={{ textAlign: 'left' }}>{rec.district}</td>
              <td style={{ textAlign: 'left' }}>{rec.project}</td>
              <td style={{ textAlign: 'left' }}>{rec.sector}</td>
              <td>{rec.month}</td>
              <td>{rec.financial_year}</td>
              <td>{rec.active_beneficiaries}</td>
              <td>{rec.total_beneficiaries}</td>

              <td>{rec.hcm_beneficiaries_3y_6y}</td>
              <td>{rec.thr_25_days_frs_hcm_beneficiaries_3y_6y}</td>
              <td>{rec.children_6m_3y_beneficiaries}</td>
              <td>{rec.pregnant_women_lactating_mothers}</td>

              <td>{rec.sam_children_6m_6y}</td>
              <td>{rec.suw_children_6m_6y}</td>

              <td>{rec.quarterly_packets_mung_dal_khichdi}</td>
              <td>{rec.quarterly_packets_poushik_sattu_mix}</td>
              <td>{rec.panjeeri_75_days_2625gm_quarterly_packets}</td>
              <td>{rec.panjeeri_75_days_4625gm_quarterly_packets}</td>
              <td>{rec.quarterly_packets_sattu_2250gm}</td>
              <td>{rec.quarterly_packets_mix_1000gm}</td>
              <td>{rec.quarterly_packets_multi_grain_aata_1250gm}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan="23" className="text-center">No records found.</td>
            </tr>
          )}
        </tbody>
        {records.length > 0 && (
          <tfoot>
            <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold', textAlign: 'center' }}>
              <td colSpan="7" className="text-end">TOTAL COUNT:</td>
              <td>{totals.active_beneficiaries}</td>
              <td>{totals.total_beneficiaries}</td>
              <td>{totals.hcm_beneficiaries_3y_6y}</td>
              <td>{totals.thr_25_days_frs_hcm_beneficiaries_3y_6y}</td>
              <td>{totals.children_6m_3y_beneficiaries}</td>
              <td>{totals.pregnant_women_lactating_mothers}</td>
              <td>{totals.sam_children_6m_6y}</td>
              <td>{totals.suw_children_6m_6y}</td>
              <td>{totals.quarterly_packets_mung_dal_khichdi}</td>
              <td>{totals.quarterly_packets_poushik_sattu_mix}</td>
              <td>{totals.panjeeri_75_days_2625gm_quarterly_packets}</td>
              <td>{totals.panjeeri_75_days_4625gm_quarterly_packets}</td>
              <td>{totals.quarterly_packets_sattu_2250gm}</td>
              <td>{totals.quarterly_packets_mix_1000gm}</td>
              <td>{totals.quarterly_packets_multi_grain_aata_1250gm}</td>
            </tr>
          </tfoot>
        )}
      </Table>
    );
  };

  const renderFilters = () => {
    const currentFilters = uniqueFilterOptions[activeTab];
    return (
      <Row className="mb-3 align-items-end">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Financial Year</Form.Label>
            <Form.Select name="fin_year" value={filters.fin_year} onChange={handleFilterChange}>
              <option value="">All Years</option>
              {currentFilters?.fin_year.map(year => <option key={year} value={year}>{year}</option>)}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Months</Form.Label>
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.months.length ? `${filters.months.length} selected` : 'All Months'}</Dropdown.Toggle>
              <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {currentFilters?.months.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.months.includes(v)} onChange={() => handleMultiSelectChange('months', v)} /></Dropdown.Item>)) }
              </Dropdown.Menu>
            </Dropdown>
          </Form.Group>
        </Col>
        <Col md={4} className="d-flex align-items-end">
          <Button variant="secondary" onClick={resetFilters}>
            Reset
          </Button>
        </Col>
      </Row>
    );
  };

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);

      if (width < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="dashboard-container">
      <AnganwadiLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <AnganwadiHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading d-flex justify-content-between align-items-center">
            <h3 className="fw-bold mb-4">
              Food Item Receiving
            </h3>
            {activeTab !== 'supp' && (
              <Button onClick={() => handleOpenModal()}>Add New Receiving</Button>
            )}
          </div>

          {loading && <div className="text-center"><Spinner animation="border" /></div>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} id="receiving-tabs" className="mb-3">

            <Tab eventKey="hcm" title="HCM Receiving">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">HCM Receiving Records</h5>
                  {renderFilters()}
                  {renderTable(filteredHcmReceivings)}
                </>
              )}
            </Tab>

            <Tab eventKey="thr" title="THR Receiving">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">THR Receiving Records</h5>
                  {renderFilters()}
                  {renderTable(filteredThrReceivings)}
                </>
              )}
            </Tab>

            <Tab eventKey="supp" title="Supplementary Nutrition">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">Supplementary Nutrition Records</h5>
                  {renderSuppTable(suppNutritionData)}
                </>
              )}
            </Tab>

          </Tabs>
        </Container>

        <Modal show={showModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>{editingItem ? 'Edit' : 'Add'} {activeTab.toUpperCase()} Receiving</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <Alert variant="danger">{formError}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Quarterly Packets Distribution</Form.Label>
                    <Form.Select
                      name="food_item"
                      value={formData.food_item || ''}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select Quarterly Packets Distribution</option>
                      {/* ✅ Updated Dropdown UI to match AnganwadiDashboard modal style */}
                      {availableFoodItems.map((item, index) => [
                        <option key={index} value={item.food_item} style={{ fontWeight: 'bold' }}>
                          {item.food_item}
                        </option>,
                        <option key={`${index}-cat`} disabled style={{ color: '#6c757d', paddingLeft: '15px' }}>
                          &nbsp;&nbsp;↳ Category: {item.beneficiary_category || FOOD_BENE_CATEGORY_MAP[item.food_item] || 'N/A'}
                        </option>
                      ])}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Packets</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        name="quantity"
                        value={formData.quantity || ''}
                        onChange={handleFormChange}
                        placeholder="Auto-filled Quantity"
                        required
                      />
                      <Form.Control
                        type="text"
                        name="unit"
                        value={formData.unit || ''}
                        onChange={handleFormChange}
                        placeholder="Unit"
                        readOnly
                        required
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Beneficiary Category</Form.Label>
                    <Form.Control
                      type="text"
                      name="bene_category"
                      value={formData.bene_category || ''}
                      onChange={handleFormChange}
                      placeholder="Enter Beneficiary Category"
                      required
                      disabled
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Receiving</Form.Label>
                    <Form.Control
                      type="date"
                      name="date"
                      value={formData.date || ''}
                      onChange={handleFormChange}
                      required
                    />
                  </Form.Group>
                </Col>

                <>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Financial Year</Form.Label>
                      <Form.Control
                        type="text"
                        name="fin_year"
                        value={formData.fin_year || ''}
                        onChange={handleFormChange}
                        placeholder="e.g., 2025-26"
                        required disabled
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Months</Form.Label>
                      <div className="month-checkbox-group d-flex flex-wrap gap-2">
                        {monthOptions.map((month) => {
                          const isAvailable = availableMonthsFromSupp.includes(month.value);
                          return (
                            <Form.Check
                              key={month.value}
                              inline
                              type="checkbox"
                              id={`month-${month.value}`}
                              label={month.label}
                              checked={(formData.months || []).includes(month.value)}
                              // FIX: Used functional state updater to prevent stale closure bugs
                              onChange={(e) => {
                                if (!isAvailable) return;
                                setFormData(prev => {
                                  const currentMonths = prev.months || [];
                                  const nextMonths = e.target.checked
                                    ? [...new Set([...currentMonths, month.value])]
                                    : currentMonths.filter((m) => m !== month.value);

                                  // Keep Quarter state synced up
                                  let quarterString = '';
                                  if (nextMonths.length > 0) {
                                    const matchedQuarter = Object.keys(quarterToMonths).find(qKey => {
                                      const qMonths = quarterToMonths[qKey];
                                      return nextMonths.length === qMonths.length && nextMonths.every(m => qMonths.includes(m));
                                    });
                                    if (matchedQuarter) quarterString = matchedQuarter;
                                    else quarterString = nextMonths.join(',');
                                  }

                                  return { ...prev, months: nextMonths, quarter: quarterString };
                                });
                              }}
                              disabled={!isAvailable}
                            />
                          );
                        })}
                      </div>
{availableMonthsFromSupp.length === 0 && (
                      <small className="text-muted">No months available in Supplementary Nutrition data</small>
                    )}
                    </Form.Group>
                  </Col>
                </>
              </Row>

              <div className="d-flex justify-content-end">
                <Button variant="secondary" onClick={handleCloseModal} className="me-2">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? <Spinner as="span" animation="border" size="sm" /> : (editingItem ? 'Update' : 'Submit')}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {viewItem && (
          <Modal show={showViewModal} onHide={handleCloseViewModal} centered>
            <Modal.Header closeButton className="view-modal-header">
              <Modal.Title>View Record: {viewItem.food_item}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="view-modal-body">
              <ListGroup variant="flush">
                <ListGroup.Item><FaBuilding className="view-modal-icon" /> <strong>AWC Name:</strong> {viewItem.awc_name}</ListGroup.Item>
                <ListGroup.Item><FaHashtag className="view-modal-icon" /> <strong>AWC Code:</strong> {viewItem.awc_code}</ListGroup.Item>
                <ListGroup.Item><FaUtensils className="view-modal-icon" /> <strong>Quarterly Packets Distribution:</strong> {viewItem.food_item}</ListGroup.Item>
                <ListGroup.Item><FaWeightHanging className="view-modal-icon" /> <strong>Quantity:</strong> {viewItem.quantity} {viewItem.unit}</ListGroup.Item>
                {viewItem.date ? (
                  <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>Date:</strong> {new Date(viewItem.date).toLocaleDateString()}</ListGroup.Item>
                ) : (
                  <>
                    <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>Financial Year:</strong> {viewItem.fin_year}</ListGroup.Item>
                    <ListGroup.Item><FaCubes className="view-modal-icon" /> <strong>Months:</strong> {formatMonths(getMonthsArray(viewItem))}</ListGroup.Item>
                  </>
                )}
                <ListGroup.Item><FaMapMarkerAlt className="view-modal-icon" /> <strong>Sector:</strong> {viewItem.sector}</ListGroup.Item>
                <ListGroup.Item><FaProjectDiagram className="view-modal-icon" /> <strong>Project:</strong> {viewItem.project}</ListGroup.Item>
                <ListGroup.Item><FaMapMarkerAlt className="view-modal-icon" /> <strong>District:</strong> {viewItem.district}</ListGroup.Item>
                {viewItem.sector_status && (
                  <ListGroup.Item><FaInfoCircle className="view-modal-icon" /> <strong>Sector Status:</strong> <Badge bg={getStatusVariant(viewItem.sector_status)}>{viewItem.sector_status}</Badge></ListGroup.Item>
                )}
                {viewItem.sector_remark && (
                  <ListGroup.Item><FaInfoCircle className="view-modal-icon" /> <strong>Sector Remark:</strong> {viewItem.sector_remark}</ListGroup.Item>
                )}
              </ListGroup>
            </Modal.Body>
            <Modal.Footer className="view-modal-footer">
              <Button variant="secondary" onClick={handleCloseViewModal}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        )}
        
      </div>
    </div>
  );
};

export default FoodItemReceiving;