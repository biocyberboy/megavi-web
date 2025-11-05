# MEGAVI – ## Error Type
Build Error

## Error Message
Parsing ecmascript source code failed

## Build Output
./src/components/LatestPriceSnapshot.tsx:209:13
Parsing ecmascript source code failed
  207 |                 </div>
  208 |               </div>
> 209 |             })}
      |             ^
  210 |           </div>
  211 |         )}
  212 |       </div>

Expected '</', got '}'

Import traces:
  Client Component Browser:
    ./src/components/LatestPriceSnapshot.tsx [Client Component Browser]
    ./src/components/PriceDashboardTabs.tsx [Client Component Browser]
    ./src/components/PriceDashboardTabs.tsx [Server Component]
    ./src/app/gia/page.tsx [Server Component]

  Client Component SSR:
    ./src/components/LatestPriceSnapshot.tsx [Client Component SSR]
    ./src/components/PriceDashboardTabs.tsx [Client Component SSR]
    ./src/components/PriceDashboardTabs.tsx [Server Component]
    ./src/app/gia/page.tsx [Server Component]

Next.js version: 16.0.1 (Turbopack)

- Tone: #b30d0d, #f7c948, #0b0b0b, #f6f7f9
- Font: Serif tiêu đề (Playfair/Cormorant), Sans nội dung (Inter/Manrope)
- Hero full-screen + black overlay 50%; CTA pill
- Animation: fade-in nhẹ; parallax optional
- Section: Hero, Blog, Bảng giá (chart), Subscribe, Footer
