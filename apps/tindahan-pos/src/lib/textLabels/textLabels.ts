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
export const NAV_LABEL_REPORTS = "Reports";

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

// Shared auth navigation link text.
//
// LABEL_LOG_IN used to double as the Login page's submit button text. It does
// not any more -- that page was redesigned into Sign in / Create account tabs
// and its button renders SEG_SIGN_IN below. The e2e suite was still selecting
// on "Log in" because of this comment, and 34 of its 42 tests had been failing
// on it silently. Kept for Register's "already have an account?" link.
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
export const LABEL_CONFIRM_PASSWORD = "Confirm password";
export const ERROR_MUST_AGREE_TO_TERMS = "Please agree to the Terms of Service and Privacy Policy first.";
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
export const TEXT_STAFF_DESCRIPTION = "Who can log in, and what they did";
export const LABEL_YOU_SUFFIX = "(you)";
export const BUTTON_REMOVING = "Removing…";
export const EMPTY_STATE_NO_STAFF = "No staff yet.";
export const TEXT_ADD_CASHIER_DESCRIPTION = "Gives access to this store only";
export const BUTTON_CREATING = "Creating…";
export const BUTTON_CREATE_CASHIER_ACCOUNT = "Create account";
export const ERROR_NAME_EMAIL_REQUIRED = "Name and email are required.";
export const ERROR_PASSWORD_MIN_LENGTH = "Password must be at least 8 characters.";
export const ERROR_COULD_NOT_CREATE_CASHIER = "Could not create cashier account.";
export const ERROR_COULD_NOT_REMOVE_STAFF = "Could not remove staff member.";

// Staff page — Add staff modal v2: role, permissions, sign-in method, PIN, shift, drawer
export const LABEL_ROLE_CASHIER_TITLE = "Cashier";
export const TEXT_ROLE_CASHIER_DESC = "Sells only";
export const LABEL_ROLE_SUPERVISOR_TITLE = "Supervisor";
export const TEXT_ROLE_SUPERVISOR_DESC = "+ stock, voids";
export const LABEL_ROLE_OWNER_TITLE = "Owner";
export const TEXT_ROLE_OWNER_DESC = "Everything";
export const TEXT_A_ROLE_CAN_SUFFIX = "CAN";
export const LABEL_PERMISSION_RING_UP = "Ring up sales";
export const LABEL_PERMISSION_UTANG_WITHIN_LIMIT = "Utang within limit";
export const LABEL_PERMISSION_UTANG_UNCAPPED = "Utang, uncapped";
export const LABEL_PERMISSION_ELOAD_CASHIN_SHORT = "E-load, cash-in";
export const LABEL_PERMISSION_ADJUST_STOCK = "Adjust stock";
export const LABEL_PERMISSION_VOID_YOUR_PIN = "Voids · your PIN";
export const LABEL_PERMISSION_VOID_SALES = "Void sales";
export const LABEL_PERMISSION_NO_REPORTS = "No reports";
export const LABEL_PERMISSION_NO_PRICE_EDITS = "No price edits";
export const LABEL_PERMISSION_PRICE_EDITS_OWNER_PIN = "Price edits · owner PIN";
export const LABEL_PERMISSION_PRICE_EDITS = "Price edits";
export const LABEL_PERMISSION_VIEW_REPORTS_FULL = "View reports";
export const LABEL_SIGN_IN_METHOD = "How she signs in";
export const LABEL_SIGN_IN_PIN_TABLET = "PIN on this tablet";
export const TEXT_SIGN_IN_PIN_TABLET_DESC = "Fastest at the counter";
export const LABEL_SIGN_IN_PIN_EMAIL = "PIN + email";
export const TEXT_SIGN_IN_PIN_EMAIL_DESC = "Can also use own phone";
export const LABEL_HER_PIN = "HER PIN";
export const LINK_GENERATE_ANOTHER = "Generate another";
export const ARIA_COPY_PIN = "Copy PIN";
export const TEXT_PIN_COPIED = "Copied!";
export const HINT_PIN_SHOWN_ONCE = "Shown once. They change it on first sign-in.";
export const LABEL_USUAL_SHIFT = "Usual shift";
export const TEXT_OPTIONAL_LOWER = "optional";
export const LABEL_SHIFT_MORNING = "Morning · 7 AM–2 PM";
export const LABEL_SHIFT_AFTERNOON = "Afternoon";
export const LABEL_SHIFT_NONE = "No fixed";
export const LABEL_DRAWER_COUNTING_TITLE = "Count the drawer at shift start and end";
export const TEXT_DRAWER_COUNTING_DESC = "This is what catches a short till";

// Staff page — redesign: header, metrics, table, permissions, activity, shift history
export const BUTTON_SHIFT_HISTORY = "Shift history";
export const BUTTON_ADD_STAFF = "Add staff";
export const LABEL_ON_SHIFT_NOW = "ON SHIFT NOW";
export const LABEL_STAFF_ACCOUNTS = "STAFF ACCOUNTS";
export const LABEL_DRAWER_VARIANCE = "DRAWER VARIANCE";
export const LABEL_VOIDS_THIS_WEEK = "VOIDS THIS WEEK";
export const TEXT_THIS_WEEK_SUFFIX = "this week";
export const TEXT_NO_ONE_ON_SHIFT = "No one on shift";
export const COLUMN_PERSON = "PERSON";
export const COLUMN_ROLE = "ROLE";
export const COLUMN_SALES_TODAY = "SALES TODAY";
export const COLUMN_STATUS = "STATUS";
export const LABEL_EMAIL_LOGIN = "Email login";
export const TEXT_LAST_ACTIVE_PREFIX = "Last active";
export const TEXT_NO_RECENT_ACTIVITY = "No recent activity";
export const LABEL_ROLE_ADMIN = "Admin";
export const LABEL_ROLE_CASHIER = "Cashier";
export const ARIA_STAFF_ACTIONS = "More actions";
export const BUTTON_EDIT_NAME = "Edit name";
export const BUTTON_RESET_PASSWORD = "Reset password";
export const BUTTON_DEACTIVATE = "Deactivate";
export const BUTTON_ACTIVATE = "Activate";
export const BUTTON_MAKE_SUPERVISOR = "Make supervisor";
export const BUTTON_MAKE_CASHIER = "Make plain cashier";
export const ERROR_COULD_NOT_CHANGE_ROLE = "Could not change this staff member's role.";
export const HEADING_CASHIER_PERMISSIONS = "What a cashier can do";
export const LINK_EDIT_ROLE = "Edit role";
export const HEADING_EDIT_ROLE = "Edit role";
export const LABEL_CASHIER_EDIT_PRICES_TITLE = "Cashiers can edit prices";
export const TEXT_CASHIER_EDIT_PRICES_DESC = "Lets a cashier change a product's price in Inventory. They still can't change anything else about it — name, stock, and category stay admin-only.";
export const ERROR_COULD_NOT_SAVE_ROLE = "Could not save this setting.";
export const LABEL_PERMISSION_RING_UP_SALES = "Ring up sales";
export const LABEL_PERMISSION_SELL_ON_UTANG = "Sell on utang";
export const LABEL_PERMISSION_ELOAD_CASHIN = "E-load and cash-in";
export const LABEL_PERMISSION_CASH_OUT = "Cash-out over ₱1,000";
export const LABEL_PERMISSION_VOID_SALE = "Void a completed sale";
export const LABEL_PERMISSION_CHANGE_PRICES = "Change prices";
export const LABEL_PERMISSION_VIEW_REPORTS = "See sales reports";
export const TEXT_NEEDS_PIN = "Needs PIN (planned)";
export const HEADING_ACTIVITY_LOG = "Worth a look";
export const LINK_FULL_LOG = "Full log";
export const EMPTY_STATE_NO_ACTIVITY_YET = "No activity yet.";
export const HEADING_SHIFT_HISTORY = "Shift history";
export const COLUMN_SHIFT_DATE = "Date";
export const COLUMN_CASHIER = "Cashier";
export const COLUMN_OPENING_CASH = "Opening";
export const COLUMN_CLOSING_CASH = "Closing";
export const COLUMN_VARIANCE = "Variance";
export const COLUMN_SALES = "Sales";
export const COLUMN_TRANSACTIONS = "Transactions";
export const HEADING_VOIDS_THIS_WEEK = "Voids this week";
export const COLUMN_RECEIPT = "Receipt";
export const COLUMN_AMOUNT = "Amount";
export const COLUMN_REASON = "Reason";
export const EMPTY_STATE_NO_VOIDS_THIS_WEEK = "No voided sales this week.";
export const HEADING_ON_SHIFT_NOW = "On shift now";
export const EMPTY_STATE_NO_ONE_ON_SHIFT = "No staff currently on shift.";
export const LABEL_SINCE_PREFIX = "Since";
export const COLUMN_EXPECTED = "Expected";
export const COLUMN_ACTUAL = "Actual";
export const HEADING_DRAWER_VARIANCE = "Drawer variance this week";
export const EMPTY_STATE_NO_VARIANCE_THIS_WEEK = "No drawer variance recorded this week.";
export const TEXT_VARIANCE_SCOPE_NOTE =
  "Expected cash is opening float plus cash sales during the shift. E-load cash-in/cash-out isn't reconciled yet.";
export const EMPTY_STATE_NO_SHIFT_HISTORY = "No shifts recorded yet.";
export const TEXT_SHIFT_IN_PROGRESS = "In progress";
export const TEXT_SHIFT_COMPLETED = "Completed";
export const TEXT_SHIFT_NO_COUNT = "No count taken";
export const TEXT_EDIT_STAFF_NAME_PROMPT = "Full name";
export const TEXT_RESET_PASSWORD_SENT_PREFIX = "Password reset email sent to";
export const ERROR_COULD_NOT_UPDATE_STAFF = "Could not update staff member.";
export const ERROR_COULD_NOT_SEND_RESET = "Could not send password reset email.";

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
export const LABEL_DELETE_ACCOUNT_REQUEST_SUBMITTED_HEADING = "Request submitted";
export const BUTTON_OK = "OK";
export const ERROR_COULD_NOT_PROCESS_IMAGE = "Could not process that image.";
export const ERROR_COULD_NOT_SAVE_PROFILE = "Could not save profile.";

