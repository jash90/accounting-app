# Analiza Dotacyjna — Platforma Księgowa SaaS (Accounting ERP)

## Kontekst

**Projekt:** Platforma do zarządzania biurem rachunkowym (SaaS B2B)
**Profil wnioskodawcy:** JDG, mikroprzedsiębiorstwo, województwo podkarpackie (Polska Wschodnia)
**Etap:** MVP / pre-revenue — działający prototyp, brak płacących klientów
**Potrzeba:** Finansowanie dalszego rozwoju, w tym wynagrodzenie własne developera

### Opis projektu i funkcjonalności

Wielomodułowa platforma SaaS do zarządzania biurem rachunkowym, obejmująca:

- **Zarządzanie klientami** — CRM z polskimi danymi podatkowymi (NIP, REGON, VAT, PIT, ZUS), system pól niestandardowych, śledzenie ulg podatkowych, automatyczna klasyfikacja klientów (silnik reguł)
- **Zarządzanie zadaniami** — Kanban, Gantt, kalendarz, zależności, szablony z rekurencją (cron), automatyczne powiadomienia o terminach
- **Rozliczenia miesięczne** — workflow statusów, masowa inicjalizacja, przypisywanie do pracowników
- **Ewidencja czasu pracy** — rejestracja czasu, raporty PDF, zaokrąglanie, statystyki
- **Oferty i leady CRM** — pipeline sprzedażowy, generowanie DOCX, wysyłka email, śledzenie aktywności
- **Generowanie dokumentów** — edytor blokowy (8 typów), generowanie PDF serwer-side, szablony Handlebars
- **Klient email** — pełny IMAP/SMTP, real-time push (IDLE + WebSocket), foldery, załączniki S3
- **Agent AI z RAG** — wieloproviderowy LLM (OpenAI + OpenRouter/100+ modeli), pipeline RAG (embedding + wyszukiwanie), bilingual NLP (PL+EN), streaming, limity tokenów
- **AI auto-reply email** — automatyczne dopasowanie szablonów, generowanie szkiców odpowiedzi przez AI, human-in-the-loop
- **Powiadomienia** — WebSocket real-time, email, ustawienia per-user per-moduł

**Stack:** NestJS 11, React 19 + React Compiler, PostgreSQL, TypeORM, Nx monorepo, Vite 7, Tailwind CSS 4, Recharts, pdfmake, docxtemplater, Socket.IO, Railway (cloud)

**Elementy innowacyjne:**

1. Agent AI z RAG dedykowany dla branży księgowej (unikalne w Polsce)
2. Automatyzacja odpowiedzi email przez AI z dopasowaniem szablonów
3. Silnik reguł do automatycznej klasyfikacji klientów (rekurencyjne warunki AND/OR)
4. Wielowidokowe zarządzanie zadaniami z automatyczną rekurencją
5. Multi-tenant SaaS z modułową aktywacją per firma i RBAC

---

## 1. SCORING DOPASOWANIA

