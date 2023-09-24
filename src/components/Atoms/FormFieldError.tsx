function FormFieldError(props: { error?: string }) {
  return props.error ? <p className="flex w-full items-center justify-center pb-2 text-red-400">{props.error}</p> : null;
}

export default FormFieldError;
