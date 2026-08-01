// Shared user-facing copy that appears in more than one place, so a
// rename only needs to happen here. Nav labels stay separate from page
// headings where the two are deliberately different lengths (e.g. the
// nav says "POS" but the page reads "POS Checkout") — sharing a key
// there would force one to change to match the other. Where a nav label
// and its page heading are the same word (Inventory, Customers, Staff),
// the page just imports and reuses the nav constant instead of
// declaring a second key with an identical value.

export const NAV_LABEL_POS = "POS";
export const NAV_LABEL_INVENTORY = "Inventory";
export const NAV_LABEL_CUSTOMERS = "Customers";
export const NAV_LABEL_ADMIN = "Admin";
export const NAV_LABEL_STAFF = "Staff";

export const PAGE_HEADING_POS = "POS Checkout";
export const PAGE_HEADING_ADMIN_DASHBOARD = "Admin dashboard";
export const PAGE_HEADING_RECEIVING = "Receive stock";
export const PAGE_HEADING_SUPPLIERS = "Suppliers";
export const PAGE_HEADING_PROFILE = "Profile";

// App/brand name shown on every auth screen and the app chrome.
export const APP_NAME = "Tindahan POS";

// Shared form field labels — reused across Login/Register/Staff/etc.
export const LABEL_EMAIL_ADDRESS = "Email address";
export const LABEL_PASSWORD = "Password";

// Shared password-visibility toggle aria-label — Login/Register both
// have a show/hide eye icon button on their password field.
export const ARIA_SHOW_PASSWORD = "Show password";
export const ARIA_HIDE_PASSWORD = "Hide password";

// Shared auth navigation link text — LABEL_LOG_IN doubles as the Login
// page's submit button text and Register's "already have an account?"
// link text, since both are literally the word "Log in".
export const LINK_BACK_TO_LOGIN = "Back to login";
export const LABEL_LOG_IN = "Log in";
export const LINK_REGISTER = "Register";
export const LINK_FORGOT_PASSWORD = "Forgot password?";

// Login page
export const SEG_SIGN_IN = "Sign in";
export const SEG_CREATE_ACCOUNT = "Create account";
export const PAGE_HEADING_WELCOME_BACK = "Welcome back";
export const TEXT_LOGIN_SUBHEAD = "Sign in to open the register and see today's sales.";
export const BUTTON_CONTINUE_WITH_GOOGLE = "Continue with Google";
export const TEXT_OR = "OR";
export const BUTTON_SIGNING_IN = "Signing in…";
export const LABEL_KEEP_SIGNED_IN = "Keep me signed in on this device";
export const TEXT_NEW_TO_APP_PROMPT = "New to Tindahan POS?";
export const LINK_CREATE_AN_ACCOUNT = "Create an account";
export const TEXT_CONTACT_SUPPORT = "Contact support";

// Login page — preview pane (right side, sells the product to a
// first-time visitor and reassures a returning owner)
export const TEXT_LOGIN_PREVIEW_HEADLINE = "Run your tindahan from one screen.";
export const TEXT_LOGIN_PREVIEW_TAGLINE =
  "Ring up sales, track stock, and see exactly how the day went — without a single notebook.";
export const TEXT_LOGIN_PREVIEW_BULLET_1 = "Low-stock alerts before you run out";
export const TEXT_LOGIN_PREVIEW_BULLET_2 = "Daily sales report, ready to print or share";
export const TEXT_LOGIN_PREVIEW_BULLET_3 = "Staff accounts with their own permissions";
export const TEXT_LOGIN_PREVIEW_DASHBOARD_LABEL = "Admin dashboard";
export const TEXT_LOGIN_PREVIEW_LIVE = "Live";
export const TEXT_LOGIN_PREVIEW_RECENT_SALES = "Recent sales";