| #   | Program                                               | Instytucja           | Score    | Uzasadnienie                                                                                                                                              |
| --- | ----------------------------------------------------- | -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Platformy startowe dla nowych pomysłów (FEPW 1.1)** | PARP                 | **9/10** | Idealny profil: startup z Polski Wschodniej, innowacyjny produkt SaaS, etap pre-revenue. Finansuje rozwój MVP do produktu rynkowego, w tym wynagrodzenia. |
| 2   | **FE dla Podkarpackiego — Cyfryzacja MŚP**            | URZĄD MARSZAŁKOWSKI  | **8/10** | Regionalny program dla mikro z podkarpackiego. Niższe kwoty ale prostsze procedury. Cyfryzacja procesów biur rachunkowych.                                |
| 3   | **Bony na innowacje dla MŚP (FENG 2.3)**              | PARP                 | **8/10** | Komponent AI/RAG kwalifikuje się jako prace B+R. Wymaga współpracy z jednostką naukową — np. Politechnika Rzeszowska.                                     |
| 4   | **Ścieżka SMART — moduł B+R (FENG 1.1)**              | PARP/NCBiR           | **6/10** | Komponent AI spełnia kryterium B+R, ale minimalne budżety mogą być za wysokie dla JDG. Rozważyć po przekształceniu w sp. z o.o.                           |
| 5   | **Kredyt technologiczny (FENG 3.1)**                  | BGK                  | **5/10** | Wymaga wdrożenia nowej technologii. Pasuje koncepcyjnie ale wymaga zdolności kredytowej — trudne dla pre-revenue JDG.                                     |
| 6   | **Startup Booster Poland**                            | ARP/PARP             | **7/10** | Programy akceleracyjne dla startupów — mentoring + granty seed.                                                                                           |
| 7   | **Voucher cyfrowy FEPW**                              | PARP                 | **8/10** | Transformacja cyfrowa MŚP z Polski Wschodniej. Prostsze procedury, mniejsze kwoty.                                                                        |
| 8   | **Horyzont Europa — EIC Accelerator**                 | KE                   | **4/10** | Wysoki potencjał ale bardzo kompetycyjny, wymaga TRL 5-8. Rozważyć w przyszłości.                                                                         |
| 9   | **Ulga B+R + IP Box**                                 | KAS (urząd skarbowy) | **9/10** | Nie dotacja, ale ulga podatkowa. Koszty wynagrodzeń na prace B+R (AI/RAG) odliczane od podstawy opodatkowania. Dostępne od zaraz.                         |
| 10  | **KPO — Wsparcie cyfryzacji MŚP**                     | PARP                 | **7/10** | Granty na wdrożenie rozwiązań cyfrowych. Sprawdzić aktualność naborów.                                                                                    |

---

## 2. TOP 5 REKOMENDOWANYCH PROGRAMÓW

### 1. Platformy startowe dla nowych pomysłów (FEPW Działanie 1.1)

**Instytucja:** PARP (Polska Agencja Rozwoju Przedsiębiorczości)
**Kwota dofinansowania:** do **600 000 PLN** (faza inkubacji) + do **1 000 000 PLN** (faza rozwoju)
**Poziom dofinansowania:** do **100% kosztów kwalifikowalnych** (pomoc de minimis, faza inkubacji)
**Czas rozpatrywania:** ~3-4 miesiące

**Kluczowe kryteria kwalifikowalności:**

- Siedziba firmy w Polsce Wschodniej (podkarpackie ✅)
- Innowacyjny pomysł biznesowy oparty na nowych technologiach
- Firma działająca nie dłużej niż 24 miesiące (sprawdzić termin rejestracji JDG!)
- Gotowość do inkubacji w wybranej Platformie Startowej

**Wymagane elementy projektu:**

- Opis modelu biznesowego (Business Model Canvas)
- Analiza rynku docelowego (biura rachunkowe w Polsce — ~50 000 podmiotów)
- Plan komercjalizacji produktu SaaS
- Wskazanie elementów innowacyjnych (AI/RAG — kluczowy wyróżnik)

**Co finansuje:**

- Wynagrodzenia (w tym własne wynagrodzenie jako kierownika projektu!)
- Usługi doradcze, mentoring
- Wynajem infrastruktury IT (serwery, chmura)
- Koszty materiałów i prototypowania
- Promocja i marketing

**KRYTYCZNE**: Sprawdź, czy Twoja JDG istnieje krócej niż 24 miesiące! Jeśli dłużej, ten program może być niedostępny.

---

### 2. FE dla Podkarpackiego 2021-2027 — Cyfryzacja i innowacje MŚP

**Instytucja:** Urząd Marszałkowski Województwa Podkarpackiego
**Kwota dofinansowania:** **50 000 – 500 000 PLN**
**Poziom dofinansowania:** **70-85%** kosztów kwalifikowalnych
**Czas rozpatrywania:** ~2-4 miesiące

**Co finansuje:**

