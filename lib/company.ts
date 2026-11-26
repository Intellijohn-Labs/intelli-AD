/** Official business details (from the GST registration certificate). Single source for the footer, receipts and legal text. */
export const COMPANY = {
  /** Brand customers see. */
  brand: "AI admanager",
  /** Trade / business name on the GST certificate. */
  tradeName: "LEADSNDEALS INTELLIGENT AUTOMATIONS",
  /** Legal name of the registered person (the proprietor). */
  legalName: "JUSTIN JOHNY",
  constitution: "Proprietorship",
  gstin: "32AFJPJ8048K3Z5",
  addressLines: ["Building No./Flat No. 1/57, Ground Floor,", "Kuthiyathodu, Kunnukara,", "Ernakulam District, Kerala - 683578"],
  /** Public contact details (footer, enquiry links). */
  email: "mail@leadsndeals.com",
  phones: [{ display: "+91 99617 74455", tel: "+919961774455" }, { display: "+91 80864 95777", tel: "+918086495777" }],
} as const;

export const COMPANY_ADDRESS = COMPANY.addressLines.join(" ");
/** "LEADSNDEALS INTELLIGENT AUTOMATIONS (Proprietor: JUSTIN JOHNY)" */
export const COMPANY_FULL_NAME = `${COMPANY.tradeName} (Proprietor: ${COMPANY.legalName})`;
