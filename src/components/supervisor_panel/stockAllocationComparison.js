const allocationCategories = [
  {
    field: "thr_25_days_frs_hcm_beneficiaries_3y_6y",
    matches: (foodItem) =>
      foodItem.includes("frs") || foodItem.includes("fortifiedrationsupplement"),
  },
  {
    field: "hcm_beneficiaries_3y_6y",
    matches: (foodItem, beneCategory) =>
      foodItem.includes("hcm") &&
      (beneCategory.includes("3y6y") ||
        beneCategory.includes("36y") ||
        beneCategory.includes("36years") ||
        !beneCategory),
  },
  {
    field: "quarterly_packets_mung_dal_khichdi",
    matches: (foodItem) =>
      (foodItem.includes("mung") || foodItem.includes("moong")) &&
      foodItem.includes("dal") &&
      foodItem.includes("khichdi"),
  },
  {
    field: "quarterly_packets_poushik_sattu_mix",
    matches: (foodItem) => foodItem.includes("poushik") && foodItem.includes("sattu"),
  },
  {
    field: "panjeeri_75_days_2625gm_quarterly_packets",
    matches: (foodItem) => foodItem.includes("panjeeri") && foodItem.includes("2625"),
  },
  {
    field: "panjeeri_75_days_4625gm_quarterly_packets",
    matches: (foodItem) => foodItem.includes("panjeeri") && foodItem.includes("4625"),
  },
  {
    field: "quarterly_packets_sattu_2250gm",
    matches: (foodItem) =>
      foodItem.includes("sattu") && foodItem.includes("2250") && !foodItem.includes("poushik"),
  },
  {
    field: "quarterly_packets_mix_1000gm",
    matches: (foodItem) =>
      foodItem.includes("mix") && foodItem.includes("1000") && !foodItem.includes("poushik"),
  },
  {
    field: "quarterly_packets_multi_grain_aata_1250gm",
    matches: (foodItem) =>
      (foodItem.includes("multigrain") || foodItem.includes("multigrainaata")) &&
      (foodItem.includes("aata") || foodItem.includes("atta")),
  },
];

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

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

const getReceivingMonths = (receiving) => {
  const value = receiving.months ?? receiving.month;
  const values = Array.isArray(value) ? value : value ? [value] : [];
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

export const getStockAllocationComparison = (receiving, allocations, foodItemOptions = []) => {
  if (normalize(receiving.sector_status) === "approved") return null;

  const foodItem = normalize(receiving.food_item);
  const beneCategory = normalize(receiving.bene_category);
  const foodItemOption = foodItemOptions.find(
    (item) => normalize(item.food_item) === foodItem
  );
  const mappedField = normalize(foodItemOption?.field_name);
  const category =
    allocationCategories.find((item) => normalize(item.field) === mappedField) ??
    allocationCategories.find((item) =>
      item.matches(foodItem, beneCategory)
    );
  if (!category) return null;

  const allocation = allocations.find(
    (item) =>
      category.field in item &&
      matchesAwc(item, receiving) &&
      matchesPeriod(item, receiving)
  );
  if (!allocation) return null;

  const allocated = Number(allocation[category.field]);
  const received = Number(receiving.quantity);
  if (!Number.isFinite(allocated) || !Number.isFinite(received)) return null;

  return {
    status: received > allocated ? "over" : received < allocated ? "under" : "exact",
    allocated,
    received,
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