// Shared across Customers/Suppliers contact lists.
export const EMPTY_STATE_NO_PHONE = "No phone on file";

// Suppliers page
export const TEXT_SUPPLIERS_DESCRIPTION = "Who you buy from, what they bring, and what you owe them";
export const BUTTON_ADD_SUPPLIER = "Add supplier";
export const EMPTY_STATE_NO_SUPPLIERS = "No suppliers yet";
export const TEXT_EMPTY_SUPPLIERS_HINT =
  "Add your first supplier so you can track deliveries, costs, and what you owe.";
export const LABEL_EDIT_SUPPLIER = "Edit supplier";
export const LABEL_ADDRESS_OPTIONAL = "Address (optional)";
export const BUTTON_EDIT = "Edit";
export const BUTTON_PRINT_CODE = "Print code";
export const BUTTON_PRINT = "Print";
export const TEXT_SUPPLIER_SCAN_HINT_PREFIX =
  "Print and keep on hand — scan it at Receiving to select";
export const TEXT_SUPPLIER_SCAN_HINT_SUFFIX = "instantly.";
export const TEXT_SELECT_SUPPLIER_PROMPT = "Select a supplier to view and print their scan code.";
export const TEXT_SUPPLIER_PRINT_HINT = "Scan this at Receiving to select this supplier.";
export const ERROR_COULD_NOT_SAVE_SUPPLIER = "Could not save supplier.";

// Suppliers page — header actions
export const BUTTON_PRINT_SCAN_SHEET = "Print scan sheet";

// Suppliers page — metrics
export const LABEL_SPENT_THIS_MONTH = "SPENT THIS MONTH";
export const TEXT_ACROSS_SUPPLIERS_SUFFIX = "suppliers";
export const LABEL_DELIVERIES = "DELIVERIES";
export const TEXT_AVERAGE_SUFFIX = "average";
export const LABEL_UNPAID_ON_TERMS = "UNPAID ON TERMS";
export const TEXT_DUE_PREFIX = "due";
export const LABEL_NEXT_EXPECTED = "NEXT EXPECTED";
export const TEXT_NO_UPCOMING_DELIVERY = "No upcoming delivery";
export const TEXT_NOTHING_OWED = "Nothing owed";

// Suppliers page — search/filter/sort
export const PLACEHOLDER_SEARCH_SUPPLIER = "Search supplier or contact";
export const FILTER_OWING_PREFIX = "Owing";
export const SORT_MOST_SPENT = "Most spent";
export const SORT_RECENTLY_DELIVERED = "Recently delivered";
export const SORT_NAME = "Supplier name";

// Suppliers page — table
export const TABLE_HEADER_SUPPLIER = "SUPPLIER";
export const TABLE_HEADER_WHAT_THEY_BRING = "WHAT THEY BRING";
export const TABLE_HEADER_LAST_DELIVERY = "LAST DELIVERY";
export const TABLE_HEADER_SPEND_30D = "SPEND 30D";
export const TABLE_HEADER_TERMS = "TERMS";
export const CHIP_TERMS_CASH = "Cash";
export const CHIP_TERMS_7_DAYS = "7 days";
export const CHIP_TERMS_15_DAYS = "15 days";
export const BUTTON_RECEIVE = "Receive";
export const MENUITEM_MARK_AS_PAID = "Mark as paid";
export const MENUITEM_DEACTIVATE = "Deactivate";
export const TEXT_NEVER_DELIVERED = "No deliveries yet";
export const ERROR_COULD_NOT_MARK_PAID = "Could not mark this supplier's deliveries as paid.";
export const ERROR_COULD_NOT_DEACTIVATE_SUPPLIER = "Could not deactivate supplier.";

// Suppliers page — print scan sheet card
export const TITLE_PRINT_SCAN_SHEET = "Print one sheet, tape it by the door";
export const TEXT_PRINT_SCAN_SHEET_BODY =
  "Every supplier gets a scannable code. When a delivery arrives, scan the code instead of picking from a dropdown — the receiving form opens with that supplier already filled in.";
export const BUTTON_PRINT_ALL_CODES_PREFIX = "Print all";
export const BUTTON_PREVIEW = "Preview";

// Suppliers page — cost changes worth knowing
export const TITLE_COST_CHANGES_WORTH_KNOWING = "Cost changes worth knowing";
export const LINK_SEE_ALL = "See all";
export const TEXT_YESTERDAY_SUFFIX = "yesterday";
export const TEXT_MARGIN_PREFIX = "margin";
export const TEXT_NO_RECENT_COST_CHANGES = "No cost changes worth flagging in the last 30 days.";

// Add Supplier modal
export const LABEL_BUSINESS_NAME = "Business name";
export const LABEL_CONTACT_PERSON_OPTIONAL = "Who you deal with · optional";
export const HINT_MOBILE_LOW_STOCK_SHORTCUT = "Used for the \"order more\" shortcut on low-stock items.";
export const PLACEHOLDER_ADDRESS_SUPPLIER = "Warehouse or market stall";
export const LABEL_WHAT_DO_THEY_BRING = "What do they bring?";
export const HINT_CATEGORIES_SUPPLIED =
  "Tick the categories. Receiving then shows their products first, so you are not scrolling past a long list to find a few.";
export const LABEL_USUAL_DELIVERY_DAYS = "Usual delivery days";
export const HINT_DELIVERY_DAYS = "Drives the \"next expected delivery\" reminder.";
export const LABEL_HOW_YOU_PAY_THEM = "How you pay them";
export const HINT_PAYMENT_TERMS = "Cash means paid on delivery. Terms show up as money you owe.";
export const TITLE_SCAN_CODE_AUTO = "A scan code is created automatically";
export const TEXT_SCAN_CODE_HINT =
  "Print it and stick it where deliveries arrive. Scanning opens the receiving form with this supplier already selected.";
export const BUTTON_SAVE_AND_ADD_ANOTHER = "Save and add another";
export const TEXT_SUPPLIER_ALREADY_EXISTS_PREFIX = "Looks like you already have";
export const DAY_MON = "Mon";
export const DAY_TUE = "Tue";
export const DAY_WED = "Wed";
export const DAY_THU = "Thu";
export const DAY_FRI = "Fri";
export const DAY_SAT = "Sat";
export const DAY_SUN = "Sun";

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

// Customers page — filters, table, debt aging, recent payments
export const COLUMN_CUSTOMER = "CUSTOMER";
export const COLUMN_BALANCE = "BALANCE";
export const COLUMN_CREDIT_USED = "CREDIT USED";
export const BUTTON_COLLECT = "Collect";
export const BUTTON_VIEW = "View";
export const FILTER_OVERDUE_PREFIX = "Overdue";
export const FILTER_HAS_UTANG = "Has utang";
export const BUTTON_SORT_OLDEST_DEBT = "Oldest debt";
export const TEXT_OLDEST_DEBT_PREFIX = "oldest";
export const TEXT_DAYS_SUFFIX = "days";
export const TEXT_PAID_IN_FULL = "paid in full";
export const TEXT_OF_INFIX = "of";
export const TEXT_OVER_LIMIT_SUFFIX = "over";
export const LABEL_NO_CREDIT_LIMIT_SET = "No limit set";
export const HEADING_DEBT_AGING = "How old the utang is";
export const TEXT_AGING_SUMMARY_SUFFIX =
  "of your utang is older than a month. That is working capital sitting on the shelf.";
export const HEADING_RECENT_PAYMENTS = "Recent payments";
export const LINK_VIEW_ALL = "View all";
export const EMPTY_STATE_NO_RECENT_PAYMENTS = "No recent payments.";

// Customers page — Add customer modal
export const LABEL_ADD_CUSTOMER_SUBTITLE = "For utang tracking and reminders";
export const ARIA_CLOSE_MODAL = "Close";
export const LABEL_NICKNAME = "What you call them";
export const TEXT_NICKNAME_SUFFIX = "shown at checkout";
export const HINT_MOBILE_NUMBER_REQUIRED = "Without this you can't send a payment reminder. Skip only if they have no phone.";
export const LABEL_CREDIT_LIMIT = "Credit limit";
export const HINT_CREDIT_LIMIT_AVERAGE = "New customers average ₱500. You can raise it once they pay on time.";
export const BUTTON_CREDIT_LIMIT_OTHER = "Other";
export const LABEL_BLOCK_CREDIT_TITLE = "Block utang past the limit";
export const LABEL_BLOCK_CREDIT_SUBTITLE = "Cashier needs your PIN to override";
export const LABEL_PAYMENT_SCHEDULE = "Usually pays";
export const SCHEDULE_BIWEEKLY = "Every 15th & 30th";
export const SCHEDULE_WEEKLY = "Weekly";
export const SCHEDULE_NONE = "No pattern";
export const LABEL_OPENING_BALANCE = "Opening balance";
export const TEXT_OPTIONAL_SUFFIX = "optional";
export const HINT_OPENING_BALANCE = "Moving from a notebook? Enter what they already owe.";
export const ERROR_OPENING_BALANCE_INVALID = "Opening balance must be zero or greater.";
export const TEXT_DUPLICATE_CUSTOMER_PREFIX = "You already have a customer named";
export const TEXT_DUPLICATE_CUSTOMER_SUFFIX = "outstanding.";
export const TEXT_DUPLICATE_CUSTOMER_WARNING = "Adding a second record splits their balance in two.";
export const LINK_OPEN = "Open";

// Dashboard page
export const TEXT_DASHBOARD_DESCRIPTION = "Today's snapshot for the store.";
export const TEXT_SHARE_NOT_SUPPORTED =
  "Sharing isn't supported on this device — the PDF was downloaded instead.";
