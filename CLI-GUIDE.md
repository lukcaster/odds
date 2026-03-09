# 🏈 NFL Odds Calculator - CLI User Guide

## 🚀 **Uruchomienie**

```bash
npm install
tsx src/app/main.ts
```

## 📋 **Menu główne**

```text
╔════════════════════════════════════════════════════════════════════╗
║          🏈 NFL ODDS CALCULATOR - KELLY CRITERION 🏈              ║
║                 Hybrid Model (ELO + Stats + Momentum)              ║
╚════════════════════════════════════════════════════════════════════╝

Co chcesz zrobić?
  1. 🏈 Analiza meczów z API (the-odds-api.com)
  2. 🎯 Ręczna analiza (podaj drużyny)
  3. 📊 Wyświetl ELO Rankings
  4. ⚙️  Ustaw wagi modelu (ELO/Stats/Momentum)
  5. 🔄 Aktualizuj ELO po meczu
  6. ❌ Wyjdź
```

---

## 🎯 **Opcja 1: Analiza meczów z API**

Pobiera kursy z `the-odds-api.com` i analizuje wszystkie dostępne mecze NFL.

```
📡 Pobieranie danych z the-odds-api.com...

🏈 🤖 REKOMENDACJE OBSTAWIANIA NFL (HYBRID MODEL) 🤖 🏈
Model: ELO Rating (50%) + Team Stats (35%) + Momentum (15%)

🏆 TOP 10 DRUŻYN (wg ELO):
1. San Francisco 49ers: 1660
2. Kansas City Chiefs: 1680
...

📊 Kansas City Chiefs
   Kurs: 1.92
   Implied probability: 52.1%
   Twoja estymacja: 56.0% (🤖 Hybrid Model)
   Full Kelly: 3.20%
   Fractional Kelly (1/4): 0.80%
   ✥ SOLID - Postawiaj 0.80% bankrolla
```

---

## 🎯 **Opcja 2: Ręczna analiza**

Wpisz drużyny i kurs, dostaniesz deep analysis:

```
? Drużyna domowa: Kansas City Chiefs
? Drużyna wyjazdowa: Buffalo Bills
? Kurs (decimal format, np. 1.90): 1.85

🔍 Analizuję mecz...

📈 DEEP ANALYSIS: Kansas City Chiefs vs Buffalo Bills
════════════════════════════════════════════════════════════════════════════════

🏠 HOME TEAM: Kansas City Chiefs
   ELO Rating: 1680
   Team Strength: 92.3
   Points For: 25.1 | Against: 19.8
   Pass Yards: 235 for / 215 against
   3rd Down %: 44% | Red Zone: 62%
   Turnover Margin: 1.2

🚗 AWAY TEAM: Buffalo Bills
   ELO Rating: 1620
   Team Strength: 87.5
   Points For: 24.8 | Against: 20.2
   Pass Yards: 250 for / 220 against
   3rd Down %: 42% | Red Zone: 58%
   Turnover Margin: 0.8

🎯 PREDICTION
   Home Win Probability: 56.0%
   Away Win Probability: 44.0%
   Matchup: ✅ Home Favored

════════════════════════════════════════════════════════════════════════════════

💰 KELLY CRITERION
══════════════════════════════════════════════════════════════════
   Kurs: 1.85
   Predicted: 56.0%
   Full Kelly: 5.12%
   Fractional Kelly (1/4): 1.28%
   ✥ SOLID - Postawiaj 1.28% bankrolla!
══════════════════════════════════════════════════════════════════
```

**Autocomplete:** Zacznij pisać nazwę drużyny, CLI Ci ją zasugeruje

---

## 📊 **Opcja 3: ELO Rankings**

Sortowana lista wszystkich 32 drużyn NFL wg ELO ratingu:

```
🏆 TOP 10 DRUŻYN (wg ELO):
1. San Francisco 49ers: 1660
2. Kansas City Chiefs: 1680
3. Detroit Lions: 1640
4. Philadelphia Eagles: 1650
5. Dallas Cowboys: 1620
6. Green Bay Packers: 1600
7. Baltimore Ravens: 1600
8. Cincinnati Bengals: 1580
9. Los Angeles Rams: 1580
10. Houston Texans: 1570
```

---

## ⚙️ **Opcja 4: Ustaw wagi modelu**

Dostosuj wagę każdej komponenty:

```
? Waga ELO Rating (0-100): 50
? Waga Team Stats (0-100): 35
? Waga Momentum (0-100): 15

✅ Wagi zaktualizowane!
⚙️  Weights updated: ELO=0.50, Stats=0.35, Momentum=0.15
```

**Default wagi:**
- **ELO Rating: 50%** - Największa waga (most stable over time)
- **Team Stats: 35%** - Current season performance
- **Momentum: 15%** - Recent form (ready to expand)

---

## 🔄 **Opcja 5: Aktualizuj ELO po meczu**

Wpisz wynik meczu, a ELO ratings się automatycznie aktualizują:

```
? Drużyna domowa: Kansas City Chiefs
? Drużyna wyjazdowa: Buffalo Bills  
? Która drużyna wygrała?
  🏠 Kansas City Chiefs (Domu)
  🚗 Buffalo Bills (Wyjazdowa)

✅ ELO ratings zaktualizowane!
📊 ELO Updated: 
   Kansas City Chiefs (1680 → 1690) vs 
   Buffalo Bills (1620 → 1610)
```

---

## 🧮 **Jak działają wyliczenia?**

### **Hybrid Model**
```
Final Prediction = 
  ELO_Probability × 0.50 +
  Stats_Probability × 0.35 +
  Momentum × 0.15
```

### **ELO Rating**
```
P(HomeWin) = 1 / (1 + 10^(-(ELO_home + 65 - ELO_away)/400))

gdzie 65 = home field advantage w punktach ELO
```

### **Kelly Criterion**
```
f* = (bp - q) / b

gdzie:
  b = kurs - 1
  p = twoja szansa (prediction)
  q = 1 - p
  
Fractional Kelly = Full Kelly / 4  ← Bezpieczniejsza wersja!
```

---

## 💡 **Porady**

1. **Zawsze używaj Fractional Kelly (1/4)** - zmniejsza ryzyko ruiny finansowej
2. **Grać tylko VALUE BETS** - gdy twoja predykcja > implied probability
3. **Aktualizuj ELO** - po każdym meczu, aby ratings były aktualne
4. **Nie mieszaj wagi** - domyślne (50/35/15) są dobrze wybalansowane
5. **API key** - ustaw w `.env` (`apiKey=...`)

---

## 🚀 **Next Steps**

- [ ] Dodaj historię meczów (CSV export)
- [ ] Track ROI (return on investment)
- [ ] Persistence - zapisz ELO ratings w JSON
- [ ] Recent form momentum - rzeczywiste ostatnie wyniki
- [ ] Web dashboard - visualizacja w przeglądarce
- [ ] Telegram bot integration

---

**Powodzenia! 🤑**
