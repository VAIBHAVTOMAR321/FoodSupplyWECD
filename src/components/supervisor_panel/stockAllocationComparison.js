const normalize = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");

const months = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const normalizeMonth = (value) => {
  const normalized = normalize(value);
  if (!normalized) return undefined;
  return months.find(
    (month) => month === normalized || month.startsWith(normalized.slice(0, 3))
  );
};

const getMonthValues = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .toLowerCase()
    .split(/[\s,/-]+/)
    .filter(Boolean);
};

const getReceivingMonths = (receiving) => {
  const monthValue =
    Array.isArray(receiving.months) && receiving.months.length
      ? receiving.months
      : receiving.month ?? receiving.quarter ?? receiving.months;
  const values = getMonthValues(monthValue);
  if (values.length) return values.map(normalizeMonth).filter(Boolean);
  if (!receiving.date) return [];
  const monthNumber = Number(String(receiving.date).slice(5, 7));
  return months[monthNumber - 1] ? [months[monthNumber - 1]] : [];
};

const getFinancialYear = (item) => {
  const value = item.fin_year ?? item.financial_year;
  if (value) return normalize(value);
  if (!item.date) return undefined;

  const year = Number(String(item.date).slice(0, 4));
  const month = Number(String(item.date).slice(5, 7));
  if (!year || !month) return undefined;
  return month >= 4
    ? `${year}${String(year + 1).slice(-2)}`
    : `${year - 1}${String(year).slice(-2)}`;
};

const matchesAwc = (allocation, receiving) => {
  if (allocation.awc_code && receiving.awc_code) {
    return String(allocation.awc_code) === String(receiving.awc_code);
  }
  return (
    Boolean(normalize(allocation.awc_name)) &&
    normalize(allocation.awc_name) === normalize(receiving.awc_name)
  );
};

const matchesPeriod = (allocation, receiving) => {
  const allocationMonth = normalizeMonth(allocation.month);
  const receivingMonths = getReceivingMonths(receiving);
  if (
    allocationMonth &&
    (!receivingMonths.length || !receivingMonths.includes(allocationMonth))
  ) {
    return false;
  }

  const allocationYear = getFinancialYear(allocation);
  const receivingYear = getFinancialYear(receiving);
  return !allocationYear || allocationYear === receivingYear;
};

export const getFoodItemOptions = (responseData) => {
  if (Array.isArray(responseData?.food_data)) return responseData.food_data;
  return Array.isArray(responseData) ? responseData : [];
};

export const getStockAllocationComparison = (
  receiving,
  allocations,
  foodItemOptions = [],
  receivingType
) => {
  if (normalize(receiving.sector_status) === "approved") return null;

  const foodItem = normalize(receiving.food_item);
  const beneCategory = normalize(receiving.bene_category);
  const foodItemOption = foodItemOptions.find(
    (item) =>
      normalize(item.food_item) === foodItem &&
      normalize(item.beneficiary_category) === beneCategory &&
      (!receivingType || normalize(item.category) === normalize(receivingType))
  );
  const allocationField = foodItemOption?.field_name;
  if (!allocationField) return null;

  const allocation = allocations.find(
    (item) =>
      allocationField in item &&
      matchesAwc(item, receiving) &&
      matchesPeriod(item, receiving)
  );
  if (!allocation) return null;

  const allocated = Number(allocation[allocationField]);
  const received = Number(receiving.quantity);
  if (!Number.isFinite(allocated) || !Number.isFinite(received)) return null;

  return {
    status: received > allocated ? "over" : received < allocated ? "under" : "exact",
    allocated,
    received,
  };
};

const beneficiaryAllocationFields = {
  quarterly_packets_mung_dal_khichdi: ["hcm_beneficiaries_3y_6y"],
  quarterly_packets_multi_grain_aata_1250gm: ["hcm_beneficiaries_3y_6y"],
  quarterly_packets_poushik_sattu_mix: ["pregnant_women_lactating_mothers"],
  panjeeri_75_days_2625gm_quarterly_packets: ["children_6m_3y_beneficiaries"],
  panjeeri_75_days_4625gm_quarterly_packets: [
    "sam_children_6m_6y",
    "suw_children_6m_6y",
  ],
  quarterly_packets_sattu_2250gm: ["sam_children_3y_6y", "suw_children_3y_6y"],
};

export const getStockAllocationDistributionComparison = (
  distribution,
  allocations,
  foodItemOptions = [],
  distributionType
) => {
  if (normalize(distribution.sector_status) === "approved") return null;

  const foodItem = normalize(distribution.food_item);
  const beneCategory = normalize(distribution.bene_category);
  const mapping = foodItemOptions.find(
    (item) =>
      normalize(item.food_item) === foodItem &&
      normalize(item.beneficiary_category) === beneCategory &&
      normalize(item.category) === normalize(distributionType)
  );
  if (!mapping?.field_name) return null;

  const allocation = allocations.find(
    (item) =>
      mapping.field_name in item &&
      matchesAwc(item, distribution) &&
      matchesPeriod(item, distribution)
  );
  if (!allocation) return null;

  const beneficiaryFields = beneficiaryAllocationFields[mapping.field_name];
  if (
    !beneficiaryFields ||
    beneficiaryFields.some((field) => !(field in allocation))
  ) {
    return null;
  }

  const expectedQuantity = Number(allocation[mapping.field_name]);
  const actualQuantity = Number(distribution.quantity);
  const expectedBeneficiaries = beneficiaryFields.reduce(
    (total, field) => total + (Number(allocation[field]) || 0),
    0
  );
  const actualBeneficiaries = Number(distribution.total_beneficiaries);
  if (
    !Number.isFinite(expectedQuantity) ||
    !Number.isFinite(actualQuantity) ||
    !Number.isFinite(actualBeneficiaries)
  ) {
    return null;
  }

  const quantityStatus =
    actualQuantity > expectedQuantity
      ? "over"
      : actualQuantity < expectedQuantity
        ? "under"
        : "exact";
  const beneficiaryStatus =
    actualBeneficiaries > expectedBeneficiaries
      ? "over"
      : actualBeneficiaries < expectedBeneficiaries
        ? "under"
        : "exact";
  const statuses = [quantityStatus, beneficiaryStatus];

  return {
    status: statuses.includes("over")
      ? "over"
      : statuses.includes("under")
        ? "under"
        : "exact",
    expectedQuantity,
    actualQuantity,
    expectedBeneficiaries,
    actualBeneficiaries,
  };
};

export const getAllocationComparisonStyle = (comparison) => {
  const colorByStatus = {
    over: "#f8d7da",
    under: "#fff3cd",
    exact: "#d1e7dd",
  };
  const color = colorByStatus[comparison?.status];
  if (color) {
    return {
      backgroundColor: color,
      boxShadow: `inset 0 0 0 9999px ${color}`,
    };
  }
  return undefined;
};