export const ERROR_COULD_NOT_GENERATE_REPORT = "Could not generate the report.";
export const TEXT_GREETING_MORNING = "Good morning,";
export const TEXT_GREETING_AFTERNOON = "Good afternoon,";
export const TEXT_GREETING_EVENING = "Good evening,";
export const TEXT_SALES_SO_FAR_SUFFIX = "sales so far";
export const LABEL_PERIOD_TODAY = "Today";
export const BUTTON_EXPORT_EXCEL = "Export to Excel";
export const ARIA_EXPORT_EXCEL = "Export dashboard report as Excel";
export const ARIA_DASHBOARD_DATE = "Reporting date";
export const LABEL_TODAYS_SALES = "Today's sales";
export const TEXT_VS_YESTERDAY_SUFFIX = "vs yesterday";

// Dashboard — clickable report modals
export const LABEL_ITEMS_SOLD = "Items sold";
export const LABEL_AVERAGE_BASKET = "Average basket";
export const LABEL_OUT_OF_STOCK = "Out of stock";
export const LABEL_EST_COST_TO_REFILL = "Est. cost to refill";
export const LABEL_CUSTOMERS_OWING = "Customers owing";
export const TABLE_HEADER_REFERENCE = "Reference";
export const TABLE_HEADER_DATE_TIME = "Date & time";
export const TABLE_HEADER_CASHIER = "Cashier";
export const TABLE_HEADER_CUSTOMER = "Customer";
export const TABLE_HEADER_ITEM = "Item";
export const TABLE_HEADER_QTY = "Qty";
export const TABLE_HEADER_PRICE = "Price";
export const TABLE_HEADER_SUBTOTAL = "Subtotal";
export const TABLE_HEADER_CATEGORY = "Category";
export const TABLE_HEADER_MIN_STOCK = "Min";
export const TABLE_HEADER_SUGGESTED_QTY = "Suggested qty";
export const TABLE_HEADER_RANK = "Rank";
export const TABLE_HEADER_REVENUE = "Revenue";
export const TABLE_HEADER_PHONE = "Phone";
export const TABLE_HEADER_BALANCE = "Balance";
export const TABLE_HEADER_LATEST_TRANSACTION = "Latest transaction";
export const EMPTY_STATE_NO_SALES_FOR_DATE = "No sales recorded for this date.";
export const EMPTY_STATE_NO_LOW_STOCK = "No low-stock products found.";
export const EMPTY_STATE_NO_OUTSTANDING_UTANG = "No outstanding utang.";
export const EMPTY_STATE_NO_RECENT_SALES = "No recent sales found.";
export const EMPTY_STATE_NO_RESTOCKING_NEEDED = "No products require restocking.";
export const LABEL_STATUS_CURRENT = "Current";

// Reports page
export const PAGE_HEADING_REPORTS = "Reports";
export const TEXT_REPORTS_DESCRIPTION = "Sales by date range and by cashier";
export const LABEL_PERIOD_WEEK = "This week";
export const LABEL_PERIOD_MONTH = "This month";
export const LABEL_PERIOD_CUSTOM = "Custom";
export const LABEL_ALL_CASHIERS = "All cashiers";
export const LABEL_ALL_DEVICES = "All devices";
export const LABEL_TOTAL_SALES = "Total sales";
export const LABEL_TRANSACTIONS = "Transactions";
export const LABEL_AVERAGE_SALE = "Average sale";
export const LABEL_CASHIER_BREAKDOWN = "By cashier";
export const LABEL_VOID_SUMMARY = "Voids & cancellations";
export const LABEL_VOIDED_COUNT = "Voided sales";
export const LABEL_VOIDED_TOTAL = "Total voided amount";
export const LABEL_PAYMENT_BREAKDOWN = "By payment method";
export const COLUMN_PAYMENT_TYPE = "Payment type";
export const TEXT_NO_VOIDS_IN_RANGE = "No voided sales in this period.";
export const BUTTON_EXPORT_VAT_CSV = "Export VAT report";
export const BUTTON_EXPORT_VOIDS_CSV = "Export voids report";
export const BUTTON_EXPORT_PAYMENT_CSV = "Export breakdown";
export const LABEL_Z_READING = "End-of-day (Z-reading)";
export const LABEL_BUSINESS_DATE = "Business date";
export const LABEL_BEGINNING_RECEIPT_NO = "Beginning receipt no.";
export const LABEL_ENDING_RECEIPT_NO = "Ending receipt no.";
export const LABEL_TOTAL_DISCOUNTS = "Total discounts";
export const BUTTON_PRINT_Z_READING = "Print Z-reading";
export const LABEL_RECONCILIATION_CHECK = "Reconciliation check";
export const TEXT_RECONCILIATION_MATCH = "Matches an independent server-side total.";
export const TEXT_RECONCILIATION_MISMATCH = "Does not match the server-side total — figures may be out of date. Refresh and check again.";
export const TEXT_Z_READING_EMPTY = "No sales recorded for this business date.";
export const LABEL_SALES_LIST = "Sales";
export const BUTTON_EXPORT_CSV = "Export CSV";
export const TEXT_NO_SALES_IN_RANGE = "No sales in this period.";
export const COLUMN_TOTAL = "Total";
export const COLUMN_DATE = "Date";
export const COLUMN_ITEMS = "Items";
export const COLUMN_PAYMENT = "Payment";
export const LABEL_STATUS_VOIDED = "Voided";
export const BUTTON_VOID_SALE = "Void";
export const BUTTON_REPRINT_RECEIPT = "Reprint";
export const TEXT_REPRINT_MARKER = "*** REPRINT ***";
export const TEXT_VOIDED_MARKER = "*** VOIDED — NOT VALID ***";
export const TEXT_VOID_SALE_TITLE = "Void this sale?";
export const TEXT_VOID_SALE_BODY_PREFIX =
  "This restores the product stock and, for a credit sale, reverses the customer's utang balance. The receipt/invoice number is not reissued to another sale. This cannot be undone.";
export const LABEL_VOID_REASON = "Reason for voiding";
export const PLACEHOLDER_VOID_REASON = "e.g. Incorrect quantity entered";
export const TEXT_VOID_REASON_PREFIX = "Reason:";
export const TEXT_VOIDED_BY_PREFIX = "Voided by";
export const ERROR_COULD_NOT_VOID_SALE = "Could not void this sale.";
export const BUTTON_REFUND_SALE = "Refund";
export const TEXT_REFUND_SALE_TITLE = "Refund or return items";
export const TEXT_REFUND_SALE_BODY_PREFIX =
  "Restores stock for the quantity returned and, for a credit sale, reduces the customer's utang balance by the refunded amount. The original sale is never changed.";
export const LABEL_REFUND_REASON = "Reason for the refund";
export const PLACEHOLDER_REFUND_REASON = "e.g. Customer returned 1 unit, wrong size";
export const LABEL_QUANTITY_SOLD_PREFIX = "Sold";
export const LABEL_QUANTITY_ALREADY_REFUNDED_PREFIX = "Already refunded";
export const LABEL_QUANTITY_TO_REFUND = "Qty to refund";
export const BUTTON_SUBMIT_REFUND = "Refund";
export const ERROR_COULD_NOT_REFUND_SALE = "Could not refund this sale.";
export const TEXT_NO_ITEMS_TO_REFUND = "Select at least one item to refund.";
export const TEXT_NOTHING_LEFT_TO_REFUND = "Everything on this sale has already been refunded.";
export const BUTTON_ADD_DISCOUNT = "Add discount";
export const LABEL_SUBTOTAL = "Subtotal";
export const LABEL_DISCOUNT = "Discount";
export const LABEL_DISCOUNT_TYPE = "Discount type";
export const LABEL_DISCOUNT_VALUE = "Discount value";
export const LABEL_DISCOUNT_TYPE_FLAT = "Flat amount";
export const LABEL_DISCOUNT_TYPE_PERCENTAGE = "Percentage";
export const ERROR_INVALID_DISCOUNT_VALUE = "Enter a valid discount amount.";
export const LABEL_VAT_SUMMARY = "VAT summary";
export const LABEL_VATABLE_SALES = "VATable sales";
export const LABEL_VAT_AMOUNT = "VAT amount";
export const LABEL_VAT_EXEMPT_SALES = "VAT-exempt sales";
export const LABEL_ZERO_RATED_SALES = "Zero-rated sales";
export const TEXT_NOT_VAT_REGISTERED = "This invoice is NOT VAT Registered.";
export const LABEL_TRANSACTIONS_TODAY = "Transactions today";
export const TEXT_AVERAGE_BASKET_SUFFIX = "average basket";
export const LABEL_LOW_STOCK = "Low stock";
export const LABEL_NEEDS_RESTOCKING = "Needs restocking";
export const LABEL_RESTOCK_TODAY = "Restock today";
export const LABEL_ALL_GOOD = "All good";
export const LABEL_UTANG_OUTSTANDING = "Utang outstanding";
export const LABEL_RECENT_SALES = "Recent sales";
export const TABLE_HEADER_TOTAL = "Total";
export const EMPTY_STATE_NO_SALES = "No sales recorded yet.";
export const TABLE_HEADER_PRODUCT = "Product";
export const TABLE_HEADER_STOCK = "Stock";
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
export const LABEL_DR_NUMBER_OPTIONAL = "DR number (optional)";
export const PLACEHOLDER_DR_NUMBER = "e.g. DR-10234";
export const TEXT_WAS_PREFIX = "was";
export const TEXT_SAME_AS_LAST_DELIVERY = "same as last delivery";
export const CHIP_COST_UP = "cost up";
export const CHIP_COST_DOWN = "cost down";
export const CHIP_NO_CHANGE = "no change";
export const TITLE_COST_PRICES_CHANGED = "Cost prices changed";
export const TITLE_COST_PRICE_CHANGED = "A cost price changed";
export const BUTTON_RAISE_SELLING_PRICE = "Raise selling price";
export const BUTTON_KEEP_PRICE_PREFIX = "Keep ₱";
export const TEXT_LOW_OR_OUT_SUFFIX = "products are low or out right now";
export const TEXT_PRODUCT_LOW_OR_OUT_SUFFIX = "product is low or out right now";
export const TEXT_ADD_ALL_SUGGESTED_HINT = "Add them all with the suggested quantities instead of searching one by one.";
export const BUTTON_ADD_ALL_PREFIX = "Add all";
export const ERROR_COULD_NOT_UPDATE_PRICE = "Could not update the selling price.";

