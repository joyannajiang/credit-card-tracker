"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Home", href: "/dashboard" },
  { label: "Credit Cards", href: "/dashboard/cards" },
  { label: "Remaining Benefits", href: "/dashboard/remaining" },
  { label: "Redeemed Benefits", href: "/dashboard/redeemed" },
];

export function DashboardSidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <Link href="/dashboard" className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-md">
        <img
          src="/logo.png"
          alt="BenefitTrack logo"
          style={{ width: "40px", height: "40px", objectFit: "contain" }}
        />
      </Link>

      <nav className="space-y-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`flex min-h-11 items-center rounded-md px-3 py-2 text-sm transition ${
                isActive ? "bg-indigo-600 font-medium text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
