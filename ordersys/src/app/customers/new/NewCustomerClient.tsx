"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatedSelect } from "@/components/AnimatedSelect";
import { AnimatePresence, motion } from "framer-motion";

type CreateResponse = { customer?: { customerNumber?: string }; error?: string };
type AccountsResponse = {
  accounts?: Array<{ accountNumber?: string; description?: string }>;
  warning?: string;
  error?: string;
};
type TabKey = "grunduppgifter" | "faktureringsuppgifter";

type FormState = {
  customerNumber: string;
  name: string;
  active: boolean;
  type: "COMPANY" | "PRIVATE";
  organisationNumber: string;
  address1: string;
  address2: string;
  city: string;
  zipCode: string;
  country: string;
  countryCode: string;
  phone1: string;
  phone2: string;
  fax: string;
  email: string;
  www: string;
  comments: string;
  externalReference: string;
  ourReference: string;
  yourReference: string;
  deliveryName: string;
  deliveryAddress1: string;
  deliveryAddress2: string;
  deliveryCity: string;
  deliveryZipCode: string;
  deliveryCountry: string;
  deliveryCountryCode: string;
  deliveryPhone1: string;
  deliveryPhone2: string;
  deliveryFax: string;
  visitingAddress: string;
  visitingCity: string;
  visitingZipCode: string;
  visitingCountry: string;
  visitingCountryCode: string;
  termsOfPayment: string;
  termsOfDelivery: string;
  wayOfDelivery: string;
  currency: string;
  priceList: string;
  invoiceDiscount: string;
  invoiceAdministrationFee: string;
  invoiceFreight: string;
  invoiceRemark: string;
  showPriceVATIncluded: boolean;
  vatNumber: string;
  vatType: string;
  salesAccount: string;
  project: string;
  costCenter: string;
  gln: string;
  glnDelivery: string;
  emailInvoice: string;
  emailInvoiceCC: string;
  emailInvoiceBCC: string;
  emailOffer: string;
  emailOfferCC: string;
  emailOfferBCC: string;
  emailOrder: string;
  emailOrderCC: string;
  emailOrderBCC: string;
  defaultDeliveryTypeInvoice: string;
  defaultDeliveryTypeOffer: string;
  defaultDeliveryTypeOrder: string;
  defaultTemplateCashInvoice: string;
  defaultTemplateInvoice: string;
  defaultTemplateOffer: string;
  defaultTemplateOrder: string;
};

type FieldKind = "text" | "textarea" | "animated-select" | "boolean" | "segmented";

type FieldConfig = {
  key: keyof FormState;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  segmentedLabels?: { left: string; right: string };
};
type CountryOption = {
  value: string;
  label: string;
  hint?: string;
  code: string;
};

const INITIAL_FORM: FormState = {
  customerNumber: "",
  name: "",
  active: true,
  type: "COMPANY",
  organisationNumber: "",
  address1: "",
  address2: "",
  city: "",
  zipCode: "",
  country: "",
  countryCode: "",
  phone1: "",
  phone2: "",
  fax: "",
  email: "",
  www: "",
  comments: "",
  externalReference: "",
  ourReference: "",
  yourReference: "",
  deliveryName: "",
  deliveryAddress1: "",
  deliveryAddress2: "",
  deliveryCity: "",
  deliveryZipCode: "",
  deliveryCountry: "",
  deliveryCountryCode: "",
  deliveryPhone1: "",
  deliveryPhone2: "",
  deliveryFax: "",
  visitingAddress: "",
  visitingCity: "",
  visitingZipCode: "",
  visitingCountry: "",
  visitingCountryCode: "",
  termsOfPayment: "",
  termsOfDelivery: "",
  wayOfDelivery: "",
  currency: "SEK",
  priceList: "",
  invoiceDiscount: "",
  invoiceAdministrationFee: "",
  invoiceFreight: "",
  invoiceRemark: "",
  showPriceVATIncluded: false,
  vatNumber: "",
  vatType: "SEVAT",
  salesAccount: "",
  project: "",
  costCenter: "",
  gln: "",
  glnDelivery: "",
  emailInvoice: "",
  emailInvoiceCC: "",
  emailInvoiceBCC: "",
  emailOffer: "",
  emailOfferCC: "",
  emailOfferBCC: "",
  emailOrder: "",
  emailOrderCC: "",
  emailOrderBCC: "",
  defaultDeliveryTypeInvoice: "PRINT",
  defaultDeliveryTypeOffer: "PRINT",
  defaultDeliveryTypeOrder: "PRINT",
  defaultTemplateCashInvoice: "",
  defaultTemplateInvoice: "",
  defaultTemplateOffer: "",
  defaultTemplateOrder: "",
};

const DELIVERY_TYPE_OPTIONS = [
  { value: "EINVOICE", label: "E-faktura" },
  { value: "EMAIL", label: "E-post" },
  { value: "PRINT", label: "Utskrift" },
];

const DELIVERY_TYPE_OPTIONS_NO_EINVOICE = DELIVERY_TYPE_OPTIONS.filter(
  (option) => option.value !== "EINVOICE"
);

