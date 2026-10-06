import Script from "next/script"
import { MetrikaPageHits } from "@/components/metrika-page-hits"
import { METRIKA_ID } from "@/lib/analytics"

const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

/**
 * Yandex Metrika (NEXT_PUBLIC_YM_ID) with Webvisor and funnel goals, plus
 * optional self-hosted Umami. Each renders nothing until its env vars are set.
 */
export function Analytics() {
  if (process.env.NODE_ENV !== "production") return null
  return (
    <>
      {METRIKA_ID > 0 && (
        <>
          <Script id="ym-init" strategy="afterInteractive">
            {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(${METRIKA_ID},"init",{defer:true,clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}
          </Script>
          <MetrikaPageHits />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://mc.yandex.ru/watch/${METRIKA_ID}`} style={{ position: "absolute", left: "-9999px" }} alt="" />
          </noscript>
        </>
      )}
      {umamiUrl && umamiId && <Script src={umamiUrl} data-website-id={umamiId} strategy="afterInteractive" />}
    </>
  )
}
