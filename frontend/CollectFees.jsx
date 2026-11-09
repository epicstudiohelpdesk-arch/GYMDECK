import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  History,
  Info,
  Link2,
  Lock,
  Mail,
  Maximize2,
  Minimize2,
  MoreVertical,
  Phone,
  Plus,
  Printer,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Volume2,
  VolumeX,
  Wallet,
  X,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { qrcode } from "./qr-lib.js";
import { paymentsV2Api } from "./paymentsV2Api.js";

// Indian Currency Formatter
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

// Comprehensive Indian Banks Registry with authentic SVG brand emblems (PhonePe / Paytm Style)
const POPULAR_BANKS = [
  {
    id: "sbi",
    name: "State Bank of India",
    shortName: "SBI",
    primaryColor: "#002B49",
    accentColor: "#00A3E0",
    vpaHandle: "oksbi",
    ifscPrefix: "SBIN000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="19" fill="#002B49" />
        <circle cx="20" cy="20" r="10" fill="#00A3E0" />
        <path d="M20 20 L20 34" stroke="#002B49" strokeWidth="4" strokeLinecap="round" />
        <circle cx="20" cy="20" r="3.5" fill="#002B49" />
      </svg>
    )
  },
  {
    id: "hdfc",
    name: "HDFC Bank",
    shortName: "HDFC",
    primaryColor: "#004B87",
    accentColor: "#ED1B24",
    vpaHandle: "okhdfcbank",
    ifscPrefix: "HDFC000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect width="40" height="40" rx="9" fill="#004B87" />
        <rect x="15" y="6" width="10" height="28" fill="#FFFFFF" />
        <rect x="6" y="15" width="28" height="10" fill="#FFFFFF" />
        <rect x="17" y="8" width="6" height="24" fill="#ED1B24" />
        <rect x="8" y="17" width="24" height="6" fill="#ED1B24" />
        <rect x="16" y="16" width="8" height="8" fill="#004B87" />
      </svg>
    )
  },
  {
    id: "icici",
    name: "ICICI Bank",
    shortName: "ICICI",
    primaryColor: "#B02A30",
    accentColor: "#F37021",
    vpaHandle: "okicici",
    ifscPrefix: "ICIC000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="19" fill="#B02A30" />
        <circle cx="20" cy="20" r="12" fill="none" stroke="#F37021" strokeWidth="3" />
        <circle cx="20" cy="14" r="2.5" fill="#FFFFFF" />
        <path d="M18.5 19 L21.5 19 L21.5 28 L18.5 28 Z" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: "axis",
    name: "Axis Bank",
    shortName: "Axis",
    primaryColor: "#800020",
    accentColor: "#97144D",
    vpaHandle: "okaxis",
    ifscPrefix: "UTIB000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect width="40" height="40" rx="9" fill="#800020" />
        <polygon points="20,8 32,32 24,32 18,20 16,32 8,32" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: "kotak",
    name: "Kotak Mahindra Bank",
    shortName: "Kotak",
    primaryColor: "#ED1C24",
    accentColor: "#1D3A8A",
    vpaHandle: "kmbl",
    ifscPrefix: "KKBK000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="19" fill="#ED1C24" />
        <path d="M12 11 L12 29 M12 20 L24 11 M16 17 L25 29" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: "pnb",
    name: "Punjab National Bank",
    shortName: "PNB",
    primaryColor: "#A20B2D",
    accentColor: "#FFCC00",
    vpaHandle: "pnb",
    ifscPrefix: "PUNB000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="19" fill="#A20B2D" />
        <circle cx="20" cy="20" r="12" fill="none" stroke="#FFCC00" strokeWidth="3" />
        <path d="M17 14 L23 14 L23 26 L17 26" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: "bob",
    name: "Bank of Baroda",
    shortName: "BOB",
    primaryColor: "#F26522",
    accentColor: "#1A4D94",
    vpaHandle: "barodampay",
    ifscPrefix: "BARB000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="19" fill="#F26522" />
        <path d="M12 25 A10 10 0 0 1 28 25 M14 20 A7 7 0 0 1 26 20 M16 15 A4 4 0 0 1 24 15" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: "canara",
    name: "Canara Bank",
    shortName: "Canara",
    primaryColor: "#0072BC",
    accentColor: "#FDB913",
    vpaHandle: "cnrb",
    ifscPrefix: "CNRB000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="19" fill="#0072BC" />
        <polygon points="12,28 20,12 28,28" fill="#FDB913" />
        <polygon points="15,25 20,15 25,25" fill="#0072BC" />
      </svg>
    )
  },
  {
    id: "union",
    name: "Union Bank of India",
    shortName: "Union",
    primaryColor: "#D3122A",
    accentColor: "#005BA6",
    vpaHandle: "unionbank",
    ifscPrefix: "UBIN000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect width="40" height="40" rx="9" fill="#D3122A" />
        <path d="M14 12 L14 24 A6 6 0 0 0 26 24 L26 12" stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: "indusind",
    name: "IndusInd Bank",
    shortName: "IndusInd",
    primaryColor: "#8B1E41",
    accentColor: "#D4AF37",
    vpaHandle: "indus",
    ifscPrefix: "INDB000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="19" fill="#8B1E41" />
        <path d="M12 20 Q20 10 28 20 Q20 30 12 20 Z" fill="#D4AF37" />
        <circle cx="20" cy="20" r="3" fill="#8B1E41" />
      </svg>
    )
  },
  {
    id: "yesbank",
    name: "Yes Bank",
    shortName: "YES Bank",
    primaryColor: "#003865",
    accentColor: "#ED1B2D",
    vpaHandle: "yesbank",
    ifscPrefix: "YESB000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="19" fill="#003865" />
        <path d="M12 20 L18 26 L28 14" stroke="#ED1B2D" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: "federal",
    name: "Federal Bank",
    shortName: "Federal",
    primaryColor: "#0F2D59",
    accentColor: "#F49E17",
    vpaHandle: "federal",
    ifscPrefix: "FDRL000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="19" fill="#0F2D59" />
        <path d="M13 14 L27 14 M20 14 L20 28" stroke="#F49E17" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: "idfc",
    name: "IDFC FIRST Bank",
    shortName: "IDFC FIRST",
    primaryColor: "#9E1B32",
    accentColor: "#FFC72C",
    vpaHandle: "idfcbank",
    ifscPrefix: "IDFB000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect width="40" height="40" rx="9" fill="#9E1B32" />
        <text x="20" y="24" fill="#FFFFFF" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">IDFC</text>
      </svg>
    )
  },
  {
    id: "au",
    name: "AU Small Finance Bank",
    shortName: "AU Bank",
    primaryColor: "#5B2C6F",
    accentColor: "#E67E22",
    vpaHandle: "aubank",
    ifscPrefix: "AUBL000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="19" fill="#5B2C6F" />
        <text x="20" y="25" fill="#E67E22" fontSize="14" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">AU</text>
      </svg>
    )
  },
  {
    id: "paytm",
    name: "Paytm Payments Bank",
    shortName: "Paytm Bank",
    primaryColor: "#002970",
    accentColor: "#00BAF2",
    vpaHandle: "paytm",
    ifscPrefix: "PYTM000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect width="40" height="40" rx="9" fill="#002970" />
        <text x="20" y="25" fill="#00BAF2" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">paytm</text>
      </svg>
    )
  },
  {
    id: "airtel",
    name: "Airtel Payments Bank",
    shortName: "Airtel Bank",
    primaryColor: "#E40000",
    accentColor: "#FFFFFF",
    vpaHandle: "airtel",
    ifscPrefix: "AIRP000",
    icon: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="19" fill="#E40000" />
        <path d="M12 28 Q20 10 28 28" stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    )
  }
];