- Wynagrodzenia zespołu projektowego
- Zakup/wytworzenie oprogramowania
- Usługi chmurowe (Railway, S3)
- Szkolenia z obsługi systemu
- Koszty wdrożenia u klientów pilotażowych

---

### 3. Bony na innowacje dla MŚP (FENG Działanie 2.3)

**Instytucja:** PARP
**Kwota dofinansowania:** do **255 000 PLN** (etap usługowy) + do **200 000 PLN** (etap inwestycyjny)
**Poziom dofinansowania:** **85%** kosztów kwalifikowalnych (mikroprzedsiębiorstwo)
**Czas rozpatrywania:** ~2-3 miesiące (tryb ciągły)

**Kluczowe kryteria — WYMAGANE:**

- Współpraca z jednostką naukową (np. Politechnika Rzeszowska)
- Zakres prac B+R: optymalizacja RAG pipeline, fine-tuning modeli językowych dla polskiej terminologii księgowej

**REKOMENDACJA**: To najszybsza ścieżka do dofinansowania komponentu AI. Skontaktuj się z Politechniką Rzeszowską — Centrum Transferu Technologii.

---

### 4. Voucher cyfrowy / Wsparcie MŚP — FEPW

**Instytucja:** PARP (w ramach FEPW)
**Kwota dofinansowania:** do **150 000 PLN** (voucher) lub do **300 000 PLN** (rozszerzony)
**Poziom dofinansowania:** **70-85%**
**Czas rozpatrywania:** ~2-3 miesiące
**Trudność:** Łatwa (jedna z najprostszych form dotacji)

---

### 5. Ulga B+R + IP Box (wsparcie podatkowe — dostępne od zaraz)

**Instytucja:** KAS (Krajowa Administracja Skarbowa)
**Kwota korzyści:** Odliczenie **200%** kosztów kwalifikowalnych od podstawy opodatkowania + **5% stawka PIT** na dochody z kwalifikowanych IP

**Co kwalifikuje się jako koszt B+R:**

- Wynagrodzenie własne poświęcone na prace B+R (proporcjonalnie do czasu)
- Koszty materiałów i surowców (serwery, API, narzędzia)
- Amortyzacja sprzętu

**NATYCHMIAST DOSTĘPNE**: Możesz z tego skorzystać już w rozliczeniu za 2025/2026 rok.

---

## 3. ANALIZA GAP — Czego brakuje

### Krytyczne braki

| Brak                                               | Wpływ                                   | Rekomendacja                                                                      |
| -------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| **Brak walidacji rynkowej** (0 klientów)           | Obniża scoring we wszystkich programach | Pozyskać 3-5 pilotażowych biur rachunkowych. Listy intencyjne = złoto we wniosku. |
| **Brak komponentu badawczego z jednostką naukową** | Wyklucza Bony na innowacje              | Nawiązać współpracę z Politechniką Rzeszowską (WI lub WEiI).                      |
| **JDG vs sp. z o.o.**                              | Niektóre programy preferują sp. z o.o.  | Rozważyć przekształcenie — koszty ~2000 PLN, ale otwiera większe programy         |

### Ważne braki

| Brak                                         | Wpływ                                   | Rekomendacja                                                               |
| -------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| **Brak aspektu ekologicznego (green)**       | Wiele programów ma kryteria ESG/green   | Dodać do narracji: digitalizacja = redukcja papieru w biurach rachunkowych |
| **Brak aspektu dostępności cyfrowej (WCAG)** | Kryterium punktowane w wielu programach | Dodać plan zgodności z WCAG 2.1 AA — Radix UI już jest accessibility-first |
| **Brak analizy konkurencji w dokumentacji**  | Wymagane w większości wniosków          | Przygotować porównanie z: Saldeo, wFirma, iFirma, Optima, Rewizor          |
| **Brak IP (patent, wzór użytkowy)**          | Obniża IP Box potencjał                 | Rozważyć zgłoszenie patentowe na algorytm auto-klasyfikacji klientów       |

### Elementy do przeformułowania

