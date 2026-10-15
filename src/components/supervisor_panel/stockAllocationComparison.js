
const normalize = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");

const months = [
  "january", "february", "march", "april",
  "may", "june", "july", "august",
  "september", "october", "november", "december",
];

const normalizeMonth = (value) => {
  const normalized = normalize(value);
  if (!normalized) return undefined;

  return months.find(
    (month) =>
      month === normalized ||
      month.startsWith(normalized.slice(0, 3))
  );
};

const getMonthValues = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") {
    return [];
  }

  return String(value)
    .toLowerCase()
    .split(/[\s,/-]+/)
    .filter(Boolean);
};

const getReceivingMonths = (record) => {
  const monthValue =
    Array.isArray(record?.months) && record.months.length
      ? record.months
      : record?.month ?? record?.months;

  const values = getMonthValues(monthValue);
  const normalized = values.map(normalizeMonth).filter(Boolean);

  if (normalized.length) return normalized;

  if (record?.date) {
    const monthNumber = Number(
      String(record.date).slice(5, 7)
    );

    return months[monthNumber - 1]
      ? [months[monthNumber - 1]]
      : [];
  }

  return [];
};

const getFinancialYear = (record) => {
  const value =
    record?.fin_year ?? record?.financial_year;

  if (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ""
  ) {
    return normalize(value);
  }

  if (!record?.date) return undefined;

  const year = Number(String(record.date).slice(0, 4));
  const month = Number(String(record.date).slice(5, 7));

  if (!year || month < 1 || month > 12) return undefined;

  return month >= 4
    ? `${year}${String(year + 1).slice(-2)}`
    : `${year - 1}${String(year).slice(-2)}`;
};

const matchesAwc = (allocation, record) => {
  const allocationCode = normalize(allocation?.awc_code);
  const recordCode = normalize(record?.awc_code);

  if (allocationCode && recordCode) {
    return allocationCode === recordCode;
  }

  const allocationName = normalize(allocation?.awc_name);
  const recordName = normalize(record?.awc_name);

  return Boolean(
    allocationName &&
    recordName &&
    allocationName === recordName
  );
};

const normalizeTrimester = (value) => {
  const normalized = normalize(value);
  if (!normalized) return undefined;

  const aliases = {
    aprmayjun: "1",
    julaugsep: "2",
    octnovdec: "3",
    janfebmar: "4",

    q1: "1",
    quarter1: "1",
    trimester1: "1",
    t1: "1",

    q2: "2",
    quarter2: "2",
    trimester2: "2",
    t2: "2",

    q3: "3",
    quarter3: "3",
    trimester3: "3",
    t3: "3",

    q4: "4",
    quarter4: "4",
    trimester4: "4",
    t4: "4",
  };

  if (aliases[normalized]) return aliases[normalized];

  const numericMatch = normalized.match(
    /(?:trimester|quarter|q|t)?([1-4])$/
  );

  return numericMatch
    ? numericMatch[1]
    : normalized;
};

const getAllocationPeriod = (record) =>
  record?.quarter ??
  record?.trimester ??
  record?.quarter_name;

const getDistributionPeriod = (record) =>
  record?.quarter ??
  record?.trimester ??
  record?.quarter_name ??
  record?.period;

const matchesPeriod = (allocation, record) => {
  const allocationYear = getFinancialYear(allocation);
  const recordYear = getFinancialYear(record);

  // Preserve financial-year matching and reject conflicting years.
  if (
    recordYear &&
    (!allocationYear || allocationYear !== recordYear)
  ) {
    return false;
  }

  if (
    allocationYear &&
    recordYear &&
    allocationYear !== recordYear
  ) {
    return false;
  }

  const allocationPeriod = getAllocationPeriod(allocation);
  const recordPeriod = getDistributionPeriod(record);

  // When the distribution specifies a quarter or trimester,
  // require the allocation to specify the same period.
  if (
    recordPeriod &&
    (
      !allocationPeriod ||
      normalizeTrimester(allocationPeriod) !==
        normalizeTrimester(recordPeriod)
    )
  ) {
    return false;
  }

  if (allocationPeriod && recordPeriod) {
    return (
      normalizeTrimester(allocationPeriod) ===
      normalizeTrimester(recordPeriod)
    );
  }

  // Preserve legacy month-based receiving comparisons.
  const allocationMonth = normalizeMonth(allocation?.month);
  const receivingMonths = getReceivingMonths(record);

  if (
    allocationMonth &&
    receivingMonths.length &&
    !receivingMonths.includes(allocationMonth)
  ) {
    return false;
  }

  return true;
};