// Onboarding page
export const LABEL_YOUR_ADDRESS_OPTIONAL = "Your address (optional)";
export const PLACEHOLDER_ADDRESS = "House no., street, barangay, city";
export const LABEL_STORE_ADDRESS = "Store address";
export const TEXT_FALLBACK_THERE = "there";
export const ERROR_STORE_NAME_REQUIRED = "Store name is required.";
export const ERROR_COULD_NOT_SAVE_YOUR_PROFILE = "Could not save your profile.";

// Onboarding — wizard shell sidebar
export const TEXT_SETTING_UP = "Setting up";
export const LABEL_STEP_STORE_PROFILE = "Store profile";
export const TEXT_STEP_STORE_PROFILE_DESC = "Name, hours, currency";
export const LABEL_STEP_ADD_PRODUCTS = "Add products";
export const TEXT_STEP_ADD_PRODUCTS_DESC = "Type or import";
export const LABEL_STEP_STOCK_ALERTS = "Set stock alerts";
export const TEXT_STEP_STOCK_ALERTS_DESC = "When to reorder";
export const LABEL_STEP_OPEN_REGISTER = "Open the register";
export const TEXT_STEP_OPEN_REGISTER_DESC = "Count your float";
export const TEXT_MINUTES_LEFT_SUFFIX = "minutes left";
export const TEXT_ABOUT_PREFIX = "About";
export const TEXT_ALMOST_DONE = "Almost done";

// Onboarding — Add Products step
export const LABEL_WHAT_DO_YOU_SELL = "What do you sell?";
export const TEXT_PRODUCTS_STEP_DESCRIPTION = "Pick the fastest way in. You can add the rest later.";
export const LABEL_STARTER_CATALOG_HEADING = "Start from a sari-sari starter list";
export const LABEL_FASTEST_BADGE = "Fastest";
export const TEXT_STARTER_CATALOG_DESCRIPTION =
  "Common items with typical prices already filled in. Untick what you don't carry.";
export const BUTTON_ADD_N_ITEMS_PREFIX = "Add";
export const TEXT_ITEMS_SUFFIX = "items";
export const TEXT_YOU_SET_OWN_PRICES_NEXT = "You'll set your own prices next.";
export const LABEL_SCAN_SHELF_TITLE = "Scan what's on the shelf";
export const TEXT_SCAN_SHELF_DESC = "Point the camera at the barcode, then fill in the name and price";
export const LABEL_IMPORT_SPREADSHEET_TITLE = "Import a spreadsheet";
export const TEXT_IMPORT_SPREADSHEET_DESC = "CSV for now · Excel coming soon";
export const LABEL_TYPE_THEM_IN_TITLE = "Type them in";
export const TEXT_TYPE_THEM_IN_DESC = "Fine for 20 items or fewer";
export const LABEL_ADDED_SO_FAR = "Added so far";
export const TEXT_PRODUCTS_SUFFIX = "products";
export const TEXT_MORE_SUFFIX_PREFIX = "+";
export const TEXT_MORE_SUFFIX = "more";
export const BUTTON_CONTINUE = "Continue";
export const BUTTON_SKIP_FOR_NOW = "Skip for now";
export const TEXT_SAVED_AUTOMATICALLY = "Saved automatically";
export const ERROR_CSV_EMPTY = "That file doesn't have any product rows.";
export const ERROR_CSV_MISSING_COLUMNS = "The file needs at least a name and a price column.";
export const ERROR_EXCEL_NOT_SUPPORTED_YET =
  "Excel import isn't available yet — save the file as CSV and try again.";
export const ERROR_COULD_NOT_IMPORT_FILE = "Could not read that file.";
export const LABEL_QUICK_ADD_PRODUCT = "Add a product";
export const BUTTON_DONE = "Done";
export const ERROR_INVALID_PRICE = "Enter a valid price.";
export const ERROR_COULD_NOT_ADD_PRODUCT = "Could not add that product.";
export const ERROR_COULD_NOT_IMPORT_STARTER_CATALOG = "Could not import the starter catalog.";

// Onboarding — Stock Alerts step
export const LABEL_WHEN_SHOULD_WE_WARN_YOU = "When should we warn you?";
export const TEXT_STOCK_ALERTS_STEP_DESCRIPTION = "One rule now, fine-tune per product later.";
export const LABEL_BY_DAYS_OF_COVER = "By days of cover";
export const LABEL_BETTER_BADGE = "Better";
export const TEXT_BY_DAYS_OF_COVER_DESC =
  "Warn when stock will run out within a set number of days, based on how fast it actually sells.";
export const LABEL_BY_FIXED_QUANTITY = "By fixed quantity";
export const TEXT_BY_FIXED_QUANTITY_DESC = "Warn at a set number of pieces, the same for everything.";
export const LABEL_WARN_ME_WHEN_LESS_THAN = "Warn me when less than";
export const TEXT_OF_STOCK_LEFT_SUFFIX = "of stock left";
export const TEXT_ONE_DAY_RISKY = "1 day · risky";
export const TEXT_SEVEN_DAYS_LOTS_OF_CAPITAL = "7 days · lots of capital tied up";
export const TEXT_TODAY_YOU_WOULD_BE_WARNED_ABOUT_PREFIX = "With that rule, today you'd be warned about";
export const TEXT_SLIDE_LEFT_HINT = "Sounds about right? Slide left if that feels like too many.";
export const TEXT_OUT_NOW = "out now";
export const TEXT_DAY_SUFFIX = "day";
export const LABEL_FAST_MOVERS_TITLE = "Fast movers get a longer warning";
export const TEXT_FAST_MOVERS_DESC = "Anything selling 10+ a day warns at 5 days instead";
export const LABEL_DAILY_SUMMARY_TITLE = "Send the list every morning at 7 AM";
export const TEXT_DAILY_SUMMARY_DESC = "One message before you open, not all day";
export const BUTTON_USE_THE_DEFAULT = "Use the default";

// Onboarding — Open Register step
export const LABEL_COUNT_YOUR_STARTING_CASH = "Count your starting cash";
export const TEXT_OPEN_REGISTER_STEP_DESCRIPTION =
  "Do this every morning. It's the only way to know if the drawer is short later.";
export const LABEL_HOW_MANY_OF_EACH = "HOW MANY OF EACH";
export const LABEL_COINS = "Coins";
export const LABEL_STARTING_FLOAT = "STARTING FLOAT";
export const LABEL_KEEP_AS_MINIMUM = "KEEP AS MINIMUM";
export const TEXT_BLOCKS_CASH_OUTS_BELOW = "Blocks cash-outs below this";
export const LABEL_CASH_HEALTH_GOOD_TITLE = "Plenty of small notes and coins";
export const TEXT_CASH_HEALTH_GOOD_WITH_AVERAGE_PREFIX = "Your average sale is around";
export const TEXT_CASH_HEALTH_GOOD_WITH_AVERAGE_SUFFIX = "so this covers change comfortably.";
export const TEXT_CASH_HEALTH_GOOD_NO_SALES = "You've got a good mix of small bills and coins for giving change.";
export const LABEL_CASH_HEALTH_LOW_TITLE = "Mostly big bills";
export const TEXT_CASH_HEALTH_LOW_WITH_AVERAGE_PREFIX = "Your average sale is around";
export const TEXT_CASH_HEALTH_LOW_WITH_AVERAGE_SUFFIX = "so you might run out of change quickly.";
export const TEXT_CASH_HEALTH_LOW_NO_SALES = "Keep some small bills and coins handy so you can give change.";
export const LABEL_WHOS_ON_THE_REGISTER = "Who's on the register?";
export const TEXT_SALES_RECORDED_UNDER_THIS_PERSON = "Sales get recorded under this person";
export const TEXT_YOU_SUFFIX = "(you)";
export const BUTTON_OPEN_THE_REGISTER = "Open the register";
export const BUTTON_SKIP_THE_COUNT = "Skip the count";

// Onboarding — Welcome hero (redesign)
export const TEXT_WELCOME_HEADLINE = "Let's get your shop ready to sell.";
export const TEXT_WELCOME_SUBTITLE =
  "Four short steps. Everything saves as you go, so you can stop after any of them and pick it up later from the dashboard.";
export const BUTTON_START_SETUP = "Start setup";
export const BUTTON_SKIP_TO_REGISTER = "Skip — take me to the register";
export const TEXT_WELCOME_FOOTNOTE = "About 8 minutes end to end. No card, nothing to install.";
export const LABEL_WHAT_WELL_DO = "What we'll do";
export const LABEL_STEPS_COUNT_CHIP = "4 steps";
export const TEXT_WELCOME_STEP_PROFILE_DESC = "Your name and shop details";
export const TEXT_WELCOME_STEP_PRODUCTS_DESC = "Start from a ready-made list";
export const TEXT_WELCOME_STEP_STOCK_ALERTS_DESC = "We suggest a sensible default";
export const TEXT_WELCOME_STEP_OPEN_REGISTER_DESC = "Count your starting cash";

// Onboarding — Welcome/Choose (Demo Store vs. real trial)
export const TEXT_WELCOME_CHOOSE_HEADLINE_PREFIX = "Welcome,";
export const LABEL_EXPLORE_DEMO_STORE = "Explore Demo Store";
export const TEXT_EXPLORE_DEMO_STORE_DESC =
  "Try Tindahan POS with sample products and sales. Nothing you do here touches your real store.";
export const BUTTON_EXPLORE_DEMO_STORE = "Explore Demo Store";
export const LABEL_SET_UP_MY_STORE = "Set Up My Store";
export const TEXT_SET_UP_MY_STORE_DESC = "Start your real 30-day free trial. No card needed.";
export const BUTTON_SET_UP_MY_STORE = "Set Up My Store";
export const TEXT_TRIAL_STARTED_BANNER = "Your 30-day free trial has started.";
export const TEXT_ABOUT_LOWERCASE_PREFIX = "about";
export const TEXT_MIN_SUFFIX = "min";
export const TEXT_YOU_CAN_LEAVE_ANY_STEP_TITLE = "You can leave any step for later";
export const TEXT_YOU_CAN_LEAVE_ANY_STEP_DESC =
  "The only one that really matters today is opening the register — you can sell with a handful of products and add the rest as you go.";