const FALLBACK_COUNTRY_CODES = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ",
  "CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ",
  "DE","DJ","DK","DM","DO","DZ",
  "EC","EE","EG","EH","ER","ES","ET",
  "FI","FJ","FK","FM","FO","FR",
  "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY",
  "HK","HM","HN","HR","HT","HU",
  "ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT",
  "JE","JM","JO","JP",
  "KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ",
  "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ",
  "NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ",
  "OM",
  "PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY",
  "QA",
  "RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ",
  "TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
  "UA","UG","UM","US","UY","UZ",
  "VA","VC","VE","VG","VI","VN","VU",
  "WF","WS",
  "YE","YT",
  "ZA","ZM","ZW",
];

const BASIC_FIELDS: FieldConfig[] = [
  { key: "customerNumber", label: "Kundnummer", required: true },
  {
    key: "type",
    label: "Kundtyp",
    kind: "segmented",
    segmentedLabels: { left: "Företag", right: "Privat" },
  },
  { key: "organisationNumber", label: "Org/Persnr" },
  { key: "active", label: "Aktiv", kind: "boolean" },
  { key: "name", label: "Namn", required: true },
  { key: "phone1", label: "Telefon" },
  { key: "address1", label: "Fakturaadress" },
  { key: "phone2", label: "Telefon 2" },
  { key: "address2", label: "Fakturaadress 2" },
  { key: "fax", label: "Fax" },
  { key: "zipCode", label: "Postnr" },
  { key: "city", label: "Ort" },
  { key: "country", label: "Land", kind: "animated-select", required: true },
  { key: "countryCode", label: "Landskod" },
  { key: "email", label: "E-post" },
  { key: "www", label: "Webbadress" },
  { key: "externalReference", label: "Extern referens" },
  { key: "ourReference", label: "Vår referens" },
  { key: "yourReference", label: "Er referens" },
  { key: "comments", label: "Kommentar", kind: "textarea" },
];

const DELIVERY_FIELDS: FieldConfig[] = [
  { key: "deliveryName", label: "Namn" },
  { key: "deliveryPhone1", label: "Telefon" },
  { key: "deliveryAddress1", label: "Leveransadress" },
  { key: "deliveryPhone2", label: "Telefon 2" },
  { key: "deliveryAddress2", label: "Leveransadress 2" },
  { key: "deliveryFax", label: "Fax" },
  { key: "deliveryZipCode", label: "Postnr" },
  { key: "deliveryCity", label: "Ort" },
  { key: "deliveryCountry", label: "Land" },
  { key: "deliveryCountryCode", label: "Landskod" },
];

const VISITING_FIELDS: FieldConfig[] = [
  { key: "visitingAddress", label: "Besoksadress" },
  { key: "visitingZipCode", label: "Postnr" },
  { key: "visitingCity", label: "Ort" },
  { key: "visitingCountry", label: "Land" },
  { key: "visitingCountryCode", label: "Landskod" },
];

const BILLING_FIELDS: FieldConfig[] = [
  { key: "termsOfPayment", label: "Betalningsvillkor" },
  { key: "priceList", label: "Prislista" },
  {
    key: "currency",
    label: "Valuta",
    kind: "animated-select",
    options: [
      { value: "SEK", label: "SEK" },
      { value: "EUR", label: "EUR" },
      { value: "USD", label: "USD" },
      { value: "NOK", label: "NOK" },
      { value: "DKK", label: "DKK" },
    ],
  },
  { key: "ourReference", label: "Vår referens", kind: "animated-select" },
  { key: "externalReference", label: "Extern referens" },
  { key: "termsOfDelivery", label: "Leveransvillkor" },
  { key: "wayOfDelivery", label: "Leveranssatt" },
  
  { key: "invoiceDiscount", label: "Fakturarabatt (%)" },
  { key: "invoiceAdministrationFee", label: "Fakturaavgift" },
  { key: "invoiceFreight", label: "Fraktavgift" },
  { key: "showPriceVATIncluded", label: "Priser inkl. moms", kind: "boolean" },
  { key: "vatNumber", label: "VAT-nummer" },
  {
    key: "vatType",
    label: "Momstyp",
    kind: "animated-select",
    options: [
      { value: "SEVAT", label: "SE" },
      { value: "SEREVERSEDVAT", label: "SE omvänd skattskyldighet" },
      { value: "EUREVERSEDVAT", label: "EU omvänd skattskyldighet" },
      { value: "EUVAT", label: "EU momspliktig" },
      { value: "EXPORT", label: "Export" },
    ],
  },
  { key: "salesAccount", label: "Försaljningskonto", kind: "animated-select" },
];

const E_DOCUMENT_FIELDS: FieldConfig[] = [
  { key: "gln", label: "GLN-nummer" },
  { key: "glnDelivery", label: "GLN-nummer for leverans" },
  { key: "emailInvoice", label: "E-post" },
  { key: "emailInvoiceCC", label: "Kopia" },
  { key: "emailInvoiceBCC", label: "Hemlig kopia" },
  { key: "emailOffer", label: "E-post" },
  { key: "emailOfferCC", label: "Kopia" },
  { key: "emailOfferBCC", label: "Hemlig kopia" },
  { key: "emailOrder", label: "E-post" },
  { key: "emailOrderCC", label: "Kopia" },
  { key: "emailOrderBCC", label: "Hemlig kopia" },
  {
    key: "defaultDeliveryTypeInvoice",
    label: "Distributionssatt",
    options: DELIVERY_TYPE_OPTIONS,
  },
  {
    key: "defaultDeliveryTypeOffer",
    label: "Distributionssatt",
    options: DELIVERY_TYPE_OPTIONS,
  },
  {
    key: "defaultDeliveryTypeOrder",
    label: "Distributionssatt",
    options: DELIVERY_TYPE_OPTIONS,
  },
];