// Register page
export const PAGE_HEADING_REGISTER = "Create your store";
export const PAGE_HEADING_CHECK_YOUR_EMAIL = "Check your email";
export const TEXT_TAGLINE_FREE_FIRST_STORE = "Free for your first store";
export const TEXT_REGISTER_SUBHEAD = "Takes about a minute. No card needed.";
export const BUTTON_SIGNUP_WITH_GOOGLE = "Sign up with Google";
export const LABEL_STORE_NAME = "Store name";
export const LABEL_OWNER_NAME = "Your name";
export const HINT_EMAIL_RECEIPT = "We'll send your receipt template here.";
export const HINT_PASSWORD_MIN_LENGTH = "At least 8 characters.";
export const TEXT_PASSWORD_STRENGTH_WEAK = "Too weak";
export const TEXT_PASSWORD_STRENGTH_FAIR = "Fair";
export const TEXT_PASSWORD_STRENGTH_GOOD = "Strong";
export const TEXT_PASSWORD_STRENGTH_STRONG = "Very strong";
export const HINT_ADD_SYMBOL_TO_MAX_OUT = "add a symbol to max it out";
export const LABEL_AGREE_TO_TERMS_PREFIX = "I agree to the";
export const LINK_TERMS_OF_SERVICE = "Terms of Service";
export const TEXT_AND = "and";
export const LINK_PRIVACY_POLICY = "Privacy Policy";
export const BUTTON_CREATE_ACCOUNT = "Create account";
export const BUTTON_CREATING_ACCOUNT = "Creating account…";
export const TEXT_HAVE_ACCOUNT_PROMPT = "Already have a store?";
export const TEXT_CONFIRMATION_EMAIL_SENT_PREFIX = "We sent a confirmation link to";
export const TEXT_CONFIRMATION_EMAIL_SENT_SUFFIX =
  ". Open it to activate your store, then come back and log in.";

// Register page — preview pane (right side)
export const TEXT_REGISTER_PREVIEW_HEADLINE = "You're three steps from your first sale.";
export const TEXT_REGISTER_PREVIEW_TAGLINE = "Set up once, then just open the register each morning.";
export const TEXT_REGISTER_STEP_1_TITLE = "Create your account";
export const TEXT_REGISTER_STEP_1_SUB = "Store name and login";
export const TEXT_REGISTER_STEP_2_TITLE = "Add your products";
export const TEXT_REGISTER_STEP_2_SUB = "Type them in or import a list";
export const TEXT_REGISTER_STEP_3_TITLE = "Open the register";
export const TEXT_REGISTER_STEP_3_SUB = "Cash, GCash, or utang";
export const TEXT_REGISTER_PREVIEW_DAY_LABEL = "Your first day, typically";
export const TEXT_REGISTER_PREVIEW_LIVE_IN = "Live in ~15 min";
export const TEXT_REGISTER_CHECKLIST_LABEL = "Setup checklist";
export const TEXT_REGISTER_CHECKLIST_1 = "Store profile and currency";
export const TEXT_REGISTER_CHECKLIST_2 = "Import product list";
export const TEXT_REGISTER_CHECKLIST_3 = "Set low-stock thresholds";
export const TEXT_REGISTER_CHECKLIST_4 = "Invite your staff";
export const TEXT_REGISTER_CHECKLIST_PROGRESS = "2 of 4 done";

// Forgot password page
export const PAGE_HEADING_FORGOT_PASSWORD = "Reset your password";
export const BUTTON_SEND_RESET_LINK = "Send reset link";
export const BUTTON_SENDING = "Sending…";
export const TEXT_RESET_LINK_SENT_PREFIX = "If an account exists for";
export const TEXT_RESET_LINK_SENT_SUFFIX = ", a reset link has been sent.";

// Common short field labels/words repeated across most pages' forms and
// lists (Customers, Inventory, Profile, Staff, Suppliers, Receiving, Pos).
export const LABEL_NAME = "Name";
export const LABEL_ADDRESS = "Address";
export const LABEL_PHONE = "Phone";
export const LABEL_PRICE = "Price";
export const LABEL_CATEGORY = "Category";
export const LABEL_LOADING = "Loading…";
export const BUTTON_SAVE = "Save";
export const BUTTON_CANCEL = "Cancel";
export const BUTTON_REMOVE = "Remove";

