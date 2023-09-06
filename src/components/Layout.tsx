import { LogIn, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { Button } from "@/components/Atoms/Button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/Molecules/NavigationMenu";
import Loader from "./Atoms/Loader";

const UNALLOWED_UNAUTHED_PATHS = ["/"];
const NAVBAR_HIDDEN_PATHS = ["/auth", "/auth/reset"];

function Layout(props: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  if (status === "loading" && router.pathname !== "/") return <Loader background />;
  if (status === "unauthenticated" && UNALLOWED_UNAUTHED_PATHS.includes(router.pathname)) void router.push("/auth");
  if (status === "authenticated" && router.pathname === "/auth") void router.push("/");

  return (
    <main className="bg-bgc border-bc dark flex min-h-screen flex-col text-white">
      <div
        style={{ zIndex: 100 }}
        className={`bg-bgc/50 sticky top-0 flex h-14 items-center border-b backdrop-blur ${
          NAVBAR_HIDDEN_PATHS.includes(router.pathname) && "hidden"
        }`}>
        <Link href={"/"} className="mx-2 flex items-center justify-center gap-2">
          <h1 className="font-sans text-lg font-semibold md:block">Seeduwa Village Community</h1>
        </Link>
        <div className="ml-auto items-center gap-4">
          {/* <NavItems /> */}
          <AuthButton />
        </div>
      </div>
      <div
        style={{ zIndex: 50, position: "relative" }}
        className={`flex flex-grow flex-col items-center justify-center scroll-smooth text-white ${
          !NAVBAR_HIDDEN_PATHS.includes(router.pathname) && "my-10"
        }`}>
        {props.children}
      </div>
    </main>
  );
}

export default Layout;

function NavItems() {
  return (
    <NavigationMenu className="absolute left-1/2 -translate-x-1/2 transform">
      <NavigationMenuList>
        <Link href={"/user"}>
          <NavigationMenuItem className={`${navigationMenuTriggerStyle()} bg-bc hover:bg-bc/80 text-white`}>Users</NavigationMenuItem>
        </Link>
        <Link href={"/order"}>
          <NavigationMenuItem className={`${navigationMenuTriggerStyle()} bg-bc hover:bg-bc/80 text-white`}>Orders</NavigationMenuItem>
        </Link>
        <NavigationMenuItem>
          <Link href={"/product"}>
            <NavigationMenuTrigger className="bg-bc hover:bg-bc/80 text-white">Products</NavigationMenuTrigger>
          </Link>
          <NavigationMenuContent>
            <div className={`flex w-[400px] flex-col gap-3 p-4 md:grid-cols-2`}>
              <Link href={"/product"}>
                <NavigationMenuItem className={navigationMenuTriggerStyle()}>All Products</NavigationMenuItem>
              </Link>
              <Link href={"/product/new"}>
                <NavigationMenuItem className={navigationMenuTriggerStyle()}>Create Product</NavigationMenuItem>
              </Link>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link href={"/category"}>
            <NavigationMenuTrigger className="bg-bc hover:bg-bc/80 text-white">Categories</NavigationMenuTrigger>
          </Link>
          <NavigationMenuContent>
            <div className={`flex w-[400px] flex-col gap-3 p-4 md:grid-cols-2`}>
              <Link href={"/category"}>
                <NavigationMenuItem className={navigationMenuTriggerStyle()}>All Categories</NavigationMenuItem>
              </Link>
              <Link href={"/category/new"}>
                <NavigationMenuItem className={navigationMenuTriggerStyle()}>Create Category</NavigationMenuItem>
              </Link>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function AuthButton() {
  const { status } = useSession();
  const router = useRouter();

  return (
    <>
      {status === "unauthenticated" ? (
        <>
          <Button
            className="bg-bc hover:bg-bc/80 text-h6 hidden w-fit font-light text-white md:ml-auto md:mr-4 md:block"
            onClick={() => router.push("/auth")}>
            <LogIn />
          </Button>
        </>
      ) : (
        status === "authenticated" && (
          <Button className="bg-bc hover:bg-bc/80 hidden w-fit border-none md:ml-auto md:mr-4 md:flex" onClick={() => signOut()}>
            <LogOut color="white" onClick={() => signOut()} />
          </Button>
        )
      )}
    </>
  );
}
