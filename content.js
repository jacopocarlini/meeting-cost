// Funzione per loggare messaggi in modo riconoscibile
function log(message) {
    console.log(`[Costo Meeting] ${message}`);
}

var gOccurrences = 0;

// Funzione per calcolare le occorrenze mensili medie
function getMonthlyOccurrences(recurrenceText) {
    if (!recurrenceText) return 0;

    // Normalizza il testo per una ricerca più affidabile
    const text = recurrenceText.toLowerCase();
    log(`Analisi ricorrenza: "${text}"`);

    // Costanti per calcoli più precisi
    // Giorni medi in un mese (365.25 giorni / 12 mesi)
    const AVG_DAYS_IN_MONTH = 30.44;
    // Settimane medie in un mese (30.44 / 7)
    const AVG_WEEKS_IN_MONTH = AVG_DAYS_IN_MONTH / 7; // Circa 4.345

    // --- Ordiniamo i controlli dal più specifico al più generico ---

    // 1. Giornaliero, solo giorni feriali (es. "Ogni settimana nei giorni feriali", "Ogni giorno feriale")
    // Questo è il caso più specifico e va controllato per primo.
    if (text.includes('giorni feriali') || text.includes('lunedì al venerdì')) {
        // 5 giorni lavorativi su 7, moltiplicato per i giorni medi del mese
        gOccurrences = AVG_DAYS_IN_MONTH * (5 / 7);
        return gOccurrences; // Circa 21.74
    }

    // 2. Giornaliero, tutti i giorni
    if (text.includes('ogni giorno')) {
        gOccurrences = AVG_DAYS_IN_MONTH; // 30.44
        return gOccurrences;
    }

    // 3. Settimanale, ogni X settimane (es. "ogni 2 settimane", "ogni 5 settimane")
    // Questa regex cattura il numero e generalizza la logica.
    const weekMatch = text.match(/ogni (\d+) settimane/);
    if (weekMatch && weekMatch[1]) {
        const numWeeks = parseInt(weekMatch[1], 10);
        if (numWeeks > 0) {
            log(`Trovata ricorrenza di ${numWeeks} settimane.`);
            gOccurrences = AVG_WEEKS_IN_MONTH / numWeeks;
            return gOccurrences;
        }
    }

    // 4. Settimanale, ogni settimana (es. "ogni settimana di martedì")
    // Questo viene controllato DOPO il caso "ogni X settimane" per evitare falsi positivi.
    if (text.includes('ogni settimana')) {
        gOccurrences = AVG_WEEKS_IN_MONTH; // Circa 4.345
        return gOccurrences;
    }

    // 5. Mensile
    if (text.includes('ogni mese')) {
        gOccurrences = 1;
        return gOccurrences;
    }

    // 6. Annuale
    if (text.includes('ogni anno')) {
        gOccurrences = 1 / 12; // Circa 0.083
        return gOccurrences;
    }

    // Se nessun pattern corrisponde
    log("Tipo di ricorrenza non standard, non è stato possibile calcolare il costo mensile.");
    gOccurrences = 0;
    return gOccurrences;
}