1. **Nie nazywaj projektu "platformą księgową"** — to **"system ERP do zarządzania biurem rachunkowym z wbudowanym AI"**.
2. **Agent AI z RAG** = "Inteligentny asystent oparty na sztucznej inteligencji z mechanizmem Retrieval-Augmented Generation, dostosowany do polskiej terminologii rachunkowo-podatkowej"
3. **Podkreślaj automatyzację**: 7 procesów automatycznych (cron-based) = mierzalne oszczędności czasu

---

## 4. MAPA DROGOWA APLIKOWANIA

### Timeline (Q1 2026 – Q4 2027)

**NATYCHMIAST (luty-marzec 2026)**

- Ulga B+R — konsultacja z doradcą podatkowym (~1 500 PLN)
- Pozyskanie 3-5 listów intencyjnych od biur rachunkowych
- Kontakt z Politechniką Rzeszowską (CTT) — wstępne rozmowy o współpracy B+R
- Przygotowanie Business Model Canvas + analiza konkurencji

**Q2 2026 (kwiecień-czerwiec)**

- Złożenie wniosku: Bony na innowacje (FENG 2.3) — komponent AI (koszt: 5 000-8 000 PLN z doradcą lub 0 PLN samodzielnie)
- Aplikacja do Platformy Startowej FEPW (jeśli JDG < 24 mies.) (koszt: 3 000-5 000 PLN)
- Rozważenie przekształcenia JDG → sp. z o.o.

**Q3-Q4 2026 (lipiec-grudzień)**

- Wniosek: FE dla Podkarpackiego — cyfryzacja MŚP (koszt: 5 000-10 000 PLN)
- Voucher cyfrowy FEPW (jeśli dostępny nabór)
- Realizacja Bonu na innowacje (współpraca z uczelnią)
- Rozliczenie Ulgi B+R za 2026

**2027**

- Ścieżka SMART moduł B+R (jeśli sp. z o.o. + wyniki z Bonów)
- IP Box (po uzyskaniu pierwszych przychodów z SaaS)
- Horyzont Europa / EIC Pathfinder (jeśli TRL 6+)

---

## 5. KOMPLEMENTARNOŚĆ PROGRAMÓW — Matryca łączenia

### Zasady ogólne

1. **Zakaz podwójnego finansowania** — ten sam wydatek NIE może być rozliczony w dwóch dotacjach jednocześnie
2. **Różne koszty kwalifikowalne = można łączyć** — jeśli programy finansują RÓŻNE kategorie kosztów
3. **Ulgi podatkowe (B+R, IP Box) + dotacje = można łączyć** — ale koszty pokryte dotacją NIE mogą być jednocześnie odliczone w uldze B+R
4. **Pomoc de minimis się kumuluje** — suma wszystkich dotacji de minimis ≤ 300 000 EUR / 3 lata

### Cztery optymalne scenariusze łączenia

**SCENARIUSZ A: "Szybki start"**
Łączna korzyść: ~300 000 – 400 000 PLN w ciągu 18 miesięcy

- Ulga B+R (od zaraz) — odliczenie 200% kosztów prac nad AI od PIT
- Bony na innowacje (Q2 2026, do 255k PLN, 85%) — współpraca z Politechniką nad AI/RAG
- Voucher cyfrowy FEPW (Q3-Q4 2026, do 150-300k PLN, 70-85%) — pozostałe moduły, serwery, wdrożenie

DLACZEGO DZIAŁA: Bony finansują komponent AI (usługi uczelni), Voucher finansuje resztę platformy (RÓŻNE koszty — dlatego się łączą), Ulga B+R na koszty własne niepokryte dotacjami.

---

**SCENARIUSZ B: "Inkubator + granty" (najwyższe kwoty)**
Łączna korzyść: ~700 000 – 1 100 000 PLN w ciągu 24 miesięcy

