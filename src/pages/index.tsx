import Head from "next/head";
import { useRouter } from "next/router";

import { Button } from "@/components/Atoms/Button";

export default function Home() {
  const router = useRouter();
  return (
    <>
      <Head>
        <title>Seeduwa Community</title>
      </Head>
      <main className="flex flex-col items-center justify-center bg-primary">
        <Button onClick={() => router.push("/asd")}>asd</Button>
      </main>
    </>
  );
}
