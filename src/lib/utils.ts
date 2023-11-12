import { clsx, type ClassValue } from "clsx";
import moment from "moment";
import { twMerge } from "tailwind-merge";
import { type NextRouter } from "next/router";

import { MONTHS } from "./consts";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formalizeDate(input: Date) {
  const options = {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };

  const date = new Date(input);

  // @ts-expect-error Type not available
  const formattedDate = date.toLocaleString("en-US", options);

  const parts = formattedDate.split(", ");

  const datePart = parts[0]?.split("/");

  return `${parts[1]}, ${datePart?.[2]}/${datePart?.[0]}/${datePart?.[1]}`;
}

export function generalizeDate(input: Date) {
  return moment(input).fromNow();
}

export const removeQueryParamsFromRouter = (router: NextRouter, removeList: string[]) => {
  if (removeList.length > 0) {
    removeList.forEach((param) => delete router.query[param]);
  } else {
    // Remove all
    Object.keys(router.query).forEach((param) => delete router.query[param]);
  }

  return router.query;
};

export function commonAttribute(
  member: {
    name: string;
    houseId: string;
    lane: string;
    phoneNumber: string;
  },
  input: {
    name: string;
    houseId: string;
    lane: string;
    phoneNumber: string;
  },
) {
  if (member.name === input.name) return "name";
  else if (member.houseId === input.houseId && member.lane === input.lane) return "address";
  else if (member.houseId === input.houseId) return "house number";
  else if (member.phoneNumber === input.phoneNumber) return "phone number";
}

export function s2ab(s: string): ArrayBuffer {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xff;
  }
  return buf;
}

export function generateMessage(amount: number, months: Date[]) {
  return `Your payment of ${amount * months.length} LKR ${months.length > 1 ? `(${amount} LKR Per Month) ` : ""}for ${months
    .map(
      (month, index) =>
        `${MONTHS[month.getMonth()]} ${month.getFullYear()}${
          index !== months.length - 1 ? (index === months.length - 2 ? " and " : ", ") : ""
        }`,
    )
    .join("")} has been received. Thank you!`;
}