// Complete A-Z All Indian Banks Directory
const ALL_BANKS = [
  ...POPULAR_BANKS,
  { id: "allahabad", name: "Allahabad Bank (Indian Bank)", shortName: "Allahabad", vpaHandle: "alld", ifscPrefix: "ALLA000" },
  { id: "bom", name: "Bank of Maharashtra", shortName: "BOM", vpaHandle: "mahb", ifscPrefix: "MAHB000" },
  { id: "boi", name: "Bank of India", shortName: "BOI", vpaHandle: "boi", ifscPrefix: "BKID000" },
  { id: "cbi", name: "Central Bank of India", shortName: "CBI", vpaHandle: "cbi", ifscPrefix: "CBIN000" },
  { id: "cub", name: "City Union Bank", shortName: "CUB", vpaHandle: "cub", ifscPrefix: "CIUB000" },
  { id: "dcb", name: "DCB Bank", shortName: "DCB", vpaHandle: "dcbbank", ifscPrefix: "DCBL000" },
  { id: "idbi", name: "IDBI Bank", shortName: "IDBI", vpaHandle: "idbi", ifscPrefix: "IBKL000" },
  { id: "indianbank", name: "Indian Bank", shortName: "Indian Bank", vpaHandle: "indbank", ifscPrefix: "IDIB000" },
  { id: "iob", name: "Indian Overseas Bank", shortName: "IOB", vpaHandle: "iob", ifscPrefix: "IOBA000" },
  { id: "jkbank", name: "Jammu & Kashmir Bank", shortName: "J&K Bank", vpaHandle: "jkb", ifscPrefix: "JAKA000" },
  { id: "karnataka", name: "Karnataka Bank", shortName: "Karnataka Bank", vpaHandle: "kbl", ifscPrefix: "KARB000" },
  { id: "karur", name: "Karur Vysya Bank", shortName: "KVB", vpaHandle: "kvb", ifscPrefix: "KVBL000" },
  { id: "rbl", name: "RBL Bank", shortName: "RBL", vpaHandle: "rbl", ifscPrefix: "RATN000" },
  { id: "southindian", name: "South Indian Bank", shortName: "SIB", vpaHandle: "sib", ifscPrefix: "SIBL000" },
  { id: "uco", name: "UCO Bank", shortName: "UCO", vpaHandle: "uco", ifscPrefix: "UCBA000" }
];

// Initial KPI Strip
const kpiData = [
  { label: "Today's Collections", value: 48500, trend: "+12.5%", isUp: true },
  { label: "Pending Dues", value: 12400, trend: "-4.2%", isUp: false },
  { label: "Monthly Revenue", value: 420000, trend: "+8.1%", isUp: true },
  { label: "Failed Payments", value: 2, trend: "-1", isUp: false }
];

// Sample Members
const sampleMembers = [
  {
    id: "GD-1042",
    name: "Arjun Mehta",
    phone: "+91 98765 43210",
    status: "Active",
    plan: "Pro Annual Membership",
    expiry: "15 Aug 2027",
    trainer: "Vikram Singh",
    pendingDues: 0,
    wallet: 1200
  },
  {
    id: "GD-1088",
    name: "Pooja Sharma",
    phone: "+91 98221 55678",
    status: "Active",
    plan: "Quarterly Strength & Cardio",
    expiry: "04 Nov 2026",
    trainer: "Ananya Deshmukh",
    pendingDues: 2500,
    wallet: 0
  },
  {
    id: "GD-1105",
    name: "Rohan Varma",
    phone: "+91 97110 33490",
    status: "Expired",
    plan: "Monthly Pass",
    expiry: "20 Oct 2026",
    trainer: "None",
    pendingDues: 1800,
    wallet: 450
  }
];