// Onboarding — merged Profile + Store step (redesign)
export const LABEL_TELL_US_ABOUT_YOU_AND_SHOP = "Tell us about you and your shop";
export const TEXT_PROFILE_MERGED_DESCRIPTION =
  "This appears on your receipts and on the dashboard. You can change any of it later in Settings.";
export const LABEL_ADD_YOUR_PHOTO = "Add your photo";
export const TEXT_PHOTO_OPTIONAL_SHOWN_TO_STAFF = "Optional · shown to your staff";
export const TEXT_MOBILE_NUMBER_HINT = "Used to reach you about your account and to reset your PIN.";
export const LABEL_ADD_STORE_LOGO = "Add store logo";
export const TEXT_STORE_LOGO_OPTIONAL_PRINTED_ON_RECEIPTS = "Optional · printed on receipts";
export const LABEL_SAME_AS_MY_OWN_ADDRESS = "Same as my own address";
export const LABEL_WHEN_ARE_YOU_USUALLY_OPEN = "When are you usually open?";
export const TEXT_OPENING_HOURS_HINT = "Used to work out how fast things sell, so stock alerts are accurate";
export const LABEL_TO_SEPARATOR = "to";
export const LABEL_OPENING_TIME = "Opening time";
export const LABEL_CLOSING_TIME = "Closing time";

// Onboarding — Setup Complete hero (redesign)
export const LABEL_SETUP_COMPLETE_CHIP = "Setup complete";
export const TEXT_REGISTER_IS_OPEN_PREFIX = "The register is open,";
export const TEXT_PRODUCTS_LOADED_SUFFIX = "products loaded";
export const TEXT_ALERTS_SET_AT_PREFIX = "alerts set at";
export const TEXT_DAYS_OF_COVER = "days of cover";
export const TEXT_AND_SEPARATOR = "and";
export const TEXT_COUNTED_INTO_DRAWER_SUFFIX = "counted into the drawer.";
export const BUTTON_START_SELLING = "Start selling";
export const BUTTON_SEE_THE_DASHBOARD = "See the dashboard";
export const TEXT_FIRST_SALE_FOOTNOTE =
  "Your first sale is what turns the dashboard on — until then it has nothing to show.";
export const LABEL_WHATS_SET_UP = "What's set up";
export const TEXT_OPEN_HOURS_PREFIX = "open";
export const TEXT_READY_TO_SELL = "Ready to sell";
export const LABEL_STOCK_ALERTS_ITEM = "Stock alerts";
export const TEXT_WARN_AT_PREFIX = "Warn at";
export const TEXT_DAILY_AT_7AM_SUFFIX = "7 AM daily";
export const LABEL_REGISTER_OPEN_ITEM = "Register open";
export const TEXT_FLOAT_PREFIX = "Float";
export const TEXT_COUNTED_BY_YOU_SUFFIX = "counted by you";
export const LABEL_WORTH_DOING_THIS_WEEK = "Worth doing this week";
export const LABEL_OPTIONAL_BADGE = "optional";
export const LABEL_ADD_YOUR_STAFF = "Add your staff";
export const TEXT_ADD_STAFF_DESC = "So sales are recorded per person";
export const LABEL_ENTER_EXISTING_UTANG = "Enter existing utang";
export const TEXT_ENTER_UTANG_DESC = "Move balances over from your notebook";
export const LABEL_CHECK_YOUR_SERVICE_FEES = "Check your service fees";
export const TEXT_SERVICE_FEES_DESC = "E-load and cash-in rates are on defaults";
export const BUTTON_REVIEW_CHIP = "Review";

// POS page
export const TEXT_POS_DESCRIPTION = "Scan a barcode, search by name, or tap a product.";
export const LABEL_PRODUCTS_TAB = "Products";
export const LABEL_SERVICES_TAB = "Services";
export const LABEL_SCAN_BARCODE = "Scan barcode";
export const LABEL_SCAN_OR_SEARCH_PRODUCTS = "Scan barcode or search products";
export const PLACEHOLDER_SCAN_OR_SEARCH = "Scan barcode or type a name…";
export const BUTTON_ADD = "Add";
export const ARIA_SCAN_WITH_CAMERA = "Scan with camera";
export const EMPTY_STATE_NO_PRODUCTS = "No products in this category.";
export const LABEL_CATEGORY_ALL = "All";
export const TEXT_CUSTOM_ITEM = "Custom item";
export const LABEL_CUSTOM_ITEM_NAME = "Item name";
export const LABEL_CUSTOM_ITEM_PRICE = "Price (₱)";
export const PLACEHOLDER_CUSTOM_ITEM_NAME = "e.g. Repair fee";
export const BUTTON_ADD_ITEM = "Add item";
export const TEXT_LOW_STOCK_LEFT_SUFFIX = "left";
export const LABEL_CURRENT_SALE = "Current sale";
export const EMPTY_STATE_CART = "Cart is empty. Scan or search an item to begin.";
export const TEXT_EACH_SUFFIX = "each";
export const ARIA_DECREASE_QUANTITY_PREFIX = "Decrease quantity of";
export const ARIA_INCREASE_QUANTITY_PREFIX = "Increase quantity of";
export const ARIA_REMOVE_PREFIX = "Remove";
export const LABEL_PAYMENT_CASH = "Cash";
export const LABEL_PAYMENT_QR = "GCash";
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
export const TEXT_CREDIT_LIMIT_WARNING_SUFFIX = "credit limit — an admin's PIN will be needed to complete this sale.";
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
export const BUTTON_HOLD_SALE = "Hold sale";
export const BUTTON_HOLDING = "Holding…";
export const LABEL_HELD_SALES = "Held sales";
export const LABEL_HELD_SALES_EMPTY = "No held sales right now.";
export const TEXT_HELD_BY = "Held by";
export const BUTTON_RESUME_SALE = "Resume";
export const BUTTON_DISCARD_SALE = "Discard";
export const ERROR_RESUME_BLOCKED_CART_NOT_EMPTY =
  "Finish, hold, or cancel your current sale before resuming another one.";
export const ERROR_COULD_NOT_HOLD_SALE = "Could not hold sale. Please try again.";
export const TEXT_DISCARD_CONFIRM_HAS_SERVICE =
  "This held sale includes an e-load or cash service that already happened and won't be reversed. Discard anyway?";
export const SERVICE_LABEL_ELOAD = "E-Load";
export const SERVICE_LABEL_CASHIN = "Cash-in";
export const SERVICE_LABEL_CASHOUT = "Cash-out";
export const SERVICE_LABEL_PRINT = "Print / Photocopy";

// E-load service panel
export const LABEL_NETWORK = "Network";
export const LABEL_MOBILE_NUMBER = "Mobile number";
export const PLACEHOLDER_MOBILE_NUMBER = "09XX XXX XXXX";
export const HINT_INVALID_MOBILE_NUMBER = "Enter a valid 11-digit mobile number.";
export const LABEL_AMOUNT = "Amount";
export const LABEL_OTHER = "Other";
export const LABEL_LOAD_AMOUNT = "Load amount";
export const TEXT_FEE_AUTO_SUFFIX = "auto";
export const LABEL_SERVICE_FEE = "Service fee";
export const LABEL_CUSTOMER_PAYS = "Customer pays";
export const BUTTON_ADD_TO_SALE = "Add to sale";
export const LABEL_ELOAD_WALLET = "E-load wallet";
export const TEXT_WALLET_AFTER_SALE_PREFIX = "Wallet after this sale ·";
export const LABEL_GOODS = "Goods";
export const LABEL_LOAD = "Load";
export const LABEL_SERVICE_FEES = "Service fees";

// Cash-in / Cash-out service panels
export const LABEL_RECIPIENT_NUMBER = "Recipient number";
export const LABEL_SENT_TO_CUSTOMER = "Sent to customer";
export const LABEL_CASH_TO_COLLECT = "Cash to collect";
export const TEXT_DRAWER_AFTER_SALE_PREFIX = "Drawer after this sale ·";
export const LABEL_RECEIVED_AMOUNT = "Received e-money";
export const LABEL_CASH_TO_HAND_OVER = "Cash to hand over";
export const TEXT_DRAWER_WILL_DROP_TO_PREFIX = "Drawer will drop to";
export const TEXT_BELOW_YOUR_FLOAT_PREFIX = "Below your";
export const TEXT_FLOAT_SUFFIX = "float.";
export const TEXT_CANT_MAKE_CHANGE_SUFFIX = "more cash-out(s) this size and you can't make change.";

// Print / photocopy service panel
export const LABEL_JOB_TYPE = "Job type";
export const TEXT_PER_PAGE_SUFFIX = "/ page";
export const TEXT_PER_JOB_SUFFIX = "/ job";
export const LABEL_PAGES = "Pages";
export const ARIA_DECREASE_PAGES = "Decrease pages";
export const ARIA_INCREASE_PAGES = "Increase pages";
export const LABEL_SINGLE_SIDED = "Single-sided";
export const LABEL_DOUBLE_SIDED = "Double-sided";
export const LABEL_PAPER_A4 = "A4";
export const TEXT_PAGES_SUFFIX = "pages";
export const LABEL_BULK_DISCOUNT_10_PAGES = "Bulk discount · 10+ pages";
export const LABEL_TOTAL_POS = "Total";

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
export const LABEL_COST_OPTIONAL = "Cost (optional)";
export const HINT_LEAVE_COST_BLANK =
  "Leave cost blank if you don't track it — you'll just see no margin for this item.";
export const LABEL_MARGIN = "Margin";
export const LINK_OPEN_IT = "Open it";
export const ERROR_COST_INVALID = "Cost must be a valid number.";
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

