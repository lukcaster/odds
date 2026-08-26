# ⚡ Odds Calculator

Mobilna apka (PWA) do szukania **value betów** i liczenia rozmiaru zakładu wg
**Kryterium Kelly'ego** dla NFL i lig piłkarskich (m.in. Ekstraklasa).

## Uruchomienie

```bash
npm install
npm start          # startuje serwer dashboardu na http://localhost:3000
```

Wymagany plik `.env` z kluczem do the-odds-api.com:

```
apiKey=TWOJ_KLUCZ
```

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