const DEFAULT_TEMPLATE_FIELDS: FieldConfig[] = [
  { key: "defaultTemplateCashInvoice", label: "Std mall kontantfaktura" },
  { key: "defaultTemplateInvoice", label: "Std mall faktura" },
  { key: "defaultTemplateOffer", label: "Std mall offert" },
  { key: "defaultTemplateOrder", label: "Std mall order" },
];

const INVOICE_TEXT_FIELDS: FieldConfig[] = [
  { key: "invoiceRemark", label: "Fakturatext", kind: "textarea" },
];

function FortnoxField({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 text-[12px] text-[#3a4036] ${className}`}>
      <span className="font-semibold uppercase tracking-[0.08em] text-[#65705f]">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </div>
  );
}

function FortnoxSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-md border border-[#d9ddd4] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-4 bg-[#f1f3ee] px-4 py-3 text-left"
      >
        <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#4f5a49]">
          {title}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[12px] text-[#7c8276]"
        >
          ▼
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-[#d9ddd4] px-4 py-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function FortnoxInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-8 w-full rounded-md border border-[#cbcfc4] bg-white px-3 text-[13px] text-[#2d3329]",
        "focus:outline-none focus:ring-2 focus:ring-[#8ebe3f]/40",
        "placeholder:text-[#7c8276]",
        props.className || "",
      ].join(" ")}
    />
  );
}

function FortnoxTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-md border border-[#cbcfc4] bg-white px-3 py-2 text-[13px] text-[#2d3329]",
        "focus:outline-none focus:ring-2 focus:ring-[#8ebe3f]/40",
        "placeholder:text-[#7c8276]",
        props.className || "",
      ].join(" ")}
    />
  );
}

function BooleanChoice({
  value,
  onChange,
  labels = { left: "Ja", right: "Nej" },
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  labels?: { left: string; right: string };
}) {
  return (
    <div className="h-8 flex rounded-md border border-[#cbcfc4] bg-[#f0f2ed] p-1">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
          value ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
        }`}
      >
        {labels.left}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
          !value ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
        }`}
      >
        {labels.right}
      </button>
    </div>
  );
}

