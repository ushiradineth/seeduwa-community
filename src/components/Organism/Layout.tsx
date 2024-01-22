import { Coins, LogOut, Mail, Menu, Plus, Receipt, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

import { Button } from "@/components/Atoms/Button";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import icon from "../../../public/icon.jpeg";
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
import BroadcastMessage from "../Templates/BroadcastMessage";
import CreateMember from "../Templates/CreateMember";
import CreatePayment from "../Templates/CreatePayment";
import CreatePaymentForMember from "../Templates/CreatePaymentForMember";
import CreateRecord from "../Templates/CreateRecord";
import EditMember from "../Templates/EditMember";
import EditPayment from "../Templates/EditPayment";
import EditRecord from "../Templates/EditRecord";
import NotifyUnpaidMembers from "../Templates/NotifyUnpaidMembers";

const NAVBAR_HIDDEN_PATHS = ["/auth", "/auth/reset"];

function Layout(props: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  const Popups = useCallback(
    () => (
      <>
        <CreatePayment />
        <CreateMember />
        <CreatePaymentForMember />
        <EditPayment />
        <EditMember />
        <NotifyUnpaidMembers />
        <BroadcastMessage />
        <CreateRecord />
        <EditRecord />
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

  if (status === "loading") return <Loader background />;
  if (status === "unauthenticated" && !router.pathname.startsWith("/auth")) void router.push("/auth");
  if (status === "authenticated" && router.pathname.startsWith("/auth")) void router.push("/");

  return (
    <main className="dark flex min-h-screen flex-col border-bc bg-bgc text-white">
      <div
        style={{ zIndex: 100 }}
        className={`sticky top-0 flex h-14 items-center border-b bg-bgc/50 backdrop-blur ${
          NAVBAR_HIDDEN_PATHS.includes(router.pathname) && "hidden"
        }`}>
        <Link href={"/"} className="flex items-center justify-center gap-2">
          <Image src={icon} alt="Seeduwa Village Security Association Logo" width={30} className="ml-4" />
          <h1 className="font-sans text-lg font-semibold md:block">SVSA</h1>
        </Link>
        <NavBar />
        <LogOut onClick={() => signOut()} className="ml-auto mr-4 hidden cursor-pointer md:block" />
      </div>
      <div className="flex w-full flex-grow items-center justify-center px-4">
        <div
          style={{ zIndex: 50, position: "relative" }}
          className={`flex max-w-fit flex-grow flex-col justify-center overflow-hidden scroll-smooth text-white ${
            !NAVBAR_HIDDEN_PATHS.includes(router.pathname) && "my-10"
          }`}>
          <Popups />
          {props.children}
        </div>
      </div>
      <div className="bottom-0 left-0 z-[100000] flex h-12 w-screen items-center justify-center border-t bg-bgc">
        <Link
          className="flex h-full w-full items-center justify-center gap-2"
          href="mailto:ushiradineth@gmail.com?subject=SVSA%20Website%20Issue&body=Hello%20SVSA%20Admin,%0A%0AI%20am%20facing%20the%20following%20issue:%20[Describe%20the%20issue%20here].%0A%0AThank%20you,%0A[Your%20Name]">
          Contact Support <Mail />
        </Link>
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
        <div className="flex h-full flex-col items-end justify-start pb-12 pt-4">
          {status === "unauthenticated" && <Link href={"/auth"}>Sign in</Link>}
          {status === "authenticated" && (
            <>
              <div className="flex w-full flex-col items-end justify-center">
                <SheetButton onClick={() => router.push("/member")}>
                  Members <User />
                </SheetButton>
                <SheetButton onClick={() => router.push({ query: { ...router.query, create: "member" } }, undefined, { shallow: true })}>
                  New Member <Plus />
                </SheetButton>
                <Separator className="my-4" />
                <SheetButton onClick={() => router.push("/payment")}>
                  Payments <Coins />
                </SheetButton>
                <SheetButton onClick={() => router.push({ query: { ...router.query, create: "payment" } }, undefined, { shallow: true })}>
                  New Payment <Plus />
                </SheetButton>
                <Separator className="my-4" />
                <SheetButton onClick={() => router.push("/record")}>
                  Records <Receipt />
                </SheetButton>
                <SheetButton onClick={() => router.push({ query: { ...router.query, create: "record" } }, undefined, { shallow: true })}>
                  New Record <Plus />
                </SheetButton>
              </div>
              <div className="mt-auto">
                <SheetButton onClick={() => signOut()}>
                  Log out <LogOut />
                </SheetButton>
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
          <NavigationMenuTrigger>Members</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className={`flex w-[250px] flex-col gap-3 p-4 md:grid-cols-2`}>
              <Link href={"/member"}>
                <NavigationMenuItem style={{ width: "100%" }} className={navigationMenuTriggerStyle()}>
                  Members <User className="ml-auto" />
                </NavigationMenuItem>
              </Link>
              <NavigationMenuItem
                style={{ width: "100%" }}
                className={navigationMenuTriggerStyle()}
                onClick={() => router.push({ query: { ...router.query, create: "member" } }, undefined, { shallow: true })}>
                New Member
                <Plus className="ml-auto" />
              </NavigationMenuItem>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Payments</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className={`flex w-[300px] flex-col gap-3 p-4 md:grid-cols-2`}>
              <Link href={"/payment"}>
                <NavigationMenuItem style={{ width: "100%" }} className={navigationMenuTriggerStyle()}>
                  Payments
                  <Coins className="ml-auto" />
                </NavigationMenuItem>
              </Link>
              <NavigationMenuItem
                style={{ width: "100%" }}
                className={navigationMenuTriggerStyle()}
                onClick={() => router.push({ query: { ...router.query, create: "payment" } }, undefined, { shallow: true })}>
                New Payment
                <Plus className="ml-auto" />
              </NavigationMenuItem>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Records</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className={`flex w-[300px] flex-col gap-3 p-4 md:grid-cols-2`}>
              <Link href={"/record"}>
                <NavigationMenuItem style={{ width: "100%" }} className={navigationMenuTriggerStyle()}>
                  Records
                  <Receipt className="ml-auto" />
                </NavigationMenuItem>
              </Link>
              <NavigationMenuItem
                style={{ width: "100%" }}
                className={navigationMenuTriggerStyle()}
                onClick={() => router.push({ query: { ...router.query, create: "record" } }, undefined, { shallow: true })}>
                New Record
                <Plus className="ml-auto" />
              </NavigationMenuItem>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function SheetButton({ onClick, children }: { onClick: () => void; children: React.ReactNode | string }) {
  return (
    <Button className="h-fit gap-2 text-white" variant={"ghost"} onClick={onClick}>
      {children}
    </Button>
  );
}