// Handles both direct arrays and wrapped food_data responses.
export const getFoodItemOptions = (responseData) => {
  if (Array.isArray(responseData?.food_data)) {
    return responseData.food_data;
  }

  return Array.isArray(responseData) ? responseData : [];
};

const findFoodMapping = (
  record,
  foodItemOptions,
  type
) => {
  const foodItem = normalize(record?.food_item);
  const beneCategory = normalize(record?.bene_category);

  if (!foodItem || !beneCategory) return null;

  return foodItemOptions.find((item) => {
    const sameFood =
      normalize(item?.food_item) === foodItem;

    const mappingCategory =
      normalize(item?.beneficiary_category);

    const sameCategory =
      Boolean(
        mappingCategory &&
        mappingCategory === beneCategory
      );

    const sameType =
      !type ||
      normalize(item?.category) === normalize(type);

    return sameFood && sameCategory && sameType;
  }) ?? null;
};

const findMatchingAllocations = (
  record,
  allocations,
  fieldName
) =>
  allocations.filter(
    (item) =>
      item &&
      Object.prototype.hasOwnProperty.call(item, fieldName) &&
      matchesAwc(item, record) &&
      matchesPeriod(item, record)
  );

const toValidNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/*
 * EXISTING RECEIVING COMPARISON
 *
 * Compares receiving.quantity against the allocated food quantity.
 * Keep this function for the existing receiving component.
 */
export const getStockAllocationComparison = (
  receiving,
  allocations,
  foodItemOptions = [],
  receivingType
) => {
  if (
    !receiving ||
    normalize(receiving.sector_status) === "approved"
  ) {
    return null;
  }

  if (
    !Array.isArray(allocations) ||
    !Array.isArray(foodItemOptions)
  ) {
    return null;
  }

  const mapping = findFoodMapping(
    receiving,
    foodItemOptions,
    receivingType
  );

  const allocationField = mapping?.field_name;

  if (!allocationField) return null;

  const candidates = findMatchingAllocations(
    receiving,
    allocations,
    allocationField
  );

  // Avoid incorrect comparisons if multiple allocation records match.
  if (candidates.length !== 1) return null;

  const allocation = candidates[0];

  const allocated = toValidNumber(
    allocation[allocationField]
  );

  const received = toValidNumber(receiving.quantity);

  if (allocated === null || received === null) {
    return null;
  }

  return {
    status:
      received > allocated
        ? "over"
        : received < allocated
          ? "under"
          : "exact",
    allocated,
    received,
  };
};

/*
 * BENEFICIARY FIELD MAPPING
 *
 * Keys are Stock Allocation food-quantity field names.
 * Values are the corresponding beneficiary-count fields
 * returned by the Stock Allocation API.
 *
 * Keep these field names aligned with the actual API response.
 */
const beneficiaryFieldsByFoodAllocation = {
  poushik_sattu_preg_lat: [
    "pregnant_woman_lactating_mother",
  ],

  panjeeri_6m_3y: [
    "children_6m_3y",
  ],

  panjeeri_sam_6m_5y_suw_6m_6y: [
    "sam_children_6m_5y_suw_children_6m_6y",
  ],

  sattu_sam_3y_5y_suw_3y_6y: [
    "sam_children_3y_5y_suw_children_3y_6y",
  ],

  mung_dal_khichdi_3y_6y: [
    "hcm_beneficiaries_3y_6y",
  ],

  multi_grain_aata_3y_6y: [
    "hcm_beneficiaries_3y_6y",
  ],

  // Legacy food-allocation field names.
  quarterly_packets_poushik_sattu_mix: [
    "pregnant_woman_lactating_mother",
  ],

  panjeeri_75_days_2625gm_quarterly_packets: [
    "children_6m_3y",
  ],

  panjeeri_75_days_4625gm_quarterly_packets: [
    "sam_children_6m_5y_suw_children_6m_6y",
  ],

  quarterly_packets_sattu_2250gm: [
    "sam_children_3y_5y_suw_children_3y_6y",
  ],

  quarterly_packets_mung_dal_khichdi: [
    "hcm_beneficiaries_3y_6y",
  ],

  quarterly_packets_multi_grain_aata_1250gm: [
    "hcm_beneficiaries_3y_6y",
  ],
};