function SegmentedChoice({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const selected = options.some((option) => option.value === value)
    ? value
    : options[0]?.value ?? "";

  return (
    <div className="h-8 flex rounded-md border border-[#cbcfc4] bg-[#f0f2ed] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-md px-2 py-1 text-[12px] font-semibold transition ${
            selected === option.value
              ? "bg-white text-[#2d3329] shadow"
              : "text-[#767d71]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function stringOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(",", "."));
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function findNextAvailableCustomerNumber(existingNumbers: Set<number>) {
  let next = 1;
  while (existingNumbers.has(next)) {
    next += 1;
  }
  return String(next);
}

function getFieldGridClass(tab: TabKey, field: FieldConfig): string {
  const key: keyof FormState = field.key;
  if (field.kind === "textarea") return "md:col-span-12";

  if (tab === "grunduppgifter") {
    if (key === "customerNumber" || key === "type") return "md:col-span-2";
    if (key === "organisationNumber") return "md:col-span-4";
    if (key === "active") return "md:col-span-2 md:col-start-10";
    if (key === "name") return "md:col-span-4";
    if (key === "phone1" || key === "phone2" || key === "fax") return "md:col-span-4";
    if (key === "deliveryPhone1" || key === "deliveryPhone2" || key === "deliveryFax") return "md:col-span-4";
    if (key === "email" || key === "www") return "md:col-span-4";
    if (key === "deliveryAddress1" || key === "deliveryAddress2") return "md:col-span-4 md:col-start-1";
    if (key === "deliveryCity") return "md:col-span-3";
    if (key === "deliveryZipCode") return "md:col-span-1 md:col-start-1";
    if (key === "deliveryCountry") return "md:col-span-3 md:col-start-1";
    if (key === "deliveryCountryCode") return "md:col-span-1 md:col-start-4";
    if (key === "deliveryName") return "md:col-span-4";
    if (key === "visitingAddress") return "md:col-span-4";
    if (key === "visitingZipCode") return "md:col-span-1 md:col-start-1";
    if (key === "visitingCity") return "md:col-span-3";
    if (key === "visitingCountry") return "md:col-span-3 md:col-start-1";
    if (key === "visitingCountryCode") return "md:col-span-1 md:col-start-4";

    if (

      key === "address1" ||
      key === "address2" ||
      key === "city" ||
      key === "country" ||
      key === "externalReference" ||
      key === "ourReference" ||
      key === "yourReference"
    ) {
      return "md:col-span-6";
    }

    if (
      key === "zipCode" ||
      key === "countryCode"
    ) {
      return "md:col-span-3";
    }

    return "md:col-span-6";
  }

  if (key === "termsOfPayment") return "md:col-span-2 md:col-start-1 md:row-start-2";
  if (key === "priceList") return "md:col-span-1 md:col-start-3 md:row-start-2";
  if (key === "currency") return "md:col-span-1 md:col-start-4 md:row-start-2";
  if (key === "vatNumber") return "md:col-span-2 md:col-start-7 md:row-start-2";
  if (key === "vatType") return "md:col-span-2 md:col-start-7 md:row-start-3";
  if (key === "ourReference") return "md:col-span-2 md:col-start-5 md:row-start-2";
  if (key === "termsOfDelivery") return "md:col-span-2 md:col-start-1 md:row-start-3";
  if (key === "invoiceDiscount") return "md:col-span-1 md:col-start-3 md:row-start-3";
  if (key === "wayOfDelivery") return "md:col-span-2 md:col-start-1 md:row-start-4";
  if (key === "invoiceAdministrationFee") return "md:col-span-1 md:col-start-3 md:row-start-4";
  if (key === "showPriceVATIncluded") return "md:col-span-1 md:col-start-3 md:row-start-5";
  if (key === "invoiceFreight") return "md:col-span-1 md:col-start-4 md:row-start-4";
  if (key === "externalReference") return "md:col-span-2 md:col-start-5 md:row-start-4";
  if (key === "salesAccount") return "md:col-span-1 md:col-start-7 md:row-start-4";

  if (
    key === "project" ||
    key === "costCenter" ||
    key === "gln" ||
    key === "glnDelivery" ||
    key === "defaultDeliveryTypeInvoice" ||
    key === "defaultDeliveryTypeOffer" ||
    key === "defaultDeliveryTypeOrder" ||
    key === "defaultTemplateCashInvoice" ||
    key === "defaultTemplateInvoice" ||
    key === "defaultTemplateOffer" ||
    key === "defaultTemplateOrder"
  ) {
    return "md:col-span-4";
  }

  if (
    key === "emailInvoice" ||
    key === "emailInvoiceCC" ||
    key === "emailInvoiceBCC" ||
    key === "emailOffer" ||
    key === "emailOfferCC" ||
    key === "emailOfferBCC" ||
    key === "emailOrder" ||
    key === "emailOrderCC" ||
    key === "emailOrderBCC"
  ) {
    return "md:col-span-4";
  }

  return "md:col-span-4";
}

export default function NewCustomerClient() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("grunduppgifter");
  const [addressMode, setAddressMode] = useState<"delivery" | "visiting">(
    "delivery"
  );
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [customerReferences, setCustomerReferences] = useState<
    Array<{ id: string; name: string }>
  >([{ id: "default", name: "Ingen forvald" }]);
  const [selectedCustomerReferenceId, setSelectedCustomerReferenceId] =
    useState<string>("default");
  const [newReferenceName, setNewReferenceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerNumberWarning, setCustomerNumberWarning] = useState<string | null>(null);
  const [existingCustomerNumbers, setExistingCustomerNumbers] = useState<Set<number>>(
    () => new Set()
  );
  const [salesAccountOptions, setSalesAccountOptions] = useState<
    Array<{ value: string; label: string }>
  >([{ value: "", label: "Laddar försaljningskonton..." }]);

  const countryOptions = useMemo<CountryOption[]>(() => {
    const sv = new Intl.DisplayNames(["sv"], { type: "region" });
    const en = new Intl.DisplayNames(["en"], { type: "region" });
    const codes = FALLBACK_COUNTRY_CODES;
    const seen = new Set<string>();
    const uniqueCodes = codes.filter((code) => {
      if (seen.has(code)) return false;
      seen.add(code);
      return true;
    });

    const options = uniqueCodes
      .map((code) => {
        const svName = sv.of(code) ?? code;
        const enName = en.of(code) ?? code;
        return {
          value: svName,
          label: `${code} - ${svName}`,
          hint: enName,
          code,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "sv"));

    return [{ value: "", label: "Valj land", hint: "", code: "" }, ...options];
  }, []);
  const fields = tab === "grunduppgifter" ? BASIC_FIELDS : BILLING_FIELDS;
  const canSubmit = useMemo(
    () => !!form.customerNumber.trim() && !!form.name.trim() && !isSubmitting,
    [form.customerNumber, form.name, isSubmitting]
  );
  const ourReferenceOptions = useMemo(() => {
    const current = form.ourReference.trim();
    if (!current) return [{ value: "", label: "Ingen referens vald" }];
    return [{ value: current, label: current }];
  }, [form.ourReference]);
  const resolvedSalesAccountOptions = useMemo(() => {
    const current = form.salesAccount.trim();
    const hasCurrent = current
      ? salesAccountOptions.some((option) => option.value === current)
      : true;
    if (hasCurrent) return salesAccountOptions;
    return [{ value: current, label: current }, ...salesAccountOptions];
  }, [form.salesAccount, salesAccountOptions]);

  useEffect(() => {
    let active = true;

    const loadSalesAccounts = async () => {
      try {
        const res = await fetch("/api/fortnox/accounts");
        const json = (await res.json().catch(() => null)) as AccountsResponse | null;

        if (!active) return;
        if (!res.ok) {
          setSalesAccountOptions([{ value: "", label: "Kunde inte hämta försaljningskonton" }]);
          return;
        }

        const rawAccounts = json?.accounts ?? [];
        const allOptions = rawAccounts
          .map((item) => {
            const accountNumber = item.accountNumber?.trim();
            if (!accountNumber) return null;
            const description = item.description?.trim();
            return {
              value: accountNumber,
              label: description ? `${accountNumber} - ${description}` : accountNumber,
            };
          })
          .filter((option): option is { value: string; label: string } => option !== null);

        const salesOnly = allOptions.filter((option) => option.value.startsWith("3"));
        const options = salesOnly.length > 0 ? salesOnly : allOptions;

        if (options.length === 0) {
          setSalesAccountOptions([{ value: "", label: "Inga försaljningskonton hittades" }]);
          return;
        }

        setSalesAccountOptions([{ value: "", label: "Välj försaljningskonto" }, ...options]);
      } catch {
        if (!active) return;
        setSalesAccountOptions([{ value: "", label: "Kunde inte hamta försaljningskonton" }]);
      }
    };

    void loadSalesAccounts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadNextCustomerNumber = async () => {
      if (form.customerNumber.trim()) return;

      const existingNumbers = new Set<number>();
      let page = 1;
      const limit = 500;

      try {
        while (active) {
          const res = await fetch(
            `/api/fortnox/customers?page=${page}&limit=${limit}&sortby=customernumber`
          );
          if (!res.ok) break;

          const json = (await res.json().catch(() => null)) as
            | {
                customers?: Array<{ customerNumber?: string }>;
                meta?: { currentPage?: number; totalPages?: number };
              }
            | null;

          const customers = Array.isArray(json?.customers) ? json.customers : [];
          for (const customer of customers) {
            const raw = String(customer?.customerNumber ?? "").trim();
            if (!/^\d+$/.test(raw)) continue;
            const parsed = Number(raw);
            if (Number.isInteger(parsed) && parsed > 0) {
              existingNumbers.add(parsed);
            }
          }

          const currentPage = Number(json?.meta?.currentPage ?? page);
          const totalPages = Number(json?.meta?.totalPages ?? currentPage);
          if (!Number.isFinite(totalPages) || currentPage >= totalPages || customers.length === 0) {
            break;
          }

          page += 1;
        }

        if (!active) return;
        setExistingCustomerNumbers(existingNumbers);
        const nextCustomerNumber = findNextAvailableCustomerNumber(existingNumbers);
        setForm((prev) =>
          prev.customerNumber.trim()
            ? prev
            : { ...prev, customerNumber: nextCustomerNumber }
        );
      } catch {
        // Keep manual input available if auto-fill lookup fails.
      }
    };

    void loadNextCustomerNumber();
    return () => {
      active = false;
    };
  }, [form.customerNumber]);

  useEffect(() => {
    const raw = form.customerNumber.trim();
    if (!raw || !/^\d+$/.test(raw)) {
      setCustomerNumberWarning(null);
      return;
    }

    const parsed = Number(raw);
    const isDuplicate = Number.isInteger(parsed) && existingCustomerNumbers.has(parsed);

    if (isDuplicate) {
      setCustomerNumberWarning(`Kundnummer finns redan: ${raw}`);
      return;
    }

    setCustomerNumberWarning(null);
  }, [form.customerNumber, existingCustomerNumbers]);

  const setValue = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const setCountry = (nextCountry: string) => {
    if (!nextCountry) {
      setForm((prev) => ({ ...prev, country: "", countryCode: "" }));
      return;
    }
    const selected = countryOptions.find((option) => option.value === nextCountry);
    setForm((prev) => ({
      ...prev,
      country: nextCountry,
      countryCode: selected?.code ?? prev.countryCode,
    }));
  };
  const addCustomerReference = () => {
    const trimmed = newReferenceName.trim();
    if (!trimmed) return;
    const nextId = `ref-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    setCustomerReferences((prev) => [...prev, { id: nextId, name: trimmed }]);
    setSelectedCustomerReferenceId(nextId);
    setNewReferenceName("");
  };
  const deleteCustomerReference = (id: string) => {
    setCustomerReferences((prev) => {
      const next = prev.filter((ref) => ref.id !== id);
      if (next.length === 0) {
        return [{ id: "default", name: "Ingen forvald" }];
      }
      return next;
    });
    setSelectedCustomerReferenceId((prev) =>
      prev === id ? "default" : prev
    );
  };

  const renderField = (field: FieldConfig) => {
    const value = form[field.key];
    const isDistributionField =
      field.key === "defaultDeliveryTypeInvoice" ||
      field.key === "defaultDeliveryTypeOffer" ||
      field.key === "defaultDeliveryTypeOrder";
    return (
      <FortnoxField
        key={String(field.key)}
        label={field.label}
        required={field.required}
        className={getFieldGridClass(tab, field)}
      >
        {field.kind === "textarea" ? (
          <FortnoxTextarea
            rows={3}
            value={String(value)}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
        ) : field.kind === "boolean" ? (
          <BooleanChoice
            value={Boolean(value)}
            onChange={(next) => setValue(field.key, next)}
          />
        ) : field.kind === "segmented" ? (
          <BooleanChoice
            value={String(value) === "COMPANY"}
            onChange={(next) =>
              setValue(field.key, next ? "COMPANY" : "PRIVATE")
            }
            labels={field.segmentedLabels}
          />
        ) : field.kind === "animated-select" ? (
          <AnimatedSelect
            value={String(value)}
            onChange={(next) =>
              field.key === "country" ? setCountry(next) : setValue(field.key, next)
            }
            searchable={field.key === "salesAccount" || field.key === "country"}
            searchPlaceholder={
              field.key === "country" ? "Sok land eller kod..." : "Sok konto..."
            }
            selectedDisplayMode={field.key === "salesAccount" ? "value" : "label"}
            menuClassName={
              field.key === "salesAccount"
                ? "right-0 left-auto min-w-[min(92vw,44rem)]"
                : field.key === "country"
                ? "right-0 left-auto min-w-[min(92vw,40rem)]"
                : ""
            }
            options={
              field.key === "ourReference"
                ? ourReferenceOptions
                : field.key === "salesAccount"
                ? resolvedSalesAccountOptions
                : field.key === "country"
                ? countryOptions
                : field.options ?? []
            }
            buttonClassName="border-[#cbcfc4] h-8 px-3 text-[13px]"
          />
        ) : isDistributionField ? (
          <SegmentedChoice
            value={String(value)}
            onChange={(next) => setValue(field.key, next)}
            options={
              field.key === "defaultDeliveryTypeInvoice"
                ? DELIVERY_TYPE_OPTIONS
                : DELIVERY_TYPE_OPTIONS_NO_EINVOICE
            }
          />
        ) : (
          <div className="relative">
            <FortnoxInput
              value={String(value)}
              onChange={(e) => setValue(field.key, e.target.value)}
              disabled={
                field.key === "countryCode" ||
                field.key === "deliveryCountryCode" ||
                field.key === "visitingCountryCode"
              }
              className={[
                field.key === "countryCode" ||
                field.key === "deliveryCountryCode" ||
                field.key === "visitingCountryCode"
                  ? "bg-[#d8ddd3] text-[#5f685d] cursor-not-allowed"
                  : "",
                field.key === "customerNumber" && customerNumberWarning
                  ? "border-orange-400 ring-2 ring-orange-300/70 focus:ring-orange-300/70 transition-all duration-200 ease-out"
                  : "",
              ].join(" ")}
            />
            <AnimatePresence>
              {field.key === "customerNumber" && customerNumberWarning ? (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="pointer-events-none absolute left-0 top-full z-10 mt-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700 shadow-sm"
                >
                  {customerNumberWarning}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )}
      </FortnoxField>
    );
  };
  const renderEDocumentField = (key: keyof FormState) => {
    const field = E_DOCUMENT_FIELDS.find((candidate) => candidate.key === key);
    if (!field) return null;
    return renderField(field);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const rawCustomerNumber = form.customerNumber.trim();
    if (/^\d+$/.test(rawCustomerNumber)) {
      const parsedCustomerNumber = Number(rawCustomerNumber);
      if (existingCustomerNumbers.has(parsedCustomerNumber)) {
        setCustomerNumberWarning(`Kundnummer finns redan: ${rawCustomerNumber}`);
        return;
      }
    }

    const invoiceDiscount = parseOptionalNumber(form.invoiceDiscount);
    if (invoiceDiscount === null) {
      setError("Fakturarabatt maste vara numerisk.");
      return;
    }
    if (!form.countryCode.trim()) {
      setError("Land maste valjas.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const selectedReference = customerReferences.find(
        (ref) => ref.id === selectedCustomerReferenceId
      );
      const resolvedYourReference =
        selectedReference && selectedReference.id !== "default"
          ? selectedReference.name
          : form.yourReference;

      const payload = {
        customerNumber: form.customerNumber.trim(),
        name: form.name.trim(),
        active: form.active,
        type: form.type,
        organisationNumber: stringOrUndefined(form.organisationNumber),
        address1: stringOrUndefined(form.address1),
        address2: stringOrUndefined(form.address2),
        city: stringOrUndefined(form.city),
        zipCode: stringOrUndefined(form.zipCode),
        country: stringOrUndefined(form.country),
        countryCode: stringOrUndefined(form.countryCode),
        phone1: stringOrUndefined(form.phone1),
        phone2: stringOrUndefined(form.phone2),
        fax: stringOrUndefined(form.fax),
        email: stringOrUndefined(form.email),
        www: stringOrUndefined(form.www),
        comments: stringOrUndefined(form.comments),
        externalReference: stringOrUndefined(form.externalReference),
        ourReference: stringOrUndefined(form.ourReference),
        yourReference: stringOrUndefined(resolvedYourReference),
        deliveryName: stringOrUndefined(form.deliveryName),
        deliveryAddress1: stringOrUndefined(form.deliveryAddress1),
        deliveryAddress2: stringOrUndefined(form.deliveryAddress2),
        deliveryCity: stringOrUndefined(form.deliveryCity),
        deliveryZipCode: stringOrUndefined(form.deliveryZipCode),
        deliveryCountry: stringOrUndefined(form.deliveryCountry),
        deliveryCountryCode: stringOrUndefined(form.deliveryCountryCode),
        deliveryPhone1: stringOrUndefined(form.deliveryPhone1),
        deliveryPhone2: stringOrUndefined(form.deliveryPhone2),
        deliveryFax: stringOrUndefined(form.deliveryFax),
        visitingAddress: stringOrUndefined(form.visitingAddress),
        visitingCity: stringOrUndefined(form.visitingCity),
        visitingZipCode: stringOrUndefined(form.visitingZipCode),
        visitingCountry: stringOrUndefined(form.visitingCountry),
        visitingCountryCode: stringOrUndefined(form.visitingCountryCode),
        termsOfPayment: stringOrUndefined(form.termsOfPayment),
        termsOfDelivery: stringOrUndefined(form.termsOfDelivery),
        wayOfDelivery: stringOrUndefined(form.wayOfDelivery),
        currency: stringOrUndefined(form.currency),
        priceList: stringOrUndefined(form.priceList),
        invoiceDiscount,
        invoiceAdministrationFee: stringOrUndefined(form.invoiceAdministrationFee),
        invoiceFreight: stringOrUndefined(form.invoiceFreight),
        invoiceRemark: stringOrUndefined(form.invoiceRemark),
        showPriceVATIncluded: form.showPriceVATIncluded,
        vatNumber: stringOrUndefined(form.vatNumber),
        vatType: stringOrUndefined(form.vatType),
        salesAccount: stringOrUndefined(form.salesAccount),
        project: stringOrUndefined(form.project),
        costCenter: stringOrUndefined(form.costCenter),
        gln: stringOrUndefined(form.gln),
        glnDelivery: stringOrUndefined(form.glnDelivery),
        emailInvoice: stringOrUndefined(form.emailInvoice),
        emailInvoiceCC: stringOrUndefined(form.emailInvoiceCC),
        emailInvoiceBCC: stringOrUndefined(form.emailInvoiceBCC),
        emailOffer: stringOrUndefined(form.emailOffer),
        emailOfferCC: stringOrUndefined(form.emailOfferCC),
        emailOfferBCC: stringOrUndefined(form.emailOfferBCC),
        emailOrder: stringOrUndefined(form.emailOrder),
        emailOrderCC: stringOrUndefined(form.emailOrderCC),
        emailOrderBCC: stringOrUndefined(form.emailOrderBCC),
        defaultDeliveryTypes: {
          invoice: stringOrUndefined(form.defaultDeliveryTypeInvoice),
          offer: stringOrUndefined(form.defaultDeliveryTypeOffer),
          order: stringOrUndefined(form.defaultDeliveryTypeOrder),
        },
        defaultTemplates: {
          cashInvoice: stringOrUndefined(form.defaultTemplateCashInvoice),
          invoice: stringOrUndefined(form.defaultTemplateInvoice),
          offer: stringOrUndefined(form.defaultTemplateOffer),
          order: stringOrUndefined(form.defaultTemplateOrder),
        },
      };

      const res = await fetch("/api/fortnox/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as CreateResponse | null;
      if (!res.ok) throw new Error(json?.error ?? "Kunde inte skapa kund.");
      router.push("/customers");
    } catch (submitError: any) {
      setError(submitError?.message ?? "Nagot gick fel vid skapandet.");
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-8xl space-y-4 px-6 py-8">
      <div className="rounded-md border border-[#d9ddd4] bg-[#f6f8f3] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-[18px] font-semibold text-[#2d3329]">
            Skapa ny kund
          </h1>
          <div className="flex items-center gap-2 text-xs text-[#677160]">
            <span className="rounded-md border border-[#cbcfc4] bg-white px-3 py-1">
              Fortnox Kundregister
            </span>
            <span>* obligatoriska falt</span>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="rounded-md border border-[#d9ddd4] bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#d9ddd4] bg-[#f1f3ee] px-6 py-4">
          <button
            type="button"
            onClick={() => setTab("grunduppgifter")}
            className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
              tab === "grunduppgifter"
                ? "bg-[#1f7a44] text-white"
                : "bg-[#f0f1ef] text-[#4f5a49] hover:bg-[#e4e7e1]"
            }`}
          >
            Grunduppgifter
          </button>
          <button
            type="button"
            onClick={() => setTab("faktureringsuppgifter")}
            className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
              tab === "faktureringsuppgifter"
                ? "bg-[#1f7a44] text-white"
                : "bg-[#f0f1ef] text-[#4f5a49] hover:bg-[#e4e7e1]"
            }`}
          >
            Faktureringsuppgifter
          </button>
        </div>







        <div className="space-y-8 px-6 py-6">
          <div className="grid gap-6 md:grid-cols-12">



            {tab === "faktureringsuppgifter" ? (
              <div className="md:col-span-4 md:col-start-7 md:row-start-1">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#65705f]">
                  Bokföring
                </h3>
              </div>
            ) : null}



            {tab === "faktureringsuppgifter" ? (
              <div className="md:col-span-4 md:col-start-5 md:row-start-1">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#65705f]">
Referenser                </h3>
              </div>
            ) : null}



            {tab === "faktureringsuppgifter" ? (
              <div className="md:col-span-4 md:col-start-3 md:row-start-1">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#65705f]">
                  Fakturering
                </h3>
              </div>
            ) : null}






            {tab === "faktureringsuppgifter" ? (
              <div className="md:col-span-4 md:col-start-1 md:row-start-1">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#65705f]">
                  Betal- och leveransvillkor
                </h3>
              </div>
            ) : null}
            {fields.map(renderField)}
            {tab === "faktureringsuppgifter" ? (
              <section className="md:col-span-2 md:col-start-5 md:row-start-5">
                <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#65705f]">
                  Er referens
                </div>
                <div className="mt-1 overflow-hidden rounded-md border border-[#cbcfc4] bg-white">
                  <div className="grid grid-cols-[74px_1fr_30px] border-b border-[#d9ddd4] bg-[#f1f3ee] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4f5a49]">
                    <div className="px-3 py-2">Forvald</div>
                    <div className="border-l border-[#d9ddd4] px-3 py-2">Benamning</div>
                    <div className="border-l border-[#d9ddd4] px-2 py-2" />
                  </div>
                





                
                  {customerReferences.map((ref) => (
                    <div
                      key={ref.id}
                      className="grid grid-cols-[74px_1fr_30px] border-b border-[#e1e4de] text-[13px] text-[#2d3329]"
                    >
                      <div className="flex items-center justify-center px-2 py-2">
                        <input
                          type="radio"
                          name="customer-reference"
                          checked={selectedCustomerReferenceId === ref.id}
                          onChange={() => setSelectedCustomerReferenceId(ref.id)}
                          className="h-3.5 w-3.5 accent-[#1f7a44]"
                        />
                      </div>
                      <div className="border-l border-[#e1e4de] px-3 py-2">
                        {ref.name}
                      </div>
                      <div className="flex items-center justify-center border-l border-[#e1e4de] px-1 py-2">
                        {ref.id !== "default" ? (
                          <button
                            type="button"
                            onClick={() => deleteCustomerReference(ref.id)}
                            className="text-[#7c8276] hover:text-[#4f5a49]"
                            aria-label="Ta bort referens"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-[74px_1fr_30px] text-[13px]">
                    <div />
                    <div className="border-l border-[#e1e4de] px-3 py-2">
                      <input
                        value={newReferenceName}
                        onChange={(e) => setNewReferenceName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomerReference();
                          }
                        }}
                        onBlur={addCustomerReference}
                        placeholder="Lagg till referens"
                        className="w-full border-none bg-transparent p-0 text-[13px] italic text-[#9aa094] focus:outline-none"
                      />
                    </div>
                    <div className="border-l border-[#e1e4de]" />
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          {tab === "grunduppgifter" && (
            <FortnoxSection title="Fler adressuppgifter" defaultOpen={false}>
              <div className="space-y-4">
                <div className="max-w-sm">
                  <FortnoxField label="Adressuppgifter visas for">
                    <AnimatedSelect
                      value={addressMode}
                      onChange={(next) =>
                        setAddressMode(next === "visiting" ? "visiting" : "delivery")
                      }
                      options={[
                        { value: "delivery", label: "Leveransadress" },
                        { value: "visiting", label: "Besöksadress" },
                      ]}
                      buttonClassName="border-[#cbcfc4] h-8 px-3 text-[13px]"
                    />
                  </FortnoxField>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={addressMode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="grid gap-6 md:grid-cols-12"
                  >
                    {(addressMode === "delivery" ? DELIVERY_FIELDS : VISITING_FIELDS).map(
                      renderField
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </FortnoxSection>
          )}

          {tab === "faktureringsuppgifter" && (
            <>
              <FortnoxSection title="E-dokument" defaultOpen={false}>
                <div className="grid gap-8 md:grid-cols-3">
                  <div className="space-y-3">
                    <h4 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#65705f]">
                      Faktura
                    </h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="md:col-span-3">{renderEDocumentField("defaultDeliveryTypeInvoice")}</div>
                      <div className="md:col-span-3">{renderEDocumentField("emailInvoice")}</div>
                      <div className="md:col-span-3">{renderEDocumentField("emailInvoiceCC")}</div>
                      <div className="md:col-span-3">{renderEDocumentField("emailInvoiceBCC")}</div>
                      <div className="md:col-span-3">{renderEDocumentField("gln")}</div>
                      <div className="md:col-span-3">{renderEDocumentField("glnDelivery")}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#65705f]">
                      Offert
                    </h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="md:col-span-2">{renderEDocumentField("defaultDeliveryTypeOffer")}</div>
                      <div className="md:col-span-3">{renderEDocumentField("emailOffer")}</div>
                      <div className="md:col-span-3">{renderEDocumentField("emailOfferCC")}</div>
                      <div className="md:col-span-3">{renderEDocumentField("emailOfferBCC")}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#65705f]">
                      Order
                    </h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="md:col-span-2">{renderEDocumentField("defaultDeliveryTypeOrder")}</div>
                      <div className="md:col-span-3">{renderEDocumentField("emailOrder")}</div>
                      <div className="md:col-span-3">{renderEDocumentField("emailOrderCC")}</div>
                      <div className="md:col-span-3">{renderEDocumentField("emailOrderBCC")}</div>
                    </div>
                  </div>
                </div>
              </FortnoxSection>

              <FortnoxSection title="Fakturatext" defaultOpen={false}>
                <div className="grid gap-6 md:grid-cols-12">
                  {INVOICE_TEXT_FIELDS.map(renderField)}
                </div>
              </FortnoxSection>

            </>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#d9ddd4] bg-[#f6f8f3] px-4 py-3">
          <div className="min-h-5 text-sm text-red-600">{error ?? ""}</div>
          <div className="flex items-center gap-2">
            <Link
              href="/customers"
              className="inline-flex h-9 items-center rounded-full bg-[#8a8f89] px-4 text-xs font-semibold uppercase tracking-wide text-white"
            >
              Avbryt
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-9 items-center rounded-full bg-[#0b7a32] px-4 text-xs font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:bg-[#88b79a]"
            >
              {isSubmitting ? "Sparar..." : "Spara"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