// Staff page
export const TEXT_STAFF_DESCRIPTION = "Manage who can log in to this store.";
export const LABEL_ROSTER = "Roster";
export const LABEL_YOU_SUFFIX = "(you)";
export const BUTTON_REMOVING = "Removing…";
export const EMPTY_STATE_NO_STAFF = "No staff yet.";
export const LABEL_ADD_CASHIER = "Add a cashier";
export const TEXT_ADD_CASHIER_DESCRIPTION =
  "Creates a login for this store only — they'll be able to use POS but not view sales reports or manage inventory.";
export const LABEL_TEMPORARY_PASSWORD = "Temporary password";
export const BUTTON_CREATING = "Creating…";
export const BUTTON_CREATE_CASHIER_ACCOUNT = "Create cashier account";
export const ERROR_NAME_EMAIL_REQUIRED = "Name and email are required.";
export const ERROR_PASSWORD_MIN_LENGTH = "Password must be at least 8 characters.";
export const ERROR_COULD_NOT_CREATE_CASHIER = "Could not create cashier account.";
export const ERROR_COULD_NOT_REMOVE_STAFF = "Could not remove staff member.";

// Shared across Customers/Onboarding/Profile/Suppliers "add/edit name" forms.
export const ERROR_NAME_REQUIRED = "Name is required.";

// Profile page
export const TEXT_PROFILE_DESCRIPTION = "Your account information for this store.";
export const LABEL_PHOTO = "Photo";
export const BUTTON_PROCESSING = "Processing…";
export const BUTTON_CHOOSE_PHOTO = "Choose photo";
export const BUTTON_REMOVE_PHOTO = "Remove photo";
export const LABEL_PHONE_OPTIONAL = "Phone (optional)";
export const LABEL_EMAIL = "Email";
export const LABEL_ROLE = "Role";
export const TEXT_PROFILE_UPDATED = "Profile updated.";
export const BUTTON_SAVING = "Saving…";
export const BUTTON_SAVE_CHANGES = "Save changes";
export const LABEL_DANGER_ZONE = "Danger zone";
export const TEXT_DELETE_ACCOUNT_WARNING =
  "Permanently delete your account and login access. This cannot be undone.";
export const BUTTON_DELETE_MY_ACCOUNT = "Delete my account";
export const LABEL_DELETE_ACCOUNT_CONFIRM_HEADING = "Delete your account?";
export const TEXT_DELETE_ACCOUNT_MODAL_BODY =
  "This permanently deletes your login and profile. It cannot be undone. Sales and other records you created stay in the store's history, just no longer attributed to you by name.";
export const BUTTON_DELETING = "Deleting…";
export const ERROR_COULD_NOT_PROCESS_IMAGE = "Could not process that image.";
export const ERROR_COULD_NOT_SAVE_PROFILE = "Could not save profile.";

// Shared across Customers/Suppliers contact lists.
export const EMPTY_STATE_NO_PHONE = "No phone on file";

// Suppliers page
export const TEXT_SUPPLIERS_DESCRIPTION =
  "Manage suppliers and print a scannable code for quick selection during receiving.";
export const BUTTON_ADD_SUPPLIER = "Add supplier";
export const EMPTY_STATE_NO_SUPPLIERS = "No suppliers yet.";
export const LABEL_EDIT_SUPPLIER = "Edit supplier";
export const LABEL_ADDRESS_OPTIONAL = "Address (optional)";
export const BUTTON_EDIT = "Edit";
export const BUTTON_PRINT_CODE = "Print code";
export const TEXT_SUPPLIER_SCAN_HINT_PREFIX =
  "Print and keep on hand — scan it at Receiving to select";
export const TEXT_SUPPLIER_SCAN_HINT_SUFFIX = "instantly.";
export const TEXT_SELECT_SUPPLIER_PROMPT = "Select a supplier to view and print their scan code.";
export const TEXT_SUPPLIER_PRINT_HINT = "Scan this at Receiving to select this supplier.";
export const ERROR_COULD_NOT_SAVE_SUPPLIER = "Could not save supplier.";