- Platformy startowe FEPW (Q2 2026, do 600k PLN, 100%) — faza inkubacji: rozwój produktu, wynagrodzenia, mentoring, Twoja pensja
- Bony na innowacje (2027, do 255k PLN, 85%) — prace B+R nad AI z uczelnią (kontynuacja)
- Ulga B+R + IP Box (od uzyskania revenue)

WYMAGA: JDG < 24 miesiące + przejście rekrutacji do operatora platformy. SEKWENCYJNIE: najpierw inkubacja, potem granty na dalszy rozwój.

---

**SCENARIUSZ C: "Regionalny + krajowy" (najbardziej realistyczny)**
Łączna korzyść: ~400 000 – 700 000 PLN w ciągu 18-24 miesięcy

- FE dla Podkarpackiego — Cyfryzacja MŚP (Q3 2026, do 500k PLN, 85%) — wytworzenie oprogramowania, wdrożenie, szkolenia, wynagrodzenia, serwery
- Bony na innowacje (osobny wniosek, do 255k PLN, 85%) — WYŁĄCZNIE usługi badawcze uczelni + materiały B+R
- Ulga B+R (równolegle) — odliczenie kosztów B+R niepokrytych dotacjami

UWAGA: FE Podkarpackie i Voucher cyfrowy FEPW mogą się wykluczać — sprawdź regulamin!

---

**SCENARIUSZ D: "Ambitny — po przekształceniu w sp. z o.o."**
Łączna korzyść: ~1 000 000 – 2 500 000 PLN w ciągu 24-36 miesięcy

- Przekształcenie JDG → sp. z o.o. (Q2 2026, koszt ~2000 PLN)
- Bony na innowacje (Q2-Q3 2026, do 255k PLN) — wstępne prace B+R z uczelnią
- Ścieżka SMART moduł B+R (Q1 2027, do 5 mln PLN, 80%) — pełnoprawny projekt B+R: AI agent, RAG, NLP; moduł Wdrożenie: komercjalizacja, marketing
- IP Box (po uzyskaniu revenue) — 5% PIT od dochodów z oprogramowania

### Rekomendacja: optymalny wybór scenariusza

| Twoja sytuacja                                           | Rekomendowany scenariusz     |
| -------------------------------------------------------- | ---------------------------- |
| JDG < 24 mies., chcesz szybko i dużo                     | **B** (Inkubator + granty)   |
| JDG > 24 mies., chcesz szybko zacząć                     | **A** (Szybki start)         |
| JDG > 24 mies., chcesz max kwotę bez zmiany formy        | **C** (Regionalny + krajowy) |
| Gotów przekształcić w sp. z o.o., myślisz długoterminowo | **D** (Ambitny)              |

**Szacowany łączny budżet na przygotowanie wniosków:** 15 000 – 25 000 PLN (firma doradcza) lub 3 000 – 5 000 PLN (samodzielnie).

---

## 6. RYZYKA I PUŁAPKI

### Najczęstsze powody odrzucenia

| Ryzyko                                         | Prawdopodobieństwo | Mitygacja                                                          |
| ---------------------------------------------- | ------------------ | ------------------------------------------------------------------ |
| **Brak walidacji rynkowej**                    | Wysokie            | Listy intencyjne, ankiety wśród biur rachunkowych, dane GUS        |
| **Za niska innowacyjność**                     | Średnie            | Wyraźne wykazanie braku AI/RAG u konkurencji, benchmarki           |
| **Niewystarczający potencjał komercjalizacji** | Średnie            | Pricing model (199/399/699 PLN/mies.), projekcje finansowe 3-5 lat |
| **Jednoosobowy zespół**                        | Średnie            | Plan rekrutacji w ramach projektu, współpraca z uczelnią           |

### Pułapka: wynagrodzenie własne w JDG

W JDG nie można sobie wypłacić "pensji" w tradycyjnym sensie. "Wynagrodzenie kierownika projektu" w JDG rozlicza się jako koszty osobowe właściciela na podstawie godzinowej stawki + ewidencji czasu pracy. Przy sp. z o.o. jest to znacznie prostsze — umowa o pracę lub B2B z własną spółką.

