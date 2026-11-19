import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "索亚恒泰 · 饰面美学",
  description: "探索饰面产品、真实花色与空间灵感。",
  icons: {icon:"/favicon.svg"},
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
