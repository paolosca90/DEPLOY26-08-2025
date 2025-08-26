# Guida alla Connessione del VPS e MT5

Questa guida ti aiuterà a collegare il tuo Virtual Private Server (VPS) e il tuo account MetaTrader 5 ad AI Trading Boost.

## Prerequisiti

1.  **Accesso a un VPS Windows**: Devi avere un VPS con sistema operativo Windows e accesso come Amministratore.
2.  **MetaTrader 5 Installato**: Il terminale MT5 deve essere installato sul tuo VPS.
3.  **Python Installato**: Python 3.7+ deve essere installato sul VPS. Assicurati di selezionare "Add Python to PATH" durante l'installazione.

## Passo 1: Prepara il Tuo VPS

1.  **Connettiti al tuo VPS** usando "Connessione Desktop Remoto" (`mstsc`).
2.  Apri il **Prompt dei comandi** (`cmd`) come amministratore.
3.  Installa le librerie Python necessarie eseguendo questo comando:
    ```bash
    pip install MetaTrader5 flask flask-cors
    ```

## Passo 2: Scarica ed Esegui il Server MT5

1.  Crea una cartella sul tuo VPS, ad esempio `C:\TradingBot`.
2.  Scarica il file `mt5-python-server.py` dal nostro sito e salvalo in `C:\TradingBot`.
3.  Apri MetaTrader 5 sul VPS e accedi al tuo account di trading.
4.  In MT5, vai su **Strumenti → Opzioni → Consiglieri Esperti** e assicurati che `Consenti trading automatico` e `Consenti importazione di DLL` siano abilitati.
5.  **Lascia MT5 aperto e connesso.**
6.  Dal Prompt dei comandi, naviga alla cartella creata e avvia il server:
    ```bash
    cd C:\TradingBot
    python mt5-python-server.py
    ```
7.  Se tutto è corretto, vedrai un messaggio di avvio del server. **Non chiudere questa finestra del prompt dei comandi.**

## Passo 3: Configura la Connessione nel Tuo Account Web

1.  Accedi al tuo account su AI Trading Boost.
2.  Vai alla pagina **Impostazioni → Configurazione MT5**.
3.  Inserisci i dettagli del tuo VPS e del tuo account MT5:
    *   **Host/IP del VPS**: L'indirizzo IP pubblico del tuo VPS.
    *   **Porta del Server**: `8080` (è il valore predefinito per il nostro script).
    *   **Login MT5**: Il numero del tuo account MetaTrader 5.
    *   **Password MT5**: La password del tuo account MetaTrader 5.
    *   **Server MT5**: Il nome del server del tuo broker (es. `ICMarkets-Demo`).
4.  Salva la configurazione. Il sistema tenterà di connettersi per verificare i dati.

## Risoluzione dei Problemi

-   **"Connessione Rifiutata"**:
    *   Assicurati che lo script `mt5-python-server.py` sia in esecuzione sul VPS.
    *   Controlla che il firewall del tuo VPS consenta connessioni in entrata sulla porta `8080`.
-   **"Inizializzazione MT5 fallita"**:
    *   Verifica che MetaTrader 5 sia aperto, connesso e che il trading automatico sia abilitato.
-   **"Simbolo non trovato"**:
    *   Il tuo broker potrebbe usare un suffisso per i simboli (es. `EURUSD.m`). Il nostro sistema tenta di trovarlo automaticamente, ma in rari casi potrebbe fallire. Contatta il supporto se il problema persiste.

---
Se segui questi passaggi, il tuo account sarà collegato e pronto per ricevere ed eseguire segnali di trading.