// Customers page
export const TEXT_CUSTOMERS_DESCRIPTION = "Track utang (credit) balances and payments.";
export const LABEL_TOTAL_OUTSTANDING = "Total outstanding";
export const PLACEHOLDER_SEARCH_CUSTOMERS = "Search by name or phone";
export const BUTTON_ADD_CUSTOMER = "Add customer";
export const TEXT_NO_CUSTOMERS_MATCH_PREFIX = "No customers match";
export const EMPTY_STATE_NO_CUSTOMERS = "No customers yet.";
export const LABEL_CREDIT_LIMIT_OPTIONAL = "Credit limit (₱, optional)";
export const PLACEHOLDER_NO_LIMIT = "No limit";
export const HINT_CREDIT_LIMIT = "Shown as a reference at checkout — not enforced automatically.";
export const BUTTON_ADDING = "Adding…";
export const LABEL_CURRENT_BALANCE = "Current balance";
export const LABEL_CREDIT_LIMIT_PREFIX = "Credit limit:";
export const LABEL_RECORD_A_PAYMENT = "Record a payment";
export const PLACEHOLDER_NOTE_OPTIONAL = "Note (optional)";
export const BUTTON_RECORDING = "Recording…";
export const BUTTON_RECORD_PAYMENT = "Record payment";
export const LABEL_PAYMENT_HISTORY = "Payment history";
export const EMPTY_STATE_NO_PAYMENTS = "No payments recorded yet.";
export const TEXT_RECORDED_BY_PREFIX = "recorded by";
export const TEXT_SELECT_CUSTOMER_PROMPT = "Select a customer to view their balance and record a payment.";
export const ERROR_CREDIT_LIMIT_INVALID = "Credit limit must be a valid number.";
export const ERROR_COULD_NOT_ADD_CUSTOMER = "Could not add customer.";
export const ERROR_PAYMENT_AMOUNT_INVALID = "Enter a payment amount greater than zero.";
export const ERROR_COULD_NOT_RECORD_PAYMENT = "Could not record payment.";

// Dashboard page — several of these repeat 2-4 times within the page
// itself (a stat card's visible label and its download/print/share menu
// title are the same word, table headers reuse the same empty-state
// message, etc.), independent of any cross-page duplication.
export const TEXT_DASHBOARD_DESCRIPTION = "Today's snapshot for the store.";
export const TEXT_SHARE_NOT_SUPPORTED =
  "Sharing isn't supported on this device — the PDF was downloaded instead.";
export const ERROR_COULD_NOT_GENERATE_REPORT = "Could not generate the report.";
export const LABEL_DAILY_SALES_REPORT = "Daily sales report";
export const TEXT_DAILY_REPORT_DESCRIPTION =
  "Today's sales, low stock, best sellers, and recent transactions as a PDF. Prefer just one section? Use the icons on any card below instead.";
