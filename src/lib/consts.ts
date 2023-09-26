export const ITEMS_PER_PAGE = 10;

export const LANE = ["1st Lane", "2nd Lane", "3rd Lane", "4th Lane", "5th Lane", "6th Lane", "7th Lane", "8th Lane", "Main road"];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

export const MEMBERS_PAYMENT_FILTER = ["All", "Paid", "Unpaid"];

export enum MEMBERS_PAYMENT_FILTER_ENUM {
  All = "All",
  Paid = "Paid",
  Unpaid = "Unpaid",
}
