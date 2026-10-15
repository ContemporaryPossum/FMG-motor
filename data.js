/* ==========================================================================
   FMG — Falix Motor Garage · site data
   Edit this file to update contact details, hours, reviews and chart data.
   Everything on the page that is business info is read from here.
   ========================================================================== */
window.FMG = {
  name: "FMG Falix Motor Garage",
  short: "FMG",
  ssm: "202103146452",

  phoneDisplay: "017-583 2262",
  phoneTel: "+60175832262",
  whatsapp: "60175832262",
  whatsappMessage: "Hi FMG, I'd like to book my bike in for tuning / service.",

  address: {
    line1: "346 & 347, Jalan Bandar Baru 4",
    line2: "Taman Bandar Baru",
    postcode: "08000",
    city: "Sungai Petani",
    state: "Kedah",
  },
  geo: { lat: 5.6524374, lng: 100.505426 },
  plusCode: "MG24+X5",

  /* Opening hours in Malaysia time. Keys are JS weekdays: 0 = Sunday … 6 = Saturday.
     Values are [open, close] in minutes from midnight, or null when closed. */
  timezone: "Asia/Kuala_Lumpur",
  hours: {
    0: [570, 1170], // Sun 9:30 am – 7:30 pm
    1: [570, 1170], // Mon
    2: [570, 1170], // Tue
    3: [570, 1170], // Wed
    4: [570, 1170], // Thu
    5: null,        // Fri closed
    6: [570, 1170], // Sat
  },

  links: {
    tiktok: "https://www.tiktok.com/@fmotorgarage",
    instagram: "https://www.instagram.com/falixmotorgarage/",
    facebook: "https://www.facebook.com/FalixMotorGarage/",
    shopee: "https://shopee.com.my/falixmotorgarage_fmg",
    maps: "https://www.google.com/maps/search/?api=1&query=FMG+Falix+Motor+Garage+Sungai+Petani",
    directions: "https://www.google.com/maps/dir/?api=1&destination=5.6524374,100.505426",
    mapEmbed: "https://www.google.com/maps?q=FMG%20FALIX%20MOTOR%20GARAGE%2C%20Sungai%20Petani&ll=5.6524374,100.505426&z=17&output=embed",
  },

  /* Public numbers, checked October 2026. Update when they grow. */
  stats: {
    googleRating: 4.6,
    googleReviews: 41,
    tiktokFollowers: 16500,
    tiktokLikes: 154700,
    instagramFollowers: 2454,
    facebookLikes: 1857,
  },

  /* Community reach — ring chart */
  reach: [
    { label: "TikTok", value: 16500, color: "var(--chart-1)" },
    { label: "Instagram", value: 2454, color: "var(--chart-3)" },
    { label: "Facebook", value: 1857, color: "var(--chart-2)" },
  ],

  /* Dyno lab — SAMPLE curves for illustration.
     Stock peaks follow published manufacturer figures; tune gains are indicative.
     Replace with real dyno sheets from the shop when available. */
  dyno: {
    initial: "Y15ZR",
    models: {
      Y15ZR: {
        label: "Yamaha Y15ZR",
        stock: { hp: 15.2, hpRpm: 8500, limit: 10000 },
        tune: { hpGain: 0.11, peakShift: 250, limit: 10500 },
      },
      Y16ZR: {
        label: "Yamaha Y16ZR",
        stock: { hp: 17.0, hpRpm: 9500, limit: 10500 },
        tune: { hpGain: 0.09, peakShift: 250, limit: 11000 },
      },
      RS150R: {
        label: "Honda RS150R",
        stock: { hp: 15.9, hpRpm: 9000, limit: 10500 },
        tune: { hpGain: 0.12, peakShift: 300, limit: 11000 },
      },
    },
  },

  /* Build stages — radar chart. Indicative targets on a 0–100 scale. */
  stages: {
    metrics: [
      { key: "response", label: "Throttle response" },
      { key: "mid", label: "Mid-range" },
      { key: "top", label: "Top end" },
      { key: "ride", label: "Rideability" },
      { key: "daily", label: "Daily use" },
    ],
    stock: { response: 52, mid: 55, top: 50, ride: 86, daily: 92 },
    initial: "street",
    options: {
      street: {
        label: "Street",
        values: { response: 74, mid: 68, top: 62, ride: 90, daily: 88 },
        blurb: "Sharper and smoother for everyday riding.",
        parts: ["Custom ECU / CDI map", "Free-flow exhaust", "Air filter", "Dyno baseline + verify"],
      },
      sport: {
        label: "Sport",
        values: { response: 86, mid: 82, top: 80, ride: 76, daily: 70 },
        blurb: "More pull everywhere, still happy in traffic.",
        parts: ["Everything in Street", "Performance cam", "Bigger throttle body", "Uprated cooling"],
      },
      race: {
        label: "Race",
        values: { response: 96, mid: 88, top: 97, ride: 52, daily: 40 },
        blurb: "Full engine build for the track and drag strip.",
        parts: ["Bore-up kit", "Head work + valves", "Race ECU multi-map", "Full dyno session"],
      },
    },
  },

  /* "On the bench" list. Each row opens WhatsApp with the model pre-filled. */
  bench: [
    { model: "Y16ZR", make: "Yamaha", note: "ECU dyno tuning" },
    { model: "Y15ZR", make: "Yamaha", note: "Cooling, wheels & servicing" },
    { model: "RSX150", make: "Honda", note: "Redleo ECU, multi-map setup" },
    { model: "NVX", make: "Yamaha", note: "Radiators, parts & servicing" },
    { model: "RS150R", make: "Honda", note: "Mapping & engine builds" },
  ],

  /* Real Google reviews (verbatim). */
  reviews: [
    {
      quote: "Friendly owner and staff. Affordable price and very quick repairs. Fully overhauled my 150cc bike in 2 days only (depend on models).",
      name: "Ashraf",
      meta: "Local Guide · Google review",
    },
    {
      quote: "Friendly owner and staff. Excellent service. Price are affordable.",
      name: "Hariz Chua",
      meta: "Google review",
    },
    {
      quote: "Accessories and ECU/CDI mapping… showing all top brand.",
      name: "Jeremy",
      meta: "Local Guide · Google review",
    },
  ],
};
