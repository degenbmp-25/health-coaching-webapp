import Link from "next/link"

import { navLinks } from "@/config/links"
import { siteConfig } from "@/config/site"

import { ModeToggle } from "../mode-toggle"

export default function Footer() {
  return (
    <footer className="mt-auto w-full">
      <div className="w-full px-4 py-6 md:py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-start">
          <Link href="/">
            <h1 className="text-xl font-bold sm:text-2xl">
              {siteConfig.name}
            </h1>
          </Link>
          <ul className="flex flex-wrap items-center justify-center gap-2 text-sm opacity-60 sm:gap-4">
            {navLinks.data.map((item, index) => {
              return (
                item.href && (
                  <li key={index}>
                    <Link
                      href={item.disabled ? "/" : item.href}
                      className="hover:underline"
                    >
                      {item.title}
                    </Link>
                  </li>
                )
              )
            })}
          </ul>
        </div>
        <hr className="my-4 text-muted-foreground sm:my-6" />
        <div className="text-center">
          <div className="text-sm text-muted-foreground sm:text-center">
            © {new Date().getFullYear()}{" "}
            <a
              target="_blank"
              href="https://github.com/redpangilinan/Habithletics"
              className="hover:underline"
            >
              Habithletics App
            </a>
            . All Rights Reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