export const ARIA_DOWNLOAD_REPORT = "Download report as PDF";
export const LABEL_DOWNLOAD_PDF = "Download PDF";
export const ARIA_PRINT_REPORT = "Print report";
export const LABEL_PRINT = "Print";
export const ARIA_SHARE_REPORT = "Share report";
export const LABEL_SHARE = "Share";
export const LABEL_TODAYS_SALES = "Today's sales";
export const LABEL_TRANSACTIONS_TODAY = "Transactions today";
export const LABEL_LOW_STOCK = "Low stock";
export const LABEL_NEEDS_RESTOCKING = "Needs restocking";
export const LABEL_ALL_GOOD = "All good";
export const LABEL_TOTAL_PRODUCTS = "Total products";
export const LABEL_RECENT_SALES = "Recent sales";
export const TABLE_HEADER_DATE_TIME = "Date & time";
export const TABLE_HEADER_CASHIER = "Cashier";
export const TABLE_HEADER_ITEMS = "Items";
export const TABLE_HEADER_TOTAL = "Total";
export const EMPTY_STATE_NO_SALES = "No sales recorded yet.";
export const LABEL_LOW_STOCK_ALERTS = "Low stock alerts";
export const TABLE_HEADER_PRODUCT = "Product";
export const TABLE_HEADER_STOCK = "Stock";
export const TABLE_HEADER_THRESHOLD = "Threshold";
export const TABLE_HEADER_STATUS = "Status";
export const LABEL_STATUS_OUT_OF_STOCK = "Out of stock";
export const LABEL_STATUS_LOW_STOCK = "Low stock";
export const EMPTY_STATE_ALL_STOCKED = "All products are adequately stocked.";
export const TEXT_STOCK_LEFT_SUFFIX = "left";
export const LABEL_BEST_SELLERS = "Best sellers";
export const TABLE_HEADER_UNITS_SOLD = "Units sold";
export const TEXT_SOLD_SUFFIX = "sold";
export const EMPTY_STATE_NO_DATA = "No data yet.";
export const LABEL_SALES_BY_CATEGORY = "Sales by category";
export const LABEL_QUICK_ACTIONS = "Quick actions";
export const LINK_START_A_SALE = "Start a sale";
export const LINK_MANAGE_INVENTORY = "Manage inventory";
export const LINK_MANAGE_STAFF = "Manage staff";
export const LABEL_SUGGESTED_RESTOCK = "Suggested restock";
export const TEXT_SUGGESTED_RESTOCK_DESCRIPTION = "Based on how fast each product has been selling.";
export const TABLE_HEADER_SUGGESTED_QTY = "Suggested qty";
export const TEXT_DAYS_LEFT_SUFFIX = "days left";
export const TEXT_UNITS_PER_DAY_SUFFIX = "/day";
export const EMPTY_STATE_NO_RESTOCK_NEEDED = "Nothing needs restocking right now.";
export const LINK_RECEIVE = "Receive";

// Receiving page
export const TEXT_RECEIVING_DESCRIPTION_PREFIX = "Record new supply from a delivery.";
export const LINK_BACK_TO_INVENTORY = "Back to Inventory";
export const LINK_MANAGE_SUPPLIERS = "Manage suppliers";
export const LABEL_SUPPLIER_OPTIONAL = "Supplier (optional)";
export const PLACEHOLDER_SUPPLIER_NAME = "e.g. Mega Distribution";
export const ARIA_SCAN_SUPPLIER_CODE = "Scan supplier code";
export const ARIA_PICK_SAVED_SUPPLIER = "Pick a saved supplier";
export const LABEL_PICK_SAVED_SUPPLIER = "…or pick a saved supplier";
export const LABEL_DATE = "Date";
export const LABEL_ADD_A_PRODUCT = "Add a product";
export const PLACEHOLDER_SEARCH_BY_NAME = "Search by name…";
export const LABEL_SCAN_ITEM = "Scan item";
export const LABEL_STOCK_PREFIX = "Stock:";
export const TABLE_HEADER_QTY_RECEIVED = "Qty received";
export const TABLE_HEADER_COST_EACH = "Cost each";
export const TABLE_HEADER_NEW_STOCK = "New stock";
export const LABEL_TOTAL_COST = "Total cost";
export const BUTTON_SAVE_RECEIVING_ENTRY = "Save receiving entry";
export const LABEL_RECENT_RECEIVING_HISTORY = "Recent receiving history";
export const EMPTY_STATE_NO_RECEIVING_ENTRIES = "No receiving entries yet this session.";
export const ERROR_NO_SUPPLIER_MATCH = "No supplier matches that code. Add them under Suppliers first.";
export const ERROR_COULD_NOT_LOOKUP_SUPPLIER_CODE = "Could not look up that supplier code.";
export const ERROR_NO_PRODUCT_FOR_BARCODE_PREFIX = "No product found for barcode";
export const ERROR_QUANTITY_AT_LEAST_ONE_SUFFIX = "needs a quantity of at least 1.";
export const TEXT_SAVED_RECEIVING_PREFIX = "Saved —";
export const ERROR_COULD_NOT_SAVE_RECEIVING_ENTRY = "Could not save receiving entry.";

