// 150 Most Important Stocks for Real-time Market Data
// This list includes major indices, blue-chip stocks, and actively traded securities

export const IMPORTANT_STOCKS = [
  // Major Indices
  { symbol: 'NIFTY 50', instrumentToken: '256265', exchangeToken: '256265', exchange: 'NSE', segment: 'INDICES', type: 'INDEX', priority: 1 },
  { symbol: 'NIFTY BANK', instrumentToken: '260105', exchangeToken: '260105', exchange: 'NSE', segment: 'INDICES', type: 'INDEX', priority: 2 },
  { symbol: 'SENSEX', instrumentToken: '265', exchangeToken: '265', exchange: 'BSE', segment: 'INDICES', type: 'INDEX', priority: 3 },
  { symbol: 'NIFTY IT', instrumentToken: '257801', exchangeToken: '257801', exchange: 'NSE', segment: 'INDICES', type: 'INDEX', priority: 4 },
  { symbol: 'NIFTY AUTO', instrumentToken: '257545', exchangeToken: '257545', exchange: 'NSE', segment: 'INDICES', type: 'INDEX', priority: 5 },

  // Top Banking Stocks
  { symbol: 'HDFCBANK', instrumentToken: '1333', exchangeToken: '1333', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 6 },
  { symbol: 'ICICIBANK', instrumentToken: '1270', exchangeToken: '1270', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 7 },
  { symbol: 'KOTAKBANK', instrumentToken: '492033', exchangeToken: '1922', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 8 },
  { symbol: 'SBIN', instrumentToken: '3045', exchangeToken: '3045', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 9 },
  { symbol: 'AXISBANK', instrumentToken: '5900', exchangeToken: '1594', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 10 },
  { symbol: 'INDUSINDBK', instrumentToken: '1346', exchangeToken: '1346', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 11 },
  { symbol: 'BANDHANBNK', instrumentToken: '2263', exchangeToken: '2263', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 12 },

  // IT Giants
  { symbol: 'TCS', instrumentToken: '2953', exchangeToken: '2953', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 13 },
  { symbol: 'INFY', instrumentToken: '408065', exchangeToken: '1594', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 14 },
  { symbol: 'WIPRO', instrumentToken: '3787', exchangeToken: '3787', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 15 },
  { symbol: 'HCLTECH', instrumentToken: '1850', exchangeToken: '1850', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 16 },
  { symbol: 'TECHM', instrumentToken: '3465', exchangeToken: '3465', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 17 },
  { symbol: 'LTI', instrumentToken: '11483', exchangeToken: '11483', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 18 },

  // FMCG Majors
  { symbol: 'HINDUNILVR', instrumentToken: '356865', exchangeToken: '1394', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 19 },
  { symbol: 'ITC', instrumentToken: '424961', exchangeToken: '1660', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 20 },
  { symbol: 'NESTLEIND', instrumentToken: '4598529', exchangeToken: '17963', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 21 },
  { symbol: 'BRITANNIA', instrumentToken: '140033', exchangeToken: '547', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 22 },
  { symbol: 'DABUR', instrumentToken: '197633', exchangeToken: '772', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 23 },

  // Auto Sector
  { symbol: 'MARUTI', instrumentToken: '2278657', exchangeToken: '8908', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 24 },
  { symbol: 'TATAMOTORS', instrumentToken: '884737', exchangeToken: '3456', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 25 },
  { symbol: 'M&M', instrumentToken: '519937', exchangeToken: '2031', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 26 },
  { symbol: 'BAJAJ-AUTO', instrumentToken: '4267265', exchangeToken: '16669', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 27 },
  { symbol: 'EICHERMOT', instrumentToken: '232961', exchangeToken: '910', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 28 },
  { symbol: 'HEROMOTOCO', instrumentToken: '345089', exchangeToken: '1348', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 29 },

  // Telecom
  { symbol: 'BHARTIARTL', instrumentToken: '2714625', exchangeToken: '10604', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 30 },
  { symbol: 'RELIANCE', instrumentToken: '738561', exchangeToken: '2885', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 31 },
  { symbol: 'JIOFINANCE', instrumentToken: '25847041', exchangeToken: '101031', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 32 },

  // Pharma
  { symbol: 'SUNPHARMA', instrumentToken: '3150849', exchangeToken: '12309', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 33 },
  { symbol: 'DRREDDY', instrumentToken: '225537', exchangeToken: '881', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 34 },
  { symbol: 'CIPLA', instrumentToken: '177665', exchangeToken: '694', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 35 },
  { symbol: 'DIVISLAB', instrumentToken: '2800641', exchangeToken: '10939', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 36 },
  { symbol: 'BIOCON', instrumentToken: '11459', exchangeToken: '11459', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 37 },

  // Metals & Mining
  { symbol: 'TATASTEEL', instrumentToken: '895745', exchangeToken: '3499', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 38 },
  { symbol: 'JSWSTEEL', instrumentToken: '3001089', exchangeToken: '11723', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 39 },
  { symbol: 'HINDALCO', instrumentToken: '348929', exchangeToken: '1363', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 40 },
  { symbol: 'COALINDIA', instrumentToken: '5215745', exchangeToken: '20374', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 41 },
  { symbol: 'VEDL', instrumentToken: '784129', exchangeToken: '3063', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 42 },

  // Oil & Gas
  { symbol: 'ONGC', instrumentToken: '633601', exchangeToken: '2475', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 43 },
  { symbol: 'IOC', instrumentToken: '415745', exchangeToken: '1624', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 44 },
  { symbol: 'BPCL', instrumentToken: '134657', exchangeToken: '526', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 45 },
  { symbol: 'GAIL', instrumentToken: '1207553', exchangeToken: '4717', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 46 },

  // Power & Energy
  { symbol: 'POWERGRID', instrumentToken: '3834113', exchangeToken: '14977', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 47 },
  { symbol: 'NTPC', instrumentToken: '2977281', exchangeToken: '11630', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 48 },
  { symbol: 'ADANIPOWER', instrumentToken: '4343041', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 49 },
  { symbol: 'TATAPOWER', instrumentToken: '877057', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 50 },

  // Cement
  { symbol: 'ULTRACEMCO', instrumentToken: '2952193', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 51 },
  { symbol: 'SHREECEM', instrumentToken: '556289', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 52 },
  { symbol: 'GRASIM', instrumentToken: '315393', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 53 },
  { symbol: 'ACC', instrumentToken: '5633', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 54 },

  // Real Estate
  { symbol: 'DLF', instrumentToken: '2129153', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 55 },
  { symbol: 'GODREJPROP', instrumentToken: '2918401', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 56 },
  { symbol: 'OBEROIRLTY', instrumentToken: '6187009', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 57 },

  // Infrastructure
  { symbol: 'LT', instrumentToken: '2939649', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 58 },
  { symbol: 'LTTS', instrumentToken: '10447361', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 59 },
  { symbol: 'SIEMENS', instrumentToken: '887553', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 60 },

  // Retail
  { symbol: 'AVENUE', instrumentToken: '13343745', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 61 },
  { symbol: 'TRENTLTD', instrumentToken: '758529', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 62 },
  { symbol: 'DMART', instrumentToken: '14977281', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 63 },

  // NBFCs
  { symbol: 'BAJFINANCE', instrumentToken: '81153', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 64 },
  { symbol: 'BAJAJFINSV', instrumentToken: '4268801', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 65 },
  { symbol: 'SHRIRAMFIN', instrumentToken: '2664193', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 66 },
  { symbol: 'CHOLAFIN', instrumentToken: '175361', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 67 },

  // Additional Banking
  { symbol: 'PNB', instrumentToken: '1081345', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 68 },
  { symbol: 'BANKBARODA', instrumentToken: '85761', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 69 },
  { symbol: 'CANBK', instrumentToken: '149249', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 70 },
  { symbol: 'FEDERALBNK', instrumentToken: '261889', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 71 },

  // Airlines
  { symbol: 'INDIGO', instrumentToken: '10099201', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 72 },
  { symbol: 'SPICEJET', instrumentToken: '2236417', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 73 },

  // Logistics
  { symbol: 'DELHIVERY', instrumentToken: '24222721', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 74 },
  { symbol: 'BLUEDART', instrumentToken: '4464129', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 75 },

  // E-commerce & Tech
  { symbol: 'NYKAA', instrumentToken: '24222465', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 76 },
  { symbol: 'POLICYBZR', instrumentToken: '22688769', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 77 },
  { symbol: 'ZOMATO', instrumentToken: '17007617', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 78 },
  { symbol: 'PAYTM', instrumentToken: '18007297', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 79 },

  // Additional IT
  { symbol: 'MINDTREE', instrumentToken: '3675137', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 80 },
  { symbol: 'MPHASIS', instrumentToken: '2674433', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 81 },
  { symbol: 'COFORGE', instrumentToken: '1895937', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 82 },
  { symbol: 'LTIM', instrumentToken: '25754369', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 83 },

  // Chemicals
  { symbol: 'UPL', instrumentToken: '2889473', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 84 },
  { symbol: 'PIDILITIND', instrumentToken: '681985', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 85 },
  { symbol: 'TATACHEM', instrumentToken: '873217', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 86 },

  // Textiles
  { symbol: 'ARVIND', instrumentToken: '60417', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 87 },
  { symbol: 'PAGEIND', instrumentToken: '647425', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 88 },

  // Insurance
  { symbol: 'SBILIFE', instrumentToken: '15835649', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 89 },
  { symbol: 'HDFCLIFE', instrumentToken: '15268609', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 90 },
  { symbol: 'ICICIPRULI', instrumentToken: '5258497', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 91 },

  // Metals - Additional
  { symbol: 'SAIL', instrumentToken: '758017', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 92 },
  { symbol: 'NMDC', instrumentToken: '601857', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 93 },
  { symbol: 'MOIL', instrumentToken: '269569', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 94 },

  // Healthcare
  { symbol: 'APOLLOHOSP', instrumentToken: '52353', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 95 },
  { symbol: 'FORTIS', instrumentToken: '2868225', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 96 },
  { symbol: 'MAXHEALTH', instrumentToken: '2763265', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 97 },

  // Entertainment
  { symbol: 'PVRINOX', instrumentToken: '6191105', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 98 },
  { symbol: 'ZEEL', instrumentToken: '975873', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 99 },

  // Utilities
  { symbol: 'TORNTPOWER', instrumentToken: '688641', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 100 },
  { symbol: 'TORNTPHARM', instrumentToken: '685825', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 101 },

  // Additional Auto
  { symbol: 'ASHOKLEY', instrumentToken: '54273', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 102 },
  { symbol: 'FORCEMOT', instrumentToken: '543489', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 103 },
  { symbol: 'ESCORTS', instrumentToken: '236033', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 104 },

  // Commodities Related
  { symbol: 'MCX', instrumentToken: '2885377', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 105 },
  { symbol: 'CDSL', instrumentToken: '16154113', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 106 },

  // Additional FMCG
  { symbol: 'MARICO', instrumentToken: '500010', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 107 },
  { symbol: 'GODREJCP', instrumentToken: '2904577', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 108 },
  { symbol: 'COLPAL', instrumentToken: '5258753', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 109 },

  // Additional Banking & Finance
  { symbol: 'IDFC', instrumentToken: '384001', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 110 },
  { symbol: 'IDFCFIRSTB', instrumentToken: '10812033', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 111 },
  { symbol: 'RBLBANK', instrumentToken: '5023745', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 112 },

  // Diversified
  { symbol: 'IGL', instrumentToken: '1846529', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 113 },
  { symbol: 'MGL', instrumentToken: '519425', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 114 },
  { symbol: 'PETRONET', instrumentToken: '2563329', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 115 },

  // Mid-cap Important Stocks
  { symbol: 'BALKRISIND', instrumentToken: '90369', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 116 },
  { symbol: 'CONCOR', instrumentToken: '169729', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 117 },
  { symbol: 'ADANIGREEN', instrumentToken: '15083265', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 118 },
  { symbol: 'ADANIENT', instrumentToken: '23558401', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 119 },
  { symbol: 'ADANIPORTS', instrumentToken: '4598529', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 120 },

  // Additional Pharma
  { symbol: 'LUPIN', instrumentToken: '522241', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 121 },
  { symbol: 'AUROPHARMA', instrumentToken: '70401', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 122 },
  { symbol: 'REDDY', instrumentToken: '225537', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 123 },

  // Specialty Stocks
  { symbol: 'HINDZINC', instrumentToken: '360961', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 124 },
  { symbol: 'INDIACEM', instrumentToken: '386049', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 125 },
  { symbol: 'JBCHEPHARM', instrumentToken: '6191873', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 126 },

  // Technology Services
  { symbol: 'PERSISTENT', instrumentToken: '3020801', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 127 },
  { symbol: 'MINDSPACE', instrumentToken: '2935809', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 128 },

  // Additional Infrastructure
  { symbol: 'BEL', instrumentToken: '113409', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 129 },
  { symbol: 'HAL', instrumentToken: '1355521', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 130 },
  { symbol: 'BHEL', instrumentToken: '118529', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 131 },

  // Consumer Goods
  { symbol: 'TITAN', instrumentToken: '897537', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 132 },
  { symbol: 'BATA', instrumentToken: '94977', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 133 },
  { symbol: 'RELAXO', instrumentToken: '3930625', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 134 },

  // Agricultural
  { symbol: 'RALLIS', instrumentToken: '708609', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 135 },
  { symbol: 'COROMANDEL', instrumentToken: '4749057', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 136 },

  // Renewable Energy
  { symbol: 'SUZLON', instrumentToken: '857857', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 137 },
  { symbol: 'GREENPANEL', instrumentToken: '2995457', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 138 },

  // Final High-Volume Stocks
  { symbol: 'YES BANK', instrumentToken: '397825', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 139 },
  { symbol: 'IRCTC', instrumentToken: '13894657', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 140 },
  { symbol: 'IRFC', instrumentToken: '27125249', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 141 },
  { symbol: 'RVNL', instrumentToken: '889601', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 142 },
  { symbol: 'HAL', instrumentToken: '1355521', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 143 },
  { symbol: 'BEL', instrumentToken: '113409', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 144 },
  { symbol: 'COCHINSHIP', instrumentToken: '172801', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 145 },
  { symbol: 'MAZAGON', instrumentToken: '10875649', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 146 },
  { symbol: 'GAIL', instrumentToken: '1207553', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 147 },
  { symbol: 'NHPC', instrumentToken: '590849', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 148 },
  { symbol: 'SJVN', instrumentToken: '2914049', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 149 },
  { symbol: 'HUDCO', instrumentToken: '7020289', exchange: 'NSE', segment: 'EQ', type: 'EQ', priority: 150 }
];

export const STOCK_CATEGORIES = {
  INDICES: ['NIFTY 50', 'NIFTY BANK', 'SENSEX', 'NIFTY IT', 'NIFTY AUTO'],
  BANKING: ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK', 'SBIN', 'AXISBANK', 'INDUSINDBK', 'BANDHANBNK', 'PNB', 'BANKBARODA', 'CANBK', 'FEDERALBNK'],
  IT: ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTI', 'MINDTREE', 'MPHASIS', 'COFORGE', 'LTIM'],
  FMCG: ['HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'DABUR', 'MARICO', 'GODREJCP', 'COLPAL'],
  AUTO: ['MARUTI', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'EICHERMOT', 'HEROMOTOCO', 'ASHOKLEY', 'FORCEMOT', 'ESCORTS'],
  PHARMA: ['SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'BIOCON', 'LUPIN', 'AUROPHARMA', 'TORNTPHARM'],
  METALS: ['TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'COALINDIA', 'VEDL', 'SAIL', 'NMDC', 'MOIL', 'HINDZINC'],
  ENERGY: ['RELIANCE', 'ONGC', 'IOC', 'BPCL', 'GAIL', 'POWERGRID', 'NTPC', 'ADANIPOWER', 'TATAPOWER']
};
