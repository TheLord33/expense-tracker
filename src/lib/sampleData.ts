import { Expense } from "./types";

export const SAMPLE_EXPENSES: Omit<Expense, "id">[] = [
  // May 2026
  { date: "2026-05-22", category: "Food", description: "Whole Foods weekly grocery run", amount: 94.37 },
  { date: "2026-05-21", category: "Transport", description: "Uber to airport", amount: 38.50 },
  { date: "2026-05-20", category: "Food", description: "Chipotle lunch", amount: 14.25 },
  { date: "2026-05-19", category: "Entertainment", description: "Netflix subscription", amount: 15.49 },
  { date: "2026-05-18", category: "Healthcare", description: "CVS pharmacy — prescriptions", amount: 42.00 },
  { date: "2026-05-16", category: "Food", description: "Trader Joe's", amount: 67.82 },
  { date: "2026-05-15", category: "Shopping", description: "Amazon — desk lamp", amount: 34.99 },
  { date: "2026-05-14", category: "Food", description: "Blue Bottle Coffee", amount: 6.75 },
  { date: "2026-05-12", category: "Transport", description: "Monthly subway pass", amount: 132.00 },
  { date: "2026-05-10", category: "Housing", description: "Electricity bill", amount: 88.14 },
  { date: "2026-05-08", category: "Food", description: "Date night — Nobu", amount: 187.40 },
  { date: "2026-05-05", category: "Entertainment", description: "Spotify Premium", amount: 10.99 },
  { date: "2026-05-03", category: "Shopping", description: "Zara — summer clothes", amount: 112.00 },
  { date: "2026-05-01", category: "Housing", description: "May rent", amount: 2100.00 },

  // April 2026
  { date: "2026-04-28", category: "Food", description: "Whole Foods grocery run", amount: 101.55 },
  { date: "2026-04-26", category: "Healthcare", description: "Dentist co-pay", amount: 75.00 },
  { date: "2026-04-24", category: "Entertainment", description: "Movie tickets × 2", amount: 29.00 },
  { date: "2026-04-22", category: "Food", description: "Thai takeout", amount: 38.90 },
  { date: "2026-04-20", category: "Transport", description: "Gas station", amount: 55.00 },
  { date: "2026-04-18", category: "Shopping", description: "IKEA — shelf unit", amount: 79.00 },
  { date: "2026-04-15", category: "Food", description: "Starbucks", amount: 8.45 },
  { date: "2026-04-12", category: "Entertainment", description: "Museum membership", amount: 120.00 },
  { date: "2026-04-10", category: "Housing", description: "Internet bill", amount: 69.99 },
  { date: "2026-04-07", category: "Food", description: "Trader Joe's", amount: 74.33 },
  { date: "2026-04-05", category: "Transport", description: "Lyft rides (weekly)", amount: 47.20 },
  { date: "2026-04-01", category: "Housing", description: "April rent", amount: 2100.00 },

  // March 2026
  { date: "2026-03-29", category: "Healthcare", description: "Annual physical co-pay", amount: 40.00 },
  { date: "2026-03-25", category: "Food", description: "Whole Foods grocery run", amount: 89.20 },
  { date: "2026-03-22", category: "Shopping", description: "Nike running shoes", amount: 134.95 },
  { date: "2026-03-18", category: "Entertainment", description: "Concert tickets", amount: 95.00 },
  { date: "2026-03-15", category: "Food", description: "Weekly groceries — Trader Joe's", amount: 62.45 },
  { date: "2026-03-12", category: "Transport", description: "Car insurance payment", amount: 210.00 },
  { date: "2026-03-08", category: "Food", description: "Brunch with friends", amount: 52.00 },
  { date: "2026-03-05", category: "Housing", description: "Renter's insurance", amount: 22.50 },
  { date: "2026-03-01", category: "Housing", description: "March rent", amount: 2100.00 },
];