// Onboarding page
export const LABEL_STEP_YOUR_PROFILE = "Your profile";
export const LABEL_STEP_YOUR_STORE = "Your store";
export const TEXT_WELCOME_HEADING_PREFIX = "Welcome to";
export const TEXT_WELCOME_DESCRIPTION =
  "Let's get your account set up. It only takes a minute — we'll grab a few details about you and your store, then you're ready to start selling.";
export const BUTTON_LETS_GET_STARTED = "Let's get started";
export const LABEL_TELL_US_ABOUT_YOU = "Tell us about you";
export const TEXT_PROFILE_STEP_DESCRIPTION = "This shows up on your account and receipts.";
export const LABEL_YOUR_ADDRESS_OPTIONAL = "Your address (optional)";
export const PLACEHOLDER_ADDRESS = "House no., street, barangay, city";
export const BUTTON_NEXT_YOUR_STORE = "Next: Your store";
export const LABEL_TELL_US_ABOUT_YOUR_STORE = "Tell us about your store";
export const TEXT_STORE_STEP_DESCRIPTION =
  "This appears on the dashboard and any future customer-facing pages.";
export const LABEL_STORE_PHOTO = "Store photo";
export const LABEL_STORE_ADDRESS = "Store address";
export const LABEL_SAME_AS_MY_ADDRESS = "Same as my address";
export const BUTTON_BACK = "Back";
export const BUTTON_FINISH_SETUP = "Finish setup";
export const TEXT_CONGRATULATIONS_PREFIX = "Congratulations,";
export const TEXT_FALLBACK_THERE = "there";
export const TEXT_FALLBACK_YOUR_STORE = "Your store";
export const TEXT_STORE_READY_SUFFIX = "is all set up and ready to go.";
export const LABEL_PROFILE_SAVED = "Profile saved";
export const LABEL_STORE_DETAILS_SAVED = "Store details saved";
export const BUTTON_FINISHING = "Finishing…";
export const BUTTON_GO_TO_DASHBOARD = "Go to dashboard";
export const ERROR_STORE_NAME_REQUIRED = "Store name is required.";
export const ERROR_COULD_NOT_SAVE_YOUR_PROFILE = "Could not save your profile.";
export const ERROR_COULD_NOT_SAVE_YOUR_STORE = "Could not save your store.";

// POS page
export const TEXT_POS_DESCRIPTION = "Scan a barcode, search by name, or tap a quick item.";
export const LABEL_PRODUCTS_TAB = "Products";
export const LABEL_SERVICES_TAB = "Services";
export const LABEL_SHORTCUT_F2 = "Shortcut: F2";
export const LABEL_SHORTCUT_F3 = "Shortcut: F3";
export const LABEL_SCAN_BARCODE = "Scan barcode";
export const LABEL_SEARCH_BY_NAME_TAB = "Search by name";
export const LABEL_NO_BARCODE_QUICK_ITEMS = "No-barcode quick items";
export const PLACEHOLDER_SCAN_BARCODE = "Scan or type a barcode, then press Enter";
export const BUTTON_ADD = "Add";
export const ARIA_SCAN_WITH_CAMERA = "Scan with camera";
export const PLACEHOLDER_SEARCH_EXAMPLE = "e.g. sardines";
export const EMPTY_STATE_NO_QUICK_ITEMS = "No quick items in this category.";
export const LABEL_AMOUNT_PESO = "Amount (₱)";
export const LABEL_FEE_PESO = "Fee (₱)";
export const BUTTON_ADD_TO_CART = "Add to cart";
export const LABEL_CURRENT_SALE = "Current sale";
export const EMPTY_STATE_CART = "Cart is empty. Scan or search an item to begin.";
export const TEXT_EACH_SUFFIX = "each";
export const ARIA_DECREASE_QUANTITY_PREFIX = "Decrease quantity of";
export const ARIA_INCREASE_QUANTITY_PREFIX = "Increase quantity of";
export const ARIA_REMOVE_PREFIX = "Remove";
export const LABEL_SERVICE = "Service";
export const LABEL_PAYMENT_CASH = "Cash";
export const LABEL_PAYMENT_QR = "QR";
export const LABEL_PAYMENT_UTANG = "Utang";
export const LABEL_AMOUNT_TENDERED = "Amount tendered";
export const LABEL_CHANGE = "Change";
export const TEXT_QR_INSTRUCTIONS_PREFIX = "Let the customer scan the store's GCash/Maya QR code for";
export const TEXT_QR_INSTRUCTIONS_SUFFIX =
  ". Once you see the payment notification on your phone, enter its reference number below.";
