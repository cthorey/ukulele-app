import type { SongSource } from './song.ts';

// Hawaiianische Lieder ohne Melodie (Akkorde + Text), beide aus den 1870er-Jahren und gemeinfrei. Text im
// hawaiianischen Original nach dem Abschnitt „Lyrics“ des jeweiligen Wikipedia-Artikels, Akkorde als eigene
// einfache Begleitung in C.

export const HAWAII_SONGS: SongSource[] = [
  {
    id: 'aloha-oe',
    title: 'Aloha ʻOe',
    category: 'eigene',
    origin: 'Text und Melodie Liliʻuokalani (1838–1917), Königin von Hawaiʻi, 1878; Text nach dem Wikipedia-Artikel „Aloha ʻOe“ (Handschrift von 1878 im Hawaiʻi State Archives)',
    textUrl: 'https://en.wikipedia.org/wiki/Aloha_%CA%BBOe',
    meter: 4,
    bpm: 84,
    chordpro: `
Haʻa[C]heo e ka ua i nā [F]pali,
ke [C]nihi aʻela i ka na[G7]hele,
e [C]hahai ana paha i ka [F]liko,
pua [C]ʻāhihi le[G7]hua o [C]uka.
{Chorus}
A[F]loha ʻoe, a[C]loha ʻoe,
e ke [G7]onaona noho i ka [C]lipo,
one fond em[F]brace, a [C]hoʻi aʻe au,
un[G7]til we meet a[C]gain.
ʻO ka [C]haliʻa aloha i hiki [F]mai,
ke [C]hone aʻe nei i kuʻu ma[G7]nawa,
ʻO [C]ʻoe nō kuʻu ipo a[F]loha,
a [C]loko e [G7]hana [C]nei.
A[F]loha ʻoe, a[C]loha ʻoe,
e ke [G7]onaona noho i ka [C]lipo,
one fond em[F]brace, a [C]hoʻi aʻe au,
un[G7]til we meet a[C]gain.
Mao[C]popo kuʻu ʻike i ka [F]nani,
nā [C]pua rose o Mauna[G7]wili,
i [C]laila hiaʻai nā [F]manu,
mi[C]kiʻala i ka [G7]nani o ka [C]liko.
A[F]loha ʻoe, a[C]loha ʻoe,
e ke [G7]onaona noho i ka [C]lipo,
one fond em[F]brace, a [C]hoʻi aʻe au,
un[G7]til we meet a[C]gain.`,
  },
  {
    id: 'hawaii-ponoi',
    title: 'Hawaiʻi Ponoʻī',
    category: 'eigene',
    origin: 'Text König Kalākaua (1836–1891), 1874, Melodie Henri Berger (1844–1929); Text nach dem Wikipedia-Artikel „Hawaiʻi Ponoʻī“',
    textUrl: 'https://en.wikipedia.org/wiki/Hawai%CA%BBi_Pono%CA%BB%C4%AB',
    meter: 4,
    bpm: 92,
    chordpro: `
Ha[C]waiʻi ponoʻī,
[G7]nānā i kou [C]mōʻī,
ka lani [F]aliʻi,
[C]ke [G7]aliʻi.[C]
{Chorus}
Ma[C]kua lani [F]ē,
[C]Kamehameha [G7]ē,
[C]na kāua e [F]pale
[C]me [G7]ka ihe.[C]
Ha[C]waiʻi ponoʻī,
[G7]nānā i nā a[C]liʻi,
nā pua muli [F]kou,
[C]nā [G7]pōkiʻi.[C]
Ma[C]kua lani [F]ē,
[C]Kamehameha [G7]ē,
[C]na kāua e [F]pale
[C]me [G7]ka ihe.[C]
Ha[C]waiʻi ponoʻī,
[G7]e ka lāhui [C]ē,
ʻo kāu hana [F]nui
[C]e [G7]ui ē.[C]
Ma[C]kua lani [F]ē,
[C]Kamehameha [G7]ē,
[C]na kāua e [F]pale
[C]me [G7]ka ihe.[C]`,
  },
];