### Wymogi trwałości projektu

- 3 lata od zakończenia projektu — musisz utrzymać rezultaty (działający SaaS)
- Zakaz zbycia rezultatów projektu w okresie trwałości
- Obowiązkowe logotypy UE na stronie i materiałach
- Kontrole przez 3-5 lat po zakończeniu

### Kwestia pomocy de minimis

- **Limit:** 300 000 EUR w ciągu 3 lat podatkowych (od 2024 — podwyższony z 200 000 EUR)
- Sprawdź dotychczasowe wykorzystanie na: sudop.uokik.gov.pl

---

## 7. QUICK WINS — Najszybsze opcje

| Instrument                  | Kwota/Korzyść                          | Czas uzyskania                |
| --------------------------- | -------------------------------------- | ----------------------------- |
| **Ulga B+R**                | Odliczenie 200% kosztów B+R od podatku | Od zaraz (rozliczenie roczne) |
| **Platformy startowe FEPW** | do 600 000 PLN                         | 3-6 mies. (rekrutacja ciągła) |
| **Bony na innowacje**       | do 255 000 PLN                         | 2-3 mies. (tryb ciągły)       |
| **Voucher cyfrowy FEPW**    | do 150-300 000 PLN                     | 2-3 mies.                     |

---

## 8. NASTĘPNE KROKI (najbliższe 2 tygodnie)

### Tydzień 1

1. **Skontaktuj się z Centrum Transferu Technologii Politechniki Rzeszowskiej** — zapytaj o możliwość współpracy badawczej nad komponentem AI/RAG
   - Kontakt: ctt.prz.edu.pl
   - Temat: "Optymalizacja systemu RAG dla polskiej terminologii rachunkowo-podatkowej"

2. **Wyślij zapytanie do 5-10 biur rachunkowych z podkarpackiego** — czy byliby zainteresowani pilotażowym wdrożeniem platformy. Poproś o listy intencyjne.

3. **Sprawdź swoje wykorzystanie pomocy de minimis** — wejdź na sudop.uokik.gov.pl

### Tydzień 2

4. **Umów konsultację z doradcą podatkowym** (specjalizacja: ulga B+R) — koszt ~1500 PLN:
   - Czy prace nad AI/RAG kwalifikują się jako B+R
   - Jak prowadzić ewidencję czasu pracy na B+R w JDG
   - Czy warto już teraz rozważyć IP Box

5. **Sprawdź aktualny harmonogram naborów** na:
   - parp.gov.pl/fepw — Platformy startowe, Bony na innowacje
   - rfrp.pl — Podkarpackie programy regionalne
   - funduszeeuropejskie.gov.pl/nabory — wszystkie aktualne nabory

---

## Przydatne zasoby

- **Baza Konkurencyjności** — bazakonkurencyjnosci.funduszeeuropejskie.gov.pl (obowiązkowa dla zamówień w projekcie)
- **CST2021** — cst2021.gov.pl (Centralny System Teleinformatyczny — składanie wniosków online)
- **Generator Wniosków PARP** — lsi.parp.gov.pl (dla programów PARP: FENG, FEPW)
- **SUDOP** — sudop.uokik.gov.pl (sprawdzenie wykorzystania pomocy de minimis)
- **Podkarpacki RPO** — rfrp.pl (nabory regionalne)

---

## Zastrzeżenia

1. Powyższa analiza bazuje na wiedzy o programach perspektywy UE 2021-2027 dostępnych do sierpnia 2025. **Aktualność naborów, kwoty i szczegółowe regulaminy należy zweryfikować bezpośrednio na stronach instytucji pośredniczących.**
2. Scoring dopasowania jest orientacyjny i nie zastępuje formalnej oceny kwalifikowalności.
3. Kwestie podatkowe (ulga B+R, IP Box) wymagają indywidualnej konsultacji z doradcą podatkowym.

---

_Analiza przygotowana: luty 2026_