// Inventory page — redesign: metrics, filters, table
export const LABEL_STOCK_VALUE = "STOCK VALUE";
export const TEXT_AT_COST_SUFFIX = "at cost";
export const LABEL_AVG_MARGIN = "AVG MARGIN";
export const TEXT_ACROSS_ITEMS_SUFFIX = "items";
export const TEXT_LAST_STOCK_IN_PREFIX = "last stock-in";
export const TEXT_TODAY_LOWER = "today";
export const TEXT_YESTERDAY_LOWER = "yesterday";
export const TEXT_DAYS_AGO_SUFFIX = "days ago";
export const FILTER_NEEDS_ATTENTION_PREFIX = "Needs attention";
export const BUTTON_SORT_RUNS_OUT_SOONEST = "Runs out soonest";
export const LABEL_STATUS_OK_SHORT = "OK";
export const LABEL_STATUS_LOW_SHORT = "Low";
export const LABEL_STATUS_OUT_SHORT = "Out";
export const TEXT_LEFT_SUFFIX = "left";
export const TEXT_SELLS_PREFIX = "sells ~";
export const TEXT_PER_DAY_SUFFIX = "/day";
export const TEXT_OUT_IN_PREFIX = "out in ~";
export const TEXT_HRS_SUFFIX = "hrs";
export const TEXT_DAY_SINGULAR = "day";
export const LABEL_NO_BARCODE = "no barcode";
export const ARIA_PRODUCT_ACTIONS = "More actions";

// Shared chrome components (Sidebar, BottomNav, MobileHeader, ProtectedRoute, OnboardingRoute)
export const ARIA_MAIN_NAV = "Main";
export const ARIA_LOADING = "Loading";
export const LABEL_LOG_OUT = "Log out";
export const LABEL_MENU = "Menu";

// CategoryManager
export const LABEL_MANAGE_CATEGORIES = "Manage categories";
export const BUTTON_CLOSE = "Close";
export const ERROR_COULD_NOT_RENAME_CATEGORY = "Could not rename category.";
export const ERROR_COULD_NOT_DELETE_CATEGORY = "Could not delete category.";
export const ERROR_COULD_NOT_MERGE_CATEGORY = "Could not merge category.";
export const BUTTON_RENAME = "Rename";
export const TITLE_REASSIGN_PRODUCTS_FIRST = "Reassign or remove its products first";
export const EMPTY_STATE_NO_CATEGORIES = "No categories yet.";
export const BUTTON_MERGE = "Merge…";
export const LABEL_MERGE_INTO = "Merge into";
export const TITLE_MERGE_CATEGORY = "Merge category?";
export const TEXT_MERGE_CATEGORY_CONFIRM_PREFIX = "All";
export const TEXT_MERGE_CATEGORY_CONFIRM_SUFFIX = "products will be moved and nothing is lost.";
export const TITLE_DELETE_CATEGORY = "Delete category?";
export const TEXT_DELETE_CATEGORY_CONFIRM = "This can't be undone.";
export const BUTTON_CONFIRM_MERGE = "Merge categories";
export const TEXT_PRODUCT_COUNT_SUFFIX = "product(s)";

// ScannerLoadingOverlay
export const TEXT_LOADING_CAMERA = "Loading camera…";

// Stock status labels (full words, used as StatusChip's accessible name)
export const LABEL_STATUS_IN_STOCK = "In stock";

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

// Settings — shared sidebar
export const LABEL_SETTINGS_HEADING = "Settings";
export const NAV_LABEL_YOUR_PROFILE = "Your profile";
export const NAV_LABEL_STORE_DETAILS = "Store details";
export const NAV_LABEL_RECEIPTS = "Receipts";
export const NAV_LABEL_FEES_AND_LIMITS = "Fees and limits";
export const NAV_LABEL_ALERTS = "Alerts";
export const NAV_LABEL_BACKUP = "Backup";
export const TEXT_COMING_SOON = "Coming soon";
export const TEXT_COMING_SOON_DESCRIPTION = "This settings page hasn't been built yet — check back soon.";

// Settings — Your Profile
export const PAGE_HEADING_YOUR_PROFILE = "Your profile";
export const TEXT_YOUR_PROFILE_DESCRIPTION = "How you appear and how you sign in";
export const LABEL_UNSAVED_CHANGES_CHIP = "Unsaved changes";
export const LABEL_FULL_NAME = "Full name";
export const LABEL_DISPLAY_NAME = "Display name";
export const TEXT_AVATAR_HINT = "Square image, at least 200×200. Shown on receipts.";
export const LABEL_MOBILE = "Mobile";
export const LABEL_SIGNING_IN = "Signing in";
export const LABEL_YOUR_OVERRIDE_PIN = "Your override PIN";
export const TEXT_OVERRIDE_PIN_DESC = "Approves voids, big cash-outs, utang over limit";
export const LABEL_TWO_STEP_SIGN_IN = "Two-step sign-in";
export const TEXT_TWO_STEP_SIGN_IN_DESC = "Code by SMS when signing in on a new device";
export const LABEL_ON_BADGE = "On";
export const LABEL_OFF_BADGE = "Off";
export const LABEL_TELL_ME_ABOUT = "Tell me about";
export const TEXT_NOTIFY_LOW_STOCK = "Low stock, once each morning";
export const TEXT_NOTIFY_DRAWER_VARIANCE = "Drawer variance at shift close";
export const TEXT_NOTIFY_UTANG_AGING = "Utang older than 30 days";
export const TEXT_NOTIFY_EVERY_SALE = "Every completed sale";
export const LABEL_SIGN_OUT_EVERYWHERE = "Sign out everywhere";
export const TEXT_SIGN_OUT_EVERYWHERE_DESC = "Ends every other signed-in session for your account";
export const BUTTON_SIGN_OUT_ALL = "Sign out all";
export const BUTTON_DISCARD = "Discard";
export const LABEL_CHANGE_PASSWORD_HEADING = "Change your password";
export const LABEL_NEW_PASSWORD = "New password";
export const LABEL_CONFIRM_NEW_PASSWORD = "Confirm new password";
export const BUTTON_UPDATE_PASSWORD = "Update password";
export const BUTTON_UPDATING = "Updating…";
export const ERROR_PASSWORD_TOO_SHORT = "Password must be at least 8 characters.";
export const ERROR_PASSWORDS_DO_NOT_MATCH = "Passwords don't match.";
export const TEXT_PASSWORD_UPDATED = "Password updated.";
export const ERROR_COULD_NOT_UPDATE_PASSWORD = "Could not update password.";
export const ERROR_COULD_NOT_SIGN_OUT_EVERYWHERE = "Could not sign out other sessions.";
export const TEXT_SIGNED_OUT_EVERYWHERE = "Signed out of all other sessions.";

// Settings — Store Details
export const PAGE_HEADING_STORE_DETAILS = "Store details";
export const TEXT_STORE_DETAILS_DESCRIPTION = "Appears on receipts and reports";
export const BUTTON_CHANGE_LOGO = "Change logo";
export const TEXT_LOGO_HINT = "Printed at the top of every receipt";
export const LABEL_CONTACT_NUMBER = "Contact number";
export const LABEL_CITY = "City";
export const LABEL_CURRENCY = "Currency";
export const LABEL_TIME_ZONE = "Time zone";
export const LABEL_OPENING_HOURS = "Opening hours";
export const TEXT_SAME_EVERY_DAY = "Same every day";
export const LABEL_OPENS = "Opens";
export const LABEL_CLOSES = "Closes";
export const TEXT_OPENING_HOURS_STOCK_HINT = 'Used to work out "sells per day" for stock alerts.';
export const LABEL_REGISTERED_WITH_BIR = "Registered with BIR";
export const TEXT_REGISTERED_WITH_BIR_DESC = "Turn on if you issue official receipts";
export const LABEL_TIN = "TIN";
export const LABEL_BUSINESS_PERMIT_NO = "Business permit no.";
export const TEXT_BIR_HINT =
  "Printed on receipts. Check the current BIR requirements for your registration type — this app doesn't verify them.";
export const LABEL_VAT_STATUS = "VAT status";
export const LABEL_VAT_RATE = "VAT rate (%)";
export const TEXT_VAT_RATE_HINT = "The statutory rate is 12% — adjust only if the applicable BIR rate changes.";
export const TEXT_VAT_STATUS_HINT =
  "Your registered tax status with BIR. When VAT Registered, receipts show the VATable sales / VAT amount breakdown automatically, computed at the rate below.";
export const LABEL_VAT_REGISTERED = "VAT Registered";
export const LABEL_NON_VAT = "Non-VAT";
export const LABEL_VAT_EXEMPT = "VAT-Exempt";
export const LABEL_ZERO_RATED = "Zero-Rated";
export const LABEL_INVOICE_TYPE = "Invoice type";
export const TEXT_INVOICE_TYPE_HINT = "Printed as the heading on every receipt.";
export const LABEL_INVOICE_TYPE_SALES = "Sales Invoice";
export const LABEL_INVOICE_TYPE_SERVICE = "Service Invoice";
export const LABEL_INVOICE_TYPE_CASH = "Cash Invoice";
export const LABEL_INVOICE_TYPE_CHARGE = "Charge Invoice";
export const LABEL_INVOICE_TYPE_CREDIT = "Credit Invoice";
export const ERROR_COULD_NOT_SAVE_STORE_DETAILS = "Could not save store details.";
export const TEXT_STORE_DETAILS_UPDATED = "Store details updated.";

// Settings — Receipts
export const PAGE_HEADING_RECEIPTS = "Receipts";
export const TEXT_RECEIPTS_DESCRIPTION = "What the customer gets after a sale";
export const LABEL_HOW_TO_SEND_IT = "How to send it";
export const LABEL_PRINT_ON_THERMAL_PRINTER = "Print on the thermal printer";
export const LABEL_OFFER_SMS_RECEIPT = "Offer SMS receipt";
export const LABEL_PRINT_AUTOMATICALLY_EVERY_SALE = "Print automatically every sale";
export const TEXT_RECEIPT_SEND_HINT = "Most sari-sari customers don't want paper. Ask, don't assume.";
export const LABEL_WHAT_TO_INCLUDE = "What to include";
export const LABEL_INCLUDE_LOGO = "Logo";
export const LABEL_INCLUDE_TIN_AND_PERMIT = "TIN and permit";
export const TEXT_TIN_REQUIRED_HINT = "Your store is BIR registered, so your TIN always prints — this can't be turned off.";
export const LABEL_INCLUDE_CASHIER_NAME = "Cashier name";
export const LABEL_INCLUDE_UTANG_BALANCE = "Utang balance";
export const LABEL_INCLUDE_QR_TO_PAY = "QR to pay";
export const LABEL_FOOTER_MESSAGE = "Footer message";
export const TEXT_CHARACTERS_LEFT = "characters left";
export const LABEL_RECEIPT_NUMBERING = "Receipt numbering";
export const TEXT_NEXT_RECEIPT_NUMBER_PREFIX = "Next:";
export const TEXT_RECEIPT_NUMBERING_MANAGED_AUTOMATICALLY =
  "Assigned automatically on each sale to guarantee it's unique — not editable.";