// Funzione principale per calcolare e mostrare il costo
const calculateAndShowMeetingCost = (hourlyCost) => {
    try {
        const eventPopup = document.querySelector('div#xDetDlg');
        if (!eventPopup) return;
        if (eventPopup.querySelector('.meeting-cost-container')) return;

        log("Popup dell'evento trovato. Inizio analisi...");

        // --- 1. Trova il numero di partecipanti ---
        let participantCount = 0;
        const attendeesContainer = eventPopup.querySelector('.d6wfac');
        if (attendeesContainer) {
            const attendeesTextElement = attendeesContainer.querySelector('.UfeRlc');
            if (attendeesTextElement && attendeesTextElement.textContent.includes('invitati')) {
                const match = attendeesTextElement.textContent.match(/\d+/);
                if (match) {
                    participantCount = parseInt(match[0], 10);
                    log(`Trovati ${participantCount} partecipanti.`);
                }
            }
        }
        if (participantCount === 0) {
            participantCount = 1;
            log("Nessun partecipante trovato, impostato a 1.");
        }

        // --- 2. Trova la durata del meeting in minuti ---
        let durationInMinutes = 0;
        // Assumo che 'eventPopup' e 'log' siano definiti altrove
        const timeElement = eventPopup.querySelector('.AzuXid.O2VjS.CyPPBf');
        log(timeElement);

        if (timeElement) {
            const timeText = timeElement.textContent.trim().toUpperCase();
            log(`Stringa dell'orario trovata: "${timeText}"`);

            // Regex per catturare l'orario (invariata)
            // Gruppi: 1:OraInizio, 2:PeriodoInizio(opz), 3:OraFine, 4:PeriodoFine(opz)
            const timeMatch = timeText.match(/(\d{1,2}:\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}:\d{2})\s*(AM|PM)?/);
            log(timeMatch);

            if (timeMatch) {
                let [, startHourStr, startPeriod, endHourStr, endPeriod] = timeMatch;

                log(`Parsing iniziale: Inizio=${startHourStr}${startPeriod || ''}, Fine=${endHourStr}${endPeriod || ''}`);

                // --- LOGICA DI ASSEGNAZIONE DIRETTA (come da tua richiesta) ---

                // Se il periodo di inizio non è specificato, MA quello di fine sì,
                // allora il periodo di inizio diventa uguale a quello di fine.
                if (!startPeriod && endPeriod) {
                    startPeriod = endPeriod;
                    log(`Periodo di inizio dedotto (uguale a fine): ${startPeriod}`);
                }
                // Caso speculare (meno comune, ma gestito per robustezza):
                // se il periodo di fine non è specificato, MA quello di inizio sì.
                else if (!endPeriod && startPeriod) {
                    endPeriod = startPeriod;
                    log(`Periodo di fine dedotto (uguale a inizio): ${endPeriod}`);
                }

                // Se entrambi i periodi sono presenti, o entrambi mancano, non facciamo nulla.

                // Procediamo solo se abbiamo entrambi i periodi (originali o dedotti)
                if (startPeriod && endPeriod) {
                    const createDateFrom12h = (hourStr, period) => {
                        let [hours, minutes] = hourStr.split(':').map(Number);
                        if (period === 'PM' && hours < 12) {
                            hours += 12;
                        }
                        if (period === 'AM' && hours === 12) { // Mezzanotte (12 AM) è 00:xx
                            hours = 0;
                        }
                        const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                        return new Date(`1970-01-01T${formattedTime}:00`);
                    };

                    const startTime = createDateFrom12h(startHourStr, startPeriod);
                    const endTime = createDateFrom12h(endHourStr, endPeriod);

                    log(`Ora di inizio interpretata: ${startTime}`);
                    log(`Ora di fine interpretata: ${endTime}`);

                    durationInMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

                    // Questa riga ora è importante per correggere durate negative
                    // che possono risultare dalla regola rigida.
                    // Es. "9:10 - 4:05PM" -> 9:10 PM - 4:05 PM -> durata negativa
                    if (durationInMinutes < 0) {
                        // Potrebbe essere un meeting a cavallo di mezzanotte OPPURE
                        // un'interpretazione illogica (es. 9 PM -> 4 PM).
                        // Aggiungere 24h gestisce entrambi i casi, anche se il secondo
                        // potrebbe non essere l'intenzione umana.
                        durationInMinutes += 24 * 60;
                        log(`Durata negativa rilevata. Aggiunte 24h. Nuova durata: ${durationInMinutes}`);
                    }
                    log(`Durata calcolata: ${durationInMinutes} minuti.`);
                } else {
                    log("Impossibile calcolare la durata: periodi AM/PM ambigui o mancanti.");
                }
            } else {
                log("Formato dell'orario non riconosciuto dalla regex.");
            }
        }

        if (durationInMinutes <= 0) {
            log("Durata non calcolabile. Calcolo interrotto.");
            return;
        }

        // --- 3. Calcola il costo singolo ---
        const singleCost = (participantCount * hourlyCost * durationInMinutes) / 60;
        log(`Costo singolo calcolato: ${singleCost.toFixed(2)} €`);

        // --- 4. Rileva ricorrenza e calcola costo mensile ---
        let monthlyCost = 0;
        let recurrenceHtml = '';
        // Il selettore per la ricorrenza è '.AzuXid.Kcwcnf.CyPPBf'
        const recurrenceElement = eventPopup.querySelector('.AzuXid.Kcwcnf.CyPPBf');
        if (recurrenceElement) {
            const occurrences = getMonthlyOccurrences(recurrenceElement.textContent);
            if (occurrences > 0) {
                monthlyCost = singleCost * occurrences;
                log(`Costo mensile calcolato: ${monthlyCost.toFixed(2)} € (basato su ${occurrences.toFixed(2)} occorrenze/mese)`);
                recurrenceHtml = `<div class="monthly-cost">Costo Mensile Stimato: <strong class="monthly-cost-value">${monthlyCost.toFixed(2)} €</strong></div>`;
            }
        }

        // --- 5. Crea e inietta l'elemento HTML (MODIFICATO) ---
        const costContainer = document.createElement('div');
        costContainer.className = 'nBzcnc OjZ2cc meeting-cost-container';
        costContainer.innerHTML = `
                    <div aria-hidden="true" class="zZj8Pb EaVNbc" style="padding-top: 16px;">
                        <i class="google-material-icons notranslate" aria-hidden="true">payments</i>
                    </div>
                    <div class="toUqff">
                        <div class="meeting-cost-details">
                            Costo stimato: <strong><span class="single-cost-value">${singleCost.toFixed(2)}</span> €</strong>
                            <br>
                            <small>
                                (${participantCount} part. × ${durationInMinutes} min ×
                                <input type="number" class="hourly-cost-input" value="${hourlyCost.toFixed(2)}" min="0" step="1"> €/ora)
                            </small>
                            ${recurrenceHtml}
                        </div>
                    </div>
                `;

        // --- Iniezione dell'elemento ---
        if (timeElement && timeElement.parentElement) {
            timeElement.parentElement.parentElement.parentElement.insertAdjacentElement('afterend', costContainer);
            log("Elemento del costo iniettato con successo.");

            // --- 6. Aggiungi Event Listener all'input (NUOVA PARTE) ---
            const hourlyCostInput = costContainer.querySelector('.hourly-cost-input');
            if (hourlyCostInput) {
                // Evento per ricalcolare il costo in tempo reale
                hourlyCostInput.addEventListener('input', (e) => {
                    const newHourlyCost = parseFloat(e.target.value) || 0;
                    updateDisplayedCosts(costContainer, participantCount, durationInMinutes, newHourlyCost);
                });

                // Evento per salvare il valore quando si smette di digitare (o si cambia focus)
                hourlyCostInput.addEventListener('change', (e) => {
                    const newHourlyCost = parseFloat(e.target.value) || 0;
                    chrome.storage.sync.set({ hourlyCost: newHourlyCost }, () => {
                        log(`Nuovo costo orario salvato: ${newHourlyCost}`);
                    });
                });
            }
        } else {
            log("ERRORE: Punto di iniezione non trovato.");
        }

    } catch (error) {
        log(`ERRORE CRITICO: ${error.message}`);
        console.error(error);
    }
};

