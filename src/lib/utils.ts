import { clsx, type ClassValue } from "clsx";
import moment from "moment";
import { twMerge } from "tailwind-merge";
import { type NextRouter } from "next/router";

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