export const LABEL_PREVIEW = "Preview";
export const BUTTON_TEST_PRINT = "Test print";
export const BUTTON_58MM = "58mm";
export const ERROR_COULD_NOT_SAVE_RECEIPT_SETTINGS = "Could not save receipt settings.";
export const TEXT_RECEIPT_SETTINGS_UPDATED = "Receipt settings updated.";
export const TEXT_PREVIEW_STORE_ADDRESS_FALLBACK = "Store address not set yet";
export const TEXT_PREVIEW_CASHIER_LABEL = "Cashier:";
export const TEXT_PREVIEW_TOTAL = "TOTAL";
export const TEXT_PREVIEW_CASH = "Cash";
export const TEXT_PREVIEW_CHANGE = "Change";

// Settings — Fees and Limits
export const PAGE_HEADING_FEES_AND_LIMITS = "Fees and limits";
export const TEXT_FEES_AND_LIMITS_DESCRIPTION = "What you charge, and what staff can do without you";
export const LABEL_ELOAD_FEE = "E-load fee";
export const LABEL_CASH_IN_FEE = "Cash-in fee";
export const LABEL_CASH_OUT_FEE = "Cash-out fee";
export const LABEL_ADD_BRACKET = "Add bracket";
export const TEXT_BRACKET_UP_TO_PREFIX = "Up to";
export const TEXT_BRACKET_AND_UP_SUFFIX = "and up";
export const LABEL_PRINT_AND_PHOTOCOPY = "Print and photocopy";
export const LABEL_PRINT_BW = "Print B&W";
export const LABEL_PRINT_COLOUR = "Print colour";
export const LABEL_PHOTOCOPY = "Photocopy";
export const LABEL_BULK_FROM = "Bulk from";
export const LABEL_CASH_AND_CREDIT_LIMITS = "Cash and credit limits";
export const LABEL_KEEP_IN_DRAWER = "Keep in drawer";
export const LABEL_DEFAULT_CREDIT_LIMIT = "Default credit limit";
export const LABEL_CASHIER_CASH_OUT_CAP = "Cashier cash-out cap";
export const LABEL_BLOCK_UTANG_PAST_LIMIT = "Block utang past the customer's limit";
export const LABEL_VOID_NEEDS_PIN = "Voiding a paid sale needs your PIN";
export const LABEL_WARN_LOW_ELOAD_FLOAT = "Warn when e-load float drops below ₱500";
export const ERROR_COULD_NOT_SAVE_FEES_AND_LIMITS = "Could not save fees and limits.";
export const TEXT_FEES_AND_LIMITS_UPDATED = "Fees and limits updated.";

// Settings — Alerts
export const PAGE_HEADING_ALERTS = "Alerts";
export const TEXT_ALERTS_DESCRIPTION = "What reaches you, when, and how";
export const LABEL_ALERTS_STOCK = "Stock";
export const LABEL_WARN_BELOW = "Warn below";
export const TEXT_DAYS_OF_COVER_SUFFIX = "of cover";
export const LABEL_FAST_MOVERS_WARN_EARLIER = "Fast movers warn earlier";
export const LABEL_OUT_OF_STOCK_STRAIGHT_AWAY = "Out of stock, straight away";
export const LABEL_ALERTS_MONEY = "Money";
export const LABEL_DRAWER_OFF_BY_MORE_THAN = "Drawer off by more than";
export const LABEL_UTANG_OLDER_THAN = "Utang older than";
export const LABEL_ANY_VOID_AFTER_PAYMENT = "Any void after payment";
export const LABEL_HOW_AND_WHEN = "How and when";
export const LABEL_CHANNEL_PUSH = "Push";
export const TEXT_CHANNEL_PUSH_DESC = "On this device";
export const LABEL_CHANNEL_SMS = "SMS";
export const TEXT_CHANNEL_SMS_DESC = "Money alerts only";
export const LABEL_CHANNEL_EMAIL = "Email";
export const TEXT_CHANNEL_OFF = "Off";
export const LABEL_DAILY_SUMMARY_AT = "Daily summary at";
export const TEXT_DAILY_SUMMARY_AT_DESC = "One message instead of many";
export const LABEL_QUIET_HOURS = "Quiet hours";
export const TEXT_QUIET_HOURS_DESC = "Nothing except money alerts";
export const ERROR_COULD_NOT_SAVE_ALERTS = "Could not save alerts.";
export const TEXT_ALERTS_UPDATED = "Alerts updated.";

// Settings — Backup
export const PAGE_HEADING_BACKUP = "Backup";
export const TEXT_BACKUP_DESCRIPTION = "Your sales history is the store's memory";
export const TEXT_ALWAYS_SYNCED_HEADING = "Always up to date";
export const TEXT_ALWAYS_SYNCED_DESC = "Every sale, product, and customer saves straight to the cloud as you go";
export const TEXT_SALES_COUNT_SUFFIX = "sales";
export const TEXT_PRODUCTS_COUNT_SUFFIX = "products";
export const TEXT_CUSTOMERS_COUNT_SUFFIX = "customers";
export const BUTTON_REFRESH_NOW = "Refresh now";
export const BUTTON_REFRESHING = "Refreshing…";
export const LABEL_AUTOMATIC_BACKUP = "Automatic backup";
export const TEXT_AUTOMATIC_BACKUP_DESC =
  "Backups run automatically every day and are stored securely, separate from what any store can access. There's nothing to configure here.";
export const LABEL_WHEN_INTERNET_DROPS = "When the internet drops";
export const TEXT_OFFLINE_QUEUE_DESC =
  "If the connection drops mid-sale, checkout keeps working — sales are saved on this device and upload automatically once you're back online.";
export const LABEL_WAITING_TO_UPLOAD = "Waiting to upload";
export const TEXT_ZERO_SALES = "0 sales";
export const TEXT_SYNC_PENDING_HEADING = "Some sales are waiting to sync";
export const TEXT_SYNC_PENDING_DESC = "Saved on this device — they'll upload automatically once you're back online";
export const LABEL_LAST_SYNCED = "Last synced";
export const TEXT_NEVER_SYNCED_YET = "Not yet";
export const LABEL_QUEUED_SALE_STATUS_PENDING = "Pending";
export const LABEL_QUEUED_SALE_STATUS_SYNCING = "Syncing…";
export const LABEL_QUEUED_SALE_STATUS_SYNCED = "Synced";
export const LABEL_QUEUED_SALE_STATUS_NEEDS_REAUTH = "Needs sign-in";
export const LABEL_QUEUED_SALE_STATUS_FAILED = "Failed";
export const TEXT_QUEUE_NEEDS_REAUTH =
  "Sign back in as a cashier to resume syncing these sales.";
export const BUTTON_RETRY_NOW = "Retry now";
export const TEXT_SAVED_OFFLINE_BADGE = "Saved offline — will sync when back online";
export const LABEL_TAKE_A_COPY = "Take a copy for yourself";
export const LABEL_EXPORT_SALES_CSV = "Sales as CSV";
export const TEXT_EXPORT_SALES_CSV_DESC = "Opens in Excel";
export const LABEL_EXPORT_PRODUCTS_CSV = "Product list";
export const TEXT_EXPORT_PRODUCTS_CSV_DESC = "With prices and stock";
export const LABEL_EXPORT_EVERYTHING = "Everything";
export const TEXT_EXPORT_EVERYTHING_DESC = "Full backup file";
export const LABEL_RESTORE_FROM_BACKUP = "Restore from a backup";
export const TEXT_RESTORE_DESC = "Not available yet — this would replace everything currently in the app";
export const BUTTON_RESTORE = "Restore";

// Owner PIN override (POS credit-limit approval)
export const LABEL_NEEDS_OWNER_PIN = "Needs owner's PIN";
export const LABEL_OWNER_APPROVAL_NEEDED = "Owner approval needed";
export const TEXT_OWNER_APPROVAL_RECORDED_HINT = "This override is recorded with your name as the approving admin.";
export const BUTTON_PAY_CASH_INSTEAD = "Pay cash instead";
export const ERROR_INVALID_OVERRIDE_PIN = "That PIN doesn't match any admin at this store.";
export const ERROR_COULD_NOT_SET_PIN = "Could not save your PIN.";
export const TEXT_PIN_UPDATED = "PIN updated.";
export const LABEL_YOUR_OVERRIDE_PIN_ENTER = "Enter a new 4-digit PIN";
export const LABEL_YOUR_OVERRIDE_PIN_CONFIRM = "Confirm your new PIN";
export const ERROR_PIN_MUST_BE_4_DIGITS = "PIN must be exactly 4 digits.";
export const ERROR_PINS_DO_NOT_MATCH = "PINs don't match.";
export const BUTTON_SET_PIN = "Set PIN";
export const BUTTON_CHANGE_PIN = "Change PIN";

