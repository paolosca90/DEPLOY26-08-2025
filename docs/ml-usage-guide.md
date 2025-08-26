# Guida all'Utilizzo del Machine Learning

AI Trading Boost integra un potente motore di Machine Learning (ML) per migliorare l'accuratezza delle previsioni e adattarsi dinamicamente alle condizioni di mercato. Questa guida spiega come interpretare e utilizzare le funzionalità ML.

## Dashboard di Machine Learning

La pagina **ML Analytics** è il tuo centro di controllo per monitorare le performance del modello AI.

### Metriche Principali

-   **Accuratezza Modello**: La percentuale di previsioni corrette fatte dal modello. Un valore più alto indica una maggiore affidabilità.
-   **Precision**: Indica quante delle previsioni positive (es. "LONG") erano effettivamente corrette. Utile per evitare falsi positivi.
-   **F1 Score**: Una media ponderata di Precision e Recall, che fornisce una singola metrica per valutare la performance complessiva del modello.
-   **Sharpe Ratio**: Misura il rendimento corretto per il rischio. Un valore superiore a 1 è generalmente considerato buono.

### Grafici di Analisi

-   **Andamento Performance ML**: Mostra come l'accuratezza del modello è cambiata nel tempo. Ti aiuta a capire se il modello sta migliorando o peggiorando.
-   **Importanza Features**: Indica quali fattori (es. RSI, Volume, Sentiment) hanno avuto il maggiore impatto sulle decisioni del modello. Utile per capire la logica dell'AI.
-   **Progresso Apprendimento**: Visualizza le metriche di training come la "loss" (errore). Una "loss" in diminuzione indica che il modello sta imparando efficacemente dai dati.
-   **Pattern di Mercato Rilevati**: Il sistema identifica automaticamente pattern grafici (es. "Doppio Minimo", "Bull Flag") e ne stima il potenziale successo.

## Funzionalità Interattive

Nella dashboard, troverai due pulsanti per interagire con il motore ML:

### 1. 🤖 Addestra Modello

-   **Cosa fa**: Avvia un ciclo di ri-addestramento del modello AI utilizzando i dati degli ultimi trade. Questo processo permette al modello di "imparare" dai suoi successi e fallimenti recenti.
-   **Quando usarlo**: Si consiglia di eseguire l'addestramento una volta al giorno o dopo una serie significativa di trade (es. 20-30 trade) per mantenere il modello aggiornato.
-   **Risultato**: Al termine, riceverai una notifica con la nuova accuratezza del modello. Le metriche nella dashboard si aggiorneranno.

### 2. 🔍 Rileva Pattern

-   **Cosa fa**: Esegue una scansione del mercato per l'asset selezionato (es. BTCUSD) alla ricerca di pattern tecnici noti.
-   **Quando usarlo**: Utile quando vuoi un'analisi specifica su un asset per identificare opportunità basate su formazioni grafiche classiche.
-   **Risultato**: I pattern trovati, con il loro livello di confidenza e tasso di successo storico, appariranno nella card "Pattern di Mercato Rilevati".

## Parametri Adattivi e Raccomandazioni

-   **Parametri Adattivi**: Il sistema regola automaticamente alcuni parametri interni (come il `learning_rate`) per ottimizzare le performance. Questa sezione ti mostra le ultime modifiche.
-   **Raccomandazioni ML**: L'AI fornisce suggerimenti testuali per migliorare ulteriormente le performance, come "Considera di aumentare la regolarizzazione per evitare overfitting".

## Conclusione

Sfruttare le funzionalità di Machine Learning ti permette di avere un sistema che non solo fornisce segnali, ma che si adatta e migliora nel tempo. Monitora regolarmente la dashboard ML e usa le funzionalità interattive per mantenere AI Trading Boost al massimo delle sue potenzialità.
