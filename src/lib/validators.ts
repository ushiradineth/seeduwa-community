import { isValidPhoneNumber } from "react-phone-number-input";
import * as yup from "yup";

import { RECORD_TYPE } from "./consts";

export const LoginSchema = yup
  .object()
  .shape({
    Password: yup
      .string()
      .required()
      .min(8)
      .max(20)
      .matches(/(?=.*[A-Z])/, "Password must have atleast one Uppercase Character")
      .matches(/(?=.*[0-9])/, "Password must have atleast one Number")
      .matches(/(?=.*[!@#\$%\^&\*])/, "Password must have atleast one Special Character"),
    Username: yup.string().min(1).max(500).required(),
  })
  .required();

export type LoginFormData = yup.InferType<typeof LoginSchema>;

export const CreateMemberSchema = yup.object().shape({
  Lane: yup.string().min(1).max(500).required(),
  House: yup.string().min(1).max(500).required(),
  Number: yup
    .string()
    .trim()
    .test("is-number", "Phone number is not valid", (value) => {
      return isValidPhoneNumber(String(value));
    })
    .required("Phone number is required"),
  Name: yup.string().min(1).max(500).required(),
});

export type CreateMemberFormData = yup.InferType<typeof CreateMemberSchema>;

export const CreatePaymentSchema = yup.object().shape({
  PaymentDate: yup.date().required("Payment Date is required"),
  Months: yup.array(yup.date().required()).required().min(1, "Atleast one month should be picked"),
  Partial: yup.boolean().default(false),
  Amount: yup.number().required(),
  Member: yup.string().required(),
  HouseID: yup.string().required(),
  Lane: yup.string().required(),
  Notify: yup.boolean().default(false),
  Text: yup.string().default(""),
});

export type CreatePaymentFormData = yup.InferType<typeof CreatePaymentSchema>;

export const CreatePaymentForMemberSchema = yup.object().shape({
  PaymentDate: yup.date().required("Payment Date is required"),
  Months: yup.array(yup.date().required()).required().min(1, "Atleast one month should be picked"),
  Partial: yup.boolean().default(false),
  Amount: yup.number().required(),
  Member: yup.string().required(),
  Notify: yup.boolean().default(false),
  Text: yup.string().default(""),
});

export type CreatePaymentForMemberFormData = yup.InferType<typeof CreatePaymentForMemberSchema>;

export const EditPaymentSchema = yup.object().shape({
  PaymentDate: yup.date().required("Payment Date is required"),
  Partial: yup.boolean().default(false),
  Amount: yup.number().required(),
});

export type EditPaymentFormData = yup.InferType<typeof EditPaymentSchema>;

export const NotifyUnpaidMembersSchema = yup.object().shape({
  Text: yup.string().default(""),
  Month: yup.date().required("A month should be picked"),
  Amount: yup.number().required(),
});

export type NotifyUnpaidMembersFormData = yup.InferType<typeof NotifyUnpaidMembersSchema>;

export const BroadcastSchema = yup.object().shape({
  Text: yup.string().default("").min(1, "Broadcast message should not be empty"),
});

export type BroadcastFormData = yup.InferType<typeof BroadcastSchema>;

export const CreateRecordSchema = yup.object().shape({
  Months: yup.array(yup.date().required()).required().min(1, "Atleast one month should be picked"),
  RecordDate: yup.date().required("Record Date is required"),
  RecordType: yup.string().oneOf(RECORD_TYPE, `Record Type has to be either Income or Expense`).required("Record Type is required"),
  Amount: yup.number().required(),
  Name: yup.string().required(),
});

export type CreateRecordFormData = yup.InferType<typeof CreateRecordSchema>;

export const EditRecordSchema = yup.object().shape({
  RecordDate: yup.date().required("Record Date is required"),
  RecordType: yup.string().oneOf(RECORD_TYPE, `Record Type has to be either Income or Expense`).required("Record Type is required"),
  Amount: yup.number().required(),
  Name: yup.string().required(),
});

export type EditRecordFormData = yup.InferType<typeof EditRecordSchema>;