// Cashier PIN quick-switch login
export const LABEL_CASHIER_PICKER_HEADING = "WHO'S ON THE REGISTER?";
export const TEXT_GREETING_HI_PREFIX = "Hi";
export const TEXT_ENTER_YOUR_PIN_SUFFIX = "enter your PIN";
export const LABEL_CASHIER_PIN_ARIA = "Enter your PIN";
export const TEXT_FORGOT_PIN_PREFIX = "Forgot your PIN? Ask";
export const LINK_SIGN_IN_WITH_EMAIL = "Sign in with email";
export const BUTTON_SWITCH_CASHIER = "Switch cashier";
export const ERROR_INVALID_PIN = "Incorrect PIN. Please try again.";
export const ERROR_PIN_LOCKED = "Too many wrong attempts. Please wait 15 minutes and try again.";
export const ERROR_INACTIVE_EMPLOYEE = "This account is inactive. Please ask an admin.";
export const TEXT_CASHIER_SESSION_EXPIRED = "Please sign in again.";
export const TEXT_LOADING_STAFF = "Loading staff…";
export const ERROR_COULD_NOT_LOAD_STAFF = "Could not load staff.";
export const LABEL_COUNT_STARTING_CASH = "Count your starting cash";
export const LABEL_OPENING_FLOAT = "Cash in the drawer";
export const ERROR_INVALID_OPENING_FLOAT = "Enter the amount of cash in the drawer.";
export const LABEL_COUNT_CLOSING_CASH = "Count your closing cash";
export const LABEL_CLOSING_FLOAT = "Cash in the drawer";
export const BUTTON_END_SHIFT = "End shift";
export const BUTTON_SKIP_COUNT = "Skip count";
export const ERROR_INVALID_CLOSING_FLOAT = "Enter the amount of cash in the drawer.";

// Staff page: per-cashier PIN + active toggle (admin only)
export const LABEL_STAFF_PIN = "PIN";
export const TEXT_STAFF_NO_PIN_SET = "No PIN set";
export const LABEL_ACTIVE = "Active";
export const LABEL_INACTIVE = "Inactive";
export const ERROR_COULD_NOT_SET_STAFF_PIN = "Could not save this PIN.";
export const ERROR_COULD_NOT_UPDATE_STAFF_STATUS = "Could not update this staff member's status.";

// Device pairing (Phase 3)
export const TEXT_ASK_AN_OWNER = "Forgot your PIN? Ask an owner";
export const LINK_OWNER_SIGN_IN = "Owner sign-in";
export const LINK_WRONG_STORE = "Wrong store?";
export const LABEL_SET_UP_THIS_DEVICE = "Set up this device as a register";
export const TEXT_SET_UP_THIS_DEVICE_DESC = "For the tablet at the counter. Pair it once, then staff sign in with a PIN.";
export const LABEL_PAIR_THIS_DEVICE = "Pair this device";
export const TEXT_PAIR_INSTRUCTIONS =
  "Open Tindahan POS on your phone, go to Settings → Devices, and read out the 6-character code.";
export const LABEL_PAIRING_CODE_ARIA = "6-character pairing code";
export const LABEL_NAME_THIS_DEVICE = "NAME THIS DEVICE";
export const TEXT_NAME_THIS_DEVICE_HINT = "Shows in your device list and on shift records.";
export const PLACEHOLDER_DEVICE_NAME = "Counter tablet";
export const BUTTON_PAIR_WITH_THIS_STORE = "Pair with this store";
export const TEXT_ONLY_OWNER_PIN_CAN_UNPAIR = "Only an owner PIN can unpair it later.";
export const ERROR_INVALID_OR_EXPIRED_CODE = "That code is invalid or has expired.";
export const ERROR_COULD_NOT_PAIR_DEVICE = "Could not pair this device. Please try again.";
export const BUTTON_PAIRING = "Pairing…";
export const NAV_LABEL_DEVICES = "Devices";
export const NAV_LABEL_YOUR_PLAN = "Your plan";
export const PAGE_HEADING_YOUR_PLAN = "Your plan";
export const TEXT_PLAN_DESCRIPTION =
  "What your store can do today, and what it cannot yet.";
export const TEXT_PLAN_INCLUDED = "Included in your plan";
export const TEXT_PLAN_NOT_INCLUDED = "Not in your plan";
export const TEXT_PLAN_ALL_INCLUDED =
  "Your store holds every capability the platform sells.";
export const TEXT_PLAN_LOCKED_HINT =
  "Switching plans never moves or hides your data — everything you already have stays exactly where it is.";
export const TEXT_PLAN_CONTACT_US = "Contact us";
export const TEXT_PLAN_UPGRADE_PREFIX = "Upgrade to ";
export const TEXT_PLAN_WRITES_PAUSED =
  "New records are paused while billing is unsettled. Everything you have recorded is still here, and still yours to read and export.";
export const MODULE_LABEL_POS = "Selling";
export const MODULE_LABEL_INVENTORY = "Stock and suppliers";
export const MODULE_LABEL_ACCOUNTING = "Accounting";
export const LABEL_YOUR_PLAN = "Your plan";
export const BUTTON_MANAGE_SUBSCRIPTION = "Manage subscription";
export const BUTTON_UPGRADE_PLAN = "Upgrade plan";
export const TEXT_PLAN_UNLOCKS_PREFIX = "Available on ";
export const BUTTON_COMPARE_PLANS = "Compare plans";
export const BUTTON_MAYBE_LATER = "Maybe later";
export const ARIA_VIEW_UPGRADE_OPTIONS = "View upgrade options";
export const LINK_BACK_TO_HOME = "← Back to home";
export const TEXT_REGISTER_TRIAL_PREFIX = "30-day free trial of ";
export const TEXT_REGISTER_TRIAL_THEN_PREFIX = ", then ";
export const TEXT_ADDONS_HEADING = "Add-ons";
export const TEXT_ADDON_ACCOUNTING_NAME = "Accounting";
export const TEXT_ADDON_ACCOUNTING_DESC =
  "Track expenses and see real profit, independent of your plan tier.";
export const BUTTON_REQUEST_ADDON = "Request add-on";
export const BUTTON_REQUESTED = "Requested";
export const TEXT_ADDON_REQUESTED_HINT = "We'll be in touch to set this up.";
export const PAGE_HEADING_DEVICES = "Devices";
export const TEXT_DEVICES_DESCRIPTION = "Registers paired to this store.";
export const BUTTON_GENERATE_PAIRING_CODE = "Generate pairing code";
export const TEXT_PAIRING_CODE_EXPIRES_PREFIX = "Expires in";
export const LABEL_PAIRED_BY_PREFIX = "Paired by";
export const BUTTON_UNPAIR = "Unpair";
export const LABEL_UNPAIR_DEVICE_HEADING = "Unpair";
export const TEXT_ENTER_OWNER_PIN = "Enter your owner PIN to confirm";
export const ERROR_INVALID_OWNER_PIN = "That PIN doesn't match any admin at this store.";
export const ERROR_COULD_NOT_UNPAIR_DEVICE = "Could not unpair this device.";
export const EMPTY_STATE_NO_DEVICES = "No devices paired yet.";
export const LINK_BACK_TO_SIGN_IN = "Back to sign in";
export const LABEL_DEVICE_NAME = "Device name";
export const LABEL_PAIRED_DEVICES_HEADING = "Paired devices";
export const BUTTON_DISMISS = "Dismiss";

export const NAV_LABEL_AUDIT_LOG = "Audit Log";
export const PAGE_HEADING_AUDIT_LOG = "Audit Log";
export const TEXT_AUDIT_LOG_DESCRIPTION = "A record of sensitive actions taken on this store's data, such as voided sales.";
export const LABEL_AUDIT_LOG_HEADING = "Recent activity";
export const EMPTY_STATE_NO_AUDIT_LOG_ENTRIES = "No audit log entries yet.";
export const LABEL_AUDIT_ACTOR_PREFIX = "By";
export const LABEL_AUDIT_REASON_PREFIX = "Reason:";
export const ERROR_COULD_NOT_LOAD_AUDIT_LOG = "Unable to load the audit log.";
export const LABEL_AUDIT_ACTION_SALE_VOIDED = "Sale voided";
export const LABEL_AUDIT_ACTION_SALE_CREATED = "Sale recorded";
export const LABEL_AUDIT_ACTION_PRICE_CHANGED = "Price changed";
export const LABEL_AUDIT_ACTION_STORE_CONFIG_CHANGED = "Store settings changed";
export const LABEL_AUDIT_ACTION_CUSTOMER_DELETED = "Customer deleted";
export const LABEL_AUDIT_ACTION_STAFF_ROLE_CHANGED = "Staff role changed";
export const LABEL_AUDIT_ACTION_RECEIPT_REPRINTED = "Receipt reprinted";
export const LABEL_AUDIT_ACTION_SALE_REFUNDED = "Sale refunded";
export const LABEL_AUDIT_ACTION_STAFF_LOGGED_IN = "Staff signed in";
export const LABEL_AUDIT_ACTION_STAFF_LOGGED_OUT = "Staff signed out";
export const LABEL_AUDIT_ACTION_CASHIER_SESSION_STARTED = "Cashier shift started";
export const LABEL_AUDIT_ACTION_CASHIER_SESSION_ENDED = "Cashier shift ended";

// Connection resilience (freeze/blank-screen fix)
export const TEXT_SETTING_UP_CASHIER_SESSION = "Setting up your cashier session…";
export const BUTTON_TRY_AGAIN = "Try again";
export const TITLE_UNABLE_TO_CONNECT = "Unable to connect";
export const ERROR_COULD_NOT_START_SESSION = "We couldn't connect to the cashier system. Please check your connection and try again.";
export const TEXT_LOADING_PRODUCTS = "Loading products…";
export const TEXT_LOADING_MORE_PRODUCTS = "Loading more products…";
export const ERROR_COULD_NOT_LOAD_PRODUCTS = "Unable to load products.";

// Printable receipt
export const LABEL_RECEIPT_NUMBER_PREFIX = "Receipt No.";
export const TEXT_RECEIPT_NUMBER_PENDING = "Pending — assigned once synced";
export const LABEL_CASHIER_ON_RECEIPT_PREFIX = "Cashier:";
export const LABEL_CASH_TENDERED = "Cash tendered";
export const LABEL_REFERENCE_NO_PREFIX = "Reference no.";
export const LABEL_UTANG_BALANCE_NOTE = "Charged to Utang account.";
export const BUTTON_PRINT_RECEIPT = "Print receipt";
export const BUTTON_NEW_SALE = "New sale";