// --- Aggiungi un piccolo stile per il costo mensile ---
const style = document.createElement('style');
style.textContent = `
    .meeting-cost-details .hourly-cost-input {
                /* --- MODIFICHE PER LA LARGHEZZA --- */
                width: auto; /* Imposta la larghezza a circa 4 caratteri */
                min-width: 1ch; /* Larghezza minima per evitare che diventi troppo piccolo */
                max-width: calc(1ch * 8); /* Larghezza massima per gestire numeri grandi */
                /* --- FINE MODIFICHE --- */

                padding: 2px 4px;
                font-size: 13px;
                font-weight: 600;
                text-align: center;
//                color: #1a73e8;
                background-color: transparent;
                border: 1px solid transparent;
                border-radius: 4px;
                transition: all 0.2s ease-in-out;
                -moz-appearance: textfield;
            }
            .meeting-cost-details .hourly-cost-input::-webkit-outer-spin-button,
            .meeting-cost-details .hourly-cost-input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            .meeting-cost-details .hourly-cost-input:hover {
                background-color: #f1f3f4;
                border-color: #dadce0;
            }
            .meeting-cost-details .hourly-cost-input:focus {
                outline: none;
                background-color: #fff;
                border-color: #1a73e8;
                box-shadow: 0 0 0 1px #1a73e8;
            }
            .meeting-cost-details .monthly-cost { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #dadce0; }
            .meeting-cost-details .monthly-cost strong { color: #d93025; font-weight: 600; }
`;
document.head.appendChild(style);


// --- Inizializzazione dell'Observer ---
let observer;

function startObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
        chrome.storage.sync.get({ hourlyCost: 50 }, (items) => {
            calculateAndShowMeetingCost(items.hourlyCost);
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    log("Calcolatore Costo Meeting: Script finale caricato e Observer attivato.");
}

function updateDisplayedCosts(costContainer, participantCount, durationInMinutes, newHourlyCost) {
    const singleCost = (participantCount * newHourlyCost * durationInMinutes) / 60;

    // Aggiorna il costo del singolo meeting
    const singleCostElement = costContainer.querySelector('.single-cost-value');
    if (singleCostElement) {
        singleCostElement.textContent = singleCost.toFixed(2);
    }

    // Aggiorna il costo mensile, se presente
    const monthlyCostElement = costContainer.querySelector('.monthly-cost-value');
    log('esistente' + monthlyCostElement);

    if (monthlyCostElement) {
        const occurrences = gOccurrences;
        log('ripetizioni' + occurrences);
        if (occurrences > 0) {
            const monthlyCost = singleCost * occurrences;
            monthlyCostElement.textContent = monthlyCost.toFixed(2);
        }
    }
}

log("Calcolatore Costo Meeting: Script caricato.");
startObserver();