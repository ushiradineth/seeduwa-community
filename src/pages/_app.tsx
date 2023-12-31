import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";

import { api } from "@/utils/api";

import "@/styles/globals.css";

import { Analytics } from "@vercel/analytics/react";
import NextNProgress from "nextjs-progressbar";
import { ToastContainer } from "react-toastify";
import { DM_Sans, Libre_Baskerville } from "next/font/google";

import "react-toastify/dist/ReactToastify.css";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { XIcon } from "lucide-react";
import { AxiomWebVitals } from "next-axiom";

import Layout from "@/components/Organism/Layout";

const dmsans = DM_Sans({
  weight: ["700"],
  subsets: ["latin"],
  variable: "--font-sans",
});
const libre = Libre_Baskerville({
  weight: ["700"],
  subsets: ["latin"],
  variable: "--font-libre",
});

const MyApp: AppType<{ session: Session | null }> = ({ Component, pageProps: { session, ...pageProps } }) => {
  return (
    <SessionProvider session={session}>
      <Layout>
        <NextNProgress
          color="#FFF6ED"
          startPosition={0.3}
          stopDelayMs={200}
          height={3}
          showOnShallow={false}
          options={{ showSpinner: false }}
        />
        <AxiomWebVitals />
        <SpeedInsights />
        <Analytics />
        <style jsx global>
          {`
            :root {
              --font-sans: ${dmsans.style.fontFamily};
              --font-libre: ${libre.style.fontFamily};
            }
          `}
        </style>
        <Component {...pageProps} />
        <ToastContainer
          position="bottom-right"
          toastClassName={() =>
            "bg-bgc border border-primary border relative flex p-2 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer"
          }
          bodyClassName={() => "text-sm text-white font-medium block flex flex-row p-3"}
          autoClose={5000}
          hideProgressBar
          newestOnTop={false}
          closeOnClick
          rtl={false}
          closeButton={<XIcon color={"white"} />}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </Layout>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
