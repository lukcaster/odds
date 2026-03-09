# 🏈 NFL Odds Calculator - Kelly Criterion

Projekt kalkuluje najlepsze stawki na mecze NFL używając Kelly Criterion.

## 📋 Jak to działa?

1. **Pobierz kursy z API** (`the-odds-api.com`) - decimal odds z USA
2. **Konwertuj na prawdopodobieństwo** - implied probability
3. **Porównaj z Twoją predykcją** - czy masz lepszy model?
4. **Liczysz Kelly Criterion** - ile postawić?
5. **Wyświetl rekomendacje** - safe fractional Kelly (1/4)

## 🚀 Uruchamianie

```bash
npm install
tsx src/app/main.ts
```

## 🎯 Jak dodać swoje predykcje?

Otwórz plik [src/app/get-odds/prediction-model.ts](src/app/get-odds/prediction-model.ts) i dodaj swoje szacunki:

```typescript
// W metodzie loadDefaultPredictions() dodaj:
this.predictions.set("Kansas City Chiefs vs Buffalo Bills", 0.58);
this.predictions.set("Dallas Cowboys vs Philadelphia Eagles", 0.52);
```

**Format**: `"HomeTeam vs AwayTeam"` → prawdopodobieństwo że zwyciężą **gospodarze**

### Lub programowo

```typescript
const model = new PredictionModel();
model.addPrediction("Kansas City Chiefs", "Buffalo Bills", 0.58);
```

## 📊 Co znaczą te liczby?

```text
📊 Kansas City Chiefs
   Kurs: 1.90                              ← Kurs z API
   Implied probability: 52.6%              ← Co myśli bukmacher?
   Twoja estymacja: 58.0% (Model)          ← Co myślisz TY?
   Full Kelly: 4.15%                       ← Pełny Kelly (RYZYKOWNE)
   Fractional Kelly (1/4): 1.04%           ← Bezpieczna wersja (REKOMENDACJA)
   ✥ SOLID - Postawiaj 1.04% bankrolla     ← Akcja!
```

### Wyjaśnienie

- **Implied probability** > **Your estimate** = ❌ PASS (brak value)
- **Your estimate** > **Implied probability** = ✅ VALUE! (warto grać)
- **Fractional Kelly** = ile % bankrolla postawić na jeden mecz

## 🔐 API Key

Plik [.env](.env) musi zawierać:

```env
apiKey=twoj_klucz_z_the_odds_api_com
```

Zdobądź klucz bezpłatnie: [the-odds-api.com](https://the-odds-api.com/)

## 📈 Kelly Criterion wyjaśniony

Formuła: **f* = (bp - q) / b**

- **b** = kurs - 1 (win/loss ratio)
- **p** = Twoja szansa na wygraną
- **q** = 1 - p (szansa na przegrę)

**Przykład:**

- Kurs: 1.90 → b = 0.90
- Twoja szansa: 60% → p = 0.60, q = 0.40
- Kelly = (0.90 × 0.60 - 0.40) / 0.90 = **22.2%**

To znaczy: postawiaj **22.2% bankrolla** na jeden mecz!

⚠️ **FRACTIONAL KELLY** (Kelly/4 = 5.5%) jest bezpieczniejszy - zmniejsza ryzyko ruiny finansowej.

## 🧠 Rozszerzanie projektu

### Dodaj swój model AI/ML

```typescript
export class AdvancedModel extends PredictionModel {
    constructor(private aiModel: YourAiModel) {
        super();
    }

    public getPrediction(homeTeam: string, awayTeam: string): number | null {
        return this.aiModel.predict(homeTeam, awayTeam);
    }
}
```

### Dodaj więcej rynków

```typescript
const url = `...&markets=spreads,totals,moneyline&...`
```

### Porównaj wiele bukmacherów

```typescript
// W getOutcomes() zamiast:
outcome.bookmakers[0].markets[0].outcomes[0].price
// Iteruj przez wszystkie bookmakers i wybierz najlepszy kurs
```

## ⚡ Performance Tips

- Cache predicted values dla najczęściej granych drużyn
- Batch API requests (the-odds-api ma limity)
- Uruchom headless mode w produkcji: `setPage(true)`

## 🐛 Debugging

```bash
NODE_DEBUG=* tsx src/app/main.ts
```

---

Good luck making that money! 🤑