export const LABEL_REFERENCE_TRANSACTION_NO = "Reference / transaction no.";
export const PLACEHOLDER_REFERENCE_NO = "e.g. 0123456789012";
export const TEXT_LIMIT_PREFIX = "· limit";
export const BUTTON_CHANGE = "Change";
export const TEXT_CREDIT_LIMIT_WARNING_MIDDLE = "over their";
export const TEXT_CREDIT_LIMIT_WARNING_SUFFIX = "credit limit — not blocked, just a heads up.";
export const LABEL_CHARGE_TO_CUSTOMER = "Charge to customer";
export const TEXT_ADD_AS_NEW_CUSTOMER_PREFIX = "+ Add";
export const TEXT_ADD_AS_NEW_CUSTOMER_SUFFIX = "as a new customer";
export const TEXT_SALE_RECORDED_PREFIX = "Sale recorded —";
export const TEXT_SALE_RECORDED_SUFFIX = ". Stock updated.";
export const TEXT_SERVICES_NOTICE =
  "Services are recorded with this sale for reporting. The GCash/load transfer itself still happens on the phone as usual.";
export const BUTTON_CANCEL_SALE = "Cancel sale";
export const BUTTON_COMPLETE_SALE = "Complete sale";
export const ERROR_PRODUCT_NOT_FOUND_BARCODE_PREFIX = "Product not found for barcode";
export const ERROR_COULD_NOT_COMPLETE_SALE = "Could not complete sale.";
export const SERVICE_LABEL_ELOAD = "E-Load";
export const SERVICE_LABEL_CASHIN = "Cash-in";
export const SERVICE_LABEL_CASHOUT = "Cash-out";
export const SERVICE_LABEL_PRINT = "Print / Photocopy";

// Inventory page
export const TEXT_PRODUCTS_TRACKED_SUFFIX = "products tracked.";
export const LABEL_VERSION_1_1 = "v1.1";
export const BUTTON_CATEGORIES = "Categories";
export const BUTTON_ADD_PRODUCT = "Add product";
export const TEXT_LOW_STOCK_ALERT_SUFFIX = "running low or out of stock —";
export const PLACEHOLDER_SEARCH_INVENTORY = "Search by name, category, or barcode";
export const LABEL_ALL_CATEGORIES = "All categories";
export const TABLE_HEADER_BARCODE = "Barcode";
export const TABLE_HEADER_ACTIONS = "Actions";
export const BUTTON_PLUS_10_STOCK = "+10 stock";
export const BUTTON_DELETE = "Delete";
export const TEXT_NO_PRODUCTS_MATCH_PREFIX = "No products match";
export const TEXT_SHOWING_PREFIX = "Showing";
export const TEXT_OF = "of";
export const BUTTON_PREVIOUS = "Previous";
export const BUTTON_NEXT = "Next";
export const TEXT_PAGE_PREFIX = "Page";
export const LABEL_EDIT_PRODUCT = "Edit product";
export const LABEL_BARCODE_OPTIONAL = "Barcode (optional — leave blank for tingi/repack items)";
export const TEXT_BARCODE_USED_BY_PREFIX = "This barcode is already used by";
export const LINK_OPEN_EXISTING_PRODUCT = "Open existing product";
export const TEXT_INSTEAD_SUFFIX = "instead.";
export const TEXT_SWITCH_TO_EDITING_PREFIX = "Switch to editing";
export const TEXT_SWITCH_TO_EDITING_SUFFIX =
  "? Anything you've typed here will be discarded.";
