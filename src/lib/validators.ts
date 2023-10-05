import { isValidPhoneNumber } from "react-phone-number-input";
import * as yup from "yup";

export const idValidator = yup.string().max(30).required();
export const textValidator = yup.string().min(1).max(500).required();
export const emailValidator = yup.string().email().required();
export const nameValidator = yup.string().min(1).max(100).required();
export const urlValidator = yup.string().url().required();
export const fileValidator = yup.string().required();
export const numberValidator = yup.number().required();
export const pointsValidator = yup.array(yup.string().min(1).max(200).required()).nonNullable().required();
export const periodValidtor = yup.number().min(1).max(365).oneOf([1, 7, 28, 365], "Period has to be either 1, 7, 28, or 365").required();
export const otpValidtor = yup.string().min(1).max(6).required();

export const passwordValidator = yup
  .string()
  .required()
  .min(8)
  .max(20)
  .matches(/(?=.*[A-Z])/, "Password must have atleast one Uppercase Character")
  .matches(/(?=.*[0-9])/, "Password must have atleast one Number")
  .matches(/(?=.*[!@#\$%\^&\*])/, "Password must have atleast one Special Character");

export const LoginSchema = yup
  .object()
  .shape({
    Password: passwordValidator,
    Username: textValidator,
  })
  .required();

export type LoginFormData = yup.InferType<typeof LoginSchema>;

export const CreateMemberSchema = yup.object().shape({
  Lane: textValidator,
  House: textValidator,
  Number: yup
    .string()
    .trim()
    .test("is-number", "Phone number is not valid", (value) => {
      return isValidPhoneNumber(String(value));
    })
    .required("Phone number is required"),
  Name: textValidator,
});

export type CreateMemberFormData = yup.InferType<typeof CreateMemberSchema>;

export const CreateRecordSchema = yup.object().shape({
  Year: numberValidator,
  Month: yup.number().min(0).max(11).required(),
  Amount: numberValidator,
  Member: yup.string().required(),
});

export type CreateRecordFormData = yup.InferType<typeof CreateRecordSchema>;

export const CreateRecordForMemberSchema = yup.object().shape({
  Year: numberValidator,
  Month: yup.number().min(0).max(11).required(),
  Amount: numberValidator,
  Member: yup.string().required(),
});

export type CreateRecordForMemberFormData = yup.InferType<typeof CreateRecordForMemberSchema>;

export const EditRecordSchema = yup.object().shape({
  Amount: numberValidator,
});

export type EditRecordFormData = yup.InferType<typeof EditRecordSchema>;
