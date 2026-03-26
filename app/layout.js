import { Syne, DM_Sans } from 'next/font/google'
import './globals.css'

const syne = Syne({ subsets: ['latin'], variable: '--font-syne', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm', display: 'swap' })

export const metadata = {
  title: 'GolfDraw — Play. Give. Win.',
  description: 'A subscription golf platform combining performance tracking, charity, and monthly prize draws.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="bg-[#0a0a0f] text-white font-dm antialiased">
        {children}
      </body>
    </html>
  )
}