const getBeneficiaryFields = (mapping) => {
  const fieldName = normalize(mapping?.field_name);

  const directMatch = Object.entries(
    beneficiaryFieldsByFoodAllocation
  ).find(
    ([key]) => normalize(key) === fieldName
  );

  if (directMatch) return directMatch[1];

  // Fallback for API-specific field-name aliases.
  const foodName = normalize(mapping?.food_item);

  if (foodName.includes("poushiksattu")) {
    return ["pregnant_woman_lactating_mother"];
  }

  if (
    foodName.includes("panjeeri") &&
    foodName.includes("6m3y")
  ) {
    return ["children_6m_3y"];
  }

  if (
    foodName.includes("panjeeri") &&
    (
      foodName.includes("sam") ||
      foodName.includes("suw")
    )
  ) {
    return [
      "sam_children_6m_5y_suw_children_6m_6y",
    ];
  }

  if (
    foodName.includes("sattu") &&
    (
      foodName.includes("sam") ||
      foodName.includes("suw")
    )
  ) {
    return [
      "sam_children_3y_5y_suw_children_3y_6y",
    ];
  }

  if (
    foodName.includes("mungdalkhichdi") ||
    foodName.includes("multigrainaata")
  ) {
    return ["hcm_beneficiaries_3y_6y"];
  }

  return null;
};

/*
 * NEW HCM / THR DISTRIBUTION COMPARISON
 *
 * Compares distribution.total_beneficiaries against the
 * allocated beneficiary count, NOT the allocated food quantity.
 *
 * Returns:
 *   over   -> distribution beneficiaries exceed allocation
 *   under  -> distribution beneficiaries are below allocation
 *   exact  -> both beneficiary counts are equal
 *   null   -> insufficient or ambiguous matching data
 */
export const getStockAllocationDistributionComparison = (
  distribution,
  allocations,
  foodItemOptions = [],
  distributionType
) => {
  if (
    !distribution ||
    normalize(distribution.sector_status) === "approved"
  ) {
    return null;
  }

  if (
    !Array.isArray(allocations) ||
    !Array.isArray(foodItemOptions)
  ) {
    return null;
  }

  const mapping = findFoodMapping(
    distribution,
    foodItemOptions,
    distributionType
  );

  if (!mapping?.field_name) return null;

  const candidates = findMatchingAllocations(
    distribution,
    allocations,
    mapping.field_name
  );

  // Never compare against an arbitrary allocation.
  if (candidates.length !== 1) return null;

  const allocation = candidates[0];

  const beneficiaryFields = getBeneficiaryFields(mapping);

  if (!beneficiaryFields?.length) return null;

  // Missing fields must not silently become zero.
  if (
    beneficiaryFields.some(
      (field) =>
        !Object.prototype.hasOwnProperty.call(
          allocation,
          field
        )
    )
  ) {
    return null;
  }

  const beneficiaryValues = beneficiaryFields.map(
    (field) => toValidNumber(allocation[field])
  );

  if (
    beneficiaryValues.some(
      (value) => value === null
    )
  ) {
    return null;
  }

  const actualBeneficiaries = toValidNumber(
    distribution.total_beneficiaries
  );

  if (actualBeneficiaries === null) return null;

  const expectedBeneficiaries =
    beneficiaryValues.reduce(
      (total, value) => total + value,
      0
    );

  return {
    status:
      actualBeneficiaries > expectedBeneficiaries
        ? "over"
        : actualBeneficiaries < expectedBeneficiaries
          ? "under"
          : "exact",

    expectedBeneficiaries,
    actualBeneficiaries,
  };
};

/*
 * SHARED COMPARISON STYLING
 *
 * Red:   actual count is greater than allocation.
 * Yellow: actual count is lower than allocation.
 * Exact or missing comparison: default styling.
 */
export const getAllocationComparisonStyle = (
  comparison
) => {
  const colors = {
    over: "#f8d7da",
    under: "#fff3cd",
  };

  const color = colors[comparison?.status];

  if (!color) return undefined;

  return {
    backgroundColor: color,
    boxShadow: `inset 0 0 0 9999px ${color}`,
  };
};
