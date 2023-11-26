import { yupResolver } from "@hookform/resolvers/yup";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { getSession, signIn, useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useState } from "react";
import { type GetServerSideProps } from "next";
import Head from "next/head";

import { Button } from "@/components/Atoms/Button";
import FormFieldError from "@/components/Atoms/FormFieldError";
import { Input } from "@/components/Atoms/Input";
import { Label } from "@/components/Atoms/Label";
import Loader from "@/components/Atoms/Loader";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/Molecules/Card";
import { LoginSchema, type LoginFormData } from "@/lib/validators";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession({ ctx: context });

  if (session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
      props: {},
    };
  }

  return {
    props: {},
  };
};

export default function Auth() {
  const { status } = useSession();

  if (status === "loading") return <Loader background />;

  return (
    <>
      <Head>
        <title>Login to the website</title>
      </Head>
      <>
        <Card className="mt-2 w-full">
          <Login />
        </Card>
      </>
    </>
  );
}

function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(LoginSchema),
  });

  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    const auth = await signIn("credentials", { username: data.Username, password: data.Password, redirect: false, callbackUrl: "/" });
    auth?.status === 401 && setError("Incorrect Credentials");
    if (auth?.status !== 401 && auth?.error) {
      console.error(auth.error);
      toast.error("An unknown error has occured");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="md:min-w-[400px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your Admin Credentials here</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="name">Username</Label>
            <Input id="username" placeholder="admin" {...register("Username")} />
            <FormFieldError error={errors.Username?.message} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <div className="mb-10 flex h-fit w-full items-center justify-center gap-x-2 rounded-md border border-input bg-background">
              <Input
                className="border-0"
                id="password"
                placeholder="*****"
                type={isEnabled ? "text" : "password"}
                {...register("Password")}
                onChange={async (e) => {
                  await register("Password").onChange(e);
                  setError("");
                }}
              />
              <button onClick={() => setIsEnabled(!isEnabled)} className="mr-2 cursor-pointer" color={isEnabled ? "gray" : "white"}>
                {isEnabled ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
            <FormFieldError error={errors.Password?.message ?? error} />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" loading={loading}>
            Login
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
