const fs = require("fs");

// Read the TypeScript file as text and extract the array
const fileContent = fs.readFileSync(
  "./src/config/important-stocks-enhanced.ts",
  "utf8"
);

// Extract symbols using regex
const symbolMatches = fileContent.match(/symbol:\s*'([^']+)'/g);
const symbols = symbolMatches
  ? symbolMatches.map((match) => match.match(/'([^']+)'/)[1])
  : [];

// Extract instrument tokens
const tokenMatches = fileContent.match(/instrumentToken:\s*'([^']+)'/g);
const tokens = tokenMatches
  ? tokenMatches.map((match) => match.match(/'([^']+)'/)[1])
  : [];

// Extract priorities
const priorityMatches = fileContent.match(/priority:\s*(\d+)/g);
const priorities = priorityMatches
  ? priorityMatches.map((match) => parseInt(match.match(/(\d+)/)[1]))
  : [];

console.log("=== STOCK DATA VALIDATION ===");
console.log("Total stocks found:", symbols.length);
console.log("Distinct symbols:", new Set(symbols).size);
console.log("Distinct instrument tokens:", new Set(tokens).size);
console.log(
  "Priority range:",
  Math.min(...priorities),
  "to",
  Math.max(...priorities)
);

// Check for duplicates
const duplicateSymbols = symbols.filter(
  (symbol, index) => symbols.indexOf(symbol) !== index
);
const duplicateTokens = tokens.filter(
  (token, index) => tokens.indexOf(token) !== index
);

if (duplicateSymbols.length > 0) {
  console.log("⚠️  Duplicate symbols found:", [...new Set(duplicateSymbols)]);
}

if (duplicateTokens.length > 0) {
  console.log("⚠️  Duplicate instrument tokens found:", [
    ...new Set(duplicateTokens),
  ]);
}

if (
  symbols.length === 150 &&
  new Set(symbols).size === 150 &&
  new Set(tokens).size === 150
) {
  console.log(
    "✅ SUCCESS: 150 distinct stocks with unique symbols and instrument tokens"
  );
} else {
  console.log("❌ ISSUE: Expected 150 distinct stocks");
}

// Show first 10 and last 10 stocks
console.log("\n=== FIRST 10 STOCKS ===");
symbols.slice(0, 10).forEach((symbol, index) => {
  console.log(`${index + 1}. ${symbol} (Token: ${tokens[index]})`);
});

console.log("\n=== LAST 10 STOCKS ===");
symbols.slice(-10).forEach((symbol, index) => {
  const actualIndex = symbols.length - 10 + index;
  console.log(`${actualIndex + 1}. ${symbol} (Token: ${tokens[actualIndex]})`);
});