export const PLACEHOLDER_NEW_CATEGORY_NAME = "New category name";
export const LABEL_CHOOSE_CATEGORY = "Choose a category…";
export const LABEL_NEW_CATEGORY_OPTION = "+ New category…";
export const LABEL_PRICING = "Pricing";
export const LABEL_SELL_BY_PACK = "Sell by pack (e.g. 3 pcs for ₱5)";
export const LABEL_PACK_SIZE = "Pack size (pcs)";
export const LABEL_PACK_PRICE = "Pack price (₱)";
export const TEXT_PACK_PREVIEW_PREFIX = "≈";
export const TEXT_PER_PC_SUFFIX = "per pc";
export const LABEL_LOW_STOCK_AT = "Low-stock at";
export const ERROR_COULD_NOT_ADD_CATEGORY = "Could not add category.";
export const ERROR_PRODUCT_NAME_REQUIRED = "Product name is required.";
export const ERROR_STOCK_INVALID = "Stock must be a valid number.";
export const ERROR_CHOOSE_A_CATEGORY = "Choose a category.";
export const ERROR_BARCODE_ALREADY_USED_PREFIX = "That barcode is already used by";
export const ERROR_PACK_SIZE_INVALID = "Pack size must be a whole number of 2 or more.";
export const ERROR_PACK_PRICE_INVALID = "Pack price must be a valid number.";
export const ERROR_PRICE_INVALID = "Price must be a valid number.";
export const ERROR_COULD_NOT_SAVE_PRODUCT = "Could not save product.";
export const ERROR_COULD_NOT_RESTOCK_PRODUCT = "Could not restock product.";
export const ERROR_COULD_NOT_REMOVE_PRODUCT = "Could not remove product.";

// Shared chrome components (Sidebar, BottomNav, MobileHeader, ProtectedRoute, OnboardingRoute)
export const ARIA_MAIN_NAV = "Main";
export const ARIA_LOADING = "Loading";
export const LABEL_LOG_OUT = "Log out";
export const LABEL_MENU = "Menu";

// CardActionIcons (download/print/share icon row shared by StatCard/SectionCardHeader)
export const ARIA_DOWNLOAD_PREFIX = "Download";
export const ARIA_AS_PDF_SUFFIX = "as PDF";

// CategoryManager
export const LABEL_MANAGE_CATEGORIES = "Manage categories";
export const BUTTON_CLOSE = "Close";
export const ERROR_COULD_NOT_RENAME_CATEGORY = "Could not rename category.";
export const ERROR_COULD_NOT_DELETE_CATEGORY = "Could not delete category.";
export const BUTTON_RENAME = "Rename";
export const TITLE_REASSIGN_PRODUCTS_FIRST = "Reassign or remove its products first";
export const EMPTY_STATE_NO_CATEGORIES = "No categories yet.";

// ScannerLoadingOverlay
export const TEXT_LOADING_CAMERA = "Loading camera…";

// StockBadge
export const LABEL_STATUS_IN_STOCK = "In stock";

// Topbar
export const PLACEHOLDER_SEARCH_PRODUCTS_OR_CUSTOMERS = "Search products or customers…";
export const TEXT_NO_MATCHES_FOR_PREFIX = "No matches for";
export const TEXT_NO_PHONE = "No phone";

// BarcodeScanner
export const ARIA_CLOSE_SCANNER = "Close scanner";
export const TEXT_SCAN_HINT = "Point the camera at a barcode. It scans automatically.";
export const ERROR_CAMERA_DENIED =
  "Camera access was denied. Allow camera access for this site in your browser settings, or use manual entry below.";
export const ERROR_CAMERA_NOT_FOUND = "No camera was found on this device. Use manual entry below instead.";
export const ERROR_CAMERA_IN_USE =
  "The camera is already in use by another app or tab. Close it and try again, or use manual entry below.";
export const ERROR_CAMERA_GENERIC =
  "Could not access the camera. Check that you've allowed camera access for this site, or use manual entry below.";
