# ⚡ Odds Calculator

Mobilna apka (PWA) do szukania **value betów** i liczenia rozmiaru zakładu wg
**Kryterium Kelly'ego** dla NFL i lig piłkarskich (m.in. Ekstraklasa).

## Uruchomienie

```bash
npm install
npm run build      # buduje frontend (web/ -> dist-web/)
npm start          # startuje serwer + serwuje frontend na http://localhost:3000
```

Wymagany plik `.env` z kluczem do the-odds-api.com:

```
apiKey=TWOJ_KLUCZ
```

### Praca nad frontendem

Frontend to **React + TypeScript (Vite)** i żyje w `web/`. W devie odpalasz
dwa procesy — backend i Vite z hot reloadem (proxy `/api` → `:3000`):

```bash
npm start          # terminal 1: API na :3000
npm run web:dev    # terminal 2: UI na :5173
```

Struktura `web/src`:

| plik / katalog | co robi |
| --- | --- |
| `main.tsx` | montuje apkę, rejestruje service workera |
| `store.tsx` | `AppProvider` — profil, historia zakładów, nawigacja, toast, modale |
| `App.tsx` | mapa `screen → komponent` + warstwa modali |
| `api.ts` | wywołania `/api/*` |
| `constants.ts` | lista lig; `helpers.ts` — Kelly, formatowanie, statystyki |
| `screens/` | ekrany (menu, ligi, mecze, analiza, polecane, power ranking, zakłady, profil) |
| `components/` | nagłówek, bottom sheet zakładu, modale |
| `styles.css` | cały CSS apki |

Produkcyjny build (`npm run build`) ląduje w `dist-web/`, które serwuje
Express — plus SPA fallback na `index.html`. Jeśli `dist-web/` nie istnieje,
serwer zwraca podpowiedź zamiast 404.

## Jak to działa

- **🎯 Polecane** – top zakłady z najbliższych 8 dni, posortowane wg Kelly.
  Podgląd trzech najlepszych widać od razu na ekranie głównym, pełną listę
  w zakładce *Polecane*. Bety liczone przy starcie serwera i codziennie o 3:00.
- **📊 Power Ranking** – siła drużyn wg **ELO liczonego z realnych wyników**
  (`ResultsService` dociąga zakończone mecze z ESPN, `EloEngine` przelicza ranking,
  większa różnica bramek = większy ruch). Bez hardkodu. Użytkownicy mogą dać 👍/👎
  do pozycji drużyny — to **sentyment społeczności obok algorytmu** (nie zmienia matmy).
- **⚽ Graj** – wybór ligi i przegląd meczów z kursami + analiza po rozwinięciu.
- **👤 Profil** – nick i bankroll (podstawa do wyliczenia kwoty zakładu).

Kwota zakładu = **frakcyjny Kelly (¼)** liczony od bankrolla — ostrożne podejście
ograniczające ryzyko.

Progi doboru polecanych (w `src/app/get-odds/recommended-service.ts`):
- `MIN_EDGE` – minimalna przewaga nad bukmacherem (domyślnie 1.5%),
- `UPCOMING_WINDOW_DAYS` – ile dni w przód patrzymy (domyślnie 8).

## Instalacja na telefonie (PWA)

Apka jest PWA — instaluje się bez sklepu, wprost z przeglądarki (wymaga HTTPS,
np. adres z Rendera):

- **Android (Chrome):** menu ⋮ → „Zainstaluj aplikację" / „Dodaj do ekranu głównego".
- **iPhone (Safari):** przycisk Udostępnij → „Do ekranu początkowego".

Po instalacji działa jak natywna apka (ikona, pełny ekran). Przy pierwszym
uruchomieniu pokazuje się zgoda 18+ / disclaimer.

> ⚠️ Kursy bywają nieaktualne — zawsze sprawdź je u bukmachera przed zakładem.
> Narzędzie informacyjne, tylko 18+. Gra to ryzyko, obstawiaj odpowiedzialnie.