const CollectFeesPage = () => {
  const sentinelRef = useRef(null);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);
  const [isBellActive, setIsBellActive] = useState(false);

  // Billing & Member state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(sampleMembers[0]);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);

  // Invoice Items
  const [invoiceItems, setInvoiceItems] = useState([
    { id: 1, name: "Pro Annual Renewal", qty: 1, price: 18000, discount: 0 }
  ]);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [discountValue, setDiscountValue] = useState(0);

  // Payment Settlement & Status
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [enteredUtr, setEnteredUtr] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreenQr, setIsFullscreenQr] = useState(false);

  // Paytm / PhonePe Soundbox State
  const [soundboxEnabled, setSoundboxEnabled] = useState(true);
  const [soundboxLanguage, setSoundboxLanguage] = useState("hi"); // "hi" for Hindi, "en" for English

  // Receiving Bank & UPI Configuration State
  const [isBankDrawerOpen, setIsBankDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("UPI_PHONE"); // "UPI_PHONE" | "MANUAL_BANK" | "CUSTOM_UPI"
  
  const [receivingAccount, setReceivingAccount] = useState(() => {
    const saved = localStorage.getItem("gymdeck_active_receiving_account");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.upiVpa) return parsed;
      } catch (e) {}
    }
    return {
      bankId: "",
      bankName: "",
      accountHolder: "",
      accountNumberMasked: "",
      accountType: "Current Account",
      branch: "",
      ifsc: "",
      upiVpa: "",
      phone: "",
      isVerified: false
    };
  });

  // Load authoritative receiving account from cloud database on initial mount
  useEffect(() => {
    paymentsV2Api.listAccounts()
      .then((res) => {
        if (res?.data?.accounts && res.data.accounts.length > 0) {
          const primary = res.data.accounts.find(a => a.isPrimary && a.upiVpa) || res.data.accounts.find(a => a.upiVpa) || res.data.accounts.find(a => a.isPrimary) || res.data.accounts[0];
          const mapped = {
            bankId: (primary.bankName || "bank").toLowerCase().replace(/\s+/g, ""),
            bankName: primary.bankName || "",
            accountHolder: primary.beneficiaryName || "",
            accountNumberMasked: primary.accountNumberMasked || "",
            accountType: primary.accountType || "Current Account",
            branch: primary.branchName || "",
            ifsc: primary.ifscCode || "",
            upiVpa: primary.upiVpa || "",
            phone: "",
            isVerified: primary.status === "VERIFIED"
          };
          setReceivingAccount(mapped);
          localStorage.setItem("gymdeck_active_receiving_account", JSON.stringify(mapped));
        }
      })
      .catch((err) => {
        console.warn("Could not fetch remote payment accounts, using local cache:", err);
      });
  }, []);

  // PhonePe / Paytm Onboarding Wizard Steps:
  // 2: Bank Selection (Grid + Search) -> 3: Handshake Animation -> 4: Discovered Accounts Card -> 5: Bank SMS OTP -> 6: Linked Success
  const [wizardStep, setWizardStep] = useState(2);
  const [lookupPhone, setLookupPhone] = useState(receivingAccount.phone.replace("+91 ", ""));
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [selectedSim, setSelectedSim] = useState("SIM 1 (Jio 5G)");
  const [bankSearchTerm, setBankSearchTerm] = useState("");
  const [selectedBank, setSelectedBank] = useState(null);

  // Animated Handshake State (PhonePe / Paytm style)
  const [handshakeSubStep, setHandshakeSubStep] = useState(1);
  const [discoveredAccounts, setDiscoveredAccounts] = useState([]);
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);

  // SMS OTP State & Realistic Incoming SMS Dropdown Banner
  const [smsOtp, setSmsOtp] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(59);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [incomingSmsBanner, setIncomingSmsBanner] = useState(null);
  const otpInputRefs = useRef([]);

  // Manual Bank Form State (Paytm for Business style)
  const [manualBankData, setManualBankData] = useState({
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    accountHolder: "Indians Gym Fitness Studio",
    accountType: "Current Account",
    bankName: "",
    branchName: ""
  });
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [manualError, setManualError] = useState("");

  // Custom UPI VPA State
  const [customVpaInput, setCustomVpaInput] = useState(receivingAccount.upiVpa);
  const [vpaError, setVpaError] = useState("");

  // Sticky header observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsHeaderStuck(!entry.isIntersecting),
      { root: null, threshold: [0], rootMargin: "-20px 0px 0px 0px" }
    );
    observer.observe(sentinel);
    return () => { if (sentinel) observer.unobserve(sentinel); };
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    let interval = null;
    if (wizardStep === 5 && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [wizardStep, otpTimer]);

  // Invoice calculations
  const subtotal = useMemo(() => {
    return invoiceItems.reduce((acc, item) => acc + (item.qty * item.price) - item.discount, 0);
  }, [invoiceItems]);

  const tax = useMemo(() => (subtotal - discountValue) * 0.18, [subtotal, discountValue]);
  const totalPayable = useMemo(() => Math.max(0, subtotal - discountValue + tax), [subtotal, discountValue, tax]);

  // NPCI Standard UPI Intent URI: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
  const upiUri = useMemo(() => {
    if (!receivingAccount.upiVpa) return "";
    const vpa = receivingAccount.upiVpa.trim();
    const name = encodeURIComponent(receivingAccount.accountHolder || "Gym Beneficiary");
    const amount = totalPayable.toFixed(2);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const note = encodeURIComponent(`Gym Fees ${selectedMember?.name || "Member"}`);
    return `upi://pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR&tn=${note}&tr=${invoiceNumber}`;
  }, [receivingAccount, totalPayable, selectedMember]);

  // Pure Vector SVG QR Code Engine with high error tolerance for center logo
  const qrSvgString = useMemo(() => {
    if (!upiUri) return null;
    try {
      const qr = qrcode(0, "H");
      qr.addData(upiUri);
      qr.make();
      return qr.createSvgTag({
        cellSize: 6,
        margin: 2,
        scalable: true
      });
    } catch (err) {
      console.error("Failed to generate vector UPI QR code:", err);
      return null;
    }
  }, [upiUri]);

  // Filtered Banks based on search
  const filteredBanksList = useMemo(() => {
    if (!bankSearchTerm.trim()) return ALL_BANKS;
    const q = bankSearchTerm.toLowerCase();
    return ALL_BANKS.filter(
      (b) => b.name.toLowerCase().includes(q) || b.shortName.toLowerCase().includes(q) || b.ifscPrefix.toLowerCase().includes(q)
    );
  }, [bankSearchTerm]);

  // Paytm / PhonePe Soundbox Audio Synthesizer
  const playSoundboxAlert = useCallback((amount) => {
    if (!soundboxEnabled) return;
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const amtStr = Math.round(amount).toString();
        let text = "";
        let lang = "en-IN";

        if (soundboxLanguage === "hi") {
          lang = "hi-IN";
          text = `GymDeck par ${amtStr} rupaye prapt hue!`;
        } else {
          lang = "en-IN";
          text = `Payment of rupees ${amtStr} received on GymDeck via UPI!`;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn("Speech synthesis unavailable:", e);
    }
  }, [soundboxEnabled, soundboxLanguage]);

  // Trigger PhonePe / Paytm Handshake Animation when a Bank is chosen
  const handleSelectBank = (bank) => {
    setSelectedBank(bank);
    setWizardStep(3); // Start Handshake
    setHandshakeSubStep(1);

    // Micro-step 1: Sending encrypted SMS (800ms)
    setTimeout(() => {
      setHandshakeSubStep(2);
      // Micro-step 2: Connecting NPCI UPI Switch (900ms)
      setTimeout(() => {
        setHandshakeSubStep(3);
        // Micro-step 3: Account discovered -> Transition to Accounts Card (700ms)
        setTimeout(() => {
          const accounts = [
            {
              bankId: bank.id,
              bankName: bank.name,
              accountType: "Current A/C (Commercial)",
              accountNumberMasked: `•••• •••• ${Math.floor(1000 + Math.random() * 9000)}`,
              ifsc: `${bank.ifscPrefix}0042`,
              branch: "Commercial Capital Square Branch",
              holderName: "Indians Gym Fitness Studio",
              suggestedVpa: `indiansgym.${lookupPhone.slice(-4)}@${bank.vpaHandle}`
            },
            {
              bankId: bank.id,
              bankName: bank.name,
              accountType: "Savings A/C",
              accountNumberMasked: `•••• •••• ${Math.floor(1000 + Math.random() * 9000)}`,
              ifsc: `${bank.ifscPrefix}0019`,
              branch: "Retail City Center Branch",
              holderName: "Subham Das",
              suggestedVpa: `subham.${lookupPhone.slice(-4)}@${bank.vpaHandle}`
            }
          ];
          setDiscoveredAccounts(accounts);
          setSelectedAccountIndex(0);
          setWizardStep(4); // Move to Account Selection
        }, 800);
      }, 900);
    }, 850);
  };

  // Move to Bank SMS OTP Verification (PhonePe / Paytm simulation)
  const handleProceedToOtp = () => {
    setWizardStep(5);
    setOtpTimer(59);
    setSmsOtp(["", "", "", "", "", ""]);
    setOtpError("");
    setIncomingSmsBanner(null);

    // Call backend API to simulate SMS dispatch
    const chosen = discoveredAccounts[selectedAccountIndex];
    fetch("http://localhost:3001/v1/payments/simulate-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: lookupPhone,
        bankName: chosen.bankName,
        bankId: chosen.bankId,
        accountData: chosen
      })
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          // Trigger the realistic drop-down phone SMS toast after 1.2s
          setTimeout(() => {
            setIncomingSmsBanner({
              sender: res.data.senderHeader || "VM-BANK",
              otp: res.data.otp || "984201",
              message: res.data.smsMessage || `Your secret OTP is 984201 for GymDeck Account Binding.`
            });
          }, 1200);
        }
      })
      .catch((err) => {
        // Fallback local banner
        setTimeout(() => {
          setIncomingSmsBanner({
            sender: "VM-HDFCBK",
            otp: "984201",
            message: "VM-HDFCBK: 984201 is your OTP to link your account for GymDeck UPI Merchant Collections. Valid for 10 mins."
          });
        }, 1200);
      });

    setTimeout(() => otpInputRefs.current[0]?.focus(), 250);
  };

  // One-click Auto-fill OTP from incoming SMS notification
  const handleAutofillFromSms = () => {
    if (!incomingSmsBanner) return;
    const digits = incomingSmsBanner.otp.split("");
    setSmsOtp(digits);
    setIncomingSmsBanner(null);
    otpInputRefs.current[5]?.focus();
  };

  // OTP Handling
  const handleOtpDigitChange = (index, val) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...smsOtp];
    newOtp[index] = val.slice(-1);
    setSmsOtp(newOtp);

    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !smsOtp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Confirm OTP & Persist to Database & Local State
  const handleVerifyOtp = () => {
    const code = smsOtp.join("");
    if (code.length !== 6) {
      setOtpError("Please enter the complete 6-digit bank verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    const chosen = discoveredAccounts[selectedAccountIndex];

    fetch("http://localhost:3001/v1/payments/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: lookupPhone,
        otp: code,
        accountData: chosen
      })
    })
      .then((res) => res.json())
      .then((res) => {
        setIsVerifyingOtp(false);
        if (res.success) {
          const newAccount = {
            bankId: chosen.bankId,
            bankName: chosen.bankName,
            accountHolder: chosen.holderName,
            accountNumberMasked: chosen.accountNumberMasked,
            accountType: chosen.accountType,
            branch: chosen.branch,
            ifsc: chosen.ifsc,
            upiVpa: chosen.suggestedVpa,
            phone: `+91 ${lookupPhone}`,
            isVerified: true
          };

          setReceivingAccount(newAccount);
          localStorage.setItem("gymdeck_active_receiving_account", JSON.stringify(newAccount));
          setWizardStep(6); // Success
        } else {
          setOtpError(res.message || "Invalid OTP entered.");
        }
      })
      .catch((err) => {
        setIsVerifyingOtp(false);
        // Fallback local persistence
        const newAccount = {
          bankId: chosen.bankId,
          bankName: chosen.bankName,
          accountHolder: chosen.holderName,
          accountNumberMasked: chosen.accountNumberMasked,
          accountType: chosen.accountType,
          branch: chosen.branch,
          ifsc: chosen.ifsc,
          upiVpa: chosen.suggestedVpa,
          phone: `+91 ${lookupPhone}`,
          isVerified: true
        };
        setReceivingAccount(newAccount);
        localStorage.setItem("gymdeck_active_receiving_account", JSON.stringify(newAccount));
        setWizardStep(6);
      });
  };

  // Handle Manual Bank Details (Paytm for Business Penny Drop Verification)
  const handleSaveManualBank = (e) => {
    e.preventDefault();
    if (!manualBankData.accountNumber || manualBankData.accountNumber !== manualBankData.confirmAccountNumber) {
      setManualError("Bank account numbers do not match.");
      return;
    }
    if (!manualBankData.ifscCode || manualBankData.ifscCode.length < 8) {
      setManualError("Please enter a valid 11-digit IFSC code.");
      return;
    }

    setIsVerifyingManual(true);
    setManualError("");

    // Simulate Penny Drop Verification (₹1.00 IMPS deposit check)
    setTimeout(() => {
      setIsVerifyingManual(false);
      const masked = `•••• •••• ${manualBankData.accountNumber.slice(-4)}`;
      const ifsc = manualBankData.ifscCode.toUpperCase();
      const detectedBank = ALL_BANKS.find((b) => ifsc.startsWith(b.ifscPrefix)) || {
        id: "custom",
        name: manualBankData.bankName || "Commercial Bank of India",
        vpaHandle: "upi"
      };

      const newAccount = {
        bankId: detectedBank.id,
        bankName: detectedBank.name,
        accountHolder: manualBankData.accountHolder,
        accountNumberMasked: masked,
        accountType: manualBankData.accountType,
        branch: manualBankData.branchName || "Main Commercial Branch",
        ifsc: ifsc,
        upiVpa: `indiansgym.${manualBankData.accountNumber.slice(-4)}@${detectedBank.vpaHandle}`,
        phone: `+91 ${lookupPhone}`,
        isVerified: true
      };

      setReceivingAccount(newAccount);
      localStorage.setItem("gymdeck_active_receiving_account", JSON.stringify(newAccount));

      // Persist to backend database
      fetch("http://localhost:3001/v1/payments/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount)
      }).catch((e) => console.warn("Backend save skipped:", e));

      setWizardStep(6);
    }, 1400);
  };

  // Handle Custom UPI VPA Save
  const handleSaveCustomVpa = (e) => {
    e.preventDefault();
    if (!customVpaInput.includes("@")) {
      setVpaError("Please enter a valid UPI VPA format (e.g. gymdeck@okhdfcbank).");
      return;
    }

    setVpaError("");
    const newAccount = {
      ...receivingAccount,
      upiVpa: customVpaInput.trim()
    };
    setReceivingAccount(newAccount);
    localStorage.setItem("gymdeck_active_receiving_account", JSON.stringify(newAccount));

    // Save to backend
    fetch("http://localhost:3001/v1/payments/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAccount)
    }).catch((e) => console.warn("Backend save skipped:", e));

    setIsBankDrawerOpen(false);
  };

  // Payment Collect Handlers
  const handleProcessPayment = useCallback(() => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      playSoundboxAlert(totalPayable);
    }, 1100);
  }, [totalPayable, playSoundboxAlert]);

  const resetBilling = useCallback(() => {
    setIsSuccess(false);
    setEnteredUtr("");
    setInvoiceItems([{ id: Date.now(), name: "Membership Renewal", qty: 1, price: 15000, discount: 0 }]);
  }, []);

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(upiUri);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Download QR SVG
  const handleDownloadQrSvg = () => {
    if (!qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GymDeck-UPI-${receivingAccount.upiVpa}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print Desk Standee (Official Acrylic Merchant Standee)
  const handlePrintStandee = () => {
    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>GymDeck Official UPI Merchant Standee</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; margin: 0; background: #fff; color: #0f172a; }
            .standee-card { max-width: 380px; margin: 0 auto; border: 4px solid #0f172a; border-radius: 32px; padding: 32px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
            .header-pill { display: inline-block; padding: 6px 18px; background: #0f172a; color: #fff; font-size: 11px; font-weight: 900; border-radius: 999px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; }
            h1 { font-size: 24px; font-weight: 900; margin: 0 0 4px 0; color: #0f172a; }
            .subtitle { color: #64748b; font-size: 13px; margin: 0 0 24px 0; font-weight: 600; }
            .qr-frame { max-width: 260px; margin: 0 auto 20px auto; padding: 16px; border: 2px solid #e2e8f0; border-radius: 24px; background: #fff; }
            .qr-frame svg { width: 100%; height: auto; display: block; }
            .upi-vpa { font-family: monospace; font-size: 14px; font-weight: 800; color: #4338ca; background: #eef2ff; padding: 8px 16px; border-radius: 12px; display: inline-block; margin-bottom: 20px; }
            .rail-badges { display: flex; justify-content: center; align-items: center; gap: 16px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 11px; font-weight: 800; color: #64748b; }
            .footer-legal { margin-top: 24px; font-size: 10px; color: #94a3b8; font-weight: 700; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="standee-card">
            <div class="header-pill">OFFICIAL UPI PAYMENT STAND</div>
            <h1>${receivingAccount.accountHolder}</h1>
            <p class="subtitle">Scan to Pay via any UPI Application</p>
            <div class="qr-frame">${qrSvgString}</div>
            <div class="upi-vpa">${receivingAccount.upiVpa}</div>
            <div class="rail-badges">
              <span>BHIM UPI</span> • <span>GOOGLE PAY</span> • <span>PHONEPE</span> • <span>PAYTM</span>
            </div>
          </div>
          <div class="footer-legal">NPCI APPROVED UNIFIED PAYMENTS INTERFACE • 0% ZERO CHARGES</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="payments-shell font-sans text-slate-900 selection:bg-indigo-100">
      <div ref={sentinelRef} style={{ height: "1px", marginBottom: "-1px", pointerEvents: "none" }} />

      {/* TOP UTILITY HEADER */}
      <header
        className={`relative z-40 flex flex-col lg:flex-row items-center justify-between gap-4 p-4 transition-all duration-200 border border-x-0 border-t-0 ${
          isHeaderStuck ? "bg-white border-b-slate-200/80 shadow-md" : "bg-[#f6f8fb] border-b-transparent shadow-none"
        }`}
        style={{
          position: "sticky",
          top: "-22px",
          marginTop: "-38px",
          marginInline: "-16px",
          paddingTop: "38px",
          marginBottom: "20px"
        }}
      >
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span>Payments & Billing</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">Collect Fees</span>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md relative">
          <Search size={15} className="absolute left-4 text-slate-400 pointer-events-none" style={{ top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search member, phone, invoice ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsMemberDropdownOpen(true);
            }}
            onFocus={() => setIsMemberDropdownOpen(true)}
            className="w-full h-10 bg-slate-100/70 border border-slate-200 rounded-xl pl-11 pr-11 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
          <button
            onClick={() => setIsFullscreenQr(true)}
            title="Open Fullscreen Standee"
            className="absolute right-3 text-slate-400 hover:text-slate-700 bg-transparent border-0 p-1 cursor-pointer flex items-center justify-center transition-colors"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >
            <QrCode size={16} />
          </button>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-3">
          
          {/* Active Bank Account Pill (PhonePe/Paytm style) */}
          <button
            onClick={() => {
              setDrawerMode("UPI_PHONE");
              setWizardStep(2);
              setIsBankDrawerOpen(true);
            }}
            className="h-10 px-3.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-xs font-semibold text-slate-700 transition-all flex items-center gap-2.5 shadow-sm group"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-400 uppercase font-black leading-none">Settlement Bank</span>
              <span className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                {receivingAccount.bankName} ({receivingAccount.accountNumberMasked.slice(-4)})
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-600 ml-1 transition-colors" />
          </button>

          {/* Soundbox Voice Toggle (Paytm / PhonePe Soundbox) */}
          <button
            onClick={() => {
              const next = !soundboxEnabled;
              setSoundboxEnabled(next);
              if (next) playSoundboxAlert(totalPayable);
            }}
            title={soundboxEnabled ? "GymDeck Soundbox: Voice Active (Click to Mute)" : "GymDeck Soundbox: Muted (Click to Enable)"}
            className={`h-10 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm ${
              soundboxEnabled
                ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {soundboxEnabled ? <Volume2 size={16} className="text-amber-600 animate-pulse" /> : <VolumeX size={16} />}
            <span className="text-[11px] hidden sm:inline">Soundbox</span>
          </button>

          <button
            onClick={() => setIsBellActive(!isBellActive)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center active:scale-95 transition-all shadow-sm relative ${
              isBellActive ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>

          <button
            onClick={() => {
              setSelectedMember({
                id: `WK-${Math.floor(1000 + Math.random() * 9000)}`,
                name: "Walk-in Guest",
                phone: "+91 90000 00000",
                status: "Active",
                plan: "Day Pass / Single Visit",
                expiry: "Today",
                trainer: "None",
                pendingDues: 0,
                wallet: 0
              });
              setInvoiceItems([{ id: Date.now(), name: "Gym Day Pass & Locker Access", qty: 1, price: 500, discount: 0 }]);
            }}
            className="h-10 px-4 bg-slate-900 text-white border border-slate-900 rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all shadow-sm flex items-center gap-2 hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
            Walk-In Billing
          </button>
        </div>
      </header>

      {/* TOP KPI STRIP */}
      <section className="flex flex-col gap-6 relative z-10 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Collect Fees</h1>
            <p className="text-xs font-semibold text-slate-500 mt-2 max-w-lg">
              Collect membership renewals, walk-ins, and dues via dynamic instant UPI QR, Card, or Cash with zero aggregator deductions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDrawerMode("UPI_PHONE");
                setWizardStep(2);
                setIsBankDrawerOpen(true);
              }}
              className="h-9 px-3.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm"
            >
              <Building className="w-3.5 h-3.5 text-indigo-600" />
              Link Another Bank Account
            </button>
            <button className="h-9 px-3.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              Pending Dues
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{kpi.label}</span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-black text-slate-900">
                  {typeof kpi.value === "number" && kpi.value > 1000 ? currencyFormatter.format(kpi.value) : kpi.value}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    kpi.isUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {kpi.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {kpi.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3-COLUMN BILLING WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Member Profile Card */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-base shadow-md shadow-indigo-600/20">
                  {selectedMember ? selectedMember.name.charAt(0) : <User className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{selectedMember ? selectedMember.name : "Select Member"}</h3>
                  <p className="text-[11px] font-semibold text-slate-400">{selectedMember ? selectedMember.id : "---"}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-md uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {selectedMember?.status || "Active"}
              </span>
            </div>

            {selectedMember && (
              <div className="p-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                  <div>
                    <span className="block text-[10px] font-black uppercase text-slate-400 mb-0.5">Phone</span>
                    <span className="font-bold text-slate-800">{selectedMember.phone}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase text-slate-400 mb-0.5">Current Expiry</span>
                    <span className="font-bold text-slate-800">{selectedMember.expiry}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] font-black uppercase text-slate-400 mb-0.5">Active Plan</span>
                    <span className="font-extrabold text-indigo-700">{selectedMember.plan}</span>
                  </div>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Pending Dues
                    </span>
                    <span className="font-black text-slate-900">{currencyFormatter.format(selectedMember.pendingDues)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <Wallet className="w-3.5 h-3.5 text-indigo-500" /> Member Wallet
                    </span>
                    <span className="font-black text-indigo-600">{currencyFormatter.format(selectedMember.wallet)}</span>
                  </div>
                </div>

                {/* Member Switcher */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Switch Member</span>
                  <div className="flex flex-col gap-1.5">
                    {sampleMembers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMember(m)}
                        className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                          selectedMember.id === m.id ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span>{m.name}</span>
                        <span className="text-[10px] opacity-70">{m.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* NPCI Verified Direct Rail Card */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex gap-3 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-extrabold text-emerald-950 block mb-0.5">NPCI Verified Receiving Account</span>
              <span className="text-emerald-800 leading-relaxed font-medium">
                Linked to <strong>{receivingAccount.bankName}</strong> ({receivingAccount.accountNumberMasked.slice(-4)}). Direct P2M instant settlement with 0% gateway deductions.
              </span>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Invoice Builder */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[580px]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
            <h2 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Invoice Itemization
            </h2>
            <span className="text-[11px] font-black text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
              INV-{new Date().getFullYear()}-8492
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div className="grid grid-cols-12 gap-3 pb-2 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Rate (₹)</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            <AnimatePresence>
              {invoiceItems.map((item) => (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  key={item.id}
                  className="grid grid-cols-12 gap-3 items-center bg-white p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 transition-all group"
                >
                  <div className="col-span-6 flex flex-col">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInvoiceItems((prev) => prev.map((i) => i.id === item.id ? { ...i, name: val } : i));
                      }}
                      className="font-bold text-slate-900 text-xs bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1"
                    />
                    <span className="text-[10px] text-slate-400 px-1 -ml-1">Fitness Service (18% GST)</span>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className="text-xs font-black bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">1</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setInvoiceItems((prev) => prev.map((i) => i.id === item.id ? { ...i, price: val } : i));
                      }}
                      className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-md py-1 px-1 text-right outline-none w-full focus:bg-white"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <span className="text-xs font-black text-slate-900">{currencyFormatter.format(item.price)}</span>
                    <button
                      onClick={() => setInvoiceItems((prev) => prev.filter((i) => i.id !== item.id))}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button
              onClick={() => {
                setInvoiceItems((prev) => [
                  ...prev,
                  { id: Date.now(), name: "Personal Training Session / Add-on", qty: 1, price: 1500, discount: 0 }
                ]);
              }}
              className="mt-2 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Billable Item / PT / Nutrition
            </button>
          </div>

          {/* Totals Summary */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl flex flex-col gap-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">Subtotal</span>
              <span className="font-bold text-slate-900">{currencyFormatter.format(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Special Discount</span>
                <button
                  onClick={() => setDiscountValue(discountValue ? 0 : 500)}
                  className="text-[10px] font-black text-indigo-600 underline cursor-pointer ml-1"
                >
                  {discountValue ? "Remove" : "Apply ₹500"}
                </button>
              </div>
              <span className="font-bold text-emerald-600">-{currencyFormatter.format(discountValue)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">GST (18%)</span>
              <span className="font-bold text-slate-900">{currencyFormatter.format(tax)}</span>
            </div>
            <div className="h-px bg-slate-200/80 my-1" />
            <div className="flex items-center justify-between text-sm">
              <span className="font-black text-slate-900">Total Net Amount</span>
              <span className="font-black text-indigo-600 text-lg">{currencyFormatter.format(totalPayable)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Payment Method & Dynamic UPI QR Section */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Main Payment Controller Card */}
          <div className="bg-slate-900 rounded-3xl shadow-enterprise text-white p-6 relative overflow-hidden">
            <div className="relative z-10">
              
              {/* Header Amount */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="block text-slate-400 text-[10px] font-black uppercase tracking-wider">Amount To Collect</span>
                  <div className="text-3xl font-black tracking-tight text-white mt-0.5">
                    {currencyFormatter.format(totalPayable)}
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={12} /> Direct Settled
                </div>
              </div>

              {/* Payment Method Switcher */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { key: "UPI", label: "UPI QR", icon: QrCode },
                  { key: "Card", label: "Card / POS", icon: CreditCard },
                  { key: "Cash", label: "Cash Desk", icon: DollarSign }
                ].map((m) => {
                  const Icon = m.icon;
                  const isActive = paymentMethod === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setPaymentMethod(m.key)}
                      className={`h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-xs font-bold border ${
                        isActive
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/40"
                          : "bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <Icon size={14} />
                      <span className="text-[10px] tracking-wide">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* DYNAMIC UPI QR CODE CONTAINER (PhonePe / Paytm Merchant Standee style) */}
              {paymentMethod === "UPI" && (
                <div className="flex flex-col items-center bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-5">
                  <div className="flex items-center justify-between w-full mb-3 text-xs">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Zap size={12} className="text-amber-400" />
                      All-in-One UPI Standee
                    </span>
                    <button
                      onClick={() => setIsFullscreenQr(true)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-bold transition-colors"
                    >
                      <Maximize2 size={12} /> Expand
                    </button>
                  </div>

                  {/* QR SVG Render Container */}
                  <div className="bg-white p-3.5 rounded-2xl shadow-xl flex items-center justify-center relative group w-52 h-52">
                    {qrSvgString ? (
                      <>
                        <div
                          className="w-full h-full flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: qrSvgString }}
                        />
                        {/* Centered Brand Mark Badge */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-9 h-9 bg-slate-900 border-2 border-white rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md">
                            GD
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-3 text-slate-400">
                        <QrCode size={40} className="mb-2 text-slate-400 opacity-60" />
                        <span className="text-[11px] font-bold text-slate-700">No Receiving Account</span>
                        <span className="text-[9px] text-slate-400 mt-1 leading-tight max-w-[140px]">
                          Configure receiving UPI in Settings → Banking & Settlement
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Linked Bank & VPA details */}
                  <div className="mt-3 text-center w-full">
                    {receivingAccount.upiVpa ? (
                      <>
                        <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-white">
                          <span>{receivingAccount.upiVpa}</span>
                          <button
                            onClick={handleCopyLink}
                            title="Copy UPI Intent URI"
                            className="text-slate-400 hover:text-indigo-400 p-1 transition-colors"
                          >
                            {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Settles to: {receivingAccount.bankName || "Direct Bank"} {receivingAccount.accountNumberMasked ? `(${receivingAccount.accountNumberMasked.slice(-4)})` : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 block">
                        Direct merchant settlement unconfigured
                      </span>
                    )}
                  </div>

                  {/* Supported UPI Apps Strip */}
                  <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM</span>
                  </div>

                  {/* QR Action Buttons: Download, Print Standee, Share */}
                  <div className="grid grid-cols-3 gap-2 w-full mt-3 pt-3 border-t border-slate-800">
                    <button
                      onClick={handleDownloadQrSvg}
                      className="h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] font-bold text-slate-200 flex items-center justify-center gap-1 transition-all"
                    >
                      <Download size={11} /> Download
                    </button>
                    <button
                      onClick={handlePrintStandee}
                      className="h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] font-bold text-slate-200 flex items-center justify-center gap-1 transition-all"
                    >
                      <Printer size={11} /> Standee
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hi, please pay Gym Fees of ${currencyFormatter.format(totalPayable)} for ${selectedMember?.name} via UPI:\n${upiUri}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] font-bold text-slate-200 flex items-center justify-center gap-1 transition-all"
                    >
                      <Share2 size={11} /> Share
                    </a>
                  </div>
                </div>
              )}

              {/* CARD PAYMENT VIEW */}
              {paymentMethod === "Card" && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-5 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">POS Terminal / Card Swiper</span>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-indigo-400" />
                      <span>Desk Terminal #01 (Pinelabs/Paytm POS)</span>
                    </div>
                    <span className="text-emerald-400 font-bold text-[10px]">CONNECTED</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter Card Approval Code / Auth Reference"
                    className="w-full h-10 bg-slate-900 border border-slate-800 rounded-xl px-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* CASH PAYMENT VIEW */}
              {paymentMethod === "Cash" && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-5 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Cash Tender Counter</span>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Cash Received:</span>
                    <span className="font-bold text-white">{currencyFormatter.format(totalPayable)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Change Due:</span>
                    <span className="font-bold text-emerald-400">₹0</span>
                  </div>
                </div>
              )}

              {/* Optional UTR manual entry */}
              {paymentMethod === "UPI" && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    <span>12-Digit Bank UTR (Optional)</span>
                    <span className="text-indigo-400 cursor-pointer" onClick={() => setEnteredUtr("849201948201")}>Fill Sample</span>
                  </div>
                  <input
                    type="text"
                    maxLength={16}
                    value={enteredUtr}
                    onChange={(e) => setEnteredUtr(e.target.value)}
                    placeholder="e.g. 428190392812"
                    className="w-full h-10 bg-slate-950/90 border border-slate-800 rounded-xl px-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 font-mono tracking-wider"
                  />
                </div>
              )}

              {/* COLLECT BUTTON */}
              <button
                onClick={handleProcessPayment}
                disabled={isProcessing || invoiceItems.length === 0}
                className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-white shadow-xl shadow-emerald-500/20 rounded-2xl py-4 font-black text-sm tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Verifying Banking Rails...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirm & Collect {currencyFormatter.format(totalPayable)}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Bank Details Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Building size={18} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Settlement Destination</span>
                <span className="font-bold text-slate-900 text-xs">{receivingAccount.bankName} • {receivingAccount.accountNumberMasked}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setDrawerMode("UPI_PHONE");
                setWizardStep(2);
                setIsBankDrawerOpen(true);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Change
            </button>
          </div>
        </div>
      </div>

      {/* FULLSCREEN CUSTOMER-FACING DISPLAY MODAL */}
      <AnimatePresence>
        {isFullscreenQr && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center relative"
            >
              <button
                onClick={() => setIsFullscreenQr(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-2 rounded-full hover:bg-slate-100 transition-all"
              >
                <X size={20} />
              </button>

              <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest mb-3">
                GYMDECK SECURE INSTANT PAY
              </span>
              <h2 className="text-xl font-black text-slate-900">{receivingAccount.accountHolder}</h2>
              <p className="text-xs font-medium text-slate-500 mb-6">Scan with Google Pay, PhonePe, Paytm, or BHIM</p>

              {/* High-res QR render */}
              <div className="w-72 h-72 bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-xl flex items-center justify-center relative">
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: qrSvgString }} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-slate-900 border-2 border-white rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
                    GD
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Amount Due</span>
                <span className="text-4xl font-black text-slate-900">{currencyFormatter.format(totalPayable)}</span>
                <span className="text-xs text-indigo-600 font-extrabold block mt-2">{receivingAccount.upiVpa}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHONEPE / PAYTM STYLE BANK SELECTION & ONBOARDING DRAWER */}
      <AnimatePresence>
        {isBankDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="bg-[#F8FAFC] w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden relative"
            >
              
              {/* REALISTIC INCOMING SMS NOTIFICATION BANNER (Drops from the top) */}
              <AnimatePresence>
                {incomingSmsBanner && (
                  <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="absolute top-4 inset-x-4 z-30 bg-slate-900/95 border border-indigo-500/40 text-white rounded-2xl p-3.5 shadow-2xl backdrop-blur-lg flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Smartphone size={16} />
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-indigo-400 uppercase text-[10px] tracking-wider">{incomingSmsBanner.sender}</span>
                          <span className="text-slate-400 text-[10px]">• Just now</span>
                        </div>
                        <p className="font-medium text-slate-200 mt-0.5 text-[11px] leading-tight line-clamp-2">
                          {incomingSmsBanner.message}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleAutofillFromSms}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shrink-0 shadow-md transition-all flex items-center gap-1"
                    >
                      <Zap size={11} /> Auto-fill {incomingSmsBanner.otp}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Drawer Top Navigation Bar */}
              <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  {wizardStep > 2 && drawerMode === "UPI_PHONE" && (
                    <button
                      onClick={() => setWizardStep(2)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-all mr-1"
                    >
                      <ArrowLeft size={18} />
                    </button>
                  )}
                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-tight">
                      {drawerMode === "UPI_PHONE" && wizardStep === 2 && "Select Your Bank Account"}
                      {drawerMode === "UPI_PHONE" && wizardStep === 3 && "Verifying Device & Bank"}
                      {drawerMode === "UPI_PHONE" && wizardStep === 4 && "Select Account to Link"}
                      {drawerMode === "UPI_PHONE" && wizardStep === 5 && "Bank SMS Authorization"}
                      {drawerMode === "UPI_PHONE" && wizardStep === 6 && "Account Linked Successfully"}
                      {drawerMode === "MANUAL_BANK" && "Enter Bank Account Details"}
                      {drawerMode === "CUSTOM_UPI" && "Add Custom UPI ID (VPA)"}
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      {drawerMode === "UPI_PHONE" && wizardStep === 2 && "Official NPCI UPI & Direct Bank Settlement"}
                      {drawerMode === "UPI_PHONE" && wizardStep === 3 && "Secure encrypted handshake with NPCI switch"}
                      {drawerMode === "UPI_PHONE" && wizardStep === 4 && `Found accounts at ${selectedBank?.name}`}
                      {drawerMode === "UPI_PHONE" && wizardStep === 5 && "Authorise settlement via 6-digit SMS OTP"}
                      {drawerMode === "UPI_PHONE" && wizardStep === 6 && "Ready for 0% fee offline and online collections"}
                      {drawerMode === "MANUAL_BANK" && "Direct IMPS Penny Drop account validation"}
                      {drawerMode === "CUSTOM_UPI" && "Route fee collections to any existing UPI VPA handle"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBankDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* THREE TOP ONBOARDING TABS (PhonePe / Paytm Business Style) */}
              {wizardStep === 2 && (
                <div className="grid grid-cols-3 bg-slate-100 p-1.5 border-b border-slate-200">
                  <button
                    onClick={() => setDrawerMode("UPI_PHONE")}
                    className={`py-2 rounded-xl text-xs font-bold transition-all text-center ${
                      drawerMode === "UPI_PHONE"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Link via Mobile
                  </button>
                  <button
                    onClick={() => setDrawerMode("MANUAL_BANK")}
                    className={`py-2 rounded-xl text-xs font-bold transition-all text-center ${
                      drawerMode === "MANUAL_BANK"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Enter A/C Details
                  </button>
                  <button
                    onClick={() => setDrawerMode("CUSTOM_UPI")}
                    className={`py-2 rounded-xl text-xs font-bold transition-all text-center ${
                      drawerMode === "CUSTOM_UPI"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Custom UPI VPA
                  </button>
                </div>
              )}

              {/* SIM & PHONE CONTEXT BAR (Just like PhonePe / Paytm) */}
              {drawerMode === "UPI_PHONE" && wizardStep === 2 && (
                <div className="px-6 py-3.5 bg-white border-b border-slate-200/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-indigo-600" />
                      <span className="text-slate-600 font-medium">Bank Registered Mobile:</span>
                      {isEditingPhone ? (
                        <input
                          type="text"
                          maxLength={10}
                          value={lookupPhone}
                          onChange={(e) => setLookupPhone(e.target.value.replace(/\D/g, ""))}
                          className="w-28 px-1.5 py-0.5 border border-indigo-400 rounded font-extrabold text-slate-900 text-xs outline-none"
                        />
                      ) : (
                        <span className="font-extrabold text-slate-900">+91 {lookupPhone}</span>
                      )}
                    </div>
                    <button
                      onClick={() => setIsEditingPhone(!isEditingPhone)}
                      className="text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      {isEditingPhone ? "Save" : "Change"}
                    </button>
                  </div>

                  {/* Dual SIM Card Selector */}
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[
                      { id: "SIM 1 (Jio 5G)", label: "SIM 1: Jio 5G", phone: `+91 ${lookupPhone}` },
                      { id: "SIM 2 (Airtel)", label: "SIM 2: Airtel 5G", phone: "+91 98112 34567" }
                    ].map((sim) => (
                      <button
                        key={sim.id}
                        onClick={() => setSelectedSim(sim.id)}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                          selectedSim === sim.id
                            ? "bg-indigo-50/70 border-indigo-500 text-indigo-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <div>
                          <span className="block text-[11px] font-black">{sim.label}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{sim.phone}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedSim === sim.id ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"
                          }`}
                        >
                          {selectedSim === sim.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DRAWER BODY CONTENT */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                
                {/* TAB 1: PHONEPE / PAYTM BANK SELECTION FLOW */}
                {drawerMode === "UPI_PHONE" && wizardStep === 2 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    
                    {/* Instant Search Bar */}
                    <div className="relative">
                      <Search size={16} className="absolute left-4 text-slate-400 pointer-events-none" style={{ top: "50%", transform: "translateY(-50%)" }} />
                      <input
                        type="text"
                        placeholder="Search by bank name or IFSC (e.g. HDFC, SBIN, ICICI)..."
                        value={bankSearchTerm}
                        onChange={(e) => setBankSearchTerm(e.target.value)}
                        className="w-full h-12 bg-white border border-slate-200 rounded-2xl pl-11 pr-4 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all placeholder:text-slate-400"
                      />
                      {bankSearchTerm && (
                        <button
                          onClick={() => setBankSearchTerm("")}
                          className="absolute right-4 text-slate-400 hover:text-slate-600"
                          style={{ top: "50%", transform: "translateY(-50%)" }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* POPULAR BANKS GRID (Exact PhonePe / Paytm 4-Column Layout) */}
                    {!bankSearchTerm.trim() && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Popular Banks</span>
                          <span className="text-[10px] font-bold text-indigo-600">Top 16 Indian Rails</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {POPULAR_BANKS.map((bank) => (
                            <button
                              key={bank.id}
                              onClick={() => handleSelectBank(bank)}
                              className="p-3 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-indigo-500 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5"
                            >
                              <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-105">
                                {bank.icon}
                              </div>
                              <span className="font-extrabold text-[11px] text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-1">
                                {bank.shortName}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ALL OTHER BANKS LIST (Alphabetical A-Z) */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          {bankSearchTerm ? `Search Results (${filteredBanksList.length})` : "All Indian Banks (A-Z)"}
                        </span>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden">
                        {filteredBanksList.map((bank) => (
                          <div
                            key={bank.id}
                            onClick={() => handleSelectBank(bank)}
                            className="p-3.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold overflow-hidden p-1">
                                {bank.icon ? bank.icon : <Building size={20} className="text-slate-500" />}
                              </div>
                              <div>
                                <span className="font-bold text-xs text-slate-900 block group-hover:text-indigo-600 transition-colors">
                                  {bank.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">IFSC: {bank.ifscPrefix} • Instant UPI</span>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Authentic PhonePe / Paytm 3-Stage Animated Handshake */}
                {drawerMode === "UPI_PHONE" && wizardStep === 3 && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="py-12 flex flex-col items-center justify-center text-center">
                    
                    {/* Bank Emblem Floating Badge with Pulse Ring */}
                    <div className="relative mb-6">
                      <div className="w-20 h-20 p-2 bg-white rounded-3xl border border-slate-200 shadow-xl flex items-center justify-center relative z-10">
                        {selectedBank?.icon}
                        <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md animate-bounce">
                          <Zap size={14} />
                        </div>
                      </div>
                      <div className="absolute inset-0 rounded-3xl bg-indigo-500/20 animate-ping -z-0" />
                    </div>

                    <h3 className="text-lg font-black text-slate-900 mb-1">Connecting with {selectedBank?.name}</h3>
                    <p className="text-xs text-slate-500 mb-8 max-w-xs">
                      Establishing encrypted dual-channel handshake with NPCI switch for +91 {lookupPhone}...
                    </p>

                    {/* 3 Micro-Steps Progress Card */}
                    <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-left space-y-4">
                      {/* Sub-step 1 */}
                      <div className="flex items-center gap-3 text-xs">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black transition-all ${
                            handshakeSubStep > 1 ? "bg-emerald-500" : "bg-indigo-600 animate-pulse"
                          }`}
                        >
                          {handshakeSubStep > 1 ? <Check size={12} strokeWidth={3} /> : "1"}
                        </div>
                        <span className={`font-bold ${handshakeSubStep >= 1 ? "text-slate-900" : "text-slate-400"}`}>
                          Sending encrypted SMS from {selectedSim}...
                        </span>
                      </div>

                      {/* Sub-step 2 */}
                      <div className="flex items-center gap-3 text-xs">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black transition-all ${
                            handshakeSubStep > 2 ? "bg-emerald-500" : handshakeSubStep === 2 ? "bg-indigo-600 animate-pulse" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {handshakeSubStep > 2 ? <Check size={12} strokeWidth={3} /> : "2"}
                        </div>
                        <span className={`font-bold ${handshakeSubStep >= 2 ? "text-slate-900" : "text-slate-400"}`}>
                          Authenticating with {selectedBank?.shortName} switch...
                        </span>
                      </div>

                      {/* Sub-step 3 */}
                      <div className="flex items-center gap-3 text-xs">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black transition-all ${
                            handshakeSubStep === 3 ? "bg-emerald-500" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {handshakeSubStep === 3 ? <Check size={12} strokeWidth={3} /> : "3"}
                        </div>
                        <span className={`font-bold ${handshakeSubStep === 3 ? "text-slate-900" : "text-slate-400"}`}>
                          Discovered linked bank accounts!
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Discovered Bank Accounts Card (PhonePe / Paytm style) */}
                {drawerMode === "UPI_PHONE" && wizardStep === 4 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-slate-900">Found {discoveredAccounts.length} Linked Accounts</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Select which account should receive direct membership collections for <strong>GymDeck</strong>.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {discoveredAccounts.map((acc, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedAccountIndex(idx)}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                            selectedAccountIndex === idx
                              ? "bg-white border-indigo-600 shadow-lg shadow-indigo-600/10"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 flex items-center justify-center p-1 bg-slate-50 rounded-xl border border-slate-100">
                              {selectedBank?.icon}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-sm">{acc.bankName}</span>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md">
                                  {acc.accountType}
                                </span>
                              </div>
                              <span className="text-xs font-extrabold text-slate-800 block mt-0.5">
                                A/C: {acc.accountNumberMasked}
                              </span>
                              <span className="text-[11px] text-slate-400 block">
                                IFSC: {acc.ifsc} • {acc.branch}
                              </span>
                            </div>
                          </div>

                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              selectedAccountIndex === idx ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"
                            }`}
                          >
                            {selectedAccountIndex === idx && <Check size={14} strokeWidth={3} />}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 flex gap-3">
                      <ShieldCheck size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong>Direct Settlement Rail:</strong> 100% of member fees will deposit directly into this bank account without intermediary holdbacks or 2% payment aggregator charges.
                      </p>
                    </div>

                    <button
                      onClick={handleProceedToOtp}
                      className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20"
                    >
                      <span>Proceed to Bank SMS Authorization</span>
                      <ArrowRight size={14} />
                    </button>
                  </motion.div>
                )}

                {/* STEP 5: Bank Official SMS OTP Screen */}
                {drawerMode === "UPI_PHONE" && wizardStep === 5 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="text-center">
                      <div className="w-14 h-14 bg-white p-2 rounded-2xl border border-slate-200 shadow-md mx-auto mb-3 flex items-center justify-center">
                        {selectedBank?.icon}
                      </div>
                      <h3 className="text-lg font-black text-slate-900">{selectedBank?.name} Authorization</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        Enter the 6-digit OTP sent by bank via SMS to <strong>+91 {lookupPhone}</strong> to link account.
                      </p>
                    </div>

                    {/* 6-Digit OTP Box Grid */}
                    <div className="space-y-3">
                      <div className="flex justify-between gap-2 max-w-sm mx-auto">
                        {smsOtp.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => (otpInputRefs.current[idx] = el)}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className="w-12 h-14 bg-white border-2 border-slate-200 rounded-xl text-center text-xl font-black text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-sm"
                          />
                        ))}
                      </div>
                      {otpError && <p className="text-xs text-rose-600 font-bold text-center">{otpError}</p>}
                    </div>

                    {/* Resend & Demo OTP Fill */}
                    <div className="flex items-center justify-between text-xs max-w-sm mx-auto">
                      <span className="text-slate-400">
                        {otpTimer > 0 ? `Resend SMS OTP in ${otpTimer}s` : "Didn't receive code?"}
                      </span>
                      {otpTimer === 0 ? (
                        <button
                          onClick={() => {
                            setOtpTimer(59);
                            handleProceedToOtp();
                          }}
                          className="font-bold text-indigo-600 hover:underline"
                        >
                          Resend via SMS
                        </button>
                      ) : (
                        <button
                          onClick={() => setSmsOtp(["9", "8", "4", "2", "0", "1"])}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                        >
                          Fill Demo OTP (984201)
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || smsOtp.join("").length < 6}
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30"
                    >
                      {isVerifyingOtp ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Authorizing Banking Rails...</span>
                        </>
                      ) : (
                        <span>Verify & Bind Account</span>
                      )}
                    </button>
                  </motion.div>
                )}

                {/* STEP 6: Success Confirmation Screen */}
                {drawerMode === "UPI_PHONE" && wizardStep === 6 && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center py-4">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-500/30">
                      <Check size={32} strokeWidth={3} />
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-slate-900">Bank Account Bound Successfully</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Persisted in PostgreSQL database & activated for direct member collections.
                      </p>
                    </div>

                    {/* Official Passbook Card */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 text-left space-y-3 text-xs shadow-sm">
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <div className="w-10 h-10 flex items-center justify-center p-1 bg-slate-50 rounded-xl">
                          {selectedBank?.icon || <Building size={20} className="text-indigo-600" />}
                        </div>
                        <div>
                          <span className="font-black text-slate-900 text-sm block">{receivingAccount.bankName}</span>
                          <span className="text-[11px] text-slate-400">{receivingAccount.accountType} • {receivingAccount.branch}</span>
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Account Number</span>
                        <span className="font-bold text-slate-900">{receivingAccount.accountNumberMasked}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">IFSC Code</span>
                        <span className="font-bold text-slate-900">{receivingAccount.ifsc}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Generated UPI VPA</span>
                        <span className="font-black text-indigo-600">{receivingAccount.upiVpa}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Settlement Rate</span>
                        <span className="font-extrabold text-emerald-600">0% Gateway Charges • Instant T+0</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsBankDrawerOpen(false)}
                      className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xl shadow-slate-900/20"
                    >
                      Done & Return to Billing
                    </button>
                  </motion.div>
                )}

                {/* TAB 2: MANUAL BANK ACCOUNT ENTRY (Paytm for Business Penny Drop) */}
                {drawerMode === "MANUAL_BANK" && (
                  <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSaveManualBank} className="space-y-4">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 flex gap-2.5">
                      <Sparkles size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Instant ₹1 Penny-Drop Verification:</span>
                        We will verify the beneficiary name directly with NPCI via a micro-penny IMPS transfer.
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="password"
                        required
                        value={manualBankData.accountNumber}
                        onChange={(e) => setManualBankData({ ...manualBankData, accountNumber: e.target.value.replace(/\D/g, "") })}
                        placeholder="Enter 9-18 digit account number"
                        className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 font-mono tracking-wider"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Re-enter Bank Account Number
                      </label>
                      <input
                        type="text"
                        required
                        value={manualBankData.confirmAccountNumber}
                        onChange={(e) => setManualBankData({ ...manualBankData, confirmAccountNumber: e.target.value.replace(/\D/g, "") })}
                        placeholder="Re-enter account number to verify"
                        className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 font-mono tracking-wider"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={11}
                          value={manualBankData.ifscCode}
                          onChange={(e) => setManualBankData({ ...manualBankData, ifscCode: e.target.value.toUpperCase() })}
                          placeholder="e.g. SBIN0000421"
                          className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 font-mono uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          Account Type
                        </label>
                        <select
                          value={manualBankData.accountType}
                          onChange={(e) => setManualBankData({ ...manualBankData, accountType: e.target.value })}
                          className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                        >
                          <option value="Current Account">Current Account (Business)</option>
                          <option value="Savings Account">Savings Account (Personal)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Account Holder Name (as in bank records)
                      </label>
                      <input
                        type="text"
                        required
                        value={manualBankData.accountHolder}
                        onChange={(e) => setManualBankData({ ...manualBankData, accountHolder: e.target.value })}
                        placeholder="Full registered entity or personal name"
                        className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                      />
                    </div>

                    {manualError && <p className="text-xs text-rose-600 font-bold">{manualError}</p>}

                    <button
                      type="submit"
                      disabled={isVerifyingManual}
                      className="w-full h-12 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 mt-4"
                    >
                      {isVerifyingManual ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying Bank Account via IMPS Penny Drop...</span>
                        </>
                      ) : (
                        <span>Verify & Save Account</span>
                      )}
                    </button>
                  </motion.form>
                )}

                {/* TAB 3: CUSTOM UPI VPA ENTRY */}
                {drawerMode === "CUSTOM_UPI" && (
                  <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSaveCustomVpa} className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600">
                      Enter any UPI Virtual Payment Address (VPA) belonging to your gym. All QR payments and member app transactions will be routed to this handle.
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Custom UPI VPA Handle
                      </label>
                      <input
                        type="text"
                        required
                        value={customVpaInput}
                        onChange={(e) => setCustomVpaInput(e.target.value.trim())}
                        placeholder="e.g. indiansgym@oksbi or mygym@paytm"
                        className="w-full h-12 bg-white border border-slate-200 rounded-2xl px-4 text-xs font-black text-slate-900 outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Quick Suggestions */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Suggested Handles</span>
                      <div className="flex flex-wrap gap-2">
                        {["indiansgym@oksbi", "indiansgym@okhdfcbank", "indiansgym@paytm", "indiansgym@okaxis"].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setCustomVpaInput(sug)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-bold text-[11px] transition-colors"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {vpaError && <p className="text-xs text-rose-600 font-bold">{vpaError}</p>}

                    <button
                      type="submit"
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 mt-4"
                    >
                      <Check size={16} />
                      <span>Save & Activate UPI VPA</span>
                    </button>
                  </motion.form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PAYMENT SUCCESS MODAL OVERLAY */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="bg-emerald-500 p-8 flex flex-col items-center justify-center text-white relative">
                <button onClick={resetBilling} className="absolute top-4 right-4 text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-700/30 mb-4">
                  <Check className="w-8 h-8 text-emerald-500 stroke-[3]" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">Payment Collected</h2>
                <p className="text-emerald-50 mt-1 text-xs opacity-90">
                  {currencyFormatter.format(totalPayable)} collected via {paymentMethod}
                </p>
              </div>

              <div className="p-6 flex flex-col gap-4 text-xs">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Transaction ID</span>
                    <span className="font-bold text-slate-900 font-mono">TXN-{Math.floor(100000 + Math.random() * 900000)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Member</span>
                    <span className="font-bold text-slate-900">{selectedMember?.name} ({selectedMember?.id})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Settled Into</span>
                    <span className="font-bold text-slate-900">{receivingAccount.bankName}</span>
                  </div>
                  {enteredUtr && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Bank UTR</span>
                      <span className="font-bold text-indigo-600 font-mono">{enteredUtr}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Updated Expiry</span>
                    <span className="font-bold text-emerald-600">30 Oct 2027</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    onClick={handlePrintStandee}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Printer className="w-4 h-4" /> Print Receipt
                  </button>
                  <a
                    href={`https://wa.me/${selectedMember?.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Dear ${selectedMember?.name}, GymDeck confirms receipt of ${currencyFormatter.format(totalPayable)} for your gym membership. Valid until Oct 2027. Thank you!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Smartphone className="w-4 h-4" /> Send Receipt
                  </a>
                  <button
                    onClick={resetBilling}
                    className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 font-bold text-xs text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30"
                  >
                    <span>Collect Next Fee</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { ErrorBoundary } from "./ErrorHandlers.jsx";

export function mountCollectFees() {
  const stage = document.querySelector('[data-stage="payments"]');
  if (!stage) return null;

  const rootElement = document.createElement("div");
  rootElement.dataset.collectFeesReactRoot = "";
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <><CollectFeesPage /><BrandFooter /></>
      </ErrorBoundary>
    );
    return root;
  } catch (err) {
    console.error("Failed to render Collect Fees UI:", err);
    return null;
  }
}

export default CollectFeesPage;
