import { Coins, LogOut, Menu, Plus, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { Button } from "@/components/Atoms/Button";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import Loader from "../Atoms/Loader";
import { Separator } from "../Atoms/Separator";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "../Molecules/NavigationMenu";
import { Sheet, SheetContent, SheetTrigger } from "../Molecules/Sheet";
import CreateMember from "../Templates/CreateMember";
import CreateRecord from "../Templates/CreateRecord";
import CreateRecordForMember from "../Templates/CreateRecordForMember";
import EditMember from "../Templates/EditMember";
import EditRecord from "../Templates/EditRecord";

const UNALLOWED_UNAUTHED_PATHS = ["/"];
const NAVBAR_HIDDEN_PATHS = ["/auth", "/auth/reset"];

function Layout(props: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  const HOC = useCallback(
    () => (
      <>
        <CreateRecord />
        <CreateMember />
        <CreateRecordForMember />
        <EditRecord />
        <EditMember />
      </>
    ),
    [],
  );

  const NavBar = useCallback(
    () => (
      <>
        <NavItems />
        <NavSheet />
      </>
    ),
    [],
  );

  if (status === "loading" && router.pathname !== "/") return <Loader background />;
  if (status === "unauthenticated" && UNALLOWED_UNAUTHED_PATHS.includes(router.pathname)) void router.push("/auth");
  if (status === "authenticated" && router.pathname === "/auth") void router.push("/");

  return (
    <main className="dark flex min-h-screen min-w-fit flex-col overflow-hidden border-bc bg-bgc text-white">
      <div
        style={{ zIndex: 100 }}
        className={`sticky top-0 flex h-14 items-center border-b bg-bgc/50 backdrop-blur ${
          NAVBAR_HIDDEN_PATHS.includes(router.pathname) && "hidden"
        }`}>
        <Link href={"/"} className="mx-4 flex items-center justify-center gap-2">
          <h1 className="font-sans text-lg font-semibold md:block">Seeduwa Village Community</h1>
        </Link>
        <NavBar />
        <LogOut onClick={() => signOut()} className="ml-auto mr-4 hidden cursor-pointer md:block" />
      </div>
      <div
        style={{ zIndex: 50, position: "relative" }}
        className={`flex flex-grow flex-col items-center justify-center scroll-smooth text-white  ${
          !NAVBAR_HIDDEN_PATHS.includes(router.pathname) && "my-10"
        }`}>
        <>
          <HOC />
          {props.children}
        </>
      </div>
    </main>
  );
}

export default Layout;

function NavSheet() {
  const { status } = useSession();
  const { width } = useWindowDimensions();
  const [openSheet, setOpenSheet] = useState(false);
  const router = useRouter();

  useEffect(() => setOpenSheet(false), [router.pathname, router.query]);

  useEffect(() => {
    if (openSheet && width > 768) {
      setOpenSheet(false);
    }
  }, [openSheet, width]);

  return (
    <Sheet open={openSheet} onOpenChange={(open) => setOpenSheet(open)}>
      <SheetTrigger name="Hamburger menu icon" className="ml-auto mr-2 block md:hidden">
        <Menu />
      </SheetTrigger>
      <SheetContent className="dark mt-14 block">
        <div className="flex h-full flex-col items-center justify-start gap-4 px-4 py-12">
          {status === "unauthenticated" && <Link href={"/auth"}>Sign in</Link>}
          {status === "authenticated" && (
            <>
              <div className="flex w-full flex-col items-center justify-center gap-4">
                <Button className="bg-white" variant={"ghost"} onClick={() => router.push("/member")}>
                  View all members
                </Button>
                <Button
                  className="bg-white"
                  variant={"ghost"}
                  onClick={() => router.push({ query: { ...router.query, create: "member" } }, undefined, { shallow: true })}>
                  Add new member
                </Button>
                <Separator />
                <Button className="bg-white" variant={"ghost"} onClick={() => router.push("/member")}>
                  View all payment records
                </Button>
                <Button
                  className="bg-white"
                  variant={"ghost"}
                  onClick={() => router.push({ query: { ...router.query, create: "record" } }, undefined, { shallow: true })}>
                  Add new payment record
                </Button>
              </div>
              <Separator />
              <div className="flex-col items-center justify-center gap-4">
                <Button className="bg-white" variant={"ghost"} onClick={() => signOut()}>
                  Log out
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NavItems() {
  const router = useRouter();

  return (
    <NavigationMenu className="absolute left-1/2 hidden -translate-x-1/2 transform md:block">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger onClick={() => router.push("/member")}>Members</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className={`flex w-[250px] flex-col gap-3 p-4 md:grid-cols-2`}>
              <Link href={"/member"}>
                <NavigationMenuItem style={{ width: "100%" }} className={navigationMenuTriggerStyle()}>
                  View all members <User className="ml-auto" />
                </NavigationMenuItem>
              </Link>
              <NavigationMenuItem
                style={{ width: "100%" }}
                className={navigationMenuTriggerStyle()}
                onClick={() => router.push({ query: { ...router.query, create: "member" } }, undefined, { shallow: true })}>
                Add new member
                <Plus className="ml-auto" />
              </NavigationMenuItem>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger onClick={() => router.push("/record")}>Records</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className={`flex w-[300px] flex-col gap-3 p-4 md:grid-cols-2`}>
              <Link href={"/record"}>
                <NavigationMenuItem style={{ width: "100%" }} className={navigationMenuTriggerStyle()}>
                  View all payment records
                  <Coins className="ml-auto" />
                </NavigationMenuItem>
              </Link>
              <NavigationMenuItem
                style={{ width: "100%" }}
                className={navigationMenuTriggerStyle()}
                onClick={() => router.push({ query: { ...router.query, create: "record" } }, undefined, { shallow: true })}>
                Add new payment record
                <Plus className="ml-auto" />
              </NavigationMenuItem>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
